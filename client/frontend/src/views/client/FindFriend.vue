<template>
  <div class="community-page">
    <LoadingView v-if="loading" />
    
    <!-- ══ ANNOUNCEMENT BAR ══ -->
    <div v-if="showAnnouncement" class="announcement-bar" role="banner" aria-label="Thông báo mới">
      <p>
        🎉 Tham gia cộng đồng ngay: Kết nối - Giao lưu - Nâng tầm đam mê!
        <router-link to="/features" class="ann-link">Tìm hiểu thêm →</router-link>
      </p>
      <button class="ann-close" @click="showAnnouncement = false" aria-label="Đóng thông báo">×</button>
    </div>

    <!-- ══ HEADER ══ -->
    <header class="page-shell pt-24">
      <div class="page-header">
        <nav class="breadcrumb" aria-label="Điều hướng">
          <ol>
            <li><router-link to="/">Trang chủ</router-link></li>
            <li class="sep">›</li>
            <li>Cộng đồng</li>
          </ol>
        </nav>

        <div class="header-row">
          <div class="header-main-info">
            <h1 class="page-title">
              <span class="title-main">CỘNG ĐỒNG</span>
              <div class="title-accent-box">
                 <span class="title-sub">Giao lưu & Kết nối đam mê</span>
              </div>
            </h1>
            <div class="stats-pills mt-3">
              <span class="stat-pill"><span class="material-icons">sports_soccer</span> {{ stats.activeMatch }} kèo đang mở</span>
              <span class="stat-pill"><span class="material-icons">people</span> {{ stats.totalPlayers }} thành viên</span>
            </div>
          </div>

          <div class="header-actions">
            <button class="btn-create-premium" @click="showCreateModal = true">
              <span class="material-icons">add_box</span>
              ĐĂNG KÈO MỚI
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="page-shell">
      <!-- ══ TABS ══ -->
      <div class="community-tabs-wrapper">
        <div class="community-tabs">
          <button 
            v-for="tab in tabOptions" 
            :key="tab.value"
            class="tab-btn"
            :class="{ active: activeTab === tab.value }"
            @click="handleTabChange(tab.value)"
          >
            <span class="material-icons">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="content-layout mt-8">
        <!-- ─ SIDEBAR (LEFT) ─ -->
        <aside class="sidebar-wrap">
          <div class="glass-sidebar">
            <div class="sidebar-section">
              <h3 class="sidebar-title">Tìm kiếm</h3>
              <div class="search-box-p">
                <span class="material-icons">search</span>
                <input v-model="filters.keyword" type="text" placeholder="Tìm tên sân, khu vực..." />
              </div>
            </div>

            <div class="sidebar-section">
              <h3 class="sidebar-title">Trình độ</h3>
              <div class="chip-grid">
                <button 
                  v-for="lv in levels" 
                  :key="lv.val" 
                  class="filter-chip"
                  :class="{ active: filters.level === lv.val }"
                  @click="filters.level = (filters.level === lv.val ? '' : lv.val)"
                >
                  {{ lv.label }}
                </button>
              </div>
            </div>

            <div class="sidebar-section">
              <h3 class="sidebar-title">Ngày thi đấu</h3>
              <div class="date-input-wrapper">
                <span class="material-icons">calendar_today</span>
                <input type="date" v-model="filters.date" class="date-input-p" />
              </div>
            </div>

            <button class="btn-reset-p" @click="resetFilters">
              <span class="material-icons">refresh</span>
              Làm mới bộ lọc
            </button>
          </div>

          <!-- Trending / Active Groups -->
          <div class="trending-card mt-6">
            <h3 class="sidebar-title px-4 pt-4">Xu hướng 🔥</h3>
            <div class="trending-list">
              <div v-for="(t, idx) in trendingTopics" :key="idx" class="trending-item">
                <span class="trend-rank">#{{ idx + 1 }}</span>
                <div class="trend-info">
                  <span class="trend-tag">{{ t.tag }}</span>
                  <span class="trend-count">{{ t.count }} bài đăng</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- ─ FEED (RIGHT) ─ -->
        <main class="feed-main">
          <!-- Empty -->
          <div v-if="!loading && filteredFeed.length === 0" class="empty-feed-premium">
            <div class="empty-animation">
              <span class="material-icons">auto_stories</span>
            </div>
            <h3>Hộp tin trống</h3>
            <p>Không tìm thấy bài đăng nào phù hợp với bộ lọc của bạn.</p>
            <button class="btn-create-premium mt-4" @click="resetFilters">Xóa bộ lọc</button>
          </div>

          <!-- Feed Grid -->
          <div class="feed-grid-social">
            <article v-for="post in filteredFeed" :key="post.id" class="social-post" :data-post-id="post.id">
              <!-- Post Author & Meta -->
              <header class="social-post__header">
                <!-- User Author -->
                <router-link v-if="post.user" to="/profile" class="author-info text-decoration-none">
                  <div class="avatar-sm shadow-sm">
                    <img :src="post.user.avatarUrl || defaultAvatar" alt="User Avatar" class="rounded-circle" />
                  </div>
                  <div class="author-text">
                    <div class="author-name text-dark">{{ post.user.fullName }}</div>
                    <div class="post-time">{{ timeAgo(post.createdAt) }} • {{ getLabel(post.type) }}</div>
                  </div>
                </router-link>
                <!-- Club Author -->
                <router-link v-else :to="{ name: 'venue-detail', params: { id: post.club?.slug }, query: { tab: 'info' } }" class="author-info text-decoration-none">
                  <div class="avatar-sm shadow-sm">
                    <img :src="(post.club?.images && post.club.images.length > 0) ? post.club.images[0].url : (post.club?.logoUrl || defaultClubLogo)" alt="Club Logo" />
                  </div>
                  <div class="author-text">
                    <div class="author-name text-dark">{{ post.club?.name || 'Cộng đồng Thể thao' }}</div>
                    <div class="post-time">{{ timeAgo(post.createdAt) }} • {{ getLabel(post.type) }}</div>
                  </div>
                </router-link>
                <div class="post-options">
                  <button class="btn-icon" @click="copyShareLink(post)"><span class="material-icons">share</span></button>
                </div>
              </header>

              <!-- Main Content -->
              <div class="social-post__content">
                <h3 class="post-title-social">{{ post.title }}</h3>
                <p class="post-text">{{ post.content.replace(/\[.*?\]/g, '') }}</p>
                
                <!-- Match Specific Info -->
                <div v-if="post.type === 'TEAM_MATCHING'" class="match-details-box">
                  <div class="detail-row">
                    <div class="detail-item">
                      <span class="material-icons">location_on</span>
                      <span>{{ post.club?.name || 'Sân bóng cộng đồng' }} ({{ post.club?.district || 'Chưa rõ' }})</span>
                    </div>
                  </div>
                  <div class="detail-row mt-2">
                    <div class="detail-item">
                      <span class="material-icons">event</span>
                      <span>{{ formatDate(post.linkedDate) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="material-icons">schedule</span>
                      <span>{{ formatTime(post.linkedDate) }}</span>
                    </div>
                    <div class="detail-item skill-level" :class="getSkillClass(post.content)">
                      <span class="material-icons">insights</span>
                      <span>{{ getSkillLabel(post.content) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Media (Optional) -->
                <div v-if="post.imageUrl || post.club?.logoUrl" class="post-media-box mt-3">
                   <img :src="post.imageUrl || post.club?.logoUrl" class="post-img" loading="lazy" />
                </div>
              </div>

              <!-- Interaction Bar -->
              <footer class="social-post__footer">
                <div class="interaction-stats">
                   <div class="stat-group">
                     <button class="btn-interact" :class="{ active: isLiked(post.id) }" @click="toggleLike(post)">
                        <span class="material-icons">{{ isLiked(post.id) ? 'favorite' : 'favorite_border' }}</span>
                        <span>{{ post.likeCount || 0 }}</span>
                     </button>
                     <button class="btn-interact" @click="toggleComments(post.id)">
                        <span class="material-icons">chat_bubble_outline</span>
                        <span>{{ post.commentCount || 0 }}</span>
                     </button>
                   </div>
                   <div class="view-count">
                      <span class="material-icons">visibility</span>
                      {{ post.viewCount || 0 }} lượt xem
                   </div>
                </div>

                <div class="post-actions-main mt-3 d-flex gap-2">
                   <button v-if="post.type === 'TEAM_MATCHING'" class="btn-join-premium flex-grow-1" @click="joinMatch(post)">
                      THAM GIA KÈO
                   </button>
                   <router-link :to="{ name: 'post-detail', params: { id: post.id } }" 
                                class="btn-detail-premium text-center text-decoration-none d-block"
                                :class="{ 'flex-grow-1': post.type === 'TEAM_MATCHING', 'w-100': post.type !== 'TEAM_MATCHING' }">
                      XEM CHI TIẾT
                   </router-link>
                </div>

                <!-- Collapsible Comments -->
                <transition name="expand">
                  <div v-if="expandedComments === post.id" class="comments-section mt-4">
                    <div class="comment-input-wrap">
                      <img :src="currentUserAvatar" class="avatar-tiny" />
                      <input type="text" placeholder="Viết bình luận..." @keyup.enter="submitComment(post.id, $event)" />
                    </div>
                    <div class="comments-list mt-3">
                       <div v-if="loadingComments && expandedComments === post.id" class="text-center text-muted small">Đang tải...</div>
                       <div v-else-if="realComments[post.id]?.length === 0" class="text-center text-muted small">Chưa có bình luận nào.</div>
                       <div v-for="c in realComments[post.id]" :key="c.id" class="comment-item">
                          <img :src="c.user?.avatarUrl || defaultAvatar" class="avatar-tiny" />
                          <div class="comment-bubble">
                             <div class="comment-author">{{ c.user?.fullName || 'Người dùng' }}</div>
                             <div class="comment-text">{{ c.content }}</div>
                          </div>
                       </div>
                    </div>
                  </div>
                </transition>
              </footer>
            </article>
            
            <template v-if="loading">
               <div v-for="i in 3" :key="i" class="skeleton-post"></div>
            </template>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="pagination-wrapper mt-8">
              <button 
                class="pg-btn" 
                :disabled="currentPage === 1"
                @click="changePage(currentPage - 1)"
              >
                <span class="material-icons">chevron_left</span>
              </button>
              
              <div class="pg-numbers">
                <button 
                  v-for="p in totalPages" 
                  :key="p"
                  class="pg-num"
                  :class="{ active: p === currentPage }"
                  @click="changePage(p)"
                >
                  {{ p }}
                </button>
              </div>

              <button 
                class="pg-btn" 
                :disabled="currentPage === totalPages"
                @click="changePage(currentPage + 1)"
              >
                <span class="material-icons">chevron_right</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- CREATE MATCH MODAL (UPGRADED) -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showCreateModal" class="modal-overlay-premium" @click.self="showCreateModal = false">
          <div class="modal-card-premium">
            <header class="modal-card-header">
              <div class="header-accent"></div>
              <div class="header-content-p">
                <h2>BẮT ĐẦU KẾT NỐI</h2>
                <p>Chia sẻ niềm vui thể thao cùng mọi người</p>
              </div>
              <button class="modal-close-p" @click="showCreateModal = false">
                <span class="material-icons">close</span>
              </button>
            </header>
            
            <div class="modal-card-body">
               <div class="form-grid">
                  <div class="form-field full">
                    <label>Tiêu đề bài viết</label>
                    <div class="input-with-icon-p" :class="{ 'is-invalid-social': createErrors.title }">
                      <span class="material-icons">title</span>
                      <input v-model="createForm.title" type="text" placeholder="Tìm đối thủ, tìm bạn chơi..." @input="validateCreateField('title')" />
                    </div>
                    <span v-if="createErrors.title" class="error-text-social">{{ createErrors.title }}</span>
                  </div>
                  <div class="form-field full">
                    <label>Nội dung chi tiết</label>
                    <textarea v-model="createForm.content" :class="{ 'is-invalid-social': createErrors.content }" rows="4" placeholder="Mô tả trình độ, phí chia sẻ, yêu cầu..." @input="validateCreateField('content')"></textarea>
                    <span v-if="createErrors.content" class="error-text-social">{{ createErrors.content }}</span>
                  </div>
                  <div class="form-field">
                    <label>Ngày dự kiến</label>
                    <input v-model="createForm.linkedDate" type="date" :class="{ 'is-invalid-social': createErrors.linkedDate }" @input="validateCreateField('linkedDate')" />
                    <span v-if="createErrors.linkedDate" class="error-text-social">{{ createErrors.linkedDate }}</span>
                  </div>
                  <div class="form-field">
                    <label>Trình độ</label>
                    <select v-model="createForm.skillSelection">
                      <option value="BEGINNER">Giao lưu (Beginner)</option>
                      <option value="INTERMEDIATE">Trung bình (Intermediate)</option>
                      <option value="PRO">Bắt kèo căng (Pro)</option>
                    </select>
                  </div>
                  <div class="form-field full">
                    <label>Chọn sân bóng (Tùy chọn)</label>
                    <div class="club-chips">
                       <button 
                         v-for="club in userClubs" 
                         :key="club.id"
                         :class="{ active: createForm.clubId === club.id }"
                         @click="createForm.clubId = (createForm.clubId === club.id ? '' : club.id)"
                       >
                         {{ club.name }}
                       </button>
                       <span v-if="userClubs.length === 0" class="text-hint">Bạn chưa theo dõi sân nào</span>
                    </div>
                  </div>
               </div>
            </div>
            
            <footer class="modal-card-footer">
               <button class="btn-cancel-p" @click="showCreateModal = false">Đóng</button>
               <button class="btn-submit-premium" @click="handleCreatePost" :disabled="saving">
                  {{ saving ? 'Đang gửi...' : 'ĐĂNG BÀI NGAY' }}
               </button>
            </footer>
          </div>
        </div>
      </transition>
    </Teleport>
    
    <!-- JOIN CONFIRMATION -->
    <Teleport to="body">
       <div v-if="joiningActive" class="modal-overlay-premium" @click.self="joiningActive = null">
         <div class="modal-card-premium text-center p-5 scale-in">
           <div class="success-icon-wrap">
             <span class="material-icons">check_circle</span>
           </div>
           <h2 class="fw-black mt-4">YÊU CẦU ĐÃ GỬI!</h2>
           <p class="text-muted px-4 mb-4">Chúng tôi đã gửi thông báo tới đội trưởng. Vui lòng chờ phản hồi trong mục thông báo cá nhân nhé!</p>
           <button class="btn-submit-premium w-100" @click="joiningActive = null">TUYỆT VỜI</button>
         </div>
       </div>
    </Teleport>
  </div>
</template>

<script>
import { postService, unwrapPostListPayload, unwrapPostListMeta } from '@/services/post.service';
import { clubService } from '@/services/club.service';
import { toast } from 'vue3-toastify';
import LoadingView from '@/components/common/LoadingView.vue';

export default {
  name: 'FindFriend',
  components: {
    LoadingView
  },
  data() {
    return {
      allFeed: [],
      userClubs: [],
      loading: true,
      saving: false,
      showCreateModal: false,
      showAnnouncement: true,
      joiningActive: null,
      activeTab: 'all',
      expandedComments: null,
      likedPosts: [],
      filters: {
        keyword: '',
        level: '',
        date: ''
      },
      tabOptions: [
        { value: 'all', label: 'Tất cả', icon: 'apps' },
        { value: 'TEAM_MATCHING', label: 'Ghép kèo', icon: 'sports_soccer' },
        { value: 'DISCOUNT', label: 'Khuyến mãi', icon: 'local_offer' },
        { value: 'EVENT', label: 'Sự kiện', icon: 'event' }
      ],
      createForm: {
        title: '',
        content: '',
        clubId: '',
        linkedDate: '',
        skillSelection: 'INTERMEDIATE'
      },
      createErrors: {
        title: '',
        content: '',
        linkedDate: ''
      },
      levels: [
        { val: 'BEGINNER', label: 'Giao lưu' },
        { val: 'INTERMEDIATE', label: 'Trung bình' },
        { val: 'PRO', label: 'Chuyên nghiệp' }
      ],
      trendingTopics: [
        { tag: 'Sân 7 Sài Gòn', count: 42 },
        { tag: 'Cầu lông sáng sớm', count: 28 },
        { tag: 'Pickleball mới nổi', count: 15 },
        { tag: 'Giao lưu tennis Q7', count: 12 }
      ],
      stats: {
        activeMatch: 0,
        totalPlayers: 2450
      },
      mockComments: [
        { id: 1, name: 'Lâm Nguyễn', text: 'Kèo này còn chỗ không bạn ơi?', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lam' },
        { id: 2, name: 'Hoàng Minh', text: 'Mình xin 1 slot nhé, trình trung bình.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minh' }
      ],
      realComments: {},
      loadingComments: false,
      defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
      defaultClubLogo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Club',
      currentUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
      currentUserId: null,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize: 10,
      _feedIo: null
    };
  },
  computed: {
    filteredFeed() {
      let list = [...this.allFeed];
      
      // Removed local Tab filter because it's handled by backend pagination

      // Keyword filter
      if (this.filters.keyword) {
        const k = this.filters.keyword.toLowerCase();
        list = list.filter(m => 
          (m.title || '').toLowerCase().includes(k) || 
          (m.club?.name || '').toLowerCase().includes(k) || 
          (m.content || '').toLowerCase().includes(k)
        );
      }

      // Skill level filter
      if (this.filters.level) {
        list = list.filter(m => (m.content || '').toUpperCase().includes(this.filters.level));
      }

      // Date filter
      if (this.filters.date) {
        list = list.filter(m => m.linkedDate?.startsWith(this.filters.date));
      }

      return list;
    }
  },
  async mounted() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.currentUserId = user.id;
    await this.fetchMatches(1);
    await this.fetchUserClubs();
    this.loadLikes();
  },
  methods: {
    async handleTabChange(tabValue) {
      this.activeTab = tabValue;
      await this.fetchMatches(1);
    },
    async fetchMatches(page = 1) {
      this.loading = true;
      this.currentPage = page;
      try {
        const res = await postService.getPublicFeed({ 
          limit: this.pageSize, 
          page: this.currentPage,
          type: this.activeTab !== 'all' ? this.activeTab : undefined,
          // Note: Backend filter for keyword/date/level should be added if possible,
          // but for now we'll keep local filter for those or just fetch more.
        });
        
        if (!res.success) {
          toast.error(res.message || "Không thể tải bảng tin");
          return;
        }

        const dataField = res.data;
        const list = unwrapPostListPayload(dataField);
        const meta = unwrapPostListMeta(dataField);
        
        this.totalItems = meta.total || 0;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);

        // Map interaction counts
        this.allFeed = list.map(p => ({
          ...p,
          likeCount: p._count?.likes || 0,
          commentCount: p._count?.comments || 0
        }));

        // Sync liked states
        this.allFeed.forEach(p => {
          if (p.isLikedByUser && !this.likedPosts.includes(p.id)) {
            this.likedPosts.push(p.id);
          }
        });
        
        this.stats.activeMatch = meta.totalMatchCount || this.allFeed.filter(p => p.type === 'TEAM_MATCHING').length;
        
        // Scroll to top of feed
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        toast.error("Không thể tải bảng tin cộng đồng");
      } finally {
        this.loading = false;
      }
    },
    async changePage(page) {
      if (page < 1 || page > this.totalPages) return;
      await this.fetchMatches(page);
    },
    async fetchUserClubs() {
      try {
        const res = await clubService.searchVenues({});
        this.userClubs = res.data?.data || [];
      } catch (e) { console.error(e); }
    },
    async handleCreatePost() {
      const title = (this.createForm.title || '').trim();
      const content = (this.createForm.content || '').trim();
      const linkedDate = this.createForm.linkedDate;

      // Final check
      this.validateCreateField('title');
      this.validateCreateField('content');
      this.validateCreateField('linkedDate');

      if (this.createErrors.title || this.createErrors.content || this.createErrors.linkedDate) {
        toast.error("Vui lòng sửa các lỗi trong form");
        return;
      }

      this.saving = true;
      try {
        const contentWithSkill = `[${this.createForm.skillSelection}] ${this.createForm.content}`;
        await postService.createUserPost({
          ...this.createForm,
          content: contentWithSkill,
          type: 'TEAM_MATCHING'
        });
        toast.success("Đã đăng bài thành công!");
        this.showCreateModal = false;
        await this.fetchMatches();
      } catch (e) {
        toast.error(e.response?.data?.message || "Lỗi khi đăng bài");
      } finally {
        this.saving = false;
      }
    },
    validateCreateField(field) {
      const val = String(this.createForm[field] || '').trim();
      const titleRegex = /^[a-zA-Z0-9\sÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯẠ-ỹ!?,.\[\]()\-]+$/;

      switch (field) {
        case 'title':
          if (!val) this.createErrors.title = 'Vui lòng nhập tiêu đề';
          else if (val.length < 5) this.createErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
          else if (!titleRegex.test(val)) this.createErrors.title = 'Tiêu đề không được chứa ký tự lạ';
          else this.createErrors.title = '';
          break;
        case 'content':
          if (!val) this.createErrors.content = 'Vui lòng nhập nội dung';
          else if (val.length < 10) this.createErrors.content = 'Nội dung phải có ít nhất 10 ký tự';
          else this.createErrors.content = '';
          break;
        case 'linkedDate':
          if (val) {
            const d = new Date(val);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (d < today) this.createErrors.linkedDate = 'Ngày không được ở quá khứ';
            else this.createErrors.linkedDate = '';
          } else {
            this.createErrors.linkedDate = '';
          }
          break;
      }
    },
    async toggleLike(post) {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.info("Vui lòng đăng nhập để thả tim bài viết");
        return;
      }
      try {
        const res = await postService.toggleLike(post.id);
        const { liked } = res.data;
        
        // Update local state
        const idx = this.likedPosts.indexOf(post.id);
        if (liked) {
          if (idx === -1) {
            this.likedPosts.push(post.id);
            post.likeCount++;
          }
        } else {
          if (idx > -1) {
            this.likedPosts.splice(idx, 1);
            post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
          }
        }
      } catch (e) {
        toast.error("Không thể thực hiện thao tác này");
      }
    },
    isLiked(id) {
      return this.likedPosts.includes(id);
    },
    loadLikes() {
      // Likes are now synced from server in fetchMatches
      this.likedPosts = [];
    },
    async toggleComments(id) {
      if (this.expandedComments === id) {
        this.expandedComments = null;
      } else {
        this.expandedComments = id;
        this.loadingComments = true;
        try {
          const res = await postService.getComments(id);
          this.realComments = { ...this.realComments, [id]: res.data || [] };
        } catch(e) {
          console.error(e);
        } finally {
          this.loadingComments = false;
        }
      }
    },
    async submitComment(postId, event) {
      const text = event.target.value.trim();
      if (!text) return;
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.info("Vui lòng đăng nhập để bình luận");
        return;
      }

      try {
        const res = await postService.addComment(postId, text);
        if (!this.realComments[postId]) {
          this.realComments[postId] = [];
        }
        this.realComments[postId].unshift(res.data);
        event.target.value = '';
        
        // Update comment count
        const post = this.allFeed.find(p => p.id === postId);
        if (post) post.commentCount = (post.commentCount || 0) + 1;
        
        toast.success("Bình luận của bạn đã được gửi!");
      } catch (e) {
        toast.error("Lỗi khi gửi bình luận");
      }
    },
    async joinMatch(post) {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.info("Vui lòng đăng nhập để tham gia kèo");
        return;
      }
      
      // Check if user is the author
      if (this.currentUserId === post.userId || (post.club && post.club.ownerId === this.currentUserId)) {
        toast.warning("Bạn không thể tham gia kèo do chính mình tạo.");
        return;
      }

      try {
        await postService.joinMatch(post.id);
        this.joiningActive = post;
      } catch(e) {
        toast.error(e.response?.data?.message || "Không thể tham gia kèo lúc này.");
      }
    },
    viewDetail(post) {
       this.$router.push({ name: 'post-detail', params: { id: post.id } });
    },
    resetFilters() {
      this.filters = { keyword: '', level: '', date: '' };
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
    timeAgo(date) {
      if (!date) return "";
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      let interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " ngày trước";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " giờ trước";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " phút trước";
      return "Vừa xong";
    },
    getSkillClass(content) {
      const c = (content || '').toUpperCase();
      if (c.includes('PRO')) return 'skill-pro';
      if (c.includes('INTERMEDIATE')) return 'skill-mod';
      return 'skill-easy';
    },
    getSkillLabel(content) {
      const c = (content || '').toUpperCase();
      if (c.includes('PRO')) return 'Chuyên nghiệp';
      if (c.includes('INTERMEDIATE')) return 'Trung bình';
      return 'Giao lưu';
    },
    formatDate(d) {
      if (!d) return 'Hôm nay';
      return new Date(d).toLocaleDateString('vi-VN');
    },
    formatTime(d) {
      if (!d) return '';
      return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
  }
}
</script>

<style scoped>
.community-page {
  background: #f1f5f9;
  min-height: 100vh;
  padding-bottom: 50px;
}

/* Announcement Bar */
.announcement-bar {
  background: #1e293b;
  color: #fff;
  text-align: center;
  padding: 10px 40px;
  font-size: 13px;
  position: relative;
  z-index: 100;
}
.ann-link { color: #10b981; font-weight: 700; text-decoration: none; margin-left: 5px; }
.ann-close { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #fff; cursor: pointer; }

.page-shell { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.pt-24 { padding-top: 24px; }

/* Breadcrumb */
.breadcrumb ol { display: flex; list-style: none; padding: 0; margin-bottom: 20px; font-size: 12px; color: #64748b; gap: 8px; }
.breadcrumb a { color: inherit; text-decoration: none; }
.breadcrumb a:hover { color: #10b981; }

/* Header */
.page-header { margin-bottom: 40px; }
.header-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; }
.page-title { margin: 0; }
.title-main { font-size: 3rem; font-weight: 900; color: #1e293b; display: block; letter-spacing: -2px; }
.title-accent-box { display: inline-block; background: #10b981; padding: 2px 12px; border-radius: 4px; margin-top: -10px; }
.title-sub { font-size: 1rem; color: #fff; font-weight: 700; text-transform: uppercase; }

.stats-pills { display: flex; gap: 10px; }
.stat-pill { background: #fff; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.stat-pill .material-icons { font-size: 14px; color: #10b981; }

.btn-create-premium {
  background: #1e293b; color: #fff; border: none; padding: 14px 28px; border-radius: 12px;
  font-weight: 800; font-size: 14px; display: flex; align-items: center; gap: 10px;
  cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 15px -3px rgba(30, 41, 59, 0.2);
}
.btn-create-premium:hover { background: #10b981; transform: translateY(-3px); box-shadow: 0 10px 20px -3px rgba(16, 185, 129, 0.3); }

/* Tabs */
.community-tabs-wrapper { overflow-x: auto; scrollbar-width: none; margin-top: 20px; }
.community-tabs { display: flex; gap: 10px; padding-bottom: 5px; }
.tab-btn {
  background: #fff; border: 1px solid #e2e8f0; padding: 10px 24px; border-radius: 12px;
  color: #64748b; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.tab-btn:hover { border-color: #10b981; color: #10b981; }
.tab-btn.active { background: #10b981; color: #fff; border-color: #10b981; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
.tab-btn .material-icons { font-size: 18px; }

/* Layout */
.content-layout { display: grid; grid-template-columns: 280px 1fr; gap: 30px; }

/* Sidebar */
.glass-sidebar { background: #fff; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.sidebar-section { margin-bottom: 24px; }
.sidebar-title { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }

.search-box-p { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 10px; }
.search-box-p input { border: none; background: none; font-size: 14px; outline: none; width: 100%; }
.search-box-p .material-icons { color: #94a3b8; font-size: 18px; }

.chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.filter-chip { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
.filter-chip:hover, .filter-chip.active { border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.05); }
.filter-chip.active { background: #10b981; color: #fff; }

.date-input-wrapper { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 10px; }
.date-input-p { border: none; background: none; font-size: 13px; outline: none; width: 100%; font-family: inherit; }
.date-input-wrapper .material-icons { font-size: 16px; color: #94a3b8; }

.btn-reset-p { width: 100%; background: none; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
.btn-reset-p:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }

.trending-card { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
.trending-list { padding: 10px 0; }
.trending-item { display: flex; align-items: center; gap: 15px; padding: 12px 20px; cursor: pointer; transition: background 0.2s; }
.trending-item:hover { background: #f8fafc; }
.trend-rank { font-size: 1.5rem; font-weight: 900; color: #e2e8f0; font-style: italic; }
.trend-info { display: flex; flex-direction: column; }
.trend-tag { font-size: 14px; font-weight: 800; color: #1e293b; }
.trend-count { font-size: 11px; color: #94a3b8; }

/* Social Feed */
.feed-grid-social { display: flex; flex-direction: column; gap: 16px; }
.social-post { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

.social-post__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.author-info { display: flex; align-items: center; gap: 12px; }
.avatar-sm { width: 40px; height: 40px; border-radius: 12px; overflow: hidden; background: #f1f5f9; }
.avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
.author-text { display: flex; flex-direction: column; }
.author-name { font-size: 0.95rem; font-weight: 800; color: #1e293b; }
.post-time { font-size: 12px; color: #94a3b8; }

.btn-icon { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s; }
.btn-icon:hover { background: #f1f5f9; color: #10b981; }

.post-title-social { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; line-height: 1.3; }
.post-text { font-size: 0.9rem; color: #475569; line-height: 1.5; margin-bottom: 15px; white-space: pre-wrap; }

.match-details-box { background: #f8fafc; border-radius: 16px; padding: 16px; border: 1px solid #f1f5f9; }
.detail-row { display: flex; flex-wrap: wrap; gap: 20px; }
.detail-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #64748b; }
.detail-item .material-icons { font-size: 18px; color: #10b981; }

.skill-level { padding: 4px 10px; border-radius: 6px; font-size: 11px; text-transform: uppercase; }
.skill-pro { background: #fee2e2; color: #ef4444; }
.skill-mod { background: #fef3c7; color: #d97706; }
.skill-easy { background: #dcfce7; color: #16a34a; }

.post-media-box { border-radius: 16px; overflow: hidden; border: 1px solid #f1f5f9; }
.post-img { width: 100%; max-height: 400px; object-fit: cover; }

.social-post__footer { border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 20px; }
.interaction-stats { display: flex; justify-content: space-between; align-items: center; }
.stat-group { display: flex; gap: 15px; }
.btn-interact { background: none; border: none; display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; padding: 6px 10px; border-radius: 8px; }
.btn-interact:hover { background: #f8fafc; }
.btn-interact.active { color: #ef4444; }
.btn-interact.active .material-icons { transform: scale(1.1); }
.view-count { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }

.post-actions-main { display: grid; grid-template-columns: 1fr; }
.btn-join-premium { background: #1e293b; color: #fff; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.3s; }
.btn-join-premium:hover { background: #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
.btn-detail-premium { background: #f1f5f9; color: #1e293b; border: none; padding: 10px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; }

/* Comments Section */
.comment-input-wrap { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 12px; border: 1px solid #e2e8f0; }
.avatar-tiny { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.comment-input-wrap input { border: none; background: none; flex: 1; font-size: 13px; outline: none; }

.comment-item { display: flex; gap: 10px; margin-bottom: 12px; }
.comment-bubble { background: #f1f5f9; padding: 8px 14px; border-radius: 14px; flex: 1; }
.comment-author { font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 2px; }
.comment-text { font-size: 13px; color: #475569; }

/* Pagination Styles */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 40px;
}

.pg-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.pg-btn:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
}

.pg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pg-numbers {
  display: flex;
  gap: 8px;
}

.pg-num {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.pg-num:hover:not(.active) {
  border-color: #10b981;
  color: #10b981;
}

.pg-num.active {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
}

/* Modals */
.modal-overlay-premium { position: fixed; inset: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card-premium { background: #fff; width: 100%; max-width: 600px; border-radius: 30px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
.modal-card-header { position: relative; padding: 40px 30px 20px; }
.header-accent { position: absolute; top: 0; left: 0; right: 0; height: 8px; background: #10b981; }
.header-content-p h2 { font-size: 1.8rem; font-weight: 900; margin: 0; letter-spacing: -1px; }
.header-content-p p { font-size: 0.9rem; color: #94a3b8; margin: 5px 0 0; }
.modal-close-p { position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; }

.modal-card-body { padding: 0 30px 30px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.form-field.full { grid-column: span 2; }
.form-field label { display: block; font-size: 12px; font-weight: 800; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
.input-with-icon-p { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 12px; }
.input-with-icon-p input { border: none; background: none; outline: none; flex: 1; font-size: 14px; }
.input-with-icon-p .material-icons { color: #10b981; font-size: 20px; }

.form-field textarea, .form-field select, .form-field input[type="date"] { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; font-size: 14px; font-family: inherit; outline: none; }
.form-field textarea:focus, .form-field select:focus, .form-field input:focus { border-color: #10b981; }

.club-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.club-chips button { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
.club-chips button.active { background: #10b981; color: #fff; border-color: #10b981; }

.modal-card-footer { padding: 20px 30px; background: #f8fafc; display: flex; justify-content: flex-end; gap: 15px; }
.btn-cancel-p { background: none; border: none; font-weight: 700; color: #64748b; cursor: pointer; }
.btn-submit-premium { background: #1e293b; color: #fff; border: none; padding: 14px 30px; border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.3s; }
.btn-submit-premium:hover { background: #10b981; transform: translateY(-2px); }

/* Join Success */
.success-icon-wrap { width: 80px; height: 80px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.success-icon-wrap .material-icons { font-size: 48px; }

/* Animations */
.expand-enter-active, .expand-leave-active { transition: all 0.3s ease; max-height: 400px; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }

.skeleton-post { height: 200px; background: #e2e8f0; border-radius: 24px; animation: pulse 1.5s infinite; margin-bottom: 24px; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

@media (max-width: 1024px) { .content-layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .form-field.full { grid-column: span 1; } .title-main { font-size: 2.2rem; } }

.join-success-animation { font-size: 48px; color: var(--green); margin-bottom: 16px; }

@media (max-width: 1024px) {
  .content-layout { grid-template-columns: 1fr; }
  .sidebar-wrap { position: static; }
}

@media (max-width: 640px) {
  .feed-grid { grid-template-columns: 1fr; }
  .page-title .title-main { font-size: 2rem; }
  .header-actions { width: 100%; }
  .btn-create { width: 100%; justify-content: center; }
}
.error-text-social {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 5px;
  font-weight: 500;
  animation: fadeInSocial 0.2s ease-out;
}

.is-invalid-social {
  border-color: #ef4444 !important;
}

.input-with-icon-p.is-invalid-social {
  border-color: #ef4444 !important;
}

@keyframes fadeInSocial {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>
