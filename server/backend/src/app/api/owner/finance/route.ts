import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";
import { FinanceService } from "@/modules/finance/finance.service";

/**
 * GET /api/owner/finance
 * Dashboard tài chính cho Owner: summary theo kỳ, chart (tối đa 12 điểm),
 * recent transactions, breakdown.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "week").toLowerCase(); // day|week|month|year
    const anchorDateStr = searchParams.get("date"); // YYYY-MM-DD
    const clubIdParam = (searchParams.get("clubId") || "").trim();
    const courtIdParam = (searchParams.get("courtId") || "").trim();

    const now = new Date();
    const anchor = anchorDateStr ? new Date(`${anchorDateStr}T00:00:00`) : now;

    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    let start: Date;
    let end: Date;

    if (period === "day") {
      start = startOfDay(anchor);
      end = endOfDay(anchor);
    } else if (period === "month") {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0);
      end = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    } else if (period === "year") {
      start = new Date(anchor.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = endOfDay(new Date(anchor.getFullYear(), 11, 31));
    } else {
      // week (default): 7 ngày gần nhất tính từ anchor (inclusive)
      end = endOfDay(anchor);
      start = startOfDay(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6));
    }

    // Owner clubs (optionally filter by clubId)
    const clubs = await prisma.club.findMany({
      where: {
        ownerId: user.userId,
        deletedAt: null,
        ...(clubIdParam ? { id: clubIdParam } : {}),
      },
      select: { id: true, name: true }
    });
    const clubIds = clubs.map((c) => c.id);

    // Nếu owner chưa có CLB → trả về rỗng để UI không lỗi
    if (clubIds.length === 0) {
      return successResponse("Tải dữ liệu tài chính thành công", {
        summary: {
          totalRevenue: 0,
          totalBookings: 0,
          avgRating: 0,
          commissionRate: 0.1
        },
        chart: [],
        recentTransactions: [],
        breakdownByClub: [],
        topCourts: []
      });
    }

    // If courtId is set, validate it belongs to selected clubs
    let courtIdFilter: string | null = null;
    if (courtIdParam) {
      const court = await prisma.court.findFirst({
        where: { id: courtIdParam, clubId: { in: clubIds }, deletedAt: null },
        select: { id: true },
      });
      if (court) courtIdFilter = court.id;
      else courtIdFilter = "__INVALID__"; // forces empty results safely
    }

    // Bookings trong kỳ (dùng createdAt để khớp các dashboard hiện tại)
    const bookingsInRange = await prisma.booking.findMany({
      where: {
        clubId: { in: clubIds },
        createdAt: { gte: start, lte: end },
        deletedAt: null
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        clubId: true,
        userId: true,
        finalAmount: true,
        payment: {
          select: {
            method: true,
            status: true,
            refundStatus: true,
            refundAmount: true,
            refundedAt: true,
          }
        },
        items: {
          select: {
            timeSlot: {
              select: {
                startTime: true,
                endTime: true,
                courtId: true,
                court: { select: { id: true, name: true } },
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 4000
    });

    const commissionRate = 0.1;
    const isOnline = (method?: string | null) =>
      method === "CREDIT_CARD" || method === "VNPAY" || method === "MOMO" || method === "BANK_TRANSFER";

    const matchesCourt = (b: (typeof bookingsInRange)[number]) => {
      if (!courtIdFilter) return true;
      if (courtIdFilter === "__INVALID__") return false;
      const slots = b.items?.map((i) => i.timeSlot?.courtId).filter(Boolean) || [];
      return slots.includes(courtIdFilter);
    };

    const scopedBookings = bookingsInRange.filter(matchesCourt);
    const confirmedBookingsList = scopedBookings.filter((b) => b.status === "CONFIRMED");
    const totalRevenue = confirmedBookingsList.reduce((s, b) => s + Number(b.finalAmount || 0), 0);
    const totalBookings = confirmedBookingsList.length;
    const averageBookingValue = totalBookings ? Math.round(totalRevenue / totalBookings) : 0;

    // Avg rating theo kỳ (Review.createdAt)
    const ratingAgg = await prisma.review.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        booking: {
          clubId: { in: clubIds }
        }
      },
      _avg: { rating: true },
      _count: { _all: true }
    });
    const avgRating = Number(ratingAgg._avg.rating || 0);

    // Lấy dữ liệu Ví thực tế từ DB
    const realWallet = await FinanceService.getOwnerWallet(user.userId);
    const walletAvailable = Number(realWallet.balance);
    const commissionRateFromProfile = 0.1; // Fallback or fetch from profile if needed

    // Need reconcile: booking confirmed nhưng CASH hoặc payment chưa confirmed
    const needReconcile = confirmedBookingsList
      .filter((b) => {
        const p = b.payment;
        if (!p) return true;
        if (p.method === "CASH") return true;
        return p.status !== "CONFIRMED";
      })
      .reduce((s, b) => s + Number(b.finalAmount || 0), 0);

    // Booking status breakdown
    const bookingStatusBreakdown = (["PENDING", "WAITING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED"] as const).map(
      (st) => ({
        status: st,
        count: scopedBookings.filter((b) => b.status === st).length
      })
    );

    // Cancel / refund stats
    const cancelledCount = scopedBookings.filter((b) => b.status === "CANCELLED").length;
    const refundRequestedCount = scopedBookings.filter((b) => b.payment?.refundStatus === "REQUESTED").length;
    const refundCompletedCount = scopedBookings.filter((b) => b.payment?.refundStatus === "COMPLETED").length;
    const refundTotalAmount = scopedBookings
      .filter((b) => b.payment?.refundStatus === "COMPLETED")
      .reduce((s, b) => s + Number(b.payment?.refundAmount || 0), 0);

    // Customer stats (new vs returning) in range based on Booking.createdAt
    const customerAgg = await prisma.booking.groupBy({
      by: ["userId"],
      where: {
        clubId: { in: clubIds },
        createdAt: { gte: start, lte: end },
        deletedAt: null,
        ...(courtIdFilter && courtIdFilter !== "__INVALID__"
          ? { items: { some: { timeSlot: { courtId: courtIdFilter } } } }
          : {}),
      },
      _count: { _all: true },
    });
    const uniqueCustomers = customerAgg.length;
    const repeatCustomers = customerAgg.filter((r) => (r._count as any)._all >= 2).length;
    const newCustomers = uniqueCustomers - repeatCustomers;

    // Top customers by spend in range (CONFIRMED only)
    const spendByUser = new Map<string, number>();
    for (const b of confirmedBookingsList) {
      spendByUser.set(b.userId, (spendByUser.get(b.userId) || 0) + Number(b.finalAmount || 0));
    }
    const topCustomerIds = [...spendByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    const topUsers = topCustomerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, fullName: true, email: true, phone: true },
        })
      : [];
    const topCustomers = topCustomerIds.map((uid) => {
      const u = topUsers.find((x) => x.id === uid);
      return {
        userId: uid,
        fullName: u?.fullName || "Khách",
        phone: u?.phone || null,
        email: u?.email || null,
        spent: Math.round(spendByUser.get(uid) || 0),
        bookings: customerAgg.find((x) => x.userId === uid)?._count?._all || 0,
      };
    });

    // Occupancy + heatmap (by timeslot hours) in range
    const timeSlotsInRange = await prisma.timeSlot.findMany({
      where: {
        court: { clubId: { in: clubIds }, deletedAt: null },
        startTime: { gte: start, lte: end },
        ...(courtIdFilter && courtIdFilter !== "__INVALID__" ? { courtId: courtIdFilter } : {}),
      },
      select: { id: true, startTime: true, endTime: true, status: true },
      take: 200000,
    });
    const bookedSlots = timeSlotsInRange.filter((s) => s.status === "BOOKED").length;
    const totalSlots = timeSlotsInRange.length || 0;
    const occupancyRate = totalSlots ? Math.round((bookedSlots * 10000) / totalSlots) / 100 : 0;

    // Heatmap by dayOfWeek (0..6) and hour (0..23) using slot start hour
    const heatmap: { day: number; hour: number; booked: number; total: number }[] = [];
    const hm = new Map<string, { day: number; hour: number; booked: number; total: number }>();
    for (const s of timeSlotsInRange) {
      const d = s.startTime.getDay();
      const h = s.startTime.getHours();
      const key = `${d}-${h}`;
      const cur = hm.get(key) || { day: d, hour: h, booked: 0, total: 0 };
      cur.total += 1;
      if (s.status === "BOOKED") cur.booked += 1;
      hm.set(key, cur);
    }
    heatmap.push(...hm.values());

    // Chart: tối đa 12 buckets theo kỳ
    const ms = (d: Date) => d.getTime();
    const clampBuckets = (n: number) => Math.max(1, Math.min(12, n));

    const buckets =
      period === "year"
        ? 12
        : period === "week"
          ? 7
          : period === "day"
            ? 12
            : 12; // month default 12 buckets

    const bucketCount = clampBuckets(buckets);
    const totalMs = Math.max(1, ms(end) - ms(start) + 1);
    const bucketMs = Math.ceil(totalMs / bucketCount);

    const fmt2 = (n: number) => String(n).padStart(2, "0");
    const labelFor = (d: Date) => `${fmt2(d.getDate())}/${fmt2(d.getMonth() + 1)}`;

    const chart = Array.from({ length: bucketCount }, (_, i) => {
      const bStart = new Date(ms(start) + i * bucketMs);
      const bEnd = new Date(Math.min(ms(end), ms(start) + (i + 1) * bucketMs - 1));
      const list = confirmedBookingsList.filter((b) => b.createdAt >= bStart && b.createdAt <= bEnd);
      const onlineAmount = list.filter((b) => isOnline(b.payment?.method)).reduce((s, b) => s + Number(b.finalAmount || 0), 0);
      const cashAmount = list.filter((b) => b.payment?.method === "CASH").reduce((s, b) => s + Number(b.finalAmount || 0), 0);
      const bookingsCount = list.length;

      let label = labelFor(bStart);
      if (period === "year") {
        label = `T${bStart.getMonth() + 1}`;
      } else if (period === "day") {
        label = `${fmt2(bStart.getHours())}:00`;
      } else if (period === "week") {
        const map = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        label = map[bStart.getDay()];
      }

      return {
        label,
        start: bStart.toISOString(),
        end: bEnd.toISOString(),
        onlineAmount,
        cashAmount,
        bookingsCount
      };
    });

    // Recent transactions: map real wallet transactions
    const recentTransactions = realWallet.transactions.map((tx) => {
      return {
        id: tx.id,
        orderId: tx.bookingId || "N/A",
        dateTime: tx.createdAt,
        type: tx.type.toLowerCase(),
        typeLabel: tx.type === "BOOKING_REVENUE" ? "Doanh thu" : tx.type === "COMMISSION_FEE" ? "Phí sàn" : tx.type === "WITHDRAWAL" ? "Rút tiền" : "Điều chỉnh",
        amount: Number(tx.amount),
        status: "success", // Wallet transactions are historical successes
        statusLabel: "Thành công",
        note: tx.note
      };
    });

    // Breakdown by club
    const revenueByClub = clubIds.map((cid) => {
      const sum = confirmedBookingsList.filter((b) => b.clubId === cid).reduce((s, b) => s + Number(b.finalAmount || 0), 0);
      const name = clubs.find((c) => c.id === cid)?.name || "Cơ sở";
      return { clubId: cid, name, revenue: sum };
    }).filter(r => r.revenue > 0);
    const totalRevenueByClub = revenueByClub.reduce((s, r) => s + r.revenue, 0) || 1;
    const breakdownByClub = revenueByClub
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((r, idx) => ({
        name: r.name,
        value: r.revenue,
        percent: Math.round((r.revenue * 100) / totalRevenueByClub),
        color: ["#10b981", "#3b82f6", "#f97316", "#a855f7", "#eab308", "#ef4444"][idx % 6]
      }));

    // Top courts by revenue
    const courtRevenue = new Map<string, { name: string; revenue: number; bookings: number }>();
    for (const b of confirmedBookingsList) {
      const courts = b.items?.map(i => i.timeSlot.court).filter(Boolean) || [];
      const uniq = new Map<string, string>();
      for (const c of courts) uniq.set(c.id, c.name);
      // chia đều finalAmount cho các sân trong booking (approx)
      const share = uniq.size ? Number(b.finalAmount || 0) / uniq.size : Number(b.finalAmount || 0);
      for (const [cid, cname] of uniq.entries()) {
        const cur = courtRevenue.get(cid) || { name: cname, revenue: 0, bookings: 0 };
        cur.revenue += share;
        cur.bookings += 1;
        courtRevenue.set(cid, cur);
      }
    }
    const topCourts = [...courtRevenue.entries()]
      .map(([id, v]) => ({ id, name: v.name, revenue: Math.round(v.revenue), bookings: v.bookings }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return successResponse("Tải dữ liệu tài chính thành công", {
      summary: {
        totalRevenue,
        totalBookings,
        avgRating,
        walletAvailable,
        totalEarned: Number(realWallet.totalEarned || 0),
        totalWithdrawn: Number(realWallet.totalWithdrawn || 0),
        needReconcile,
        commissionRate: commissionRateFromProfile,
        averageBookingValue,
        occupancyRate,
        cancelledCount,
        refundRequestedCount,
        refundCompletedCount,
        refundTotalAmount,
        uniqueCustomers,
        newCustomers,
        repeatCustomers,
        clubId: clubIdParam || null,
        courtId: courtIdFilter && courtIdFilter !== "__INVALID__" ? courtIdFilter : null,
        period,
        start,
        end,
        ratingCount: ratingAgg._count._all
      },
      bookingStatusBreakdown,
      chart,
      heatmap,
      topCustomers,
      recentTransactions,
      breakdownByClub,
      topCourts
    });
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

