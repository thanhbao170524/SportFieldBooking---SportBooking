<template>
  <transition name="modal-fade">
    <div v-if="show" class="modal-overlay-p" @click.self="close">
      <div class="modal-card-p">
        <div class="modal-card__header-p">
          <div class="d-flex align-items-center gap-3">
            <div class="modal-icon-p emerald"><span class="material-icons">add_task</span></div>
            <div>
              <h2 class="modal-title-p">Đặt sân tại quầy</h2>
              <span class="modal-subtitle-p">Ghi nhận đơn đặt sân trực tiếp cho khách vãng lai.</span>
            </div>
          </div>
          <button class="modal-close-btn-p" @click="close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="modal-card__body-p">
          <form @submit.prevent="submitManualBooking" class="manual-booking-form">
            <div class="row g-4">
              <!-- Cột trái: Thông tin khách -->
              <div class="col-md-6">
                <h4 class="section-title-p mb-3">Thông tin khách hàng</h4>
                <div class="form-group-p mb-3">
                  <label class="label-p">Họ tên khách hàng <span class="text-danger">*</span></label>
                  <div class="input-with-icon-p">
                    <span class="material-icons">person</span>
                    <input v-model="form.bookerName" type="text" placeholder="Nguyễn Văn A" class="input-p" required />
                  </div>
                </div>
                <div class="form-group-p mb-3">
                  <label class="label-p">Số điện thoại <span class="text-danger">*</span></label>
                  <div class="input-with-icon-p">
                    <span class="material-icons">phone</span>
                    <input v-model="form.bookerPhone" type="tel" placeholder="09xxxxxxxx" class="input-p" required />
                  </div>
                </div>
                <div class="form-group-p mb-3">
                  <label class="label-p">Email (không bắt buộc)</label>
                  <div class="input-with-icon-p">
                    <span class="material-icons">email</span>
                    <input v-model="form.bookerEmail" type="email" placeholder="khachhang@gmail.com" class="input-p" />
                  </div>
                </div>
                <div class="form-group-p mb-3">
                  <label class="label-p">Ghi chú</label>
                  <textarea v-model="form.note" class="input-p" rows="2" placeholder="VD: Khách mượn thêm 2 áo tập..."></textarea>
                </div>
                
                <div class="payment-status-toggle mt-4 p-3 rounded-3 border">
                   <div class="d-flex align-items-center justify-content-between">
                      <div>
                         <div class="fw-bold">Trạng thái thanh toán</div>
                         <div class="small text-muted">Đánh giá đơn đã trả tiền mặt tại quầy chưa?</div>
                      </div>
                      <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" v-model="form.isPaid" id="paidSwitch">
                        <label class="form-check-label fw-bold" :class="form.isPaid ? 'text-success' : 'text-danger'" for="paidSwitch">
                           {{ form.isPaid ? 'Đã thu tiền' : 'Chưa thu tiền' }}
                        </label>
                      </div>
                   </div>
                </div>
              </div>

              <!-- Cột phải: Chọn sân & giờ -->
              <div class="col-md-6">
                <h4 class="section-title-p mb-3">Chi tiết đặt sân (Ngày {{ formattedDate }})</h4>
                
                <div class="slots-selector-card p-3 rounded-3 border bg-light">
                   <div class="mb-3">
                      <label class="label-p">Chọn sân <span class="text-danger">*</span></label>
                      <select v-model="currentSlot.courtId" class="select-p w-100">
                         <option value="">-- Chọn sân --</option>
                         <option v-for="court in courts" :key="court.id" :value="court.id">{{ court.name }} ({{ court.sportType }})</option>
                      </select>
                   </div>
                   
                   <div class="row g-2 mb-3">
                      <div class="col-6">
                         <label class="label-p">Giờ bắt đầu</label>
                         <input v-model="currentSlot.time" type="time" class="input-p w-100" />
                      </div>
                      <div class="col-6 d-flex align-items-end">
                         <button type="button" @click="addSlot" class="btn-premium btn-premium--emerald w-100" :disabled="!currentSlot.courtId || !currentSlot.time">
                            <span class="material-icons">add</span> Thêm
                         </button>
                      </div>
                   </div>

                   <!-- Danh sách slot đã chọn -->
                   <div class="selected-slots-list mt-3">
                      <div v-if="form.slots.length === 0" class="text-center py-4 text-muted small">
                         Chưa có khung giờ nào được chọn.
                      </div>
                      <div v-for="(s, idx) in form.slots" :key="idx" class="selected-slot-item d-flex align-items-center justify-content-between p-2 mb-2 bg-white rounded border">
                         <div class="d-flex align-items-center gap-2">
                            <span class="material-icons text-success" style="font-size: 18px;">check_circle</span>
                            <div class="small">
                               <div class="fw-bold">{{ getCourtName(s.courtId) }}</div>
                               <div class="text-muted">{{ s.startTimeDisplay }} ({{ slotDuration }} phút)</div>
                            </div>
                         </div>
                         <button type="button" @click="removeSlot(idx)" class="btn-remove-slot">
                            <span class="material-icons">delete_outline</span>
                         </button>
                      </div>
                   </div>
                </div>

                <div class="total-preview mt-4">
                   <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="text-muted">Tổng số khung giờ:</span>
                      <span class="fw-bold">{{ form.slots.length }}</span>
                   </div>
                   <!-- <div class="d-flex justify-content-between align-items-center">
                      <span class="text-muted">Tổng tiền dự tính:</span>
                      <span class="text-danger fw-bold fs-5">{{ formatCurrency(totalEstimatedPrice) }}</span>
                   </div> -->
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-card__footer-p">
          <div class="d-flex justify-content-end gap-2">
            <button class="btn-premium btn-premium--light" @click="close" :disabled="isSubmitting">Hủy bỏ</button>
            <button 
              class="btn-premium btn-premium--emerald shadow-emerald px-5" 
              @click="submitManualBooking"
              :disabled="isSubmitting || form.slots.length === 0 || !form.bookerName || !form.bookerPhone"
            >
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
              <span>XÁC NHẬN ĐẶT SÂN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { bookingService } from '@/services/booking.service';
import { toast } from 'vue3-toastify';

export default {
  name: 'ManualBookingModal',
  props: {
    show: Boolean,
    clubId: String,
    courts: Array,
    selectedDate: Date, 
    slotDuration: { type: Number, default: 60 },
    prefill: Object // { courtId, time }
  },
  data() {
    return {
      isSubmitting: false,
      form: {
        clubId: '',
        bookerName: '',
        bookerPhone: '',
        bookerEmail: '',
        note: '',
        isPaid: true,
        slots: []
      },
      currentSlot: {
        courtId: '',
        time: '17:00'
      }
    }
  },
  computed: {
    formattedDate() {
      if (!this.selectedDate) return '';
      return this.selectedDate.toLocaleDateString('vi-VN');
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.resetForm();
        this.form.clubId = this.clubId;
        
        if (this.prefill) {
           this.currentSlot.courtId = this.prefill.courtId;
           this.currentSlot.time = this.prefill.time;
           // Tự động add luôn
           this.addSlot();
        } else {
           const now = new Date();
           this.currentSlot.time = `${String(now.getHours()).padStart(2, '0')}:00`;
        }
      }
    }
  },
  methods: {
    resetForm() {
      this.form = {
        clubId: this.clubId,
        bookerName: '',
        bookerPhone: '',
        bookerEmail: '',
        note: '',
        isPaid: true,
        slots: []
      };
      this.currentSlot = { courtId: '', time: '17:00' };
    },
    close() {
      this.$emit('close');
    },
    getCourtName(id) {
      const c = this.courts.find(item => item.id === id);
      return c ? c.name : 'Sân';
    },
    addSlot() {
      if (!this.currentSlot.courtId || !this.currentSlot.time) return;
      
      // Chuyển đổi time sang ISO date dựa trên selectedDate
      const [h, m] = this.currentSlot.time.split(':').map(Number);
      const startTime = new Date(this.selectedDate);
      startTime.setHours(h, m, 0, 0);

      // Kiểm tra trùng lặp trong list tạm
      const exists = this.form.slots.some(s => s.courtId === this.currentSlot.courtId && s.startTime === startTime.toISOString());
      if (exists) {
        toast.warning("Khung giờ này đã được thêm vào danh sách");
        return;
      }

      this.form.slots.push({
        courtId: this.currentSlot.courtId,
        startTime: startTime.toISOString(),
        startTimeDisplay: this.currentSlot.time
      });
      
      // Reset current slot court but keep time for convenience
      // this.currentSlot.courtId = '';
    },
    removeSlot(idx) {
      this.form.slots.splice(idx, 1);
    },
    async submitManualBooking() {
      if (this.form.slots.length === 0) return;
      
      this.isSubmitting = true;
      try {
        const payload = {
          ...this.form,
          // Chỉ gửi data backend cần
          slots: this.form.slots.map(s => ({ courtId: s.courtId, startTime: s.startTime }))
        };
        
        const res = await bookingService.createManualBooking(payload);
        if (res.success) {
          toast.success("Đặt sân tại quầy thành công!");
          this.$emit('success');
          this.close();
        }
      } catch (error) {
        console.error("Manual Booking Error:", error);
        toast.error(error.response?.data?.message || "Đặt sân thất bại. Vui lòng kiểm tra lại khung giờ.");
      } finally {
        this.isSubmitting = false;
      }
    },
    formatCurrency(val) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    }
  }
}
</script>

<style scoped>
.modal-overlay-p {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; padding: 20px;
}

.modal-card-p {
  background: white; width: 100%; max-width: 800px;
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: modal-up 0.3s ease-out;
}

@keyframes modal-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-card__header-p {
  padding: 24px; border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(to right, #f8fafc, #ffffff);
}

.modal-icon-p {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; color: #64748b;
}
.modal-icon-p.emerald { background: #ecfdf5; color: #10b981; }

.modal-title-p { font-size: 20px; font-weight: 800; margin: 0; color: #0f172a; }
.modal-subtitle-p { font-size: 13px; color: #64748b; }

.modal-close-btn-p {
  background: transparent; border: none; color: #94a3b8;
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.modal-close-btn-p:hover { background: #f1f5f9; color: #0f172a; }

.modal-card__body-p { padding: 24px; max-height: 70vh; overflow-y: auto; }

.section-title-p { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

.label-p { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }

.input-with-icon-p { position: relative; }
.input-with-icon-p .material-icons {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  font-size: 18px; color: #94a3b8;
}
.input-p, .select-p {
  width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px;
  padding: 10px 12px; font-size: 14px; font-weight: 500;
  transition: all 0.2s; background: white;
}
.input-with-icon-p .input-p { padding-left: 40px; }
.input-p:focus, .select-p:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }

.btn-remove-slot {
  background: transparent; border: none; color: #ef4444;
  padding: 4px; border-radius: 6px; display: flex; transition: all 0.2s;
}
.btn-remove-slot:hover { background: #fee2e2; }

.modal-card__footer-p { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; }

/* REUSABLE PREMIUM BUTTONS FROM VIEW */
.btn-premium {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 20px; border-radius: 12px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.25s;
}
.btn-premium--emerald { background: #10b981; color: white; }
.btn-premium--emerald:hover { background: #059669; transform: translateY(-2px); }
.btn-premium--light { background: white; border: 1.5px solid #e2e8f0; color: #64748b; }
.btn-premium--light:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }

.shadow-emerald { box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
</style>
