import axios from 'axios';

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  console.log('Backend URL from env:', process.env.NEXT_PUBLIC_BACKEND_URL);
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (isDev) {
      console.log('Token from localStorage:', token);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;