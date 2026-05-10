import { NextRequest, NextResponse } from "next/server";
import { getAllReportsAdmin, handleReportAdmin } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

interface ReportItem {
  id: string;
  reason: string;
  status: string;
  createdAt: Date;
  reporter: {
    fullName: string;
    email: string;
  };
}

export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    // Viewing reports should require view permission; moderation is enforced on PATCH.
    const auth = await requireAdminPermissions(_, ["view_posts"]);
    if (auth.error) return auth.error;

    const reports: ReportItem[] = await getAllReportsAdmin();

    return successResponse(
      "Lấy danh sách báo cáo thành công",
      reports
    );
  } catch (error: unknown) {
    console.error("GET Reports Error:", error);
    return serverErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["moderate_posts"]);
    if (auth.error) return auth.error;

    const body = await req.json();
    const { id, status, adminResponse } = body;

    if (!id || !status) {
      return serverErrorResponse("Thiếu thông tin xử lý");
    }

    const report = await handleReportAdmin(id, status, adminResponse);

    return successResponse("Cập nhật báo cáo thành công", report);
  } catch (error: unknown) {
    console.error("PATCH Reports Error:", error);
    return serverErrorResponse(error);
  }
}