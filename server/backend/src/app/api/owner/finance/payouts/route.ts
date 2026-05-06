import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/response";
import { FinanceService } from "@/modules/finance/finance.service";

/**
 * GET /api/owner/finance/payouts
 * Danh sách yêu cầu rút tiền của chủ sân
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const payouts = await FinanceService.getPayoutHistory(user.userId);
    return successResponse("Tải danh sách yêu cầu rút tiền thành công", payouts);
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

/**
 * POST /api/owner/finance/payouts
 * Gửi yêu cầu rút tiền
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const body = await req.json();
    const { amount, note } = body;

    if (!amount || amount <= 0) {
      return errorResponse("Số tiền không hợp lệ", 400);
    }

    const request = await FinanceService.createPayoutRequest(user.userId, amount, note);
    return successResponse("Gửi yêu cầu rút tiền thành công", request);
  } catch (e: any) {
    if (e.message === "INSUFFICIENT_BALANCE") {
      return errorResponse("Số dư không đủ để thực hiện yêu cầu này", 400);
    }
    return serverErrorResponse(e);
  }
}
