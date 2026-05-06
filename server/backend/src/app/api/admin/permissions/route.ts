import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import {
  badRequestResponse,
  successResponse,
  serverErrorResponse,
} from "@/lib/response";
import {
  getPermissionsAdmin,
  updatePermissionsAdmin,
} from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const result = await getPermissionsAdmin();

    return successResponse("Permissions config", result);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const body = await req.json();

    if (!body?.matrix) {
      return badRequestResponse("Body.matrix không hợp lệ");
    }

    const result = await updatePermissionsAdmin(body.matrix);

    return successResponse("Đã lưu phân quyền", result);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}
