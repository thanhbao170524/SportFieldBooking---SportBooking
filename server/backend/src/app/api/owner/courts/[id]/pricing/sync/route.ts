import { NextRequest } from "next/server";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { syncClubPricing } from "@/modules/club/court.service";

/**
 * POST /api/owner/courts/[id]/pricing/sync
 * Đồng bộ bảng giá của sân [id] cho tất cả sân khác trong cùng CLB
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { user, error } = await getAuthUser(req);
        if (error) return error;

        const roleErr = requireRole(user, ["OWNER", "ADMIN"]);
        if (roleErr) return roleErr;

        const result = await syncClubPricing(id, user.userId);
        
        return successResponse(`Đã đồng bộ thành công cho ${result.synced} sân.`, result);
    } catch (error: unknown) {
        return serverErrorResponse(error);
    }
}
