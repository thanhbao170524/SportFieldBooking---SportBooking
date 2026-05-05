import { NextRequest, NextResponse } from "next/server";
import { PostStatus } from "@/generated/prisma";
import { approveOwnerPostAdmin, deletePostAdmin, rejectOwnerPostAdmin, togglePostStatus } from "@/modules/admin/admin.service";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { badRequestResponse, serverErrorResponse, successResponse } from "@/lib/response";

interface Params {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  status?: PostStatus;
  action?: "APPROVE" | "REJECT";
  note?: string;
}

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, fullName: true } } },
          take: 50,
        },
      },
    });

    return successResponse("Lấy chi tiết post thành công", post);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const { id } = await params;
    const body: PatchBody = await req.json();
    const status = body.status;
    const action = body.action;

    if (action === "APPROVE") {
      const updated = await approveOwnerPostAdmin(id, user.userId);
      return successResponse("Đã duyệt bài đăng", updated);
    }

    if (action === "REJECT") {
      const updated = await rejectOwnerPostAdmin(id, user.userId, body.note);
      return successResponse("Đã từ chối bài đăng", updated);
    }

    if (!status || !["PENDING", "ACTIVE", "HIDDEN", "EXPIRED"].includes(String(status))) {
      return badRequestResponse("Field status không hợp lệ. (PENDING | ACTIVE | HIDDEN | EXPIRED)");
    }

    const updated = await togglePostStatus(id, status as PostStatus);
    return successResponse("Cập nhật trạng thái bài đăng thành công", updated);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const { id } = await params;
    const updated = await deletePostAdmin(id);
    return successResponse("Xóa mềm bài đăng thành công", updated);
  } catch (error) {
    return serverErrorResponse(error);
  }
}