/**
 * Gemini Cache Service
 * In-memory LRU cache for Gemini API responses
 * Reduces API calls and improves response time
 */

const crypto = require('crypto');

class GeminiCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 500; // Max cached items
        this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default

        // TTL configurations by task type
        this.ttlByTask = {
            // Short TTL for dynamic content
            'skill_suggestions': 60000,      // 1 minute (frequent updates)
            'light_matching': 120000,        // 2 minutes

            // Medium TTL for semi-static content
            'resume_classification': 300000, // 5 minutes
            'interview_pattern': 300000,     // 5 minutes

            // Long TTL for expensive computations
            'interview_questions': 600000,   // 10 minutes
            'answer_evaluation': 3600000,    // 1 hour (expensive, rarely changes)
            'recruiter_reports': 3600000,    // 1 hour
            'atp_synthesis': 3600000,        // 1 hour
            'career_readiness': 3600000,     // 1 hour
            'learning_roadmap': 3600000,     // 1 hour

            // Embeddings (very long TTL - vectors rarely change)
            'resume_jd_matching': 86400000,  // 24 hours
            'candidate_ranking': 86400000,   // 24 hours
            'similarity_detection': 86400000 // 24 hours
        };

        // Prefix cache for autocomplete (skill suggestions)
        this.prefixCache = new Map();
        this.prefixMaxSize = 100;

        console.log('[GeminiCache] Initialized with maxSize:', this.maxSize);
    }

    /**
     * Generate cache key from prompt
     */
    generateKey(taskType, prompt) {
        const hash = crypto.createHash('md5').update(`${taskType}:${prompt}`).digest('hex');
        return `${taskType}:${hash}`;
    }

    /**
     * Get TTL for a specific task type
     */
    getTTL(taskType) {
        return this.ttlByTask[taskType] || this.defaultTTL;
    }

    /**
     * Get cached response
     */
    get(taskType, prompt) {
        const key = this.generateKey(taskType, prompt);
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if expired
        if (Date.now() > cached.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        // Move to end (LRU behavior)
        this.cache.delete(key);
        this.cache.set(key, cached);

        console.log(`[GeminiCache] HIT for ${taskType}`);
        return cached.value;
    }

    /**
     * Set cached response
     */
    set(taskType, prompt, value) {
        const key = this.generateKey(taskType, prompt);
        const ttl = this.getTTL(taskType);

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl,
            taskType,
            createdAt: Date.now()
        });

        console.log(`[GeminiCache] SET for ${taskType}, TTL: ${ttl / 1000}s`);
    }

    /**
     * Get prefix-based cache (for autocomplete)
     */
    getPrefix(prefix) {
        const normalizedPrefix = prefix.toLowerCase().trim();
        if (normalizedPrefix.length < 2) return null;

        const cached = this.prefixCache.get(normalizedPrefix);
        if (!cached) return null;

        if (Date.now() > cached.expiresAt) {
            this.prefixCache.delete(normalizedPrefix);
            return null;
        }

        return cached.suggestions;
    }

    /**
     * Set prefix-based cache
     */
    setPrefix(prefix, suggestions) {
        const normalizedPrefix = prefix.toLowerCase().trim();
        if (normalizedPrefix.length < 2) return;

        // Evict oldest if at capacity
        if (this.prefixCache.size >= this.prefixMaxSize) {
            const firstKey = this.prefixCache.keys().next().value;
            this.prefixCache.delete(firstKey);
        }

        this.prefixCache.set(normalizedPrefix, {
            suggestions,
            expiresAt: Date.now() + 60000 // 1 minute TTL for prefixes
        });
    }

    /**
     * Clear cache for a specific task type
     */
    clearByTaskType(taskType) {
        let cleared = 0;
        for (const [key, value] of this.cache.entries()) {
            if (value.taskType === taskType) {
                this.cache.delete(key);
                cleared++;
            }
        }
        console.log(`[GeminiCache] Cleared ${cleared} entries for ${taskType}`);
    }

    /**
     * Clear all cache
     */
    clearAll() {
        this.cache.clear();
        this.prefixCache.clear();
        console.log('[GeminiCache] All cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            mainCacheSize: this.cache.size,
            mainCacheMaxSize: this.maxSize,
            prefixCacheSize: this.prefixCache.size,
            prefixCacheMaxSize: this.prefixMaxSize
        };
    }
}

module.exports = new GeminiCache();
