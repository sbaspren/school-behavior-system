import api from './client';

export interface NoorStatusUpdate {
  id: number;
  type: string;
  status: string;
}

export interface NoorBulkItem {
  id: number;
  type: string;
}

export const noorApi = {
  getPendingRecords: (stage?: string, type?: string, filterMode?: string) => {
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (type) params.set('type', type);
    if (filterMode) params.set('filterMode', filterMode);
    return api.get(`/noor/pending-records?${params.toString()}`);
  },

  getStats: (stage?: string, filterMode?: string) => {
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (filterMode) params.set('filterMode', filterMode);
    return api.get(`/noor/stats?${params.toString()}`);
  },

  updateStatus: (updates: NoorStatusUpdate[]) =>
    api.post('/noor/update-status', { updates }),

  exclude: (updates: NoorBulkItem[]) =>
    api.post('/noor/exclude', { updates }),

  restore: (updates: NoorBulkItem[]) =>
    api.post('/noor/restore', { updates }),

  getDocumentedToday: (type?: string) =>
    api.get(`/noor/documented-today?type=${type || 'all'}`),
};
