import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { toast } from 'react-toastify';
import { APP_API_URL } from '@/assets/api-endpoints';

const parseStoredToken = (key) => {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    if (!item) return null;
    try { return JSON.parse(item); } catch { return item; }
};

// Broadcast a silent refresh so the auth context can pick up the new token.
// Without this the context keeps the expired one, and ProtectedRoute's
// isTokenValid() check then renders "Not Authorized" on the next navigation
// even though the session is actually healthy.
export const TOKEN_REFRESHED_EVENT = 'easymed:token-refreshed';

const announceRefreshedToken = (accessToken) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { token: accessToken } })
        );
    }
};

const forceLogout = (message = 'Your session has expired. Please login again.') => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        toast.error(message);
        window.location.href = '/auth/login';
    }
};

const stillLive = (token) => {
    try {
        return jwtDecode(token).exp > Date.now() / 1000;
    } catch {
        return false;
    }
};

// The backend blacklists a refresh token the moment it is used, so only one
// renewal may run at a time: a second one sending the same token is refused,
// and that refusal would log out a user whose session is healthy.
const holdingRefreshLock = (work) => (
    typeof navigator !== 'undefined' && navigator.locks
        // Shared between tabs. Browsers only offer this over HTTPS or localhost.
        ? navigator.locks.request('easymed-token-refresh', work)
        : work()
);

const fetchNewAccessToken = async (rejectedToken) => {
    // Another tab, or a renewal that finished while this request was in the air,
    // may already have replaced the token that was just rejected.
    const storedToken = parseStoredToken('token');
    if (storedToken && storedToken !== rejectedToken && stillLive(storedToken)) {
        return storedToken;
    }

    const refreshToken = parseStoredToken('refresh');
    if (!refreshToken) {
        forceLogout();
        throw new Error('No refresh token stored');
    }

    try {
        // This runs in the browser, so it must go through the Next.js proxy
        // route, not the bare backend path.
        const { data } = await axios.post(APP_API_URL.REFRESH_TOKEN, { refresh: refreshToken });
        // The user logged out while this was in the air: don't log them back in.
        if (!localStorage.getItem('refresh')) {
            throw new Error('Logged out during token renewal');
        }
        localStorage.setItem('token', JSON.stringify(data.access));
        if (data.refresh) {
            // simplejwt rotates the refresh token when ROTATE_REFRESH_TOKENS=True
            localStorage.setItem('refresh', JSON.stringify(data.refresh));
        }
        return data.access;
    } catch (error) {
        // Only the backend refusing the token ends the session. A network failure
        // or a server restart says nothing about it, so the user stays logged in.
        if ([400, 401].includes(error.response?.status)) {
            forceLogout();
        }
        throw error;
    }
};

let renewalInFlight = null;

// Resolves with a live access token. Everything asking at once shares one renewal.
export const renewSession = (rejectedToken) => {
    if (!renewalInFlight) {
        renewalInFlight = holdingRefreshLock(() => fetchNewAccessToken(rejectedToken))
            .then((accessToken) => {
                announceRefreshedToken(accessToken);
                return accessToken;
            })
            .finally(() => {
                renewalInFlight = null;
            });
    }
    return renewalInFlight;
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

                const rejectedToken = originalRequest.headers['Authorization']?.replace('Bearer ', '');
                const newAccessToken = await renewSession(rejectedToken);

                // Retry original request with the new access token
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return axiosInstance(originalRequest);
            }

            return Promise.reject(error);
        }
    );

    return axiosInstance;
};

export default UseAxios;
