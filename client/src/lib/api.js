import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
    withCredentials: true
});

if (import.meta.env.DEV) console.log("[API] Base URL:", api.defaults.baseURL);

// Response interceptor — do NOT auto-redirect on 401.
// Let React Router handle auth redirects to avoid infinite loops.
api.interceptors.response.use(
    response => response,
    error => {
        return Promise.reject(error);
    }
);

export default api;
