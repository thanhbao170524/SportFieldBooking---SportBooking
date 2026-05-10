<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass-modal" @click.stop>
      <div class="modal-header">
        <div class="modal-title-row">
          <ShieldAlert :size="18" class="modal-title-icon" />
          <h3>Gửi báo cáo / Góp ý</h3>
        </div>
        <button class="close-modal" @click="close"><X :size="18" /></button>
      </div>

      <div class="modal-body custom-scrollbar">
        <div class="form-group">
          <label class="form-label">Loại báo cáo</label>
          <select v-model="form.reason" class="form-select">
            <option value="" disabled>-- Chọn loại báo cáo --</option>
            <option value="Lỗi kỹ thuật">Lỗi kỹ thuật</option>
            <option value="Góp ý tính năng">Góp ý tính năng</option>
            <option value="Khiếu nại">Khiếu nại</option>
            <option value="Khác">Khác</option>
          </select>
        </div>

        <div class="form-group mt-4">
          <label class="form-label">Nội dung chi tiết</label>
          <textarea 
            v-model="form.content" 
            class="form-textarea" 
            placeholder="Mô tả chi tiết vấn đề bạn gặp phải hoặc ý kiến đóng góp..."
            rows="5"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" :disabled="loading" @click="close">Hủy</button>
        <button class="btn-primary" :disabled="loading || !form.reason || !form.content" @click="submit">
          <Send v-if="!loading" :size="16" />
          <Loader2 v-else :size="16" class="animate-spin" />
          Gửi báo cáo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ShieldAlert, X, Send, Loader2 } from 'lucide-vue-next';
import api from '@/api/axios';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'success']);

const loading = ref(false);
const form = reactive({
  reason: '',
  content: ''
});

const close = () => {
  form.reason = '';
  form.content = '';
  emit('close');
};

const submit = async () => {
  loading.value = true;
  try {
    await api.post('/reports', form);
    alert('Báo cáo của bạn đã được gửi tới hệ thống. Chúng tôi sẽ phản hồi sớm nhất có thể.');
    emit('success');
    close();
  } catch (error) {
    alert(error.response?.data?.message || 'Không thể gửi báo cáo lúc này.');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 22, 35, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.glass-modal {
  background: #ffffff;
  border-radius: 24px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
}

.modal-header {
  padding: 24px 28px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-row h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #0f1623;
}

.modal-title-icon {
  color: #10b981;
}

.close-modal {
  background: #f1f5f9;
  border: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}

.close-modal:hover {
  background: #fee2e2;
  color: #ef4444;
}

.modal-body {
  padding: 24px 28px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.form-select, .form-textarea {
  width: 100%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  color: #0f1623;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-select:focus, .form-textarea:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.modal-footer {
  padding: 0 28px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #ffffff;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 11px 24px;
  height: auto;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 11px 22px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}

.btn-secondary:hover {
  background: #f1f5f9;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
