import api from '@/api/axios';

export const ownerFinanceService = {
  /**
   * Lấy dữ liệu tài chính dashboard cho Owner
   * @param {{ period?: 'day'|'week'|'month'|'year', date?: string }} params
   */
  getFinance(params = {}) {
    return api.get('/owner/finance', { params });
  },

  /**
   * Lấy lịch sử yêu cầu rút tiền
   */
  getPayouts() {
    return api.get('/owner/finance/payouts');
  },

  /**
   * Gửi yêu cầu rút tiền
   * @param {{ amount: number, note?: string }} data
   */
  createPayoutRequest(data) {
    return api.post('/owner/finance/payouts', data);
  }
};

