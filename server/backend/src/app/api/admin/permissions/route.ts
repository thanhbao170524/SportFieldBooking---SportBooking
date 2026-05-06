import { NextRequest } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { badRequestResponse, serverErrorResponse, successResponse } from "@/lib/response";

const CONFIG_KEY = "RBAC_PERMISSIONS";

type PermissionsMatrix = Record<string, Record<string, boolean>>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sanitizeMatrix(input: unknown): PermissionsMatrix | null {
  if (!isPlainObject(input)) return null;
  const out: PermissionsMatrix = {};
  for (const [role, perms] of Object.entries(input)) {
    if (!isPlainObject(perms)) continue;
    out[role] = {};
    for (const [permKey, enabled] of Object.entries(perms)) {
      out[role][permKey] = !!enabled;
    }
  }
  return out;
}

const DEFAULT_MATRIX: PermissionsMatrix = {
  ADMIN: {
    view_users: true,
    edit_users: true,
    lock_users: true,
    approve_clubs: true,
    verify_kyc: true,
    manage_courts: true,
    view_finance: true,
    export_reports: true,
    manage_settings: true,
    manage_perms: true,
    moderate_posts: true,
    moderate_comments: true,
    view_stats: true,
  },
  MODERATOR: {
    view_users: true,
    edit_users: false,
    lock_users: false,
    approve_clubs: false,
    verify_kyc: false,
    manage_courts: false,
    view_finance: false,
    export_reports: false,
    manage_settings: false,
    manage_perms: false,
    moderate_posts: true,
    moderate_comments: true,
    view_stats: true,
  },
  OWNER: {
    view_users: false,
    edit_users: false,
    lock_users: false,
    approve_clubs: false,
    verify_kyc: false,
    manage_courts: true,
    view_finance: true,
    export_reports: false,
    manage_settings: false,
    manage_perms: false,
    moderate_posts: false,
    moderate_comments: false,
    view_stats: false,
  },
  USER: {
    view_users: false,
    edit_users: false,
    lock_users: false,
    approve_clubs: false,
    verify_kyc: false,
    manage_courts: false,
    view_finance: false,
    export_reports: false,
    manage_settings: false,
    manage_perms: false,
    moderate_posts: false,
    moderate_comments: false,
    view_stats: false,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const row = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
      select: { key: true, value: true, updatedAt: true },
    });

    if (!row) {
      return successResponse("Permissions config", {
        key: CONFIG_KEY,
        matrix: DEFAULT_MATRIX,
        updatedAt: null,
      });
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      parsed = null;
    }

    const matrix = sanitizeMatrix(parsed) || DEFAULT_MATRIX;
    return successResponse("Permissions config", {
      key: CONFIG_KEY,
      matrix,
      updatedAt: row.updatedAt,
    });
  } catch (e) {
    return serverErrorResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

    const body = await req.json();
    const matrix = sanitizeMatrix(body?.matrix);
    if (!matrix) {
      return badRequestResponse("Body.matrix không hợp lệ.");
    }

    // Không cho tự khóa quyền quản lý phân quyền của ADMIN
    matrix.ADMIN = matrix.ADMIN || {};
    matrix.ADMIN.manage_perms = true;

    const saved = await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: JSON.stringify(matrix),
        description: "RBAC permissions matrix (role -> permission -> boolean)",
      },
      update: {
        value: JSON.stringify(matrix),
      },
      select: { key: true, updatedAt: true, value: true },
    });

    return successResponse("Đã lưu phân quyền", {
      key: saved.key,
      updatedAt: saved.updatedAt,
      matrix,
    });
  } catch (e) {
    return serverErrorResponse(e);
  }
}

