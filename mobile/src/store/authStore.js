/**
 * Froscel Mobile - Auth Store
 * Zustand state management for authentication
 */

import { create } from 'zustand';
import { authAPI, tokenManager, userAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
    // State
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,

    // Initialize auth state from storage
    initialize: async () => {
        try {
            set({ isLoading: true, error: null });

            const token = await tokenManager.getToken();
            const user = await tokenManager.getUser();

            if (token && user) {
                set({
                    token,
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            set({ isLoading: false, error: error.message });
        }
    },

    // Login
    login: async (email, password) => {
        try {
            set({ isLoading: true, error: null });

            const response = await authAPI.login(email, password);

            if (response.success) {
                const { user, token } = response.data;

                // Store credentials
                await tokenManager.setToken(token);
                await tokenManager.setUser(user);

                set({
                    user,
                    token,
                    isAuthenticated: true,
                    isLoading: false,
                });

                return { success: true };
            } else {
                set({ isLoading: false, error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMessage = error.error || 'Login failed';
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    },

    // Register
    register: async (data) => {
        try {
            set({ isLoading: true, error: null });

            const response = await authAPI.register(data);

            if (response.success) {
                set({ isLoading: false });
                return { success: true, userId: response.data.userId };
            } else {
                set({ isLoading: false, error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMessage = error.error || 'Registration failed';
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    },

    // Verify email
    verifyEmail: async (token) => {
        try {
            set({ isLoading: true, error: null });

            const response = await authAPI.verifyEmail(token);

            if (response.success) {
                const { user, token: authToken } = response.data;

                await tokenManager.setToken(authToken);
                await tokenManager.setUser(user);

                set({
                    user,
                    token: authToken,
                    isAuthenticated: true,
                    isLoading: false,
                });

                return { success: true };
            } else {
                set({ isLoading: false, error: response.error });
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMessage = error.error || 'Verification failed';
            set({ isLoading: false, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    },

    // Logout
    logout: async () => {
        try {
            await tokenManager.clearAll();
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                error: null,
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    // Update user data
    updateUser: async (userData) => {
        try {
            const { user } = get();
            const userId = user?._id || user?.id;
            if (!userId) return { success: false, error: 'Not authenticated' };

            const response = await userAPI.updateUser(userId, userData);

            if (response.success) {
                const updatedUser = { ...user, ...response.data };
                await tokenManager.setUser(updatedUser);
                set({ user: updatedUser });
                return { success: true };
            }

            return { success: false, error: response.error };
        } catch (error) {
            return { success: false, error: error.error || 'Update failed' };
        }
    },

    // Refresh user data from server
    refreshUser: async () => {
        try {
            const { user } = get();
            const userId = user?._id || user?.id;
            if (!userId) return;

            const response = await userAPI.getUser(userId);

            if (response.success) {
                const updatedUser = response.data;
                await tokenManager.setUser(updatedUser);
                set({ user: updatedUser });
            }
        } catch (error) {
            console.error('Refresh user error:', error);
        }
    },

    // Clear error
    clearError: () => set({ error: null }),
}));

export default useAuthStore;
