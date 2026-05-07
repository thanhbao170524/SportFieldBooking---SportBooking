import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";
import { successResponse, serverErrorResponse } from "@/lib/response";

interface TopCourt {
  courtId: string;
  courtName: string;
  totalBookings: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["view_stats"]);
    if (auth.error) return auth.error;

    const grouped = await prisma.booking.groupBy({
      by: ["courtId"],
      _count: { id: true },
      orderBy: {
        _count: { id: "desc" }
      },
      take: 5
    });

    const result: TopCourt[] = await Promise.all(
      grouped.map(async (item) => {
        const court = await prisma.court.findUnique({
          where: { id: item.courtId! }
        });

        return {
          courtId: item.courtId!,
          courtName: court?.name || "Unknown",
          totalBookings: item._count.id
        };
      })
    );

    return successResponse("Top courts", result);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}