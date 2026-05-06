import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/response";
import { FinanceService } from "@/modules/finance/finance.service";
import { PayoutStatus } from "@/generated/prisma";

/**
 * GET /api/admin/finance/payouts
 * Danh sách toàn bộ yêu cầu rút tiền (cho Admin duyệt)
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

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
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const body = await req.json();
    const { requestId, status, adminNote } = body;

    if (!requestId || !status) {
      return errorResponse("Thông tin không đầy đủ", 400);
    }

    const updatedRequest = await FinanceService.adminProcessPayout(
      requestId,
      status as PayoutStatus,
      adminNote,
      user.userId
    );

    return successResponse("Cập nhật trạng thái yêu cầu rút tiền thành công", updatedRequest);
  } catch (e: any) {
    return errorResponse(e.message || "Lỗi xử lý yêu cầu", 500);
  }
}
