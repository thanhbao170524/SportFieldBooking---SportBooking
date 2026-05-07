import { NextRequest } from "next/server";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";
import {
  badRequestResponse,
  successResponse,
  serverErrorResponse,
} from "@/lib/response";
import {
  getPermissionsAdmin,
  updatePermissionsAdmin,
} from "@/modules/admin/admin.service";
import { prisma } from "@/infra/db/prisma";
import { countActiveAdmins } from "@/modules/admin/admin.service";

/**
 * GET /api/admin/permissions
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["manage_perms"]);
    if (auth.error) return auth.error;

    const result = await getPermissionsAdmin();
    return successResponse("Permissions config", result);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}

/**
 * PATCH /api/admin/permissions
 * Cập nhật ma trận phân quyền.
 * Quy tắc:
 *  - ADMIN luôn giữ manage_perms = true.
 *  - Mọi thay đổi được ghi audit log.
 *  - Không hạ quyền nếu chỉ còn 1 Admin hoạt động.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["manage_perms"]);
    if (auth.error) return auth.error;

    const body = await req.json();
    if (!body?.matrix) {
      return badRequestResponse("Body.matrix không hợp lệ");
    }

    // Bảo vệ Super Admin: không được tắt manage_perms của ADMIN
    // (normalizePermissionsMatrix đã enforce, nhưng kiểm tra tường minh tại đây)
    if (body.matrix?.ADMIN?.manage_perms === false) {
      return badRequestResponse(
        "Không thể thu hồi quyền quản lý phân quyền của Admin."
      );
    }

    // Bảo vệ: nếu chỉ còn 1 admin, không được giảm quyền manage_perms
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1 && body.matrix?.ADMIN?.manage_perms === false) {
      return badRequestResponse(
        "Không thể hạ quyền Admin duy nhất còn hoạt động trong hệ thống."
      );
    }

    const previous = await getPermissionsAdmin();
    const result = await updatePermissionsAdmin(body.matrix);

    // Audit log
    await prisma.auditLog
      .create({
        data: {
          userId: auth.user.userId as string,
          action: "UPDATE_PERMISSIONS",
          entity: "SystemConfig",
          entityId: "RBAC_PERMISSIONS",
          details: {
            previous,
            updated: result,
          },
        },
      })
      .catch(() => {});

    return successResponse("Đã lưu phân quyền", result);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}
