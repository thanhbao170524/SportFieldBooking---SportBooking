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

    <div v-else-if="lastSavedAt" class="saved-hint">
      Lần lưu gần nhất:
      {{ new Date(lastSavedAt).toLocaleString("vi-VN") }}
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
            <div class="role-name">{{ role.name }}</div>
            <div class="role-desc">{{ role.desc }}</div>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="permissions-content custom-scrollbar">
        <div class="content-header">
          <h3>Quyền hạn cho {{ currentRoleName }}</h3>
          <p>{{ currentRoleDesc }}</p>
        </div>

        <div
          v-for="category in permissionCategories"
          :key="category.name"
          class="permission-category"
        >
          <div class="category-header">
            <component :is="category.icon" :size="16" class="cat-icon" />
            {{ category.name }}
          </div>

          <div class="permission-list">
            <div
              v-for="permission in category.permissions"
              :key="permission.id"
              class="permission-row"
            >
              <div class="p-info">
                <div class="p-title">{{ permission.title }}</div>
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
  },

  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const isDirty = ref(false);
    const selectedRole = ref("ADMIN");
    const lastSavedAt = ref(null);

    const roles = [
      {
        id: "ADMIN",
        name: "Admin",
        desc: "Quyền quản trị tối cao",
      },
      {
        id: "MODERATOR",
        name: "Moderator",
        desc: "Điều hành nội dung",
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

    const rolePermissions = ref({
      ADMIN: {},
      MODERATOR: {},
      OWNER: {},
      USER: {},
    });

    const currentRole = computed(() => {
      return roles.find((role) => role.id === selectedRole.value);
    });

    const currentRoleName = computed(() => currentRole.value?.name || "");
    const currentRoleDesc = computed(() => currentRole.value?.desc || "");

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

    const loadPermissions = async () => {
      loading.value = true;

      try {
        const response = await adminService.getPermissionsConfig();
        const payload = response.data?.data || {};

        rolePermissions.value = normalizeMatrix(payload.matrix);
        lastSavedAt.value = payload.updatedAt || null;
        isDirty.value = false;
        console.log("permissions:", rolePermissions.value);
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

      isDirty.value = true;
    };

    const handleSaveChanges = async () => {
      saving.value = true;

      try {
        const response = await adminService.savePermissionsConfig(
          normalizeMatrix(rolePermissions.value),
        );

        const payload = response.data?.data || {};

        rolePermissions.value = normalizeMatrix(payload.matrix);
        lastSavedAt.value = payload.updatedAt || null;
        isDirty.value = false;

        alert("Đã lưu phân quyền");
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
      roles,
      permissionCategories,
      rolePermissions,
      currentRoleName,
      currentRoleDesc,
      handlePermissionChange,
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

.btn-save {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  height: 38px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.role-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-name {
  font-size: 13px;
  font-weight: 700;
}

.role-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.permissions-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow-y: auto;
}

.content-header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.content-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
}

.content-header p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.permission-category {
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 18px;
  text-transform: uppercase;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.permission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.p-title {
  font-size: 14px;
  font-weight: 700;
}

.p-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 22px;
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
  border-radius: 22px;
  transition: 0.2s;
  cursor: pointer;
}

.slider:before {
  position: absolute;
  content: "";
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}

input:checked + .slider {
  background: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.mt-6 {
  margin-top: 24px;
}
</style>
