import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";

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

    // Owner clubs
    const clubs = await prisma.club.findMany({
      where: { ownerId: user.userId, deletedAt: null },
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

    // Bookings trong kỳ + payments
    const bookingsInRange = await prisma.booking.findMany({
      where: {
        clubId: { in: clubIds },
        status: "CONFIRMED",
        createdAt: { gte: start, lte: end },
        deletedAt: null
      },
      select: {
        id: true,
        bookingCode: true,
        createdAt: true,
        clubId: true,
        finalAmount: true,
        payment: {
          select: {
            method: true,
            status: true,
            confirmedAt: true,
            paidAt: true
          }
        },
        items: {
          select: { timeSlot: { select: { court: { select: { id: true, name: true } } } } }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 2000
    });

    const commissionRate = 0.1;
    const isOnline = (method?: string | null) =>
      method === "CREDIT_CARD" || method === "VNPAY" || method === "MOMO" || method === "BANK_TRANSFER";

    const totalRevenue = bookingsInRange.reduce((s, b) => s + Number(b.finalAmount || 0), 0);
    const totalBookings = bookingsInRange.length;

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

    // Ví: tính dựa trên doanh thu trong kỳ (để khớp “theo kỳ”)
    const grossWallet = totalRevenue;
    const commission = Math.round(grossWallet * commissionRate);
    const walletAvailable = Math.max(0, grossWallet - commission);

    // Need reconcile: bookings confirmed nhưng payment chưa confirmed (hoặc CASH)
    const needReconcile = bookingsInRange
      .filter((b) => {
        const p = b.payment;
        if (!p) return true;
        if (p.method === "CASH") return true;
        return p.status !== "CONFIRMED";
      })
      .reduce((s, b) => s + Number(b.finalAmount || 0), 0);

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
      const list = bookingsInRange.filter((b) => b.createdAt >= bStart && b.createdAt <= bEnd);
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

    // Recent transactions: map booking => tx
    const recentTransactions = bookingsInRange.slice(0, 10).map((b) => {
      const p = b.payment;
      const dt = p?.confirmedAt || p?.paidAt || b.createdAt;
      return {
        id: b.id,
        orderId: b.bookingCode,
        dateTime: dt,
        type: "deposit",
        typeLabel: "Thanh toán sân",
        amount: Number(b.finalAmount || 0),
        status: p?.status === "CONFIRMED" ? "success" : p?.status === "CANCELLED" ? "failed" : "pending",
        statusLabel: p?.status === "CONFIRMED" ? "Thành công" : p?.status === "CANCELLED" ? "Thất bại" : "Đang xử lý",
        method: p?.method || null
      };
    });

    // Breakdown by club
    const revenueByClub = clubIds.map((cid) => {
      const sum = bookingsInRange.filter((b) => b.clubId === cid).reduce((s, b) => s + Number(b.finalAmount || 0), 0);
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
    for (const b of bookingsInRange) {
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
        needReconcile,
        commissionRate,
        period,
        start,
        end,
        ratingCount: ratingAgg._count._all
      },
      chart,
      recentTransactions,
      breakdownByClub,
      topCourts
    });
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

