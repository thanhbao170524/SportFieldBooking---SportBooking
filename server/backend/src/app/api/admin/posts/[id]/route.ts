import { NextRequest, NextResponse } from "next/server";
import { PostStatus } from "@/generated/prisma";
import { approveOwnerPostAdmin, deletePostAdmin, rejectOwnerPostAdmin, togglePostStatus } from "@/modules/admin/admin.service";
import { prisma } from "@/infra/db/prisma";
import { badRequestResponse, serverErrorResponse, successResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

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
    const auth = await requireAdminPermissions(req, ["moderate_posts"]);
    if (auth.error) return auth.error;

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
    const auth = await requireAdminPermissions(req, ["moderate_posts"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const body: PatchBody = await req.json();
    const status = body.status;
    const action = body.action;

    if (action === "APPROVE") {
      const updated = await approveOwnerPostAdmin(id, auth.user.userId);
      return successResponse("Đã duyệt bài đăng", updated);
    }

    if (action === "REJECT") {
      const updated = await rejectOwnerPostAdmin(id, auth.user.userId, body.note);
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
    const auth = await requireAdminPermissions(req, ["moderate_posts"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const updated = await deletePostAdmin(id);
    return successResponse("Xóa mềm bài đăng thành công", updated);
  } catch (error) {
    return serverErrorResponse(error);
  }
}