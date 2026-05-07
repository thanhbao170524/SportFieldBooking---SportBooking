import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { serverErrorResponse, successResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

type VisitLogItem = {
  id: string;
  userId: string | null;
  path: string;
  ip: string | null;
  createdAt: Date;
};

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["view_stats"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 50), 200);
    const skip = (page - 1) * pageSize;

    const userId = searchParams.get("userId") ?? undefined;
    const path = searchParams.get("path") ?? undefined;
    const ip = searchParams.get("ip") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const createdAt =
      startDate && endDate
        ? { gte: new Date(startDate), lte: new Date(endDate) }
        : undefined;

    const where = {
      ...(userId ? { userId } : {}),
      ...(path ? { path: { contains: path, mode: "insensitive" as const } } : {}),
      ...(ip ? { ip } : {}),
      ...(createdAt ? { createdAt } : {})
    };

    const [items, total] = await Promise.all([
      prisma.visitLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      prisma.visitLog.count({ where })
    ]);

    return successResponse("Lấy visit logs thành công", {
      items: items as unknown as VisitLogItem[],
      page,
      pageSize,
      total
    });
  } catch (error: unknown) {
    console.error("GET Visit Logs Error:", error);
    return serverErrorResponse(error);
  }
}

