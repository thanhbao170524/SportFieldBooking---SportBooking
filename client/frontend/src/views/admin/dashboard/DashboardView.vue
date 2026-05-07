<template>
  <div class="page stats-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="page-title">
          <BarChart3 :size="22" class="title-icon" />
          Dashboard Thống kê
        </div>
        <div class="page-subtitle">Cập nhật hệ thống: {{ lastUpdated }}</div>
      </div>
      <div class="header-actions">
        <!-- Preset buttons -->
        <div class="preset-group">
          <button
            v-for="p in presets"
            :key="p.id"
            class="preset-btn"
            :class="{ active: preset === p.id }"
            @click="onPresetClick(p.id)"
          >{{ p.label }}</button>
        </div>
        <!-- Custom date range -->
        <div v-if="preset === 'custom'" class="date-range">
          <input id="stats-start-date" type="date" v-model="startDate" class="date-input" @change="fetchDashboard" />
          <span class="date-sep">—</span>
          <input id="stats-end-date" type="date" v-model="endDate" class="date-input" @change="fetchDashboard" />
        </div>
        <button id="btn-refresh" class="btn-action accent" :disabled="loading" @click="fetchDashboard">
          <RefreshCw :size="14" :class="{ spinning: loading }" />
          Làm mới
        </button>
        <button id="btn-export-excel" class="btn-action secondary" :disabled="loading" @click="exportExcel">
          <Download :size="14" /> Excel
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card" v-for="k in kpiCards" :key="k.label" :style="{ '--card-color': k.color }">
        <div class="kpi-top">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-icon" :style="{ background: k.bg }">
            <component :is="k.icon" :size="18" :style="{ color: k.color }" />
          </div>
        </div>
        <div class="kpi-value">{{ k.value }}</div>
        <div class="kpi-sub">{{ k.sub }}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" :style="{ width: k.pct + '%' }"></div></div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="charts-row">
      <!-- Line chart -->
      <div class="chart-card wide">
        <div class="chart-header">
          <div>
            <div class="chart-title">{{ trendTitle }}</div>
            <div class="chart-desc">{{ trendDesc }}</div>
          </div>
        </div>
        <div class="chart-body">
          <Line v-if="lineData" :data="lineData" :options="lineOpts" />
          <div v-else class="chart-empty">Không có dữ liệu trong khoảng thời gian này</div>
        </div>
      </div>
      <!-- Doughnut -->
      <div class="chart-card narrow">
        <div class="chart-header">
          <div>
            <div class="chart-title">Trạng thái đơn</div>
            <div class="chart-desc">Phân bổ trong kỳ lọc</div>
          </div>
        </div>
        <div class="chart-body doughnut-body">
          <Doughnut v-if="doughnutData" :data="doughnutData" :options="doughnutOpts" />
          <div v-else class="chart-empty">Không có dữ liệu</div>
        </div>
      </div>
    </div>

    <!-- Secondary stats -->
    <div class="sec-grid">
      <div class="sec-card" v-for="s in secondaryStats" :key="s.label">
        <div class="sec-icon" :style="{ background: s.bg, color: s.color }">
          <component :is="s.icon" :size="18" />
        </div>
        <div class="sec-info">
          <div class="sec-label">{{ s.label }}</div>
          <div class="sec-value">{{ s.value }}</div>
        </div>
      </div>
    </div>

    <div class="data-notice">
      <Info :size="13" />
      Toàn bộ dữ liệu được tổng hợp thời gian thực từ cơ sở dữ liệu hệ thống.
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import {
  BarChart3, CalendarDays, RefreshCw, Download, FileText, Info,
  Users, Building2, ShieldAlert, CheckCircle2, TrendingUp,
  Activity, Eye, MapPin, CircleDollarSign, Percent
} from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';
import { Line, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement,
  PointElement, CategoryScale, LinearScale, ArcElement, Filler
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, ArcElement, Filler);

const FMT_VND = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v || 0));
const FMT_NUM = (v) => new Intl.NumberFormat('vi-VN').format(Number(v || 0));

const STATUS_MAP = {
  CONFIRMED: { label: 'Thành công', color: '#22c55e' },
  PENDING:   { label: 'Chờ xử lý', color: '#f59e0b' },
  CANCELLED: { label: 'Đã hủy',    color: '#ef4444' },
  COMPLETED: { label: 'Hoàn tất',  color: '#3b82f6' },
};

export default {
  name: 'DashboardAdmin',
  components: {
    BarChart3, CalendarDays, RefreshCw, Download, FileText, Info,
    Users, Building2, ShieldAlert, CheckCircle2, TrendingUp, Activity,
    Eye, MapPin, CircleDollarSign, Percent,
    Line, Doughnut,
  },
  setup() {
    const loading   = ref(false);
    const preset    = ref('this_month');
    const startDate = ref('');
    const endDate   = ref('');
    const lastUpdated = ref('');
    const currentUser = ref(null);

    const hasPermission = (permissionKey) => {
      if (currentUser.value?.role === 'ADMIN') return true;
      return !!currentUser.value?.permissions?.[permissionKey];
    };

    const presets = [
      { id: 'last_week',   label: 'Tuần trước'  },
      { id: 'this_month',  label: 'Tháng này'   },
      { id: 'last_month',  label: 'Tháng trước' },
      { id: 'custom',      label: 'Tùy chọn'    },
    ];

    const dash = ref({
      users:      { totalUsers: 0, newUsers: 0, activeUsers: 0 },
      clubs:      { activeClubs: 0, totalClubs: 0 },
      courts:     { totalCourts: 0, activeCourts: 0, fillRate: 0 },
      bookings:   { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0 },
      revenue:    { totalRevenue: 0, platformCommission: 0, commissionRate: 0.1, averageBookingValue: 0 },
      payments:   { successRate: 0 },
      moderation: { pendingReports: 0 },
      visits:     { totalVisits: 0, uniqueUsers: 0 },
      approvals:  { pendingClubs: 0, pendingKyc: 0 },
      charts:     { monthly: [], bookingStatus: [] },
    });

    const kpiCards = computed(() => {
      const cards = [
        {
          label: 'Người dùng mới',
          value: FMT_NUM(dash.value.users.newUsers),
          sub: `Tổng: ${FMT_NUM(dash.value.users.totalUsers)} người dùng`,
          icon: Users,
          color: '#4f6ef7',
          bg: 'rgba(79,110,247,0.12)',
          pct: Math.min(100, (dash.value.users.newUsers / Math.max(dash.value.users.totalUsers, 1)) * 100),
        },
        {
          label: 'Lượt truy cập',
          value: FMT_NUM(dash.value.visits.totalVisits),
          sub: `${FMT_NUM(dash.value.visits.uniqueUsers)} người dùng`,
          icon: Eye,
          color: '#8b5cf6',
          bg: 'rgba(139,92,246,0.12)',
          pct: 70,
        },
        {
          label: 'Sân hoạt động',
          value: FMT_NUM(dash.value.courts.activeCourts),
          sub: `Tỷ lệ lấp đầy: ${dash.value.courts.fillRate}%`,
          icon: MapPin,
          color: '#22c55e',
          bg: 'rgba(34,197,94,0.12)',
          pct: dash.value.courts.fillRate,
        }
      ];

      if (hasPermission('view_finance')) {
        cards.push({
          label: 'Tổng doanh thu',
          value: FMT_VND(dash.value.revenue.totalRevenue),
          sub: `Hoa hồng: ${FMT_VND(dash.value.revenue.platformCommission)}`,
          icon: CircleDollarSign,
          color: '#f59e0b',
          bg: 'rgba(245,158,11,0.12)',
          pct: Math.min(100, dash.value.revenue.platformCommission / Math.max(dash.value.revenue.totalRevenue, 1) * 100),
        });
      }

      return cards;
    });

    const secondaryStats = computed(() => {
      const stats = [
        { label: 'Tổng đơn đặt',       value: FMT_NUM(dash.value.bookings.totalBookings),    icon: Activity,      bg: 'rgba(79,110,247,0.1)',  color: '#4f6ef7' },
        { label: 'Đơn thành công',      value: FMT_NUM(dash.value.bookings.confirmedBookings), icon: CheckCircle2,  bg: 'rgba(34,197,94,0.1)',   color: '#22c55e' },
        { label: 'Đơn đã hủy',          value: FMT_NUM(dash.value.bookings.cancelledBookings), icon: ShieldAlert,   bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
        { label: 'Tỷ lệ thành công',    value: dash.value.payments.successRate + '%',          icon: Percent,       bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
      ];

      if (hasPermission('view_finance')) {
        stats.push(
          { label: 'Hoa hồng nền tảng',   value: FMT_VND(dash.value.revenue.platformCommission), icon: TrendingUp,    bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
          { label: 'Giá trị TB / đơn',    value: FMT_VND(dash.value.revenue.averageBookingValue),icon: CircleDollarSign, bg: 'rgba(79,110,247,0.1)', color: '#4f6ef7' }
        );
      }
      return stats;
    });

    const trendTitle = computed(() => {
      if (preset.value === 'last_week') return 'Xu hướng tuần trước';
      if (preset.value === 'this_month') return 'Xu hướng tháng này';
      if (preset.value === 'last_month') return 'Xu hướng tháng trước';
      return 'Xu hướng tùy chỉnh';
    });

    const trendDesc = computed(() => {
      const monthly = dash.value.charts.monthly;
      if (!monthly?.length) return 'Không có dữ liệu';
      const isDaily = monthly[0].month.length === 5;
      return isDaily ? 'Số đơn đặt theo từng ngày' : 'Số đơn đặt theo từng tháng';
    });

    const lineData = computed(() => {
      const monthly = dash.value.charts.monthly;
      if (!monthly?.length) return null;
      return {
        labels: monthly.map(i => i.month),
        datasets: [{
          label: 'Số đơn đặt',
          data: monthly.map(i => i.count),
          borderColor: '#4f6ef7',
          backgroundColor: 'rgba(79,110,247,0.08)',
          tension: 0.45,
          fill: true,
          pointBackgroundColor: '#4f6ef7',
          pointBorderColor: '#fff',
          pointRadius: 5,
        }],
      };
    });

    const lineOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false, backgroundColor: '#1e293b', padding: 12 },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
      },
    };

    const doughnutData = computed(() => {
      const bs = dash.value.charts.bookingStatus;
      if (!bs?.length) return null;
      return {
        labels: bs.map(i => STATUS_MAP[i.status]?.label || i.status),
        datasets: [{
          data: bs.map(i => i.count),
          backgroundColor: bs.map(i => STATUS_MAP[i.status]?.color || '#94a3b8'),
          borderWidth: 0, hoverOffset: 8,
        }],
      };
    });

    const doughnutOpts = {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, color: '#94a3b8', font: { size: 11, weight: '600' } } },
      },
    };

    const fetchDashboard = async () => {
      loading.value = true;
      try {
        const params = {};
        if (preset.value !== 'custom') {
          params.preset = preset.value;
        } else {
          if (startDate.value) params.startDate = startDate.value;
          if (endDate.value)   params.endDate   = endDate.value;
        }
        
        const res = await adminService.getStatsDashboard(params);
        if (res.data?.data) {
          dash.value = res.data.data;
        }

        const now = new Date();
        lastUpdated.value = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}, ${now.toLocaleDateString('vi-VN')}`;
      } catch (e) {
        console.error('Lỗi dashboard:', e);
      } finally {
        loading.value = false;
      }
    };

    const onPresetClick = (id) => {
      preset.value = id;
      if (id === 'custom') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.value = firstDay.toISOString().split('T')[0];
        endDate.value = now.toISOString().split('T')[0];
      }
      fetchDashboard();
    };

    const exportExcel = async () => {
       alert("Tính năng xuất báo cáo Excel đang được chuẩn bị...");
    };

    onMounted(() => {
      const stored = localStorage.getItem('user');
      if (stored) currentUser.value = JSON.parse(stored);
      fetchDashboard();
    });

    return {
      loading, preset, startDate, endDate, lastUpdated, presets, dash,
      kpiCards, secondaryStats, trendTitle, trendDesc,
      lineData, lineOpts, doughnutData, doughnutOpts,
      onPresetClick, fetchDashboard, exportExcel, FMT_NUM, FMT_VND
    };
  },
};
</script>

<style scoped>
.stats-page { display: flex; flex-direction: column; gap: 24px; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.title-icon { color: var(--accent); }
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Preset buttons */
.preset-group { display: flex; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 3px; gap: 3px; }
.preset-btn { padding: 7px 14px; border: none; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.preset-btn:hover { color: var(--text-primary); }
.preset-btn.active { background: var(--accent); color: #fff; box-shadow: 0 3px 10px rgba(79,110,247,0.35); }

.date-range { display: flex; align-items: center; gap: 6px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 0 10px; height: 38px; }
.date-input { background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 12px; }
.date-sep { color: var(--text-muted); }

.btn-action { display: flex; align-items: center; gap: 6px; padding: 0 14px; height: 38px; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-action.accent { background: var(--accent); color: #fff; }
.btn-action.secondary { background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-primary); }
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* KPI Grid */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; transition: all 0.2s; position: relative; overflow: hidden; }
.kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--card-color, var(--accent)); }
.kpi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
.kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.kpi-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); }
.kpi-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.kpi-value { font-size: 26px; font-weight: 900; color: var(--text-primary); line-height: 1; margin-bottom: 6px; }
.kpi-sub { font-size: 11px; color: var(--text-muted); margin-bottom: 14px; }
.kpi-bar { height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden; }
.kpi-bar-fill { height: 100%; background: var(--card-color, var(--accent)); border-radius: 2px; transition: width 0.6s ease; }

/* Charts */
.charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.chart-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; }
.chart-header { margin-bottom: 20px; }
.chart-title { font-size: 14px; font-weight: 800; color: var(--text-primary); }
.chart-desc { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
.chart-body { flex: 1; min-height: 260px; position: relative; }
.doughnut-body { min-height: 220px; }
.chart-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text-muted); }

/* Secondary Stats */
.sec-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sec-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
.sec-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sec-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
.sec-value { font-size: 18px; font-weight: 800; color: var(--text-primary); margin-top: 2px; }

/* Notice */
.data-notice { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(79,110,247,0.06); border: 1px solid rgba(79,110,247,0.15); border-radius: 10px; font-size: 12px; color: var(--text-muted); }

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr; }
  .sec-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
