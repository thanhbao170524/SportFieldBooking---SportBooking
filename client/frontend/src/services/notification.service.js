import api from '../api/axios';

export const notificationService = {
  /**
   * Fetch user notifications
   */
  getMyNotifications(params = {}) {
    return api.get('/notifications', { params });
  },

  /**
   * Mark a notification or all notifications as read
   * @param {string} id - Optional notification ID. If not provided, marks all as read.
   */
  markAsRead(id = null) {
    return api.patch('/notifications', { id });
  },

  /**
   * Delete a notification
   * @param {string} id - Notification ID
   */
  deleteNotification(id) {
    return api.delete('/notifications', { params: { id } });
  }
};
