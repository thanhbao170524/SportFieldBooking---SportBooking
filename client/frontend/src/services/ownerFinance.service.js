import api from '@/api/axios';

export const ownerFinanceService = {
  /**
   * Lấy dữ liệu tài chính dashboard cho Owner
   * @param {{ period?: 'day'|'week'|'month'|'year', date?: string }} params
   */
  getFinance(params = {}) {
    return api.get('/owner/finance', { params });
  }
};

