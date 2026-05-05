import { NextRequest, NextResponse } from "next/server";
import { getAllPostsAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";

interface PostItem {
  id: string;
  title: string;
  status: string;
  type: string;
  createdAt: Date;
  club: {
    name: string;
  };
}

export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(_);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const posts: PostItem[] = await getAllPostsAdmin();

    return successResponse<PostItem[]>(
      "Lấy danh sách bài đăng thành công",
      posts
    );
  } catch (error: unknown) {
    console.error("GET Posts Admin Error:", error);
    return serverErrorResponse(error);
  }
}