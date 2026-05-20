// ─────────────────────────────────────────────────────────────────────────────
// route.ts — FIXED VERSION
//
// Thay đổi so với bản gốc:
//
// [1] lastToolName/lastToolResult → toolCallLog[] (array)
//     Bug cũ: chỉ track tool CUỐI cùng → khi AI gọi getUserInsights rồi searchClubs,
//             frontend chỉ nhận clubList, mất userInsights component
//     Fix: push mọi tool call vào array, gửi tất cả trong onFinish
//
// [2] Dùng resolveComponentType() từ componentData.ts
//     Trước: hardcode TOOL_TO_COMPONENT map + isAuthError check lặp lại
//     Sau: tập trung logic vào một hàm, route.ts không cần biết chi tiết
//
// [3] Tách dynamic context ra khỏi system prompt string
//     Trước: system = CHATBOT_SYSTEM_PROMPT + "\nNGỮ CẢNH: ..." (thay đổi mỗi request)
//     Sau: inject vào message đầu tiên như hidden context → system prompt stable,
//          có thể dùng Gemini context caching trong tương lai
//
// [4] Error handling rõ hơn — streamText error được catch và log
// ─────────────────────────────────────────────────────────────────────────────

import { streamText, ModelMessage, createUIMessageStream, createUIMessageStreamResponse, stepCountIs } from "ai";
import type { ToolSet } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { createBooking } from "@/modules/booking/booking.service";
import { createPaymentUrl } from "@/modules/payment/payment.service";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser } from "@/middleware/auth.middleware";
import { NextRequest } from "next/server";
import { CHATBOT_SYSTEM_PROMPT } from "./prompts";
import {
  normalizeToolResultForComponent,
  resolveComponentType,
  generateToolSummary,
} from "./componentData";
import { buildChatbotTools } from "./tools";
import "dotenv/config";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || "",
}) as (modelId: string) => unknown;

export const maxDuration = 60; // [4b] Tăng từ 30 → 60 cho flow phức tạp

// [1] FIX: Thay thế single last-tool tracking bằng array
// Mỗi entry ghi lại tên tool và kết quả để gửi lên frontend
type ToolCallEntry = {
  name: string;
  result: unknown;
};

interface RawToolInvocationPart {
  type: "tool-invocation";
  toolInvocation?: {
    toolName?: string;
    args?: Record<string, unknown>;
    result?: unknown;
    state?: string;
  };
}

interface RawDataPart {
  type: string; // "data-chatComponent" etc.
  data?: Record<string, unknown>;
}

interface RawTextPart {
  type: "text";
  text?: string;
}

type RawMessagePart = RawTextPart | RawToolInvocationPart | RawDataPart;

interface RawMessage {
  role: "user" | "assistant" | "system" | "tool";
  content?: string;
  parts?: RawMessagePart[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ChatRequestSchema = z
  .object({
    messages: z.array(z.unknown()).optional().default([]),
    userLocation: z
      .object({ lat: z.number(), lng: z.number() })
      .optional(),
  })
  .passthrough();

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const jsonBody: unknown = await req.json();
    const parsedBody = ChatRequestSchema.safeParse(jsonBody);
    const nestedBody =
      isRecord(jsonBody) && isRecord(jsonBody.body) ? jsonBody.body : null;

    const rawMessages =
      parsedBody.success
        ? parsedBody.data.messages
        : (isRecord(jsonBody) && Array.isArray(jsonBody.messages)
          ? jsonBody.messages
          : (nestedBody && Array.isArray(nestedBody.messages)
            ? nestedBody.messages
            : []));

    const userLocation =
      parsedBody.success
        ? parsedBody.data.userLocation
        : (isRecord(jsonBody) && isRecord(jsonBody.userLocation)
          ? (jsonBody.userLocation as { lat?: unknown; lng?: unknown })
          : (nestedBody && isRecord(nestedBody.userLocation)
            ? (nestedBody.userLocation as { lat?: unknown; lng?: unknown })
            : undefined));

    if (!Array.isArray(rawMessages)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { user } = await getAuthUser(req);
    const userId = user?.userId ?? null;
    const defaultLat = (userLocation?.lat as number) ?? null;
    const defaultLng = (userLocation?.lng as number) ?? null;

    // [3] FIX: Build messages với dynamic context inject vào user message đầu tiên
    // Thay vì nối vào system string (làm system thay đổi mỗi request, không cacheable)
    // Ta prepend một hidden context message trước history
    const contextNote = buildContextNote(userId, userLocation);

    const messages = buildMessages(rawMessages as RawMessage[], contextNote);

    const stream = createUIMessageStream({
      execute: async (ctx: unknown) => {
        const { writer } = ctx as {
          writer: {
            write: (chunk: unknown) => void;
            merge: (stream: unknown) => void;
          };
        };

        // [1] FIX: Array thay vì single last-tool variables
        const toolCallLog: ToolCallEntry[] = [];

        const recordTool = <T>(name: string, result: T): T => {
          toolCallLog.push({ name, result });
          return result;
        };

        const sharedTools = buildChatbotTools({
          prisma: prisma as never,
          userId,
          defaultLat,
          defaultLng,
          getIpAddr: () => req.headers.get("x-forwarded-for") || "127.0.0.1",
          createBooking,
          createPaymentUrl,
        });

        const chatbotTools = ({
          searchClubs: {
            ...sharedTools.searchClubs,
            execute: async (input: unknown) =>
              recordTool("searchClubs", await sharedTools.searchClubs.execute(input)),
          },
          getClubDetails: {
            ...sharedTools.getClubDetails,
            execute: async (input: unknown) =>
              recordTool("getClubDetails", await sharedTools.getClubDetails.execute(input)),
          },
          getAvailableSlots: {
            ...sharedTools.getAvailableSlots,
            execute: async (input: unknown) =>
              recordTool("getAvailableSlots", await sharedTools.getAvailableSlots.execute(input)),
          },
          checkSlotAvailability: {
            ...sharedTools.checkSlotAvailability,
            execute: async (input: unknown) =>
              recordTool("checkSlotAvailability", await sharedTools.checkSlotAvailability.execute(input)),
          },
          getUserProfile: {
            ...sharedTools.getUserProfile,
            execute: async () =>
              recordTool("getUserProfile", await sharedTools.getUserProfile.execute()),
          },
          getUserBookings: {
            ...sharedTools.getUserBookings,
            execute: async (input: unknown) =>
              recordTool("getUserBookings", await sharedTools.getUserBookings.execute(input)),
          },
          getUserInsights: {
            ...sharedTools.getUserInsights,
            execute: async (input: unknown) =>
              recordTool("getUserInsights", await sharedTools.getUserInsights.execute(input)),
          },
          createBooking: {
            ...sharedTools.createBooking,
            execute: async (input: unknown) =>
              recordTool("createBooking", await sharedTools.createBooking.execute(input)),
          },
        } as unknown) as ToolSet;

        const result = streamText({
          model: google("gemini-2.5-flash") as any,
          system: CHATBOT_SYSTEM_PROMPT,
          messages,
          temperature: 0.3,
          stopWhen: stepCountIs(3),
          tools: chatbotTools,

          onStepFinish: ({ toolCalls }) => {
            if (toolCalls && toolCalls.length > 0) {
              for (const entry of toolCallLog) {
                const normalizedData = normalizeToolResultForComponent(entry.name, entry.result);
                const componentType = resolveComponentType(entry.name, entry.result);
                const summary = generateToolSummary(entry.name, entry.result);

                writer.write({
                  type: "data-chatComponent",
                  data: {
                    component: componentType,
                    toolName: entry.name,
                    summary,
                    data: normalizedData,
                  },
                });
              }
              toolCallLog.length = 0;
            }
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ChatAPI] Route error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildContextNote
// Tạo context string để inject vào LAST user message mỗi request.
// Bao gồm: thời gian, trạng thái login, vị trí, và reminder ngắn.
// ─────────────────────────────────────────────────────────────────────────────
function buildContextNote(
  userId: string | null,
  userLocation?: { lat?: unknown; lng?: unknown } | null
): string {
  const now = new Date();
  const vnDate = now.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const vnTime = now.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });

  const userInfo = userId
    ? `đã đăng nhập (userId=${userId})`
    : "chưa đăng nhập";

  const locationInfo =
    userLocation?.lat && userLocation?.lng
      ? `Vị trí user: lat=${userLocation.lat}, lng=${userLocation.lng}.`
      : "Không có vị trí user.";

  return `[SYSTEM_CONTEXT: Hôm nay ${vnDate}, ${vnTime}. User: ${userInfo}. ${locationInfo}]
[REMINDER: Trả lời NGẮN 3-5 dòng. Dùng đúng data từ tool. KHÔNG hỏi lại thông tin đã có trong SESSION_STATE. Nếu user nói "sân đó/cái đó/sân vừa xem" → dùng clubId/slug từ SESSION_STATE.]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildMessages
// Improvements:
//   [A] Keep tool results as summarized context in assistant messages
//   [B] Inject context into LAST user message (not first) for freshness
//   [C] Sliding window: keep max N recent messages, summarize older ones
//   [D] Add session state tracking for cross-turn memory
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HISTORY_MESSAGES = 30;
const SUMMARIZE_THRESHOLD = 20;

function buildMessages(rawMessages: RawMessage[], contextNote: string): ModelMessage[] {
  const parsed: ModelMessage[] = rawMessages.map((m) => {
    let textContent = m.content || "";

    if (!textContent && m.parts && Array.isArray(m.parts)) {
      const textParts: string[] = [];
      const toolContextParts: string[] = [];

      for (const part of m.parts) {
        if (part.type === "text" && "text" in part) {
          textParts.push(part.text || "");
        } else if (part.type === "tool-invocation" && "toolInvocation" in part) {
          const inv = (part as RawToolInvocationPart).toolInvocation;
          if (inv && inv.state === "result" && inv.result != null) {
            const summary = summarizeToolResult(inv.toolName || "", inv.result);
            if (summary) toolContextParts.push(summary);
          }
        }
      }

      textContent = textParts.join("");
      if (toolContextParts.length > 0 && m.role === "assistant") {
        textContent += `\n[TOOL_DATA: ${toolContextParts.join(" | ")}]`;
      }
    }

    return { role: m.role as ModelMessage["role"], content: textContent };
  });

  if (!parsed.length) return parsed;

  // [C] Sliding window: if too many messages, summarize old ones
  let messages = parsed;
  if (messages.length > MAX_HISTORY_MESSAGES) {
    const oldMessages = messages.slice(0, messages.length - SUMMARIZE_THRESHOLD);
    const recentMessages = messages.slice(-SUMMARIZE_THRESHOLD);
    const sessionSummary = buildSessionSummaryFromMessages(oldMessages);

    if (recentMessages[0]) {
      recentMessages[0] = {
        ...recentMessages[0],
        content: `[CONVERSATION_HISTORY_SUMMARY: ${sessionSummary}]\n\n${recentMessages[0].content}`,
      };
    }
    messages = recentMessages;
  }

  // [D] Extract session state from all messages for cross-turn memory
  const sessionState = extractSessionState(rawMessages);

  // [B] Inject context + session state into LAST user message
  const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
  if (lastUserIdx !== -1) {
    const stateStr = sessionState ? `\n[SESSION_STATE: ${sessionState}]` : "";
    messages[lastUserIdx] = {
      ...messages[lastUserIdx],
      content: `${contextNote}${stateStr}\n\n${messages[lastUserIdx].content}`,
    };
  }

  return messages;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: summarizeToolResult
// Serialize tool results into concise text so the model retains cross-turn data
// ─────────────────────────────────────────────────────────────────────────────
function summarizeToolResult(toolName: string, result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as Record<string, unknown>;

  switch (toolName) {
    case "searchClubs": {
      if (!r.found) return `searchClubs→không tìm thấy CLB`;
      const clubs = r.clubs as Array<Record<string, unknown>> | undefined;
      if (!clubs?.length) return `searchClubs→0 kết quả`;
      const summaries = clubs.slice(0, 5).map((c, i) =>
        `${i + 1}.${c.name}(id:${c.id},slug:${c.slug},${c.district})`
      );
      return `searchClubs→${clubs.length} CLB: ${summaries.join("; ")}`;
    }
    case "getClubDetails": {
      if (r.error) return `getClubDetails→lỗi`;
      return `getClubDetails→${r.name}(id:${r.id},slug:${r.slug},courts:${(r.courts as any[])?.length ?? 0})`;
    }
    case "getAvailableSlots": {
      if (!r.available) return `getAvailableSlots→không có slot trống ngày ${r.date}`;
      const courts = r.courts as Array<Record<string, unknown>> | undefined;
      const slotInfo = courts?.map(c =>
        `${c.courtName}(${c.courtId}):${(c.slots as any[])?.length ?? 0}slots`
      ).join("; ") ?? "";
      return `getAvailableSlots→${r.date}: ${slotInfo}`;
    }
    case "checkSlotAvailability": {
      if (r.available) {
        const slot = r.slot as Record<string, unknown>;
        return `checkSlot→trống: ${slot?.courtName} ${slot?.startTimeDisplay}(id:${slot?.id},courtId:${slot?.courtId})`;
      }
      const alts = r.alternatives as Array<Record<string, unknown>> | undefined;
      return `checkSlot→hết, ${alts?.length ?? 0} alternatives`;
    }
    case "getUserProfile": {
      if (r.error) return `getUserProfile→chưa login`;
      return `getUserProfile→${r.fullName},${r.phone}`;
    }
    case "getUserBookings": {
      if (r.error) return `getUserBookings→lỗi`;
      const bookings = result as Array<Record<string, unknown>>;
      return `getUserBookings→${bookings.length} đơn gần nhất`;
    }
    case "getUserInsights": {
      if (r.error) return `getUserInsights→lỗi`;
      const sports = r.favoriteSports as Array<Record<string, unknown>> | undefined;
      const topSport = sports?.[0]?.sportType ?? "N/A";
      return `getUserInsights→sport:${topSport}, ${(r.topClubs as any[])?.length ?? 0} CLB quen`;
    }
    case "createBooking": {
      if (r.error) return `createBooking→lỗi: ${r.error}`;
      return `createBooking→thành công, mã:${r.bookingCode}`;
    }
    default:
      return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: extractSessionState
// Parse conversation history to extract key facts the model should remember
// ─────────────────────────────────────────────────────────────────────────────
function extractSessionState(rawMessages: RawMessage[]): string {
  const state: {
    sport: string | null;
    city: string | null;
    district: string | null;
    lastClubId: string | null;
    lastClubName: string | null;
    lastClubSlug: string | null;
    lastCourtId: string | null;
    lastDate: string | null;
    bookerName: string | null;
    bookerPhone: string | null;
  } = {
    sport: null,
    city: null,
    district: null,
    lastClubId: null,
    lastClubName: null,
    lastClubSlug: null,
    lastCourtId: null,
    lastDate: null,
    bookerName: null,
    bookerPhone: null,
  };

  for (const m of rawMessages) {
    if (!m.parts) continue;
    for (const part of m.parts) {
      if (part.type !== "tool-invocation") continue;
      const inv = (part as RawToolInvocationPart).toolInvocation;
      if (!inv) continue;

      const args = inv.args ?? {};
      const result = (inv.result ?? {}) as Record<string, unknown>;

      switch (inv.toolName) {
        case "searchClubs": {
          if (args.sport) state.sport = args.sport as string;
          if (args.city) state.city = args.city as string;
          if (args.district) state.district = args.district as string;
          // Track last viewed club from search results
          const clubs = result.clubs as Array<Record<string, unknown>> | undefined;
          if (clubs?.length) {
            state.lastClubId = clubs[0].id as string;
            state.lastClubName = clubs[0].name as string;
            state.lastClubSlug = clubs[0].slug as string;
          }
          break;
        }
        case "getClubDetails": {
          if (result.id) state.lastClubId = result.id as string;
          if (result.name) state.lastClubName = result.name as string;
          if (result.slug) state.lastClubSlug = result.slug as string;
          break;
        }
        case "getAvailableSlots": {
          if (args.clubId) state.lastClubId = args.clubId as string;
          if (args.date) state.lastDate = args.date as string;
          if (args.sportType) state.sport = args.sportType as string;
          const courts = result.courts as Array<Record<string, unknown>> | undefined;
          if (courts?.length) state.lastCourtId = courts[0].courtId as string;
          break;
        }
        case "checkSlotAvailability": {
          if (args.clubId) state.lastClubId = args.clubId as string;
          if (args.date) state.lastDate = args.date as string;
          if (args.courtId) state.lastCourtId = args.courtId as string;
          break;
        }
        case "getUserProfile": {
          if (result.fullName) state.bookerName = result.fullName as string;
          if (result.phone) state.bookerPhone = result.phone as string;
          break;
        }
        case "createBooking": {
          if (args.bookerName) state.bookerName = args.bookerName as string;
          if (args.bookerPhone) state.bookerPhone = args.bookerPhone as string;
          break;
        }
      }
    }
  }

  // Build compact state string, only include non-null values
  const parts: string[] = [];
  if (state.sport) parts.push(`sport=${state.sport}`);
  if (state.city) parts.push(`city=${state.city}`);
  if (state.district) parts.push(`district=${state.district}`);
  if (state.lastClubId) parts.push(`clubId=${state.lastClubId}`);
  if (state.lastClubName) parts.push(`clubName=${state.lastClubName}`);
  if (state.lastClubSlug) parts.push(`slug=${state.lastClubSlug}`);
  if (state.lastCourtId) parts.push(`courtId=${state.lastCourtId}`);
  if (state.lastDate) parts.push(`date=${state.lastDate}`);
  if (state.bookerName) parts.push(`name=${state.bookerName}`);
  if (state.bookerPhone) parts.push(`phone=${state.bookerPhone}`);

  return parts.length > 0 ? parts.join(", ") : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildSessionSummaryFromMessages
// Create a compact summary of older messages for sliding window
// ─────────────────────────────────────────────────────────────────────────────
function buildSessionSummaryFromMessages(messages: ModelMessage[]): string {
  const keyFacts: string[] = [];

  for (const m of messages) {
    const content = typeof m.content === "string" ? m.content : "";

    // Extract tool data summaries that were embedded
    const toolDataMatch = content.match(/\[TOOL_DATA: (.+?)\]/g);
    if (toolDataMatch) {
      for (const match of toolDataMatch) {
        const data = match.replace("[TOOL_DATA: ", "").replace("]", "");
        keyFacts.push(data);
      }
    }
  }

  if (keyFacts.length === 0) {
    return "Cuộc hội thoại đã bắt đầu trước đó, user đã tương tác nhiều lượt.";
  }

  // Keep last 5 key facts to avoid summary being too long
  return keyFacts.slice(-5).join(" → ");
}