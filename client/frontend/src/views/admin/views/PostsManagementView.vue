<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <FileText :size="22" class="title-icon" />
          Quản lý Bài đăng
        </div>
        <div class="page-subtitle">Xem chi tiết, ẩn/hiện/xóa mềm các bài đăng của chủ sân.</div>
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
                <div class="title-cell clickable" @click="openDetail(p)">
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
                    class="row-btn info-hover"
                    title="Xem chi tiết"
                    @click="openDetail(p)"
                  >
                    <ExternalLink :size="14" />
                  </button>
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

    <!-- ═══════════════ DETAIL MODAL ═══════════════ -->
    <div v-if="detailPost" class="modal-overlay" @click.self="detailPost = null">
      <div class="modal-content glass-modal wide" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <FileText :size="18" class="modal-title-icon" />
            <h3>Chi tiết bài đăng</h3>
          </div>
          <button class="close-modal" @click="detailPost = null"><X :size="18" /></button>
        </div>

        <div class="modal-body custom-scrollbar">
          <!-- Post Image -->
          <div v-if="detailPost.imageUrl" class="detail-image-wrapper">
            <img :src="detailPost.imageUrl" :alt="detailPost.title" class="detail-image" />
          </div>

          <!-- Title & Status -->
          <div class="detail-title-row">
            <h2 class="detail-title">{{ detailPost.title }}</h2>
            <span class="status" :class="String(detailPost.status || '').toLowerCase()">
              {{ formatStatus(detailPost.status) }}
            </span>
          </div>

          <!-- Meta Grid -->
          <div class="detail-meta-grid">
            <div class="meta-item">
              <div class="meta-label">Câu lạc bộ</div>
              <div class="meta-value">{{ detailPost.club?.name || '-' }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Loại bài đăng</div>
              <div class="meta-value"><span class="tag">{{ formatType(detailPost.type) }}</span></div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Slug</div>
              <div class="meta-value mono">#{{ detailPost.slug || '-' }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Lượt xem</div>
              <div class="meta-value">
                <BarChart3 :size="13" style="opacity:.5" />
                {{ (detailPost.viewCount || 0).toLocaleString('vi-VN') }}
              </div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Ngày tạo</div>
              <div class="meta-value">{{ formatDate(detailPost.createdAt) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Cập nhật lần cuối</div>
              <div class="meta-value">{{ formatDate(detailPost.updatedAt) }}</div>
            </div>
            <div class="meta-item" v-if="detailPost.expiresAt">
              <div class="meta-label">Hết hạn</div>
              <div class="meta-value text-orange">{{ formatDate(detailPost.expiresAt) }}</div>
            </div>
            <div class="meta-item" v-if="detailPost.linkedDate">
              <div class="meta-label">Ngày liên kết</div>
              <div class="meta-value">{{ formatDate(detailPost.linkedDate) }}</div>
            </div>
            <div class="meta-item" v-if="detailPost.comments">
              <div class="meta-label">Bình luận</div>
              <div class="meta-value">{{ detailPost.comments?.length || 0 }} bình luận</div>
            </div>
          </div>

          <!-- Content -->
          <div class="detail-section">
            <div class="detail-section-label">Nội dung bài đăng</div>
            <div class="detail-content-body">{{ detailPost.content || '(Không có nội dung)' }}</div>
          </div>

          <!-- Comments Preview -->
          <div v-if="detailPost.comments && detailPost.comments.length > 0" class="detail-section">
            <div class="detail-section-label">Bình luận ({{ detailPost.comments.length }})</div>
            <div class="comments-list">
              <div v-for="c in detailPost.comments.slice(0, 5)" :key="c.id" class="comment-item">
                <div class="comment-avatar">{{ (c.user?.fullName || '?')[0] }}</div>
                <div class="comment-body">
                  <div class="comment-author">
                    {{ c.user?.fullName || 'Ẩn danh' }}
                    <span class="comment-time">{{ formatDate(c.createdAt) }}</span>
                    <span v-if="c.isHidden" class="status hidden" style="font-size:10px; padding:2px 6px; margin-left:6px;">Đã ẩn</span>
                  </div>
                  <div class="comment-text">{{ c.content }}</div>
                </div>
              </div>
              <div v-if="detailPost.comments.length > 5" class="more-comments">
                ...và {{ detailPost.comments.length - 5 }} bình luận khác
              </div>
            </div>
          </div>

          <!-- ID for debugging -->
          <div class="detail-id">ID: {{ detailPost.id }}</div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="detailPost = null">Đóng</button>
          <button
            v-if="detailPost.status === 'PENDING'"
            class="btn-success"
            :disabled="loading"
            @click="approve(detailPost); detailPost = null;"
          >
            <Check :size="14" /> Duyệt bài
          </button>
          <button
            v-if="detailPost.status === 'PENDING'"
            class="btn-danger"
            :disabled="loading"
            @click="reject(detailPost); detailPost = null;"
          >
            <X :size="14" /> Từ chối
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { FileText, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X, ExternalLink, BarChart3 } from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';

export default {
  name: 'PostsManagementView',
  components: { FileText, RefreshCw, Search, EyeOff, Eye, Trash2, Check, X, ExternalLink, BarChart3 },
  setup() {
    const loading = ref(false);
    const posts = ref([]);
    const q = ref('');
    const statusFilter = ref('');
    const detailPost = ref(null);

    const openDetail = (p) => {
      detailPost.value = p;
    };

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
      detailPost,
      openDetail,
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
.title-cell.clickable { cursor: pointer; }
.title-cell.clickable:hover .p-title { color: var(--accent); }
.p-title { color: var(--text-primary); font-weight: 750; transition: color 0.15s; }
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
.info-hover:hover { border-color: rgba(79, 110, 247, 0.4); color: var(--accent); background: rgba(79,110,247,0.08); }

.empty { padding: 18px; text-align: center; color: var(--text-muted); }
.loading-row { padding: 12px 16px; font-size: 12px; color: var(--text-muted); }

.btn-secondary { height: 36px; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text-primary); padding: 0 12px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; font-weight: 700; }
.btn-secondary:hover { background: var(--bg-tertiary); }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

/* ═══ MODAL ═══ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: fadeIn .2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.glass-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.3);
  max-height: 88vh;
  display: flex; flex-direction: column;
  animation: slideUp .25s ease;
}
.glass-modal.wide { width: 680px; max-width: 95vw; }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  padding: 18px 24px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-tertiary); border-radius: 16px 16px 0 0;
}
.modal-title-row { display: flex; align-items: center; gap: 10px; }
.modal-title-row h3 { font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0; }
.modal-title-icon { color: var(--accent); }
.close-modal {
  background: transparent; border: none; color: var(--text-muted); cursor: pointer;
  border-radius: 50%; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.close-modal:hover { background: var(--bg-hover); color: var(--text-primary); }

.modal-body { padding: 24px; overflow-y: auto; flex: 1; }

.modal-footer {
  padding: 16px 24px; background: var(--bg-tertiary); border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; gap: 10px; border-radius: 0 0 16px 16px;
}

/* ═══ DETAIL VIEW ═══ */
.detail-image-wrapper {
  border-radius: 12px; overflow: hidden; margin-bottom: 20px;
  border: 1px solid var(--border); background: var(--bg-tertiary);
  max-height: 280px;
}
.detail-image { width: 100%; height: 100%; max-height: 280px; object-fit: cover; display: block; }

.detail-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.detail-title { font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.4; }

.detail-meta-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  margin-bottom: 20px; padding: 16px; border-radius: 12px;
  background: var(--bg-tertiary); border: 1px solid var(--border);
}
.meta-item { }
.meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; font-weight: 600; }
.meta-value { font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 5px; }
.meta-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.text-orange { color: var(--orange); }

.detail-section { margin-bottom: 20px; }
.detail-section-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-muted); font-weight: 700; margin-bottom: 10px;
  padding-bottom: 6px; border-bottom: 1px solid var(--border);
}
.detail-content-body {
  font-size: 13px; line-height: 1.7; color: var(--text-secondary);
  white-space: pre-wrap; word-break: break-word;
  background: var(--bg-tertiary); padding: 16px; border-radius: 10px;
  border: 1px solid var(--border);
}

/* Comments */
.comments-list { display: flex; flex-direction: column; gap: 10px; }
.comment-item {
  display: flex; gap: 10px; padding: 10px 12px;
  background: var(--bg-tertiary); border-radius: 10px;
  border: 1px solid var(--border);
}
.comment-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 800; flex-shrink: 0;
}
.comment-body { flex: 1; min-width: 0; }
.comment-author { font-size: 12px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.comment-time { font-size: 10px; color: var(--text-muted); font-weight: 400; }
.comment-text { font-size: 12px; color: var(--text-secondary); margin-top: 3px; line-height: 1.5; }
.more-comments { font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px; }

.detail-id { font-size: 10px; color: var(--text-muted); font-family: monospace; margin-top: 8px; }

/* Action buttons in modal footer */
.btn-success {
  height: 36px; border-radius: 10px; border: none;
  background: var(--green); color: #fff; padding: 0 16px;
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer; font-size: 12px; font-weight: 700;
  transition: all 0.2s;
}
.btn-success:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
.btn-success:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-danger {
  height: 36px; border-radius: 10px; border: none;
  background: #ef4444; color: #fff; padding: 0 16px;
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer; font-size: 12px; font-weight: 700;
  transition: all 0.2s;
}
.btn-danger:hover { filter: brightness(1.1); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 640px) {
  .detail-meta-grid { grid-template-columns: repeat(2, 1fr); }
  .glass-modal.wide { width: 100%; }
}
</style>



