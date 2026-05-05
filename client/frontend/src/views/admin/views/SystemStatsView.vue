<template>
  <div class="page">
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <BarChart3 :size="24" class="title-icon" />
          Thống kê hệ thống
        </div>
        <div class="page-subtitle">Dashboard tổng quan theo kỳ, có thể xuất PDF/Excel.</div>
      </div>
      
      <div class="header-actions">
        <div class="date-picker-group">
          <CalendarDays :size="16" />
          <select v-model="preset" class="range-select" @change="onPresetChange">
            <option value="last_week">Tuần trước</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="custom">Tùy chọn ngày</option>
          </select>
        </div>

        <div v-if="preset === 'custom'" class="date-range">
          <input type="date" v-model="startDate" class="date-input" />
          <span class="date-sep">—</span>
          <input type="date" v-model="endDate" class="date-input" />
        </div>

        <button class="btn-secondary" :disabled="loading" @click="exportExcel">
          <Download :size="14" /> Excel
        </button>
        <button class="btn-secondary" :disabled="loading" @click="exportPdf">
          <FileText :size="14" /> PDF
        </button>
        <button class="btn-refresh" @click="fetchDashboard">
          <RefreshCw :size="14" :class="{spinning: loading}" /> Làm mới
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="s-label">Người dùng mới</div>
        <div class="s-value">{{ dashboard.users.newUsers }}</div>
        <div class="s-sub">Theo kỳ đang lọc</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Lượt truy cập</div>
        <div class="s-value">{{ dashboard.visits.totalVisits }}</div>
        <div class="s-sub">Theo kỳ đang lọc</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Sân hoạt động</div>
        <div class="s-value">{{ dashboard.courts.activeCourts }}</div>
        <div class="s-sub">Tổng sân ACTIVE</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Tỷ lệ lấp đầy TB</div>
        <div class="s-value">{{ formatPercent(dashboard.courts.avgFillRate) }}</div>
        <div class="s-sub">{{ dashboard.courts.bookedSlots }} / {{ dashboard.courts.totalSlots }} slots</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Tổng doanh thu</div>
        <div class="s-value">{{ formatCurrency(dashboard.revenue.totalRevenue) }}</div>
        <div class="s-sub">{{ dashboard.revenue.totalBookings }} đơn CONFIRMED</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Hoa hồng nền tảng</div>
        <div class="s-value">{{ formatCurrency(dashboard.revenue.platformCommission) }}</div>
        <div class="s-sub">Rate: {{ Math.round(dashboard.revenue.commissionRate * 100) }}%</div>
      </div>
    </div>

    <div class="note">
      Dữ liệu export PDF/Excel sẽ lấy theo bộ lọc hiện tại.
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { BarChart3, CalendarDays, RefreshCw, Download, FileText } from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';

export default {
  name: 'SystemStatsView',
  components: { BarChart3, CalendarDays, RefreshCw, Download, FileText },
  setup() {
    const loading = ref(false);
    const preset = ref('this_month');
    const startDate = ref('');
    const endDate = ref('');

    const dashboard = ref({
      users: { newUsers: 0 },
      visits: { totalVisits: 0 },
      courts: { activeCourts: 0, totalSlots: 0, bookedSlots: 0, avgFillRate: 0 },
      revenue: { totalRevenue: 0, totalBookings: 0, platformCommission: 0, commissionRate: 0.1 },
    });

    const fetchDashboard = async () => {
      loading.value = true;
      try {
        const params = {};
        if (preset.value && preset.value !== 'custom') params.preset = preset.value;
        if (preset.value === 'custom') {
          if (startDate.value) params.startDate = startDate.value;
          if (endDate.value) params.endDate = endDate.value;
        }

        const res = await adminService.getStatsDashboard(params);
        dashboard.value = res.data?.data || dashboard.value;
      } catch (e) {
        alert(e?.response?.data?.message || 'Không tải được dashboard thống kê.');
      } finally {
        loading.value = false;
      }
    };

    const onPresetChange = () => {
      if (preset.value !== 'custom') {
        startDate.value = '';
        endDate.value = '';
        fetchDashboard();
      }
    };

    const formatCurrency = (v) =>
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));
    const formatPercent = (v) => `${Math.round(Number(v || 0) * 100)}%`;

    const exportExcel = async () => {
      const rows = [
        ['Kỳ lọc', preset.value === 'custom' ? `${startDate.value || '-'} → ${endDate.value || '-'}` : preset.value],
        ['Người dùng mới', dashboard.value.users.newUsers],
        ['Lượt truy cập', dashboard.value.visits.totalVisits],
        ['Sân hoạt động', dashboard.value.courts.activeCourts],
        ['Tỷ lệ lấp đầy TB', formatPercent(dashboard.value.courts.avgFillRate)],
        ['Tổng doanh thu', dashboard.value.revenue.totalRevenue],
        ['Hoa hồng nền tảng', dashboard.value.revenue.platformCommission],
      ];

      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
      XLSX.writeFile(wb, `admin-stats-${Date.now()}.xlsx`);
    };

    const exportPdf = async () => {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Dashboard Thống kê hệ thống', 14, 16);
      doc.setFontSize(10);
      const lines = [
        `Kỳ lọc: ${preset.value === 'custom' ? `${startDate.value || '-'} → ${endDate.value || '-'}` : preset.value}`,
        `Người dùng mới: ${dashboard.value.users.newUsers}`,
        `Lượt truy cập: ${dashboard.value.visits.totalVisits}`,
        `Sân hoạt động: ${dashboard.value.courts.activeCourts}`,
        `Tỷ lệ lấp đầy TB: ${formatPercent(dashboard.value.courts.avgFillRate)} (${dashboard.value.courts.bookedSlots}/${dashboard.value.courts.totalSlots} slots)`,
        `Tổng doanh thu: ${formatCurrency(dashboard.value.revenue.totalRevenue)}`,
        `Hoa hồng nền tảng: ${formatCurrency(dashboard.value.revenue.platformCommission)} (${Math.round(dashboard.value.revenue.commissionRate * 100)}%)`,
      ];
      let y = 26;
      for (const l of lines) {
        doc.text(l, 14, y);
        y += 7;
      }
      doc.save(`admin-stats-${Date.now()}.pdf`);
    };

    onMounted(fetchDashboard);

    return {
      loading,
      preset,
      startDate,
      endDate,
      dashboard,
      fetchDashboard,
      onPresetChange,
      exportExcel,
      exportPdf,
      formatCurrency,
      formatPercent,
    };
  }
}
</script>

<style scoped>
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
.title-icon { color: var(--accent); }

.date-picker-group { display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; padding: 0 12px; height: 36px; color: var(--text-muted); }
.range-select { background: transparent; border: none; outline: none; font-size: 13px; font-weight: 600; color: var(--text-primary); cursor: pointer; }

.date-range { display: flex; align-items: center; gap: 8px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; padding: 0 10px; height: 36px; }
.date-input { background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 12px; }
.date-sep { color: var(--text-muted); font-size: 12px; }

.btn-refresh { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 0 12px; height: 36px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.btn-refresh:hover { background: var(--bg-hover); color: var(--accent); border-color: var(--accent); }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.btn-secondary { display: flex; align-items: center; gap: 8px; background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 0 12px; height: 36px; font-size: 13px; font-weight: 700; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px; }
.s-label { font-size: 11px; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.s-value { margin-top: 8px; font-size: 22px; color: var(--text-primary); font-weight: 900; }
.s-sub { margin-top: 6px; font-size: 12px; color: var(--text-muted); }

.note { margin-top: 14px; font-size: 12px; color: var(--text-muted); }
</style>
