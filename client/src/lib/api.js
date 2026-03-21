import axios from 'axios';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
    withCredentials: true
});

// Request interceptor — attach Bearer token from localStorage if available
api.interceptors.request.use(config => {
    const token = localStorage.getItem('dam_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — do NOT auto-redirect on 401.
// Let React Router handle auth redirects to avoid infinite loops.
api.interceptors.response.use(
    response => response,
    error => {
        return Promise.reject(error);
    }
);

export default api;
