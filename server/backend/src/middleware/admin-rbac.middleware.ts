import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole, requirePermission } from "@/middleware/auth.middleware";
import { PermissionKey } from "@/modules/admin/rbac";
import { JwtPayload } from "@/lib/jwt";

export async function requireAdminPermissions(
  req: NextRequest,
  permissions: PermissionKey[]
): Promise<{ user: JwtPayload; error: null } | { user: null; error: NextResponse }> {
  const { user, error } = await getAuthUser(req);
  if (error) return { user: null, error };

  const roleError = requireRole(user, ["ADMIN", "STAFF"]);
  if (roleError) return { user: null, error: roleError };

  const permError = await requirePermission(user, permissions);
  if (permError) return { user: null, error: permError };

  return { user, error: null };
}

