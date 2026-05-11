<template>
  <div class="profile-page">
    <div v-if="!user && loadingInitial" class="initial-loader">
      <div class="spinner-grow text-emerald" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
    
    <div v-else class="container py-xl-5 py-4">
      <div class="row g-4">
        <!-- ── SIDEBAR / NAVIGATION ── -->
        <div class="col-lg-4 col-xl-3">
          <aside class="profile-sidebar sticky-sidebar">
            <div class="profile-card text-center overflow-hidden">
              <div class="profile-card__banner"></div>
              <div class="profile-card__content">
                <div class="avatar-wrapper mx-auto" @click="triggerAvatar">
                  <img :src="user?.avatarUrl || defaultAvatar" class="profile-avatar" :alt="user?.fullName" />
                  <div class="avatar-overlay">
                    <span class="material-icons">photo_camera</span>
                  </div>
                  <input type="file" ref="avatarInput" class="d-none" @change="handleAvatarChange" accept="image/*" />
                </div>
                
                <div class="mt-3 px-3">
                  <h3 class="profile-name">{{ user?.fullName }}</h3>
                  <div class="profile-email">
                     <span class="material-icons size-14">email</span>
                     {{ user?.email }}
                  </div>
                </div>

                <div class="profile-stats mt-4">
                  <div class="stat-item">
                    <span class="stat-value">{{ userPosts.length }}</span>
                    <span class="stat-label">Bài đăng</span>
                  </div>
                  <div class="stat-divider"></div>
                  <div class="stat-item">
                    <span class="stat-value">{{ favoriteVenues.length }}</span>
                    <span class="stat-label">Đã lưu</span>
                  </div>
                </div>
                
                <nav class="profile-nav mt-4">
                  <button 
                    v-for="item in navItems" 
                    :key="item.id" 
                    :class="['nav-item-btn', { active: activeTab === item.id }]"
                    @click="activeTab = item.id"
                  >
                    <div class="nav-item-icon" :class="item.id">
                      <span class="material-icons">{{ item.icon }}</span>
                    </div>
                    <span class="nav-item-label">{{ item.label }}</span>
                    <div v-if="item.id === 'notifications' && unreadCount > 0" class="nav-badge">{{ unreadCount }}</div>
                  </button>
                </nav>

                <div class="mt-4 pt-2 mb-2 px-3 d-flex flex-column gap-2">
                  <button class="btn-report-p" @click="showReportModal = true">
                    <span class="material-icons">report_problem</span>
                    <span>Góp ý / Báo cáo</span>
                  </button>

                  <button class="btn-logout" @click="handleLogout">
                    <span class="material-icons">logout</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- REPORT MODAL -->
        <ReportModal :is-open="showReportModal" @close="showReportModal = false" />

        <!-- ── MAIN CONTENT AREA ── -->
        <main class="col-lg-8 col-xl-9">
          <div class="content-card">
            
            <!-- ── TAB: PERSONAL INFORMATION ── -->
            <transition name="fade-slide" mode="out-in">
              <div v-if="activeTab === 'personal'" key="personal" class="tab-pane">
                <header class="tab-header">
                  <div class="tab-header__icon personal">
                    <span class="material-icons">person</span>
                  </div>
                  <div class="tab-header__text">
                    <h1 class="tab-title">Thông tin cá nhân</h1>
                    <p class="tab-subtitle">Cập nhật thông tin của bạn để có trải nghiệm tốt hơn</p>
                  </div>
                </header>

                <form @submit.prevent="updateProfile" class="mt-4">
                  <div class="row g-4">
                    <div class="col-md-6">
                      <div class="form-group-p">
                        <label class="form-label-p">Họ và tên</label>
                        <input v-model="form.fullName" type="text" class="form-control-p" :class="{ 'is-invalid-p': errors.fullName }" placeholder="Nguyễn Văn A" @input="validateField('fullName')" required />
                        <span v-if="errors.fullName" class="error-text-p">{{ errors.fullName }}</span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group-p">
                        <label class="form-label-p">Số điện thoại</label>
                        <input v-model="form.phone" type="tel" class="form-control-p" :class="{ 'is-invalid-p': errors.phone }" placeholder="0123 456 789" @input="validateField('phone')" />
                        <span v-if="errors.phone" class="error-text-p">{{ errors.phone }}</span>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group-p">
                        <label class="form-label-p">Địa chỉ hiện tại</label>
                        <textarea v-model="form.address" class="form-control-p" :class="{ 'is-invalid-p': errors.address }" rows="2" placeholder="Số nhà, tên đường, Phường/Xã..." @input="validateField('address')"></textarea>
                        <span v-if="errors.address" class="error-text-p">{{ errors.address }}</span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group-p">
                        <label class="form-label-p">Ngày sinh nhật</label>
                        <div class="input-with-icon">
                          <input v-model="form.dateOfBirth" type="date" class="form-control-p" :class="{ 'is-invalid-p': errors.dateOfBirth }" @input="validateField('dateOfBirth')" />
                        </div>
                        <span v-if="errors.dateOfBirth" class="error-text-p">{{ errors.dateOfBirth }}</span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="form-group-p">
                        <label class="form-label-p">Giới tính</label>
                        <div class="select-wrapper-p">
                          <select v-model="form.gender" class="form-control-p">
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="form-group-p">
                        <label class="form-label-p">Tiểu sử & Giới thiệu</label>
                        <textarea v-model="form.bio" class="form-control-p" :class="{ 'is-invalid-p': errors.bio }" rows="4" placeholder="Chia sẻ về sở thích, trình độ chơi thể thao của bạn..." @input="validateField('bio')"></textarea>
                        <span v-if="errors.bio" class="error-text-p">{{ errors.bio }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mt-5 pt-3 d-flex justify-content-end border-top-dashed">
                    <button type="submit" class="btn-premium btn-premium--emerald" :disabled="saving">
                      <span v-if="!saving" class="d-flex align-items-center gap-2">
                        <span class="material-icons">save</span> Lưu cập nhật
                      </span>
                      <span v-else class="d-flex align-items-center gap-2">
                        <div class="spinner-tiny"></div> Đang xử lý...
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              <!-- ── TAB: NOTIFICATIONS ── -->
              <div v-else-if="activeTab === 'notifications'" key="notifications" class="tab-pane">
                <header class="tab-header mb-4">
                  <div class="tab-header__icon notifications">
                    <span class="material-icons">notifications</span>
                  </div>
                  <div class="tab-header__text">
                    <h1 class="tab-title">Thông báo của tôi</h1>
                    <p class="tab-subtitle">Theo dõi các hoạt động đặt sân và cộng đồng</p>
                  </div>
                  <button 
                    v-if="notifications.length > 0" 
                    class="btn-text-emerald ms-auto" 
                    @click="handleMarkAllRead"
                  >
                    Đánh dấu tất cả đã đọc
                  </button>
                </header>

                <div v-if="loadingNotifications" class="loading-state py-5">
                  <div class="spinner-border text-emerald"></div>
                </div>

                <div v-else-if="notifications.length === 0" class="empty-state py-5">
                  <div class="empty-state__icon">🔕</div>
                  <h3 class="empty-state__title">Hộp thư trống</h3>
                  <p class="empty-state__text">Bạn chưa có thông báo nào vào lúc này.</p>
                </div>

                <div v-else class="notification-feed">
                  <div v-for="noti in notifications" :key="noti.id" :class="['noti-card', { unread: !noti.isRead }]">
                    <div class="noti-card__icon" :class="noti.type.toLowerCase()">
                      <span class="material-icons">{{ getNotiIcon(noti.type) }}</span>
                    </div>
                    <div class="noti-card__body" @click="handleMarkRead(noti)">
                      <div class="noti-card__header">
                        <h4 class="noti-card__title">{{ noti.title }}</h4>
                        <span class="noti-card__time">{{ formatTimeAgo(noti.createdAt) }}</span>
                      </div>
                      <p class="noti-card__text">{{ noti.body }}</p>
                    </div>
                    <button class="noti-card__delete" @click="handleDeleteNoti(noti.id)" title="Xóa thông báo">
                      <span class="material-icons">close</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- ── TAB: FAVORITES ── -->
              <div v-else-if="activeTab === 'favorites'" key="favorites" class="tab-pane">
                <header class="tab-header mb-4">
                  <div class="tab-header__icon favorites">
                    <span class="material-icons">favorite</span>
                  </div>
                  <div class="tab-header__text">
                    <h1 class="tab-title">Sân bóng đã lưu</h1>
                    <p class="tab-subtitle">Danh sách các địa điểm bạn quan tâm và yêu thích</p>
                  </div>
                </header>

                <div v-if="loadingFavorites" class="loading-state py-5">
                  <div class="spinner-border text-emerald"></div>
                </div>

                <div v-else-if="favoriteVenues.length === 0" class="empty-state py-5">
                  <h3 class="empty-state__title">Chưa có sân yêu thích</h3>
                  <p class="empty-state__text">Hãy lưu lại các sân bóng bạn thích để tìm lại nhanh hơn nhé!</p>
                  <router-link to="/booking" class="btn-premium btn-premium--outline-emerald mt-3">
                    Khám phá sân bóng
                  </router-link>
                </div>

                <div v-else class="row g-4">
                  <div v-for="club in mappedFavorites" :key="club.id" class="col-12 col-md-6 col-xl-12">
                    <div class="favorite-venue-wrapper">
                      <VenueCard :venue="club" @favorite="handleFavoriteEvent" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── TAB: COMMUNITY POSTS ── -->
              <div v-else-if="activeTab === 'community'" key="community" class="tab-pane">
                <header class="tab-header mb-4">
                  <div class="tab-header__icon community">
                    <span class="material-icons">campaign</span>
                  </div>
                  <div class="tab-header__text">
                    <h1 class="tab-title">Bài đăng cộng đồng</h1>
                    <p class="tab-subtitle">Quản lý các bài đăng tìm đối, ghép kèo của bạn</p>
                  </div>
                  <button class="btn-premium btn-premium--emerald shadow-emerald ms-auto" @click="showMatchModal = true">
                    <span class="material-icons">add</span> 
                    <span class="d-none d-sm-inline ms-1">Tạo kèo mới</span>
                  </button>
                </header>

                <div v-if="loadingPosts" class="loading-state py-5">
                  <div class="skeleton-list">
                    <div v-for="i in 3" :key="i" class="skeleton-item mb-3"></div>
                  </div>
                </div>

                <div v-else-if="userPosts.length === 0" class="empty-state py-5">
                  <div class="empty-state__icon">
                    <span class="material-icons size-64 text-slate-200">post_add</span>
                  </div>
                  <h3 class="empty-state__title">Chưa có bài đăng nào</h3>
                  <p class="empty-state__text">Hãy tạo kèo để giao lưu cùng cộng đồng thể thao nhé.</p>
                  <button class="btn-premium btn-premium--emerald mt-3" @click="showMatchModal = true">
                    Tạo bài đăng đầu tiên
                  </button>
                </div>

                <div v-else class="posts-grid">
                  <article v-for="post in userPosts" :key="post.id" class="premium-post-card">
                    <header class="post-card__header">
                      <div class="d-flex align-items-center gap-2">
                        <div class="post-card__tag" :class="post.type.toLowerCase()">{{ getLabel(post.type) }}</div>
                        <span v-if="post.status === 'PENDING'" class="badge-pending">Đang chờ duyệt</span>
                      </div>
                      <time class="post-card__date">{{ formatDate(post.createdAt) }}</time>
                    </header>
                    <h3 class="post-card__title">{{ post.title }}</h3>
                    <p class="post-card__content text-truncate-3">{{ post.content.replace(/\[.*?\]/g, '') }}</p>
                    
                    <div class="post-card__stats mt-3">
                       <div class="stat-mini">
                          <span class="material-icons">visibility</span>
                          <span>{{ post.viewCount || 0 }} lượt xem</span>
                       </div>
                       <div class="stat-mini">
                          <span class="material-icons">chat_bubble_outline</span>
                          <span>{{ post.commentCount || 0 }} bình luận</span>
                       </div>
                    </div>

                    <footer class="post-card__footer mt-4">
                      <div class="d-flex gap-2 w-100">
                        <router-link :to="{ name: 'post-detail', params: { id: post.id } }" class="btn-action-outline flex-1 text-decoration-none d-flex align-items-center justify-content-center gap-1">
                          <span class="material-icons">visibility</span>
                          Xem
                        </router-link>
                        <button class="btn-action-outline flex-1" @click="editPost(post)">
                          <span class="material-icons">edit</span>
                          Sửa
                        </button>
                        <button class="btn-action-danger" @click="handleDeletePost(post.id)" title="Xóa bài">
                          <span class="material-icons">delete</span>
                        </button>
                      </div>
                    </footer>
                  </article>
                </div>
              </div>

              <!-- ── TAB: SECURITY ── -->
              <div v-else-if="activeTab === 'security'" key="security" class="tab-pane">
                <header class="tab-header mb-4">
                  <div class="tab-header__icon security">
                    <span class="material-icons">security</span>
                  </div>
                  <div class="tab-header__text">
                    <h1 class="tab-title">Bảo mật tài khoản</h1>
                    <p class="tab-subtitle">Quản lý mật khẩu và các thiết lập an toàn</p>
                  </div>
                </header>

                <div class="security-card p-4 p-md-5">
                  <form @submit.prevent="changePassword">
                    <div class="mb-4">
                      <div class="form-group-p">
                        <label class="form-label-p">Mật khẩu hiện tại</label>
                        <input v-model="pwForm.oldPassword" type="password" class="form-control-p" placeholder="••••••••" required />
                      </div>
                    </div>
                    <div class="row g-4 mb-4">
                      <div class="col-md-6">
                        <div class="form-group-p">
                          <label class="form-label-p">Mật khẩu mới</label>
                          <input v-model="pwForm.newPassword" type="password" class="form-control-p" placeholder="••••••••" required />
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group-p">
                          <label class="form-label-p">Xác nhận mật khẩu mới</label>
                          <input v-model="pwForm.confirmPassword" type="password" class="form-control-p" placeholder="••••••••" required />
                        </div>
                      </div>
                    </div>
                    <div class="d-flex justify-content-end">
                      <button type="submit" class="btn-premium btn-premium--dark" :disabled="saving">
                        <span class="material-icons">lock_reset</span> &nbsp; Cập nhật mật khẩu
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </transition>
          </div>
        </main>
      </div>
    </div>

    <!-- ── CREATE MATCH MODAL ── -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showMatchModal" class="modal-overlay-p" @click.self="showMatchModal = false">
          <div class="modal-card-p">
            <header class="modal-card__header-p">
              <div class="d-flex align-items-center gap-3">
                <div class="modal-icon-p"><span class="material-icons text-emerald">campaign</span></div>
                <h2 class="modal-title-p">Đăng tin giao lưu</h2>
              </div>
              <button class="modal-close-btn-p" @click="showMatchModal = false">
                <span class="material-icons">close</span>
              </button>
            </header>
            
            <div class="modal-card__body-p">
              <div class="mb-4">
                <label class="form-label-p">Tiêu đề bài viết</label>
                <input v-model="matchForm.title" type="text" class="form-control-p" placeholder="Tìm đối sân 7 tối mai tại CLB ABC..." />
              </div>
              <div class="mb-4">
                <label class="form-label-p">Nội dung chi tiết</label>
                <textarea v-model="matchForm.content" class="form-control-p" rows="4" placeholder="Mô tả kỹ năng, phí chia sẻ, địa điểm cụ thể..."></textarea>
              </div>

              <div class="mb-4">
                <label class="form-label-p">Ảnh đính kèm (tuỳ chọn)</label>
                <div
                  v-if="!matchForm.imageUrl"
                  class="post-uploader-p"
                  :class="{ 'is-uploading': uploadingPostImage }"
                  @click="!uploadingPostImage && $refs.postImageInput.click()"
                  @dragover.prevent
                  @drop.prevent="onPostImageDrop"
                >
                  <span class="material-icons post-uploader-p__icon">
                    {{ uploadingPostImage ? 'hourglass_top' : 'add_photo_alternate' }}
                  </span>
                  <div class="post-uploader-p__text">
                    <strong>{{ uploadingPostImage ? 'Đang tải lên...' : 'Nhấn để chọn ảnh' }}</strong>
                    <span>JPG, PNG, GIF, WebP — tối đa 5MB</span>
                  </div>
                </div>

                <div v-else class="post-preview-p">
                  <img :src="matchForm.imageUrl" alt="Ảnh bài đăng" class="post-preview-p__img" />
                  <div class="post-preview-p__actions">
                    <button
                      type="button"
                      class="post-preview-p__btn"
                      @click="$refs.postImageInput.click()"
                      :disabled="uploadingPostImage"
                    >
                      <span class="material-icons">swap_horiz</span>
                      Đổi ảnh
                    </button>
                    <button
                      type="button"
                      class="post-preview-p__btn danger"
                      @click="matchForm.imageUrl = ''"
                      :disabled="uploadingPostImage"
                    >
                      <span class="material-icons">delete_outline</span>
                      Xoá
                    </button>
                  </div>
                </div>

                <input
                  ref="postImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style="display:none"
                  @change="onPostImageChange"
                />
              </div>

              <div class="row g-4">
                <div class="col-md-6">
                  <label class="form-label-p">Chọn CLB (Tuỳ chọn)</label>
                  <div class="select-wrapper-p">
                    <select v-model="matchForm.clubId" class="form-control-p">
                       <option value="">Đăng cộng đồng chung</option>
                       <option v-for="club in userClubs" :key="club.id" :value="club.id">{{ club.name }}</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label-p">Ngày thi đấu</label>
                  <input v-model="matchForm.linkedDate" type="date" class="form-control-p" />
                </div>
              </div>
            </div>
            
            <footer class="modal-card__footer-p">
              <button class="btn-premium btn-premium--light" @click="showMatchModal = false">Đóng</button>
              <button class="btn-premium btn-premium--emerald shadow-emerald" @click="handleCreateMatch" :disabled="saving">
                <span class="material-icons">send</span> &nbsp; Đăng ngay
              </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>


<script>
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { postService, unwrapPostListPayload } from '@/services/post.service';
import { clubService } from '@/services/club.service';
import { notificationService } from '@/services/notification.service';
import { toast } from 'vue3-toastify';
import VenueCard from '@/components/client/booking/VenueCard.vue';
import ReportModal from '@/components/common/ReportModal.vue';

const phoneVN = /^(0|\+84)[0-9]{9}$/;

export default {
  name: 'ProfileView',
  components: {
    VenueCard,
    ReportModal
  },
  data() {
    return {
      user: null,
      loadingInitial: true,
      activeTab: 'personal',
      saving: false,
      loadingPosts: false,
      loadingFavorites: false,
      loadingNotifications: false,
      showMatchModal: false,
      showReportModal: false,
      userPosts: [],
      favoriteVenues: [],
      notifications: [],
      userClubs: [],
      defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky',
      navItems: [
        { id: 'personal', label: 'Thông tin cá nhân', icon: 'person_outline' },
        { id: 'notifications', label: 'Thông báo của tôi', icon: 'notifications_none' },
        { id: 'favorites', label: 'Sân bóng đã lưu', icon: 'favorite_border' },
        { id: 'community', label: 'Bài đăng của tôi', icon: 'campaign' },
        { id: 'security', label: 'Bảo mật', icon: 'shield' },
      ],
      form: {
        fullName: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        gender: 'MALE',
        bio: ''
      },
      pwForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      matchForm: {
        title: '',
        content: '',
        clubId: '',
        type: 'TEAM_MATCHING',
        linkedDate: '',
        imageUrl: ''
      },
      uploadingPostImage: false,
      errors: {
        fullName: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        bio: ''
      },
      postErrors: {
        title: '',
        content: '',
        linkedDate: ''
      }
    };
  },
  computed: {
    unreadCount() {
      return this.notifications.filter(n => !n.isRead).length;
    },
    mappedFavorites() {
      return (this.favoriteVenues || []).map(club => {
        // Calculate min price and extract court info
        let minPrice = null;
        let surface = null;
        let format = null;
        let sportType = null;
        let sportTypes = [];
        const courtCount = club.courts?.length || 0;

        if (club.courts && courtCount > 0) {
          const firstCourt = club.courts[0];
          sportTypes = [...new Set(club.courts.map(c => c.sportType))];
          surface = firstCourt.surface;
          format = firstCourt.indoorOutdoor === 'INDOOR' ? 'Trong nhà' : (firstCourt.indoorOutdoor === 'OUTDOOR' ? 'Ngoài trời' : firstCourt.indoorOutdoor);
          sportType = firstCourt.sportType;

          const allPricings = club.courts.flatMap(c => c.pricings || []);
          if (allPricings.length > 0) {
            minPrice = Math.min(...allPricings.map(p => Number(p.pricePerHour)));
          }
        }

        // Extract hours
        let openTime = null;
        let closeTime = null;
        if (club.openingHours && club.openingHours.length > 0) {
          const h = club.openingHours[0];
          const formatTime = (t) => {
            const date = new Date(t);
            return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
          }
          openTime = formatTime(h.openTime);
          closeTime = formatTime(h.closeTime);
        }

        // Map amenities to simple booleans for VenueCard
        const amenityKeys = (club.amenities || []).map(a => a.amenity?.name?.toLowerCase() || '');
        const hasWifi = amenityKeys.some(k => k.includes('wifi'));
        const hasShower = amenityKeys.some(k => k.includes('tắm') || k.includes('shower'));
        const hasParking = amenityKeys.some(k => k.includes('đỗ xe') || k.includes('parking'));

        return {
          ...club,
          image: club.coverImageUrl || 
                 club.logoUrl || 
                 (club.images && club.images[0]?.url) || 
                 (club.courts && club.courts.find(c => c.images && c.images.length > 0)?.images[0]?.url) ||
                 '/img/default-club.png',
          isFavorited: true,
          minPrice: minPrice,
          openTime: openTime,
          closeTime: closeTime,
          isPartner: true,
          hasOnlineBooking: courtCount > 0,
          sportType: sportType,
          sportTypes: sportTypes,
          surface: surface,
          format: format,
          courtCount: courtCount,
          wifi: hasWifi,
          shower: hasShower,
          freeParking: hasParking,
          rating: club.rating || (4.0 + Math.random()), // Fallback
          reviewCount: club.reviewCount || Math.floor(Math.random() * 20)
        };
      });
    }
  },
  async mounted() {
    const token = localStorage.getItem("token");
    if (!token) {
      this.$router.push("/auth/login");
      return;
    }
    this.loadingInitial = true;
    try {
      await this.fetchProfile();
      await this.fetchUserClubs();
    } finally {
      this.loadingInitial = false;
    }
  },
  watch: {
    activeTab(newTab) {
      if (newTab === 'community') this.fetchUserPosts();
      if (newTab === 'favorites') this.fetchFavorites();
      if (newTab === 'notifications') this.fetchNotifications();
    }
  },
  methods: {
    async fetchProfile() {
      try {
        const res = await userService.getProfile();
        this.user = res.data.data;
        
        // Sync form with profile data
        this.form = {
          fullName: this.user.fullName || '',
          phone: this.user.phone || '',
          address: this.user.profile?.address || '',
          dateOfBirth: this.user.profile?.dateOfBirth ? this.user.profile.dateOfBirth.split('T')[0] : '',
          gender: this.user.profile?.gender || 'MALE',
          bio: this.user.profile?.bio || ''
        };
      } catch (e) {
        toast.error("Không thể tải thông tin cá nhân");
        console.error(e);
      }
    },
    async fetchUserClubs() {
       try {
         // Use searchVenues instead of non-existent getAllClubs
         const res = await clubService.searchVenues({});
         this.userClubs = res.data?.data || [];
       } catch (e) { 
         console.error("Lỗi khi tải danh sách CLB:", e); 
       }
    },
    validateField(field) {
      const val = String(this.form[field] || '').trim();
      const phoneVN = /^(0|\+84)[0-9]{9}$/;
      const nameRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ]+$/;
      const addressRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ,./-]+$/;

      switch (field) {
        case 'fullName':
          if (!val) this.errors.fullName = 'Vui lòng nhập họ và tên';
          else if (val.length < 2) this.errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
          else if (!nameRegex.test(val)) this.errors.fullName = 'Không được chứa ký tự đặc biệt';
          else this.errors.fullName = '';
          break;
        case 'phone':
          if (val) {
            const normalized = val.replace(/\s/g, '');
            if (!/^\d+$/.test(normalized)) this.errors.phone = 'Số điện thoại chỉ được chứa chữ số';
            else if (!phoneVN.test(normalized)) this.errors.phone = 'Số điện thoại không hợp lệ';
            else this.errors.phone = '';
          } else {
            this.errors.phone = '';
          }
          break;
        case 'address':
          if (val && !addressRegex.test(val)) this.errors.address = 'Địa chỉ chứa ký tự không hợp lệ';
          else this.errors.address = '';
          break;
        case 'dateOfBirth':
          if (val) {
            const d = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d > today) this.errors.dateOfBirth = 'Ngày sinh không được ở tương lai';
            else this.errors.dateOfBirth = '';
          } else {
            this.errors.dateOfBirth = '';
          }
          break;
        case 'bio':
          if (val.length > 500) this.errors.bio = 'Tối đa 500 ký tự';
          else this.errors.bio = '';
          break;
      }
    },
    validatePostField(field) {
      const val = String(this.matchForm[field] || '').trim();
      const titleRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ!?,.\[\]()\-]+$/;

      switch (field) {
        case 'title':
          if (!val) this.postErrors.title = 'Vui lòng nhập tiêu đề';
          else if (val.length < 5) this.postErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
          else if (!titleRegex.test(val)) this.postErrors.title = 'Tiêu đề chứa ký tự không hợp lệ';
          else this.postErrors.title = '';
          break;
        case 'content':
          if (!val) this.postErrors.content = 'Vui lòng nhập nội dung';
          else if (val.length < 10) this.postErrors.content = 'Nội dung phải có ít nhất 10 ký tự';
          else this.postErrors.content = '';
          break;
        case 'linkedDate':
          if (val) {
            const d = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) this.postErrors.linkedDate = 'Ngày thi đấu không được ở quá khứ';
            else this.postErrors.linkedDate = '';
          } else {
            this.postErrors.linkedDate = '';
          }
          break;
      }
    },
    async updateProfile() {
      const fullName = String(this.form.fullName || '').trim();
      const phone = String(this.form.phone || '').trim();
      const address = String(this.form.address || '').trim();
      const bio = String(this.form.bio || '').trim();

      // Validation Regex
      const nameRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ]+$/;
      const addressRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ,./-]+$/; // Allow , . / - for address
      const numericRegex = /^\d+$/;

      if (!fullName) {
        toast.error("Vui lòng nhập họ và tên");
        return;
      }
      if (fullName.length < 2) {
        toast.error("Họ và tên phải có ít nhất 2 ký tự");
        return;
      }
      if (!nameRegex.test(fullName)) {
        toast.error("Họ và tên không được chứa ký tự đặc biệt");
        return;
      }

      if (phone) {
        const normalizedPhone = phone.replace(/\s/g, '');
        if (!numericRegex.test(normalizedPhone)) {
          toast.error("Số điện thoại chỉ được chứa chữ số");
          return;
        }
        if (!phoneVN.test(normalizedPhone)) {
          toast.error("Số điện thoại không hợp lệ (phải đủ 10 số và bắt đầu bằng 0 hoặc +84)");
          return;
        }
      }

      if (address && !addressRegex.test(address)) {
        toast.error("Địa chỉ không được chứa ký tự đặc biệt (ngoại trừ dấu phẩy, chấm, gạch chéo)");
        return;
      }

      if (bio && bio.length > 500) {
        toast.error("Tiểu sử tối đa 500 ký tự");
        return;
      }

      if (this.form.dateOfBirth) {
        const d = new Date(this.form.dateOfBirth);
        if (isNaN(d.getTime())) {
          toast.error("Ngày sinh không hợp lệ");
          return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d > today) {
          toast.error("Ngày sinh không được lớn hơn ngày hiện tại");
          return;
        }
      }

      this.saving = true;
      try {
        const payload = { ...this.form, fullName, phone, address, bio };
        // Backend yêu cầu ISO 8601 datetime cho dateOfBirth
        if (payload.dateOfBirth) {
          payload.dateOfBirth = new Date(payload.dateOfBirth).toISOString();
        } else {
          payload.dateOfBirth = "";
        }
        
        await userService.updateProfile(payload);
        toast.success("Cập nhật thông tin thành công!");
        await this.fetchProfile();
      } catch (e) {
        toast.error(e.response?.data?.message || "Lỗi khi cập nhật thông tin");
      } finally {
        this.saving = false;
      }
    },
    async changePassword() {
      if (this.pwForm.newPassword !== this.pwForm.confirmPassword) {
        toast.error("Mật khẩu xác nhận không khớp");
        return;
      }
      if (!this.pwForm.oldPassword || !this.pwForm.newPassword || !this.pwForm.confirmPassword) {
        toast.error("Vui lòng nhập đầy đủ thông tin mật khẩu");
        return;
      }
      if (String(this.pwForm.newPassword).length < 8) {
        toast.error("Mật khẩu mới phải có ít nhất 8 ký tự");
        return;
      }
      if (!/[A-Za-z]/.test(this.pwForm.newPassword) || !/[0-9]/.test(this.pwForm.newPassword)) {
        toast.error("Mật khẩu mới phải bao gồm cả chữ và số");
        return;
      }
      this.saving = true;
      try {
        await userService.changePassword({
          currentPassword: this.pwForm.oldPassword,
          newPassword: this.pwForm.newPassword
        });
        toast.success("Đã đổi mật khẩu thành công!");
        this.pwForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
      } catch (e) {
        toast.error(e.response?.data?.message || "Lỗi khi đổi mật khẩu");
      } finally {
        this.saving = false;
      }
    },
    triggerAvatar() {
      this.$refs.avatarInput.click();
    },
    async handleAvatarChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'user-avatar');
      try {
        await userService.updateAvatar(formData);
        toast.success("Đã cập nhật ảnh đại diện!");
        await this.fetchProfile();
      } catch (e) {
        toast.error("Lỗi khi tải ảnh lên");
      }
    },
    async fetchUserPosts() {
      if (!this.user?.id) return;
      this.loadingPosts = true;
      try {
        // Fetch posts filtered by the current user's ID
        const res = await postService.getPublicFeed({ 
          userId: this.user.id,
          limit: 100, 
          page: 1 
        });
        const items = unwrapPostListPayload(res.data);
        
        // Map data fields (backend uses userId, _count, etc.)
        this.userPosts = items.map(p => ({ 
          ...p, 
          commentCount: p._count?.comments || 0, 
          viewCount: p.viewCount || 0 
        }));
      } catch (e) {
        console.error("Lỗi tải bài đăng:", e);
        toast.error("Không thể tải danh sách bài đăng");
      } finally {
        this.loadingPosts = false;
      }
    },
    async fetchFavorites() {
       this.loadingFavorites = true;
       try {
         const res = await clubService.getFavorites();
         // Backend returns { clubs: [], courts: [] }
         this.favoriteVenues = res.data?.data?.clubs || [];
       } catch (e) {
         toast.error("Lỗi khi tải danh sách yêu thích");
       } finally {
         this.loadingFavorites = false;
       }
    },
    handleFavoriteEvent({ favorited }) {
        if (!favorited) {
           this.fetchFavorites(); // Refresh list if something was unfavorited
        }
    },

    // NOTIFICATIONS
    async fetchNotifications() {
      this.loadingNotifications = true;
      try {
        const res = await notificationService.getMyNotifications({ page: 1, limit: 100 });
        this.notifications = res.data.data.items || [];
      } catch (e) {
        toast.error("Lỗi khi tải thông báo");
      } finally {
        this.loadingNotifications = false;
      }
    },
    async handleMarkRead(noti) {
      if (!noti.isRead) {
        try {
          await notificationService.markAsRead(noti.id);
          noti.isRead = true;
          // Update local counter or state if needed
        } catch (e) { 
          console.error("Error marking as read:", e);
        }
      }
      
      // Chuyển hướng đến trang cộng đồng để hiển thị bài đăng/tin tức
      this.$router.push({ name: 'friend' });
    },
    async handleMarkAllRead() {
      try {
        await notificationService.markAsRead();
        this.notifications.forEach(n => n.isRead = true);
        toast.success("Đã đánh dấu tất cả là đã đọc");
      } catch (e) { toast.error("Lỗi thực hiện"); }
    },
    async handleDeleteNoti(id) {
      try {
        await notificationService.deleteNotification(id);
        this.notifications = this.notifications.filter(n => n.id !== id);
      } catch (e) { toast.error("Lỗi khi xóa thông báo"); }
    },
    getNotiIcon(type) {
      switch (type) {
        case 'BOOKING_CONFIRMED': return 'event_available';
        case 'BOOKING_CANCELLED': return 'event_busy';
        case 'BOOKING_REMINDER': return 'notification_important';
        case 'PAYMENT_SUCCESS': return 'payments';
        case 'PAYMENT_FAILED': return 'money_off';
        case 'PROMOTION': return 'local_offer';
        case 'SYSTEM': return 'admin_panel_settings';
        case 'NEWS_FEED': return 'campaign';
        default: return 'notifications';
      }
    },
    formatTimeAgo(date) {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " năm trước";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " tháng trước";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " ngày trước";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " giờ trước";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " phút trước";
      return "Vừa xong";
    },
    onPostImageChange(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) this.uploadPostImage(file);
    },
    onPostImageDrop(event) {
      const file = event.dataTransfer?.files?.[0];
      if (file) this.uploadPostImage(file);
    },
    async uploadPostImage(file) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowed.includes(file.type)) {
        toast.error('Chỉ chấp nhận ảnh JPG, PNG, GIF hoặc WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh không được vượt quá 5MB.');
        return;
      }
      this.uploadingPostImage = true;
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'post-image');
        const api = (await import('@/api/axios')).default;
        const res = await api.post('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.data?.url;
        if (!url) throw new Error('Không nhận được URL ảnh.');
        this.matchForm.imageUrl = url;
        toast.success('Tải ảnh lên thành công');
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Upload ảnh thất bại.');
      } finally {
        this.uploadingPostImage = false;
      }
    },
    async handleCreateMatch() {
       const title = (this.matchForm.title || '').trim();
       const content = (this.matchForm.content || '').trim();
       const linkedDate = this.matchForm.linkedDate;

       if (!title) {
         toast.error("Vui lòng nhập tiêu đề bài viết");
         return;
       }
       if (title.length < 5) {
         toast.error("Tiêu đề phải có ít nhất 5 ký tự");
         return;
       }
       // Regex cho phép chữ, số, tiếng Việt và một số ký tự câu thông dụng
       const titleRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ!?,.\[\]()\-]+$/;
       if (!titleRegex.test(title)) {
         toast.error("Tiêu đề không được chứa ký tự đặc biệt lạ");
         return;
       }

       if (!content) {
         toast.error("Vui lòng nhập nội dung chi tiết");
         return;
       }
       if (content.length < 10) {
         toast.error("Nội dung bài viết phải có ít nhất 10 ký tự");
         return;
       }

       if (linkedDate) {
         const d = new Date(linkedDate);
         const today = new Date();
         today.setHours(0, 0, 0, 0);
         if (d < today) {
           toast.error("Ngày thi đấu không được trong quá khứ");
           return;
         }
       }

       this.saving = true;
       try {
         const payload = {
           ...this.matchForm,
           clubId: this.matchForm.clubId || (this.userClubs[0]?.id || null)
         };

         let res;
         if (this.matchForm.id) {
           // Update existing post
           res = await postService.updateUserPost(this.matchForm.id, payload);
         } else {
           // Create new post
           res = await postService.createUserPost(payload);
         }

         if (res.success) {
           toast.success(this.matchForm.id ? "Đã cập nhật bài đăng!" : "Kèo của bạn đã được đăng!");
           this.showMatchModal = false;
           // Reset form
           this.matchForm = { title: '', content: '', clubId: '', type: 'TEAM_MATCHING', linkedDate: '', imageUrl: '' };
           await this.fetchUserPosts();
         }
       } catch (e) {
         toast.error(this.matchForm.id ? "Lỗi khi cập nhật bài." : "Lỗi khi đăng bài.");
       } finally {
         this.saving = false;
       }
    },
    async handleDeletePost(id) {
       if (!confirm("Bạn có chắc muốn xóa bài đăng này?")) return;
       try {
         await postService.deletePost(id);
         toast.success("Đã xóa bài đăng");
         await this.fetchUserPosts();
       } catch (e) {
         toast.error("Không thể xóa bài");
       }
    },
    handleLogout() {
      localStorage.clear();
      window.location.href = '/auth/login';
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString('vi-VN');
    },
    getLabel(type) {
      const labels = {
        'TEAM_MATCHING': 'Tìm đối',
        'FIND_PARTNER': 'Tìm bạn chơi',
        'CHALLENGE': 'Thử thách',
        'EXCHANGE': 'Giao lưu'
      };
      return labels[type] || type;
    },
    editPost(post) {
      this.matchForm = {
        id: post.id,
        title: post.title,
        content: post.content,
        clubId: post.clubId,
        type: post.type,
        linkedDate: post.linkedDate ? post.linkedDate.split('T')[0] : '',
        imageUrl: post.imageUrl || ''
      };
      this.showMatchModal = true;
    }
  }
}
</script>

<style scoped>
.profile-page {
  background: #f8fafc;
  min-height: 100vh;
}

/* --- Common Utility --- */
.text-emerald { color: #10b981 !important; }
.bg-emerald { background-color: #10b981 !important; }
.btn-text-emerald {
  background: transparent;
  border: none;
  color: #10b981;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-text-emerald:hover {
  background: rgba(16, 185, 129, 0.08);
}
.border-top-dashed { border-top: 1px dashed #e2e8f0; }

/* --- Sidebar Styles --- */
.profile-sidebar {
  border-radius: 20px;
  background: white;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
}

.profile-card__banner {
  height: 100px;
  background: linear-gradient(135deg, #10b981, #059669);
}

.profile-card__content {
  padding: 0 24px 24px;
  margin-top: -50px;
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid white;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #f1f5f9;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.profile-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 4px;
}

.profile-email {
  font-size: 0.875rem;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.profile-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-weight: 800;
  color: #1e293b;
  font-size: 1.125rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: #e2e8f0;
}

.profile-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  background: transparent;
  width: 100%;
  transition: all 0.2s;
  color: #64748b;
  position: relative;
}

.nav-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  transition: all 0.2s;
}

.nav-item-label {
  font-weight: 600;
  font-size: 0.9375rem;
}

.nav-item-btn:hover {
  background: #f8fafc;
  color: #1e293b;
}

.nav-item-btn.active {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

.nav-item-btn.active .nav-item-icon {
  background: #10b981;
  color: white;
}

.nav-badge {
  position: absolute;
  right: 16px;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  background: white;
  color: #ef4444;
  font-weight: 700;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #fef2f2;
  border-color: #fee2e2;
}

/* --- Main Content Styles --- */
.content-card {
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
  min-height: 600px;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}

.tab-header__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.tab-header__icon.personal { background: linear-gradient(135deg, #10b981, #059669); }
.tab-header__icon.notifications { background: linear-gradient(135deg, #f59e0b, #d97706); }
.tab-header__icon.favorites { background: linear-gradient(135deg, #ec4899, #db2777); }
.tab-header__icon.community { background: linear-gradient(135deg, #6366f1, #4f46e5); }
.tab-header__icon.security { background: linear-gradient(135deg, #475569, #1e293b); }

.tab-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 4px;
}

.tab-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

/* --- Form Styles --- */
.form-group-p {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label-p {
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 8px;
}

.form-control-p {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 2px solid #f1f5f9;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #0f172a;
  background: #f8fafc;
  transition: all 0.2s;
  outline: none;
}

.form-control-p::placeholder {
  color: #94a3b8;
}

.form-control-p:focus {
  border-color: #10b981;
  background: white;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

textarea.form-control-p {
  resize: vertical;
  min-height: 96px;
  line-height: 1.5;
}

.select-wrapper-p {
  position: relative;
}

.select-wrapper-p::after {
  content: '\e5cf';
  font-family: 'Material Icons';
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
  font-size: 22px;
}

.select-wrapper-p select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 42px;
  cursor: pointer;
}

/* --- Button Styles --- */
.btn-premium {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
  border: none;
  cursor: pointer;
  font-size: 0.9375rem;
  white-space: nowrap;
}

.btn-premium .material-icons {
  font-size: 18px;
}

.btn-premium--emerald {
  background: #10b981;
  color: white;
}

.btn-premium--emerald:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
}

.btn-premium--dark {
  background: #1e293b;
  color: white;
}

.btn-premium--dark:hover {
  background: #0f172a;
  transform: translateY(-2px);
}

.btn-premium--light {
  background: #f1f5f9;
  color: #475569;
}

.btn-premium--light:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-premium--outline-emerald {
  background: transparent;
  border: 2px solid #10b981;
  color: #059669;
}

.btn-premium--outline-emerald:hover {
  background: #ecfdf5;
  transform: translateY(-2px);
}

.shadow-emerald {
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);
}

.shadow-emerald:hover {
  box-shadow: 0 14px 28px rgba(16, 185, 129, 0.35);
}

.btn-premium:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* --- Notification Feed --- */
.notification-feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.noti-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  position: relative;
  transition: all 0.2s;
}

.noti-card.unread {
  background: white;
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.05);
}

.noti-card.unread::after {
  content: '';
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.noti-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.noti-card__icon.booking_confirmed { background: #dcfce7; color: #16a34a; }
.noti-card__icon.booking_cancelled { background: #fee2e2; color: #dc2626; }
.noti-card__icon.payment_success { background: #dcfce7; color: #16a34a; }
.noti-card__icon.system { background: #f1f5f9; color: #475569; }

.noti-card__body {
  flex: 1;
  cursor: pointer;
}

.noti-card__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.noti-card__title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.noti-card__time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.noti-card__text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.noti-card__delete {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  background: transparent;
  border: none;
  color: #94a3b8;
  transition: all 0.2s;
}

.noti-card:hover .noti-card__delete {
  opacity: 1;
}

/* --- Modal Styles --- */
.modal-overlay-p {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card-p {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}

.modal-card__header-p {
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-icon-p {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #ecfdf5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icon-p .material-icons {
  font-size: 24px;
}

.modal-title-p {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  margin: 0;
  text-transform: uppercase;
  color: #0f172a;
  letter-spacing: 0.5px;
}

.modal-close-btn-p {
  border: none;
  background: #f1f5f9;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close-btn-p:hover {
  background: #fee2e2;
  color: #ef4444;
  transform: rotate(90deg);
}

.modal-card__body-p {
  padding: 24px;
}

.modal-card__footer-p {
  padding: 16px 24px;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* --- Post Image Upload --- */
.post-uploader-p {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.post-uploader-p:hover:not(.is-uploading) {
  border-color: #10b981;
  background: #ecfdf5;
}

.post-uploader-p.is-uploading {
  opacity: 0.65;
  pointer-events: none;
}

.post-uploader-p__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #ecfdf5;
  color: #10b981;
  font-size: 28px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.post-uploader-p__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.post-uploader-p__text strong {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #0f172a;
}

.post-uploader-p__text span {
  font-size: 0.8125rem;
  color: #64748b;
}

.post-preview-p {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: #0f172a;
  border: 1px solid #e2e8f0;
}

.post-preview-p__img {
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: cover;
}

.post-preview-p__actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.post-preview-p__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  font-weight: 700;
  font-size: 0.8125rem;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.post-preview-p__btn:hover:not(:disabled) {
  background: white;
  transform: translateY(-1px);
}

.post-preview-p__btn .material-icons {
  font-size: 18px !important;
}

.post-preview-p__btn.danger {
  background: rgba(254, 226, 226, 0.95);
  color: #b91c1c;
}

.post-preview-p__btn.danger:hover:not(:disabled) {
  background: #fee2e2;
}

.post-preview-p__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal transition (matches <transition name="modal-fade">) */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-active .modal-card-p,
.modal-fade-leave-active .modal-card-p {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-card-p,
.modal-fade-leave-to .modal-card-p {
  transform: translateY(20px) scale(0.96);
}

/* --- Premium Post Cards --- */
.premium-post-card {
  padding: 24px;
  border-radius: 20px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  transition: all 0.3s;
}

.premium-post-card:hover {
  transform: translateY(-4px);
  background: white;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
  border-color: #10b981;
}

.post-card__tag {
  display: inline-block;
  background: #dcfce7;
  color: #059669;
  font-size: 0.625rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.post-card__title {
  font-size: 1.125rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 8px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.text-truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.badge-pending {
  background: #fff7ed;
  color: #c2410c;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #ffedd5;
}

.post-card__tag.team_matching { background: #dcfce7; color: #16a34a; }
.post-card__tag.discount { background: #fee2e2; color: #dc2626; }
.post-card__tag.event { background: #e0e7ff; color: #4338ca; }

.post-card__stats {
  display: flex;
  gap: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #f1f5f9;
}

.stat-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.stat-mini .material-icons {
  font-size: 14px;
}

.btn-action-outline {
  background: white;
  border: 1.5px solid #e2e8f0;
  color: #64748b;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-outline:hover {
  border-color: #10b981;
  color: #10b981;
}

.btn-action-danger {
  background: #fef2f2;
  border: 1.5px solid #fee2e2;
  color: #ef4444;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action-danger:hover {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.flex-1 { flex: 1; }

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.skeleton-item {
  height: 120px;
  background: #f1f5f9;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.skeleton-item::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.size-64 { font-size: 64px !important; }
.text-slate-200 { color: #e2e8f0; }

/* --- Animations --- */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.btn-report-p {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(16, 185, 129, 0.05);
  border: 1px dashed rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  color: #10b981;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-report-p:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
}

.btn-logout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #fff5f5;
  color: #ef4444;
  border-color: #fee2e2;
}
.error-text-p {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 5px;
  font-weight: 500;
  animation: fadeIn 0.2s ease-out;
}

.form-control-p.is-invalid-p {
  border-color: #ef4444 !important;
  background-color: #fef2f2;
}

.form-control-p.is-invalid-p:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>

