<template>
  <div class="app-shell">
    <component :is="layout">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </component>

    <div class="app-progress-bar" :class="{ 'app-progress-bar--loading': isProgressLoading }"></div>

    <Transition name="app-loader-fade">
      <div v-if="isGlobalLoading" class="app-page-loader" role="status" aria-live="polite" aria-label="Đang tải trang">
        <div class="app-page-loader__card">
          <div class="app-page-loader__spinner-wrapper">
            <span class="app-page-loader__spinner" aria-hidden="true"></span>
            <div class="app-page-loader__spinner-pulse"></div>
          </div>
          <div class="app-page-loader__content">
            <span class="app-page-loader__text">Đang kết nối...</span>
            <span class="app-page-loader__subtext">Vui lòng chờ trong giây lát</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
const default_layout = "default";
const LOADER_EVENT_NAME = "app:navigation-loading";

export default {
  data() {
    return {
      isGlobalLoading: false,
      isProgressLoading: false,
    };
  },
  created() {
    window.addEventListener(LOADER_EVENT_NAME, this.onNavigationLoading);
  },
  beforeUnmount() {
    window.removeEventListener(LOADER_EVENT_NAME, this.onNavigationLoading);
  },
  computed: {
    layout() {
      return (this.$route.meta.layout || default_layout) + "-layout";
    },
  },
  methods: {
    onNavigationLoading(event) {
      this.isGlobalLoading = !!event?.detail?.loading;
      this.isProgressLoading = !!event?.detail?.progress;
    },
  },
};
</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

:root {
  --primary-font: 'Barlow', sans-serif;
  --heading-font: 'Barlow Condensed', sans-serif;
  --bg: #e0e0e0;
  --card-bg: #e0e0e0;
  --border: transparent;
}

body, html {
  background-color: var(--bg) !important;
  margin: 0;
  padding: 0;
}

#app {
  font-family: var(--primary-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--bg);
}

.app-shell {
  position: relative;
  min-height: 100vh;
}

/* Top Progress Bar */
.app-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0;
  background: linear-gradient(90deg, #16a34a, #4ade80, #22c55e);
  z-index: 10000;
  transition: width 0.4s cubic-bezier(0.1, 0.5, 0.5, 1);
  box-shadow: 0 0 10px rgba(22, 163, 74, 0.5);
  opacity: 0;
  pointer-events: none;
}

.app-progress-bar--loading {
  width: 90%;
  opacity: 1;
  animation: app-progress-pulse 2s ease-in-out infinite;
}

@keyframes app-progress-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.app-page-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(224, 224, 224, 0.6);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.app-page-loader__card {
  display: inline-flex;
  align-items: center;
  gap: 20px;
  padding: 20px 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset;
  backdrop-filter: blur(16px);
}

.app-page-loader__spinner-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-page-loader__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(22, 163, 74, 0.1);
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: app-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  z-index: 2;
}

.app-page-loader__spinner-pulse {
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(22, 163, 74, 0.15);
  border-radius: 50%;
  animation: app-pulse 1.5s ease-out infinite;
}

.app-page-loader__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-page-loader__text {
  font-size: 1.1rem;
  color: #111827;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.app-page-loader__subtext {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.app-loader-fade-enter-active,
.app-loader-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.app-loader-fade-enter-from,
.app-loader-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes app-spin {
  to { transform: rotate(360deg); }
}

@keyframes app-pulse {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}

h1, h2, h3, h4, h5, h6, .display-font {
  font-family: var(--heading-font);
}
</style>