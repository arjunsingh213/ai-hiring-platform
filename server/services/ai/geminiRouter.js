/**
 * Gemini Router Service
 * Centralized routing for Google Gemini free-tier models
 * 
 * Model Assignments (STABLE ALIASES - NO PREVIEW IDs):
 * - gemini-2.0-flash: Interview questions, answer evaluation, recruiter reports
 * - gemini-2.0-flash-lite: Skill suggestions, resume classification (high RPM)
 * - gemini-2.0-flash: ATP synthesis, career roadmaps (post-interview)
 * - text-embedding-004: Semantic matching (embeddings)
 */

const axios = require('axios');

// Model configurations with STABLE endpoints (NO PREVIEW MODEL IDs)
// Increased RPM limits for interview flow (Gemini free-tier allows 60 RPM)
const GEMINI_MODELS = {
    // Primary reasoning model - for complex tasks
    REASONING: {
        name: 'gemini-2.0-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        rpmLimit: 60, // Gemini free-tier limit
        tpmLimit: 1000000,
        useCases: ['interview_questions', 'answer_evaluation', 'recruiter_reports', 'adaptive_followup']
    },
    // High-frequency UX model - for fast, lightweight tasks
    UX_LITE: {
        name: 'gemini-2.0-flash-lite',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
        rpmLimit: 60, // Gemini free-tier limit
        tpmLimit: 1000000,
        useCases: ['skill_suggestions', 'resume_classification', 'interview_pattern', 'light_matching']
    },
    // Post-processing model - for analytics
    ANALYTICS: {
        name: 'gemini-2.0-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        rpmLimit: 60, // Gemini free-tier limit
        tpmLimit: 1000000,
        useCases: ['atp_synthesis', 'career_readiness', 'learning_roadmap', 'strength_weakness']
    },
    // Embedding model - for semantic search
    EMBEDDING: {
        name: 'text-embedding-004',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
        rpmLimit: 1500,
        tpmLimit: 1000000,
        useCases: ['resume_jd_matching', 'candidate_ranking', 'similarity_detection']
    }
};

// Task to model mapping
const TASK_MODEL_MAP = {
    // Reasoning tasks
    'interview_questions': 'REASONING',
    'answer_evaluation': 'REASONING',
    'recruiter_reports': 'REASONING',
    'adaptive_followup': 'REASONING',

    // UX tasks (high frequency)
    'skill_suggestions': 'UX_LITE',
    'resume_classification': 'UX_LITE',
    'interview_pattern': 'UX_LITE',
    'light_matching': 'UX_LITE',

    // Analytics tasks (post-processing)
    'atp_synthesis': 'ANALYTICS',
    'career_readiness': 'ANALYTICS',
    'learning_roadmap': 'ANALYTICS',
    'strength_weakness': 'ANALYTICS',

    // Embedding tasks
    'resume_jd_matching': 'EMBEDDING',
    'candidate_ranking': 'EMBEDDING',
    'similarity_detection': 'EMBEDDING'
};

class GeminiRouter {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.models = GEMINI_MODELS;
        this.taskModelMap = TASK_MODEL_MAP;

        // Rate limiting state
        this.requestCounts = {};
        this.lastResetTime = {};

        // Initialize rate limit tracking for each model
        Object.keys(GEMINI_MODELS).forEach(modelKey => {
            this.requestCounts[modelKey] = 0;
            this.lastResetTime[modelKey] = Date.now();
        });

        console.log('[GeminiRouter] Initialized with models:', Object.keys(GEMINI_MODELS).join(', '));
        console.log('[GeminiRouter] API Key present:', !!this.apiKey);
    }

    /**
     * Get the appropriate model for a task
     */
    getModelForTask(taskType) {
        const modelKey = this.taskModelMap[taskType];
        if (!modelKey) {
            console.warn(`[GeminiRouter] Unknown task type: ${taskType}, defaulting to REASONING`);
            return this.models.REASONING;
        }
        return this.models[modelKey];
    }

    /**
     * Check if rate limit allows the request
     */
    canMakeRequest(modelKey) {
        const now = Date.now();
        const model = this.models[modelKey];

        // Reset counter every minute
        if (now - this.lastResetTime[modelKey] >= 60000) {
            this.requestCounts[modelKey] = 0;
            this.lastResetTime[modelKey] = now;
        }

        return this.requestCounts[modelKey] < model.rpmLimit;
    }

    /**
     * Record a request for rate limiting
     */
    recordRequest(modelKey) {
        this.requestCounts[modelKey]++;
    }

    /**
     * Make a call to Gemini API with retry for 429 errors
     */
    async callGemini(taskType, prompt, options = {}) {
        const modelKey = this.taskModelMap[taskType] || 'REASONING';
        const model = this.models[modelKey];
        const maxRetries = options.retries || 2;

        // Check rate limit
        if (!this.canMakeRequest(modelKey)) {
            console.warn(`[GeminiRouter] Rate limit reached for ${modelKey}, returning null`);
            return null;
        }

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                this.recordRequest(modelKey);

                const response = await axios.post(
                    `${model.endpoint}?key=${this.apiKey}`,
                    {
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: options.temperature || 0.7,
                            maxOutputTokens: options.maxTokens || 2048,
                        }
                    },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: options.timeout || 30000
                    }
                );

                const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) {
                    throw new Error('No response from Gemini');
                }

                console.log(`[GeminiRouter] ${modelKey} call successful for task: ${taskType}`);
                return text;
            } catch (error) {
                const status = error.response?.status;
                const isRateLimit = status === 429;

                console.error(`[GeminiRouter] API error (${modelKey}):`, error.response?.data || error.message);

                // Retry on 429 with exponential backoff
                if (isRateLimit && attempt < maxRetries) {
                    const delay = (attempt + 1) * 2000; // 2s, 4s
                    console.log(`[GeminiRouter] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Return null to allow fallback
                return null;
            }
        }

        return null;
    }

    /**
     * Generate embeddings using Gemini Embedding model
     */
    async generateEmbedding(text, taskType = 'resume_jd_matching') {
        const model = this.models.EMBEDDING;

        if (!this.canMakeRequest('EMBEDDING')) {
            console.warn('[GeminiRouter] Rate limit reached for embeddings');
            return null;
        }

        try {
            this.recordRequest('EMBEDDING');

            const response = await axios.post(
                `${model.endpoint}?key=${this.apiKey}`,
                {
                    model: model.name,
                    content: {
                        parts: [{ text }]
                    },
                    taskType: taskType === 'similarity_detection' ? 'SIMILARITY' : 'RETRIEVAL_DOCUMENT'
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000
                }
            );

            return response.data.embedding?.values || null;
        } catch (error) {
            console.error('[GeminiRouter] Embedding error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus() {
        const status = {};
        Object.keys(this.models).forEach(modelKey => {
            status[modelKey] = {
                used: this.requestCounts[modelKey],
                limit: this.models[modelKey].rpmLimit,
                remaining: this.models[modelKey].rpmLimit - this.requestCounts[modelKey]
            };
        });
        return status;
    }
}

module.exports = new GeminiRouter();
