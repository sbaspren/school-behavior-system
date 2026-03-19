import api from './client';

export const licensesApi = {
  checkSetup: () => api.get('/licenses/check-setup'),
  activate: (data: {
    code: string;
    adminName: string;
    adminPhone: string;
    password: string;
    schoolName?: string;
  }) => api.post('/licenses/activate', data),
  getStatus: () => api.get('/licenses/status'),
};
