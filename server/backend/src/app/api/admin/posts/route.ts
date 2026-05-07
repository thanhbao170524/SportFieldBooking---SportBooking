import { NextRequest, NextResponse } from "next/server";
import { getAllPostsAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

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
    const auth = await requireAdminPermissions(_, ["moderate_posts"]);
    if (auth.error) return auth.error;

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