// ─────────────────────────────────────────────────────────────────────────────
// componentData.ts — FIXED VERSION
//
// Thay đổi so với bản gốc:
//
// [1] normalizeGetAvailableSlots: KHÔNG còn bọc alternatives vào fake court
//     Bug cũ: checkSlotAvailability trả { available: false, alternatives: [...] }
//             → code bọc alternatives vào court giả "courtId: alternatives"
//             → frontend slotPicker nhận "Gợi ý giờ gần nhất" như tên sân thật
//             → slot trong alternatives thiếu pricePerHour → NaN khi tính tiền
//
// [2] normalizeCheckSlotAvailability: tách riêng hàm xử lý checkSlot
//     → trả { available, slot? } hoặc { available: false, alternatives: [...] }
//     → frontend dùng component riêng "slotSuggestions" thay vì "slotPicker"
//
// [3] normalizeGetUserBookings: BỎ alias fields (code/club/time)
//     Bug cũ: map bookingCode → code, clubName → club, startTime → time
//             → frontend nhận cả bookingCode lẫn code, ambiguous
//     Fix: giữ nguyên field names từ tool, frontend đọc đúng field
//
// [4] TOOL_COMPONENT_MAP: thêm mapping riêng checkSlotAvailability → "slotSuggestions"
//     khi không available, vs "slotPicker" khi available
//     → component render khác nhau: slotPicker cho chọn, slotSuggestions cho gợi ý
// ─────────────────────────────────────────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─── getClubDetails ───────────────────────────────────────────────────────────
// Không có bug — chỉ normalize openTime/closeTime để component không cần
// biết cấu trúc todayHours
function normalizeGetClubDetails(result: unknown): unknown {
  if (!isRecord(result)) return result;
  const todayHours = isRecord(result.todayHours) ? result.todayHours : null;
  return {
    ...result,
    openTime:
      typeof result.openTime === "string"
        ? result.openTime
        : (todayHours?.openTime as string | undefined) ?? null,
    closeTime:
      typeof result.closeTime === "string"
        ? result.closeTime
        : (todayHours?.closeTime as string | undefined) ?? null,
  };
}

// ─── getAvailableSlots ────────────────────────────────────────────────────────
// [1] FIX: Chỉ xử lý khi result.courts là mảng thật
// KHÔNG còn tạo fake court từ alternatives — đó là job của normalizeCheckSlotAvailability
function normalizeGetAvailableSlots(result: unknown): unknown {
  if (!isRecord(result)) return result;

  const courts = Array.isArray(result.courts) ? result.courts : [];

  return {
    ...result,
    courts: courts.map((court) => {
      if (!isRecord(court)) return court;
      const slots = Array.isArray(court.slots) ? court.slots : [];
      return {
        ...court,
        // Normalize court name: ưu tiên "name", fallback "courtName"
        name: typeof court.name === "string" ? court.name : court.courtName ?? "Sân",
        slots: slots.map((slot) => {
          if (!isRecord(slot)) return slot;
          return {
            ...slot,
            // Normalize display fields: ưu tiên field display, fallback ISO
            startDisplay:
              typeof slot.startTimeDisplay === "string"
                ? slot.startTimeDisplay
                : typeof slot.start === "string"
                  ? slot.start
                  : null,
            endDisplay:
              typeof slot.endTimeDisplay === "string"
                ? slot.endTimeDisplay
                : typeof slot.end === "string"
                  ? slot.end
                  : null,
          };
        }),
      };
    }),
  };
}

// ─── checkSlotAvailability ────────────────────────────────────────────────────
// [2] FIX: Tách riêng normalize cho checkSlot (KHÔNG trộn với getAvailableSlots)
//
// Tool này trả 2 dạng:
//   - Available:     { available: true, slot: { id, courtId, startTimeISO, ... } }
//   - Not available: { available: false, alternatives: [...] }
//
// Cần normalize thành format frontend có thể render:
//   - Available:     { available: true, slots: [slot], type: "exact" }
//   - Not available: { available: false, alternatives: [...], type: "suggestions" }
function normalizeCheckSlotAvailability(result: unknown): unknown {
  if (!isRecord(result)) return result;

  if (result.available === true && isRecord(result.slot)) {
    // Slot chính xác có sẵn → format cho slotPicker (1 slot để confirm)
    const s = result.slot;
    return {
      available: true,
      type: "exact",
      slots: [{
        id: s.id,
        courtId: s.courtId,
        courtName: s.courtName,
        sportLabel: s.sportLabel,
        startTimeISO: s.startTimeISO,
        startDisplay: s.startTimeDisplay,
        endDisplay: s.endTimeDisplay,
      }],
    };
  }

  if (result.available === false) {
    // Không có slot exact → trả alternatives cho slotSuggestions component
    const alts = Array.isArray(result.alternatives) ? result.alternatives : [];
    return {
      available: false,
      type: "suggestions",
      requestedDate: result.date,
      // [2b] Normalize mỗi alternative — đảm bảo có đủ field display
      alternatives: alts.map((a) => {
        if (!isRecord(a)) return a;
        return {
          ...a,
          startDisplay:
            typeof a.startTimeDisplay === "string" ? a.startTimeDisplay : null,
          endDisplay:
            typeof a.endTimeDisplay === "string" ? a.endTimeDisplay : null,
          // pricePerHour có thể null vì checkSlotAvailability không fetch pricing
          // Frontend cần hiển thị "—" thay vì NaN hoặc 0
          pricePerHour: typeof a.pricePerHour === "number" ? a.pricePerHour : null,
        };
      }),
    };
  }

  // Fallback
  return result;
}

// ─── getUserBookings ──────────────────────────────────────────────────────────
// [3] FIX: BỎ alias fields — giữ nguyên field names từ tool response
//
// Trước: map bookingCode → code, clubName → club, startTime → time
//   → Frontend có thể đọc cả bookingCode lẫn code, undefined ở một trong hai
//   → Nếu tool đổi field name, normalize này silently break
//
// Sau: giữ nguyên field names, chỉ đảm bảo finalAmount là number (không phải Decimal string)
function normalizeGetUserBookings(result: unknown): unknown {
  if (!Array.isArray(result)) return result;

  return result.map((booking) => {
    if (!isRecord(booking)) return booking;
    return {
      ...booking,
      // Chỉ coerce type, không rename field
      finalAmount: typeof booking.finalAmount === "number"
        ? booking.finalAmount
        : Number(booking.finalAmount ?? 0),
    };
  });
}

// ─── createBooking ────────────────────────────────────────────────────────────
// Không rename, chỉ ensure finalAmount là number
function normalizeCreateBooking(result: unknown): unknown {
  if (!isRecord(result)) return result;
  return {
    ...result,
    finalAmount:
      typeof result.finalAmount === "number"
        ? result.finalAmount
        : typeof result.amount === "number"
          ? result.amount
          : Number(result.finalAmount ?? result.amount ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// [4] Xác định component type dựa trên tool name VÀ result
// Trước: chỉ dùng tool name → checkSlotAvailability luôn → "slotPicker"
// Sau: xét thêm nội dung result → quyết định đúng component
// ─────────────────────────────────────────────────────────────────────────────
export function resolveComponentType(toolName: string, result: unknown): string {
  // Nếu có lỗi auth → authRequired
  if (isRecord(result) && typeof result.error === "string") {
    if (result.error.toString().toLowerCase().includes("đăng nhập")) {
      return "authRequired";
    }
    return "error";
  }

  switch (toolName) {
    case "checkSlotAvailability": {
      if (!isRecord(result)) return "slotSuggestions";
      // available = true → user chọn confirm slot → slotPicker
      // available = false → gợi ý giờ thay thế → slotSuggestions
      return result.available === true ? "slotPicker" : "slotSuggestions";
    }
    case "searchClubs": return "clubList";
    case "getClubDetails": return "clubDetail";
    case "getAvailableSlots": return "slotPicker";
    case "getUserProfile": return "userProfile";
    case "getUserBookings": return "bookingHistory";
    case "getUserInsights": return "userInsights";
    case "createBooking": return "bookingSuccess";
    default: return "text";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — normalize data theo từng tool
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeToolResultForComponent(
  toolName: string,
  result: unknown
): unknown {
  switch (toolName) {
    case "getClubDetails":
      return normalizeGetClubDetails(result);
    case "getAvailableSlots":
      return normalizeGetAvailableSlots(result);
    case "checkSlotAvailability":
      // [2] FIX: dùng hàm riêng, không dùng normalizeGetAvailableSlots
      return normalizeCheckSlotAvailability(result);
    case "getUserBookings":
      // [3] FIX: không còn alias fields
      return normalizeGetUserBookings(result);
    case "createBooking":
      return normalizeCreateBooking(result);
    default:
      return result;
  }
}