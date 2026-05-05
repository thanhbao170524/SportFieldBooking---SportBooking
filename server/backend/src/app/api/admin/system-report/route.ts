import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";

interface SystemReport {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  activeClubs: number;
  inactiveClubs: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const [
      totalUsers,
      totalBookings,
      revenue,
      activeClubs,
      inactiveClubs
    ] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { finalAmount: true }
      }),
      prisma.club.count({ where: { isActive: true } }),
      prisma.club.count({ where: { isActive: false } })
    ]);

    const report: SystemReport = {
      totalUsers,
      totalBookings,
      totalRevenue: Number(revenue._sum.finalAmount || 0),
      activeClubs,
      inactiveClubs
    };

    return successResponse("System report", report);
  } catch (e) {
    return serverErrorResponse(e);
  }
}