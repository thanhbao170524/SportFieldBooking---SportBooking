import { NextRequest, NextResponse } from "next/server";
import { getCourtStatsAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";

interface CourtStats {
  total: number;
  active: number;
  suspended: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const stats: CourtStats = await getCourtStatsAdmin();

    return successResponse("Lấy thống kê sân thành công", stats);
  } catch (error: unknown) {
    console.error("GET Court Stats Error:", error);
    return serverErrorResponse(error);
  }
}