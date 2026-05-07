import { NextRequest } from "next/server";
import { getCommentsByPostId, addComment } from "@/modules/marketing/post.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";
import { getAuthUser } from "@/middleware/auth.middleware";

/**
 * GET /api/posts/[postId]/comments
 * Lấy danh sách bình luận của bài viết.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    if (!postId) return errorResponse("Thiếu postId", 400);

    const comments = await getCommentsByPostId(postId);
    return successResponse("Lấy danh sách bình luận thành công", comments);
  } catch (error) {
    console.error("GET Comments Error:", error);
    return serverErrorResponse(error);
  }
}

/**
 * POST /api/posts/[postId]/comments
 * Thêm bình luận mới (Cần đăng nhập).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const { content } = await req.json();
    if (!content || !content.trim()) return errorResponse("Nội dung bình luận không được để trống", 400);

    const comment = await addComment({
      postId,
      userId: user.userId,
      content: content.trim(),
    });

    return successResponse("Đã gửi bình luận", comment);
  } catch (error) {
    console.error("POST Comment Error:", error);
    return serverErrorResponse(error);
  }
}
