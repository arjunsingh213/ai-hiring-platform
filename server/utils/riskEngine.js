/* ═══════════════════════════════════════════════════
   ANTI-CHEATING RISK ENGINE
   Calculates per-skill and per-user risk indices
   based on behavioral signals from assessments
   ═══════════════════════════════════════════════════ */

/**
 * Risk scoring weights for different cheating indicators.
 * Each factor produces a 0-100 score. The weighted sum
 * gives the final risk index.
 */
const RISK_WEIGHTS = {
    tabSwitches: 0.25,        // Tab switching during assessment
    focusLosses: 0.20,        // Window focus loss events
    pasteAttempts: 0.20,      // Copy-paste attempts
    responseTimeAnomaly: 0.15, // Unusually fast responses
    scoreVariance: 0.10,      // Inconsistent scoring across questions
    ipAnomaly: 0.10           // Multiple sessions from different IPs (future)
};

/**
 * Thresholds for each indicator — values above these
 * are considered suspicious
 */
const THRESHOLDS = {
    tabSwitches: { low: 2, medium: 5, high: 10 },
    focusLosses: { low: 3, medium: 6, high: 12 },
    pasteAttempts: { low: 1, medium: 3, high: 5 },
    avgResponseTimeSeconds: { suspiciouslyFast: 5, normalMin: 15 },
    scoreVarianceThreshold: 40 // Points difference between best and worst
};

/**
 * Calculate risk index for a single assessment attempt.
 * @param {Object} antiCheatData - Anti-cheat log from the attempt
 * @param {Array} answers - Array of answer objects with scores and timing
 * @returns {Object} { riskIndex (0-100), riskLevel ('low'|'medium'|'high'), factors }
 */
function calculateAttemptRisk(antiCheatData = {}, answers = []) {
    const factors = {};

    // 1. Tab Switches
    const tabSwitches = antiCheatData.tabSwitches || 0;
    factors.tabSwitches = normalizeRisk(tabSwitches,
        THRESHOLDS.tabSwitches.low,
        THRESHOLDS.tabSwitches.high
    );

    // 2. Focus Losses
    const focusLosses = antiCheatData.focusLosses || 0;
    factors.focusLosses = normalizeRisk(focusLosses,
        THRESHOLDS.focusLosses.low,
        THRESHOLDS.focusLosses.high
    );

    // 3. Paste Attempts
    const pasteAttempts = antiCheatData.pasteAttempts || 0;
    factors.pasteAttempts = normalizeRisk(pasteAttempts,
        THRESHOLDS.pasteAttempts.low,
        THRESHOLDS.pasteAttempts.high
    );

    // 4. Response Time Anomaly — suspiciously fast answers
    if (answers.length > 0) {
        const times = answers
            .map(a => a.responseTime || a.timeTaken || 0)
            .filter(t => t > 0);
        if (times.length > 0) {
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            // If average response is under 5 seconds, very suspicious
            factors.responseTimeAnomaly = avgTime < THRESHOLDS.avgResponseTimeSeconds.suspiciouslyFast
                ? 90
                : avgTime < THRESHOLDS.avgResponseTimeSeconds.normalMin
                    ? Math.round((1 - (avgTime - 5) / 10) * 60)
                    : 0;
        } else {
            factors.responseTimeAnomaly = 0;
        }
    } else {
        factors.responseTimeAnomaly = 0;
    }

    // 5. Score Variance — wildly inconsistent scores suggest selective cheating
    if (answers.length > 2) {
        const scores = answers.map(a =>
            a.score || a.evaluation?.score || 0
        );
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const variance = maxScore - minScore;
        factors.scoreVariance = variance > THRESHOLDS.scoreVarianceThreshold
            ? Math.min(100, Math.round((variance - THRESHOLDS.scoreVarianceThreshold) * 2))
            : 0;
    } else {
        factors.scoreVariance = 0;
    }

    // 6. IP Anomaly — placeholder for future implementation
    factors.ipAnomaly = 0;

    // Calculate weighted risk index
    let riskIndex = 0;
    for (const [key, weight] of Object.entries(RISK_WEIGHTS)) {
        riskIndex += (factors[key] || 0) * weight;
    }
    riskIndex = Math.round(Math.min(100, riskIndex));

    const riskLevel = riskIndex > 60 ? 'high' : riskIndex > 30 ? 'medium' : 'low';

    return { riskIndex, riskLevel, factors };
}

/**
 * Calculate aggregate risk index for a skill across multiple attempts.
 * Uses exponential recency weighting — recent attempts count more.
 * @param {Array} attempts - Array of { riskIndex, timestamp } objects
 * @returns {number} Aggregate risk index (0-100)
 */
function calculateSkillRisk(attempts = []) {
    if (attempts.length === 0) return 0;
    if (attempts.length === 1) return attempts[0].riskIndex;

    // Sort by time (most recent first)
    const sorted = [...attempts].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Exponential weighting — most recent attempt has highest weight
    let totalWeight = 0;
    let weightedSum = 0;
    for (let i = 0; i < sorted.length; i++) {
        const weight = Math.pow(0.7, i); // 1.0, 0.7, 0.49, 0.34...
        weightedSum += sorted[i].riskIndex * weight;
        totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
}

/**
 * Apply risk suppression to a skill score.
 * High-risk skills have their scores reduced.
 * @param {number} rawScore - Original skill score (0-100)
 * @param {number} riskIndex - Risk index (0-100)
 * @returns {number} Risk-adjusted score
 */
function applyRiskSuppression(rawScore, riskIndex) {
    if (riskIndex <= 20) return rawScore; // Low risk — no suppression
    if (riskIndex >= 80) return Math.round(rawScore * 0.3); // Extreme risk — 70% suppression

    // Linear suppression between 20-80 risk
    const suppressionFactor = 1 - ((riskIndex - 20) / 60) * 0.7;
    return Math.round(rawScore * suppressionFactor);
}

/**
 * Normalize a raw count to a 0-100 risk score.
 */
function normalizeRisk(value, lowThreshold, highThreshold) {
    if (value <= lowThreshold) return 0;
    if (value >= highThreshold) return 100;
    return Math.round(((value - lowThreshold) / (highThreshold - lowThreshold)) * 100);
}

module.exports = {
    calculateAttemptRisk,
    calculateSkillRisk,
    applyRiskSuppression,
    RISK_WEIGHTS,
    THRESHOLDS
};
