import { prisma } from "@/infra/db/prisma";

// PERMISSIONS
export type PermissionKey =
  | "view_users"
  | "edit_users"
  | "lock_users"
  | "approve_clubs"
  | "verify_kyc"
  | "manage_courts"
  | "view_finance"
  | "manage_settings"
  | "manage_perms"
  | "moderate_posts"
  | "moderate_comments"
  | "view_posts"
  | "delete_posts"
  | "view_stats"
  | "view_owners";

export type RoleKey = "ADMIN" | "STAFF" | "OWNER" | "USER";

export type PermissionsMatrix = Record<RoleKey, Record<PermissionKey, boolean>>;

const CONFIG_KEY = "RBAC_PERMISSIONS";

export const DEFAULT_PERMISSIONS_MATRIX: PermissionsMatrix = {
  ADMIN: {
    view_users: true,
    edit_users: true,
    lock_users: true,
    approve_clubs: true,
    verify_kyc: true,
    manage_courts: true,
    view_finance: true,
    manage_settings: true,
    manage_perms: true,
    moderate_posts: true,
    moderate_comments: true,
    view_posts: true,
    delete_posts: true,
    view_stats: true,
    view_owners: true,
  },
  STAFF: {
    view_users: true,
    edit_users: false,
    lock_users: false,
    approve_clubs: true,
    verify_kyc: true,
    manage_courts: true,
    view_finance: false,
    manage_settings: false,
    manage_perms: false,
    moderate_posts: true,
    moderate_comments: true,
    view_posts: true,
    delete_posts: false,
    view_stats: true,
    view_owners: true,
  },
  OWNER: {
    view_users: false,
    edit_users: false,
    lock_users: false,
    approve_clubs: false,
    verify_kyc: false,
    manage_courts: false,
    view_finance: false,
    manage_settings: false,
    manage_perms: false,
    moderate_posts: false,
    moderate_comments: false,
    view_posts: true,
    delete_posts: false,
    view_stats: false,
    view_owners: false,
  },
  USER: {
    view_users: false,
    edit_users: false,
    lock_users: false,
    approve_clubs: false,
    verify_kyc: false,
    manage_courts: false,
    view_finance: false,
    manage_settings: false,
    manage_perms: false,
    moderate_posts: false,
    moderate_comments: false,
    view_posts: true,
    delete_posts: false,
    view_stats: false,
    view_owners: false,
  },
};

export function normalizePermissionsMatrix(input: unknown): PermissionsMatrix {
  const src = (input && typeof input === "object" ? (input as Record<string, unknown>) : {}) as Record<
    string,
    Record<string, boolean>
  >;

  // start from defaults to guarantee all keys exist
  const out: PermissionsMatrix = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS_MATRIX));

  const roles: RoleKey[] = ["ADMIN", "STAFF", "OWNER", "USER"];
  const perms: PermissionKey[] = [
    "view_users",
    "edit_users",
    "lock_users",
    "approve_clubs",
    "verify_kyc",
    "manage_courts",
    "view_finance",
    "manage_settings",
    "manage_perms",
    "moderate_posts",
    "moderate_comments",
    "view_posts",
    "delete_posts",
    "view_stats",
    "view_owners",
  ];

  for (const role of roles) {
    const srcRole = src[role] || {};
    for (const p of perms) {
      out[role][p] = !!srcRole[p];
    }
  }

  // Admin must always be able to manage permissions.
  out.ADMIN.manage_perms = true;

  return out;
}

export async function getPermissionsMatrix(): Promise<PermissionsMatrix> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
      select: { value: true },
    });

    if (!row?.value) {
      return DEFAULT_PERMISSIONS_MATRIX;
    }

    try {
      const result = normalizePermissionsMatrix(JSON.parse(row.value));
      return result;
    } catch (parseError) {
      console.error("DEBUG: Failed to parse RBAC_PERMISSIONS JSON:", parseError);
      return DEFAULT_PERMISSIONS_MATRIX;
    }
  } catch (dbError) {
    console.error("DEBUG: Database error in getPermissionsMatrix:", dbError);
    return DEFAULT_PERMISSIONS_MATRIX;
  }
}

export async function savePermissionsMatrix(matrix: unknown): Promise<PermissionsMatrix> {
  const normalized = normalizePermissionsMatrix(matrix);

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    create: {
      key: CONFIG_KEY,
      value: JSON.stringify(normalized),
      description: "RBAC permissions matrix",
    },
    update: {
      value: JSON.stringify(normalized),
    },
  });

  return normalized;
}

