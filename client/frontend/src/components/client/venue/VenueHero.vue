<template>
  <section class="vdp-hero" :style="{ backgroundImage:`url(${venue.image})` }">
    <div class="vdp-hero__overlay"></div>
    <div class="container position-relative z-2 pb-5">
      <!-- B. Back & Breadcrumb -->
      <div class="mb-5">
        <button @click="$router.push('/')" class="btn btn-sm btn-light rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 shadow-lg fw-bold border-0" style="background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); letter-spacing: 0.5px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2c3e50" stroke-width="3"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Quay lại danh sách
        </button>
      </div>
      <div class="d-flex flex-wrap gap-2 mb-2">
        <span v-for="type in uniqueSports" :key="type" class="badge bg-success shadow-sm d-flex align-items-center gap-1">
          {{ getSportIcon(type) }} {{ translateSportType(type) }}
        </span>
      </div>
      <h1 class="fw-black text-white fs-2 mb-2">{{ venue.name }}</h1>
      <p class="text-white opacity-75 d-flex align-items-center gap-2 mb-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {{ venue.address }}
      </p>
      <div class="d-inline-flex gap-4 px-4 py-2 rounded-3 border border-white border-opacity-25" style="background:rgba(255,255,255,.13);backdrop-filter:blur(8px)">
        <div v-for="(s,i) in statItems" :key="i" class="d-flex align-items-center gap-3">
          <div v-if="i" class="vdp-sep"></div>
          <div class="text-center text-white">
            <div class="fw-bold fs-5">{{ s.v }}</div>
            <div class="small opacity-75">{{ s.l }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'VenueHero',
  props: {
    venue: {
      type: Object,
      required: true
    }
  },
  computed: {
    uniqueSports() {
      if (!this.venue.courts) return [];
      const types = this.venue.courts.map(c => c.sportType);
      return [...new Set(types)];
    },
    statItems() {
      const rating = Number(this.venue.rating || 0).toFixed(1);
      const reviews = this.venue.reviewCount || 0;
      
      // Lấy giờ mở cửa từ ngày đầu tiên hoặc mặc định
      let openHour = '05:00';
      if (this.venue.openingHours && this.venue.openingHours.length > 0) {
        const h = this.venue.openingHours[0];
        if (!h.isClosed) {
           openHour = h.open;
        }
      }

      return [
        { v: this.venue.courts?.length || 0, l: 'Sân' },
        { v: `${rating} ★`, l: `${reviews} đánh giá` },
        { v: openHour, l: 'Mở cửa' }
      ]
    }
  },
  methods: {
    translateSportType(type) {
      const labels = {
        FOOTBALL: 'Bóng đá',
        BADMINTON: 'Cầu lông',
        TENNIS: 'Tennis',
        PICKLEBALL: 'Pickleball',
        BASKETBALL: 'Bóng rổ',
        VOLLEYBALL: 'Bóng chuyền',
        OTHER: 'Khác'
      };
      return labels[type?.toUpperCase()] || type;
    },
    getSportIcon(type) {
      const icons = {
        FOOTBALL: '⚽',
        BADMINTON: '🏸',
        TENNIS: '🎾',
        PICKLEBALL: '🏓',
        BASKETBALL: '🏀',
        VOLLEYBALL: '🏐',
        OTHER: '🏟️'
      };
      return icons[type?.toUpperCase()] || '🏟️';
    }
  }
}
</script>
