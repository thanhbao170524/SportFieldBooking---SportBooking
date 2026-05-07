import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";
import { successResponse, serverErrorResponse } from "@/lib/response";

interface TopUser {
  userId: string;
  email: string;
  totalBookings: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["view_stats"]);
    if (auth.error) return auth.error;

    const grouped = await prisma.booking.groupBy({
      by: ["userId"],
      _count: { id: true },
      orderBy: {
        _count: { id: "desc" }
      },
      take: 5
    });

    const result: TopUser[] = await Promise.all(
      grouped.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.userId }
        });

        return {
          userId: item.userId,
          email: user?.email || "Unknown",
          totalBookings: item._count.id
        };
      })
    );

    return successResponse("Top users", result);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}