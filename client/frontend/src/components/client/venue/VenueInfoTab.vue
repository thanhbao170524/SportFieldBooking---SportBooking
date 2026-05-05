<template>
  <div class="row g-4 bg-white shadow-sm p-4 vdp-panel-container">
    <div class="col-lg-8">
      <h4 class="fw-black mb-3">Giới thiệu về {{ venue.name }}</h4>
      <p class="text-muted" style="line-height:1.8">{{ venue.description }}</p>

      <!-- GALLERY (CLB) -->
      <div v-if="venueImages.length" class="vdp-gallery mt-4 mb-2">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="fw-bold mb-0">Hình ảnh sân</h5>
          <span class="text-muted small fw-semibold">{{ galleryIndex + 1 }} / {{ venueImages.length }}</span>
        </div>
        <div class="vdp-gallery__main position-relative overflow-hidden mb-3" style="height:380px;background:#0f172a;">
          <transition name="gfade" mode="out-in">
            <img :key="galleryIndex" :src="venueImages[galleryIndex]?.url" :alt="venueImages[galleryIndex]?.caption" class="position-absolute w-100 h-100" style="object-fit:cover;top:0;left:0;"/>
          </transition>
          <div class="position-absolute bottom-0 start-0 end-0" style="height:110px;background:linear-gradient(to top,rgba(0,0,0,.72) 0%,transparent 100%);pointer-events:none;z-index:2"></div>
          <div class="position-absolute bottom-0 start-0 px-4 pb-3" style="z-index:3">
            <span class="text-white fw-semibold d-flex align-items-center gap-2" style="font-size:14px;text-shadow:0 1px 6px rgba(0,0,0,.6)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {{ venueImages[galleryIndex]?.caption || 'Ảnh không có mô tả' }}
            </span>
          </div>
          <div class="position-absolute bottom-0 start-0 end-0 d-flex justify-content-center gap-1 pb-3" style="z-index:3;pointer-events:none">
            <span v-for="(_,i) in venueImages" :key="i" class="vdp-gal-dot" :class="{'vdp-gal-dot--active':i===galleryIndex}"></span>
          </div>
          <button class="vdp-gal-nav vdp-gal-nav--prev" @click="prevImage"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
          <button class="vdp-gal-nav vdp-gal-nav--next" @click="nextImage"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
        <div class="d-flex gap-2 pb-1" style="overflow-x:auto;scrollbar-width:thin;scrollbar-color:#e2e8f0 transparent;">
          <div v-for="(img,i) in venueImages" :key="i" class="vdp-gal-thumb flex-shrink-0 overflow-hidden" :class="{'vdp-gal-thumb--active':i===galleryIndex}" @click="galleryIndex=i">
            <img :src="img.url" :alt="img.caption" style="width:100%;height:100%;object-fit:cover;display:block;"/>
          </div>
        </div>
      </div>

      <!-- Ảnh từng sân -->
      <div v-if="courtsWithImages.length" class="vdp-court-photos mt-4 mb-2">
        <h5 class="fw-bold mb-3">Hình ảnh các sân</h5>
        <div v-for="court in courtsWithImages" :key="court.id" class="vdp-court-photo-block mb-4 pb-4 border-bottom border-light-subtle">
          <div class="d-flex align-items-center justify-content-between gap-3 mb-2 flex-wrap">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="fw-bold">{{ court.name }}</span>
              <span v-if="court.sportType" class="badge bg-secondary bg-opacity-10 text-muted fw-bold" style="font-size:10px">{{ formatSport(court.sportType) }}</span>
              <span class="text-muted small fw-semibold" v-if="court.images?.length">({{ court.images.length }} ảnh)</span>
            </div>
            <button
              v-if="(court.images?.length || 0) > 3"
              type="button"
              class="btn btn-sm btn-outline-success fw-bold"
              style="border-radius: 10px;"
              @click="openCourtGallery(court)"
            >
              Xem tất cả
            </button>
          </div>
          <div class="row g-2">
            <div v-for="(img, idx) in (court.images || []).slice(0,3)" :key="court.id + '-' + idx" class="col-6 col-md-4">
              <div class="ratio ratio-4x3 rounded-3 overflow-hidden border shadow-sm bg-light">
                <img :src="img.url" :alt="img.caption || court.name" class="w-100 h-100" style="object-fit:cover" loading="lazy" />
              </div>
              <div v-if="img.caption" class="small text-muted mt-1 text-truncate">{{ img.caption }}</div>
            </div>
          </div>
        </div>
      </div>

      <h5 class="fw-bold mt-4 mb-3">Giờ mở cửa</h5>
      <div v-for="(d,i) in venue.openingHours" :key="d.day" :class="['d-flex justify-content-between px-3 py-2 rounded-2', i%2===1?'bg-light':'']">
        <span class="fw-semibold small">{{ d.day }}</span>
        <span class="fw-bold small" :class="d.isClosed?'text-danger':'text-success'">{{ d.isClosed?'Đóng cửa':`${d.open} – ${d.close}` }}</span>
      </div>

      <h5 class="fw-bold mt-4 mb-3">Tiện ích sân</h5>
      <div class="row g-2">
        <div v-for="a in venue.amenities" :key="a.id" class="col-6 d-flex align-items-center gap-2">
          <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width:30px;height:30px;flex-shrink:0">
            <span class="material-icons" style="font-size: 16px;">{{ a.icon || 'done' }}</span>
          </div>
          <span class="small">{{ a.name }}</span>
          <span v-if="a.price > 0" class="badge rounded-pill bg-success-subtle text-success border border-success-subtle" style="font-size:10px">{{ formatPrice(a.price) }}</span>
          <span v-else class="text-muted" style="font-size:10px; font-style: italic;">Miễn phí</span>
        </div>
      </div>

      <!-- BẢN ĐỒ VỊ TRÍ -->
      <h5 class="fw-bold mt-4 mb-3">Vị trí & Bản đồ</h5>
      <div class="mb-3 d-flex align-items-center gap-2 text-muted small fw-semibold" style="line-height: 1.5">
        <svg style="flex-shrink:0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        {{ venue.address }}
      </div>
      <div class="overflow-hidden border shadow-sm" style="border-radius:12px; height: 320px;">
        <iframe 
          v-if="venue.address"
          width="100%" 
          height="100%" 
          frameborder="0" 
          style="border:0"
          :src="`https://maps.google.com/maps?q=${encodeURIComponent(venue.address)}&hl=vi&z=15&output=embed`" 
          allowfullscreen>
        </iframe>
      </div>
    </div>
    
    <div class="col-lg-4">
      <div class="vdp-sidebar card border-0">
        <div class="card-header py-3"><span class="fw-bold text-white">Đặt sân ngay</span></div>
        <div class="card-body"><button class="btn btn-success w-100 fw-bold" @click="$emit('switch-to-booking')">Chọn khung giờ →</button></div>
      </div>
    </div>
  </div>

  <!-- MODAL: Court images -->
  <transition name="fade">
    <div
      v-if="courtGallery.show"
      class="vdp-court-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Ảnh sân ${courtGallery.courtName}`"
      @click.self="closeCourtGallery"
    >
      <div class="vdp-court-modal__content">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
          <div class="fw-black">{{ courtGallery.courtName }}</div>
          <button type="button" class="btn btn-sm btn-light border" @click="closeCourtGallery" aria-label="Đóng">×</button>
        </div>

        <div class="vdp-court-modal__viewer position-relative overflow-hidden rounded-4 border bg-dark">
          <transition name="gfade" mode="out-in">
            <img
              :key="courtGallery.index"
              :src="courtGallery.images[courtGallery.index]?.url"
              :alt="courtGallery.images[courtGallery.index]?.caption || courtGallery.courtName"
              class="w-100 h-100"
              style="object-fit:contain; max-height: 70vh;"
            />
          </transition>

          <button class="vdp-court-modal__nav vdp-court-modal__nav--prev" type="button" @click="prevCourtImage" aria-label="Ảnh trước">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="vdp-court-modal__nav vdp-court-modal__nav--next" type="button" @click="nextCourtImage" aria-label="Ảnh tiếp theo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div class="vdp-court-modal__counter">
            {{ courtGallery.index + 1 }} / {{ courtGallery.images.length }}
          </div>
        </div>

        <div v-if="courtGallery.images.length > 1" class="d-flex gap-2 mt-3 pb-1" style="overflow-x:auto;scrollbar-width:thin;scrollbar-color:#e2e8f0 transparent;">
          <button
            v-for="(img, i) in courtGallery.images"
            :key="`thumb-${i}`"
            type="button"
            class="vdp-court-modal__thumb flex-shrink-0 p-0 border-0 bg-transparent"
            :style="i === courtGallery.index ? 'outline: 3px solid #22c55e; border-radius: 10px;' : 'outline: none;'"
            @click="courtGallery.index = i"
            :aria-label="`Xem ảnh ${i + 1}`"
          >
            <img :src="img.url" :alt="img.caption || courtGallery.courtName" style="width:92px;height:64px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0;display:block" />
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'VenueInfoTab',
  props: {
    venue: {
      type: Object,
      required: true
    },
    venueImages: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      galleryIndex: 0,
      courtGallery: {
        show: false,
        courtName: '',
        images: [],
        index: 0
      }
    }
  },
  computed: {
    courtsWithImages() {
      const courts = this.venue?.courts || [];
      return courts.filter(c => Array.isArray(c.images) && c.images.length > 0);
    }
  },
  methods: {
    formatSport(type) {
      if (!type) return '';
      const m = {
        FOOTBALL: 'Bóng đá',
        BADMINTON: 'Cầu lông',
        TENNIS: 'Tennis',
        PICKLEBALL: 'Pickleball',
        BASKETBALL: 'Bóng rổ',
        VOLLEYBALL: 'Bóng chuyền',
        OTHER: 'Khác'
      };
      return m[String(type).toUpperCase()] || type;
    },
    formatPrice(v) { return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(v); },
    prevImage() { this.galleryIndex=(this.galleryIndex-1+this.venueImages.length)%this.venueImages.length; },
    nextImage() { this.galleryIndex=(this.galleryIndex+1)%this.venueImages.length; },

    openCourtGallery(court) {
      const imgs = Array.isArray(court?.images) ? court.images : [];
      if (!imgs.length) return;
      this.courtGallery = {
        show: true,
        courtName: court.name || 'Sân',
        images: imgs,
        index: 0
      };
    },
    closeCourtGallery() {
      this.courtGallery.show = false;
    },
    prevCourtImage() {
      const n = this.courtGallery.images.length;
      if (!n) return;
      this.courtGallery.index = (this.courtGallery.index - 1 + n) % n;
    },
    nextCourtImage() {
      const n = this.courtGallery.images.length;
      if (!n) return;
      this.courtGallery.index = (this.courtGallery.index + 1) % n;
    }
  }
}
</script>

<style scoped>
.vdp-court-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(6px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.vdp-court-modal__content {
  width: min(980px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 25px 70px rgba(0,0,0,0.35);
}
.vdp-court-modal__viewer {
  min-height: 320px;
}
.vdp-court-modal__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(0,0,0,0.35);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vdp-court-modal__nav:hover { background: rgba(0,0,0,0.55); }
.vdp-court-modal__nav--prev { left: 12px; }
.vdp-court-modal__nav--next { right: 12px; }
.vdp-court-modal__counter {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: rgba(0,0,0,0.45);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  padding: 6px 10px;
  border-radius: 999px;
}

.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.gfade-enter-active, .gfade-leave-active { transition: opacity .22s ease; }
.gfade-enter-from, .gfade-leave-to { opacity: 0; }
</style>
