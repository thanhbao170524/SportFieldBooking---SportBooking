import { prisma } from "@/infra/db/prisma";
import { PayoutStatus, WalletTransactionType } from "@/generated/prisma";

export class FinanceService {
  /**
   * Get wallet balance and recent transactions for an owner
   */
  static async getOwnerWallet(userId: string) {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: { wallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } } }
    });

    if (!ownerProfile) throw new Error("OWNER_PROFILE_NOT_FOUND");

    if (!ownerProfile.wallet) {
      // Create wallet if not exists
      return await prisma.wallet.create({
        data: { ownerProfileId: ownerProfile.id, balance: 0 },
        include: { transactions: true }
      });
    }

    return ownerProfile.wallet;
  }

  /**
   * Create a payout request
   */
  static async createPayoutRequest(userId: string, amount: number, note?: string) {
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: { wallet: true }
    });

    if (!ownerProfile || !ownerProfile.wallet) throw new Error("WALLET_NOT_FOUND");
    if (Number(ownerProfile.wallet.balance) < amount) throw new Error("INSUFFICIENT_BALANCE");
    if (amount <= 0) throw new Error("INVALID_AMOUNT");

    return await prisma.$transaction(async (tx) => {
      // 1. Create the request
      const request = await tx.payoutRequest.create({
        data: {
          ownerId: userId,
          walletId: ownerProfile.wallet!.id,
          amount,
          status: "PENDING",
          bankName: ownerProfile.bankName || "Unknown",
          bankAccountNum: ownerProfile.bankAccountNumber || "Unknown",
          bankAccountName: ownerProfile.bankAccountName || "Unknown",
          ownerNote: note
        }
      });

      // 2. We DON'T deduct balance yet. We deduct when status becomes COMPLETED or APPROVED.
      // But we might want to "lock" the balance.
      // For simplicity in this demo, we'll deduct when Admin marks as COMPLETED.

      return request;
    });
  }

  /**
   * Get payout history for an owner
   */
  static async getPayoutHistory(userId: string) {
    return await prisma.payoutRequest.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Admin: List all payout requests
   */
  static async adminListPayoutRequests(status?: PayoutStatus) {
    const whereClause = status ? { status } : {};

    // NOTE:
    // Prisma schema currently does NOT declare relations for payout_requests → wallets,
    // so we cannot use `include: { wallet: ... }` here (it will throw at runtime).
    // Instead, we fetch payout_requests first, then hydrate wallet + owner info manually.
    const requests = await prisma.payoutRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    const walletIds = [...new Set(requests.map((r) => r.walletId).filter(Boolean))];
    const wallets = await prisma.wallet.findMany({
      where: { id: { in: walletIds } },
      include: {
        ownerProfile: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });
    const walletById = new Map(wallets.map((w) => [w.id, w]));

    return requests.map((r) => ({
      ...r,
      wallet: walletById.get(r.walletId) ?? null,
    }));
  }

  /**
   * Admin: Process payout request
   */
  static async adminProcessPayout(requestId: string, status: PayoutStatus, adminNote?: string, adminId?: string) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.payoutRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) throw new Error("REQUEST_NOT_FOUND");
      if (request.status === "COMPLETED" || request.status === "REJECTED") {
        throw new Error("REQUEST_ALREADY_PROCESSED");
      }

      const wallet = await tx.wallet.findUnique({ where: { id: request.walletId } });
      if (!wallet) throw new Error("WALLET_NOT_FOUND");

      const amountToDeduct = Number(request.amount);

      // If completing, deduct from wallet
      if (status === "COMPLETED") {
        if (Number(wallet.balance) < amountToDeduct) {
          throw new Error("INSUFFICIENT_WALLET_BALANCE");
        }

        // a. Create Transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "WITHDRAWAL",
            amount: -amountToDeduct,
            balanceAfter: Number(wallet.balance) - amountToDeduct,
            payoutId: request.id,
            note: `Rút tiền về ngân hàng: ${request.bankName} - ${request.bankAccountNum}`
          }
        });

        // b. Update Wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: request.amount },
            totalWithdrawn: { increment: request.amount }
          }
        });
      }

      // Update request status
      const updated = await tx.payoutRequest.update({
        where: { id: requestId },
        data: {
          status,
          adminNote,
          processedAt: new Date(),
          processedBy: adminId
        }
      });

      const walletHydrated = await tx.wallet.findUnique({
        where: { id: updated.walletId },
        include: {
          ownerProfile: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      });

      return { ...updated, wallet: walletHydrated ?? null };
    });
  }
}
