import api from './client';

export interface IndicatorDetail {
  label: string;
  exists: boolean;
  count: number;
}

export interface IndicatorData {
  id: number;
  name: string;
  code: string;
  score: number;
  total: number;
  percentage: number;
  color: string;
  details: IndicatorDetail[];
}

export interface CompletionData {
  indicators: IndicatorData[];
  summary: {
    overallPercentage: number;
    committeesReady: number;
    totalMeetings: number;
    readyEvidence: number;
  };
}

export const portfolioApi = {
  getCompletion: () => api.get('/portfolio/completion').then(r => r.data?.data ?? r.data) as Promise<CompletionData>,
};
