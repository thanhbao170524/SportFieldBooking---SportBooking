import { NextRequest } from "next/server";
import { getAuthUser } from "@/middleware/auth.middleware";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { getPermissionsMatrix, PermissionKey, RoleKey } from "@/modules/admin/rbac";

type MePermissions = Record<PermissionKey, boolean>;

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const matrix = await getPermissionsMatrix();
    const role = (user.role as RoleKey) || "USER";
    const permissions = (matrix as any)[role] as MePermissions | undefined;

    return successResponse("My permissions", {
      role,
      permissions: permissions ?? matrix.USER,
    });
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}

