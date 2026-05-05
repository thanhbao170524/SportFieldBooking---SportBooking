<template>
  <div class="services-view">
    <!-- Header Section -->
    <div class="vheader">
      <div class="vheader-left">
        <h1 class="vtitle">Quản lý Dịch vụ & Tiện ích</h1>
        <p class="vsub">Thiết lập các tiện ích miễn phí hoặc dịch vụ có phí cho các câu lạc bộ của bạn.</p>
      </div>
      <div class="club-selector-wrap">
        <label for="club-select" class="selector-label">Chọn câu lạc bộ:</label>
        <div class="select-custom">
          <span class="material-icons select-icon">business</span>
          <select id="club-select" v-model="selectedClubId" @change="onClubChange" :disabled="loadingClubs">
            <option v-if="loadingClubs" value="" disabled>Đang tải danh sách...</option>
            <option v-else-if="!clubs.length" value="" disabled>Chưa có câu lạc bộ nào</option>
            <option v-for="club in clubs" :key="club.id" :value="club.id">
              {{ club.name }}
            </option>
          </select>
          <span class="material-icons select-arrow">expand_more</span>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div v-if="!selectedClubId && !loadingClubs" class="empty-state">
      <div class="empty-glass">
        <div class="empty-icon"><span class="material-icons">room_service</span></div>
        <h3>Vui lòng chọn câu lạc bộ</h3>
        <p>Chọn một câu lạc bộ từ danh sách phía trên để bắt đầu thiết lập dịch vụ.</p>
      </div>
    </div>

    <div v-else class="content-grid">
      <!-- Loading State -->
      <div v-if="loadingAmenities" class="loading-overlay">
        <div class="spinner"></div>
        <p>Đang tải dữ liệu dịch vụ...</p>
      </div>

      <!-- Services Grid -->
      <template v-else>
        <div class="services-grid">
          <div 
            v-for="service in amenities" 
            :key="service.id" 
            class="service-card" 
            :class="{ active: service.isSelected }"
          >
            <div class="card-header" @click="toggleService(service)">
              <div class="service-icon-box">
                <span class="material-icons">{{ service.icon || 'star' }}</span>
              </div>
              <div class="service-info">
                <h3 class="service-name">{{ service.name }}</h3>
                <span class="status-badge" :class="service.isSelected ? 'enabled' : 'disabled'">
                  {{ service.isSelected ? 'Đang bật' : 'Đang tắt' }}
                </span>
              </div>
              <div class="toggle-switch">
                <div class="switch-slider"></div>
              </div>
            </div>

            <div class="card-body" v-if="service.isSelected">
              <div class="price-input-wrap">
                <label>Phí dịch vụ (VNĐ)</label>
                <div class="input-with-unit">
                  <input 
                    type="number" 
                    v-model.number="service.price" 
                    placeholder="0" 
                    min="0"
                    step="1000"
                  />
                  <span class="unit">đ</span>
                </div>
                <p class="hint">Nhập 0 nếu đây là tiện ích miễn phí.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Footer for Save -->
        <div class="sticky-footer" :class="{ visible: hasChanges }">
          <div class="footer-content">
            <p class="change-notice">Bạn có thay đổi chưa lưu cho <strong>{{ currentClubName }}</strong></p>
            <div class="footer-actions">
              <button class="btn-sec" @click="resetChanges" :disabled="saving">Hủy</button>
              <button class="btn-primary" @click="saveChanges" :disabled="saving">
                <span v-if="saving" class="spin"></span>
                <span v-else class="material-icons">save</span>
                {{ saving ? 'Đang lưu...' : 'Lưu thiết lập' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { clubService } from '@/services/club.service';
import { toast } from 'vue3-toastify';

export default {
  name: 'ServicesView',
  data() {
    return {
      clubs: [],
      selectedClubId: '',
      amenities: [],
      originalAmenities: [],
      loadingClubs: false,
      loadingAmenities: false,
      saving: false,
    };
  },
  computed: {
    currentClubName() {
      const club = this.clubs.find(c => c.id === this.selectedClubId);
      return club ? club.name : '';
    },
    hasChanges() {
      if (!this.amenities.length || !this.originalAmenities.length) return false;
      return JSON.stringify(this.amenities) !== JSON.stringify(this.originalAmenities);
    }
  },
  async mounted() {
    await this.loadClubs();
  },
  methods: {
    async loadClubs() {
      this.loadingClubs = true;
      try {
        const res = await clubService.getOwnerClubs();
        if (res.data?.success) {
          this.clubs = res.data.data || [];
          if (this.clubs.length > 0) {
            this.selectedClubId = this.clubs[0].id;
            await this.loadAmenities();
          }
        }
      } catch (err) {
        toast.error('Không thể tải danh sách câu lạc bộ');
      } finally {
        this.loadingClubs = false;
      }
    },
    async loadAmenities() {
      if (!this.selectedClubId) return;
      this.loadingAmenities = true;
      try {
        const res = await clubService.getClubAmenities(this.selectedClubId);
        if (res.data?.success) {
          // Clone data to track changes
          this.amenities = JSON.parse(JSON.stringify(res.data.data || []));
          this.originalAmenities = JSON.parse(JSON.stringify(this.amenities));
        }
      } catch (err) {
        toast.error('Không thể tải danh sách dịch vụ');
      } finally {
        this.loadingAmenities = false;
      }
    },
    onClubChange() {
      if (this.hasChanges) {
        if (!confirm('Bạn có thay đổi chưa lưu. Tiếp tục sẽ làm mất các thay đổi này?')) {
          this.selectedClubId = this.originalClubId; // Cần lưu originalClubId
          return;
        }
      }
      this.loadAmenities();
    },
    toggleService(service) {
      service.isSelected = !service.isSelected;
      if (!service.isSelected) {
        service.price = 0;
      }
    },
    resetChanges() {
      this.amenities = JSON.parse(JSON.stringify(this.originalAmenities));
    },
    async saveChanges() {
      if (!this.selectedClubId) return;
      this.saving = true;
      try {
        // Prepare payload: only send the items that are selected
        const payload = this.amenities
          .filter(a => a.isSelected)
          .map(a => ({
            amenityId: a.id,
            price: a.price || 0
          }));

        const res = await clubService.updateClubAmenities(this.selectedClubId, payload);
        if (res.data?.success) {
          toast.success('Cập nhật dịch vụ thành công!');
          this.originalAmenities = JSON.parse(JSON.stringify(this.amenities));
        } else {
          toast.error(res.data?.message || 'Cập nhật thất bại');
        }
      } catch (err) {
        toast.error('Lỗi khi lưu thiết lập');
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.services-view {
  padding: 24px;
  min-height: 100vh;
  font-family: 'DM Sans', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.vheader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 20px;
  flex-wrap: wrap;
}

.vtitle {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.vsub {
  color: #64748b;
  margin: 0;
  font-size: 15px;
}

/* Club Selector */
.club-selector-wrap {
  background: white;
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #f1f5f9;
}

.selector-label {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
}

.select-custom {
  position: relative;
  min-width: 240px;
}

.select-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #16a34a;
  font-size: 20px;
  pointer-events: none;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.select-custom select {
  width: 100%;
  padding: 10px 40px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s;
}

.select-custom select:focus {
  outline: none;
  border-color: #16a34a;
  background: white;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1);
}

/* Content Grid */
.content-grid {
  position: relative;
  min-height: 400px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding-bottom: 100px;
}

/* Service Card */
.service-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
  border-color: #cbd5e1;
}

.service-card.active {
  border-color: #16a34a;
  background: #f0fdf4;
}

.card-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.service-icon-box {
  width: 52px;
  height: 52px;
  background: #f1f5f9;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.3s;
}

.active .service-icon-box {
  background: #16a34a;
  color: white;
  box-shadow: 0 8px 16px rgba(22, 163, 74, 0.2);
}

.service-info {
  flex: 1;
}

.service-name {
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  text-transform: uppercase;
}

.status-badge.enabled {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

/* Toggle Switch */
.toggle-switch {
  width: 44px;
  height: 24px;
  background: #e2e8f0;
  border-radius: 20px;
  position: relative;
  transition: all 0.3s;
}

.active .toggle-switch {
  background: #16a34a;
}

.switch-slider {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.active .switch-slider {
  left: 23px;
}

/* Card Body */
.card-body {
  padding: 0 20px 20px;
  border-top: 1px dashed #cbd5e1;
  background: #ffffff;
}

.price-input-wrap {
  margin-top: 16px;
}

.price-input-wrap label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
}

.input-with-unit {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.input-with-unit:focus-within {
  border-color: #16a34a;
  background: white;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1);
}

.input-with-unit input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  outline: none;
}

.input-with-unit .unit {
  padding: 0 16px;
  font-weight: 700;
  color: #94a3b8;
  background: #f1f5f9;
  height: 100%;
  display: flex;
  align-items: center;
}

.hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 6px 0 0;
}

/* Sticky Footer */
.sticky-footer {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  width: min(90%, 800px);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  padding: 16px 24px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.sticky-footer.visible {
  transform: translateX(-50%) translateY(0);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.change-notice {
  color: white;
  margin: 0;
  font-size: 15px;
}

.change-notice strong {
  color: #4ade80;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* Buttons */
.btn-primary {
  background: #16a34a;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #15803d;
  transform: scale(1.02);
}

.btn-sec {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sec:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Empty Glass State */
.empty-glass {
  background: white;
  border-radius: 32px;
  padding: 80px 40px;
  text-align: center;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
}

.empty-icon {
  width: 100px;
  height: 100px;
  background: #f0fdf4;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32px;
  color: #16a34a;
}

.empty-icon .material-icons {
  font-size: 48px;
}

.empty-glass h3 {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px;
}

.empty-glass p {
  color: #64748b;
  font-size: 16px;
  max-width: 400px;
  margin: 0 auto;
}

/* Utils */
.spin {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f1f5f9;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .services-view {
    padding: 16px;
  }
  
  .vheader {
    flex-direction: column;
    align-items: stretch;
  }
  
  .select-custom {
    min-width: 100%;
  }
  
  .sticky-footer {
    width: calc(100% - 32px);
    bottom: 16px;
  }
  
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
