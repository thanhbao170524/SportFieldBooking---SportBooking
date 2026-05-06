import { NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { errorResponse, serverErrorResponse, successResponse } from "@/lib/response";

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_CONFIG_MISSING");
  return new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion });
}

/**
 * GET /api/owner/stripe/connect/status
 * Trả trạng thái liên kết Stripe Connect của Owner.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.userId },
      select: { stripeConnectAccountId: true },
    });

    const accountId = ownerProfile?.stripeConnectAccountId || null;
    if (!accountId) {
      return successResponse("Chưa liên kết Stripe", {
        connected: false,
        accountId: null,
        details: null,
      });
    }

    const stripe = getStripe();
    let acct: Stripe.Account;
    try {
      acct = await stripe.accounts.retrieve(accountId);
    } catch (err: unknown) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && /not connected to your platform|does not exist/i.test(err.message || "")) {
        // Stored accountId is stale/wrong; treat as disconnected.
        return successResponse("Stripe Connect chưa được liên kết đúng", {
          connected: false,
          accountId: null,
          details: null,
        });
      }
      throw err;
    }

    return successResponse("Tải trạng thái Stripe Connect thành công", {
      connected: true,
      accountId,
      details: {
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
        requirements: {
          currently_due: acct.requirements?.currently_due || [],
          eventually_due: acct.requirements?.eventually_due || [],
        },
      },
    });
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

/**
 * POST /api/owner/stripe/connect
 * Tạo (hoặc reuse) Stripe connected account + tạo onboarding link.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    const stripe = getStripe();
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";
    // IMPORTANT: Stripe country must be supported for Connect on your platform.
    // Default to US for easiest dev/test unless you override via env.
    const country = String(process.env.STRIPE_CONNECT_COUNTRY || "US").trim() || "US";

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, fullName: true },
    });

    // Get or create owner profile
    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId },
      update: {},
      select: { stripeConnectAccountId: true },
    });

    let accountId = ownerProfile.stripeConnectAccountId || null;
    // If the stored accountId is invalid / belongs to another platform, reset it.
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch (err: unknown) {
        // Most common: "not connected to your platform or does not exist"
        accountId = null;
        await prisma.ownerProfile.update({
          where: { userId: user.userId },
          data: { stripeConnectAccountId: null },
        });
      }
    }

    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        country,
        email: dbUser?.email || undefined,
        business_type: "individual",
        business_profile: {
          name: dbUser?.fullName || undefined,
          product_description: "Sports field booking",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = acct.id;

      await prisma.ownerProfile.update({
        where: { userId: user.userId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${frontendUrl}/owner/payments?stripeConnect=refresh`,
        return_url: `${frontendUrl}/owner/payments?stripeConnect=return`,
        type: "account_onboarding",
      });
    } catch (err: unknown) {
      // If the account was created elsewhere / got corrupted in DB, recreate once.
      if (err instanceof Stripe.errors.StripeInvalidRequestError && /not connected to your platform|does not exist/i.test(err.message || "")) {
        const acct = await stripe.accounts.create({
          type: "express",
          country,
          email: dbUser?.email || undefined,
          business_type: "individual",
          business_profile: {
            name: dbUser?.fullName || undefined,
            product_description: "Sports field booking",
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = acct.id;
        await prisma.ownerProfile.update({
          where: { userId: user.userId },
          data: { stripeConnectAccountId: accountId },
        });
        accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${frontendUrl}/owner/payments?stripeConnect=refresh`,
          return_url: `${frontendUrl}/owner/payments?stripeConnect=return`,
          type: "account_onboarding",
        });
      } else {
        throw err;
      }
    }

    return successResponse("Tạo liên kết kết nối Stripe thành công", {
      url: accountLink.url,
      accountId,
    });
  } catch (e: unknown) {
    if (e instanceof Stripe.errors.StripeInvalidRequestError) {
      // Typical causes: Connect not enabled, unsupported country, invalid capabilities, etc.
      const msg =
        e.message ||
        "Không thể tạo liên kết Stripe Connect. Vui lòng kiểm tra cấu hình Stripe Connect trên Dashboard.";
      if (/signed up for Connect/i.test(msg)) {
        return errorResponse(
          "Stripe Platform của hệ thống chưa bật Stripe Connect (hoặc backend đang dùng nhầm Secret Key của account khác). Vui lòng kiểm tra lại: (1) Secret key đang chạy thuộc đúng Stripe account đã bật Connect, (2) restart backend sau khi đổi .env.",
          422
        );
      }
      // Provide a more actionable hint for country issues
      if ((e.param || "").includes("country") || /country/i.test(msg)) {
        return errorResponse(
          `Không thể tạo Stripe Connect account với country hiện tại. Hãy thử đặt STRIPE_CONNECT_COUNTRY=US (dev/test) hoặc country mà Stripe hỗ trợ trên platform của bạn.`,
          422
        );
      }
      return errorResponse(msg, 422);
    }
    return serverErrorResponse(e);
  }
}

/**
 * DELETE /api/owner/stripe/connect
 * Ngắt liên kết trên hệ thống (không xoá account trên Stripe).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["OWNER"]);
    if (roleError) return roleError;

    // Do not allow disconnect if any active logic depends on it? keep simple now.
    await prisma.ownerProfile.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, stripeConnectAccountId: null },
      update: { stripeConnectAccountId: null },
    });

    return successResponse("Đã ngắt liên kết Stripe trên hệ thống", { connected: false });
  } catch (e: unknown) {
    return serverErrorResponse(e);
  }
}

