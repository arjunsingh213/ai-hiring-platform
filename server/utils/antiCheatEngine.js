/**
 * Anti-Cheat Engine
 * Uses Gemini 2.5 Flash for AI-powered cheating detection
 * Combines behavioral analysis with LLM pattern detection
 */

const geminiService = require('../services/ai/geminiService');

/**
 * Calculate overall risk score from behavioral + AI detection data
 * @param {Object} antiCheatLog - Client-side behavioral data
 * @param {Object} aiDetection - AI detection results
 * @returns {Object} { riskScore, riskLevel, flags }
 */
function calculateRiskScore(antiCheatLog = {}, aiDetection = {}) {
    const flags = [];
    let totalRisk = 0;

    // --- Behavioral Scoring ---

    // Tab switching (weight: 15)
    const tabSwitches = antiCheatLog.tabSwitches || 0;
    if (tabSwitches > 5) {
        totalRisk += 15;
        flags.push({ type: 'tab_switch', severity: 'high', details: `${tabSwitches} tab switches detected` });
    } else if (tabSwitches > 2) {
        totalRisk += 8;
        flags.push({ type: 'tab_switch', severity: 'medium', details: `${tabSwitches} tab switches detected` });
    }

    // Focus loss (weight: 10)
    const focusLosses = antiCheatLog.focusLosses || 0;
    if (focusLosses > 5) {
        totalRisk += 10;
        flags.push({ type: 'focus_loss', severity: 'medium', details: `${focusLosses} focus losses` });
    }

    // Paste attempts (weight: 20)
    const pasteAttempts = antiCheatLog.pasteAttempts || 0;
    if (pasteAttempts > 0) {
        totalRisk += Math.min(pasteAttempts * 10, 20);
        flags.push({ type: 'paste_detected', severity: pasteAttempts > 2 ? 'high' : 'medium', details: `${pasteAttempts} paste attempts` });
    }

    // Rapid text injection (weight: 15)
    const rapidInjections = antiCheatLog.rapidInjections || 0;
    if (rapidInjections > 0) {
        totalRisk += Math.min(rapidInjections * 8, 15);
        flags.push({ type: 'rapid_injection', severity: 'high', details: `${rapidInjections} rapid text injections` });
    }

    // Keyboard rhythm anomaly (weight: 10)
    if (antiCheatLog.keyboardRhythm) {
        const { stdDeviation, suspiciousPatterns } = antiCheatLog.keyboardRhythm;
        if (stdDeviation !== undefined && stdDeviation < 10) {
            totalRisk += 10;
            flags.push({ type: 'keyboard_anomaly', severity: 'high', details: `Unusually consistent typing (stdDev: ${stdDeviation}ms)` });
        }
        if (suspiciousPatterns > 0) {
            totalRisk += 5;
            flags.push({ type: 'keyboard_anomaly', severity: 'medium', details: `${suspiciousPatterns} suspicious keyboard patterns` });
        }
    }

    // --- AI Detection Scoring ---

    // LLM pattern score (weight: 15)
    const patternScore = aiDetection.structuredPatternScore || 0;
    if (patternScore > 70) {
        totalRisk += 15;
        flags.push({ type: 'llm_pattern', severity: 'high', details: `LLM pattern confidence: ${patternScore}%` });
    } else if (patternScore > 40) {
        totalRisk += 8;
        flags.push({ type: 'llm_pattern', severity: 'medium', details: `LLM pattern confidence: ${patternScore}%` });
    }

    // Token burst detection (weight: 10)
    if (aiDetection.tokenBurstDetected) {
        totalRisk += 10;
        flags.push({ type: 'token_burst', severity: 'high', details: 'Token burst pattern detected (rapid structured output)' });
    }

    // Similarity score (weight: 10)
    const similarity = aiDetection.similarityScore || 0;
    if (similarity > 80) {
        totalRisk += 10;
        flags.push({ type: 'similarity_match', severity: 'high', details: `Cross-answer similarity: ${similarity}%` });
    }

    // --- Idle Detection Scoring (weight: 8) ---
    const idlePeriods = antiCheatLog.idlePeriods || 0;
    const totalIdleTime = antiCheatLog.totalIdleTime || 0;
    if (idlePeriods > 3) {
        totalRisk += 8;
        flags.push({
            type: 'idle_detected',
            severity: 'medium',
            details: `${idlePeriods} idle periods detected (${Math.round(totalIdleTime / 1000)}s total idle time)`
        });
    } else if (idlePeriods > 1 && totalIdleTime > 60000) {
        totalRisk += 5;
        flags.push({
            type: 'idle_detected',
            severity: 'low',
            details: `${idlePeriods} idle periods (${Math.round(totalIdleTime / 1000)}s total)`
        });
    }

    // --- Concept Drift Scoring (weight: 15) ---
    const driftScore = aiDetection.driftScore || 0;
    if (driftScore > 60) {
        totalRisk += 15;
        flags.push({
            type: 'concept_drift',
            severity: 'high',
            details: `Expertise level drift detected (score: ${driftScore}). ${aiDetection.driftDetails || ''}`
        });
    } else if (driftScore > 30) {
        totalRisk += 8;
        flags.push({
            type: 'concept_drift',
            severity: 'medium',
            details: `Moderate concept drift (score: ${driftScore}). ${aiDetection.driftDetails || ''}`
        });
    }

    // Cap at 100
    const riskScore = Math.min(totalRisk, 100);

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return { riskScore, riskLevel, flags };
}

/**
 * Detect LLM-generated content patterns using Gemini 2.5 Flash
 * @param {Array} answers - Array of answer strings
 * @returns {Object} { structuredPatternScore, tokenBurstDetected, llmConfidenceScore }
 */
async function detectLLMPatterns(answers) {
    try {
        const answerTexts = answers.map((a, i) => `Answer ${i + 1}: ${a.answer || a}`).join('\n\n');

        const prompt = `You are an AI response detection expert. Analyze the following answers for signs of LLM-generated content.

Look for these patterns:
1. Overly structured responses (numbered lists, consistent formatting)
2. Filler phrases common in LLM outputs ("Certainly!", "That's a great question", "In conclusion")
3. Uniform paragraph lengths and sentence structure
4. Lack of personal voice, colloquialisms, or minor errors
5. Technical accuracy without domain-specific nuance
6. Token burst patterns (sudden long responses after short pauses)

ANSWERS TO ANALYZE:
${answerTexts}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "structuredPatternScore": <0-100, how likely these are LLM-generated>,
  "tokenBurstDetected": <true/false>,
  "llmConfidenceScore": <0-100, overall LLM confidence>,
  "reasoning": "<brief explanation>"
}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.1 });

        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return {
                structuredPatternScore: parsed.structuredPatternScore || 0,
                tokenBurstDetected: parsed.tokenBurstDetected || false,
                llmConfidenceScore: parsed.llmConfidenceScore || 0
            };
        }
    } catch (err) {
        console.error('[AntiCheat] LLM pattern detection failed:', err.message);
    }

    return { structuredPatternScore: 0, tokenBurstDetected: false, llmConfidenceScore: 0 };
}

/**
 * Check cross-answer similarity for plagiarism detection
 * @param {Array} answers - Array of answer objects
 * @returns {Number} similarityScore 0-100
 */
async function checkAnswerSimilarity(answers) {
    if (!answers || answers.length < 2) return 0;

    try {
        const texts = answers.map(a => a.answer || a).filter(t => t && t.length > 20);
        if (texts.length < 2) return 0;

        // Check consecutive answer similarity
        let maxSimilarity = 0;
        for (let i = 0; i < texts.length - 1; i++) {
            const similarity = await geminiService.calculateSimilarity(texts[i], texts[i + 1]);
            if (similarity > maxSimilarity) maxSimilarity = similarity;
        }

        return Math.round(maxSimilarity * 100);
    } catch (err) {
        console.error('[AntiCheat] Similarity check failed:', err.message);
        return 0;
    }
}

/**
 * Validate keyboard rhythm for inhuman typing patterns
 * Purely algorithmic, no AI needed
 * @param {Array} keystrokes - Array of { key, timestamp } objects
 * @returns {Object} { avgKeystrokeInterval, stdDeviation, suspiciousPatterns }
 */
function validateKeyboardRhythm(keystrokes) {
    if (!keystrokes || keystrokes.length < 10) {
        return { avgKeystrokeInterval: 0, stdDeviation: 0, suspiciousPatterns: 0 };
    }

    const intervals = [];
    for (let i = 1; i < keystrokes.length; i++) {
        intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Detect suspiciously uniform typing (bots type at very consistent intervals)
    let suspiciousPatterns = 0;
    if (stdDev < 15) suspiciousPatterns++; // Nearly robotic consistency
    if (avg < 30) suspiciousPatterns++;    // Superhuman speed (< 30ms between keys)

    // Detect burst patterns (long pause then rapid output)
    const longPauses = intervals.filter(i => i > 5000).length;
    const rapidBursts = intervals.filter(i => i < 20).length;
    if (longPauses > 2 && rapidBursts > intervals.length * 0.3) {
        suspiciousPatterns++;
    }

    return {
        avgKeystrokeInterval: Math.round(avg),
        stdDeviation: Math.round(stdDev),
        suspiciousPatterns
    };
}

/**
 * Calculate ATP impact score for a challenge attempt
 * Formula: DifficultyWeight × Accuracy × Consistency × AntiCheatModifier
 * @param {Number} score - Raw attempt score (0-100)
 * @param {Object} challenge - Challenge document
 * @param {Number} riskScore - Anti-cheat risk score (0-100)
 * @returns {Number} ATP impact score
 */
function calculateATPImpact(score, challenge, riskScore = 0) {
    const difficultyWeights = { 'Beginner': 0.6, 'Intermediate': 0.8, 'Advanced': 1.0 };
    const difficultyWeight = difficultyWeights[challenge.difficulty] || 0.6;

    const accuracy = score / 100;
    const antiCheatModifier = 1.0 - (riskScore / 200); // Reduces proportionally
    const maxContribution = challenge.atpImpact?.maxContribution || 5;

    const rawImpact = difficultyWeight * accuracy * antiCheatModifier;
    const atpScore = Math.round(rawImpact * maxContribution * 10) / 10;

    return Math.max(0, Math.min(atpScore, maxContribution));
}

/**
 * Detect concept drift across sequential answers
 * Flags when a user's expertise level jumps dramatically mid-challenge,
 * which often indicates they started getting external help
 * @param {Array} answers - Array of { answer, questionIndex } ordered by submission time
 * @param {Object} challenge - Challenge document
 * @returns {Object} { driftDetected, driftScore, driftDetails }
 */
async function detectConceptDrift(answers, challenge) {
    if (!answers || answers.length < 3) {
        return { driftDetected: false, driftScore: 0, driftDetails: '' };
    }

    try {
        const answerTexts = answers.map((a, i) =>
            `Q${i + 1}: ${(challenge.questions?.[i]?.questionText || '').slice(0, 100)}\nA${i + 1}: ${(a.answer || a).slice(0, 300)}`
        ).join('\n\n');

        const prompt = `You are an anti-cheating expert. Analyze these SEQUENTIAL answers for concept drift — a sudden jump in expertise level that suggests the user got external help mid-challenge.

Look for:
1. Early answers showing beginner-level understanding, then sudden expert-level answers
2. Vocabulary/terminology shift (basic words → advanced jargon)
3. Answer structure shift (simple → highly structured/formatted)
4. Depth shift (surface answers → deep technical analysis)
5. Response length jumps (short answers → very detailed responses)

ANSWERS (in order):
${answerTexts}

Respond ONLY with valid JSON (no markdown):
{
  "driftDetected": <true/false>,
  "driftScore": <0-100, how severe the drift is>,
  "driftPoint": <question number where drift occurred, or 0 if none>,
  "details": "<brief explanation>"
}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.1 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return {
                driftDetected: parsed.driftDetected || false,
                driftScore: parsed.driftScore || 0,
                driftPoint: parsed.driftPoint || 0,
                driftDetails: parsed.details || ''
            };
        }
    } catch (err) {
        console.error('[AntiCheat] Concept drift detection failed:', err.message);
    }

    return { driftDetected: false, driftScore: 0, driftPoint: 0, driftDetails: '' };
}

/**
 * Generate adaptive follow-up questions when drift is detected
 * Creates surprise verification questions based on the user's claimed expertise
 * @param {String} topic - The topic/skill being tested
 * @param {String} claimedExpertise - Text of the expert-level answer to verify
 * @param {Number} level - Challenge difficulty level (1-4)
 * @returns {Object|null} { question, expectedConcepts, verificationLevel }
 */
async function generateAdaptiveFollowUp(topic, claimedExpertise, level = 2) {
    try {
        const prompt = `A user claimed this expertise on "${topic}" in a challenge:

"${claimedExpertise.slice(0, 500)}"

Generate ONE surprise follow-up question that would verify whether they truly understand what they wrote. The question should:
- Reference a specific claim or concept they mentioned
- Ask for deeper explanation that a copy-paster couldn't easily answer
- Be impossible to quickly Google (requires genuine understanding)
- Match level ${level} difficulty

Respond ONLY with valid JSON:
{
  "question": "<the follow-up question>",
  "expectedConcepts": ["<concept1 a genuine expert would mention>", "<concept2>", "<concept3>"],
  "verificationLevel": "<what this tests: recall, application, analysis, or synthesis>"
}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.5 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        }
    } catch (err) {
        console.error('[AntiCheat] Adaptive follow-up generation failed:', err.message);
    }
    return null;
}

module.exports = {
    calculateRiskScore,
    detectLLMPatterns,
    checkAnswerSimilarity,
    validateKeyboardRhythm,
    calculateATPImpact,
    detectConceptDrift,
    generateAdaptiveFollowUp
};
