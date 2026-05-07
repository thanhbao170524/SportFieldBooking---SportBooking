import { NextRequest } from "next/server";
import { getPosts } from "@/modules/marketing/post.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";
import { PostType } from "@/generated/prisma";

/**
 * GET /api/posts
 * Lấy danh sách bài đăng công khai cho người dùng
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as PostType | null;
    const clubId = searchParams.get("clubId") || undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limitRaw = parseInt(searchParams.get("limit") || "0", 10) || 0;

    const { getAuthUser } = await import("@/middleware/auth.middleware");
    const { user } = await getAuthUser(req).catch(() => ({ user: null }));

    const posts = await getPosts({
      clubId,
      type: type || undefined,
      isUser: true,
      currentUserId: user?.userId,
      ...(limitRaw > 0 ? { page, limit: limitRaw } : {}),
    });

    return successResponse("Lấy danh sách bài đăng thành công", posts);
  } catch (error) {
    console.error("GET Public Posts Error:", error);
    return serverErrorResponse(error);
  }
}

/**
 * POST /api/posts
 * Tạo bài đăng mới (dành cho người dùng)
 */
export async function POST(req: NextRequest) {
  try {
    const { getAuthUser } = await import("@/middleware/auth.middleware");
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const data = await req.json();
    if (!data.clubId) {
      // If user doesn't pick a club, maybe pick a default or throw error
      // But the UI says "Tùy chọn". If it's optional, we still need a clubId for the DB.
      // Let's see if there's a default "Cộng đồng" club, or require it for now.
      // For now, if no clubId is provided, we'll try to find any club or throw error.
      return errorResponse("Vui lòng chọn một sân bóng để đăng bài.");
    }

    const { createUserPost } = await import("@/modules/marketing/post.service");
    const result = await createUserPost(user.userId, {
      clubId: data.clubId,
      type: data.type || PostType.TEAM_MATCHING,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      linkedCourtId: data.linkedCourtId,
      linkedDate: data.linkedDate ? new Date(data.linkedDate) : undefined,
    });

    return successResponse("Đăng bài thành công", result);
  } catch (error) {
    console.error("POST User Post Error:", error);
    return serverErrorResponse(error);
  }
}

/**
 * DELETE /api/posts/[postId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { getAuthUser } = await import("@/middleware/auth.middleware");
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const { postId } = await params;
    const { deletePost } = await import("@/modules/marketing/post.service");
    
    await deletePost(postId, user.userId);
    return successResponse("Xóa bài đăng thành công", null);
  } catch (error) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND_OR_UNAUTHORIZED") {
      return errorResponse("Không tìm thấy bài đăng hoặc bạn không có quyền xóa.", 403);
    }
    return serverErrorResponse(error);
  }
}
