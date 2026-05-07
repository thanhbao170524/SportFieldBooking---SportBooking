import { NextRequest } from "next/server";
import { getAuthUser } from "@/middleware/auth.middleware";
import { togglePostLike } from "@/modules/marketing/post.service";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";

/**
 * POST /api/posts/[postId]/like
 * Thả tim / Bỏ thả tim bài viết.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    if (!postId) return errorResponse("Thiếu postId", 400);

    const result = await togglePostLike(postId, user.userId);
    return successResponse(result.liked ? "Đã thả tim bài viết" : "Đã bỏ thả tim", result);
  } catch (error) {
    console.error("POST Post Like Error:", error);
    return serverErrorResponse(error);
  }
}
