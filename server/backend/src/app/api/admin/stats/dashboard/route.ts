import { NextRequest } from "next/server";
import { getAdminSummary } from "@/modules/admin/admin.service";
import { successResponse, serverErrorResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

/**
 * Resolve preset period strings to concrete [startDate, endDate] ISO strings.
 */
function resolvePreset(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  switch (preset) {
    case "last_week": {
      // Monday–Sunday of the previous calendar week
      const day = now.getDay(); // 0=Sun … 6=Sat
      const diffToLastMonday = day === 0 ? 6 : day - 1; // days since current Monday
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - diffToLastMonday);
      thisMonday.setHours(0, 0, 0, 0);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(thisMonday.getDate() - 1);
      lastSunday.setHours(23, 59, 59, 999);
      start = lastMonday;
      end = lastSunday;
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now);
      break;
    }
    case "last_month": {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      start = firstOfLastMonth;
      end = lastOfLastMonth;
      break;
    }
    case "today":
    default: {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      break;
    }
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * GET /api/admin/stats/dashboard
 * Provides comprehensive statistics for the admin dashboard.
 * Query params:
 *   preset: 'today' | 'last_week' | 'this_month' | 'last_month' (shorthand period)
 *   startDate: ISO date string (overrides preset)
 *   endDate:   ISO date string (overrides preset)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminPermissions(req, ["view_stats"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("preset") || undefined;
    let startDate = searchParams.get("startDate") || undefined;
    let endDate   = searchParams.get("endDate")   || undefined;

    // If no explicit range provided but a preset is given, resolve it
    if (preset && !startDate && !endDate) {
      const resolved = resolvePreset(preset);
      startDate = resolved.startDate;
      endDate   = resolved.endDate;
    }

    const summary = await getAdminSummary(startDate, endDate);

    return successResponse("Lấy số liệu dashboard thành công", summary);
  } catch (error: unknown) {
    console.error("GET Admin Dashboard Error:", error);
    return serverErrorResponse(error);
  }
}
