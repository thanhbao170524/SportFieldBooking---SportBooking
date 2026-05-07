import { getAllUsersAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { NextRequest } from "next/server";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả người dùng (Dành cho Admin)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["view_users"]);
    if (auth.error) return auth.error;

    const users = await getAllUsersAdmin();
    return successResponse("Lấy danh sách người dùng thành công", users);
  } catch (error: unknown) {
    console.error("GET Admin Users Error:", error);
    return serverErrorResponse(error);
  }
}
