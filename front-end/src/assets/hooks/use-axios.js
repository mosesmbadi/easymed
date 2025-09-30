import axios from 'axios';
import { toast } from 'react-toastify';

const UseAxios = (useAuth) => {
    const user = useAuth;

    const axiosInstance = axios.create({
        headers: {
            Authorization: `Bearer ${user?.token}`,
        },
    });

    // Add response interceptor to handle token expiration
    axiosInstance.interceptors.response.use(
        (response) => {
            // Return successful responses as-is
            return response;
        },
        (error) => {
            // Handle 401 Unauthorized errors (token expired/invalid)
            if (error.response?.status === 401) {
                const errorData = error.response?.data;
                
                // Check if it's a token validation error
                if (errorData?.code === 'token_not_valid' || 
                    errorData?.detail?.includes('token') ||
                    errorData?.detail?.includes('Token')) {
                    
                    console.log('Token expired/invalid, logging out user');
                    
                    // Clear storage
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refresh');
                    }
                    
                    // Show user-friendly message
                    toast.error('Your session has expired. Please login again.');
                    
                    // Redirect to login
                    if (typeof window !== 'undefined') {
                        window.location.href = '/auth/login';
                    }
                    
                    return Promise.reject(error);
                }
            }
            
            // For other errors, just reject normally
            return Promise.reject(error);
        }
    );

    return axiosInstance;
};

export default UseAxios;
