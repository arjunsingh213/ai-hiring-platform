/**
 * Froscel Mobile - Interview Store
 * State management for interview flow
 */

import { create } from 'zustand';
import { interviewAPI, onboardingInterviewAPI, jobInterviewAPI } from '../services/api';

const useInterviewStore = create((set, get) => ({
    // State
    interviews: [],
    currentInterview: null,
    currentQuestion: null,
    currentQuestionIndex: 0,
    responses: [],
    isLoading: false,
    error: null,
    interviewStatus: null, // 'pending', 'in_progress', 'completed', 'under_review'
    blueprint: null, // For adaptive interviews
    currentRound: null,
    progress: null,

    // Fetch user's interviews
    fetchInterviews: async (userId) => {
        try {
            set({ isLoading: true, error: null });

            if (!userId) {
                set({ isLoading: false, error: 'User ID missing' });
                return { success: false, error: 'Authentication required' };
            }

            const response = await interviewAPI.getUserInterviews(userId);

            if (response.success) {
                set({ interviews: response.data || [], isLoading: false });
                return { success: true };
            }

            set({ isLoading: false, error: response.error });
            return { success: false, error: response.error };
        } catch (error) {
            set({ isLoading: false, error: error.error });
            return { success: false, error: error.error };
        }
    },

    // Start a new interview
    startInterview: async (userId, jobId, context = {}) => {
        try {
            set({ isLoading: true, error: null });

            let response;
            if (!jobId) {
                // Platform Onboarding Interview (Sync with Web)
                response = await onboardingInterviewAPI.start({
                    userId,
                    parsedResume: context.parsedResume,
                    desiredRole: context.desiredRole,
                    experienceLevel: context.experienceLevel,
                });
            } else {
                // Job-Specific Interview (Sync with Web)
                response = await jobInterviewAPI.start({ userId, jobId });
            }

            if (response.success) {
                // Unify different backend response shapes:
                // 1. { success: true, data: { ... } } -> Legacy/Common
                // 2. { success: true, interview: { ... } } -> Job Interview
                // 3. { success: true, question: ..., blueprint: ... } -> Onboarding Adaptive

                const interviewData = response?.data || response?.interview || response;
                const firstQuestion = response?.question || interviewData?.questions?.[0] || interviewData?.currentQuestion;

                set({
                    currentInterview: interviewData,
                    currentQuestion: firstQuestion || null,
                    currentQuestionIndex: 0,
                    responses: [],
                    isLoading: false,
                    interviewStatus: 'in_progress',
                    blueprint: response?.blueprint || interviewData?.blueprint || null,
                });

                return { success: true, interview: interviewData };
            }

            set({ isLoading: false, error: response.error });
            return { success: false, error: response.error };
        } catch (error) {
            set({ isLoading: false, error: error.error || 'Failed to start interview' });
            return { success: false, error: error.error || 'Failed to start interview' };
        }
    },

    // Submit a response
    submitResponse: async (answer, timeSpent) => {
        try {
            const { currentInterview, currentQuestionIndex, responses, blueprint } = get();

            if (!currentInterview && !blueprint) {
                return { success: false, error: 'No active interview' };
            }

            set({ isLoading: true, error: null });

            let response;
            if (!currentInterview?.jobId && !currentInterview?.job) {
                // Onboarding Flow (Sync with Web - uses /next)
                response = await onboardingInterviewAPI.next({
                    currentQuestion: get().currentQuestion,
                    answer,
                    history: responses,
                    blueprint: blueprint
                });
            } else {
                // Job Flow
                const interviewId = currentInterview?._id || currentInterview?.id;
                if (!interviewId) {
                    set({ isLoading: false, error: 'Interview ID missing' });
                    return { success: false, error: 'Interview session error' };
                }

                response = await jobInterviewAPI.submitResponse(interviewId, {
                    questionIndex: currentQuestionIndex,
                    answer,
                    timeSpent
                });
            }

            if (response.success) {
                if (!response.valid) {
                    set({ isLoading: false });
                    return { success: true, invalid: true, message: response.message };
                }

                const newResponses = [...responses, {
                    question: get().currentQuestion?.question,
                    answer,
                    timeSpent
                }];

                // Check if completed
                if (response.completed) {
                    set({
                        responses: newResponses,
                        isLoading: false,
                        interviewStatus: 'completing',
                    });
                    return { success: true, hasNext: false };
                }

                const nextQuestion = response.question;
                const nextIndex = currentQuestionIndex + 1;

                if (nextQuestion) {
                    set({
                        currentQuestion: nextQuestion,
                        currentQuestionIndex: nextIndex,
                        responses: newResponses,
                        isLoading: false,
                        progress: response.progress || null,
                    });
                    return { success: true, hasNext: true };
                } else {
                    set({
                        responses: newResponses,
                        isLoading: false,
                        interviewStatus: 'completing',
                    });
                    return { success: true, hasNext: false };
                }
            }

            set({ isLoading: false, error: response.error });
            return { success: false, error: response.error };
        } catch (error) {
            set({ isLoading: false, error: error.error || 'Failed to submit response' });
            return { success: false, error: error.error || 'Failed to submit response' };
        }
    },

    // Complete the interview
    completeInterview: async () => {
        try {
            const { currentInterview } = get();

            if (!currentInterview) {
                return { success: false, error: 'No active interview' };
            }

            set({ isLoading: true, error: null });

            const interviewId = currentInterview?._id || currentInterview?.id;
            if (!interviewId) {
                // If it's an onboarding session, we don't necessarily call 'complete' on a specific record
                set({ interviewStatus: 'under_review', isLoading: false });
                return { success: true };
            }

            const response = await interviewAPI.completeInterview(interviewId);

            if (response.success) {
                set({
                    interviewStatus: 'under_review',
                    isLoading: false,
                });
                return { success: true };
            }

            set({ isLoading: false, error: response.error });
            return { success: false, error: response.error };
        } catch (error) {
            set({ isLoading: false, error: error.error });
            return { success: false, error: error.error };
        }
    },

    // Get interview details
    getInterview: async (interviewId) => {
        try {
            if (!interviewId) return { success: false, error: 'Interview ID required' };
            set({ isLoading: true, error: null });

            const response = await interviewAPI.getInterview(interviewId);

            if (response.success) {
                set({ currentInterview: response.data, isLoading: false });
                return { success: true, interview: response.data };
            }

            set({ isLoading: false, error: response.error });
            return { success: false, error: response.error };
        } catch (error) {
            set({ isLoading: false, error: error.error });
            return { success: false, error: error.error };
        }
    },

    // Reset interview state
    resetInterview: () => {
        set({
            currentInterview: null,
            currentQuestion: null,
            currentQuestionIndex: 0,
            responses: [],
            interviewStatus: null,
            error: null,
        });
    },

    // Clear error
    clearError: () => set({ error: null }),
}));

export default useInterviewStore;
