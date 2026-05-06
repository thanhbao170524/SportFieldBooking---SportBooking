import api from '@/api/axios';

export const stripeConnectService = {
  status() {
    return api.get('/owner/stripe/connect');
  },
  createLink() {
    return api.post('/owner/stripe/connect');
  },
  disconnect() {
    return api.delete('/owner/stripe/connect');
  }
};

