import { createRouter, createWebHistory } from "vue-router";

const LOADER_EVENT_NAME = "app:navigation-loading";
const LOADER_SHOW_DELAY_MS = 120;
const LOADER_MIN_VISIBLE_MS = 260;

let showLoaderTimer = null;
let hideLoaderTimer = null;
let loaderVisibleAt = 0;
let isLoaderVisible = false;

function emitNavigationLoader(loading, progress) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(LOADER_EVENT_NAME, {
        detail: { loading, progress: progress ?? loading },
      })
    );
  }
}

function startNavigationLoader() {
  if (hideLoaderTimer) {
    clearTimeout(hideLoaderTimer);
    hideLoaderTimer = null;
  }
  if (isLoaderVisible || showLoaderTimer) return;

  // Instant progress bar
  emitNavigationLoader(false, true);

  showLoaderTimer = setTimeout(() => {
    isLoaderVisible = true;
    loaderVisibleAt = Date.now();
    emitNavigationLoader(true, true);
    showLoaderTimer = null;
  }, LOADER_SHOW_DELAY_MS);
}

function stopNavigationLoader() {
  if (showLoaderTimer) {
    clearTimeout(showLoaderTimer);
    showLoaderTimer = null;
  }
  if (!isLoaderVisible) {
    emitNavigationLoader(false, false);
    return;
  }

  const elapsed = Date.now() - loaderVisibleAt;
  const remainingVisibleTime = Math.max(LOADER_MIN_VISIBLE_MS - elapsed, 0);
  hideLoaderTimer = setTimeout(() => {
    isLoaderVisible = false;
    loaderVisibleAt = 0;
    emitNavigationLoader(false, false);
    hideLoaderTimer = null;
  }, remainingVisibleTime);
}

const routes = [
  // Page Client
  {
    path: "/",
    name: "home",
    component: () => import("../views/client/HomeView.vue"),
  },
  {
    path: "/booking",
    name: "booking",
    component: () => import("../views/client/BookingView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/venue/:id",
    name: "venue-detail",
    component: () => import("../views/client/VenueDetailView.vue"),
    meta: { requiresAuth: true },
  },
  {
  path: "/checkout",
  name: "checkout",
  component: () => import("../views/client/CheckoutView.vue"),
  meta: { requiresAuth: true },
  },
    {
  path: "/order",
  name: "order",
  component: () => import("../views/client/OrderManagement.vue"),
  meta: { requiresAuth: true },
  },
   {
  path: "/friend",
  name: "friend",
  component: () => import("../views/client/FindFriend.vue"),
  meta: { requiresAuth: true },
  },
  {
  path: "/blog",
  name: "blog",
  component: () => import("../views/client/BlogView.vue"),
  meta: { requiresAuth: true },
  },
  {
    path: "/community/post/:id",
    name: "post-detail",
    component: () => import("../views/client/PostDetailView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/about",
    name: "about",
    component: () => import("../views/client/AboutView.vue"),
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/client/ProfileView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/map",
    name: "map",
    component: () => import("../views/client/MapView.vue"),
  },

  // Auth Group
  {
    path: "/auth/login",
    name: "login",
    component: () => import("../views/auth/LoginView.vue"),
    meta: { layout: "nocore" },
  },
  {
    path: "/auth/register",
    name: "register",
    component: () => import("../views/auth/RegisterView.vue"),
    meta: { layout: "nocore" },
  },
  {
    path: "/auth/forgot-password",
    name: "forgot-password",
    component: () => import("../views/auth/ForgotPasswordView.vue"),
    meta: { layout: "nocore" },
  },
  {
    path: "/auth/reset-password",
    name: "reset-password",
    component: () => import("../views/auth/ResetPasswordView.vue"),
    meta: { layout: "nocore" },
  },

  // Page Admin
  {
    path: "/admin",
    name: "admin",
    component: () => import("../views/admin/dashboard/DashboardView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/courts/:tab?",
    name: "admin-courts",
    component: () => import("../views/admin/views/CourtsAllView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/owners",
    name: "admin-owners",
    component: () => import("../views/admin/views/ClubOwnersView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/owners/kyc",
    name: "admin-owners-kyc",
    component: () => import("../views/admin/views/OwnersKycView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/users",
    name: "admin-users",
    component: () => import("../views/admin/views/UsersManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/stats",
    name: "admin-stats",
    component: () => import("../views/admin/views/SystemStatsView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/finance",
    name: "admin-finance",
    component: () => import("../views/admin/views/FinanceManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },

  {
    path: "/admin/posts",
    name: "admin-posts",
    component: () => import("../views/admin/views/PostsManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/community",
    name: "admin-community",
    component: () => import("../views/admin/views/CommunityManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },

  {
    path: "/admin/violations",
    name: "admin-violations",
    component: () => import("../views/admin/views/CommunityManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/settings",
    name: "admin-settings",
    component: () => import("../views/admin/views/PermissionsManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  {
    path: "/admin/permissions",
    name: "admin-permissions",
    component: () => import("../views/admin/views/PermissionsManagementView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },
  // Placeholders for other admin routes to avoid 404s when navigating the sidebar
  {
    path: "/admin/:catchAll(.*)",
    name: "admin-placeholder",
    component: () => import("../views/admin/views/ClubOwnersView.vue"),
    meta: { layout: "admin", requiresAuth: true, roles: ["ADMIN", "STAFF"] },
  },

  // Page Owner
  {
    path: "/owner",
    name: "owner-home",
    component: () => import("../views/owner/HomeView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/dashboard/owner",
    name: "owner-dashboard",
    component: () => import("../views/owner/DashboardView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/clubs",
    name: "owner-clubs",
    component: () => import("../views/owner/ClubsView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/courts",
    name: "owner-courts",
    component: () => import("../views/owner/CourtsView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/pricing",
    name: "owner-pricing",
    component: () => import("../views/owner/PricingView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/bookings",
    name: "owner-bookings",
    component: () => import("../views/owner/BookingsView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/finance",
    name: "owner-finance",
    component: () => import("../views/owner/FinanceView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/reports",
    name: "owner-reports",
    component: () => import("../views/owner/ReportsView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/customers",
    name: "owner-customers",
    component: () => import("../views/owner/CustomersView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/reviews",
    name: "owner-reviews",
    component: () => import("../views/owner/ReviewsView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/vouchers",
    name: "owner-vouchers",
    component: () => import("../views/owner/VouchersView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/news-feed",
    name: "owner-news-feed",
    component: () => import("../views/owner/NewsFeedView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/services",
    name: "owner-services",
    component: () => import("../views/owner/ServicesView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/onboarding",
    name: "owner-onboarding",
    component: () => import("../views/owner/OwnerOnboardingView.vue"),
    meta: { layout: "nocore", requiresAuth: true, roles: ["OWNER"] }, // Dùng nocore để tập trung vào form, không hiện sidebar
  },
  {
    path: "/owner/settings",
    name: "owner-settings",
    component: () => import("../views/owner/SettingsView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  {
    path: "/owner/payments",
    name: "owner-payments",
    component: () => import("../views/owner/PaymentManagementView.vue"),
    meta: { layout: "owner", requiresAuth: true, roles: ["OWNER"] },
  },
  // Redirect missing routes to Home to avoid console warnings
  { path: "/login", redirect: "/auth/login" },
  { path: "/posts", redirect: "/blog" },
  { path: "/app", redirect: "/" },
  { path: "/terms", redirect: "/about" },
  { path: "/privacy", redirect: "/about" },
  { path: "/search", redirect: (to) => ({ path: "/map", query: to.query }) },
  { path: "/contact", redirect: "/" },
  { path: "/features", redirect: "/" },
  { path: "/promotions", redirect: "/" },
  { path: "/play", redirect: "/" },
  { path: "/sports", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Middleware - Navigation Guard
router.beforeEach((to, from, next) => {
  startNavigationLoader();
  const token = localStorage.getItem("token");
  let user = null;

  if (token) {
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      user = null;
    }
  }

  // 1. Nếu đã đăng nhập mà cố tình vào trang auth (login, register...)
  if (token && (to.name === "login" || to.name === "register" || to.name === "forgot-password")) {
    if (user && user.role === 'OWNER') {
      return next({ path: "/owner" });
    }
    if (user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
      return next({ path: "/admin" });
    }
    return next({ name: "home" });
  }

  // 2. Chặn nếu vào route cần đăng nhập (requiresAuth) mà chưa có token
  if (to.meta.requiresAuth && !token) {
    return next({ name: "login", query: { redirect: to.fullPath } });
  }

  // 3. Phân quyền Role-based Access Control (RBAC) nếu route có yêu cầu roles cụ thể
  if (to.meta.requiresAuth && token && user && to.meta.roles) {
    const userRole = user.role ? user.role.toUpperCase() : null;
    const allowedRoles = to.meta.roles.map(r => r.toUpperCase());
    const isRoleValid = allowedRoles.includes(userRole);

    if (!isRoleValid) {
      if (userRole === 'OWNER') return next({ path: "/owner" });
      if (userRole === 'OWNER') return next({ path: "/owner" });
      if (userRole === 'ADMIN' || userRole === 'STAFF') return next({ path: "/admin" });
      return next({ name: "home" });
    }
  }

  // 4. Cho phép tiếp tục đi tới Route yêu cầu
  next();
});

router.afterEach(() => {
  stopNavigationLoader();
});

router.onError(() => {
  stopNavigationLoader();
});

export default router;
