import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";

/**
 * GET /api/owner/reports
 * Danh sách khiếu nại/góp ý mà Owner đã gửi (theo reporterId).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "").trim().toUpperCase();

    const reports = await prisma.report.findMany({
      where: {
        reporterId: user.userId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse("Lấy danh sách báo cáo thành công", reports);
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

