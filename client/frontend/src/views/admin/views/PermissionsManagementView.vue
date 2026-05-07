<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <Key :size="22" class="title-icon" />
          Phân quyền hệ thống
        </div>

        <div class="page-subtitle">
          Thiết lập quyền truy cập cho từng vai trò người dùng
        </div>
      </div>

      <div class="header-actions">
        <button
          class="btn-reset"
          :disabled="loading || saving"
          @click="handleResetToDefault"
          title="Khôi phục về cấu hình mặc định của hệ thống"
        >
          <RotateCcw :size="16" />
          Mặc định
        </button>
        <button
          class="btn-save"
          :disabled="saving || !isDirty"
          @click="handleSaveChanges"
        >
          <Save :size="16" />
          {{ saving ? "Đang lưu..." : "Lưu thay đổi" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-hint">
      Đang tải cấu hình phân quyền...
    </div>

    <!-- Super Admin protection notice -->
    <div class="sa-notice">
      <ShieldAlert :size="14" />
      <span>Quyền <strong>manage_perms</strong> của Admin luôn được giữ. Không thể hạ quyền Admin duy nhất còn hoạt động trong hệ thống.</span>
    </div>

    <div v-if="savedBanner" class="saved-banner">
      <CheckCircle2 :size="16" /> Đã lưu phân quyền thành công — {{ new Date(lastSavedAt).toLocaleString('vi-VN') }}
    </div>

    <div v-if="!loading" class="permissions-layout mt-6">
      <!-- Role Sidebar -->
      <div class="role-sidebar">
        <div
          v-for="role in roles"
          :key="role.id"
          class="role-item"
          :class="{ active: selectedRole === role.id }"
          @click="selectedRole = role.id"
        >
          <div class="role-icon" :class="role.id.toLowerCase()">
            <Shield :size="16" />
          </div>

          <div class="role-info">
            <div class="role-name-row">
              <div class="role-name">{{ role.name }}</div>
              <div class="role-badge">{{ getActiveCountForRole(role.id) }}/{{ allPermissionIds.length }}</div>
            </div>
            <div class="role-desc">{{ role.desc }}</div>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="permissions-content custom-scrollbar">
        <div class="content-header">
          <div class="role-badge-lg" :class="selectedRole.toLowerCase()">
             <Shield :size="20" />
          </div>
          <div class="header-text">
            <h3>Quyền hạn cho {{ currentRoleName }}</h3>
            <p>{{ currentRoleDesc }} ({{ activeCountForSelectedRole }}/{{ allPermissionIds.length }} quyền)</p>
          </div>
        </div>

        <div
          v-for="category in permissionCategories"
          :key="category.name"
          class="permission-category"
        >
          <div class="category-header">
            <div class="cat-title">
              <component :is="category.icon" :size="16" class="cat-icon" />
              {{ category.name }}
            </div>
            
            <button 
              class="cat-toggle-btn"
              @click="toggleCategory(category)"
              v-if="!(selectedRole === 'ADMIN' && category.name === 'Cài đặt hệ thống')"
            >
              {{ isCategoryAllSelected(category) ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
            </button>
          </div>

          <div class="permission-list">
            <div
              v-for="permission in category.permissions"
              :key="permission.id"
              class="permission-row"
              :class="{ 
                'is-dirty': isChanged(permission.id),
                'is-locked': selectedRole === 'ADMIN' && permission.id === 'manage_perms'
              }"
            >
              <div class="p-info">
                <div class="p-title">
                  {{ permission.title }}
                  <span v-if="isChanged(permission.id)" class="dirty-dot" title="Chưa lưu"></span>
                </div>
                <div class="p-desc">{{ permission.desc }}</div>
              </div>

              <div class="p-action">
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="rolePermissions[selectedRole][permission.id]"
                    :disabled="
                      selectedRole === 'ADMIN' &&
                      permission.id === 'manage_perms'
                    "
                    @change="handlePermissionChange(permission.id)"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- /Permissions -->
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import {
  Key,
  Save,
  Shield,
  Users,
  Home,
  CircleDollarSign,
  FileText,
  Settings,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
} from "lucide-vue-next";
import { adminService } from "@/services/admin.service";

export default {
  name: "PermissionsManagementView",

  components: {
    Key,
    Save,
    Shield,
    Users,
    Home,
    CircleDollarSign,
    FileText,
    Settings,
    ShieldAlert,
    CheckCircle2,
    RotateCcw,
  },

  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const selectedRole = ref("ADMIN");
    const lastSavedAt = ref(null);
    const savedBanner = ref(false);
    
    // Track original state for visual diff
    const originalPermissions = ref({});
    const rolePermissions = ref({
      ADMIN: {},
      OWNER: {},
      USER: {},
    });

    const isDirty = computed(() => {
      try {
        return JSON.stringify(rolePermissions.value) !== JSON.stringify(originalPermissions.value);
      } catch (e) {
        return false;
      }
    });

    const roles = [
      {
        id: "ADMIN",
        name: "Admin",
        desc: "Quyền quản trị tối cao",
      },
      {
        id: "OWNER",
        name: "Owner",
        desc: "Chủ cơ sở",
      },
      {
        id: "USER",
        name: "User",
        desc: "Người dùng hệ thống",
      },
    ];

    const permissionCategories = [
      {
        name: "Quản lý người dùng",
        icon: Users,
        permissions: [
          {
            id: "view_users",
            title: "Xem danh sách người dùng",
            desc: "Cho phép truy cập danh sách tài khoản",
          },
          {
            id: "edit_users",
            title: "Chỉnh sửa tài khoản",
            desc: "Cập nhật thông tin tài khoản",
          },
          {
            id: "lock_users",
            title: "Khóa / mở khóa tài khoản",
            desc: "Đình chỉ hoặc khôi phục truy cập",
          },
        ],
      },
      {
        name: "Kiểm duyệt cơ sở",
        icon: Home,
        permissions: [
          {
            id: "approve_clubs",
            title: "Phê duyệt câu lạc bộ",
            desc: "Duyệt CLB mới đăng ký",
          },
          {
            id: "verify_kyc",
            title: "Xác minh KYC",
            desc: "Kiểm tra hồ sơ chủ sân",
          },
          {
            id: "manage_courts",
            title: "Quản lý sân bãi",
            desc: "Cập nhật trạng thái sân",
          },
        ],
      },
      {
        name: "Tài chính & thống kê",
        icon: CircleDollarSign,
        permissions: [
          {
            id: "view_finance",
            title: "Xem doanh thu",
            desc: "Xem báo cáo tài chính",
          },
          {
            id: "view_stats",
            title: "Xem thống kê",
            desc: "Truy cập dashboard hệ thống",
          },
          {
            id: "export_reports",
            title: "Xuất báo cáo",
            desc: "Export Excel / PDF",
          },
        ],
      },
      {
        name: "Cài đặt hệ thống",
        icon: Settings,
        permissions: [
          {
            id: "manage_settings",
            title: "Cấu hình hệ thống",
            desc: "Quản lý tham số hệ thống",
          },
          {
            id: "manage_perms",
            title: "Quản lý phân quyền",
            desc: "Cập nhật ma trận phân quyền",
          },
        ],
      },
      {
        name: "Quản lý nội dung",
        icon: FileText,
        permissions: [
          {
            id: "moderate_posts",
            title: "Kiểm duyệt bài đăng",
            desc: "Ẩn / duyệt bài viết",
          },
          {
            id: "moderate_comments",
            title: "Kiểm duyệt bình luận",
            desc: "Ẩn / xóa bình luận",
          },
        ],
      },
    ];

    const allPermissionIds = permissionCategories.flatMap((category) =>
      category.permissions.map((permission) => permission.id),
    );


    const currentRole = computed(() => {
      return roles.find((role) => role.id === selectedRole.value);
    });

    const currentRoleName = computed(() => currentRole.value?.name || "");
    const currentRoleDesc = computed(() => currentRole.value?.desc || "");

    const DEFAULT_MATRIX = {
      ADMIN: {
        view_users: true, edit_users: true, lock_users: true, approve_clubs: true,
        verify_kyc: true, manage_courts: true, view_finance: true, export_reports: true,
        manage_settings: true, manage_perms: true, moderate_posts: true, moderate_comments: true, view_stats: true,
      },
      OWNER: {
        view_users: false, edit_users: false, lock_users: false, approve_clubs: false,
        verify_kyc: false, manage_courts: true, view_finance: true, export_reports: false,
        manage_settings: false, manage_perms: false, moderate_posts: false, moderate_comments: false, view_stats: false,
      },
      USER: {
        view_users: false, edit_users: false, lock_users: false, approve_clubs: false,
        verify_kyc: false, manage_courts: false, view_finance: false, export_reports: false,
        manage_settings: false, manage_perms: false, moderate_posts: false, moderate_comments: false, view_stats: false,
      },
    };

    const normalizeMatrix = (matrix) => {
      const normalized = {};

      for (const role of roles) {
        const source = matrix?.[role.id] || {};
        normalized[role.id] = {};

        for (const permissionId of allPermissionIds) {
          normalized[role.id][permissionId] = !!source[permissionId];
        }
      }

      normalized.ADMIN.manage_perms = true;

      return normalized;
    };

    const activeCountForSelectedRole = computed(() => {
      const perms = rolePermissions.value[selectedRole.value] || {};
      return Object.values(perms).filter(Boolean).length;
    });

    const getActiveCountForRole = (roleId) => {
      const perms = rolePermissions.value[roleId] || {};
      return Object.values(perms).filter(Boolean).length;
    };

    const isChanged = (permId) => {
      const current = rolePermissions.value[selectedRole.value]?.[permId];
      const original = originalPermissions.value[selectedRole.value]?.[permId];
      return current !== original;
    };

    const isCategoryAllSelected = (category) => {
      const perms = rolePermissions.value[selectedRole.value] || {};
      return category.permissions.every(p => perms[p.id]);
    };

    const toggleCategory = (category) => {
      const perms = rolePermissions.value[selectedRole.value];
      const allSelected = isCategoryAllSelected(category);
      
      category.permissions.forEach(p => {
        // Admin's manage_perms is immutable
        if (selectedRole.value === 'ADMIN' && p.id === 'manage_perms') return;
        perms[p.id] = !allSelected;
      });
    };

    const loadPermissions = async () => {
      loading.value = true;

      try {
        const response = await adminService.getPermissionsConfig();
        const payload = response.data?.data || {};

        const normalized = normalizeMatrix(payload.matrix);
        rolePermissions.value = JSON.parse(JSON.stringify(normalized));
        originalPermissions.value = JSON.parse(JSON.stringify(normalized));
        
        lastSavedAt.value = payload.updatedAt || null;
      } catch (error) {
        console.error(error);
        alert(
          error?.response?.data?.message ||
            "Không tải được cấu hình phân quyền",
        );
      } finally {
        loading.value = false;
      }
    };

    const handlePermissionChange = (permissionId) => {
      if (selectedRole.value === "ADMIN" && permissionId === "manage_perms") {
        rolePermissions.value.ADMIN.manage_perms = true;
      }
    };

    const handleResetToDefault = () => {
      if (!confirm(`Bạn có chắc muốn khôi phục quyền hạn cho vai trò ${currentRoleName.value} về mặc định?`)) return;
      
      const defaults = DEFAULT_MATRIX[selectedRole.value];
      const current = rolePermissions.value[selectedRole.value];
      
      for (const pId in defaults) {
        if (selectedRole.value === 'ADMIN' && pId === 'manage_perms') continue;
        current[pId] = defaults[pId];
      }
    };

    const handleSaveChanges = async () => {
      saving.value = true;

      try {
        const response = await adminService.savePermissionsConfig(
          normalizeMatrix(rolePermissions.value),
        );

        const payload = response.data?.data || {};

        const normalized = normalizeMatrix(payload.matrix || payload);
        rolePermissions.value = JSON.parse(JSON.stringify(normalized));
        originalPermissions.value = JSON.parse(JSON.stringify(normalized));
        
        lastSavedAt.value = new Date().toISOString();

        savedBanner.value = true;
        setTimeout(() => { savedBanner.value = false; }, 4000);
      } catch (error) {
        console.error(error);
        alert(
          error?.response?.data?.message ||
            "Không lưu được cấu hình phân quyền",
        );
      } finally {
        saving.value = false;
      }
    };

    onMounted(loadPermissions);

    return {
      loading,
      saving,
      isDirty,
      selectedRole,
      lastSavedAt,
      savedBanner,
      roles,
      permissionCategories,
      rolePermissions,
      currentRoleName,
      currentRoleDesc,
      allPermissionIds,
      activeCountForSelectedRole,
      getActiveCountForRole,
      isChanged,
      isCategoryAllSelected,
      toggleCategory,
      handlePermissionChange,
      handleResetToDefault,
      handleSaveChanges,
    };
  },
};
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-icon {
  color: var(--accent);
}

.loading-hint,
.saved-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.sa-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.saved-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.25);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #22c55e;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  height: 38px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(79, 110, 247, 0.3);
}

.btn-save:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 110, 247, 0.4);
}

.btn-save:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(0.95);
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  filter: grayscale(1);
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 16px;
  height: 38px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.btn-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.permissions-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  height: calc(100vh - 180px);
}

.role-sidebar {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
}

.role-item:hover {
  background: var(--bg-hover);
}

.role-item.active {
  background: var(--bg-active);
}

.role-icon.admin { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.role-icon.owner { color: #a855f7; background: rgba(168, 85, 247, 0.1); }
.role-icon.user { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }

.role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  margin-left: auto;
}

.active .role-badge {
  background: var(--accent);
  color: white;
}

.permissions-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
}

.content-header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-badge-lg {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-badge-lg.admin { color: #ef4444; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }
.role-badge-lg.owner { color: #a855f7; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); }
.role-badge-lg.user { color: #3b82f6; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); }

.header-text h3 {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 800;
}

.header-text p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.permission-category {
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.permission-category:last-child {
  border-bottom: none;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.cat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cat-toggle-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.cat-toggle-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent);
  border-color: var(--accent);
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.permission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 14px;
  transition: all 0.2s;
}

.permission-row:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: var(--bg-hover);
}

.permission-row.is-dirty {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.permission-row.is-locked {
  background: rgba(var(--accent-rgb), 0.02);
  border-style: dashed;
}

.p-title {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
  box-shadow: 0 0 8px var(--accent);
}

.p-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 24px;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.slider:before {
  position: absolute;
  content: "";
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

input:checked + .slider {
  background: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

input:disabled + .slider {
  opacity: 0.4;
  cursor: not-allowed;
}

.mt-6 {
  margin-top: 24px;
}
</style>
