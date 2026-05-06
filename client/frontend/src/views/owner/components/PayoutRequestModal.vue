<template>
  <transition name="modal-fade">
    <div v-if="show" class="modal-overlay-p" @click.self="close">
      <div class="modal-card-p">
        <div class="modal-card__header-p">
          <div class="d-flex align-items-center gap-3">
            <div class="modal-icon-p blue"><span class="material-icons">account_balance</span></div>
            <div>
              <h2 class="modal-title-p">Yêu cầu rút tiền</h2>
              <span class="modal-subtitle-p">Rút tiền từ số dư ví về tài khoản ngân hàng của bạn.</span>
            </div>
          </div>
          <button class="modal-close-btn-p" @click="close">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="modal-card__body-p">
          <div class="alert-info-p mb-4">
            <span class="material-icons">info</span>
            <p>Yêu cầu rút tiền sẽ được Admin duyệt và chuyển khoản trong vòng 24-48h làm việc.</p>
          </div>

          <div class="balance-summary-p mb-4">
            <div class="b-item">
              <span class="b-label">Số dư hiện tại</span>
              <span class="b-value">{{ formatCurrency(availableBalance) }}</span>
            </div>
          </div>

          <form @submit.prevent="submitRequest" class="payout-form">
            <div class="form-group-p mb-4">
              <label class="label-p">Số tiền muốn rút (VND)</label>
              <div class="input-with-icon-p">
                <span class="material-icons">payments</span>
                <input 
                  v-model.number="form.amount" 
                  type="number" 
                  placeholder="Ví dụ: 1000000" 
                  class="input-p" 
                  required 
                  :max="availableBalance"
                  min="50000"
                />
              </div>
              <p class="form-hint-p">Tối thiểu 50.000đ. Tối đa bằng số dư ví.</p>
            </div>

            <div class="form-group-p mb-4">
              <label class="label-p">Ghi chú (Tùy chọn)</label>
              <textarea v-model="form.note" class="textarea-p" placeholder="Ví dụ: Rút tiền doanh thu tuần 1 tháng 5" rows="3"></textarea>
            </div>

            <div class="bank-preview-p card-alt-p">
              <div class="bank-header-p">
                <span class="material-icons">verified_user</span>
                <span>Tiền sẽ được chuyển về tài khoản:</span>
              </div>
              <div class="bank-details-p" v-if="bankInfo">
                <p class="bank-name">{{ bankInfo.bankName }}</p>
                <p class="bank-acc">{{ bankInfo.accountNumber }}</p>
                <p class="bank-owner">{{ bankInfo.accountName }}</p>
              </div>
              <div v-else class="text-danger-p">
                <span class="material-icons">warning</span>
                <span>Vui lòng cập nhật thông tin ngân hàng trong phần Cài đặt trước khi rút tiền.</span>
              </div>
            </div>

            <div class="modal-actions-p mt-4">
              <button type="button" class="btn-cancel-p" @click="close">Hủy bỏ</button>
              <button 
                type="submit" 
                class="btn-submit-p blue" 
                :disabled="loading || !canSubmit"
              >
                <span v-if="loading" class="spinner"></span>
                <span v-else>Gửi yêu cầu</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { toast } from 'vue3-toastify';
import { ownerFinanceService } from '@/services/ownerFinance.service';

export default {
  name: 'PayoutRequestModal',
  props: {
    show: Boolean,
    availableBalance: Number,
    bankInfo: Object
  },
  emits: ['close', 'success'],
  data() {
    return {
      loading: false,
      form: {
        amount: null,
        note: ''
      }
    };
  },
  computed: {
    canSubmit() {
      return this.form.amount >= 50000 && this.form.amount <= this.availableBalance && this.bankInfo?.accountNumber;
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.form.amount = this.availableBalance;
        this.form.note = '';
      }
    }
  },
  methods: {
    formatCurrency(val) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    },
    close() {
      this.$emit('close');
    },
    async submitRequest() {
      if (!this.canSubmit) return;
      
      this.loading = true;
      try {
        await ownerFinanceService.createPayoutRequest(this.form);
        toast.success('Yêu cầu rút tiền đã được gửi thành công!');
        this.$emit('success');
        this.close();
      } catch (e) {
        toast.error(e.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
/* Reuse styles from ManualBookingModal or centralize them */
.modal-overlay-p {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
  padding: 20px;
}
.modal-card-p {
  background: white; width: 100%; max-width: 500px;
  border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  overflow: hidden; animation: slideUp 0.3s ease-out;
}
.modal-card__header-p {
  padding: 24px; border-bottom: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: flex-start;
}
.modal-title-p { font-family: 'Barlow Condensed', sans-serif; font-size: 24px; font-weight: 800; margin: 0; color: #1e293b; text-transform: uppercase; }
.modal-subtitle-p { font-size: 14px; color: #64748b; margin-top: 4px; display: block; }
.modal-icon-p { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.modal-icon-p.blue { background: #eff6ff; color: #2563eb; }

.modal-card__body-p { padding: 24px; }
.alert-info-p { display: flex; gap: 12px; background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 12px; color: #0369a1; font-size: 13px; }
.alert-info-p p { margin: 0; }

.balance-summary-p { background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px dashed #cbd5e1; }
.b-item { display: flex; justify-content: space-between; align-items: center; }
.b-label { font-size: 14px; color: #64748b; font-weight: 600; }
.b-value { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; }

.form-group-p { display: flex; flex-direction: column; gap: 8px; }
.label-p { font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
.input-with-icon-p { position: relative; }
.input-with-icon-p .material-icons { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px; }
.input-p { width: 100%; padding: 12px 14px 12px 44px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; transition: all 0.2s; font-weight: 500; }
.input-p:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); outline: none; }
.textarea-p { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; resize: none; transition: all 0.2s; }
.textarea-p:focus { border-color: #3b82f6; outline: none; }
.form-hint-p { font-size: 11px; color: #94a3b8; margin: 0; }

.bank-preview-p { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 16px; border-radius: 16px; margin-top: 20px; }
.bank-header-p { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #be185d; margin-bottom: 8px; }
.bank-details-p p { margin: 2px 0; font-weight: 700; font-size: 14px; color: #1e293b; }
.bank-name { color: #be185d !important; font-size: 12px !important; }

.modal-actions-p { display: flex; gap: 12px; }
.btn-cancel-p { flex: 1; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-cancel-p:hover { background: #f8fafc; }
.btn-submit-p { flex: 2; padding: 12px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; transition: all 0.2s; color: white; display: flex; align-items: center; justify-content: center; }
.btn-submit-p.blue { background: #2563eb; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.3); }
.btn-submit-p:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
.btn-submit-p:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; }

.modal-close-btn-p { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s; }
.modal-close-btn-p:hover { background: #f1f5f9; color: #1e293b; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
