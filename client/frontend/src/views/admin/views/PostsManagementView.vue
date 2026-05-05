<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <FileText :size="22" class="title-icon" />
          Quản lý Bài đăng
        </div>
        <div class="page-subtitle">Ẩn/hiện/xóa mềm các bài đăng của chủ sân.</div>
      </div>

      <div class="header-actions">
        <button class="btn-secondary" :disabled="loading" @click="fetchPosts">
          <RefreshCw :size="16" />
          Làm mới
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <div class="filters">
          <select v-model="statusFilter" class="select">
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </div>

        <div class="search-input ml-auto">
          <Search :size="14" />
          <input v-model="q" type="text" placeholder="Tìm theo tiêu đề / CLB..." />
        </div>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>CLB</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th class="text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredPosts" :key="p.id">
              <td>
                <div class="title-cell">
                  <div class="p-title">{{ p.title }}</div>
                  <div class="p-sub">#{{ p.slug || p.id?.slice?.(0, 8) }}</div>
                </div>
              </td>
              <td>{{ p.club?.name || '-' }}</td>
              <td><span class="tag">{{ formatType(p.type) }}</span></td>
              <td>
                <span class="status" :class="String(p.status || '').toLowerCase()">
                  {{ formatStatus(p.status) }}
                </span>
              </td>
              <td>{{ formatDate(p.createdAt) }}</td>
              <td class="text-right">
                <div class="row-actions">
                  <button
                    class="row-btn"
                    :disabled="loading"
                    @click="toggleHidden(p)"
                    :title="p.status === 'HIDDEN' ? 'Hiện bài đăng' : 'Ẩn bài đăng'"
                  >
                    <EyeOff v-if="p.status !== 'HIDDEN'" :size="14" />
                    <Eye v-else :size="14" />
                  </button>
                  <button
                    v-if="p.status === 'PENDING'"
                    class="row-btn success-hover"
                    :disabled="loading"
                    title="Duyệt bài"
                    @click="approve(p)"
                  >
                    <Check :size="14" />
                  </button>
                  <button
                    v-if="p.status === 'PENDING'"
                    class="row-btn danger-hover"
                    :disabled="loading"
                    title="Từ chối"
                    @click="reject(p)"
                  >
                    <X :size="14" />
                  </button>
                  <button
                    class="row-btn danger-hover"
                    :disabled="loading"
                    title="Xóa mềm"
                    @click="softDelete(p)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!loading && filteredPosts.length === 0">
              <td colspan="6" class="empty">Không có dữ liệu.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="loading" class="loading-row">Đang tải...</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { FileText, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X } from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';

export default {
  name: 'PostsManagementView',
  components: { FileText, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X },
  setup() {
    const loading = ref(false);
    const posts = ref([]);
    const q = ref('');
    const statusFilter = ref('');

    const fetchPosts = async () => {
      loading.value = true;
      try {
        const res = await adminService.getAllPosts();
        posts.value = res.data?.data || [];
      } catch (e) {
        alert(e?.response?.data?.message || 'Không tải được danh sách bài đăng.');
      } finally {
        loading.value = false;
      }
    };

    const filteredPosts = computed(() => {
      const qq = String(q.value || '').trim().toLowerCase();
      const st = String(statusFilter.value || '').trim();
      return (posts.value || [])
        .filter((p) => !p.deletedAt)
        .filter((p) => (st ? String(p.status) === st : true))
        .filter((p) => {
          if (!qq) return true;
          const t = `${p.title || ''} ${p.club?.name || ''}`.toLowerCase();
          return t.includes(qq);
        });
    });

    const formatDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '-';
      return dt.toLocaleString('vi-VN');
    };

    const formatStatus = (s) => {
      const v = String(s || '');
      if (v === 'PENDING') return 'Chờ duyệt';
      if (v === 'ACTIVE') return 'Hiển thị';
      if (v === 'HIDDEN') return 'Đã ẩn';
      if (v === 'EXPIRED') return 'Hết hạn';
      return v || '-';
    };

    const formatType = (t) => {
      const v = String(t || '');
      const map = {
        AVAILABLE_SLOT: 'Khung giờ trống',
        DISCOUNT: 'Giảm giá',
        EVENT: 'Sự kiện',
        TEAM_MATCHING: 'Tìm đội',
        ANNOUNCEMENT: 'Thông báo',
      };
      return map[v] || v || '-';
    };

    const toggleHidden = async (p) => {
      if (p.status === 'PENDING') {
        alert('Bài đang chờ duyệt. Hãy duyệt hoặc từ chối.');
        return;
      }
      const next = p.status === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN';
      if (!confirm(`Bạn có chắc muốn chuyển bài đăng sang trạng thái "${formatStatus(next)}"?`)) return;
      loading.value = true;
      try {
        await adminService.updatePostStatus(p.id, next);
        await fetchPosts();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không cập nhật được trạng thái.');
      } finally {
        loading.value = false;
      }
    };

    const approve = async (p) => {
      if (!confirm('Duyệt bài đăng này? (Bài sẽ hiển thị công khai và gửi thông báo tới người chơi)')) return;
      loading.value = true;
      try {
        await adminService.moderatePost(p.id, { action: 'APPROVE' });
        await fetchPosts();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không duyệt được bài.');
      } finally {
        loading.value = false;
      }
    };

    const reject = async (p) => {
      const note = prompt('Lý do từ chối (tùy chọn):') || '';
      if (!confirm('Từ chối bài đăng này? (Bài sẽ bị ẩn)')) return;
      loading.value = true;
      try {
        await adminService.moderatePost(p.id, { action: 'REJECT', note });
        await fetchPosts();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không từ chối được bài.');
      } finally {
        loading.value = false;
      }
    };

    const softDelete = async (p) => {
      if (!confirm('Xóa mềm bài đăng này? (Có thể ẩn khỏi hệ thống)')) return;
      loading.value = true;
      try {
        await adminService.deletePost(p.id);
        await fetchPosts();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không xóa được bài đăng.');
      } finally {
        loading.value = false;
      }
    };

    onMounted(fetchPosts);

    return {
      loading,
      posts,
      q,
      statusFilter,
      fetchPosts,
      filteredPosts,
      formatDate,
      formatStatus,
      formatType,
      toggleHidden,
      approve,
      reject,
      softDelete,
    };
  },
};
</script>

<style scoped>
.page-header { margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: var(--text-primary); }
.title-icon { color: var(--accent); }
.page-subtitle { margin-top: 6px; font-size: 12px; color: var(--text-muted); }

.table-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
.table-toolbar { padding: 14px 16px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid var(--border); }
.filters { display: flex; align-items: center; gap: 10px; }
.select { height: 36px; border-radius: 10px; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary); padding: 0 12px; font-size: 12px; }
.search-input { display: flex; align-items: center; gap: 10px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; height: 36px; width: 320px; max-width: 52vw; }
.search-input input { background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 12px; width: 100%; }

.table-responsive { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 14px; font-size: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); color: var(--text-secondary); }
th { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); }
.text-right { text-align: right; }
.ml-auto { margin-left: auto; }

.title-cell { display: flex; flex-direction: column; gap: 2px; }
.p-title { color: var(--text-primary); font-weight: 750; }
.p-sub { font-size: 11px; color: var(--text-muted); }

.tag { font-size: 11px; font-weight: 800; color: var(--text-secondary); background: var(--bg-tertiary); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(148, 163, 184, 0.18); }

.status { font-size: 11px; font-weight: 800; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(148, 163, 184, 0.18); display: inline-flex; }
.status.pending { color: var(--orange); background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.25); }
.status.active { color: var(--green); background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.25); }
.status.hidden { color: var(--orange); background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.25); }
.status.expired { color: #94a3b8; background: rgba(148,163,184,0.08); }

.row-actions { display: inline-flex; gap: 8px; }
.row-btn { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid var(--border); background: transparent; cursor: pointer; color: var(--text-secondary); transition: all .15s; }
.row-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.row-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.danger-hover:hover { border-color: rgba(239, 68, 68, 0.4); color: #ef4444; background: rgba(239,68,68,0.08); }
.success-hover:hover { border-color: rgba(34, 197, 94, 0.4); color: var(--green); background: rgba(34,197,94,0.08); }

.empty { padding: 18px; text-align: center; color: var(--text-muted); }
.loading-row { padding: 12px 16px; font-size: 12px; color: var(--text-muted); }

.btn-secondary { height: 36px; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text-primary); padding: 0 12px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.btn-secondary:hover { background: var(--bg-tertiary); }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>

