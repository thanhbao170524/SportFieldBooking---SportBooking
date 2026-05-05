<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <MessageSquare :size="22" class="title-icon" />
          Quản lý Cộng đồng
        </div>
        <div class="page-subtitle">Duyệt bình luận và xử lý report/vi phạm.</div>
      </div>

      <div class="header-actions">
        <button class="btn-secondary" :disabled="loading" @click="refreshAll">
          <RefreshCw :size="16" />
          Làm mới
        </button>
      </div>
    </div>

    <div class="card">
      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'comments' }" @click="activeTab = 'comments'">
          Bình luận
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'reports' }" @click="activeTab = 'reports'">
          Reports / Vi phạm
        </button>
      </div>

      <!-- COMMENTS -->
      <div v-if="activeTab === 'comments'" class="pane">
        <div class="toolbar">
          <select v-model="commentFilter" class="select">
            <option value="">Tất cả</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đã ẩn</option>
          </select>

          <div class="search-input ml-auto">
            <Search :size="14" />
            <input v-model="commentQ" type="text" placeholder="Tìm nội dung / tên người dùng / tiêu đề bài..." />
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Nội dung</th>
                <th>Người viết</th>
                <th>Bài đăng</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredComments" :key="c.id">
                <td class="w-45">
                  <div class="comment-content">{{ c.content }}</div>
                </td>
                <td>{{ c.user?.fullName || '-' }}</td>
                <td class="muted">{{ c.post?.title || '-' }}</td>
                <td>
                  <span class="status" :class="c.isHidden ? 'hidden' : 'active'">
                    {{ c.isHidden ? 'Đã ẩn' : 'Hiển thị' }}
                  </span>
                </td>
                <td>{{ formatDate(c.createdAt) }}</td>
                <td class="text-right">
                  <div class="row-actions">
                    <button class="row-btn" :disabled="loading" @click="toggleComment(c)">
                      <EyeOff v-if="!c.isHidden" :size="14" />
                      <Eye v-else :size="14" />
                    </button>
                    <button class="row-btn danger-hover" :disabled="loading" @click="deleteComment(c)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && filteredComments.length === 0">
                <td colspan="6" class="empty">Không có dữ liệu.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- REPORTS -->
      <div v-else class="pane">
        <div class="toolbar">
          <select v-model="reportFilter" class="select">
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="RESOLVED">Đã xử lý</option>
            <option value="REJECTED">Từ chối</option>
          </select>

          <div class="search-input ml-auto">
            <Search :size="14" />
            <input v-model="reportQ" type="text" placeholder="Tìm lý do / người báo cáo..." />
          </div>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Lý do</th>
                <th>Người báo cáo</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th class="text-right">Xử lý</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in filteredReports" :key="r.id">
                <td class="w-45">
                  <div class="report-reason">{{ r.reason }}</div>
                  <div class="muted">Target: {{ r.targetType }} • {{ r.targetId }}</div>
                </td>
                <td>
                  <div class="reporter">
                    <div class="name">{{ r.reporter?.fullName || '-' }}</div>
                    <div class="muted">{{ r.reporter?.email || '' }}</div>
                  </div>
                </td>
                <td>
                  <span class="status" :class="String(r.status || '').toLowerCase()">
                    {{ formatReportStatus(r.status) }}
                  </span>
                </td>
                <td>{{ formatDate(r.createdAt) }}</td>
                <td class="text-right">
                  <div class="row-actions">
                    <button class="row-btn success-hover" :disabled="loading || r.status !== 'PENDING'" @click="handleReport(r, 'RESOLVED')">
                      <Check :size="14" />
                    </button>
                    <button class="row-btn danger-hover" :disabled="loading || r.status !== 'PENDING'" @click="handleReport(r, 'REJECTED')">
                      <X :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && filteredReports.length === 0">
                <td colspan="5" class="empty">Không có dữ liệu.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="loading" class="loading-row">Đang tải...</div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { MessageSquare, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X } from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';

export default {
  name: 'CommunityManagementView',
  components: { MessageSquare, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X },
  setup() {
    const loading = ref(false);
    const activeTab = ref('comments');

    const comments = ref([]);
    const reports = ref([]);

    const commentQ = ref('');
    const commentFilter = ref('');

    const reportQ = ref('');
    const reportFilter = ref('');

    const formatDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '-';
      return dt.toLocaleString('vi-VN');
    };

    const formatReportStatus = (s) => {
      const v = String(s || '');
      if (v === 'PENDING') return 'Chờ xử lý';
      if (v === 'RESOLVED') return 'Đã xử lý';
      if (v === 'REJECTED') return 'Từ chối';
      if (v === 'REVIEWED') return 'Đã xem';
      return v || '-';
    };

    const fetchComments = async () => {
      const res = await adminService.getAllComments();
      comments.value = res.data?.data || [];
    };

    const fetchReports = async () => {
      const res = await adminService.getAllReports();
      reports.value = res.data?.data || [];
    };

    const refreshAll = async () => {
      loading.value = true;
      try {
        await Promise.all([fetchComments(), fetchReports()]);
      } catch (e) {
        alert(e?.response?.data?.message || 'Không tải được dữ liệu cộng đồng.');
      } finally {
        loading.value = false;
      }
    };

    const filteredComments = computed(() => {
      const qq = String(commentQ.value || '').trim().toLowerCase();
      const f = String(commentFilter.value || '').trim();
      return (comments.value || [])
        .filter((c) => {
          if (f === 'visible') return !c.isHidden;
          if (f === 'hidden') return !!c.isHidden;
          return true;
        })
        .filter((c) => {
          if (!qq) return true;
          const t = `${c.content || ''} ${c.user?.fullName || ''} ${c.post?.title || ''}`.toLowerCase();
          return t.includes(qq);
        });
    });

    const filteredReports = computed(() => {
      const qq = String(reportQ.value || '').trim().toLowerCase();
      const f = String(reportFilter.value || '').trim();
      return (reports.value || [])
        .filter((r) => (f ? String(r.status) === f : true))
        .filter((r) => {
          if (!qq) return true;
          const t = `${r.reason || ''} ${r.reporter?.fullName || ''} ${r.reporter?.email || ''}`.toLowerCase();
          return t.includes(qq);
        });
    });

    const toggleComment = async (c) => {
      const next = !c.isHidden;
      if (!confirm(`Bạn có chắc muốn ${next ? 'ẩn' : 'hiện'} comment này?`)) return;
      loading.value = true;
      try {
        await adminService.updateCommentHidden(c.id, next);
        await fetchComments();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không cập nhật được comment.');
      } finally {
        loading.value = false;
      }
    };

    const deleteComment = async (c) => {
      if (!confirm('Xóa comment này?')) return;
      loading.value = true;
      try {
        await adminService.deleteComment(c.id);
        await fetchComments();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không xóa được comment.');
      } finally {
        loading.value = false;
      }
    };

    const handleReport = async (r, status) => {
      if (!confirm(`Xác nhận xử lý report: ${formatReportStatus(status)}?`)) return;
      loading.value = true;
      try {
        await adminService.handleReport(r.id, status);
        await fetchReports();
      } catch (e) {
        alert(e?.response?.data?.message || 'Không xử lý được report.');
      } finally {
        loading.value = false;
      }
    };

    onMounted(refreshAll);

    return {
      loading,
      activeTab,
      comments,
      reports,
      commentQ,
      commentFilter,
      reportQ,
      reportFilter,
      refreshAll,
      filteredComments,
      filteredReports,
      toggleComment,
      deleteComment,
      handleReport,
      formatDate,
      formatReportStatus,
    };
  },
};
</script>

<style scoped>
.page-header { margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 800; color: var(--text-primary); }
.title-icon { color: var(--accent); }
.page-subtitle { margin-top: 6px; font-size: 12px; color: var(--text-muted); }

.card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }

.tabs { display: flex; gap: 6px; padding: 12px 12px 0; }
.tab-btn { border: 1px solid var(--border); background: transparent; color: var(--text-secondary); height: 34px; padding: 0 12px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 800; }
.tab-btn.active { background: var(--bg-tertiary); color: var(--text-primary); }

.pane { padding: 12px; }
.toolbar { padding: 0 0 12px; display: flex; align-items: center; gap: 12px; }
.select { height: 36px; border-radius: 10px; background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary); padding: 0 12px; font-size: 12px; }
.search-input { display: flex; align-items: center; gap: 10px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; height: 36px; width: 360px; max-width: 56vw; }
.search-input input { background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 12px; width: 100%; }
.ml-auto { margin-left: auto; }

.table-responsive { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 12px; font-size: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); color: var(--text-secondary); vertical-align: top; }
th { font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); }
.text-right { text-align: right; }

.w-45 { width: 45%; }
.comment-content, .report-reason { color: var(--text-primary); font-weight: 650; white-space: pre-wrap; }
.muted { color: var(--text-muted); font-size: 11px; margin-top: 2px; }

.status { font-size: 11px; font-weight: 800; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(148, 163, 184, 0.18); display: inline-flex; }
.status.active { color: var(--green); background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.25); }
.status.hidden { color: var(--orange); background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.25); }
.status.pending { color: var(--orange); background: rgba(249,115,22,0.08); border-color: rgba(249,115,22,0.25); }
.status.resolved { color: var(--green); background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.25); }
.status.rejected { color: #ef4444; background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); }

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

