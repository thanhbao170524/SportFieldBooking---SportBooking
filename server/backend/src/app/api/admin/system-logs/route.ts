import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { badRequestResponse, serverErrorResponse, successResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

type SystemLogItem = {
  id: string;
  level: string;
  message: string;
  context: unknown;
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
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 20), 100);
    const skip = (page - 1) * pageSize;

    const level = searchParams.get("level") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const createdAt =
      startDate && endDate
        ? { gte: new Date(startDate), lte: new Date(endDate) }
        : undefined;

    const where = {
      ...(level ? { level } : {}),
      ...(q ? { message: { contains: q, mode: "insensitive" as const } } : {}),
      ...(createdAt ? { createdAt } : {})
    };

    const [items, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      prisma.systemLog.count({ where })
    ]);

    return successResponse("Lấy system logs thành công", {
      items: items as unknown as SystemLogItem[],
      page,
      pageSize,
      total
    });
  } catch (error: unknown) {
    console.error("GET System Logs Error:", error);
    return serverErrorResponse(error);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["manage_settings"]);
    if (auth.error) return auth.error;

    const body = (await req.json()) as {
      level?: string;
      message?: string;
      context?: unknown;
    };

    if (!body?.level || !body?.message) {
      return badRequestResponse("Thiếu level hoặc message");
    }

    const created = await prisma.systemLog.create({
      data: {
        level: body.level,
        message: body.message,
        context: body.context ?? undefined
      }
    });

    return successResponse("Tạo system log thành công", created, 201);
  } catch (error: unknown) {
    console.error("POST System Log Error:", error);
    return serverErrorResponse(error);
  }
}

