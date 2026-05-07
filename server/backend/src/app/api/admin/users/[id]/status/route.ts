import { NextRequest } from "next/server";
import { toggleUserActiveStatus } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse, badRequestResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

const ERROR_MESSAGES: Record<string, string> = {
  CANNOT_LOCK_PEER_ADMIN: "Không thể khóa tài khoản Admin cùng cấp.",
  CANNOT_LOCK_LAST_ADMIN: "Không thể khóa Admin duy nhất còn hoạt động trong hệ thống.",
  USER_NOT_FOUND: "Tài khoản không tồn tại.",
  ACTOR_NOT_FOUND: "Tài khoản thực hiện không hợp lệ.",
};

/**
 * PATCH /api/admin/users/:id/status
 * Khóa hoặc mở khóa tài khoản người dùng.
 * Quy tắc:
 *  - Không khóa Admin cùng cấp.
 *  - Không khóa Admin duy nhất còn lại.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminPermissions(req, ["lock_users"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const { isActive } = await req.json();

    const actorId = auth.user.userId as string;

    const updatedUser = await toggleUserActiveStatus(actorId, id, isActive);
    return successResponse("Cập nhật trạng thái người dùng thành công", updatedUser);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg in ERROR_MESSAGES) {
      return badRequestResponse(ERROR_MESSAGES[msg]);
    }
    console.error("PATCH Admin User Status Error:", error);
    return serverErrorResponse(error);
  }
}
