<template>
  <transition name="modal-fade">
    <div v-if="booking" class="modal-overlay-p" @click.self="$emit('close')">
      <div class="modal-card-p wide">
        <div class="modal-card__header-p">
          <div class="d-flex align-items-center gap-3">
            <div class="modal-icon-p"><span class="material-icons">receipt_long</span></div>
            <div>
              <h2 class="modal-title-p">Chi tiết Đơn hàng</h2>
              <span class="modal-booking-code">Mã đơn: #{{ booking.id }} ({{ booking.bookingCode }})</span>
            </div>
          </div>
          <button class="modal-close-btn-p" @click="$emit('close')">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="modal-card__body-p">
          <div class="row g-4">
            <!-- Left: Info -->
            <div class="col-md-7">
              <div class="detail-section-p">
                <h4 class="section-title-p">Thông tin khách hàng</h4>
                <div class="customer-info-card mb-4">
                  <div class="d-flex align-items-center gap-3">
                    <div class="u-avatar-large">{{ (booking.bookerName || 'K').charAt(0) }}</div>
                    <div>
                      <div class="cust-name">{{ booking.bookerName || booking.user?.fullName || 'Khách vãng lai' }}</div>
                      <div class="cust-meta">
                        <span class="material-icons">phone</span> {{ booking.bookerPhone || booking.user?.phone || 'N/A' }}
                      </div>
                      <div class="cust-meta">
                        <span class="material-icons">email</span> {{ booking.bookerEmail || booking.user?.email || 'N/A' }}
                      </div>
                    </div>
                  </div>
                </div>

                <h4 class="section-title-p">Sân & Thời gian</h4>
                <div class="venue-detail-card-p mb-4">
                  <div v-for="item in booking.items" :key="item.id" class="slot-item-p">
                    <div class="slot-info">
                      <span class="court-name-modal">{{ item.timeSlot?.court?.name || '—' }}</span>
                      <span class="slot-time-modal">{{ formatSlotTime(item.timeSlot) }}</span>
                    </div>
                    <div class="slot-price-modal">{{ formatCurrency(item.price) }}</div>
                  </div>
                </div>

                <div v-if="booking.note" class="note-section-p">
                  <h4 class="section-title-p">Ghi chú</h4>
                  <div class="note-box-p">{{ booking.note }}</div>
                </div>
              </div>
            </div>

            <!-- Right: Payment -->
            <div class="col-md-5">
              <div class="detail-section-p">
                <h4 class="section-title-p">Thanh toán & Trạng thái</h4>
                <div class="booking-status-card mb-4">
                  <div class="status-row">
                    <span class="label">Trạng thái đơn:</span>
                    <span :class="['status-pill-p', String(booking.status || '').toLowerCase()]">
                      {{ getStatusLabel(booking.status) }}
                    </span>
                  </div>
                  <div class="status-row mt-3">
                    <span class="label">Hình thức:</span>
                    <span class="value">{{ payLabel(booking.payment?.method) }}</span>
                  </div>
                </div>

                <div class="payment-summary-card-p">
                  <div class="summary-line-p">
                    <span>Tạm tính</span>
                    <span>{{ formatCurrency(booking.totalAmount) }}</span>
                  </div>
                  <div v-if="Number(booking.discountAmount || 0) > 0" class="summary-line-p discount">
                    <span>Giảm giá</span>
                    <span>-{{ formatCurrency(booking.discountAmount) }}</span>
                  </div>
                  <div class="summary-line-p total mt-3 pt-3">
                    <span>Tổng cộng</span>
                    <span class="total-val">{{ formatCurrency(booking.finalAmount) }}</span>
                  </div>
                </div>

                <div v-if="booking.payment?.proofImageUrl" class="proof-section mt-4">
                  <h4 class="section-title-p">Minh chứng thanh toán</h4>
                  <div class="proof-card-p" @click="openImage(booking.payment.proofImageUrl)">
                    <img :src="booking.payment.proofImageUrl" alt="Proof" />
                    <div class="proof-overlay-p">
                      <span class="material-icons">zoom_in</span>
                      <span>Xem ảnh lớn</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-card__footer-p">
          <div class="d-flex gap-2">
            <button
              v-if="booking.status === 'PENDING' || booking.status === 'WAITING_PAYMENT'"
              class="btn-premium btn-premium--emerald shadow-emerald flex-grow-1"
              @click="$emit('confirm-payment', booking.id)"
            >
              Xác nhận đã nhận tiền
            </button>
            <button
              v-if="booking.status === 'CONFIRMED'"
              class="btn-premium btn-premium--dark flex-grow-1"
              @click="$emit('complete', booking.id)"
            >
              Đánh dấu đã hoàn thành
            </button>
            <button
              v-if="['PENDING', 'WAITING_PAYMENT', 'CONFIRMED'].includes(booking.status)"
              class="btn-premium btn-premium--light text-danger"
              @click="$emit('cancel', booking.id)"
            >
              Hủy đơn
            </button>
            <button class="btn-premium btn-premium--light" @click="$emit('close')">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'BookingDetailModal',
  props: {
    booking: { type: Object, default: null },
  },
  emits: ['close', 'confirm-payment', 'complete', 'cancel'],
  methods: {
    formatCurrency(val) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val || 0));
    },
    formatSlotTime(slot) {
      if (!slot?.startTime || !slot?.endTime) return '—';
      const start = new Date(slot.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(slot.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${start} – ${end}`;
    },
    getStatusLabel(status) {
      const labels = {
        WAITING_PAYMENT: 'Chờ thanh toán',
        PENDING: 'Chờ xác nhận',
        CONFIRMED: 'Đã xác nhận',
        COMPLETED: 'Hoàn thành',
        CANCELLED: 'Đã hủy',
      };
      return labels[status] || status;
    },
    payLabel(method) {
      const map = {
        BANK_TRANSFER: 'Chuyển khoản',
        VNPAY: 'VNPAY',
        MOMO: 'MoMo',
        CREDIT_CARD: 'Thẻ QT',
        CASH: 'Tiền mặt',
      };
      return map[method] || 'Chưa chọn';
    },
    openImage(url) {
      if (!url) return;
      window.open(url, '_blank');
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

/* Copied from Owner/BookingsView modal styles for consistency */
.modal-overlay-p {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px); z-index: 2000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-card-p {
  background: white; border-radius: 32px; width: 100%; max-width: 800px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.15); overflow: hidden;
  display: flex; flex-direction: column; animation: modalIn .3s both;
}
@keyframes modalIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.modal-card__header-p { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
.modal-icon-p { width: 44px; height: 44px; border-radius: 12px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; }
.modal-title-p { font-weight: 800; font-size: 1.25rem; margin: 0; text-transform: uppercase; }
.modal-booking-code { font-size: 11px; font-weight: 700; color: #94a3b8; }
.modal-close-btn-p { border: none; background: #f1f5f9; border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: .2s; cursor: pointer; }
.modal-close-btn-p:hover { background: #fee2e2; color: #ef4444; }

.modal-card__body-p { padding: 24px; max-height: 70vh; overflow-y: auto; }
.section-title-p { font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.section-title-p::before { content: ''; width: 3px; height: 12px; background: #10b981; border-radius: 2px; }

.customer-info-card { background: #f8fafc; border-radius: 20px; padding: 16px; border: 1.5px solid #edf2f7; }
.u-avatar-large { width: 48px; height: 48px; border-radius: 14px; background: white; border: 1.5px solid #edf2f7; color: #10b981; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; }
.cust-name { font-weight: 900; font-size: 16px; margin-bottom: 4px; }
.cust-meta { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; font-weight: 500; }
.cust-meta .material-icons { font-size: 16px; color: #94a3b8; }

.venue-detail-card-p { background: #f8fafc; border-radius: 20px; padding: 4px; border: 1.5px solid #edf2f7; }
.slot-item-p { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: white; border-radius: 16px; margin: 8px; border: 1px solid #edf2f7; gap: 12px; }
.court-name-modal { font-weight: 800; font-size: 14px; display: block; }
.slot-time-modal { font-size: 12px; color: #64748b; font-weight: 600; }
.slot-price-modal { font-weight: 900; color: #059669; white-space: nowrap; }

.booking-status-card { background: #f1f5f9; border-radius: 20px; padding: 16px; }
.status-row { display: flex; justify-content: space-between; align-items: center; }
.status-row .label { font-size: 12px; font-weight: 800; color: #64748b; }
.status-row .value { font-size: 13px; font-weight: 800; }

.payment-summary-card-p { background: #1e293b; color: white; border-radius: 20px; padding: 20px; }
.summary-line-p { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: 500; color: #cbd5e1; }
.summary-line-p.total { border-top: 1px solid rgba(255,255,255,0.1); color: white; }
.total-val { font-weight: 900; font-size: 1.5rem; }

.modal-card__footer-p { padding: 20px 24px; border-top: 1px solid #f1f5f9; }

.proof-card-p { position: relative; border-radius: 20px; overflow: hidden; border: 2px dashed #e2e8f0; cursor: pointer; max-height: 200px; }
.proof-card-p img { width: 100%; height: auto; display: block; object-fit: cover; }
.proof-overlay-p { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; opacity: 0; transition: .2s; gap: 6px; font-weight: 700; }
.proof-card-p:hover .proof-overlay-p { opacity: 1; }

.note-box-p { background: #fffbeb; border-radius: 16px; padding: 12px 16px; border: 1px solid #fde68a; font-size: 13px; color: #92400e; font-weight: 500; }

.status-pill-p { padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
.status-pill-p.confirmed, .status-pill-p.CONFIRMED { background: #dcfce7; color: #059669; }
.status-pill-p.pending, .status-pill-p.PENDING, .status-pill-p.waiting_payment, .status-pill-p.WAITING_PAYMENT { background: #fef3c7; color: #d97706; }
.status-pill-p.completed, .status-pill-p.COMPLETED { background: #f0fdf4; color: #16a34a; }
.status-pill-p.cancelled, .status-pill-p.CANCELLED { background: #fee2e2; color: #b91c1c; }

.btn-premium { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: 14px; font-weight: 800; border: none; transition: .2s; font-size: 14px; cursor: pointer; }
.btn-premium--emerald { background: #059669; color: white; }
.btn-premium--emerald:hover { background: #047857; transform: translateY(-2px); }
.btn-premium--light { background: #f1f5f9; color: #475569; }
.btn-premium--light:hover { background: #e2e8f0; }
.btn-premium--dark { background: #1e293b; color: white; }
.btn-premium--dark:hover { background: #0f172a; }
.shadow-emerald { box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>

