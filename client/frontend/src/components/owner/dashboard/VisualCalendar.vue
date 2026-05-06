<template>
  <!-- Match calendar UI from Owner/BookingsView -->
  <div class="calendar-card fade-in">
    <div class="cal-top">
      <div class="title-group">
        <div class="title-dot"></div>
        <h3 class="cal-title">Lịch booking trực quan</h3>
      </div>

      <div class="cal-controls">
        <button class="nav-btn" @click="prevDay" aria-label="Prev day">
          <span class="material-icons">chevron_left</span>
        </button>
        <div class="date-display">
          <span class="material-icons cal-icon">calendar_today</span>
          <span class="date-text">{{ displayDate }}</span>
          <span v-if="isToday" class="today-badge">Hôm nay</span>
        </div>
        <button class="nav-btn" @click="nextDay" aria-label="Next day">
          <span class="material-icons">chevron_right</span>
        </button>
        <button class="today-btn" @click="goToday" v-if="!isToday">Hôm nay</button>
      </div>
    </div>

    <div v-if="loading" class="cal-loading">
      <div class="spinner-premium"></div>
      <p class="loader-text">Đang tải lịch...</p>
    </div>

    <div v-else-if="!courts.length" class="cal-empty">
      <span class="material-icons empty-icon">event_busy</span>
      <p>Chưa có sân nào. Hãy thêm sân trong phần quản lý.</p>
    </div>

    <div v-else class="calendar-scroll-x">
      <div class="calendar-grid-p">
        <!-- Time Column -->
        <div class="time-column-p">
          <div class="grid-header-p">Thời gian</div>
          <div v-for="h in timeSlots" :key="h" class="time-slot-p">{{ h }}</div>
        </div>

        <!-- Court Columns -->
        <div class="court-columns-p">
          <div v-for="court in courts" :key="court.id" class="court-column-p">
            <div class="grid-header-p court">
              <span class="court-name-p">{{ court.name }}</span>
              <span class="court-type-p">{{ court.sportType || court.type || '' }}</span>
            </div>

            <div class="slots-container-p">
              <div
                v-for="h in timeSlots"
                :key="`${court.id}-${h}`"
                class="slot-cell-p"
                @click="onHourCellClick(court, h)"
              >
                <div
                  v-if="getBookingForSlot(court.id, h)"
                  class="booking-item-p"
                  :class="[getBookingForSlot(court.id, h).status, { 'is-new': getBookingForSlot(court.id, h).isNew }]"
                  :style="bookingCalendarBlockStyle(getBookingForSlot(court.id, h))"
                  @click.stop="onBlockClick(getBookingForSlot(court.id, h))"
                >
                  <div class="booking-inner-p">
                    <p class="b-name-p">{{ getBookingForSlot(court.id, h).customerName }}</p>
                    <p class="b-time-p">{{ getBookingForSlot(court.id, h).startTime }} - {{ getBookingForSlot(court.id, h).endTime }}</p>
                  </div>
                </div>

                <!-- Current time line -->
                <div
                  v-if="isToday && h === currentHourLabel"
                  class="now-line"
                  :style="{ top: nowLineTopPx + 'px' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'VisualCalendar',
  props: {
    courts:   { type: Array, default: () => [] },
    bookings: { type: Array, default: () => [] },
    loading:  { type: Boolean, default: false },
    newBookingId: { type: String, default: null },
  },
  emits: ['cell-click', 'date-change', 'block-click'],
  data() {
    const today = new Date();
    today.setHours(0,0,0,0);
    return {
      currentDate: today,
      startHour: 5,
      endHour: 23,
      nowMinute: 0,
    };
  },
  mounted() {
    this.updateNow();
    this._nowTimer = setInterval(this.updateNow, 60000);
  },
  beforeUnmount() {
    clearInterval(this._nowTimer);
  },
  computed: {
    timeSlots() {
      const slots = [];
      for (let i = this.startHour; i < this.endHour; i++) {
        slots.push(`${String(i).padStart(2, '0')}:00`);
      }
      return slots;
    },
    isToday() {
      const t = new Date(); t.setHours(0,0,0,0);
      return this.currentDate.getTime() === t.getTime();
    },
    displayDate() {
      return this.currentDate.toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
      });
    },
    currentHourLabel() {
      const h = new Date().getHours();
      return `${String(h).padStart(2, '0')}:00`;
    },
    nowLineTopPx() {
      const now = new Date();
      const minInHour = now.getMinutes();
      return (minInHour / 60) * 70; // 70px per row (match BookingsView)
    },
    /**
     * Gộp các timeSlot liên tiếp (cùng đơn + cùng sân) thành một segment —
     * tránh 2 ô chồng khi CLB dùng slot 30p nhưng mỗi hàng lịch = 1 giờ.
     */
    calendarSlotMap() {
      const TOL_MS = 60_000;

      const fmt = (d) => {
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      };
      const rowLabel = (d) => `${String(d.getHours()).padStart(2, '0')}:00`;

      const byBookingCourt = new Map(); // bookingId|courtId -> intervals
      for (const booking of this.bookings) {
        if (!booking.items?.length) continue;
        for (const item of booking.items) {
          const slot = item.timeSlot;
          if (!slot?.startTime || !slot?.endTime) continue;
          const courtId = slot.court?.id || slot.courtId;
          if (!courtId) continue;
          const key = `${booking.id}|${courtId}`;
          if (!byBookingCourt.has(key)) byBookingCourt.set(key, []);
          byBookingCourt.get(key).push({
            start: new Date(slot.startTime),
            end: new Date(slot.endTime),
            booking,
            courtId,
            courtName: slot.court?.name || '',
          });
        }
      }

      const map = Object.create(null);
      const pushCell = (booking, courtId, courtName, cur) => {
        const durMin = (cur.end.getTime() - cur.start.getTime()) / 60000;
        const spanHours = Math.max(1, Math.ceil(durMin / 60));
        const key = `${courtId}|${rowLabel(cur.start)}`;
        map[key] = {
          bookingId: booking.id,
          originalBooking: booking,
          courtId,
          courtName,
          customerName: booking.bookerName || booking.user?.fullName || 'Khách vãng lai',
          phone: booking.bookerPhone || booking.user?.phone || '',
          startTime: fmt(cur.start),
          endTime: fmt(cur.end),
          spanHours,
          status: booking.status,
          isNew: booking.id === this.newBookingId,
        };
      };

      for (const intervals of byBookingCourt.values()) {
        intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
        let cur = { start: new Date(intervals[0].start), end: new Date(intervals[0].end) };
        const booking = intervals[0].booking;
        const courtId = intervals[0].courtId;
        const courtName = intervals[0].courtName;
        for (let i = 1; i < intervals.length; i++) {
          const n = intervals[i];
          const gap = n.start.getTime() - cur.end.getTime();
          if (Math.abs(gap) <= TOL_MS) {
            if (n.end.getTime() > cur.end.getTime()) cur.end = new Date(n.end);
          } else {
            pushCell(booking, courtId, courtName, cur);
            cur = { start: new Date(n.start), end: new Date(n.end) };
          }
        }
        pushCell(booking, courtId, courtName, cur);
      }

      return map;
    },
  },
  methods: {
    updateNow() {
      const n = new Date();
      this.nowMinute = n.getMinutes();
    },
    toLocalDateStr(d) {
      // Dùng local time để tránh lệch ngày do múi giờ (UTC+7)
      const y  = d.getFullYear();
      const m  = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    },
    prevDay() {
      const d = new Date(this.currentDate);
      d.setDate(d.getDate() - 1);
      this.currentDate = d;
      this.$emit('date-change', this.toLocalDateStr(d));
    },
    nextDay() {
      const d = new Date(this.currentDate);
      d.setDate(d.getDate() + 1);
      this.currentDate = d;
      this.$emit('date-change', this.toLocalDateStr(d));
    },
    goToday() {
      const t = new Date(); t.setHours(0,0,0,0);
      this.currentDate = t;
      this.$emit('date-change', this.toLocalDateStr(t));
    },
    getBookingForSlot(courtId, hourLabel) {
      return this.calendarSlotMap[`${courtId}|${hourLabel}`] || null;
    },
    bookingCalendarBlockStyle(cell) {
      const span = cell?.spanHours || 1;
      const h = 70;
      return {
        minHeight: `${span * h - 8}px`,
        zIndex: span > 1 ? 2 : 1,
      };
    },
    statusClass(status) {
      const map = {
        CONFIRMED:      'st-confirmed',
        PENDING:        'st-pending',
        WAITING_PAYMENT:'st-waiting',
        COMPLETED:      'st-completed',
        CANCELLED:      'st-cancelled',
      };
      return map[status] || 'st-default';
    },
    statusLabel(status) {
      const map = {
        CONFIRMED:      'Đã xác nhận',
        PENDING:        'Chờ xác nhận',
        WAITING_PAYMENT:'Chờ thanh toán',
        COMPLETED:      'Hoàn thành',
        CANCELLED:      'Đã hủy',
      };
      return map[status] || status;
    },
    onHourCellClick(court, hourLabel) {
      const hour = Number(String(hourLabel).slice(0, 2));
      this.$emit('cell-click', { court, hour, date: this.currentDate, hourLabel });
    },
    onBlockClick(seg) {
      this.$emit('block-click', seg.originalBooking || seg);
    },
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap');

/* Borrowed calendar styles from Owner/BookingsView */
.calendar-card {
  background: white; border-radius: 28px; border: 1px solid #edf2f7; overflow: hidden;
  padding: 18px;
}
.cal-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.title-group { display: flex; align-items: center; gap: 10px; }
.title-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
.cal-title { font-family:'Barlow Condensed',sans-serif; font-size: 1.1rem; font-weight: 900; margin: 0; text-transform: uppercase; color:#0f172a; }

.cal-controls { display:flex; align-items:center; gap:8px; }
.nav-btn{
  width: 40px; height: 40px; border-radius: 12px; border: none;
  background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.nav-btn:hover { background: #e2e8f0; color: #10b981; }
.date-display{
  display:flex;align-items:center;gap:8px;background:#f8fafc;padding:10px 16px;border-radius:12px;border:1.5px solid #edf2f7;
}
.cal-icon{font-size:18px;color:#10b981;}
.date-text{font-weight:700;font-size:14px;color:#1e293b;}
.today-badge{
  font-size:10px;font-weight:900;color:#059669;background:#ecfdf5;padding:2px 8px;border-radius:999px;text-transform:uppercase;
}
.today-btn{height:40px;border-radius:12px;border:none;background:#059669;color:#fff;font-weight:800;padding:0 14px;cursor:pointer;}
.today-btn:hover{background:#047857;}

.calendar-scroll-x { overflow-x: auto; }
.calendar-grid-p { display: flex; min-width: 900px; font-family:'Lexend',sans-serif; }
.time-column-p { width: 80px; flex-shrink: 0; border-right: 1px solid #f1f5f9; }
.grid-header-p {
  height: 60px; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;
  border-bottom: 1px solid #f1f5f9; background: #fcfdfe;
}
.time-slot-p {
  height: 70px; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;
}
.court-columns-p { display: flex; flex: 1; }
.court-column-p { flex: 1; min-width: 160px; border-right: 1px solid #f1f5f9; }
.grid-header-p.court { flex-direction: column; }
.court-name-p { font-weight: 800; color: #0f172a; font-size: 14px; }
.court-type-p { font-size: 9px; color: #94a3b8; }
.slots-container-p { position: relative; }
.slot-cell-p {
  height: 70px;
  border-bottom: 1px solid #f1f5f9;
  position: relative;
  padding: 4px;
  overflow: visible;
  cursor: pointer;
  transition: background-color 0.2s;
}
.slot-cell-p:hover { background-color: #f0fdf4; }
.booking-item-p {
  position: absolute;
  left: 4px;
  right: 4px;
  top: 4px;
  min-height: calc(100% - 8px);
  border-radius: 10px;
  padding: 6px 10px;
  cursor: pointer;
  transition: .2s;
  overflow: hidden;
  border-left: 3px solid transparent;
  box-sizing: border-box;
}
.booking-item-p:hover { transform: scale(0.97); }
.booking-item-p.confirmed, .booking-item-p.CONFIRMED { background: #ecfdf5; color: #059669; border-left-color: #10b981; }
.booking-item-p.pending, .booking-item-p.PENDING, .booking-item-p.waiting_payment, .booking-item-p.WAITING_PAYMENT { background: #fffbeb; color: #d97706; border-left-color: #f59e0b; }
.booking-item-p.completed, .booking-item-p.COMPLETED { background: #f0fdf4; color: #16a34a; border-left-color: #22c55e; }
.booking-item-p.cancelled, .booking-item-p.CANCELLED { background: #fff1f2; color: #e11d48; border-left-color: #f43f5e; opacity: 0.6; }
.booking-item-p.is-new { animation: pulse-glow 2s ease-in-out 3; }
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  50%       { box-shadow: 0 0 0 4px rgba(5,150,105,.25), 0 3px 12px rgba(5,150,105,.3); }
}
.b-name-p { font-weight: 800; font-size: 11px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.b-time-p { font-size: 10px; font-weight: 600; margin: 1px 0 0 0; opacity: 0.8; }

.now-line {
  position: absolute; left: 0; right: 0; height: 2px;
  background: #ef4444; z-index: 2;
  box-shadow: 0 0 6px rgba(239,68,68,.4);
}
.now-line::before {
  content: '';
  position: absolute; left: -4px; top: -3px;
  width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
}

.cal-loading, .cal-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:28px 12px;color:#94a3b8;
}
.spinner-premium { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin: 10px auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.loader-text{margin:0;color:#64748b;font-weight:700;}
.empty-icon{font-size:40px;}

/* ── Transition ───────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

@media (max-width: 768px) {
  .cal-top{flex-direction:column;align-items:stretch;}
  .cal-controls{justify-content:center;flex-wrap:wrap;}
  .calendar-grid-p{min-width:720px;}
}

@media (max-width: 480px) {
  .today-btn {
    flex: 1 1 100%;
    text-align: center;
  }
}
</style>
