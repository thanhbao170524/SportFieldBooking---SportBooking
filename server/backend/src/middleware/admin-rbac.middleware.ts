import { NextRequest } from "next/server";
import { getAuthUser, requireRole, requirePermission } from "@/middleware/auth.middleware";
import { PermissionKey } from "@/modules/admin/rbac";

export async function requireAdminPermissions(
  req: NextRequest,
  permissions: PermissionKey[]
): Promise<{ user: any; error: null } | { user: null; error: any }> {
  const { user, error } = await getAuthUser(req);
  if (error) return { user: null, error };

  const roleError = requireRole(user, ["ADMIN"]);
  if (roleError) return { user: null, error: roleError };

  const permError = await requirePermission(user, permissions);
  if (permError) return { user: null, error: permError };

  return { user, error: null };
}

