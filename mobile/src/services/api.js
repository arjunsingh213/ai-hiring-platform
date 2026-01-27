/**
 * Froscel Mobile - API Service
 * Consumes existing backend APIs
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API Base URL - Update this to your production URL
const API_BASE_URL = __DEV__
    ? 'http://192.168.31.164:5000/api'
    : 'https://your-production-url.com/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Request interceptor - Add auth token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.warn('Failed to get auth token:', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            // Clear tokens and redirect to login
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(USER_KEY);
            // The app will handle navigation via auth state change
        }

        // Return formatted error
        const errorMessage = error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'An unexpected error occurred';
        return Promise.reject({ error: errorMessage, status: error.response?.status });
    }
);

// ============================================
// AUTH ENDPOINTS
// ============================================

export const authAPI = {
    login: (email, password) =>
        api.post('/auth/login', { email, password }),

    register: (data) =>
        api.post('/auth/register', { ...data, role: 'jobseeker' }),

    verifyEmail: (token) =>
        api.post('/auth/verify-email', { token }),

    resendVerification: (email) =>
        api.post('/auth/resend-verification', { email }),

    forgotPassword: (email) =>
        api.post('/auth/forgot-password', { email }),

    resetPassword: (token, password) =>
        api.post('/auth/reset-password', { token, password }),
};

// ============================================
// USER ENDPOINTS
// ============================================

export const userAPI = {
    getUser: (userId) =>
        api.get(`/users/${userId}`),

    updateUser: (userId, data) =>
        api.put(`/users/${userId}`, data),

    uploadPhoto: (userId, formData) =>
        api.post('/users/upload-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    uploadBanner: (userId, formData) =>
        api.post('/users/upload-banner', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getApplications: (userId) =>
        api.get(`/users/${userId}/applications`),
};

// ============================================
// JOB ENDPOINTS
// ============================================

export const jobAPI = {
    getJobs: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.skills) params.append('skills', filters.skills);
        if (filters.type) params.append('type', filters.type);
        if (filters.location) params.append('location', filters.location);
        if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
        return api.get(`/jobs?${params.toString()}`);
    },

    getJob: (jobId) =>
        api.get(`/jobs/${jobId}`),

    applyToJob: (jobId, userId) =>
        api.post(`/jobs/${jobId}/apply`, { userId }),

    getMatchedJobs: (userId) =>
        api.get(`/jobs/matched/${userId}`),
};

// ============================================
// INTERVIEW ENDPOINTS
// ============================================

export const interviewAPI = {
    getUserInterviews: (userId) =>
        api.get(`/interviews/user/${userId}`),

    getInterview: (interviewId) =>
        api.get(`/interviews/${interviewId}`),

    completeInterview: (interviewId) =>
        api.put(`/interviews/${interviewId}/complete`),

    getDetailedResults: (interviewId) =>
        api.get(`/interviews/${interviewId}/detailed-results`),
};

// ============================================
// JOB INTERVIEW ENDPOINTS
// ============================================

export const jobInterviewAPI = {
    start: (data) =>
        api.post('/job-interview/start', data),

    submitResponse: (interviewId, data) =>
        api.post(`/job-interview/${interviewId}/response`, data),

    complete: (interviewId) =>
        api.put(`/job-interview/${interviewId}/complete`),
};

// ============================================
// ONBOARDING INTERVIEW ENDPOINTS
// ============================================

export const onboardingInterviewAPI = {
    checkStatus: (userId) =>
        api.get(`/onboarding-interview/check-status/${userId}`),

    start: (data) =>
        api.post('/onboarding-interview/start', data),

    next: (data) =>
        api.post('/onboarding-interview/next', data),

    submit: (data) =>
        api.post('/onboarding-interview/submit', data),

    uploadVideo: (formData) =>
        api.post('/onboarding-interview/upload-video', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// ============================================
// TALENT PASSPORT ENDPOINTS
// ============================================

export const passportAPI = {
    getPassport: (userId) =>
        api.get(`/talent-passport/${userId}`),

    getSummary: (userId) =>
        api.get(`/talent-passport/${userId}/summary`),

    refreshPassport: (userId) =>
        api.post(`/talent-passport/${userId}/refresh`),
};

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

export const notificationAPI = {
    getNotifications: (userId, limit = 20) =>
        api.get(`/notifications?userId=${userId}&limit=${limit}`),

    getUnreadCount: (userId) =>
        api.get(`/notifications/unread-count?userId=${userId}`),

    markAsRead: (notificationId) =>
        api.put(`/notifications/${notificationId}/read`),

    markAllRead: (userId) =>
        api.put('/notifications/mark-all-read', { userId }),
};

// ============================================
// RESUME ENDPOINTS
// ============================================

export const resumeAPI = {
    getResume: (userId) =>
        api.get(`/resume/${userId}`),

    uploadResume: (formData) =>
        api.post('/resume/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    parseResume: (formData) =>
        api.post('/resume/parse', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// ============================================
// MESSAGES ENDPOINTS
// ============================================

export const messageAPI = {
    getConversations: (userId) =>
        api.get(`/messages/conversations?userId=${userId}`),

    getMessages: (conversationId) =>
        api.get(`/messages/${conversationId}`),

    sendMessage: (data) =>
        api.post('/messages', data),

    getUnreadCount: (userId) =>
        api.get(`/messages/unread-count?userId=${userId}`),
};

// ============================================
// TOKEN MANAGEMENT
// ============================================

export const tokenManager = {
    setToken: async (token) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    },

    getToken: async () => {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    removeToken: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    },

    setUser: async (user) => {
        if (!user) {
            await SecureStore.deleteItemAsync(USER_KEY);
            return;
        }
        // Minimize user data stored in SecureStore to avoid > 2048 bytes limit
        const minimalUser = {
            _id: user?._id || user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
            role: user?.role,
            profilePhoto: user?.profilePhoto,
        };
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(minimalUser));
    },

    getUser: async () => {
        const userData = await SecureStore.getItemAsync(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    removeUser: async () => {
        await SecureStore.deleteItemAsync(USER_KEY);
    },

    clearAll: async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
    },
};

export default api;
