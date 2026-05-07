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
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.glass-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-tertiary);
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.modal-title-icon {
  color: var(--accent);
}

.close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-select, .form-textarea {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-select:focus, .form-textarea:focus {
  border-color: var(--accent);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: var(--bg-tertiary);
}

.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 0 16px;
  height: 38px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-primary);
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
