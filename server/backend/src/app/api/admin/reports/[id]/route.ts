import { NextRequest, NextResponse } from "next/server";
import { handleReportAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

interface Body {
  status: "RESOLVED" | "REJECTED";
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["moderate_posts"]);
    if (auth.error) return auth.error;

    const body: Body = await req.json();
    const { id } = await params;

    const result = await handleReportAdmin(id, body.status);

    return successResponse("Xử lý report thành công", result);
  } catch (error: unknown) {
    console.error("PATCH Report Error:", error);
    return serverErrorResponse(error);
  }
}