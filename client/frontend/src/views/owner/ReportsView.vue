<template>
  <div class="reports-view">
    <div class="view-header">
      <div class="header-info">
        <h1 class="view-title">Khiếu nại / Góp ý</h1>
        <p class="view-subtitle">
          Theo dõi trạng thái xử lý và phản hồi từ hệ thống.
        </p>
      </div>
      <div class="header-actions">
        <select v-model="status" class="filter-select" @change="fetchReports">
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="REVIEWED">Đã xem</option>
          <option value="RESOLVED">Đã xử lý</option>
          <option value="REJECTED">Từ chối</option>
        </select>

        <button class="btn-primary" :disabled="loading" @click="openCreate">
          <span class="material-icons">add</span>
          Tạo khiếu nại
        </button>
        <button class="icon-btn" :disabled="loading" @click="fetchReports" title="Làm mới">
          <span class="material-icons" :class="{ spinning: loading }">refresh</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !reports.length" class="loading-hint">Đang tải dữ liệu...</div>

    <div v-else class="card table-card">
      <table class="table">
        <thead>
          <tr>
            <th>Lý do</th>
            <th>Trạng thái</th>
            <th>Ngày gửi</th>
            <th class="text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td>
              <div class="reason clickable" @click="openDetail(r)">{{ r.reason }}</div>
              <div class="muted">{{ shortText(r.content) }}</div>
            </td>
            <td>
              <span class="status" :class="String(r.status || '').toLowerCase()">
                {{ formatStatus(r.status) }}
              </span>
            </td>
            <td>{{ formatDate(r.createdAt) }}</td>
            <td class="text-right">
              <button class="row-btn" @click="openDetail(r)" title="Xem chi tiết">
                <span class="material-icons">visibility</span>
              </button>
            </td>
          </tr>
          <tr v-if="!loading && reports.length === 0">
            <td colspan="4" class="empty">Chưa có khiếu nại/góp ý nào.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="modal-overlay" @click.self="selected = null">
      <div class="modal-content glass-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="material-icons title-icon">report</span>
            <h3>Chi tiết khiếu nại</h3>
          </div>
          <button class="close-modal" @click="selected = null"><span class="material-icons">close</span></button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <label class="detail-label">Loại / Lý do</label>
            <div class="detail-box">{{ selected.reason }}</div>
          </div>
          <div class="detail-section mt-4" v-if="selected.content">
            <label class="detail-label">Nội dung</label>
            <div class="detail-box">{{ selected.content }}</div>
          </div>
          <div class="detail-grid mt-4">
            <div class="meta-item">
              <label class="detail-label">Trạng thái</label>
              <div class="meta-value">
                <span class="status" :class="String(selected.status || '').toLowerCase()">
                  {{ formatStatus(selected.status) }}
                </span>
              </div>
            </div>
            <div class="meta-item">
              <label class="detail-label">Ngày gửi</label>
              <div class="meta-value">{{ formatDate(selected.createdAt) }}</div>
            </div>
          </div>

          <div class="detail-section mt-4" v-if="selected.adminResponse">
            <label class="detail-label">Phản hồi từ hệ thống</label>
            <div class="detail-box response">{{ selected.adminResponse }}</div>
          </div>
          <div class="detail-section mt-4" v-else>
            <label class="detail-label">Phản hồi từ hệ thống</label>
            <div class="detail-box muted-box">Chưa có phản hồi.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="selected = null">Đóng</button>
        </div>
      </div>
    </div>

    <!-- Create modal (reuse existing report modal) -->
    <ReportModal :is-open="createOpen" @close="createOpen = false" @success="onCreated" />
  </div>
</template>

<script>
import ReportModal from '@/components/common/ReportModal.vue';
import { ownerReportService } from '@/services/ownerFinance.service';

export default {
  name: 'OwnerReportsView',
  components: { ReportModal },
  data() {
    return {
      loading: false,
      status: '',
      reports: [],
      selected: null,
      createOpen: false,
    };
  },
  mounted() {
    this.fetchReports();
  },
  methods: {
    openCreate() {
      this.createOpen = true;
    },
    async onCreated() {
      this.createOpen = false;
      await this.fetchReports();
    },
    shortText(t) {
      const s = String(t || '').trim();
      if (!s) return '';
      return s.length > 80 ? s.slice(0, 80) + '…' : s;
    },
    formatDate(d) {
      if (!d) return '-';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return '-';
      return dt.toLocaleString('vi-VN');
    },
    formatStatus(s) {
      const v = String(s || '');
      if (v === 'PENDING') return 'Chờ xử lý';
      if (v === 'REVIEWED') return 'Đã xem';
      if (v === 'RESOLVED') return 'Đã xử lý';
      if (v === 'REJECTED') return 'Từ chối';
      return v || '-';
    },
    openDetail(r) {
      this.selected = r;
    },
    async fetchReports() {
      this.loading = true;
      try {
        const res = await ownerReportService.getMyReports(this.status ? { status: this.status } : {});
        this.reports = res.data?.data || [];
      } catch (e) {
        alert(e?.response?.data?.message || 'Không tải được danh sách khiếu nại.');
      } finally {
        this.loading = false;
      }
    },
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

.reports-view { display: flex; flex-direction: column; gap: 18px; }
.view-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.view-title { font-size: 28px; font-weight: 800; margin: 0; color: #0f1623; }
.view-subtitle { margin: 6px 0 0; color: #64748b; font-size: 14px; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-select { border: 1px solid #eaecf2; border-radius: 10px; padding: 9px 10px; font-weight: 700; background: #fff; color: #1e293b; }

.btn-primary { background: #16a34a; color: #fff; border: none; border-radius: 10px; height: 40px; padding: 0 14px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { border: 1px solid #eaecf2; background: #fff; border-radius: 10px; height: 40px; padding: 0 14px; font-weight: 800; cursor: pointer; }
.icon-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #eaecf2; background: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.spinning { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.card { background: #fff; border: 1px solid #eaecf2; border-radius: 18px; padding: 0; overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px 16px; font-size: 13px; border-bottom: 1px solid rgba(148,163,184,0.18); color: #334155; vertical-align: top; }
th { font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; }
.text-right { text-align: right; }
.reason { font-weight: 800; color: #0f1623; }
.clickable { cursor: pointer; }
.muted { color: #64748b; font-size: 12px; margin-top: 4px; }
.empty { padding: 22px; text-align: center; color: #94a3b8; }
.row-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #eaecf2; background: #fff; cursor: pointer; color: #334155; }
.row-btn:hover { background: #f8fafc; }

.status { font-size: 11px; font-weight: 900; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(148,163,184,0.22); display: inline-flex; }
.status.pending { background: rgba(245,158,11,0.1); color: #b45309; border-color: rgba(245,158,11,0.25); }
.status.reviewed { background: rgba(59,130,246,0.1); color: #2563eb; border-color: rgba(59,130,246,0.25); }
.status.resolved { background: rgba(34,197,94,0.1); color: #16a34a; border-color: rgba(34,197,94,0.25); }
.status.rejected { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.25); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.glass-modal { background: #fff; border: 1px solid #eaecf2; border-radius: 16px; width: 640px; max-width: 92vw; box-shadow: 0 20px 40px rgba(0,0,0,0.35); overflow: hidden; display: flex; flex-direction: column; }
.modal-header { padding: 14px 18px; border-bottom: 1px solid #eaecf2; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.modal-title-row { display: flex; align-items: center; gap: 10px; }
.modal-title-row h3 { margin: 0; font-size: 16px; font-weight: 900; color: #0f1623; }
.title-icon { color: #16a34a; }
.close-modal { border: none; background: transparent; cursor: pointer; color: #64748b; width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
.close-modal:hover { background: #e2e8f0; color: #0f1623; }
.modal-body { padding: 18px; overflow: auto; max-height: 70vh; }
.modal-footer { padding: 14px 18px; border-top: 1px solid #eaecf2; background: #f8fafc; display: flex; justify-content: flex-end; }
.detail-section { display: flex; flex-direction: column; gap: 8px; }
.detail-label { font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.detail-box { background: #f8fafc; border: 1px solid #eaecf2; border-radius: 12px; padding: 12px; color: #0f1623; white-space: pre-wrap; }
.detail-box.response { border-left: 4px solid #16a34a; }
.muted-box { color: #94a3b8; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.meta-item .meta-value { font-weight: 800; color: #0f1623; }
.mt-4 { margin-top: 16px; }

@media (max-width: 640px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>

