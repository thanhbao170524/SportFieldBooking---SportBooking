<template>
  <div class="finance-view">
    <!-- Header: Page Title & Actions -->
    <div class="view-header">
      <div class="header-info">
        <h1 class="view-title">Thống kê và quản lí thanh toán</h1>
        <p class="view-subtitle">Báo cáo doanh thu, lợi nhuận và quản lý dòng tiền của bạn.</p>
      </div>
      <div class="header-actions">
        <div class="period-switch">
          <button class="period-btn" :class="{ active: period === 'day' }" @click="setPeriod('day')">Ngày</button>
          <button class="period-btn" :class="{ active: period === 'week' }" @click="setPeriod('week')">Tuần</button>
          <button class="period-btn" :class="{ active: period === 'month' }" @click="setPeriod('month')">Tháng</button>
          <button class="period-btn" :class="{ active: period === 'year' }" @click="setPeriod('year')">Năm</button>
          <input v-if="period !== 'week'" type="date" class="period-date" v-model="anchorDate" @change="fetchFinance(true)" />
        </div>
        <button class="export-btn" @click="fetchFinance(true)" :disabled="loading">
          <span class="material-icons">refresh</span>
          <span>Làm mới</span>
        </button>
        <button class="export-btn">
          <span class="material-icons">download</span>
          <span>Xuất báo cáo (Excel)</span>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="finance-tabs">
      <button class="finance-tab" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">
        Thống kê
      </button>
      <button class="finance-tab" :class="{ active: activeTab === 'payments' }" @click="activeTab = 'payments'">
        Quản lí thanh toán
      </button>
    </div>

    <!-- Stats Row: Quick Numbers (only on Stats tab) -->
    <div v-if="activeTab === 'stats'" class="stats-row">
      <div v-for="(stat, i) in summaryStats" :key="stat.label" class="fin-stat-card" :style="`--delay: ${i * 80}ms`">
        <div class="f-stat-icon" :class="stat.color">
          <span class="material-icons">{{ stat.icon }}</span>
        </div>
        <div class="f-stat-body">
          <p class="f-stat-label">{{ stat.label }}</p>
          <div class="f-stat-val-group">
            <h3 class="f-stat-value">{{ stat.value }}</h3>
            <span class="f-stat-trend" :class="stat.trend">
              {{ stat.change }}% {{ stat.trend === 'up' ? '↑' : '↓' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Statistics -->
    <div v-if="activeTab === 'stats'" class="finance-grid">
      <div class="grid-left">
        <div class="card chart-card">
          <div class="card-header">
            <h3 class="card-title">Biểu đồ doanh thu theo kỳ</h3>
            <div class="chart-legend">
              <span class="legend-item"><span class="dot online"></span>Trực tuyến</span>
              <span class="legend-item"><span class="dot cash"></span>Tại sân</span>
            </div>
          </div>
          <div class="simulated-chart">
            <div v-for="bar in chartData" :key="bar.day" class="chart-column">
              <div class="bar-group">
                <div class="bar online" :style="`height: ${bar.online}%`" :title="`Online: ${bar.onlineVal}đ`"></div>
                <div class="bar cash" :style="`height: ${bar.cash}%`" :title="`Tại sân: ${bar.cashVal}đ`"></div>
              </div>
              <span class="day-label">{{ bar.day }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="grid-right">
        <div class="card breakdown-card">
          <h3 class="card-title">Doanh thu theo cơ sở</h3>
          <div class="breakdown-list">
            <div v-for="item in clubBreakdown" :key="item.name" class="breakdown-item">
              <div class="b-info">
                <span class="b-name">{{ item.name }}</span>
                <span class="b-percent">{{ item.percent }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="`width: ${item.percent}%; background: ${item.color}`"></div>
              </div>
              <div class="b-val">{{ formatCurrency(item.value) }}</div>
            </div>
          </div>
        </div>

        <div class="card ranking-card">
          <h3 class="card-title">Sân mang lại doanh thu cao</h3>
          <div class="ranking-list">
            <div v-for="(court, idx) in topCourts" :key="court.name" class="ranking-item">
              <div class="r-idx">0{{ idx + 1 }}</div>
              <div class="r-body">
                <p class="r-name">{{ court.name }}</p>
                <p class="r-sub">{{ court.bookings }} lượt đặt</p>
              </div>
              <div class="r-val">{{ formatCurrency(court.revenue) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Payment management -->
    <div v-else class="finance-grid">
      <div class="grid-left">
        <div class="card table-card">
          <div class="card-header">
            <h3 class="card-title">Lịch sử giao dịch mới nhất</h3>
            <router-link to="#" class="view-all">Xem tất cả</router-link>
          </div>
          <div class="table-wrap">
            <table class="fin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mã đơn</th>
                  <th>Loại</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in recentTransactions" :key="tx.id">
                  <td class="tx-time">
                    <p class="t-main">{{ tx.date }}</p>
                    <p class="t-sub">{{ tx.time }}</p>
                  </td>
                  <td><span class="tx-id">#{{ tx.orderId }}</span></td>
                  <td>
                    <div class="tx-type">
                      <span class="material-icons type-icon" :class="tx.type">
                        {{ tx.type === 'deposit' ? 'add_circle' : 'account_balance_wallet' }}
                      </span>
                      <span>{{ tx.typeLabel }}</span>
                    </div>
                  </td>
                  <td class="tx-amount" :class="tx.type">
                    {{ tx.type === 'deposit' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                  </td>
                  <td>
                    <span class="status-pill" :class="tx.status">
                      <span class="status-dot"></span>
                      {{ tx.statusLabel }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid-right">
        <div class="wallet-card">
          <div class="wallet-bg-elements">
            <div class="circle c-1"></div>
            <div class="circle c-2"></div>
          </div>
          <div class="wallet-content">
            <div class="wallet-header">
              <span class="material-icons">account_balance_wallet</span>
              <p>Số dư khả dụng</p>
            </div>
            <h2 class="wallet-balance">{{ formatCurrency(wallet.net) }}</h2>
            <div class="wallet-details">
              <div class="detail-item">
                <p>Khấu trừ hoa hồng ({{ Math.round(commissionRate * 100) }}%)</p>
                <span>-{{ formatCurrency(wallet.commission) }}</span>
              </div>
              <div class="detail-item total">
                <p>Thực nhận</p>
                <span>{{ formatCurrency(wallet.net) }}</span>
              </div>
            </div>
            <button class="payout-btn">
              <span>Yêu cầu rút tiền</span>
              <span class="material-icons">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ownerFinanceService } from '@/services/ownerFinance.service';
export default {
  name: 'OwnerFinanceView',
  data() {
    return {
      loading: true,
      error: '',
      commissionRate: 0.1,
      period: 'week',
      anchorDate: '',
      lastUpdatedAt: null,
      refreshTimer: null,
      activeTab: 'stats',

      summaryStats: [],
      chartData: [],
      recentTransactions: [],
      clubBreakdown: [],
      topCourts: [],

      wallet: {
        gross: 0,
        commission: 0,
        net: 0
      }
    }
  },
  async mounted() {
    // default date today for non-week period
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    this.anchorDate = `${yyyy}-${mm}-${dd}`;

    await this.fetchFinance();

    // Auto refresh each 1 hour
    this.refreshTimer = setInterval(() => {
      this.fetchFinance();
    }, 60 * 60 * 1000);
  },
  beforeUnmount() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  },
  methods: {
    formatCurrency(val) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    },
    fmtDayLabel(isoDate) {
      // isoDate: YYYY-MM-DD
      const d = new Date(isoDate + 'T00:00:00');
      const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return map[d.getDay()];
    },
    fmtRelativeDate(dt) {
      const d = new Date(dt);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (sameDay) return 'Hôm nay';
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
      return `${day}/${m}/${y}`;
    },
    fmtTime(dt) {
      const d = new Date(dt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    },
    setPeriod(p) {
      this.period = p;
      this.fetchFinance(true);
    },
    async fetchFinance() {
      this.loading = true;
      this.error = '';
      try {
        const params = { period: this.period };
        if (this.period !== 'week') params.date = this.anchorDate;
        const res = await ownerFinanceService.getFinance(params);
        const data = res.data?.data;
        this.commissionRate = data.summary?.commissionRate ?? 0.1;
        this.lastUpdatedAt = new Date();

        // Summary cards (trend % tạm để 0 — backend chưa tính so sánh kỳ trước)
        this.summaryStats = [
          {
            label: 'Tổng doanh thu (kỳ)',
            value: this.formatCurrency(data.summary?.totalRevenue ?? 0),
            icon: 'payments',
            color: 'green',
            trend: 'up',
            change: 0
          },
          {
            label: 'Số lượt đặt (kỳ)',
            value: (data.summary?.totalBookings ?? 0).toString(),
            icon: 'event_available',
            color: 'blue',
            trend: 'up',
            change: 0
          },
          {
            label: 'Điểm đánh giá TB (kỳ)',
            value: (Number(data.summary?.avgRating ?? 0).toFixed(1)) + ` (${data.summary?.ratingCount ?? 0})`,
            icon: 'star',
            color: 'teal',
            trend: 'up',
            change: 0
          },
          {
            label: 'Cần đối soát',
            value: this.formatCurrency(data.summary?.needReconcile ?? 0),
            icon: 'pending_actions',
            color: 'amber',
            trend: 'up',
            change: 0
          }
        ];

        // Wallet (gross/commission/net) dùng doanh thu theo kỳ
        const gross = Number(data.summary?.totalRevenue ?? 0);
        const commission = Math.round(gross * this.commissionRate);
        const net = Math.max(0, gross - commission);
        this.wallet = { gross, commission, net };

        // Chart: convert to % bars
        const series = Array.isArray(data.chart) ? data.chart : [];
        const maxVal = Math.max(
          1,
          ...series.map((x) => (Number(x.onlineAmount || 0) + Number(x.cashAmount || 0)))
        );
        this.chartData = series.map((x) => {
          const onlineAmount = Number(x.onlineAmount || 0);
          const cashAmount = Number(x.cashAmount || 0);
          const total = onlineAmount + cashAmount;
          return {
            day: x.label,
            online: Math.round((onlineAmount * 100) / maxVal),
            cash: Math.round((cashAmount * 100) / maxVal),
            onlineVal: this.formatCurrency(onlineAmount),
            cashVal: this.formatCurrency(cashAmount),
            _total: total
          };
        });

        // Transactions
        const tx = Array.isArray(data.recentTransactions) ? data.recentTransactions : [];
        this.recentTransactions = tx.map((t) => ({
          id: t.id,
          orderId: t.orderId,
          date: this.fmtRelativeDate(t.dateTime),
          time: this.fmtTime(t.dateTime),
          type: t.type,
          typeLabel: t.typeLabel,
          amount: Number(t.amount || 0),
          status: t.status,
          statusLabel: t.statusLabel
        }));

        // Breakdown + Top courts
        this.clubBreakdown = Array.isArray(data.breakdownByClub) ? data.breakdownByClub : [];
        this.topCourts = Array.isArray(data.topCourts) ? data.topCourts : [];
      } catch (e) {
        this.error = 'Không thể tải dữ liệu tài chính. Vui lòng thử lại.';
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;700&display=swap');

.finance-view {
  font-family: 'DM Sans', sans-serif;
  color: #0f1623;
  display: flex;
  flex-direction: column;
  gap: 28px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Header ────────────────────────────────────────────────── */
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 4px 0;
  text-transform: uppercase;
}

.view-subtitle {
  color: #64748b;
  font-size: 15px;
  margin: 0;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  border: 1px solid #eaecf2;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 700;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover { background-color: #f8fafc; border-color: #cbd5e1; }

.period-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #eaecf2;
  padding: 6px;
  border-radius: 14px;
}
.period-btn {
  border: none;
  background: transparent;
  padding: 8px 12px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.5px;
}
.period-btn:hover { background: #f8fafc; color: #16a34a; }
.period-btn.active { background: #16a34a; color: #fff; }
.period-date {
  border: 1px solid #eaecf2;
  border-radius: 10px;
  padding: 8px 10px;
  font-weight: 700;
  color: #1e293b;
  background: #fff;
}

/* ── Stats Row ─────────────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.finance-tabs {
  display: flex;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #eaecf2;
  padding: 8px;
  border-radius: 16px;
}
.finance-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  letter-spacing: 0.6px;
  font-family: 'Barlow Condensed', sans-serif;
  text-transform: uppercase;
  color: #64748b;
  transition: all 0.2s ease;
}
.finance-tab:hover { background: #f8fafc; color: #16a34a; }
.finance-tab.active { background: #16a34a; color: #fff; box-shadow: 0 8px 20px rgba(22,163,74,0.18); }

.fin-stat-card {
  background: white;
  border: 1px solid #eaecf2;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 16px rgba(15,22,35,0.04);
}

.f-stat-icon {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
}
.f-stat-icon.green  { background: #ecfdf5; color: #059669; }
.f-stat-icon.blue   { background: #eff6ff; color: #2563eb; }
.f-stat-icon.teal   { background: #f0fdfa; color: #0d9488; }
.f-stat-icon.amber  { background: #fffbeb; color: #d97706; }

.f-stat-label { font-size: 13px; color: #64748b; font-weight: 500; margin: 0 0 4px 0; }
.f-stat-val-group { display: flex; align-items: baseline; gap: 8px; }
.f-stat-value { font-family: 'Barlow Condensed', sans-serif; font-size: 22px; font-weight: 800; margin: 0; }
.f-stat-trend { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.f-stat-trend.up { color: #059669; background: #d1fae5; }
.f-stat-trend.down { color: #ef4444; background: #fee2e2; }

/* ── Main Grid ─────────────────────────────────────────────── */
.finance-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 24px;
}

.card {
  background: white;
  border-radius: 24px;
  border: 1px solid #eaecf2;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(15,22,35,0.04);
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #1a293b;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.view-all { font-size: 13px; font-weight: 700; color: #16a34a; text-decoration: none; }

/* ── Simulated Chart ────────────────────────────────────────── */
.simulated-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 240px;
  padding-top: 20px;
  border-bottom: 2px solid #f1f5f9;
}

.chart-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.bar-group {
  width: 32px;
  height: 180px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.bar {
  flex: 1;
  border-radius: 6px 6px 2px 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.bar.online { background: linear-gradient(to top, #16a34a, #34d399); }
.bar.cash { background: linear-gradient(to top, #3b82f6, #60a5fa); }

.bar:hover { transform: scaleY(1.05); filter: brightness(1.1); }

.day-label { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; color: #94a3b8; }

.chart-legend { display: flex; gap: 20px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #64748b; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.online { background: #16a34a; }
.dot.cash { background: #3b82f6; }

/* ── Transaction Table ─────────────────────────────────────── */
.table-wrap { overflow-x: auto; }
.fin-table { width: 100%; border-collapse: collapse; }
.fin-table th { text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #f8fafc; }
.fin-table td { padding: 16px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }

.t-main { font-weight: 700; font-size: 14px; margin: 0; }
.t-sub { font-size: 11px; color: #94a3b8; margin: 0; }
.tx-id { font-family: 'Barlow Condensed', sans-serif; color: #64748b; font-weight: 700; }

.tx-type { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.type-icon { font-size: 18px; }
.type-icon.deposit { color: #10b981; }
.type-icon.payout { color: #3b82f6; }

.tx-amount { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 16px; }
.tx-amount.deposit { color: #10b981; }
.tx-amount.payout { color: #ef4444; }

.status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-pill.success { background: #ecfdf5; color: #059669; }
.status-pill.pending { background: #fff7ed; color: #ea580c; }
.status-pill.failed { background: #fef2f2; color: #dc2626; }

/* ── Right Column: Wallet ──────────────────────────────────── */
.wallet-card {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 28px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  color: white;
  margin-bottom: 24px;
}

.wallet-bg-elements .circle { position: absolute; border-radius: 50%; background: white; opacity: 0.05; }
.c-1 { width: 140px; height: 140px; top: -40px; right: -40px; }
.c-2 { width: 80px; height: 80px; bottom: -20px; left: -20px; }

.wallet-header { display: flex; align-items: center; gap: 10px; opacity: 0.7; margin-bottom: 8px; }
.wallet-header p { font-size: 13px; font-weight: 600; margin: 0; }
.wallet-balance { font-family: 'Barlow Condensed', sans-serif; font-size: 36px; font-weight: 800; margin: 0 0 24px 0; }

.wallet-details { background: rgba(255,255,255,0.06); padding: 18px; border-radius: 16px; margin-bottom: 24px; }
.detail-item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: rgba(255,255,255,0.6); }
.detail-item.total { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 800; font-size: 16px; font-family: 'Barlow Condensed', sans-serif; }

.payout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: white;
  color: #0f172a;
  border: none;
  padding: 14px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.2s;
}

.payout-btn:hover { transform: scale(1.02); }

/* ── Breakdown List ────────────────────────────────────────── */
.breakdown-list { display: flex; flex-direction: column; gap: 20px; }
.breakdown-item { display: flex; flex-direction: column; gap: 8px; }
.b-info { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; }
.b-name { color: #1e293b; }
.b-percent { color: #64748b; }
.progress-bar { height: 8px; background: #f1f5f9; border-radius: 100px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 100px; }
.b-val { text-align: right; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 16px; color: #1e293b; margin-top: 4px; }

/* ── Ranking List ─────────────────────────────────────────── */
.ranking-list { display: flex; flex-direction: column; gap: 16px; }
.ranking-item { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 14px; transition: background 0.2s; }
.ranking-item:hover { background: #f8fafc; }
.r-idx { width: 32px; height: 32px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 14px; color: #94a3b8; }
.r-body { flex: 1; }
.r-name { font-weight: 700; font-size: 14px; margin: 0; color: #1e293b; }
.r-sub { font-size: 11px; color: #94a3b8; margin: 2px 0 0 0; }
.r-val { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; color: #059669; }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 1280px) {
  .finance-grid { grid-template-columns: 1fr; }
}

@media (max-width: 1024px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 640px) {
  .stats-row { grid-template-columns: 1fr; }
  .view-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .wallet-card { padding: 20px; }
}
</style>
