import api from "../api/axios";

/**
 * Service dành riêng cho thao tác của Admin
 */
export const adminService = {
  // Permissions
  getPermissions() {
    return api.get("/admin/permissions");
  },

  updatePermissions(matrix) {
    return api.patch("/admin/permissions", { matrix });
  },

  // ==========================================
  // Quản lý Câu lạc bộ (Sân)
  // ==========================================

  /**
   * Lấy toàn bộ danh sách CLB (Dành cho Admin)
   */
  getAllClubs() {
    return api.get("/admin/clubs");
  },
  /**
   * Cập nhật trạng thái phê duyệt của CLB
   * @param {string} clubId
   * @param {'APPROVED' | 'REJECTED' | 'PENDING'} status
   */
  updateClubApproval(clubId, status) {
    return api.patch(`/admin/clubs/${clubId}/approval`, { status });
  },

  /**
   * Khóa hoặc mở khóa CLB
   * @param {string} clubId
   * @param {boolean} isActive
   */
  updateClubStatus(clubId, isActive) {
    return api.patch(`/admin/clubs/${clubId}/status`, { isActive });
  },

  /**
   * Cập nhật trạng thái một sân đơn lẻ
   * @param {string} courtId
   * @param {'ACTIVE' | 'SUSPENDED' | 'INACTIVE'} status
   */
  updateCourtStatus(courtId, status) {
    return api.patch(`/admin/courts/${courtId}/status`, { status });
  },

  /**
   * Lấy các số liệu tổng quan (Counts) cho Sidebar/Badge
   * @param {string} [startDate]
   * @param {string} [endDate]
   */
  getSummary(startDate, endDate) {
    // return api.get("/admin/summary", {
    //   params: { startDate, endDate },
    // });
    
    // MOCK for sidebar badges
    return Promise.resolve({
      data: {
        data: {
          pendingClubs: 3,
          pendingKyc: 7,
          violations: 4,
          totalUsers: 1250,
          totalRevenue: 850000000
        }
      }
    });
  },

  // ==========================================
  // Quản lý KYC (Xác minh Owner)
  // ==========================================

  /**
   * Lấy danh sách hồ sơ KYC của các Owner
   */
  getAllKyc() {
    return api.get("/admin/kyc");
  },

  /**
   * Lấy toàn bộ hồ sơ các Chủ Câu lạc bộ (Owners)
   */
  getAllOwners() {
    return api.get("/admin/owners");
  },

  /**
   * Xét duyệt KYC cho Owner
   * @param {string} profileId
   * @param {'APPROVED' | 'REJECTED'} status
   * @param {string} [note] - Lý do nếu từ chối
   */
  updateKycStatus(profileId, status, note) {
    return api.patch(`/admin/kyc/${profileId}`, { status, note });
  },

  /**
   * Lấy danh sách toàn bộ người dùng
   */
  getUsers() {
    return api.get("/admin/users");
  },

  /**
   * Khóa/Mở khóa tài khoản người dùng
   * @param {string} userId
   * @param {boolean} isActive
   */
  updateUserStatus(userId, isActive) {
    return api.patch(`/admin/users/${userId}/status`, { isActive });
  },

  // ==========================================
  // Quản lý nội dung (Posts / Comments / Reports)
  // ==========================================

  /**
   * Lấy danh sách bài đăng
   */
  getAllPosts() {
    return api.get("/admin/posts");
  },

  /**
   * Ẩn/hiện/hết hạn bài đăng
   * @param {string} postId
   * @param {'ACTIVE'|'HIDDEN'|'EXPIRED'} status
   */
  updatePostStatus(postId, status) {
    return api.patch(`/admin/posts/${postId}`, { status });
  },

  /**
   * Kiểm duyệt bài đăng
   * @param {string} postId
   * @param {{action:'APPROVE'|'REJECT', note?:string}} payload
   */
  moderatePost(postId, payload) {
    return api.patch(`/admin/posts/${postId}`, payload);
  },

  /**
   * Xoá mềm bài đăng
   */
  deletePost(postId) {
    return api.delete(`/admin/posts/${postId}`);
  },

  /**
   * Lấy danh sách bình luận
   */
  getAllComments() {
    return api.get("/admin/comments");
  },

  /**
   * Ẩn/hiện bình luận
   * @param {string} commentId
   * @param {boolean} isHidden
   */
  updateCommentHidden(commentId, isHidden) {
    return api.patch(`/admin/comments/${commentId}`, { isHidden });
  },

  /**
   * Xoá bình luận
   */
  deleteComment(commentId) {
    return api.delete(`/admin/comments/${commentId}`);
  },

  /**
   * Lấy danh sách report/vi phạm
   */
  getAllReports() {
    return api.get("/admin/reports");
  },

  /**
   * Xử lý report
   * @param {string} reportId
   * @param {'RESOLVED'|'REJECTED'} status
   */
  handleReport(reportId, status) {
    return api.patch(`/admin/reports/${reportId}`, { status });
  },

  // ==========================================
  // Thống kê hệ thống (Admin)
  // ==========================================

  /**
   * Dashboard tổng quan thống kê (1 API)
   * @param {object} params { preset?: 'last_week'|'this_month'|'last_month', startDate?: string, endDate?: string }
   */
  getStatsDashboard(params = {}) {
    return api.get("/admin/stats/dashboard", { params });
  },

  // ==========================================
  // Phân quyền (RBAC) - Admin
  // ==========================================

  getPermissionsConfig() {
    // return api.get("/admin/permissions");
    
    // MOCK Permissions Matrix
    return Promise.resolve({
      data: {
        data: {
          updatedAt: new Date().toISOString(),
          matrix: {
            ADMIN: {
              view_users: true, edit_users: true, lock_users: true, approve_clubs: true,
              verify_kyc: true, manage_courts: true, view_finance: true, export_reports: true,
              manage_settings: true, manage_perms: true, moderate_posts: true, moderate_comments: true, view_stats: true,
            },
            OWNER: {
              view_users: false, edit_users: false, lock_users: false, approve_clubs: false,
              verify_kyc: false, manage_courts: true, view_finance: true, export_reports: false,
              manage_settings: false, manage_perms: false, moderate_posts: false, moderate_comments: false, view_stats: false,
            },
            USER: {
              view_users: false, edit_users: false, lock_users: false, approve_clubs: false,
              verify_kyc: false, manage_courts: false, view_finance: false, export_reports: false,
              manage_settings: false, manage_perms: false, moderate_posts: false, moderate_comments: false, view_stats: false,
            },
          }
        }
      }
    });
  },

  savePermissionsConfig(matrix) {
    // return api.patch("/admin/permissions", { matrix });
    
    // MOCK Save Response
    console.log("Mock Save Permissions:", matrix);
    return Promise.resolve({
      data: {
        message: "Cập nhật phân quyền thành công (Mock)",
        data: { matrix }
      }
    });
  },
};
