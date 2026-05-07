import { NextRequest, NextResponse } from "next/server";
import { createReport } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { getAuthUser } from "@/middleware/auth.middleware";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const body = await req.json();
    const { reason, content } = body;

    if (!reason || !content) {
      return serverErrorResponse("Vui lòng nhập đầy đủ thông tin");
    }

    const report = await createReport({
      reporterId: user!.userId,
      reason,
      content,
    });

    return successResponse("Gửi báo cáo thành công", report);
  } catch (error: unknown) {
    console.error("POST Report Error:", error);
    return serverErrorResponse(error);
  }
}
