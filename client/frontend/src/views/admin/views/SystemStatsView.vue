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
        <div class="s-label">Doanh thu admin</div>
        <div class="s-value">{{ formatCurrency(dashboard.revenue.platformCommission) }}</div>
        <div class="s-sub">Phí nền tảng thu về</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Đơn đặt (tổng)</div>
        <div class="s-value">{{ dashboard.bookings.totalBookings }}</div>
        <div class="s-sub">Số lượt đặt trong kỳ</div>
      </div>
      <div class="summary-card">
        <div class="s-label">Đơn thành công</div>
        <div class="s-value text-green">{{ dashboard.bookings.confirmedBookings }}</div>
        <div class="s-sub">Trạng thái CONFIRMED</div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid mt-6">
      <div class="chart-container main-chart">
        <div class="chart-header">
           <div class="chart-title">Xu hướng đặt sân (6 tháng gần nhất)</div>
           <div class="chart-desc">Số lượng đơn đặt hàng theo từng tháng</div>
        </div>
        <div class="chart-body">
           <Line v-if="lineChartData" :data="lineChartData" :options="lineOptions" />
           <div v-else class="chart-loading">Đang tải dữ liệu...</div>
        </div>
      </div>

      <div class="chart-container side-chart">
        <div class="chart-header">
           <div class="chart-title">Trạng thái đơn đặt</div>
           <div class="chart-desc">Tỷ lệ theo trạng thái trong kỳ</div>
        </div>
        <div class="chart-body">
           <Doughnut v-if="doughnutChartData" :data="doughnutChartData" :options="doughnutOptions" />
           <div v-else class="chart-loading">Đang tải dữ liệu...</div>
        </div>
      </div>
    </div>

    <!-- Secondary Stats -->
    <div class="stats-grid mt-6">
       <div class="stats-card">
          <div class="stats-icon"><Users :size="20" /></div>
          <div class="stats-info">
             <div class="stats-label">Tổng người dùng</div>
             <div class="stats-value">{{ dashboard.users.totalUsers }}</div>
          </div>
       </div>
       <div class="stats-card">
          <div class="stats-icon"><Building2 :size="20" /></div>
          <div class="stats-info">
             <div class="stats-label">Cơ sở hoạt động</div>
             <div class="stats-value">{{ dashboard.clubs.activeClubs }}</div>
          </div>
       </div>
       <div class="stats-card">
          <div class="stats-icon"><ShieldAlert :size="20" /></div>
          <div class="stats-info">
             <div class="stats-label">Vi phạm đang chờ</div>
             <div class="stats-value text-orange">{{ dashboard.moderation.pendingReports }}</div>
          </div>
       </div>
       <div class="stats-card">
          <div class="stats-icon"><CheckCircle2 :size="20" /></div>
          <div class="stats-info">
             <div class="stats-label">Tỷ lệ thành công</div>
             <div class="stats-value">{{ dashboard.payments.successRate }}%</div>
          </div>
       </div>
    </div>

    <div class="note">
      Dữ liệu biểu đồ và thống kê được cập nhật theo thời gian thực từ hệ thống.
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { 
  BarChart3, CalendarDays, RefreshCw, Download, FileText, 
  Users, Building2, ShieldAlert, CheckCircle2 
} from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';
import { Line, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  Title, Tooltip, Legend, LineElement, PointElement, 
  CategoryScale, LinearScale, ArcElement, Filler
);

export default {
  name: 'SystemStatsView',
  components: { 
    BarChart3, CalendarDays, RefreshCw, Download, FileText, 
    Users, Building2, ShieldAlert, CheckCircle2,
    Line, Doughnut
  },
  setup() {
    const loading = ref(false);
    const preset = ref('this_month');
    const startDate = ref('');
    const endDate = ref('');

    const dashboard = ref({
      users: { totalUsers: 0, newUsers: 0, activeUsers: 0 },
      approvals: { pendingClubs: 0, pendingKyc: 0 },
      moderation: { pendingReports: 0 },
      clubs: { activeClubs: 0, totalClubs: 0 },
      bookings: { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0 },
      revenue: { platformCommission: 0, commissionRate: 0.1, totalRevenue: 0, averageBookingValue: 0 },
      finance: { refundAmount: 0, payoutRequests: 0 },
      activity: { activeUsers: 0 },
      courts: { totalCourts: 0, activeCourts: 0 },
      payments: { successRate: 0 },
      charts: { monthly: [], bookingStatus: [] }
    });

    const lineChartData = computed(() => {
      if (!dashboard.value.charts.monthly?.length) return null;
      return {
        labels: dashboard.value.charts.monthly.map(i => i.month),
        datasets: [
          {
            label: 'Số đơn đặt',
            data: dashboard.value.charts.monthly.map(i => i.count),
            borderColor: '#4f6ef7',
            backgroundColor: 'rgba(79, 110, 247, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#4f6ef7',
            pointBorderColor: '#fff',
            pointHoverRadius: 6
          }
        ]
      };
    });

    const doughnutChartData = computed(() => {
      if (!dashboard.value.charts.bookingStatus?.length) return null;
      const statusMap = {
        'CONFIRMED': { label: 'Thành công', color: '#22c55e' },
        'PENDING': { label: 'Chờ xử lý', color: '#f59e0b' },
        'CANCELLED': { label: 'Đã hủy', color: '#ef4444' },
        'COMPLETED': { label: 'Hoàn tất', color: '#3b82f6' }
      };
      
      return {
        labels: dashboard.value.charts.bookingStatus.map(i => statusMap[i.status]?.label || i.status),
        datasets: [
          {
            data: dashboard.value.charts.bookingStatus.map(i => i.count),
            backgroundColor: dashboard.value.charts.bookingStatus.map(i => statusMap[i.status]?.color || '#94a3b8'),
            borderWidth: 0,
            hoverOffset: 10
          }
        ]
      };
    });

    const lineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          padding: 12,
          backgroundColor: '#1e293b',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { font: { size: 11 }, color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#94a3b8' }
        }
      }
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { size: 11, weight: '600' },
            color: '#94a3b8'
          }
        }
      }
    };

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
        console.error(e);
        alert('Không tải được dashboard thống kê.');
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

    const exportExcel = async () => {
      const XLSX = await import('xlsx');
      const rows = [
        ['THỐNG KÊ HỆ THỐNG', new Date().toLocaleString()],
        ['Bộ lọc', preset.value],
        [],
        ['Tổng người dùng', dashboard.value.users.totalUsers],
        ['Người dùng mới', dashboard.value.users.newUsers],
        ['Doanh thu (Hoa hồng)', dashboard.value.revenue.platformCommission],
        ['Tổng đơn đặt', dashboard.value.bookings.totalBookings],
        ['Tỷ lệ thành công', dashboard.value.payments.successRate + '%']
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
      XLSX.writeFile(wb, `Report-Admin-${Date.now()}.xlsx`);
    };

    const exportPdf = async () => {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('BÁO CÁO THỐNG KÊ HỆ THỐNG', 14, 20);
      doc.setFontSize(10);
      doc.text(`Ngày xuất: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Bộ lọc: ${preset.value}`, 14, 37);
      
      const stats = [
        `Tổng người dùng: ${dashboard.value.users.totalUsers}`,
        `Người dùng mới: ${dashboard.value.users.newUsers}`,
        `Doanh thu Admin: ${formatCurrency(dashboard.value.revenue.platformCommission)}`,
        `Tổng đơn đặt: ${dashboard.value.bookings.totalBookings}`,
        `Tỷ lệ thành công: ${dashboard.value.payments.successRate}%`
      ];
      
      let y = 50;
      stats.forEach(s => {
        doc.text(s, 14, y);
        y += 8;
      });
      
      doc.save(`Report-Admin-${Date.now()}.pdf`);
    };

    onMounted(fetchDashboard);

    return {
      loading, preset, startDate, endDate, dashboard,
      fetchDashboard, onPresetChange, formatCurrency,
      exportExcel, exportPdf,
      lineChartData, doughnutChartData, lineOptions, doughnutOptions
    };
  }
}
</script>

<style scoped>
.page-header { margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
.title-icon { color: var(--accent); }

.header-actions { display: flex; gap: 10px; }
.date-picker-group { display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; height: 38px; color: var(--text-muted); }
.range-select { background: transparent; border: none; outline: none; font-size: 13px; font-weight: 700; color: var(--text-primary); cursor: pointer; }

.date-range { display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 0 10px; height: 38px; }
.date-input { background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 12px; }

.btn-refresh { display: flex; align-items: center; gap: 8px; background: var(--accent); border: none; border-radius: 10px; padding: 0 14px; height: 38px; font-size: 13px; font-weight: 700; color: white; cursor: pointer; transition: all 0.2s; }
.btn-refresh:hover { filter: brightness(1.1); }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.btn-secondary { display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 0 14px; height: 38px; font-size: 13px; font-weight: 700; color: var(--text-primary); cursor: pointer; }

.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.summary-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.s-label { font-size: 11px; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.s-value { margin-top: 10px; font-size: 24px; color: var(--text-primary); font-weight: 900; }
.s-sub { margin-top: 6px; font-size: 11px; color: var(--text-muted); }
.text-green { color: var(--green); }
.text-orange { color: var(--orange); }

/* Charts */
.charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.chart-container { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; }
.chart-header { margin-bottom: 20px; }
.chart-title { font-size: 15px; font-weight: 800; color: var(--text-primary); }
.chart-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.chart-body { flex: 1; min-height: 280px; position: relative; }
.chart-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text-muted); }

/* Secondary Stats */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stats-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px; }
.stats-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--accent); }
.stats-label { font-size: 11px; color: var(--text-muted); font-weight: 700; }
.stats-value { font-size: 16px; font-weight: 800; color: var(--text-primary); margin-top: 2px; }

.mt-6 { margin-top: 24px; }
.note { margin-top: 20px; font-size: 12px; color: var(--text-muted); text-align: center; }

@media (max-width: 1200px) {
  .summary-grid, .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
}
</style>

