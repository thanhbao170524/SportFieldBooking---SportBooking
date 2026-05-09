<template>
  <div class="location-picker">
    <div ref="mapContainer" class="map-container"></div>
    <div class="coords-display" v-if="latitude && longitude">
      <span class="material-icons">place</span>
      {{ latitude.toFixed(6) }}, {{ longitude.toFixed(6) }}
    </div>
    <div class="coords-display empty" v-else>
      <span class="material-icons">not_listed_location</span>
      Click trên bản đồ để chọn vị trí
    </div>
  </div>
</template>

<script>
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const VIETMAP_KEY = import.meta.env.VITE_VIETMAP_TILEMAP_KEY;
const VIETMAP_STYLE = `https://maps.vietmap.vn/api/maps/raster/styles/osm-bright/style.json?apikey=${VIETMAP_KEY}`;

export default {
  name: 'LocationPicker',
  props: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  data() {
    return {
      map: null,
      marker: null,
      latitude: this.lat,
      longitude: this.lng,
    };
  },
  mounted() {
    // Default to a central coordinate if null (e.g. Da Nang)
    const initLng = this.longitude || 108.2022;
    const initLat = this.latitude || 16.0544;

    this.map = new maplibregl.Map({
      container: this.$refs.mapContainer,
      style: VIETMAP_STYLE,
      center: [initLng, initLat],
      zoom: 12
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    if (this.latitude && this.longitude) {
      this.marker = new maplibregl.Marker({ color: '#10b981' })
        .setLngLat([this.longitude, this.latitude])
        .addTo(this.map);
    }

    this.map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      this.latitude = lat;
      this.longitude = lng;
      
      if (!this.marker) {
        this.marker = new maplibregl.Marker({ color: '#10b981' })
          .setLngLat([lng, lat])
          .addTo(this.map);
      } else {
        this.marker.setLngLat([lng, lat]);
      }

      this.$emit('update:location', { lat, lng });
    });
  },
  watch: {
    lat(newVal) {
      if (newVal !== this.latitude) {
        this.latitude = newVal;
        this.updateMarker();
      }
    },
    lng(newVal) {
      if (newVal !== this.longitude) {
        this.longitude = newVal;
        this.updateMarker();
      }
    }
  },
  methods: {
    updateMarker() {
      if (!this.map) return;
      if (this.latitude && this.longitude) {
        if (!this.marker) {
          this.marker = new maplibregl.Marker({ color: '#10b981' })
            .setLngLat([this.longitude, this.latitude])
            .addTo(this.map);
        } else {
          this.marker.setLngLat([this.longitude, this.latitude]);
        }
        this.map.flyTo({ center: [this.longitude, this.latitude] });
      }
    }
  },
  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  }
};
</script>

<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.map-container {
  width: 100%;
  height: 250px;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid #f1f5f9;
}
.coords-display {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: #10b981;
}
.coords-display.empty { color: #94a3b8; }
.coords-display .material-icons { font-size: 16px; }
</style>
