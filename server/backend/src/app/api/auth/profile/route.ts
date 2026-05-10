import { NextRequest } from "next/server";
import { getAuthUser } from "@/middleware/auth.middleware";
import { getMyProfile } from "@/modules/user/user.service";
import { successResponse, serverErrorResponse, errorResponse } from "@/lib/response";
import { prisma } from "@/infra/db/prisma";
import { getPermissionsMatrix, RoleKey } from "@/modules/admin/rbac";

/**
 * GET /api/auth/profile
 * Lấy thông tin cá nhân và trạng thái KYC mới nhất của user
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    // Lấy profile từ service
    const profile = await getMyProfile(user.userId);
    if (!profile) {
      return errorResponse("Không tìm thấy người dùng", 404);
    }
    
    // Lấy ma trận quyền
    const matrix = await getPermissionsMatrix();
    const permissions = matrix[user.role as RoleKey] || {};

    let ownerProfile = null;
    // Nếu là OWNER, kèm theo kycStatus từ ownerProfile (phẳng hóa ra ngoài user)
    if (user.role === "OWNER") {
      const op = await prisma.ownerProfile.findUnique({
        where: { userId: user.userId },
        select: { kycStatus: true },
      });
      ownerProfile = {
        kycStatus: op?.kycStatus ?? null,
      };
    }

    const profileData = {
      ...profile,
      permissions,
      ownerProfile,
    };

    return successResponse("Lấy thông tin cá nhân thành công", profileData);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}
