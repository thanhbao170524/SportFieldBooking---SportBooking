<template>
  <aside class="sidebar custom-scrollbar">
    <div class="sidebar-logo">
      <div class="logo-icon"><div class="icon-inner"><Activity :size="18" stroke-width="2.5" /></div></div>
      <div>
        <div class="logo-text">SportField</div>
        <div class="logo-sub">Admin Dashboard</div>
      </div>
    </div>

    <div v-if="hasPermission('view_stats')" class="sidebar-section">
      <div class="sidebar-label">Thống kê & Dashboard</div>
      <router-link to="/admin" class="nav-item" active-class="active">
        <span class="nav-icon"><LayoutDashboard :size="16" /></span> Dashboard
      </router-link>
    </div>

    <div v-if="hasPermission('manage_courts') || hasPermission('approve_clubs')" class="sidebar-section">
      <div class="sidebar-label">Câu lạc bộ & Sân</div>
      <router-link v-if="hasPermission('manage_courts')" to="/admin/courts" class="nav-item" active-class="active">
        <span class="nav-icon"><Home :size="16" /></span> Danh sách cơ sở
      </router-link>
      <router-link v-if="hasPermission('approve_clubs')" to="/admin/courts/pending" class="nav-item" active-class="active">
        <span class="nav-icon"><Clock :size="16" /></span> Duyệt câu lạc bộ 
        <span v-if="stats.pendingClubs > 0" class="nav-badge orange">{{ stats.pendingClubs }}</span>
      </router-link>
      <router-link v-if="hasPermission('manage_courts')" to="/admin/courts/locked" class="nav-item" active-class="active">
        <span class="nav-icon"><Lock :size="16" /></span> Cơ sở bị khóa
      </router-link>
    </div>

    <div v-if="hasPermission('view_users') || hasPermission('view_owners') || hasPermission('verify_kyc')" class="sidebar-section">
      <div class="sidebar-label">Quản lý tài khoản</div>
      <router-link v-if="hasPermission('view_users')" to="/admin/users" class="nav-item" active-class="active">
        <span class="nav-icon"><Users :size="16" /></span> Người dùng
      </router-link>
      <router-link v-if="hasPermission('view_owners')" to="/admin/owners" class="nav-item" active-class="active">
        <span class="nav-icon"><Building2 :size="16" /></span> Hồ sơ chủ Câu lạc bộ
      </router-link>
      <router-link v-if="hasPermission('verify_kyc')" to="/admin/owners/kyc" class="nav-item" active-class="active">
        <span class="nav-icon"><ShieldCheck :size="16" /></span> Duyệt định danh (KYC)
        <span v-if="stats.pendingKyc > 0" class="nav-badge orange">{{ stats.pendingKyc }}</span>
      </router-link>
      <router-link v-if="hasPermission('view_users')" to="/admin/violations" class="nav-item" active-class="active">
        <span class="nav-icon"><ShieldAlert :size="16" /></span> Báo cáo
        <span v-if="stats.violations > 0" class="nav-badge">{{ stats.violations }}</span>
      </router-link>
    </div>

    <div v-if="hasPermission('moderate_posts') || hasPermission('moderate_comments')" class="sidebar-section">
      <div class="sidebar-label">Quản lý nội dung</div>
      <router-link v-if="hasPermission('moderate_posts')" to="/admin/posts" class="nav-item" active-class="active">
        <span class="nav-icon"><FileText :size="16" /></span> Bài đăng
      </router-link>
      <router-link v-if="hasPermission('moderate_posts')" to="/admin/community" class="nav-item" active-class="active">
        <span class="nav-icon"><MessageSquare :size="16" /></span> Cộng đồng
      </router-link>
    </div>

    <div v-if="hasPermission('view_stats') || hasPermission('view_finance')" class="sidebar-section">
      <div class="sidebar-label">Thống kê & Tài chính</div>
      <router-link v-if="hasPermission('view_finance')" to="/admin/finance" class="nav-item" active-class="active">
        <span class="nav-icon"><Wallet :size="16" /></span> Tài chính
      </router-link>
    </div>

    <div v-if="user?.role === 'ADMIN'" class="sidebar-section">
      <div class="sidebar-label">Hệ thống</div>
      <router-link v-if="hasPermission('manage_perms')" to="/admin/permissions" class="nav-item" active-class="active">
        <span class="nav-icon"><Key :size="16" /></span> Phân quyền
      </router-link>
      <router-link v-if="hasPermission('manage_settings')" to="/admin/settings" class="nav-item" active-class="active">
        <span class="nav-icon"><Settings :size="16" /></span> Cài đặt
      </router-link>
    </div>

    <div class="sidebar-bottom">
      <div class="user-card" @click="handleLogout">
        <div class="user-avatar"><User :size="16" stroke-width="2.5" /></div>
        <div class="user-info">
          <div class="user-name">{{ user?.fullName || 'Admin' }}</div>
          <div class="user-role">{{ userRoleLabel }}</div>
        </div>
        <LogOut :size="14" class="logout-icon" />
      </div>
    </div>

  </aside>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Activity, LayoutDashboard, Home, Clock, Lock, 
  Users, Building2, ShieldAlert, FileText, Newspaper, 
  MessageSquare, BarChart3, Wallet, FilePieChart, Key, Settings,
  User, LogOut, ShieldCheck
} from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';

export default {
  name: 'AdminSidebar',
  components: {
    Activity, LayoutDashboard, Home, Clock, Lock, 
    Users, Building2, ShieldAlert, FileText, Newspaper, 
    MessageSquare, BarChart3, Wallet, FilePieChart, Key, Settings,
    User, LogOut, ShieldCheck
  },
  setup() {
    const router = useRouter();
    const stats = ref({
      pendingClubs: 0,
      pendingKyc: 0,
      violations: 0
    });
    const user = ref(null);

    const userRoleLabel = computed(() => {
      if (!user.value) return '...';
      if (user.value.role === 'ADMIN') return 'Quản trị viên';
      if (user.value.role === 'STAFF') return 'Admin mức 2';
      return user.value.role;
    });

    const fetchStats = async () => {
      try {
        const response = await adminService.getSummary();
        const data = response.data.data;
        stats.value = {
          pendingClubs: data.approvals?.pendingClubs || 0,
          pendingKyc: data.approvals?.pendingKyc || 0,
          violations: data.moderation?.pendingReports || 0
        };
      } catch (error) {
        console.error("Lỗi khi tải thông báo sidebar:", error);
      }
    };

    const handleLogout = () => {
      if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth/login');
      }
    };

    const hasPermission = (permissionKey) => {
      // Admin luôn có tất cả quyền
      if (user.value?.role === 'ADMIN') return true;
      // Kiểm tra trong object permissions của user
      return !!user.value?.permissions?.[permissionKey];
    };

    onMounted(async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          user.value = JSON.parse(storedUser);
        }
        
        // Gọi API lấy thông tin mới nhất để cập nhật quyền (nếu đã đăng nhập)
        if (localStorage.getItem('token')) {
          const res = await adminService.getProfile(); // Giả sử dùng chung adminService hoặc authService
          if (res.data?.data) {
             user.value = res.data.data;
             localStorage.setItem('user', JSON.stringify(user.value));
          }
        }
      } catch (e) {
        console.error("Lỗi cập nhật thông tin user:", e);
      }
      fetchStats();
    });

    return {
      stats,
      user,
      userRoleLabel,
      hasPermission,
      handleLogout
    };
  }
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  height: 100vh;
}

.sidebar-logo {
  padding: 18px 16px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border);
}

.logo-icon { 
  width: 32px; 
  height: 32px; 
  background: var(--accent); 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #fff;
}

.logo-text { 
  font-family: 'Barlow', sans-serif; 
  font-weight: 700; 
  font-size: 15px; 
  color: var(--text-primary);
}

.logo-sub { 
  font-size: 10px; 
  color: var(--text-muted); 
  font-weight: 400; 
}

.sidebar-section { padding: 16px 10px 8px; }
.sidebar-label { 
  font-size: 10px; 
  font-weight: 600; 
  text-transform: uppercase; 
  letter-spacing: 0.08em; 
  color: var(--text-muted); 
  padding: 0 8px; 
  margin-bottom: 4px; 
}

.nav-item {
  display: flex; 
  align-items: center; 
  gap: 9px; 
  padding: 7px 11px; 
  border-radius: 6px; 
  cursor: pointer;
  font-size: 13px; 
  color: var(--text-secondary); 
  transition: all 0.15s; 
  margin-bottom: 1px; 
  position: relative;
  text-decoration: none;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item:hover .nav-icon { opacity: 1; }
.nav-item.active { background: var(--bg-active); color: var(--text-primary); }
.nav-item.active .nav-icon { opacity: 1; color: var(--accent); }
.nav-item.active::before { 
  content: ''; 
  position: absolute; 
  left: 0; 
  top: 50%; 
  transform: translateY(-50%); 
  width: 3px; 
  height: 60%; 
  background: var(--accent); 
  border-radius: 0 2px 2px 0; 
}

.nav-badge { 
  margin-left: auto; 
  font-size: 10px; 
  background: var(--red); 
  color: #fff; 
  padding: 1px 6px; 
  border-radius: 10px; 
  font-weight: 600; 
}
.nav-badge.orange { background: var(--orange); }

.sidebar-bottom { margin-top: auto; padding: 12px 10px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }

.user-card { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  padding: 8px; 
  border-radius: 8px; 
  cursor: pointer; 
}
.user-card:hover { background: var(--bg-hover); }

.user-avatar { 
  width: 32px; 
  height: 32px; 
  border-radius: 50%; 
  background: linear-gradient(135deg, var(--accent), var(--purple)); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #fff;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
.user-role { font-size: 11px; color: var(--text-muted); }

.logout-icon {
  color: var(--text-muted);
  opacity: 0.5;
  transition: all 0.2s;
}
.user-card:hover .logout-icon {
  color: var(--red);
  opacity: 1;
}
</style>