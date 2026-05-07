<template>
  <div class="post-detail-page">
    <div v-if="loading" class="detail-loader">
      <div class="spinner-premium"></div>
      <p>Đang tải bài viết...</p>
    </div>

    <template v-else-if="post">
      <!-- ══ HEADER / HERO ══ -->
      <header class="post-hero" :style="heroStyle">
        <div class="hero-overlay"></div>
        <div class="container">
          <nav class="breadcrumb-premium" aria-label="Breadcrumb">
            <ol>
              <li><router-link to="/">Trang chủ</router-link></li>
              <li class="sep">›</li>
              <li><router-link to="/friend">Cộng đồng</router-link></li>
              <li class="sep">›</li>
              <li class="active">{{ getLabel(post.type) }}</li>
            </ol>
          </nav>

          <div class="hero-content">
            <div class="post-badge" :class="post.type.toLowerCase()">
              {{ getLabel(post.type) }}
            </div>
            <h1 class="post-title">{{ post.title }}</h1>
            
            <div class="post-meta-hero">
              <router-link v-if="post.user" to="/profile" class="author-box text-decoration-none">
                <img :src="post.user.avatarUrl || defaultAvatar" alt="User Avatar" class="author-logo rounded-circle" />
                <div class="author-info">
                  <span class="author-name text-white">{{ post.user.fullName }}</span>
                  <span class="post-date">{{ formatDate(post.createdAt) }}</span>
                </div>
              </router-link>
              <router-link v-else-if="post.club" :to="{ name: 'venue-detail', params: { id: post.club.slug }, query: { tab: 'info' } }" class="author-box text-decoration-none">
                <img :src="(post.club.images && post.club.images.length > 0) ? post.club.images[0].url : (post.club.logoUrl || defaultClubLogo)" alt="Club Logo" class="author-logo" />
                <div class="author-info">
                  <span class="author-name text-white">{{ post.club.name }}</span>
                  <span class="post-date">{{ formatDate(post.createdAt) }}</span>
                </div>
              </router-link>
              <div class="meta-stats">
                <button class="meta-item btn-like-inline" :class="{ active: isLiked() }" @click="toggleLike">
                  <span class="material-icons">{{ isLiked() ? 'favorite' : 'favorite_border' }}</span>
                  {{ post.likeCount || 0 }} thích
                </button>
                <span class="meta-item"><span class="material-icons">visibility</span> {{ post.viewCount || 0 }} lượt xem</span>
                <span class="meta-item"><span class="material-icons">chat_bubble_outline</span> {{ post.commentCount || 0 }} bình luận</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="container py-5">
        <div class="row g-5">
          <!-- ─ MAIN CONTENT ─ -->
          <div class="col-lg-8">
            <article class="post-article glass-card">
              <div v-if="post.imageUrl" class="post-featured-image-container mb-5">
                <img :src="post.imageUrl" :alt="post.title" class="post-featured-image shadow-lg" />
              </div>

              <!-- Match Details Card -->
              <div v-if="post.type === 'TEAM_MATCHING'" class="match-info-card mb-5">
                <div class="card-header-accent"></div>
                <div class="p-4">
                  <h3 class="info-title mb-4">THÔNG TIN KÈO ĐẤU</h3>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-icon"><span class="material-icons">location_on</span></div>
                      <div class="info-text">
                        <label>Địa điểm</label>
                        <p>{{ post.club?.name }}</p>
                        <small class="text-muted">{{ post.club?.address }}</small>
                      </div>
                    </div>
                    <div class="info-item">
                      <div class="info-icon"><span class="material-icons">event</span></div>
                      <div class="info-text">
                        <label>Ngày thi đấu</label>
                        <p>{{ formatDate(post.linkedDate) || 'Liên hệ' }}</p>
                      </div>
                    </div>
                    <div class="info-item">
                      <div class="info-icon"><span class="material-icons">schedule</span></div>
                      <div class="info-text">
                        <label>Giờ bắt đầu</label>
                        <p>{{ formatTime(post.linkedDate) || 'Thỏa thuận' }}</p>
                      </div>
                    </div>
                    <div class="info-item">
                      <div class="info-icon"><span class="material-icons">insights</span></div>
                      <div class="info-text">
                        <label>Trình độ yêu cầu</label>
                        <p :class="getSkillClass(post.content)">{{ getSkillLabel(post.content) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="post-body">
                <div class="content-wrapper" v-html="formattedContent"></div>
              </div>

              <footer class="post-footer mt-5 pt-4 border-top">
                <div class="share-box">
                  <span class="share-label">Chia sẻ bài viết:</span>
                  <div class="share-buttons">
                    <button class="btn-share fb" @click="sharePost('facebook')"><i class="bx bxl-facebook"></i></button>
                    <button class="btn-share tw" @click="sharePost('twitter')"><i class="bx bxl-twitter"></i></button>
                    <button class="btn-share copy" @click="copyLink" title="Copy link"><span class="material-icons">link</span></button>
                  </div>
                </div>
              </footer>
            </article>

            <!-- ══ PARTICIPANTS SECTION ══ -->
            <section v-if="post.type === 'TEAM_MATCHING'" class="participants-section mt-5 glass-card p-4">
              <div class="d-flex align-items-center justify-content-between mb-4">
                <h3 class="section-title-small m-0">
                  <span class="material-icons align-middle me-2 text-emerald">groups</span>
                  Người tham gia kèo ({{ post.participants?.length || 0 }})
                </h3>
              </div>
              
              <div v-if="post.participants && post.participants.length > 0" class="participants-grid">
                <div v-for="p in post.participants" :key="p.id" class="participant-item">
                  <div class="participant-card">
                    <img :src="p.user.avatarUrl || defaultAvatar" class="participant-avatar" />
                    <div class="participant-info">
                      <div class="participant-name">{{ p.user.fullName }}</div>
                      <div class="participant-status">Đã đăng ký</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-participants text-center py-3">
                <p class="text-muted m-0">Chưa có ai tham gia. Hãy là người đầu tiên!</p>
              </div>
            </section>

            <!-- ══ COMMENTS SECTION ══ -->
            <section class="comments-section mt-5">
              <h3 class="section-title mb-4">Bình luận ({{ comments.length }})</h3>
              
              <div class="comment-form glass-card mb-5 p-4">
                <div class="d-flex gap-3">
                  <img :src="currentUserAvatar" class="user-avatar-sm" />
                  <div class="flex-grow-1">
                    <textarea 
                      v-model="newComment" 
                      class="form-control-premium" 
                      rows="3" 
                      placeholder="Chia sẻ ý kiến của bạn về bài viết này..."
                    ></textarea>
                    <div class="d-flex justify-content-end mt-3">
                      <button 
                        class="btn-premium btn-premium--emerald" 
                        @click="submitComment"
                        :disabled="!newComment.trim() || submitting"
                      >
                        {{ submitting ? 'Đang gửi...' : 'Gửi bình luận' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="comments-list">
                <div v-for="comment in comments" :key="comment.id" class="comment-item mb-4">
                  <div class="d-flex gap-3">
                    <img :src="comment.user?.avatarUrl || defaultAvatar" class="user-avatar-sm" />
                    <div class="comment-bubble-premium flex-grow-1">
                      <div class="comment-header">
                        <h4 class="comment-author">{{ comment.user?.fullName }}</h4>
                        <span class="comment-time">{{ timeAgo(comment.createdAt) }}</span>
                      </div>
                      <div class="comment-text">{{ comment.content }}</div>
                      <div class="comment-actions mt-2">
                        <button class="btn-text">Thích</button>
                        <button class="btn-text">Phản hồi</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="comments.length === 0" class="empty-comments py-4 text-center">
                  <span class="material-icons text-slate-300 size-48">chat_bubble_outline</span>
                  <p class="text-muted mt-2">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              </div>
            </section>
          </div>

          <!-- ─ SIDEBAR ─ -->
          <aside class="col-lg-4">
            <div class="sticky-sidebar">
              <!-- Author Card -->
              <div class="sidebar-card glass-card mb-4 overflow-hidden">
                <div class="card-accent-top"></div>
                <div class="p-4">
                  <h4 class="sidebar-title-small">NGƯỜI ĐĂNG</h4>
                  <div class="author-sidebar-info mt-3" v-if="post.user">
                    <img :src="post.user.avatarUrl || defaultAvatar" class="club-logo-lg mb-3 rounded-circle" />
                    <h3 class="club-name-sidebar">{{ post.user.fullName }}</h3>
                    <p class="club-address-sidebar">Thành viên cộng đồng</p>
                  </div>
                  <div class="author-sidebar-info mt-3" v-else-if="post.club">
                    <img :src="(post.club.images && post.club.images.length > 0) ? post.club.images[0].url : (post.club.logoUrl || defaultClubLogo)" class="club-logo-lg mb-3" />
                    <h3 class="club-name-sidebar">{{ post.club.name }}</h3>
                    <p class="club-address-sidebar"><span class="material-icons">location_on</span> {{ post.club.address }}</p>
                    
                    <div class="d-grid mt-4">
                      <router-link :to="{ name: 'venue-detail', params: { id: post.club.slug }, query: { tab: 'info' } }" class="btn-premium btn-premium--outline-emerald">
                        XEM TRANG CÁ NHÂN
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Join CTA Card -->
              <div v-if="post.type === 'TEAM_MATCHING'" class="sidebar-card join-cta-card mb-4">
                <div class="p-4 text-center">
                  <h4 class="cta-title">BẠN MUỐN THAM GIA?</h4>
                  <p class="cta-text">Kèo này đang cần thêm đồng đội. Đừng bỏ lỡ cơ hội giao lưu!</p>
                  <button class="btn-premium btn-premium--emerald w-100 mt-3 py-3" @click="handleJoin">
                    GỬI YÊU CẦU THAM GIA
                  </button>
                  <p class="cta-hint mt-2">Chủ bài viết sẽ nhận được thông báo ngay lập tức.</p>
                </div>
              </div>

              <!-- Related Posts (Mock for now) -->
              <div class="sidebar-card glass-card mb-4">
                <div class="p-4">
                  <h4 class="sidebar-title-small mb-3">BÀI VIẾT KHÁC</h4>
                  <div class="related-list">
                    <div v-for="rp in relatedPosts" :key="rp.id" class="related-item mb-3">
                      <router-link :to="'/community/post/' + rp.id" class="related-link">
                        <div class="related-thumb" v-if="rp.imageUrl">
                          <img :src="rp.imageUrl" />
                        </div>
                        <div class="related-info">
                          <h5 class="related-title text-truncate-2">{{ rp.title }}</h5>
                          <span class="related-date">{{ formatDate(rp.createdAt) }}</span>
                        </div>
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </template>

    <div v-else class="empty-state py-10">
      <div class="text-center">
        <span class="material-icons size-64 text-slate-300">error_outline</span>
        <h2 class="mt-4">Không tìm thấy bài viết</h2>
        <p class="text-muted">Bài viết này có thể đã bị xóa hoặc không tồn tại.</p>
        <router-link to="/friend" class="btn-premium btn-premium--emerald mt-4">Quay lại cộng đồng</router-link>
      </div>
    </div>

    <!-- JOIN MODAL -->
    <Teleport to="body">
       <div v-if="showJoinSuccess" class="modal-overlay-p" @click.self="showJoinSuccess = false">
         <div class="modal-card-p text-center p-5 animate-scale-in">
           <div class="success-icon-wrap">
             <span class="material-icons">check_circle</span>
           </div>
           <h2 class="fw-black mt-4">YÊU CẦU ĐÃ GỬI!</h2>
           <p class="text-muted px-4 mb-4">Yêu cầu tham gia kèo của bạn đã được gửi tới chủ bài viết. Hãy theo dõi thông báo nhé!</p>
           <button class="btn-premium btn-premium--emerald w-100" @click="showJoinSuccess = false">TUYỆT VỜI</button>
         </div>
       </div>
    </Teleport>
  </div>
</template>

<script>
import { postService, unwrapPostListPayload } from '@/services/post.service';
import { toast } from 'vue3-toastify';

export default {
  name: 'PostDetailView',
  data() {
    return {
      post: null,
      loading: true,
      submitting: false,
      newComment: '',
      currentUserId: null,
      comments: [],
      relatedPosts: [],
      currentUser: null,
      showJoinSuccess: false,
      defaultClubLogo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Club',
      defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
    };
  },
  computed: {
    currentUserAvatar() {
      return this.currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.currentUser?.fullName || 'Me'}`;
    },
    heroStyle() {
      if (!this.post?.imageUrl) return {};
      return {
        backgroundImage: `url(${this.post.imageUrl})`
      };
    },
    formattedContent() {
      if (!this.post?.content) return '';
      // Remove level tags like [PRO] if needed or style them
      let html = this.post.content.replace(/\[.*?\]/g, (match) => {
        return `<span class="content-tag">${match.slice(1, -1)}</span>`;
      });
      // Handle line breaks
      return html.replace(/\n/g, '<br/>');
    }
  },
  watch: {
    '$route.params.id': {
      immediate: true,
      handler(newId) {
        if (newId) this.fetchPost(newId);
      }
    }
  },
  mounted() {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUser = user;
        this.currentUserId = user.id;
      } catch (e) {}
    }
  },
  methods: {
    async fetchPost(id) {
      this.loading = true;
      try {
        const res = await postService.getPublicPost(id);
        this.post = res.data;
        
        this.fetchComments(id);

        // Increment view count
        postService.recordPostView(id).catch(() => {});

        // Fetch related posts (mocking by getting feed)
        this.fetchRelated();
      } catch (e) {
        console.error("Lỗi tải bài viết:", e);
        toast.error("Không thể tải thông tin bài viết");
      } finally {
        this.loading = false;
        window.scrollTo(0, 0);
      }
    },
    async fetchComments(postId) {
      try {
        const res = await postService.getComments(postId);
        this.comments = res.data || [];
      } catch (e) {
        console.error("Lỗi tải bình luận:", e);
      }
    },
    async fetchRelated() {
      try {
        const res = await postService.getPublicFeed({ limit: 4, page: 1 });
        const list = unwrapPostListPayload(res.data);
        this.relatedPosts = list.filter(p => p.id !== this.post.id).slice(0, 3);
      } catch (e) {}
    },
    getLabel(type) {
      const labels = {
        DISCOUNT: 'Khuyến mãi',
        EVENT: 'Sự kiện',
        TEAM_MATCHING: 'Ghép kèo',
        ANNOUNCEMENT: 'Thông báo',
      };
      return labels[type] || type;
    },
    formatDate(d) {
      if (!d) return '';
      return new Date(d).toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    },
    formatTime(d) {
      if (!d) return '';
      return new Date(d).toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    },
    timeAgo(date) {
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
    getSkillClass(content) {
      const c = (content || '').toUpperCase();
      if (c.includes('PRO')) return 'text-danger fw-bold';
      if (c.includes('INTERMEDIATE')) return 'text-warning fw-bold';
      return 'text-emerald fw-bold';
    },
    getSkillLabel(content) {
      const c = (content || '').toUpperCase();
      if (c.includes('PRO')) return 'Chuyên nghiệp (Pro)';
      if (c.includes('INTERMEDIATE')) return 'Trung bình (Intermediate)';
      return 'Giao lưu (Beginner)';
    },
    async submitComment() {
      if (!this.newComment.trim()) return;
      if (!this.currentUser) {
        toast.warning("Vui lòng đăng nhập để bình luận");
        return;
      }
      this.submitting = true;
      try {
        const res = await postService.addComment(this.post.id, this.newComment.trim());
        this.comments.unshift(res.data);
        this.newComment = '';
        toast.success("Đã gửi bình luận!");
      } catch (e) {
        toast.error(e.response?.data?.message || "Lỗi khi gửi bình luận");
      } finally {
        this.submitting = false;
      }
    },
    async handleJoin() {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.info("Vui lòng đăng nhập để tham gia kèo");
        return;
      }

      // Check if user is the author
      if (this.currentUserId === this.post.userId || (this.post.club && this.post.club.ownerId === this.currentUserId)) {
        toast.warning("Bạn không thể tham gia kèo do chính mình tạo.");
        return;
      }

      try {
        await postService.joinMatch(this.post.id);
        this.showJoinSuccess = true;
        // Refresh post to update participants list
        this.fetchPost(this.post.id);
      } catch (e) {
        toast.error(e.response?.data?.message || "Không thể tham gia kèo lúc này.");
      }
    },
    async toggleLike() {
      if (!this.currentUser) {
        toast.info("Vui lòng đăng nhập để thả tim bài viết");
        return;
      }
      try {
        const res = await postService.toggleLike(this.post.id);
        const { liked } = res.data;
        
        if (liked) {
          this.post.likeCount++;
          this.post.isLikedByUser = true;
        } else {
          this.post.likeCount = Math.max(0, (this.post.likeCount || 0) - 1);
          this.post.isLikedByUser = false;
        }
      } catch (e) {
        toast.error("Không thể thực hiện thao tác này");
      }
    },
    isLiked() {
      return this.post?.isLikedByUser || false;
    },
    copyLink() {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết!");
    },
    sharePost(platform) {
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(this.post.title);
      let shareUrl = '';
      if (platform === 'facebook') {
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      } else if (platform === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
      }
      window.open(shareUrl, '_blank');
    }
  }
};
</script>

<style scoped>
.post-detail-page {
  background: #f8fafc;
  min-height: 100vh;
}

.detail-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.spinner-premium {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Post Hero */
.post-hero {
  position: relative;
  height: 450px;
  display: flex;
  align-items: flex-end;
  padding-bottom: 60px;
  background-color: #1e293b;
  background-size: cover;
  background-position: center;
  color: white;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(30, 41, 59, 0.4), rgba(30, 41, 59, 0.95));
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 800px;
}

.breadcrumb-premium {
  position: relative;
  z-index: 2;
  margin-bottom: 30px;
}

.breadcrumb-premium ol {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 10px;
  font-size: 14px;
}

.breadcrumb-premium a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-premium a:hover {
  color: #10b981;
}

.breadcrumb-premium .sep {
  color: rgba(255, 255, 255, 0.3);
}

.breadcrumb-premium .active {
  color: white;
  font-weight: 600;
}

.post-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.post-badge.team_matching { background: #10b981; color: white; }
.post-badge.discount { background: #f59e0b; color: white; }
.post-badge.event { background: #3b82f6; color: white; }
.post-badge.announcement { background: #6366f1; color: white; }

.post-title {
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
  letter-spacing: -2px;
  color: white;
}

.section-title-small {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.participant-card:hover {
  transform: translateY(-2px);
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #10b981;
}

.participant-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
}

.participant-status {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 500;
}

.post-meta-hero {
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
}

.author-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 700;
  font-size: 16px;
}

.post-date {
  font-size: 13px;
  opacity: 0.7;
}

.meta-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  opacity: 0.8;
}

.meta-item .material-icons {
  font-size: 18px;
}

.btn-like-inline {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 12px;
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-like-inline:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-like-inline.active {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

.btn-like-inline.active .material-icons {
  color: #ef4444;
}

/* Article */
.glass-card {
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
}

.post-article {
  padding: 40px;
}

.post-featured-image-container {
  border-radius: 20px;
  overflow: hidden;
}

.post-featured-image {
  width: 100%;
  max-height: 500px;
  object-fit: cover;
}

.match-info-card {
  background: #f8fafc;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

.card-header-accent {
  height: 6px;
  background: #10b981;
}

.info-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 1px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
}

.info-item {
  display: flex;
  gap: 15px;
}

.info-icon {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.info-text label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.info-text p {
  margin: 0;
  font-weight: 700;
  color: #1e293b;
}

.post-body {
  font-size: 1.15rem;
  line-height: 1.8;
  color: #334155;
}

.content-wrapper :deep(.content-tag) {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.9em;
  margin-right: 5px;
}

.share-box {
  display: flex;
  align-items: center;
  gap: 15px;
}

.share-label {
  font-weight: 700;
  font-size: 14px;
  color: #64748b;
}

.share-buttons {
  display: flex;
  gap: 10px;
}

.btn-share {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.2s;
  cursor: pointer;
}

.btn-share:hover { transform: translateY(-3px); }
.btn-share.fb { background: #1877f2; }
.btn-share.tw { background: #1da1f2; }
.btn-share.copy { background: #64748b; }

/* Comments */
.section-title {
  font-size: 1.5rem;
  font-weight: 900;
  color: #1e293b;
}

.user-avatar-sm {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.form-control-premium {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.form-control-premium:focus {
  border-color: #10b981;
}

.comment-bubble-premium {
  background: white;
  padding: 16px 20px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-author {
  font-size: 14px;
  font-weight: 800;
  margin: 0;
}

.comment-time {
  font-size: 12px;
  color: #94a3b8;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
}

.btn-text {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-right: 15px;
  cursor: pointer;
}

.btn-text:hover {
  color: #10b981;
}

/* Sidebar */
.sidebar-title-small {
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 2px;
  margin: 0;
}

.club-logo-lg {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  object-fit: cover;
  box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1);
}

.club-name-sidebar {
  font-size: 1.4rem;
  font-weight: 900;
  margin-bottom: 5px;
}

.club-address-sidebar {
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.club-address-sidebar .material-icons { font-size: 14px; }

.join-cta-card {
  background: #1e293b;
  color: white;
  border-radius: 24px;
  box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.2);
}

.cta-title { font-weight: 900; font-size: 1.2rem; }
.cta-text { font-size: 14px; opacity: 0.8; margin-bottom: 0; }
.cta-hint { font-size: 11px; opacity: 0.5; }

.related-link {
  display: flex;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.related-thumb {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.related-thumb img { width: 100%; height: 100%; object-fit: cover; }
.related-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; line-height: 1.4; }
.related-date { font-size: 11px; color: #94a3b8; }

.related-link:hover .related-title { color: #10b981; }

.btn-premium {
  border: none;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-premium--emerald { background: #10b981; color: white; }
.btn-premium--emerald:hover { background: #059669; transform: translateY(-2px); }
.btn-premium--outline-emerald { background: transparent; border: 1px solid #10b981; color: #10b981; }
.btn-premium--outline-emerald:hover { background: #10b981; color: white; }

.text-emerald { color: #10b981; }

/* Modal Join */
.modal-overlay-p {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card-p {
  background: #fff;
  width: 100%;
  max-width: 500px;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}

.success-icon-wrap {
  width: 80px;
  height: 80px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.success-icon-wrap .material-icons { font-size: 48px; }

.animate-scale-in {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@media (max-width: 991px) {
  .post-title { font-size: 2.5rem; }
  .post-hero { height: auto; min-height: 400px; padding-top: 100px; }
  .info-grid { grid-template-columns: 1fr; gap: 20px; }
}

@media (max-width: 576px) {
  .post-title { font-size: 2rem; }
  .post-article { padding: 25px; }
  .meta-stats { width: 100%; margin-top: 10px; }
}
</style>
