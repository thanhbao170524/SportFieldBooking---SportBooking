import { NextRequest } from "next/server";
import { updateOwnerBankInfo, updateOwnerNotificationSettings, updateOwnerProfile } from "@/modules/admin/owner.service";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";
import { prisma } from "@/infra/db/prisma";
import { updateProfileSchema } from "@/validations/user.schema";
import { z } from "zod";

// GET /api/owner/profile  → Lấy đầy đủ thông tin Owner (user + ownerProfile + bio)
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    // Lấy user + profile + ownerProfile cùng lúc
    const fullProfile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        profile: { select: { bio: true, address: true, dateOfBirth: true, gender: true } },
        ownerProfile: true,
      },
    });

    if (!fullProfile) return errorResponse("Không tìm thấy thông tin owner.", 404);

    return successResponse("Lấy hồ sơ thành công", {
      ...fullProfile,
      name: fullProfile.fullName,
      bio: fullProfile.profile?.bio || "",
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// PATCH /api/owner/profile  → Cập nhật thông tin cá nhân (fullName, phone, bio) hoặc ngân hàng
export async function PATCH(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const body = await req.json().catch(() => ({}));

    const parsedProfile = updateProfileSchema
      .pick({ fullName: true, phone: true, bio: true })
      .safeParse(body);
    if (!parsedProfile.success) {
      return errorResponse(
        "Dữ liệu hồ sơ không hợp lệ",
        422,
        parsedProfile.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const notificationSchema = z
      .object({
        newBooking: z.boolean().optional(),
        cancelBooking: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
      })
      .partial();

    const parsedNotifications = body.notificationSettings === undefined
      ? { success: true as const, data: undefined }
      : notificationSchema.safeParse(body.notificationSettings);

    if (!parsedNotifications.success) {
      return errorResponse(
        "Dữ liệu thông báo không hợp lệ",
        422,
        parsedNotifications.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const fullName = parsedProfile.data.fullName;
    const phone = parsedProfile.data.phone;
    const bio = parsedProfile.data.bio;
    const bankName = body.bankName;
    const bankAccountNumber = body.bankAccountNumber;
    const bankAccountName = body.bankAccountName;
    const notificationSettings = parsedNotifications.data;
    const stripeConnectAccountId = body.stripeConnectAccountId;

    const results: Record<string, unknown> = {};

    // Cập nhật thông tin cá nhân nếu có
    if (fullName !== undefined || phone !== undefined || bio !== undefined) {
      const updatedProfile = await updateOwnerProfile(user.userId, {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
      });
      results.profile = updatedProfile;
    }

    // Cập nhật ngân hàng nếu có đủ 3 trường
    if (bankName && bankAccountNumber && bankAccountName) {
      const updatedBank = await updateOwnerBankInfo(user.userId, {
        bankName,
        bankAccountNumber,
        bankAccountName,
      });
      results.bankInfo = updatedBank;
    }

    // Cập nhật cấu hình thông báo (Owner)
    if (notificationSettings !== undefined) {
      const updated = await updateOwnerNotificationSettings(user.userId, notificationSettings);
      results.notificationSettings = updated.notificationSettings;
    }

    // Lưu Stripe Connect account id để nhận tiền thẻ trực tiếp
    if (stripeConnectAccountId !== undefined) {
      const raw = String(stripeConnectAccountId || "").trim();
      if (raw && !raw.startsWith("acct_")) {
        return errorResponse("Stripe Connect Account ID không hợp lệ (phải bắt đầu bằng acct_).", 422);
      }
      const platformAcct = String(process.env.STRIPE_PLATFORM_ACCOUNT_ID || "").trim();
      if (raw && platformAcct && raw === platformAcct) {
        return errorResponse("Stripe Connect Account ID không hợp lệ (không được dùng tài khoản Stripe của hệ thống).", 422);
      }
      const safe = raw ? raw : null;
      const updated = await prisma.ownerProfile.upsert({
        where: { userId: user.userId },
        create: { userId: user.userId, stripeConnectAccountId: safe },
        update: { stripeConnectAccountId: safe }
      });
      results.stripeConnectAccountId = updated.stripeConnectAccountId;
    }

    if (Object.keys(results).length === 0) {
      return errorResponse("Không có dữ liệu nào để cập nhật.", 422);
    }

    return successResponse("Cập nhật thông tin thành công", results);
  } catch (error) {
    return serverErrorResponse(error);
  }
}
