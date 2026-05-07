import { NextRequest } from "next/server";
import { getAllOwnersAdmin } from "@/modules/admin/admin.service";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";
import { successResponse, serverErrorResponse } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["view_owners"]);
    if (auth.error) return auth.error;

    const owners = await getAllOwnersAdmin();
    return successResponse("Lấy danh sách owners thành công", owners);
  } catch (error: unknown) {
    console.error("GET Admin Owners Error:", error);
    return serverErrorResponse(error);
  }
}
