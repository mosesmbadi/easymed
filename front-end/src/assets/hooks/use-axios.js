import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '@/assets/api-endpoints';

const parseStoredToken = (key) => {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    try { return JSON.parse(item); } catch { return item; }
};

const forceLogout = (message = 'Your session has expired. Please login again.') => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        toast.error(message);
        window.location.href = '/auth/login';
    }
};

const UseAxios = (useAuth) => {
    const user = useAuth;

    const axiosInstance = axios.create({
        headers: {
            Authorization: `Bearer ${user?.token}`,
        },
    });

    // Add response interceptor to handle token expiration
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // Handle 401 Unauthorized errors (token expired/invalid)
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true; // prevent infinite retry loop

                const refreshToken = parseStoredToken('refresh');

                if (refreshToken) {
                    try {
                        // Attempt silent token refresh
                        const { data } = await axios.post(API_URL.REFRESH_TOKEN, { refresh: refreshToken });
                        const newAccessToken = data.access;

                        // Persist the new tokens
                        localStorage.setItem('token', JSON.stringify(newAccessToken));
                        if (data.refresh) {
                            // simplejwt rotates the refresh token when ROTATE_REFRESH_TOKENS=True
                            localStorage.setItem('refresh', JSON.stringify(data.refresh));
                        }

                        // Retry original request with the new access token
                        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        return axiosInstance(originalRequest);
                    } catch (refreshError) {
                        // Refresh token is also invalid/expired — force logout
                        forceLogout();
                        return Promise.reject(refreshError);
                    }
                }

                // No refresh token stored — force logout
                forceLogout();
            }

            return Promise.reject(error);
        }
    );

    return axiosInstance;
};

export default UseAxios;
