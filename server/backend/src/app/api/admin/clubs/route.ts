import { NextRequest } from "next/server";
import { getAllClubsAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

/**
 * GET /api/admin/clubs
 * Lấy toàn bộ danh sách câu lạc bộ cho trang Admin
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["approve_clubs"]);
    if (auth.error) return auth.error;

    const clubs = await getAllClubsAdmin();
    return successResponse("Lấy danh sách CLB thành công", clubs);
  } catch (error: unknown) {
    console.error("GET Admin Clubs Error:", error);
    return serverErrorResponse(error);
  }
}
