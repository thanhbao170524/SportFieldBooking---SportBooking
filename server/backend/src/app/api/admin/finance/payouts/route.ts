import { NextRequest } from "next/server";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/response";
import { FinanceService } from "@/modules/finance/finance.service";
import { PayoutStatus } from "@/generated/prisma";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

/**
 * GET /api/admin/finance/payouts
 * Danh sách toàn bộ yêu cầu rút tiền (cho Admin duyệt)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["view_finance"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as PayoutStatus | undefined;

    const payouts = await FinanceService.adminListPayoutRequests(status);
    return successResponse("Tải danh sách yêu cầu rút tiền thành công", payouts);
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

/**
 * PATCH /api/admin/finance/payouts
 * Xử lý yêu cầu rút tiền (Duyệt/Từ chối)
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["view_finance"]);
    if (auth.error) return auth.error;

    const body = await req.json();
    const { requestId, status, adminNote } = body;

    if (!requestId || !status) {
      return errorResponse("Thông tin không đầy đủ", 400);
    }

    const updatedRequest = await FinanceService.adminProcessPayout(
      requestId,
      status as PayoutStatus,
      adminNote,
      auth.user.userId
    );

    return successResponse("Cập nhật trạng thái yêu cầu rút tiền thành công", updatedRequest);
  } catch (e: any) {
    return errorResponse(e.message || "Lỗi xử lý yêu cầu", 500);
  }
}
