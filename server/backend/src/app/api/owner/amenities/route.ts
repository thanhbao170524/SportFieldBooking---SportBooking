import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";
import { prisma } from "@/infra/db/prisma";

/**
 * POST /api/owner/amenities
 * Chủ sân/Admin tạo mới tiện ích/dịch vụ hệ thống (amenity).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const roleErr = requireRole(user, ["OWNER", "ADMIN"]);
    if (roleErr) return roleErr;

    const body = await req.json().catch(() => ({}));
    const rawName = typeof body?.name === "string" ? body.name : "";
    const name = rawName.trim();
    const icon = typeof body?.icon === "string" ? body.icon.trim() : undefined;

    if (!name) return errorResponse("Vui lòng nhập tên dịch vụ/tiện ích", 400);
    if (name.length > 60) return errorResponse("Tên quá dài (tối đa 60 ký tự)", 400);
    if (icon && icon.length > 40) return errorResponse("Icon quá dài", 400);

    const amenity = await prisma.amenity.upsert({
      where: { name },
      create: { name, icon: icon || null },
      update: { icon: icon || null },
    });

    return successResponse("Tạo tiện ích thành công", amenity);
  } catch (err: unknown) {
    return serverErrorResponse(err);
  }
}

