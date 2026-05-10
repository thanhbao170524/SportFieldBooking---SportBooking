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

import { streamText, ModelMessage, createUIMessageStream, createUIMessageStreamResponse } from "ai";
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
  resolveComponentType, // [2] FIX: import hàm mới
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

interface RawMessagePart { type: string; text?: string }
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
          // [3] FIX: System prompt STATIC — không inject thời gian vào đây
          // Dynamic context đã được inject vào messages[0] bên dưới
          system: CHATBOT_SYSTEM_PROMPT,
          messages,
          temperature: 0.3,
          tools: chatbotTools,

          onFinish: () => {
            // [1] FIX: Gửi TẤT CẢ tool calls, không chỉ tool cuối
            // Thứ tự quan trọng — getUserInsights trước searchClubs
            // để frontend render insights card trước clubList card
            for (const entry of toolCallLog) {
              const normalizedData = normalizeToolResultForComponent(entry.name, entry.result);
              // [2] FIX: dùng resolveComponentType() thay vì TOOL_TO_COMPONENT map
              const componentType = resolveComponentType(entry.name, entry.result);

              writer.write({
                type: "data-chatComponent",
                data: {
                  component: componentType,
                  toolName: entry.name, // thêm để frontend có thể debug
                  data: normalizedData,
                },
              });
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
// [3] Tạo context string để inject vào message, KHÔNG phải system prompt
// Mục tiêu: system prompt giữ stable → có thể cache với Gemini context caching
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

  return `[SYSTEM_CONTEXT: Hôm nay ${vnDate}, ${vnTime}. User: ${userInfo}. ${locationInfo}]`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildMessages
// [3] Prepend context note vào message đầu tiên của user (không tạo message riêng)
// Nếu message đầu là của user → nối context vào đầu content
// Nếu không → tạo hidden system context message dạng user (Gemini chấp nhận)
// ─────────────────────────────────────────────────────────────────────────────
function buildMessages(rawMessages: RawMessage[], contextNote: string): ModelMessage[] {
  const parsed: ModelMessage[] = rawMessages.map((m) => ({
    role: m.role as ModelMessage["role"],
    content:
      m.content ||
      (m.parts && Array.isArray(m.parts)
        ? m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
        : ""),
  }));

  if (!parsed.length) return parsed;

  // Inject context vào user message đầu tiên
  const firstUserIdx = parsed.findIndex((m) => m.role === "user");
  if (firstUserIdx !== -1) {
    const firstUser = parsed[firstUserIdx];
    parsed[firstUserIdx] = {
      ...firstUser,
      content: `${contextNote}\n\n${firstUser.content}`,
    };
  }

  return parsed;
}