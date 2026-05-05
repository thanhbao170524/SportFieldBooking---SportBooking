import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getPresetRange(preset: string): { start: Date; end: Date } | null {
  const now = new Date();
  const todayStart = startOfDay(now);

  if (preset === "last_week") {
    // previous 7 days (Mon-Sun not enforced) ending yesterday
    const end = new Date(todayStart.getTime() - 1);
    const start = startOfDay(new Date(end.getTime() - 6 * 24 * 3600 * 1000));
    return { start, end: endOfDay(end) };
  }

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfDay(start), end: endOfDay(now) };
  }

  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  return null;
}

const DEFAULT_COMMISSION_RATE = 0.1; // 10%

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);

    const preset = searchParams.get("preset");
    const startDateRaw = searchParams.get("startDate");
    const endDateRaw = searchParams.get("endDate");

    const presetRange = preset ? getPresetRange(preset) : null;
    const startDate = presetRange?.start ?? parseDate(startDateRaw) ?? startOfDay(new Date());
    const endDate = presetRange?.end ?? parseDate(endDateRaw) ?? endOfDay(new Date());

    // --- Users: new users in range ---
    const newUsersPromise = prisma.user.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    // --- Visits in range ---
    const totalVisitsPromise = prisma.visitLog.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });

    // --- Courts active ---
    const activeCourtsPromise = prisma.court.count({
      where: { status: "ACTIVE", deletedAt: null },
    });

    // --- Fill-rate: booked timeslots / total timeslots in range (active courts only) ---
    const totalSlotsPromise = prisma.timeSlot.count({
      where: {
        startTime: { gte: startDate, lte: endDate },
        court: { status: "ACTIVE", deletedAt: null },
      },
    });
    const bookedSlotsPromise = prisma.timeSlot.count({
      where: {
        status: "BOOKED",
        startTime: { gte: startDate, lte: endDate },
        court: { status: "ACTIVE", deletedAt: null },
      },
    });

    // --- Revenue in range (CONFIRMED) ---
    const revenuePromise = prisma.booking.aggregate({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { finalAmount: true },
      _count: { _all: true },
    });

    const [newUsers, totalVisits, activeCourts, totalSlots, bookedSlots, revenueAgg] =
      await Promise.all([
        newUsersPromise,
        totalVisitsPromise,
        activeCourtsPromise,
        totalSlotsPromise,
        bookedSlotsPromise,
        revenuePromise,
      ]);

    const totalRevenue = Number(revenueAgg._sum.finalAmount ?? 0);
    const platformCommission = Math.round(totalRevenue * DEFAULT_COMMISSION_RATE);

    const avgFillRate = totalSlots > 0 ? bookedSlots / totalSlots : 0;

    return successResponse("Dashboard thống kê admin", {
      range: { startDate, endDate, preset: preset || null },
      users: { newUsers },
      visits: { totalVisits },
      courts: { activeCourts, totalSlots, bookedSlots, avgFillRate },
      revenue: { totalRevenue, totalBookings: revenueAgg._count._all, platformCommission, commissionRate: DEFAULT_COMMISSION_RATE },
    });
  } catch (e) {
    return serverErrorResponse(e);
  }
}

