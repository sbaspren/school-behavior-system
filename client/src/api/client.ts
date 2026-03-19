import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (auth expired) and 403 (subscription expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    if (error.response?.status === 403) {
      // Subscription expired — set flag for App to show expired page
      localStorage.setItem('subscription_expired', '1');
      window.dispatchEvent(new Event('subscription-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
