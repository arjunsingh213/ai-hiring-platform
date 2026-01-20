/**
 * Gemini Rate Limiter
 * Manages request queuing and rate limiting for Gemini API
 * Implements debouncing and request batching
 */

class GeminiRateLimiter {
    constructor() {
        // Per-model rate tracking
        this.modelStats = {
            REASONING: { requests: [], rpmLimit: 2000 },
            UX_LITE: { requests: [], rpmLimit: 2000 },
            ANALYTICS: { requests: [], rpmLimit: 2000 },
            EMBEDDING: { requests: [], rpmLimit: 1500 }
        };

        // Request queue for when rate limited
        this.requestQueue = {
            REASONING: [],
            UX_LITE: [],
            ANALYTICS: [],
            EMBEDDING: []
        };

        // Debounce tracking
        this.debounceTimers = new Map();
        this.lastRequestTime = new Map();

        // Minimum debounce intervals (ms)
        this.debounceIntervals = {
            'skill_suggestions': 600,    // 600ms debounce
            'resume_classification': 500,
            'light_matching': 500,
            'interview_pattern': 500
        };

        console.log('[GeminiRateLimiter] Initialized');
    }

    /**
     * Clean old requests (older than 1 minute)
     */
    cleanOldRequests(modelKey) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        this.modelStats[modelKey].requests = this.modelStats[modelKey].requests.filter(
            timestamp => timestamp > oneMinuteAgo
        );
    }

    /**
     * Check if request can proceed
     */
    canProceed(modelKey) {
        this.cleanOldRequests(modelKey);
        const stats = this.modelStats[modelKey];
        return stats.requests.length < stats.rpmLimit;
    }

    /**
     * Record a request
     */
    recordRequest(modelKey) {
        this.modelStats[modelKey].requests.push(Date.now());
    }

    /**
     * Get remaining requests for a model
     */
    getRemainingRequests(modelKey) {
        this.cleanOldRequests(modelKey);
        const stats = this.modelStats[modelKey];
        return Math.max(0, stats.rpmLimit - stats.requests.length);
    }

    /**
     * Get time until next request is available (ms)
     */
    getWaitTime(modelKey) {
        this.cleanOldRequests(modelKey);
        const stats = this.modelStats[modelKey];

        if (stats.requests.length < stats.rpmLimit) {
            return 0;
        }

        // Find oldest request and calculate when it expires
        const oldestRequest = Math.min(...stats.requests);
        return Math.max(0, (oldestRequest + 60000) - Date.now());
    }

    /**
     * Debounced execution for high-frequency tasks
     * Returns a promise that resolves when the debounced function executes
     */
    debounce(taskType, key, fn) {
        return new Promise((resolve, reject) => {
            const debounceKey = `${taskType}:${key}`;
            const interval = this.debounceIntervals[taskType] || 500;

            // Clear existing timer
            if (this.debounceTimers.has(debounceKey)) {
                clearTimeout(this.debounceTimers.get(debounceKey));
            }

            // Set new timer
            const timer = setTimeout(async () => {
                this.debounceTimers.delete(debounceKey);
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, interval);

            this.debounceTimers.set(debounceKey, timer);
        });
    }

    /**
     * Add request to queue (for when rate limited)
     */
    enqueue(modelKey, request) {
        return new Promise((resolve, reject) => {
            this.requestQueue[modelKey].push({
                request,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Process queue after wait time
            const waitTime = this.getWaitTime(modelKey);
            if (waitTime > 0) {
                setTimeout(() => this.processQueue(modelKey), waitTime);
            } else {
                this.processQueue(modelKey);
            }
        });
    }

    /**
     * Process queued requests
     */
    async processQueue(modelKey) {
        if (this.requestQueue[modelKey].length === 0) return;
        if (!this.canProceed(modelKey)) return;

        const queued = this.requestQueue[modelKey].shift();
        if (!queued) return;

        try {
            this.recordRequest(modelKey);
            const result = await queued.request();
            queued.resolve(result);
        } catch (error) {
            queued.reject(error);
        }

        // Continue processing if more in queue
        if (this.requestQueue[modelKey].length > 0 && this.canProceed(modelKey)) {
            setImmediate(() => this.processQueue(modelKey));
        }
    }

    /**
     * Get rate limit status for all models
     */
    getStatus() {
        const status = {};
        Object.keys(this.modelStats).forEach(modelKey => {
            this.cleanOldRequests(modelKey);
            const stats = this.modelStats[modelKey];
            status[modelKey] = {
                used: stats.requests.length,
                limit: stats.rpmLimit,
                remaining: stats.rpmLimit - stats.requests.length,
                queueLength: this.requestQueue[modelKey].length
            };
        });
        return status;
    }

    /**
     * Check if should use fallback (rate limit critical)
     */
    shouldUseFallback(modelKey) {
        const remaining = this.getRemainingRequests(modelKey);
        // Use fallback if less than or equal to 1 request remaining
        return remaining <= 1;
    }
}

module.exports = new GeminiRateLimiter();
