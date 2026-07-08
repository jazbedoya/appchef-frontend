import { userApi } from './api';

const notificationsService = {
  async getNotifications({ page = 1, perPage = 20 } = {}) {
    const response = await userApi.get('/notifications', { params: { page, per_page: perPage } });
    return response.data;
  },

  async getUnreadCount() {
    const response = await userApi.get('/notifications/unread-count');
    return response.data;
  },

  async markRead(notificationId) {
    const response = await userApi.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllRead() {
    const response = await userApi.post('/notifications/read-all');
    return response.data;
  },
};

export default notificationsService;
