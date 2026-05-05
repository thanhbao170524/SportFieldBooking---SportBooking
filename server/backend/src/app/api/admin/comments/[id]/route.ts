import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { badRequestResponse, serverErrorResponse, successResponse } from "@/lib/response";

interface Params {
  params: Promise<{ id: string }>;
}

interface Body {
  isHidden?: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const { id } = await params;
    const body: Body = await req.json();

    if (typeof body.isHidden !== "boolean") {
      return badRequestResponse("Thiếu hoặc sai kiểu field isHidden (boolean).");
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { isHidden: body.isHidden },
      include: {
        user: { select: { id: true, fullName: true } },
        post: { select: { id: true, title: true } },
      },
    });

    return successResponse("Cập nhật trạng thái comment thành công", updated);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(_);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const { id } = await params;
    await prisma.comment.delete({
      where: { id }
    });

    return successResponse("Xóa comment thành công", { id });
  } catch {
    return serverErrorResponse("Internal error");
  }
}