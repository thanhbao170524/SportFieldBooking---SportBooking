import { NextRequest, NextResponse } from "next/server";
import { getUserStatsAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";

export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    const stats = await getUserStatsAdmin();

    return successResponse("Lấy thống kê người dùng thành công", stats);
  } catch (error: unknown) {
    console.error("GET User Stats Error:", error);
    return serverErrorResponse(error);
  }
}
