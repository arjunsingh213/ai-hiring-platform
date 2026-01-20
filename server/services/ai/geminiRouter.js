/**
 * Gemini Router Service
 * Centralized routing for Google Gemini Paid Tier 1 models
 * 
 * Model Assignments (STABLE ALIASES):
 * - gemini-2.0-flash: Primary Reasoning (RPM: 2000)
 * - gemini-2.5-flash: Fallback & UI Tasks (RPM: 1000)
 * - text-embedding-004: Semantic matching (RPM: 1500)
 */

const axios = require('axios');

// Model configurations with STABLE endpoints
const GEMINI_MODELS = {
    // Primary reasoning model
    REASONING: {
        name: 'gemini-2.0-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent',
        rpmLimit: 2000,
        tpmLimit: 4000000,
        useCases: ['interview_questions', 'answer_evaluation', 'recruiter_reports', 'adaptive_followup']
    },
    // Fallback model - Verified 2.5-flash in User's AI Studio
    FALLBACK: {
        name: 'gemini-2.5-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
        rpmLimit: 1000,
        tpmLimit: 1000000,
        useCases: ['fallback_scenarios']
    },
    // High-frequency UI tasks - Shared with 2.5-flash for reliability
    UX_LITE: {
        name: 'gemini-2.5-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
        rpmLimit: 1000,
        tpmLimit: 1000000,
        useCases: ['skill_suggestions', 'resume_classification', 'interview_pattern', 'light_matching']
    },
    // Post-processing model
    ANALYTICS: {
        name: 'gemini-2.5-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
        rpmLimit: 1000,
        tpmLimit: 1000000,
        useCases: ['atp_synthesis', 'career_readiness', 'learning_roadmap', 'strength_weakness']
    },
    // Embedding model - for semantic search
    EMBEDDING: {
        name: 'text-embedding-004',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent',
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
    'validate_answer': 'UX_LITE',

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
        this.models = GEMINI_MODELS;
        this.taskModelMap = TASK_MODEL_MAP;

        // Rate limiting state (RPM)
        this.requestCounts = {};
        this.lastResetTime = {};

        // Burst protection state (Requests per second / spacing)
        this.isLocked = false;
        this.requestQueue = [];
        this.lastRequestTimestamp = 0;
        this.MIN_REQUEST_SPACING = 1500; // 1.5 seconds gap to avoid burst limits

        // Initialize rate limit tracking for each model
        Object.keys(GEMINI_MODELS).forEach(modelKey => {
            this.requestCounts[modelKey] = 0;
            this.lastResetTime[modelKey] = Date.now();
        });

        console.log('[GeminiRouter] Initialized with Paid Tier 1 configuration and Burst Protection');
    }

    /**
     * Check if rate limit allows the request (RPM)
     */
    canMakeRequest(modelKey) {
        const now = Date.now();
        const model = this.models[modelKey];

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
        this.lastRequestTimestamp = Date.now();
    }

    /**
     * Execute a request with Mutual Exclusion (Mutex) and Staggering
     */
    async _executeWithLock(taskFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ taskFn, resolve, reject });
            this._processQueue();
        });
    }

    /**
     * Process the request queue sequentially
     */
    async _processQueue() {
        if (this.isLocked || this.requestQueue.length === 0) return;

        this.isLocked = true;
        const { taskFn, resolve, reject } = this.requestQueue.shift();

        try {
            const timeSinceLast = Date.now() - this.lastRequestTimestamp;
            if (timeSinceLast < this.MIN_REQUEST_SPACING) {
                const waitTime = this.MIN_REQUEST_SPACING - timeSinceLast;
                console.log(`[GeminiRouter] Burst protection: Staggering request. Waiting ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
            }

            const result = await taskFn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.isLocked = false;
            if (this.requestQueue.length > 0) {
                setImmediate(() => this._processQueue());
            }
        }
    }

    /**
     * Make a call to Gemini API with Fallback support and Burst Protection
     */
    async callGemini(taskType, prompt, options = {}) {
        return this._executeWithLock(async () => {
            const primaryModelKey = this.taskModelMap[taskType] || 'REASONING';

            // Try Primary Model
            const result = await this._tryCallModel(primaryModelKey, prompt, options);
            if (result) return result;

            // If Primary fails, try Fallback
            if (this.models[primaryModelKey].useCases.includes('interview_questions') || primaryModelKey === 'REASONING') {
                console.log(`[GeminiRouter] Primary model ${primaryModelKey} failed. Switching to FALLBACK (${this.models.FALLBACK.name})...`);
                return await this._tryCallModel('FALLBACK', prompt, options);
            }

            return null;
        });
    }

    /**
     * Internal helper to call a specific model with retries
     */
    async _tryCallModel(modelKey, prompt, options) {
        const model = this.models[modelKey];
        const maxRetries = options.retries || 3;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[GeminiRouter] CRITICAL: GEMINI_API_KEY is missing');
            return null;
        }

        if (!this.canMakeRequest(modelKey)) {
            console.warn(`[GeminiRouter] RPM limit reached for ${modelKey}`);
            return null;
        }

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                this.recordRequest(modelKey);

                const response = await axios.post(
                    `${model.endpoint}?key=${apiKey}`,
                    {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: options.temperature || 0.7,
                            maxOutputTokens: options.maxTokens || 2048,
                        }
                    },
                    { headers: { 'Content-Type': 'application/json' }, timeout: options.timeout || 30000 }
                );

                const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error('No response content');

                console.log(`[GeminiRouter] ${modelKey} call successful`);
                return text;
            } catch (error) {
                const status = error.response?.status;
                const errorData = error.response?.data;

                if (status === 429) {
                    console.error(`[GeminiRouter] 429 Rate Limited:`, JSON.stringify(errorData));
                }

                if (status === 404 || status === 400) {
                    console.error(`[GeminiRouter] Non-retriable error (${modelKey}): ${status}`, JSON.stringify(errorData));
                    return null;
                }

                if (attempt < maxRetries) {
                    const delay = (Math.pow(2, attempt) * 1000) + (Math.random() * 1000);
                    console.log(`[GeminiRouter] Retrying ${modelKey} in ${Math.round(delay)}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }
        return null;
    }

    /**
     * Generate embeddings using Gemini Embedding model
     */
    async generateEmbedding(text, taskType = 'resume_jd_matching') {
        return this._executeWithLock(async () => {
            const model = this.models.EMBEDDING;
            const apiKey = process.env.GEMINI_API_KEY;

            if (!this.canMakeRequest('EMBEDDING')) return null;

            try {
                this.recordRequest('EMBEDDING');
                const response = await axios.post(
                    `${model.endpoint}?key=${apiKey}`,
                    {
                        model: model.name,
                        content: { parts: [{ text }] },
                        taskType: taskType === 'similarity_detection' ? 'SIMILARITY' : 'RETRIEVAL_DOCUMENT'
                    },
                    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
                );
                return response.data.embedding?.values || null;
            } catch (error) {
                console.error('[GeminiRouter] Embedding error:', error.message);
                return null;
            }
        });
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
        status.queueLength = this.requestQueue.length;
        return status;
    }
}

module.exports = new GeminiRouter();
