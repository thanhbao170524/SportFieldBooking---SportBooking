<template>
  <div class="page">
    <div v-if="hasPermission('view_posts') || hasPermission('moderate_posts') || hasPermission('moderate_comments')">
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
            Báo cáo
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
                    <div class="comment-content clickable" @click="openCommentDetail(c)">{{ c.content }}</div>
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
                      <button class="row-btn info-hover" title="Xem chi tiết" @click="openCommentDetail(c)">
                        <Eye :size="14" />
                      </button>
                      <button v-if="hasPermission('moderate_comments')" class="row-btn" :disabled="loading" @click="toggleComment(c)" :title="c.isHidden ? 'Hiện' : 'Ẩn'">
                        <EyeOff v-if="!c.isHidden" :size="14" />
                        <Eye v-else :size="14" />
                      </button>
                      <button v-if="hasPermission('delete_posts')" class="row-btn danger-hover" :disabled="loading" @click="deleteComment(c)" title="Xóa">
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
                    <div class="report-reason clickable" @click="openReportDetail(r)">{{ r.reason }}</div>
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
                      <button class="row-btn info-hover" title="Xem chi tiết" @click="openReportDetail(r)">
                        <Eye :size="14" />
                      </button>
                      <template v-if="hasPermission('moderate_posts')">
                        <button class="row-btn success-hover" :disabled="loading || r.status !== 'PENDING'" @click="handleReport(r, 'RESOLVED')" title="Xử lý xong">
                          <Check :size="14" />
                        </button>
                        <button class="row-btn danger-hover" :disabled="loading || r.status !== 'PENDING'" @click="handleReport(r, 'REJECTED')" title="Từ chối">
                          <X :size="14" />
                        </button>
                      </template>
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

    <!-- Access Denied State -->
    <div v-else class="denied-state">
      <div class="denied-content">
        <div class="lock-icon"><ShieldAlert :size="48" /></div>
        <h3>Truy cập bị từ chối</h3>
        <p>Bạn không có quyền quản lý nội dung cộng đồng. Vui lòng liên hệ Admin tối cao.</p>
        <router-link to="/admin" class="back-home">Quay lại Dashboard</router-link>
      </div>
    </div>

    <!-- ═══════════════ COMMENT DETAIL MODAL ═══════════════ -->
    <div v-if="selectedComment" class="modal-overlay" @click.self="selectedComment = null">
      <div class="modal-content glass-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <MessageSquare :size="18" class="modal-title-icon" />
            <h3>Chi tiết bình luận</h3>
          </div>
          <button class="close-modal" @click="selectedComment = null"><X :size="18" /></button>
        </div>
        <div class="modal-body custom-scrollbar">
          <div class="detail-section">
            <label class="detail-label">Nội dung</label>
            <div class="detail-content-body">{{ selectedComment.content }}</div>
          </div>
          <div class="detail-meta-grid mt-4">
             <div class="meta-item">
                <label class="meta-label">Người viết</label>
                <div class="meta-value">{{ selectedComment.user?.fullName }} ({{ selectedComment.user?.email || 'N/A' }})</div>
             </div>
             <div class="meta-item">
                <label class="meta-label">Bài đăng</label>
                <div class="meta-value">{{ selectedComment.post?.title || '-' }}</div>
             </div>
             <div class="meta-item">
                <label class="meta-label">Ngày tạo</label>
                <div class="meta-value">{{ formatDate(selectedComment.createdAt) }}</div>
             </div>
             <div class="meta-item">
                <label class="meta-label">Trạng thái</label>
                <div class="meta-value">
                   <span class="status" :class="selectedComment.isHidden ? 'hidden' : 'active'">
                    {{ selectedComment.isHidden ? 'Đã ẩn' : 'Hiển thị' }}
                   </span>
                </div>
             </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="selectedComment = null">Đóng</button>
          <button v-if="hasPermission('moderate_comments')" class="btn-warning" @click="toggleComment(selectedComment); selectedComment = null">
            <EyeOff v-if="!selectedComment.isHidden" :size="14" />
            <Eye v-else :size="14" />
            {{ selectedComment.isHidden ? 'Hiện bình luận' : 'Ẩn bình luận' }}
          </button>
          <button v-if="hasPermission('delete_posts')" class="btn-danger" @click="deleteComment(selectedComment); selectedComment = null">
            <Trash2 :size="14" /> Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ REPORT DETAIL MODAL ═══════════════ -->
    <div v-if="selectedReport" class="modal-overlay" @click.self="selectedReport = null">
      <div class="modal-content glass-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <ShieldAlert :size="18" class="modal-title-icon" />
            <h3>Chi tiết báo cáo / Góp ý</h3>
          </div>
          <button class="close-modal" @click="selectedReport = null"><X :size="18" /></button>
        </div>
        <div class="modal-body custom-scrollbar">
          <div class="detail-section">
            <label class="detail-label">Loại báo cáo / Lý do</label>
            <div class="detail-content-body text-red">{{ selectedReport.reason }}</div>
          </div>
          
          <div v-if="selectedReport.content" class="detail-section mt-4">
            <label class="detail-label">Nội dung chi tiết</label>
            <div class="detail-content-body">{{ selectedReport.content }}</div>
          </div>

          <div class="detail-meta-grid mt-4">
             <div class="meta-item">
                <label class="meta-label">Người báo cáo</label>
                <div class="meta-value">{{ selectedReport.reporter?.fullName }} ({{ selectedReport.reporter?.role }})</div>
             </div>
             <div class="meta-item">
                <label class="meta-label">Đối tượng</label>
                <div class="meta-value">{{ selectedReport.targetType }} {{ selectedReport.targetId ? `(ID: ${selectedReport.targetId})` : '' }}</div>
             </div>
             <div class="meta-item">
                <label class="meta-label">Ngày báo cáo</label>
                <div class="meta-value">{{ formatDate(selectedReport.createdAt) }}</div>
             </div>
             <div class="meta-item">
                <label class="meta-label">Trạng thái</label>
                <div class="meta-value">
                   <span class="status" :class="String(selectedReport.status || '').toLowerCase()">
                    {{ formatReportStatus(selectedReport.status) }}
                   </span>
                </div>
             </div>
          </div>

          <!-- Admin Response Section -->
          <div v-if="selectedReport.status === 'PENDING'" class="admin-response-section mt-6">
            <label class="detail-label">Phản hồi của Admin</label>
            <textarea 
              v-model="adminResponseText" 
              class="form-textarea" 
              placeholder="Nhập nội dung phản hồi cho người báo cáo..."
              rows="3"
            ></textarea>
          </div>
          <div v-else-if="selectedReport.adminResponse" class="admin-response-section mt-6">
            <label class="detail-label">Admin đã phản hồi</label>
            <div class="detail-content-body response-box">{{ selectedReport.adminResponse }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="selectedReport = null">Đóng</button>
          <template v-if="selectedReport.status === 'PENDING' && hasPermission('moderate_posts')">
            <button class="btn-success" :disabled="loading" @click="handleReport(selectedReport, 'RESOLVED')">
              <Check :size="14" /> Duyệt & Gửi thông báo
            </button>
            <button class="btn-danger-outline" :disabled="loading" @click="handleReport(selectedReport, 'REJECTED')">
              <X :size="14" /> Từ chối
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- ═══════════════ CONFIRM ACTION MODAL ═══════════════ -->
    <div v-if="confirmAction" class="modal-overlay" @click.self="confirmAction = null">
      <div class="modal-content glass-modal confirm-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <ShieldAlert :size="18" class="modal-title-icon" />
            <h3>Xác nhận thao tác</h3>
          </div>
          <button class="close-modal" @click="confirmAction = null"><X :size="18" /></button>
        </div>
        <div class="modal-body custom-scrollbar">
          <div class="detail-section">
            <label class="detail-label">Bạn có chắc chắn?</label>
            <div class="detail-content-body">
              {{ confirmAction.type === 'HANDLE_REPORT'
                ? (confirmAction.status === 'RESOLVED'
                    ? 'Duyệt báo cáo này và gửi thông báo cho người dùng.'
                    : 'Từ chối báo cáo này.')
                : (confirmAction.type === 'TOGGLE_COMMENT'
                    ? `Bạn có chắc muốn ${confirmAction.next ? 'ẩn' : 'hiện'} comment này?`
                    : 'Xóa comment này?') }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" :disabled="loading" @click="confirmAction = null">Hủy</button>
          <button
            v-if="confirmAction.type === 'HANDLE_REPORT' && confirmAction.status === 'RESOLVED'"
            class="btn-success"
            :disabled="loading"
            @click="confirmAndExecute()"
          >
            <Check :size="14" /> Xác nhận duyệt
          </button>
          <button
            v-else
            class="btn-danger-outline"
            :disabled="loading"
            @click="confirmAndExecute()"
          >
            <X :size="14" /> Xác nhận
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { MessageSquare, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X, ShieldAlert } from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';

export default {
  name: 'CommunityManagementView',
  components: { MessageSquare, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X, ShieldAlert },
  setup() {
    const loading = ref(false);
    const activeTab = ref('comments');

    const comments = ref([]);
    const reports = ref([]);
    const currentUser = ref(null);

    const hasPermission = (permissionKey) => {
      if (currentUser.value?.role === 'ADMIN') return true;
      return !!currentUser.value?.permissions?.[permissionKey];
    };

    const commentQ = ref('');
    const commentFilter = ref('');

    const reportQ = ref('');
    const reportFilter = ref('');

    const selectedComment = ref(null);
    const selectedReport = ref(null);
    const adminResponseText = ref('');
    const confirmAction = ref(null); // { type, ...payload }

    const openCommentDetail = (c) => {
      selectedComment.value = c;
    };

    const openReportDetail = (r) => {
      selectedReport.value = r;
      adminResponseText.value = '';
    };

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
      confirmAction.value = { type: 'TOGGLE_COMMENT', comment: c, next };
    };

    const doToggleComment = async (c, next) => {
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
      confirmAction.value = { type: 'DELETE_COMMENT', comment: c };
    };

    const doDeleteComment = async (c) => {
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
      confirmAction.value = { type: 'HANDLE_REPORT', report: r, status };
    };

    const doHandleReport = async (r, status) => {
      loading.value = true;
      try {
        await adminService.handleReport(r.id, status, adminResponseText.value);
        adminResponseText.value = '';
        await fetchReports();
        selectedReport.value = null;
      } catch (e) {
        alert(e?.response?.data?.message || 'Không xử lý được report.');
      } finally {
        loading.value = false;
      }
    };

    const confirmAndExecute = async () => {
      const action = confirmAction.value;
      if (!action) return;
      confirmAction.value = null;

      if (action.type === 'HANDLE_REPORT') return await doHandleReport(action.report, action.status);
      if (action.type === 'TOGGLE_COMMENT') return await doToggleComment(action.comment, action.next);
      if (action.type === 'DELETE_COMMENT') return await doDeleteComment(action.comment);
    };

    onMounted(() => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) currentUser.value = JSON.parse(stored);
      } catch (e) {
        console.error("Error loading user for permissions:", e);
      }
      refreshAll();
    });

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
      confirmAction,
      confirmAndExecute,
      formatDate,
      formatReportStatus,
      selectedComment,
      selectedReport,
      adminResponseText,
      openCommentDetail,
      openReportDetail,
      hasPermission
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
.comment-content, .report-reason { color: var(--text-primary); font-weight: 650; white-space: pre-wrap; transition: color 0.2s; }
.comment-content.clickable, .report-reason.clickable { cursor: pointer; }
.comment-content.clickable:hover, .report-reason.clickable:hover { color: var(--accent); }
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
.info-hover:hover { border-color: rgba(79, 110, 247, 0.4); color: var(--accent); background: rgba(79,110,247,0.08); }

.empty { padding: 18px; text-align: center; color: var(--text-muted); }
.loading-row { padding: 12px 16px; font-size: 12px; color: var(--text-muted); }

.btn-secondary { height: 36px; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text-primary); padding: 0 12px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.btn-secondary:hover { background: var(--bg-tertiary); }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.glass-modal { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 16px; width: 600px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.4); overflow: hidden; display: flex; flex-direction: column; }
.modal-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); }
.modal-title-row { display: flex; align-items: center; gap: 10px; }
.modal-title-row h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary); }
.modal-title-icon { color: var(--accent); }
.close-modal { background: transparent; border: none; color: var(--text-muted); cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.close-modal:hover { background: var(--bg-hover); color: var(--text-primary); }

.modal-body { padding: 24px; overflow-y: auto; max-height: 70vh; }
.detail-section { margin-bottom: 20px; }
.detail-label { display: block; font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
.detail-content-body { background: var(--bg-tertiary); padding: 16px; border-radius: 12px; border: 1px solid var(--border); font-size: 14px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.detail-value { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.text-lg { font-size: 15px; }
.text-red { color: #ef4444; }

.modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; background: var(--bg-tertiary); }
.btn-success { background: var(--green); color: white; border: none; padding: 0 16px; height: 38px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 0 16px; height: 38px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-danger-outline { background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 0 16px; height: 38px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-warning { background: var(--orange); color: white; border: none; padding: 0 16px; height: 38px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; }

.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.admin-response-section { border-top: 1px dashed var(--border); padding-top: 16px; }
.form-textarea { width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 12px; padding: 12px; color: var(--text-primary); font-size: 13px; outline: none; transition: border-color 0.2s; resize: vertical; }
.form-textarea:focus { border-color: var(--accent); }
.response-box { border-left: 4px solid var(--accent); background: rgba(79, 110, 247, 0.05); }

.confirm-modal { width: 520px; max-width: 92vw; }
</style>
