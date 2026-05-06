import { NextRequest } from "next/server";
import { getAdminSummary } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";

/**
 * GET /api/admin/stats/dashboard
 * Provides comprehensive statistics for the admin dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const summary = await getAdminSummary(startDate, endDate);

    return successResponse("Lấy số liệu dashboard thành công", summary);
  } catch (error: unknown) {
    console.error("GET Admin Dashboard Error:", error);
    return serverErrorResponse(error);
  }
}
