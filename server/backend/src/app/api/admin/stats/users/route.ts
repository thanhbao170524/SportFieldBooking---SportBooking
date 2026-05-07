import { NextRequest, NextResponse } from "next/server";
import { getUserStatsAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["view_stats"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const stats = await getUserStatsAdmin(startDate, endDate);

    return successResponse("Lấy thống kê người dùng thành công", stats);
  } catch (error: unknown) {
    console.error("GET User Stats Error:", error);
    return serverErrorResponse(error);
  }
}
