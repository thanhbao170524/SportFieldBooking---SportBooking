import { NextRequest } from "next/server";
import { togglePostStatus } from "@/modules/admin/admin.service";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";
import { successResponse, serverErrorResponse } from "@/lib/response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminPermissions(req, ["moderate_posts"]);
    if (auth.error) return auth.error;

    const body = await req.json();
    const { id } = await params;

    const data = await togglePostStatus(id, body.status);

    return successResponse("Cập nhật trạng thái bài đăng thành công", data);
  } catch (error: unknown) {
    return serverErrorResponse(error);
  }
}