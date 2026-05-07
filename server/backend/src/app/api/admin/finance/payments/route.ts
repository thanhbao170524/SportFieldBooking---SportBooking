import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { serverErrorResponse, successResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";
import { PaymentStatus, PaymentMethod } from "@/generated/prisma";

/**
 * GET /api/admin/finance/payments
 * Lấy toàn bộ danh sách thanh toán trong hệ thống (cho Admin)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["view_finance"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const method = searchParams.get("method");

    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status: status as PaymentStatus } : {}),
        ...(method ? { method: method as PaymentMethod } : {})
      },
      include: {
        booking: {
          select: {
            bookingCode: true,
            bookerName: true,
            bookerPhone: true,
            finalAmount: true,
            club: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const mapped = payments.map(p => ({
      id: p.id,
      transactionRef: p.transactionRef || p.id,
      bookingId: p.booking?.bookingCode || p.bookingId,
      customerName: p.booking?.bookerName || "Unknown",
      clubName: p.booking?.club?.name || "Unknown",
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      refundStatus: p.refundStatus,
      createdAt: p.createdAt.toISOString(),
      proofImageUrl: p.proofImageUrl
    }));

    return successResponse("Tải danh sách thanh toán thành công", mapped);
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}
