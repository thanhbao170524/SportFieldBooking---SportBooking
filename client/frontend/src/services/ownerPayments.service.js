import api from '@/api/axios';

export const ownerPaymentsService = {
  /**
   * GET /owner/payments
   * @param {{ method?: string, status?: string, clubId?: string, q?: string, from?: string, to?: string }} params
   */
  getPayments(params = {}) {
    return api.get('/owner/payments', { params });
  }
};

