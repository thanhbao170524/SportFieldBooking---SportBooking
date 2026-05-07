import { NextRequest } from "next/server";
import { verifyToken, extractTokenFromHeader, JwtPayload } from "@/lib/jwt";
import { errorResponse } from "@/lib/response";
import { prisma } from "@/infra/db/prisma";
import { getPermissionsMatrix, PermissionKey, RoleKey } from "@/modules/admin/rbac";

export async function getAuthUser(
  req: NextRequest
): Promise<{ user: JwtPayload; error: null } | { user: null; error: ReturnType<typeof errorResponse> }> {
  const token = extractTokenFromHeader(req.headers.get("authorization"));

  if (!token) {
    return {
      user: null,
      error: errorResponse("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.", 401),
    };
  }

  const payload = verifyToken(token);

  if (!payload) {
    return {
      user: null,
      error: errorResponse("Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.", 401),
    };
  }

  if (payload.sid) {
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return {
        user: null,
        error: errorResponse("Phiên đăng nhập đã hết hạn hoặc bị thu hồi. Vui lòng đăng nhập lại.", 401),
      };
    }
  }

  const userExists = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true },
  });

  if (!userExists) {
    return {
      user: null,
      error: errorResponse("Tài khoản không tồn tại trên hệ thống. Vui lòng đăng nhập lại.", 401),
    };
  }

  return { user: payload, error: null };
}

export function requireRole(
  user: JwtPayload,
  roles: string[]
): ReturnType<typeof errorResponse> | null {
  if (!roles.includes(user.role)) {
    return errorResponse("Bạn không có quyền thực hiện thao tác này.", 403);
  }
  return null;
}

export async function requirePermission(
  user: JwtPayload,
  permissions: PermissionKey[]
): Promise<ReturnType<typeof errorResponse> | null> {
  const role = (user.role as RoleKey) || "USER";
  const matrix = await getPermissionsMatrix();
  const rolePerms = (matrix as any)[role] as Record<string, boolean> | undefined;

  if (!rolePerms) {
    return errorResponse("Bạn không có quyền thực hiện thao tác này.", 403);
  }

  for (const p of permissions) {
    if (!rolePerms[p]) {
      return errorResponse("Bạn không có quyền thực hiện thao tác này.", 403);
    }
  }

  return null;
}
