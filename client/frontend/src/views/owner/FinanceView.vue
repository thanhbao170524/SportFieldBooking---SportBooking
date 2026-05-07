<template>
  <div class="finance-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-info">
        <h1 class="view-title">Thống kê</h1>
        <p class="view-subtitle">
          Doanh thu, lượt đặt và đánh giá theo kỳ — chỉ dữ liệu sân của bạn.
          <span class="refresh-badge">
            <span class="refresh-dot" :class="{ pulse: loading }"></span>
            {{ lastUpdatedLabel }}
          </span>
        </p>
      </div>
      <div class="header-actions">
        <div class="period-switch">
          <button
            v-for="p in periods" :key="p.id"
            class="period-btn" :class="{ active: period === p.id }"
            @click="setPeriod(p.id)"
          >{{ p.label }}</button>
          <input
            v-if="period !== 'week'"
            type="date" class="period-date"
            v-model="anchorDate"
            @change="fetchFinance(true)"
          />
        </div>
        <button class="icon-btn" :disabled="loading" @click="fetchFinance(true)" title="Làm mới dữ liệu">
          <span class="material-icons" :class="{ spinning: loading }">refresh</span>
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !summaryStats.length" class="skeleton-grid">
      <div v-for="i in 4" :key="i" class="skeleton-card"></div>
    </div>

    <!-- KPI cards -->
    <div v-else class="stats-row">
      <div v-for="(s, i) in summaryStats" :key="s.label" class="fin-stat-card" :style="`--delay:${i*70}ms`">
        <div class="f-icon" :class="s.color">
          <span class="material-icons">{{ s.icon }}</span>
        </div>
        <div class="f-body">
          <p class="f-label">{{ s.label }}</p>
          <div class="f-val-row">
            <h3 class="f-value">{{ s.value }}</h3>
            <!-- Star rating visual for avgRating card -->
            <div v-if="s.isRating" class="star-row">
              <span
                v-for="n in 5" :key="n"
                class="star"
                :class="{ filled: n <= Math.round(avgRating), half: n - 0.5 <= avgRating && n > avgRating }"
              >★</span>
            </div>
          </div>
          <p class="f-sub">{{ s.sub }}</p>
        </div>
      </div>
    </div>

    <!-- Main charts row -->
    <div class="finance-grid">
      <!-- Bar chart -->
      <div class="card chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Doanh thu theo kỳ</h3>
            <p class="card-desc">Tối đa 12 điểm dữ liệu · {{ periodLabel }}</p>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="dot online"></span>Trực tuyến</span>
            <span class="legend-item"><span class="dot cash"></span>Tại sân</span>
          </div>
        </div>
        <div class="chart-wrap">
          <Bar v-if="barData" :data="barData" :options="barOptions" />
          <div v-else class="chart-empty">Không có dữ liệu trong kỳ này</div>
        </div>
      </div>

      <!-- Right column -->
      <div class="right-col">
        <!-- Breakdown by club -->
        <div class="card breakdown-card" v-if="clubBreakdown.length">
          <h3 class="card-title">Theo cơ sở</h3>
          <div class="breakdown-list">
            <div v-for="item in clubBreakdown" :key="item.name" class="breakdown-item">
              <div class="b-info">
                <span class="b-name">{{ item.name }}</span>
                <span class="b-percent">{{ item.percent }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="`width:${item.percent}%;background:${item.color}`"></div>
              </div>
              <div class="b-val">{{ formatCurrency(item.value) }}</div>
            </div>
          </div>
        </div>

        <!-- Top courts -->
        <div class="card ranking-card" v-if="topCourts.length">
          <h3 class="card-title">Sân doanh thu cao</h3>
          <div class="ranking-list">
            <div v-for="(court, idx) in topCourts" :key="court.id" class="ranking-item">
              <div class="r-idx">{{ String(idx + 1).padStart(2,'0') }}</div>
              <div class="r-body">
                <p class="r-name">{{ court.name }}</p>
                <p class="r-sub">{{ court.bookings }} lượt đặt</p>
              </div>
              <div class="r-val">{{ formatCurrency(court.revenue) }}</div>
            </div>
          </div>
        </div>

        <!-- Empty right col -->
        <div v-if="!clubBreakdown.length && !topCourts.length" class="card empty-card">
          <span class="material-icons">bar_chart</span>
          <p>Chưa có đơn đặt trong kỳ này</p>
        </div>
      </div>
    </div>

    <!-- Auto-refresh notice -->
    <div class="auto-refresh-note">
      <span class="material-icons">schedule</span>
      Dữ liệu tự động làm mới mỗi 1 giờ. Lần tiếp theo: {{ nextRefreshLabel }}
    </div>
  </div>
</template>

<script>
import { ownerFinanceService } from '@/services/ownerFinance.service';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, Title
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

const FMT = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

export default {
  name: 'OwnerFinanceView',
  components: { Bar },
  data() {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    return {
      loading: false,
      period: 'week',
      anchorDate: todayStr,
      lastUpdatedAt: null,
      nextRefreshAt: null,
      refreshTimer: null,
      countdownTimer: null,
      nextRefreshLabel: '--:--',
      periods: [
        { id: 'day', label: 'Ngày' },
        { id: 'week', label: 'Tuần' },
        { id: 'month', label: 'Tháng' },
        { id: 'year', label: 'Năm' },
      ],
      summaryStats: [],
      avgRating: 0,
      barData: null,
      clubBreakdown: [],
      topCourts: [],
    };
  },
  computed: {
    periodLabel() {
      return { day: 'theo giờ', week: 'theo ngày', month: 'theo tuần', year: 'theo tháng' }[this.period] || '';
    },
    lastUpdatedLabel() {
      if (!this.lastUpdatedAt) return 'Chưa tải';
      const d = this.lastUpdatedAt;
      return `Cập nhật ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    },
    barOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '600' }, color: '#64748b' }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#0f172a',
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${FMT(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            stacked: false,
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 12, weight: '700' } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148,163,184,0.1)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: (v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v
            }
          }
        }
      };
    }
  },
  async mounted() {
    await this.fetchFinance();
    // Auto refresh every 1 hour
    this.scheduleNextRefresh();
    this.refreshTimer = setInterval(() => {
      this.fetchFinance();
      this.scheduleNextRefresh();
    }, 60 * 60 * 1000);
    this.countdownTimer = setInterval(() => this.updateCountdown(), 30000);
  },
  beforeUnmount() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },
  methods: {
    formatCurrency: FMT,
    setPeriod(p) { this.period = p; this.fetchFinance(true); },
    scheduleNextRefresh() {
      this.nextRefreshAt = new Date(Date.now() + 60 * 60 * 1000);
      this.updateCountdown();
    },
    updateCountdown() {
      if (!this.nextRefreshAt) return;
      const diff = Math.max(0, this.nextRefreshAt - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.nextRefreshLabel = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    },
    async fetchFinance() {
      this.loading = true;
      try {
        // MOCK DATA for demonstration/development
        const data = {
          summary: {
            totalRevenue: 125000000,
            totalBookings: 458,
            avgRating: 4.8,
            ratingCount: 124,
            needReconcile: 15200000,
          },
          chart: [
            { label: '01/05', onlineAmount: 5200000, cashAmount: 1200000 },
            { label: '02/05', onlineAmount: 4800000, cashAmount: 900000 },
            { label: '03/05', onlineAmount: 6500000, cashAmount: 2100000 },
            { label: '04/05', onlineAmount: 7200000, cashAmount: 1800000 },
            { label: '05/05', onlineAmount: 5900000, cashAmount: 1500000 },
            { label: '06/05', onlineAmount: 8400000, cashAmount: 2400000 },
            { label: '07/05', onlineAmount: 9100000, cashAmount: 3100000 },
          ],
          breakdownByClub: [
            { name: 'Sân bóng ABC', value: 75000000, percent: 60, color: '#10b981' },
            { name: 'CLB Cầu lông XYZ', value: 35000000, percent: 28, color: '#3b82f6' },
            { name: 'Sân Tennis Riverside', value: 15000000, percent: 12, color: '#f59e0b' },
          ],
          topCourts: [
            { id: '1', name: 'Sân 5 - Cỏ nhân tạo', bookings: 85, revenue: 22000000 },
            { id: '2', name: 'Sân 7 - VIP', bookings: 64, revenue: 18500000 },
            { id: '3', name: 'Sân Cầu lông #01', bookings: 92, revenue: 12000000 },
          ]
        };

        /* 
        // Real API call (Temporarily disabled)
        const params = { period: this.period };
        if (this.period !== 'week') params.date = this.anchorDate;
        const res = await ownerFinanceService.getFinance(params);
        const data = res.data?.data || {};
        */

        const s = data.summary || {};
        this.avgRating = Number(s.avgRating || 0);

        // KPI cards
        this.summaryStats = [
          {
            label: 'Tổng doanh thu',
            value: FMT(s.totalRevenue),
            sub: `Kỳ: ${this.periodLabel}`,
            icon: 'payments', color: 'green'
          },
          {
            label: 'Lượt đặt sân',
            value: String(s.totalBookings || 0),
            sub: 'Đơn CONFIRMED',
            icon: 'event_available', color: 'blue'
          },
          {
            label: 'Điểm đánh giá TB',
            value: this.avgRating.toFixed(1) + ' / 5',
            sub: `${s.ratingCount || 0} đánh giá`,
            icon: 'star', color: 'amber', isRating: true
          },
          {
            label: 'Cần đối soát',
            value: FMT(s.needReconcile),
            sub: 'Tiền mặt + chưa xác nhận',
            icon: 'pending_actions', color: 'teal'
          },
        ];

        // Bar chart (max 12 buckets)
        const chart = Array.isArray(data.chart) ? data.chart.slice(0, 12) : [];
        if (chart.length) {
          this.barData = {
            labels: chart.map(x => x.label),
            datasets: [
              {
                label: 'Trực tuyến',
                data: chart.map(x => Number(x.onlineAmount || 0)),
                backgroundColor: 'rgba(16,185,129,0.85)',
                borderRadius: 6,
                borderSkipped: false,
              },
              {
                label: 'Tại sân',
                data: chart.map(x => Number(x.cashAmount || 0)),
                backgroundColor: 'rgba(59,130,246,0.75)',
                borderRadius: 6,
                borderSkipped: false,
              },
            ]
          };
        } else {
          this.barData = null;
        }

        this.clubBreakdown = Array.isArray(data.breakdownByClub) ? data.breakdownByClub : [];
        this.topCourts = Array.isArray(data.topCourts) ? data.topCourts : [];
        this.lastUpdatedAt = new Date();
      } catch (e) {
        console.error('fetchFinance error', e);
      } finally {
        // Artificial delay to show loading state
        setTimeout(() => {
          this.loading = false;
        }, 500);
      }
    },
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap');

.finance-view {
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; gap: 24px;
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }

/* Header */
.view-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
.view-title { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 800; margin: 0 0 4px; text-transform: uppercase; color: #0f1623; }
.view-subtitle { color: #64748b; font-size: 14px; margin: 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.refresh-badge { display: inline-flex; align-items: center; gap: 5px; background: #f1f5f9; border-radius: 100px; padding: 3px 10px; font-size: 12px; font-weight: 600; color: #475569; }
.refresh-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
.refresh-dot.pulse { animation: dotPulse 1s infinite; }
@keyframes dotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.period-switch { display: flex; align-items: center; gap: 4px; background: #fff; border: 1px solid #eaecf2; padding: 5px; border-radius: 14px; }
.period-btn { border: none; background: transparent; padding: 8px 14px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; color: #64748b; transition: all 0.2s; font-family: 'Barlow Condensed', sans-serif; letter-spacing: 0.5px; }
.period-btn:hover { color: #16a34a; background: #f0fdf4; }
.period-btn.active { background: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,0.3); }
.period-date { border: 1px solid #eaecf2; border-radius: 10px; padding: 7px 10px; font-weight: 700; color: #1e293b; background: #fff; font-size: 13px; }
.icon-btn { width: 42px; height: 42px; border-radius: 12px; border: 1px solid #eaecf2; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; transition: all 0.2s; }
.icon-btn:hover { border-color: #16a34a; color: #16a34a; background: #f0fdf4; }
.icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spinning { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Skeleton */
.skeleton-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
.skeleton-card { height: 110px; border-radius: 20px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* KPI row */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.fin-stat-card {
  background: #fff; border: 1px solid #eaecf2; border-radius: 20px; padding: 22px;
  display: flex; align-items: center; gap: 16px;
  box-shadow: 0 2px 12px rgba(15,22,35,0.04);
  animation: cardIn 0.4s var(--delay, 0ms) both;
}
@keyframes cardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; } }
.f-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.f-icon.green  { background: #ecfdf5; color: #059669; }
.f-icon.blue   { background: #eff6ff; color: #2563eb; }
.f-icon.amber  { background: #fffbeb; color: #d97706; }
.f-icon.teal   { background: #f0fdfa; color: #0d9488; }
.f-label { font-size: 12px; color: #64748b; font-weight: 600; margin: 0 0 3px; }
.f-val-row { display: flex; align-items: center; gap: 10px; }
.f-value { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; margin: 0; color: #0f1623; }
.f-sub { font-size: 11px; color: #94a3b8; margin: 4px 0 0; }
.star-row { display: flex; gap: 2px; }
.star { font-size: 14px; color: #d1d5db; }
.star.filled { color: #f59e0b; }
.star.half { color: #fcd34d; }

/* Grid */
.finance-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 24px; align-items: start; }
.right-col { display: flex; flex-direction: column; gap: 24px; }
.card { background: #fff; border-radius: 24px; border: 1px solid #eaecf2; padding: 24px; box-shadow: 0 4px 20px rgba(15,22,35,0.04); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.card-title { font-family: 'Barlow Condensed', sans-serif; font-size: 17px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #0f1623; }
.card-desc { font-size: 12px; color: #94a3b8; margin: 3px 0 0; }
.chart-legend { display: flex; gap: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #64748b; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.online { background: #10b981; }
.dot.cash { background: #3b82f6; }
.chart-wrap { height: 280px; position: relative; }
.chart-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #94a3b8; }

/* Breakdown */
.breakdown-list { display: flex; flex-direction: column; gap: 18px; }
.breakdown-item { display: flex; flex-direction: column; gap: 7px; }
.b-info { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; }
.b-name { color: #1e293b; } .b-percent { color: #94a3b8; }
.progress-bar { height: 7px; background: #f1f5f9; border-radius: 100px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 100px; transition: width 0.6s ease; }
.b-val { text-align: right; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 15px; color: #1e293b; }

/* Ranking */
.ranking-list { display: flex; flex-direction: column; gap: 12px; }
.ranking-item { display: flex; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 12px; transition: background 0.2s; }
.ranking-item:hover { background: #f8fafc; }
.r-idx { width: 30px; height: 30px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 13px; color: #94a3b8; flex-shrink: 0; }
.r-body { flex: 1; min-width: 0; }
.r-name { font-weight: 700; font-size: 14px; margin: 0; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.r-sub { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }
.r-val { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; color: #059669; font-size: 14px; white-space: nowrap; }

/* Empty */
.empty-card { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; color: #94a3b8; text-align: center; }
.empty-card .material-icons { font-size: 40px; }
.empty-card p { margin: 0; font-size: 14px; }

/* Auto-refresh note */
.auto-refresh-note { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #eaecf2; }
.auto-refresh-note .material-icons { font-size: 16px; }

/* Responsive */
@media (max-width: 1280px) { .finance-grid { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .stats-row { grid-template-columns: 1fr 1fr; } .skeleton-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr; }
  .view-header { flex-direction: column; }
  .period-switch { flex-wrap: wrap; }
}
</style>
