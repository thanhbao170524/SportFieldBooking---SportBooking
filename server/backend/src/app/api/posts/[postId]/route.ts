import { NextRequest } from "next/server";
import { getPostById } from "@/modules/marketing/post.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";

/**
 * GET /api/posts/[postId]
 * Chi tiết bài đăng công khai (chia sẻ theo id).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    if (!postId) return errorResponse("Thiếu postId", 400);

    const { getAuthUser } = await import("@/middleware/auth.middleware");
    const { user } = await getAuthUser(_req).catch(() => ({ user: null }));

    const post = await getPostById(postId, user?.userId);
    if (!post) return errorResponse("Không tìm thấy bài đăng", 404);

    return successResponse("Lấy chi tiết bài đăng thành công", post);
  } catch (error) {
    console.error("GET Post Error:", error);
    return serverErrorResponse(error);
  }
}

/**
 * DELETE /api/posts/[postId]
 * Xóa bài đăng (yêu cầu đăng nhập, chỉ chủ bài hoặc admin).
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
    if (!postId) return errorResponse("Thiếu postId", 400);

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
