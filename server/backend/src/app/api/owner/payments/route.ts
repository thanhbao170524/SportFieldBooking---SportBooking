import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";

/**
 * GET /api/owner/payments
 * Danh sách thanh toán thuộc các CLB của Owner (lọc theo method/status/thời gian/club/q).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method") || undefined;
    const status = searchParams.get("status") || undefined;
    const clubId = searchParams.get("clubId") || undefined;
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) createdAt.lte = new Date(`${to}T23:59:59.999Z`);

    const payments = await prisma.payment.findMany({
      where: {
        ...(method ? { method: method as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
        booking: {
          ...(clubId ? { clubId } : {}),
          club: {
            ownerId: user.userId,
            deletedAt: null,
          },
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingCode: true,
            createdAt: true,
            finalAmount: true,
            bookerName: true,
            club: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const mapped = payments
      .map((p) => ({
        id: p.id,
        bookingId: p.booking?.id || p.bookingId,
        bookingCode: p.booking?.bookingCode || null,
        clubId: p.booking?.club?.id || null,
        clubName: p.booking?.club?.name || null,
        customerName: p.booking?.bookerName || null,
        method: p.method,
        status: p.status,
        refundStatus: p.refundStatus,
        amount: Number(p.amount),
        transactionRef: p.transactionRef || p.id,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        proofImageUrl: p.proofImageUrl || null,
      }))
      .filter((row) => {
        if (!q) return true;
        const hay = `${row.transactionRef} ${row.bookingCode || ""} ${row.clubName || ""} ${row.customerName || ""}`.toLowerCase();
        return hay.includes(q);
      });

    return successResponse("Tải danh sách thanh toán thành công", mapped);
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

