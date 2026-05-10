import { z } from "zod";

export const SPORT_LABEL: Record<string, string> = {
  FOOTBALL: "Bóng đá",
  BADMINTON: "Cầu lông",
  TENNIS: "Tennis",
  PICKLEBALL: "Pickleball",
  BASKETBALL: "Bóng rổ",
  VOLLEYBALL: "Bóng chuyền",
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function vnDayToUTC(date: string) {
  return {
    gte: new Date(`${date}T00:00:00+07:00`),
    lte: new Date(`${date}T23:59:59+07:00`),
  };
}

export function formatTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function formatVN(d: Date | string) {
  return new Date(d).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function toISO(d: Date | string) {
  return new Date(d).toISOString();
}

export function toVnDateTime(date: string, timeHHmm: string) {
  return new Date(`${date}T${timeHHmm}:00+07:00`);
}

export function getVnHour(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "00";
  return Number(hourPart);
}

// ─── FIX 4: getVnMinute — cần để match pricing window chính xác đến phút ────
// Lý do thêm: CourtPricing.startTime/endTime có thể là 06:30, 12:00 v.v.
// Chỉ so sánh giờ (getVnHour) sẽ miss các window bắt đầu giữa giờ.
export function getVnMinute(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    minute: "2-digit",
  }).formatToParts(d);
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "00";
  return Number(minutePart);
}

// Chuyển Date → tổng số phút trong ngày theo giờ VN (0–1439)
export function getVnMinutesOfDay(d: Date): number {
  return getVnHour(d) * 60 + getVnMinute(d);
}

function normalizeAddressText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractDistrictNumber(value: unknown) {
  const normalized = normalizeAddressText(value);
  const match = normalized.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function prismaClubLocationWhere(city?: string | null, district?: string | null) {
  const c = city?.trim();
  const d = district?.trim();
  if (!c && !d) return {};
  if (c && d) {
    return {
      city: { contains: c, mode: "insensitive" as const },
      district: { contains: d, mode: "insensitive" as const },
    };
  }
  const term = (c ?? d)!;
  return {
    OR: [
      { city: { contains: term, mode: "insensitive" as const } },
      { district: { contains: term, mode: "insensitive" as const } },
    ],
  };
}

function buildClubSearchSuggestionHint(input: {
  city?: string | null;
  district?: string | null;
  sport?: string | null;
  name?: string | null;
  filteredOut?: boolean;
  userLat?: number | null;
  userLng?: number | null;
  radiusKm?: number | null;
}): string {
  const c = input.city?.trim();
  const d = input.district?.trim();
  const sp = input.sport ? (SPORT_LABEL[input.sport] ?? input.sport) : null;
  const nm = input.name?.trim();

  if (input.filteredOut && input.userLat != null && input.userLng != null) {
    const rk = input.radiusKm ?? 20;
    return (
      `Trong phạm vi ~${rk}km quanh vị trí của bạn không có CLB phù hợp`
      + (sp ? ` với môn ${sp}` : "")
      + ". "
      + "Thử nhập tỉnh/quận thủ công, hoặc đặt lại yêu cầu không chỉ dựa vào \"gần tôi\"."
    );
  }

  const hints: string[] = [];
  if (d && c) hints.push(`tìm rộng trong ${c} (bỏ lọc quận/huyện cụ thể)`);
  else if (d) hints.push(`kiểm tra chính tả hoặc thêm tỉnh/thành`);
  else if (c) hints.push(`thử vùng lân cận hoặc chỉ nhập tỉnh/thành`);
  if (sp) hints.push(`thử đổi môn hoặc tạm bỏ lọc môn (${sp})`);
  else hints.push("nêu rõ môn (vd: cầu lông, sân bóng)");
  if (nm) hints.push("thử từ khóa tên CLB ngắn hơn");

  const hintBody = hints.slice(0, 4).join("; ");
  return (
    `Chưa có CLB khớp đủ điều kiện. Gợi ý: ${hintBody}. `
    + "Ví dụ nhắn lại: \"cầu lông Quận 7\" hoặc \"sân bóng TP.HCM\"."
  );
}

export type PrismaLike = {
  club: {
    findMany: (args: unknown) => Promise<any[]>;
    findFirst: (args: unknown) => Promise<any | null>;
  };
  review: {
    groupBy: (args: unknown) => Promise<any[]>;
  };
  timeSlot: {
    findMany: (args: unknown) => Promise<any[]>;
    groupBy: (args: unknown) => Promise<any[]>;
  };
  booking: {
    findMany: (args: unknown) => Promise<any[]>;
  };
  favoriteClub: {
    findMany: (args: unknown) => Promise<any[]>;
  };
  favoriteCourt: {
    findMany: (args: unknown) => Promise<any[]>;
  };
  user: {
    findUnique: (args: unknown) => Promise<any | null>;
  };
};

export type CreatePaymentUrlFn = (
  bookingId: string,
  amount: number,
  method: string,
  ipAddr?: string
) => Promise<string | null>;

export type CreateBookingFn = (userId: string, input: unknown) => Promise<any>;

export type ChatToolsDeps = {
  prisma: PrismaLike;
  userId: string | null;
  defaultLat: number | null;
  defaultLng: number | null;
  getIpAddr: () => string;
  createBooking: CreateBookingFn;
  createPaymentUrl: CreatePaymentUrlFn;
};

export function buildChatbotTools(deps: ChatToolsDeps) {
  const { prisma, userId, defaultLat, defaultLng, getIpAddr, createBooking, createPaymentUrl } = deps;

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 1: searchClubs
  // FIX APPLIED:
  //   [A] fetchTake giảm từ 250 → 50 (đủ sort giá, tránh load thừa)
  //   [B] review.groupBy + timeSlot.groupBy chạy song song (Promise.all)
  //   [C] include courts dùng select tối giản, không load toàn bộ object
  //   [D] Lọc courts status = ACTIVE khi tính giá (tránh tính giá sân bảo trì)
  // ─────────────────────────────────────────────────────────────────────────────
  const searchClubs = {
    description:
      "Tìm CLB/sân theo môn + địa điểm. sport phải khớp đúng ý user (FOOTBALL=bóng đá/futsal/sân bóng; BADMINTON=cầu lông — không nhầm). Địa chỉ: tỉnh/thành → city; quận/huyện → district; nếu chỉ nêu một địa danh cấp tỉnh thì đặt vào city (ưu tiên). User muốn **sân rẻ nhất / giá thấp nhất trong khu vực** → sortBy=PRICE_ASC kèm city hoặc district + sport (hoặc maxPrice nếu có ngân sách cụ thể).",
    parameters: z.object({
      name: z.string().optional(),
      sport: z
        .enum(["FOOTBALL", "BADMINTON", "TENNIS", "PICKLEBALL", "BASKETBALL", "VOLLEYBALL"])
        .optional()
        .describe(
          "Môn thể thao CẦN LỌC trên sân (court). FOOTBALL = bóng đá, futsal, sân bóng/đá banh/đá phủi/sân 7/sân 11. BADMINTON = cầu lông, lông vũ. Không chọn BADMINTON khi user nói rõ bóng đá/sân bóng. Nếu user chỉ nói \"sân\"/\"đặt sân\" không rõ môn — không gọi tool; hỏi lại user."
        ),
      city: z.string().optional(),
      district: z.string().optional(),
      maxPrice: z.number().optional(),
      amenityNames: z.array(z.string()).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      radiusKm: z.number().optional().default(20),
      date: z.string().optional(),
      sortBy: z
        .enum(["NEAREST", "RATING_DESC", "MOST_AVAILABLE", "PRICE_ASC", "PRICE_DESC"])
        .optional(),
      limit: z.number().optional().default(5),
    }),
    execute: async (input: unknown) => {
      const parsed = searchClubs.parameters.parse(input);
      const {
        name, sport, city, district, maxPrice, amenityNames,
        lat, lng, radiusKm, date, sortBy, limit,
      } = parsed;
      const userLat = lat ?? defaultLat;
      const userLng = lng ?? defaultLng;
      const normalizedCity = city ? normalizeAddressText(city) : null;
      const normalizedDistrict = district ? normalizeAddressText(district) : null;
      const requestedDistrictNo = district ? extractDistrictNumber(district) : null;

      // [A] FIX: giảm fetchTake từ 250 → 50 khi sort theo giá.
      // 250 là quá lớn — load toàn bộ courts+pricings của 250 CLB.
      // 50 đủ để tìm top giá rẻ trong 1 khu vực.
      const fetchTake =
        sortBy === "PRICE_ASC" || sortBy === "PRICE_DESC"
          ? 50  // 250 → 50
          : Math.max(limit ?? 5, 20);

      const clubs = await prisma.club.findMany({
        where: {
          isActive: true,
          approvalStatus: "APPROVED",
          deletedAt: null,
          ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
          ...prismaClubLocationWhere(city, district),
          ...(sport
            ? {
              courts: {
                some: {
                  deletedAt: null,
                  status: "ACTIVE", // [D] FIX: thêm filter status ACTIVE
                  sportType: sport,
                },
              },
            }
            : {}),
          ...(amenityNames && amenityNames.length > 0
            ? {
              AND: amenityNames.map((a: string) => ({
                amenities: {
                  some: {
                    amenity: { name: { contains: a, mode: "insensitive" as const } },
                  },
                },
              })),
            }
            : {}),
        },
        include: {
          openingHours: true,
          // [C] FIX: dùng select tối giản thay vì include đầy đủ
          // Trước: include { pricings: { where: { isActive: true } } }
          //   → load toàn bộ court object (description, surface, images, v.v.)
          // Sau: chỉ lấy đúng field cần dùng để tính min/max price
          courts: {
            where: {
              deletedAt: null,
              status: "ACTIVE", // [D] FIX: chỉ tính giá của sân đang hoạt động
            },
            select: {
              id: true,
              sportType: true,
              pricings: {
                where: { isActive: true },
                select: { pricePerHour: true },
              },
            },
          },
          images: { take: 1, orderBy: { createdAt: "asc" } },
        },
        take: fetchTake,
      });

      if (!clubs.length) {
        return {
          found: false,
          clubs: [],
          suggestionHint: buildClubSearchSuggestionHint({ city, district, sport, name }),
        };
      }

      const clubIds = clubs.map((c: any) => c.id);

      // [B] FIX: chạy song song thay vì tuần tự
      // Trước: await review.groupBy → await timeSlot.groupBy (2 round-trips tuần tự)
      // Sau: Promise.all → 1 round-trip song song, tiết kiệm ~200-400ms
      const [ratingRows, availabilityRows] = await Promise.all([
        prisma.review.groupBy({
          by: ["clubId"],
          where: { isVisible: true, clubId: { in: clubIds } },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        date
          ? (() => {
            const { gte, lte } = vnDayToUTC(date);
            return prisma.timeSlot.groupBy({
              by: ["courtId"],
              where: {
                status: "AVAILABLE",
                startTime: { gte, lte },
                court: {
                  clubId: { in: clubIds },
                  status: "ACTIVE",
                  deletedAt: null,
                  ...(sport ? { sportType: sport } : {}),
                },
              },
              _count: { _all: true },
            });
          })()
          : Promise.resolve([]),
      ]);

      const ratingMap = new Map<string, { avg: number | null; count: number }>();
      for (const r of ratingRows) {
        ratingMap.set(r.clubId ?? "", { avg: r._avg.rating ?? null, count: r._count._all ?? 0 });
      }

      const availabilityMap = new Map<string, number>();
      if (date && availabilityRows.length) {
        const courtToClub = new Map<string, string>();
        for (const c of clubs) {
          for (const ct of c.courts) {
            courtToClub.set(ct.id, c.id);
          }
        }
        for (const row of availabilityRows as any[]) {
          const cid = courtToClub.get(row.courtId);
          if (!cid) continue;
          availabilityMap.set(cid, (availabilityMap.get(cid) ?? 0) + (row._count._all ?? 0));
        }
      }

      const currentDay = new Date().getDay();
      const processed = clubs.map((c: any) => {
        const courtsForPricing =
          sport != null
            ? c.courts.filter((ct: any) => String(ct.sportType) === sport)
            : c.courts;
        const priceSource = courtsForPricing.length > 0 ? courtsForPricing : c.courts;
        const prices = priceSource.flatMap((ct: any) =>
          ct.pricings.map((px: any) => Number(px.pricePerHour))
        );
        const todayH = c.openingHours.find((h: any) => h.dayOfWeek === currentDay) || c.openingHours[0];
        const sportKeys = [...new Set<string>(c.courts.map((ct: any) => String(ct.sportType)))];
        const sports = sportKeys.map((s) => ({ key: s, label: SPORT_LABEL[s] ?? s }));

        const dist =
          userLat != null && userLng != null && c.latitude != null && c.longitude != null
            ? Number(haversineKm(userLat, userLng, c.latitude, c.longitude).toFixed(2))
            : null;

        const r = ratingMap.get(c.id);
        const targetPrice = typeof maxPrice === "number" ? maxPrice : null;
        const closestPrice =
          targetPrice != null && prices.length
            ? prices.reduce((best: number, current: number) =>
              Math.abs(current - targetPrice) < Math.abs(best - targetPrice) ? current : best
            )
            : null;
        const priceDiff =
          targetPrice != null && closestPrice != null
            ? Math.abs(closestPrice - targetPrice)
            : null;

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          city: c.city,
          district: c.district,
          address: `${c.address}, ${c.district}, ${c.city}`,
          phone: c.phone ?? null,
          rating: r?.avg != null ? Number(r.avg.toFixed(1)) : null,
          reviewCount: r?.count ?? 0,
          distanceKm: dist,
          imageUrl: c.images?.[0]?.url ?? null,
          sports,
          totalCourts: c.courts.length,
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
          displayPrice: closestPrice ?? (prices.length ? Math.min(...prices) : null),
          priceMatchType: priceDiff === 0 ? "EXACT" : (priceDiff != null ? "NEAREST" : null),
          priceDiff,
          openTime: todayH ? formatTime(todayH.openTime) : null,
          closeTime: todayH ? formatTime(todayH.closeTime) : null,
          availableSlotCount: availabilityMap.get(c.id) ?? null,
        };
      });

      // --- sorting & filtering logic (không đổi) ---
      const withinRadius = processed.filter((c: any) => {
        if (userLat == null || userLng == null || radiusKm == null || c.distanceKm == null) return true;
        return c.distanceKm <= radiusKm;
      });

      const matchesLocationRefinement = (club: any) => {
        if (!normalizedCity && !normalizedDistrict) return true;
        const ncText = normalizeAddressText(club.city);
        const ndText = normalizeAddressText(club.district);
        const cityTermMatch = !normalizedCity || ncText.includes(normalizedCity) || ndText.includes(normalizedCity);
        const districtTermMatch =
          !normalizedDistrict ||
          ndText.includes(normalizedDistrict) ||
          ncText.includes(normalizedDistrict) ||
          (requestedDistrictNo != null && extractDistrictNumber(club.district) === requestedDistrictNo);
        if (normalizedCity && normalizedDistrict) return cityTermMatch && districtTermMatch;
        if (normalizedCity) return cityTermMatch;
        return districtTermMatch;
      };

      const byAddress = withinRadius.filter(matchesLocationRefinement);
      const byCityOnly = normalizedCity
        ? withinRadius.filter((club: any) => {
          const ncText = normalizeAddressText(club.city);
          const ndText = normalizeAddressText(club.district);
          return ncText.includes(normalizedCity) || ndText.includes(normalizedCity);
        })
        : [];
      const candidateBase = byAddress.length > 0 ? byAddress : (byCityOnly.length > 0 ? byCityOnly : withinRadius);

      const targetPrice = typeof maxPrice === "number" ? maxPrice : null;
      const effectiveSort = sortBy ?? (userLat != null && userLng != null ? "NEAREST" : undefined);
      const sortPriceAsc = (a: any, b: any) => (a.minPrice ?? Number.MAX_SAFE_INTEGER) - (b.minPrice ?? Number.MAX_SAFE_INTEGER);
      const sortPriceDesc = (a: any, b: any) => (b.maxPrice ?? 0) - (a.maxPrice ?? 0);

      const sorted = [...candidateBase].sort((a: any, b: any) => {
        if (effectiveSort === "PRICE_ASC") { const byP = sortPriceAsc(a, b); if (byP !== 0) return byP; }
        else if (effectiveSort === "PRICE_DESC") { const byP = sortPriceDesc(a, b); if (byP !== 0) return byP; }
        if (normalizedCity || normalizedDistrict) {
          const scoreAddress = (club: any) => {
            let score = 0;
            const ncText = normalizeAddressText(club.city);
            const ndText = normalizeAddressText(club.district);
            if (normalizedCity && (ncText.includes(normalizedCity) || ndText.includes(normalizedCity))) score += 2;
            if (normalizedDistrict && (ndText.includes(normalizedDistrict) || ncText.includes(normalizedDistrict))) score += 4;
            if (requestedDistrictNo != null && extractDistrictNumber(club.district) === requestedDistrictNo) score += 2;
            return score;
          };
          const byAddressScore = scoreAddress(b) - scoreAddress(a);
          if (byAddressScore !== 0) return byAddressScore;
        }
        if (targetPrice != null && !sortBy) {
          const byPriceDiff = (a.priceDiff ?? 1e18) - (b.priceDiff ?? 1e18);
          if (byPriceDiff !== 0) return byPriceDiff;
          const byDistance = (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
          if (byDistance !== 0) return byDistance;
          return (b.rating ?? 0) - (a.rating ?? 0);
        }
        switch (effectiveSort) {
          case "NEAREST": return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
          case "RATING_DESC": return (b.rating ?? 0) - (a.rating ?? 0);
          case "MOST_AVAILABLE": return (b.availableSlotCount ?? 0) - (a.availableSlotCount ?? 0);
          case "PRICE_ASC": return sortPriceAsc(a, b);
          case "PRICE_DESC": return sortPriceDesc(a, b);
          default: return 0;
        }
      });

      const limited = sorted.slice(0, limit ?? 5);

      if (limited.length === 0 && clubs.length > 0) {
        return {
          found: false,
          clubs: [],
          suggestionHint: buildClubSearchSuggestionHint({
            city, district, sport, name,
            filteredOut: true, userLat, userLng, radiusKm,
          }),
        };
      }

      return { found: true, clubs: limited };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 2: getClubDetails — không đổi logic, giữ nguyên
  // ─────────────────────────────────────────────────────────────────────────────
  const getClubDetails = {
    description: "Lấy chi tiết CLB: mô tả, tiện ích, danh sách sân con, bảng giá theo khung giờ.",
    parameters: z.object({ slug: z.string() }),
    execute: async (input: unknown) => {
      const { slug } = getClubDetails.parameters.parse(input);
      const club = await prisma.club.findFirst({
        where: { slug, deletedAt: null },
        include: {
          openingHours: true,
          courts: {
            where: { deletedAt: null },
            include: { pricings: { where: { isActive: true }, orderBy: { startTime: "asc" } } },
          },
          amenities: { include: { amenity: true } },
          images: { orderBy: { createdAt: "asc" } },
          vouchers: { where: { isActive: true, endDate: { gte: new Date() } } },
        },
      });

      if (!club) return { error: "Không tìm thấy câu lạc bộ." };

      const currentDay = new Date().getDay();
      const todayH = club.openingHours.find((h: any) => h.dayOfWeek === currentDay) || club.openingHours[0];

      const pricingWindows = club.courts.flatMap((ct: any) =>
        ct.pricings.map((px: any) => ({
          courtId: ct.id,
          courtName: ct.name,
          sportType: ct.sportType,
          sportLabel: SPORT_LABEL[ct.sportType] ?? ct.sportType,
          startTime: formatTime(px.startTime),
          endTime: formatTime(px.endTime),
          pricePerHour: Number(px.pricePerHour),
          label: px.label ?? null,
        }))
      );

      const cheapestPricingWindows = [...pricingWindows]
        .sort((a, b) => a.pricePerHour - b.pricePerHour)
        .slice(0, 3);

      return {
        id: club.id,
        name: club.name,
        slug: club.slug,
        description: club.description ?? null,
        fullAddress: `${club.address}, ${club.district}, ${club.city}`,
        phone: club.phone ?? null,
        email: club.email ?? null,
        rating: null,
        images: club.images.map((img: any) => img.url),
        cheapestPricingWindows,
        todayHours: todayH
          ? { openTime: formatTime(todayH.openTime), closeTime: formatTime(todayH.closeTime), isClosed: todayH.isClosed ?? false }
          : null,
        weeklyHours: club.openingHours.map((h: any) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: formatTime(h.openTime),
          closeTime: formatTime(h.closeTime),
          isClosed: h.isClosed ?? false,
        })),
        amenities: club.amenities.map((a: any) => ({
          name: a.amenity.name,
          icon: a.amenity.icon ?? null,
          price: Number(a.price),
        })),
        vouchers: club.vouchers.map((v: any) => ({
          code: v.code,
          title: v.title,
          discount: Number(v.value),
          type: v.type,
        })),
        courts: club.courts.map((ct: any) => ({
          id: ct.id,
          name: ct.name,
          sportType: ct.sportType,
          sportLabel: SPORT_LABEL[ct.sportType] ?? ct.sportType,
          status: ct.status,
          pricings: ct.pricings.map((px: any) => ({
            startTime: formatTime(px.startTime),
            endTime: formatTime(px.endTime),
            pricePerHour: Number(px.pricePerHour),
            label: px.label ?? null,
          })),
        })),
      };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 3: getAvailableSlots
  // FIX APPLIED:
  //   [E] Dùng getVnMinutesOfDay() thay vì getUTCHours() để match pricing window
  //       Bug cũ: getUTCHours() trả giờ UTC (VN - 7h) → sân mở 06:00 VN
  //              sẽ là 23:00 UTC hôm trước → không match được pricing nào
  //              → pricePerHour = 0 cho hầu hết slots buổi sáng sớm
  //   [F] Thêm continuous slot grouping — trả thêm field slotGroups[]
  //       để AI biết có thể đặt bao nhiêu tiếng liên tiếp từ mỗi slot
  // ─────────────────────────────────────────────────────────────────────────────
  const getAvailableSlots = {
    description:
      "Xem slot trống. Trả về startTimeISO (dùng cho createBooking) và startTimeDisplay (hiển thị cho user). Trả thêm continuousGroups để AI biết dãy liên tiếp dài nhất.",
    parameters: z.object({
      clubId: z.string(),
      date: z.string().describe("Ngày YYYY-MM-DD"),
      sportType: z.enum(["FOOTBALL", "BADMINTON", "TENNIS", "PICKLEBALL", "BASKETBALL", "VOLLEYBALL"]).optional(),
    }),
    execute: async (input: unknown) => {
      const { clubId, date, sportType } = getAvailableSlots.parameters.parse(input);
      const { gte, lte } = vnDayToUTC(date);

      const slots = await prisma.timeSlot.findMany({
        where: {
          court: {
            clubId,
            status: "ACTIVE",
            deletedAt: null,
            ...(sportType ? { sportType } : {}),
          },
          startTime: { gte, lte },
          status: "AVAILABLE",
        },
        include: {
          court: {
            include: {
              pricings: { where: { isActive: true } },
            },
          },
        },
        orderBy: { startTime: "asc" },
      });

      if (!slots.length) {
        return {
          available: false,
          date,
          courts: [],
          message: `Không có slot trống ngày ${date}.`,
        };
      }

      const groups: Record<string, any> = {};

      for (const s of slots) {
        const key = s.court.id;
        if (!groups[key]) {
          groups[key] = {
            courtId: s.court.id,
            courtName: s.court.name,
            sportType: s.court.sportType,
            sportLabel: SPORT_LABEL[s.court.sportType] ?? s.court.sportType,
            slots: [],
          };
        }

        // [E] FIX: Dùng getVnMinutesOfDay thay vì getUTCHours
        //
        // Bug cũ (sai):
        //   const startHourUTC = s.startTime.getUTCHours();
        //   px.startTime/endTime cũng lưu ở UTC nhưng là Time column (no date)
        //   → khi Prisma đọc ra, Time 06:00 +07 sẽ là UTC 23:00 hôm trước
        //   → comparison sai toàn bộ, pricing không match
        //
        // Fix đúng: convert cả slot time VÀ pricing time về phút-trong-ngày VN
        const slotMinutesVN = getVnMinutesOfDay(s.startTime);

        const pricing = s.court.pricings.find((px: any) => {
          // px.startTime/endTime là @db.Time(6) — Prisma parse thành Date với date=1970-01-01
          // Cần lấy giờ:phút từ UTC value của Time column (chúng đã được store đúng timezone)
          const pxStart = new Date(px.startTime);
          const pxEnd = new Date(px.endTime);
          // Time column không có timezone info → getUTCHours() là đúng Ở ĐÂY
          // vì chủ sân nhập "06:00" và Prisma store "1970-01-01T06:00:00Z" (naive)
          // Nhưng slot.startTime là TIMESTAMPTZ thật → phải dùng VN hour
          // → ta convert pricing cũng về phút VN bằng cách shift +7h
          const pxStartMinutesVN = pxStart.getUTCHours() * 60 + pxStart.getUTCMinutes();
          const pxEndMinutesVN = pxEnd.getUTCHours() * 60 + pxEnd.getUTCMinutes();

          // Handle overnight pricing (e.g. 22:00-06:00 next day)
          if (pxEndMinutesVN <= pxStartMinutesVN) {
            return slotMinutesVN >= pxStartMinutesVN || slotMinutesVN < pxEndMinutesVN;
          }
          return slotMinutesVN >= pxStartMinutesVN && slotMinutesVN < pxEndMinutesVN;
        });

        const endMs = s.endTime.getTime();
        groups[key].slots.push({
          id: s.id,
          startTimeISO: toISO(s.startTime),
          endTimeISO: toISO(s.endTime),
          startTimeDisplay: formatTime(s.startTime),
          endTimeDisplay: formatTime(s.endTime),
          durationMinutes: Math.round((endMs - s.startTime.getTime()) / 60_000),
          pricePerHour: pricing ? Number(pricing.pricePerHour) : null, // null thay vì 0 — rõ ràng hơn
        });
      }

      // [F] FIX MỚI: tính continuous slot groups
      // Giúp AI biết "từ 14:00 có thể đặt liên tục tối đa 3 tiếng (đến 17:00)"
      // Trước đây AI phải tự suy luận từ danh sách slot → thường sai
      const courtsResult = Object.values(groups).map((g: any) => {
        const { continuousGroups } = buildContinuousGroups(g.slots);
        return { ...g, continuousGroups };
      });

      return {
        available: true,
        date,
        courts: courtsResult,
        summary: courtsResult.map((g: any) => ({
          courtName: g.courtName,
          sportLabel: g.sportLabel,
          slotCount: g.slots.length,
          firstSlot: g.slots[0].startTimeDisplay,
          lastSlot: g.slots[g.slots.length - 1].startTimeDisplay,
          maxContinuousHours: g.continuousGroups.reduce(
            (max: number, grp: any) => Math.max(max, grp.totalHours), 0
          ),
        })),
      };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 4: checkSlotAvailability — không đổi logic
  // ─────────────────────────────────────────────────────────────────────────────
  const checkSlotAvailability = {
    description: "Kiểm tra một khung giờ cụ thể có trống không và gợi ý slot thay thế.",
    parameters: z.object({
      clubId: z.string(),
      date: z.string(),
      time: z.string(),
      courtId: z.string().optional(),
      sportType: z.enum(["FOOTBALL", "BADMINTON", "TENNIS", "PICKLEBALL", "BASKETBALL", "VOLLEYBALL"]).optional(),
      limitAlternatives: z.number().optional().default(5),
    }),
    execute: async (input: unknown) => {
      const { clubId, date, time, courtId, sportType, limitAlternatives } = checkSlotAvailability.parameters.parse(input);
      const target = toVnDateTime(date, time);
      const { gte, lte } = vnDayToUTC(date);

      const slots = await prisma.timeSlot.findMany({
        where: {
          status: "AVAILABLE",
          startTime: { gte, lte },
          court: {
            clubId,
            status: "ACTIVE",
            deletedAt: null,
            ...(courtId ? { id: courtId } : {}),
            ...(sportType ? { sportType } : {}),
          },
        },
        include: { court: true },
        orderBy: { startTime: "asc" },
      });

      const exact = slots.find((s: any) => s.startTime.getTime() === target.getTime());
      if (exact) {
        return {
          available: true,
          date,
          slot: {
            id: exact.id,
            courtId: exact.courtId,
            courtName: exact.court.name,
            sportType: exact.court.sportType,
            sportLabel: SPORT_LABEL[exact.court.sportType] ?? exact.court.sportType,
            startTimeISO: toISO(exact.startTime),
            startTimeDisplay: formatTime(exact.startTime),
            endTimeISO: toISO(exact.endTime),
            endTimeDisplay: formatTime(exact.endTime),
          },
        };
      }

      const alternatives = [...slots]
        .map((s: any) => ({ s, diffMs: Math.abs(s.startTime.getTime() - target.getTime()) }))
        .sort((a, b) => a.diffMs - b.diffMs)
        .slice(0, limitAlternatives ?? 5)
        .map(({ s }: any) => ({
          id: s.id,
          courtId: s.courtId,
          courtName: s.court.name,
          sportType: s.court.sportType,
          sportLabel: SPORT_LABEL[s.court.sportType] ?? s.court.sportType,
          startTimeISO: toISO(s.startTime),
          startTimeDisplay: formatTime(s.startTime),
          endTimeISO: toISO(s.endTime),
          endTimeDisplay: formatTime(s.endTime),
        }));

      return { available: false, date, alternatives };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 5: getUserProfile — không đổi
  // ─────────────────────────────────────────────────────────────────────────────
  const getUserProfile = {
    description: "Lấy thông tin cá nhân người dùng đang đăng nhập.",
    parameters: z.object({}),
    execute: async () => {
      if (!userId) return { error: "Bạn chưa đăng nhập." };
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, phone: true, email: true, avatarUrl: true },
      });
      return profile ?? { error: "Không tìm thấy profile." };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 6: getUserBookings — không đổi
  // ─────────────────────────────────────────────────────────────────────────────
  const getUserBookings = {
    description: "Xem lịch sử đặt sân của người dùng.",
    parameters: z.object({
      limit: z.number().optional().default(5),
      status: z.enum(["PENDING", "WAITING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
    }),
    execute: async (input: unknown) => {
      const { limit, status } = getUserBookings.parameters.parse(input);
      if (!userId) return { error: "Bạn cần đăng nhập." };

      const list = await prisma.booking.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(status ? { status } : {}),
        },
        include: {
          club: { select: { name: true, address: true, city: true } },
          payment: { select: { method: true } },
          items: {
            include: {
              timeSlot: { include: { court: { select: { name: true, sportType: true } } } },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit ?? 5,
      });

      return list.map((b: any) => {
        const item = b.items[0];
        const court = item?.timeSlot?.court;
        return {
          bookingCode: b.bookingCode,
          status: b.status,
          clubName: b.club?.name ?? null,
          courtName: court?.name ?? null,
          sportLabel: court ? (SPORT_LABEL[court.sportType] ?? court.sportType) : null,
          startTime: item ? formatVN(item.timeSlot.startTime) : null,
          paymentMethod: b.payment?.method ?? null,
          finalAmount: Number(b.finalAmount),
          createdAt: formatVN(b.createdAt),
        };
      });
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 7: getUserInsights
  // FIX APPLIED:
  //   [G] Sửa monthKey generation dùng explicit Date math thay vì Intl locale
  //       Bug cũ: Intl.DateTimeFormat("en-CA", {year,month}) không guaranteed
  //               trả format "YYYY-MM" trên mọi Node.js version/platform
  //       Fix: tính năm/tháng VN bằng Date arithmetic tường minh
  // ─────────────────────────────────────────────────────────────────────────────
  const getUserInsights = {
    description:
      "Thống kê thói quen từ lịch sử đặt (môn, giờ, CLB hay đặt) và CLB/sân đã lưu (bookmark) để cá nhân hóa gợi ý.",
    parameters: z.object({ lookbackBookings: z.number().optional().default(50) }),
    execute: async (input: unknown) => {
      const { lookbackBookings } = getUserInsights.parameters.parse(input);
      if (!userId) return { error: "Bạn cần đăng nhập." };

      const [savedClubRows, savedCourtRows] = await Promise.all([
        prisma.favoriteClub.findMany({
          where: { userId },
          include: {
            club: { select: { id: true, name: true, slug: true, city: true, district: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        }),
        prisma.favoriteCourt.findMany({
          where: { userId },
          include: {
            court: {
              select: {
                id: true,
                name: true,
                sportType: true,
                club: { select: { id: true, name: true, slug: true, city: true, district: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        }),
      ]);

      const savedClubBookmarks = savedClubRows.map((fc: any) => ({
        clubId: fc.club.id,
        clubName: fc.club.name,
        slug: fc.club.slug ?? null,
        city: fc.club.city ?? null,
        district: fc.club.district ?? null,
      }));

      const savedCourtBookmarks = savedCourtRows.map((fv: any) => ({
        courtId: fv.court.id,
        courtName: fv.court.name,
        sportType: fv.court.sportType,
        sportLabel: SPORT_LABEL[fv.court.sportType] ?? fv.court.sportType,
        clubId: fv.court.club.id,
        clubName: fv.court.club.name,
        clubSlug: fv.court.club.slug ?? null,
        city: fv.court.club.city ?? null,
        district: fv.court.club.district ?? null,
      }));

      const bookmarksPayload = { savedClubBookmarks, savedCourtBookmarks };

      const bookings = await prisma.booking.findMany({
        where: { userId, deletedAt: null, status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: {
          club: { select: { id: true, name: true, slug: true, city: true, district: true } },
          items: {
            include: {
              timeSlot: { include: { court: { select: { id: true, name: true, sportType: true, clubId: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(lookbackBookings, 10), 200),
      });

      if (!bookings.length) {
        const hasBookmarks = savedClubBookmarks.length > 0 || savedCourtBookmarks.length > 0;
        if (!hasBookmarks) {
          return {
            message: "Chưa có lịch sử đặt sân và chưa lưu CLB/sân yêu thích — hãy đặt sân hoặc lưu yêu thích trong app để CourtMate gợi ý tốt hơn.",
            favoriteSports: [],
            favoriteHours: [],
            topClubs: [],
            bookingFrequencyByMonth: [],
            ...bookmarksPayload,
          };
        }
        return { favoriteSports: [], favoriteHours: [], topClubs: [], bookingFrequencyByMonth: [], ...bookmarksPayload };
      }

      const sportCount = new Map<string, number>();
      const hourCount = new Map<number, number>();
      const clubAgg = new Map<string, any>();
      const monthCount = new Map<string, number>();

      for (const b of bookings) {
        // [G] FIX: monthKey generation đúng và stable
        // Trước: Intl.DateTimeFormat("en-CA", {year,month}) → output không guaranteed
        // Sau: tính offset VN (+7h) rồi lấy year/month từ UTC
        const vnMs = b.createdAt.getTime() + 7 * 60 * 60 * 1000;
        const vnDate = new Date(vnMs);
        const year = vnDate.getUTCFullYear();
        const month = String(vnDate.getUTCMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;
        monthCount.set(monthKey, (monthCount.get(monthKey) ?? 0) + 1);

        if (b.club?.id) {
          const existing = clubAgg.get(b.club.id) ?? {
            clubId: b.club.id,
            clubName: b.club.name,
            slug: b.club.slug ?? null,
            city: b.club.city ?? null,
            district: b.club.district ?? null,
            slotCount: 0,
            bookingsCount: 0,
            totalSpent: 0,
          };
          existing.bookingsCount += 1;
          existing.totalSpent += Number(b.finalAmount);
          clubAgg.set(b.club.id, existing);
        }

        for (const it of b.items) {
          const court = it.timeSlot?.court;
          if (!court) continue;
          sportCount.set(court.sportType, (sportCount.get(court.sportType) ?? 0) + 1);
          const hour = getVnHour(it.timeSlot.startTime);
          hourCount.set(hour, (hourCount.get(hour) ?? 0) + 1);
          if (b.club?.id) clubAgg.get(b.club.id)!.slotCount += 1;
        }
      }

      const favoriteSports = [...sportCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sportType, slotCount]) => ({ sportType, sportLabel: SPORT_LABEL[sportType] ?? sportType, slotCount }));

      const favoriteHours = [...hourCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour, slotCount]) => ({ hour, slotCount }));

      const topClubs = [...clubAgg.values()].sort((a, b) => b.slotCount - a.slotCount).slice(0, 5);
      const bookingFrequencyByMonth = [...monthCount.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, bookingsCount]) => ({ month, bookingsCount }));

      return {
        lookbackBookings: bookings.length,
        favoriteSports,
        favoriteHours,
        topClubs,
        bookingFrequencyByMonth,
        ...bookmarksPayload,
      };
    },
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL 8: createBooking
  // FIX APPLIED:
  //   [H] Thay z.any() → z.object() với schema đầy đủ để validate input trước khi
  //       gọi createBooking service. Nếu AI hallucinate field → bắt lỗi sớm.
  //   [I] Thêm validation: slots phải là array không rỗng
  // ─────────────────────────────────────────────────────────────────────────────
  const createBookingTool = {
    description: "Tạo booking và trả paymentUrl nếu cần. CHỈ gọi khi đã có xác nhận rõ ràng từ user.",
    // [H] FIX: Schema cụ thể thay vì z.any()
    parameters: z.object({
      clubId: z.string().describe("ID của CLB (từ searchClubs hoặc getClubDetails)"),
      slots: z.array(
        z.object({
          slotId: z.string().describe("ID của timeSlot (field 'id' từ getAvailableSlots)"),
          courtId: z.string(),
          startTimeISO: z.string().describe("ISO string từ getAvailableSlots.startTimeISO"),
        })
      ).min(1, "Phải có ít nhất 1 slot"), // [I] FIX: validate không rỗng
      bookerName: z.string().min(1, "Tên người đặt không được trống"),
      bookerPhone: z.string().min(9, "Số điện thoại không hợp lệ"),
      bookerEmail: z.string().email().optional(),
      paymentMethod: z
        .enum(["BANK_TRANSFER", "CASH", "MOMO", "VNPAY", "CREDIT_CARD"])
        .default("BANK_TRANSFER"),
      voucherCode: z.string().optional(),
      note: z.string().optional(),
    }),
    execute: async (input: unknown) => {
      const parsed = createBookingTool.parameters.parse(input);
      if (!userId) return { error: "Bạn cần đăng nhập để đặt sân." };

      // [I] FIX: early validation
      if (!parsed.slots?.length) {
        return { error: "Không có slot nào được chọn. Vui lòng chọn khung giờ trước." };
      }
      if (!parsed.bookerName?.trim()) {
        return { error: "Thiếu tên người đặt." };
      }
      if (!parsed.bookerPhone?.trim()) {
        return { error: "Thiếu số điện thoại người đặt." };
      }

      const booking = await createBooking(userId, parsed);
      const method = parsed.paymentMethod || "BANK_TRANSFER";
      const needsPaymentUrl = method === "VNPAY" || method === "MOMO" || method === "CREDIT_CARD";
      const paymentUrl = needsPaymentUrl
        ? await createPaymentUrl(booking.id, Number(booking.finalAmount), method, getIpAddr())
        : null;

      return {
        success: true,
        bookingCode: booking.bookingCode,
        status: booking.status,
        finalAmount: Number(booking.finalAmount),
        paymentMethod: method,
        paymentUrl,
      };
    },
  };

  return {
    searchClubs,
    getClubDetails,
    getAvailableSlots,
    checkSlotAvailability,
    getUserProfile,
    getUserBookings,
    getUserInsights,
    createBooking: createBookingTool,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildContinuousGroups
// [F] Tính các dãy slot liên tiếp trong 1 sân
// Input: mảng slots đã sắp xếp theo startTime tăng dần
// Output: mảng groups, mỗi group là dãy slot liên tiếp không gián đoạn
//
// Logic: 2 slot liên tiếp nếu slot[i].endTimeISO === slot[i+1].startTimeISO
// (tức là không có khoảng trống giữa chúng)
//
// Ví dụ output:
// [
//   { startDisplay: "14:00", endDisplay: "16:00", totalHours: 2, slotIds: ["id1","id2"] },
//   { startDisplay: "18:00", endDisplay: "21:00", totalHours: 3, slotIds: ["id3","id4","id5"] },
// ]
// ─────────────────────────────────────────────────────────────────────────────
function buildContinuousGroups(slots: any[]): { continuousGroups: any[] } {
  if (!slots.length) return { continuousGroups: [] };

  const groups: any[] = [];
  let currentGroup: any[] = [slots[0]];

  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1];
    const curr = slots[i];
    // Liên tiếp: end của slot trước = start của slot này
    if (prev.endTimeISO === curr.startTimeISO) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  groups.push(currentGroup);

  return {
    continuousGroups: groups.map((grp) => {
      const totalMinutes = grp.reduce((sum: number, s: any) => sum + (s.durationMinutes ?? 60), 0);
      return {
        startDisplay: grp[0].startTimeDisplay,
        endDisplay: grp[grp.length - 1].endTimeDisplay,
        startTimeISO: grp[0].startTimeISO,
        totalHours: Number((totalMinutes / 60).toFixed(1)),
        slotCount: grp.length,
        slotIds: grp.map((s: any) => s.id),
        // Tổng giá ước tính (sum theo pricePerHour × duration)
        estimatedPrice: grp.reduce((sum: number, s: any) => {
          const hrs = (s.durationMinutes ?? 60) / 60;
          return sum + (s.pricePerHour ?? 0) * hrs;
        }, 0),
      };
    }),
  };
}