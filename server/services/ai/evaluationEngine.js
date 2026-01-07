/**
 * Dynamic Interview Evaluation Engine
 * 
 * Multi-dimensional evaluation system that:
 * - Evaluates each answer across 7 dimensions
 * - Detects improvement trends
 * - Calculates overall scores
 * - Generates detailed analysis for admin review
 * 
 * NOTE: AI does NOT make final decisions. Results go to admin for approval.
 */

const axios = require('axios');

// AI Model Configuration
const MODELS = {
    LLAMA: {
        name: 'meta-llama/llama-3.1-8b-instruct',
        key: process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_LLAMA_KEY
    }
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Evaluation Dimensions
const DIMENSIONS = {
    domainKnowledge: {
        name: 'Domain Knowledge',
        description: 'Technical accuracy, depth of understanding, correct use of terminology'
    },
    problemSolving: {
        name: 'Problem Solving',
        description: 'Approach to challenges, solution structure, edge case handling'
    },
    criticalThinking: {
        name: 'Critical Thinking',
        description: 'Analysis quality, trade-off consideration, logical reasoning'
    },
    communication: {
        name: 'Communication',
        description: 'Clarity, structure, conciseness, vocabulary usage'
    },
    learningAbility: {
        name: 'Learning Ability',
        description: 'Adaptability, curiosity, references to growth and learning'
    },
    confidence: {
        name: 'Confidence',
        description: 'Self-assurance, certainty in statements, decisiveness'
    },
    consistency: {
        name: 'Consistency',
        description: 'Alignment across answers, no contradictions, reliability'
    }
};

/**
 * Call OpenRouter API
 */
async function callAI(messages, options = {}) {
    if (!MODELS.LLAMA.key) {
        throw new Error('Missing OpenRouter API key');
    }

    try {
        const response = await axios.post(OPENROUTER_URL, {
            model: MODELS.LLAMA.name,
            messages,
            temperature: options.temperature || 0.3, // Low temp for consistent scoring
            max_tokens: options.max_tokens || 2048
        }, {
            headers: {
                'Authorization': `Bearer ${MODELS.LLAMA.key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
                'X-Title': 'AI Hiring Platform - Evaluation Engine'
            },
            timeout: 60000
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('[EVAL] AI call failed:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Extract JSON from AI response
 */
function extractJson(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[1]); } catch (e) { }
        }
        const bracketMatch = text.match(/\{[\s\S]*\}/);
        if (bracketMatch) {
            try { return JSON.parse(bracketMatch[0]); } catch (e) { }
        }
        throw new Error('Failed to extract JSON from response');
    }
}

/**
 * Evaluate a SINGLE answer and extract dimension signals
 * @param {Object} qa - Question and Answer object
 * @param {Object} context - Interview context (role, domain, skills)
 * @param {number} questionIndex - 0-based index
 * @returns {Object} Dimension signals for this answer
 */
async function evaluateSingleAnswer(qa, context, questionIndex) {
    console.log(`[EVAL] Evaluating answer ${questionIndex + 1}: "${qa.question?.substring(0, 50)}..."`);

    // Check for skipped, empty, or "I don't know" answers
    const answer = (qa.answer || '').trim().toLowerCase();
    const skipPatterns = [
        /^i don['']t know/i,
        /^i dont know/i,
        /^skip/i,
        /^skipped/i,
        /^no answer/i,
        /^n\/a$/i,
        /^na$/i,
        /^pass$/i,
        /^idk$/i,
        /^-$/,
        /^\.$/,
        /^\?$/
    ];

    const isSkipped = skipPatterns.some(pattern => pattern.test(answer));
    const isEmpty = answer.length < 10;
    const isGibberish = /^(.)\1{5,}$/.test(answer) || /^[^a-z]*$/.test(answer);

    if (isSkipped || isEmpty || isGibberish) {
        console.log(`[EVAL] Answer ${questionIndex + 1} detected as skipped/empty - assigning 0 scores`);
        return {
            questionIndex,
            question: qa.question,
            category: qa.category || qa.type,
            domainKnowledge: { score: 0, evidence: 'Answer was skipped or empty' },
            problemSolving: { score: 0, evidence: 'Answer was skipped or empty' },
            criticalThinking: { score: 0, evidence: 'Answer was skipped or empty' },
            communication: { score: 0, evidence: 'Answer was skipped or empty' },
            learningAbility: { score: 0, evidence: 'Answer was skipped or empty' },
            confidence: { score: 0, evidence: 'Answer was skipped or empty' },
            consistency: { score: 0, evidence: 'N/A' },
            overallQuality: 0,
            keyStrengths: [],
            keyWeaknesses: ['No substantive answer provided'],
            feedback: 'This question was skipped or received no meaningful answer.',
            wasSkipped: true
        };
    }


    const prompt = `You are a STRICT and ACCURATE interview evaluator. Evaluate this candidate's answer across multiple dimensions.

CONTEXT:
- Role: ${context.role || 'Not specified'}
- Domain: ${context.domain || 'General'}
- Key Skills: ${context.keySkills?.join(', ') || 'Not specified'}
- Question Type: ${qa.category || qa.type || 'general'}
- Difficulty: ${qa.difficulty || 'medium'}

QUESTION:
"${qa.question}"

CANDIDATE'S ANSWER:
"${qa.answer}"

STRICT SCORING GUIDELINES (0-100 scale):
- 0-20: No answer, gibberish, completely wrong, or irrelevant
- 21-40: Very poor - major misunderstandings, mostly incorrect
- 41-55: Below average - some correct points but significant gaps
- 56-70: Average - addresses question but lacks depth or examples
- 71-85: Good - correct, clear, with some examples
- 86-100: Excellent - comprehensive, insightful, with specific examples

For each dimension, provide a score and brief evidence (max 20 words).

Return ONLY valid JSON:
{
    "domainKnowledge": { "score": 0-100, "evidence": "Brief justification" },
    "problemSolving": { "score": 0-100, "evidence": "Brief justification" },
    "criticalThinking": { "score": 0-100, "evidence": "Brief justification" },
    "communication": { "score": 0-100, "evidence": "Brief justification" },
    "learningAbility": { "score": 0-100, "evidence": "Brief justification" },
    "confidence": { "score": 0-100, "evidence": "Brief justification" },
    "consistency": { "score": 0-100, "evidence": "N/A for single answer" },
    "overallQuality": 0-100,
    "keyStrengths": ["strength1", "strength2"],
    "keyWeaknesses": ["weakness1"],
    "feedback": "Brief constructive feedback for this answer"
}`;

    try {
        const response = await callAI([
            { role: 'system', content: 'You are a strict, fair interview evaluator. Score accurately. Return valid JSON only.' },
            { role: 'user', content: prompt }
        ], { temperature: 0.2 });

        const evaluation = extractJson(response);

        // Add metadata
        evaluation.questionIndex = questionIndex;
        evaluation.question = qa.question;
        evaluation.category = qa.category || qa.type;

        console.log(`[EVAL] Answer ${questionIndex + 1} overall quality: ${evaluation.overallQuality}`);
        return evaluation;

    } catch (error) {
        console.error(`[EVAL] Failed to evaluate answer ${questionIndex + 1}:`, error.message);
        // Return neutral scores on failure
        return {
            questionIndex,
            question: qa.question,
            domainKnowledge: { score: 50, evidence: 'Evaluation failed' },
            problemSolving: { score: 50, evidence: 'Evaluation failed' },
            criticalThinking: { score: 50, evidence: 'Evaluation failed' },
            communication: { score: 50, evidence: 'Evaluation failed' },
            learningAbility: { score: 50, evidence: 'Evaluation failed' },
            confidence: { score: 50, evidence: 'Evaluation failed' },
            consistency: { score: 50, evidence: 'N/A' },
            overallQuality: 50,
            keyStrengths: [],
            keyWeaknesses: ['Evaluation error'],
            feedback: 'Unable to evaluate this answer'
        };
    }
}

/**
 * Calculate improvement trend across answers
 * @param {Array} evaluations - Array of per-answer evaluations
 * @returns {Object} Trend analysis
 */
function calculateTrend(evaluations) {
    if (evaluations.length < 2) {
        return { overall: 'insufficient_data', score: 0, boost: 1.0 };
    }

    const scores = evaluations.map(e => e.overallQuality || 50);
    const halfPoint = Math.ceil(scores.length / 2);

    const firstHalf = scores.slice(0, halfPoint);
    const secondHalf = scores.slice(halfPoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const improvement = secondAvg - firstAvg;
    const improvementPercent = (improvement / firstAvg) * 100;

    let trend, boost, description;

    if (improvement > 15) {
        trend = 'strongly_improving';
        boost = 1.12;
        description = 'Candidate showed significant improvement in later questions';
    } else if (improvement > 5) {
        trend = 'improving';
        boost = 1.06;
        description = 'Candidate showed steady improvement throughout the interview';
    } else if (improvement > -5) {
        trend = 'stable';
        boost = 1.0;
        description = 'Candidate maintained consistent performance';
    } else if (improvement > -15) {
        trend = 'declining';
        boost = 0.96;
        description = 'Candidate performance declined slightly in later questions';
    } else {
        trend = 'strongly_declining';
        boost = 0.92;
        description = 'Candidate performance dropped significantly';
    }

    return {
        overall: trend,
        score: Math.round(improvementPercent),
        boost,
        description,
        firstHalfAvg: Math.round(firstAvg),
        secondHalfAvg: Math.round(secondAvg)
    };
}

/**
 * Aggregate dimension scores across all answers
 * @param {Array} evaluations - Array of per-answer evaluations
 * @returns {Object} Aggregated dimension scores
 */
function aggregateDimensions(evaluations) {
    const dimensions = {};

    for (const dim of Object.keys(DIMENSIONS)) {
        const scores = evaluations
            .filter(e => e[dim] && typeof e[dim].score === 'number')
            .map(e => e[dim].score);

        if (scores.length === 0) {
            dimensions[dim] = { score: 0, peak: 0, low: 0, average: 0 };
            continue;
        }

        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = sum / scores.length;
        const peak = Math.max(...scores);
        const low = Math.min(...scores);

        // Calculate weighted average (recent answers weighted slightly more)
        const weightedSum = scores.reduce((acc, score, idx) => {
            const weight = 1 + (idx * 0.1); // Later answers get 10% more weight each
            return acc + (score * weight);
        }, 0);
        const totalWeight = scores.reduce((acc, _, idx) => acc + (1 + idx * 0.1), 0);
        const weightedAvg = weightedSum / totalWeight;

        dimensions[dim] = {
            score: Math.round(weightedAvg),
            peak: Math.round(peak),
            low: Math.round(low),
            average: Math.round(avg),
            label: DIMENSIONS[dim].name
        };
    }

    return dimensions;
}

/**
 * Calculate potential index
 * @param {Object} dimensions - Aggregated dimension scores
 * @param {Object} trend - Improvement trend
 * @returns {Object} Potential index calculation
 */
function calculatePotentialIndex(dimensions, trend) {
    // Calculate base score (average of all dimensions)
    const dimScores = Object.values(dimensions).map(d => d.score);
    const baseScore = dimScores.reduce((a, b) => a + b, 0) / dimScores.length;

    // Apply trend boost
    const trendAdjusted = baseScore * trend.boost;

    // Consider peak performance (shows capability ceiling)
    const peakScores = Object.values(dimensions).map(d => d.peak);
    const avgPeak = peakScores.reduce((a, b) => a + b, 0) / peakScores.length;

    // Potential = blend of actual (60%) and peak (40%)
    const potential = (trendAdjusted * 0.6) + (avgPeak * 0.4);

    // Determine grade
    let grade;
    if (potential >= 90) grade = 'A+';
    else if (potential >= 85) grade = 'A';
    else if (potential >= 80) grade = 'A-';
    else if (potential >= 75) grade = 'B+';
    else if (potential >= 70) grade = 'B';
    else if (potential >= 65) grade = 'B-';
    else if (potential >= 60) grade = 'C+';
    else if (potential >= 55) grade = 'C';
    else if (potential >= 50) grade = 'C-';
    else if (potential >= 45) grade = 'D';
    else grade = 'F';

    return {
        score: Math.round(potential),
        grade,
        baseScore: Math.round(baseScore),
        trendAdjusted: Math.round(trendAdjusted),
        peakAverage: Math.round(avgPeak)
    };
}

/**
 * Generate final evaluation summary for admin review
 * @param {Array} evaluations - Per-answer evaluations
 * @param {Object} dimensions - Aggregated dimensions
 * @param {Object} trend - Trend analysis
 * @param {Object} potential - Potential index
 * @param {Object} context - Interview context
 * @returns {Object} Complete evaluation for admin
 */
async function generateSummary(evaluations, dimensions, trend, potential, context) {
    console.log('[EVAL] Generating evaluation summary...');

    // Collect all strengths and weaknesses
    const allStrengths = evaluations.flatMap(e => e.keyStrengths || []);
    const allWeaknesses = evaluations.flatMap(e => e.keyWeaknesses || []);

    // Count occurrences
    const strengthCounts = {};
    allStrengths.forEach(s => { strengthCounts[s] = (strengthCounts[s] || 0) + 1; });
    const weaknessCounts = {};
    allWeaknesses.forEach(w => { weaknessCounts[w] = (weaknessCounts[w] || 0) + 1; });

    // Get top strengths and weaknesses
    const topStrengths = Object.entries(strengthCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

    const topWeaknesses = Object.entries(weaknessCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

    // Find best and worst dimensions
    const sortedDims = Object.entries(dimensions)
        .sort((a, b) => b[1].score - a[1].score);

    const bestDimensions = sortedDims.slice(0, 3).map(([key, val]) => ({
        dimension: DIMENSIONS[key].name,
        score: val.score
    }));

    const worstDimensions = sortedDims.slice(-3).reverse().map(([key, val]) => ({
        dimension: DIMENSIONS[key].name,
        score: val.score
    }));

    // Generate AI summary for admin
    const summaryPrompt = `Based on interview evaluation data, generate a brief 2-3 sentence summary for admin review.

CANDIDATE:
- Role: ${context.role}
- Domain: ${context.domain}
- Potential Score: ${potential.score}/100 (Grade: ${potential.grade})
- Trend: ${trend.overall} (${trend.description})

TOP STRENGTHS: ${topStrengths.join(', ') || 'None identified'}
DEVELOPMENT AREAS: ${topWeaknesses.join(', ') || 'None identified'}

BEST DIMENSIONS: ${bestDimensions.map(d => `${d.dimension}: ${d.score}`).join(', ')}
WEAKEST DIMENSIONS: ${worstDimensions.map(d => `${d.dimension}: ${d.score}`).join(', ')}

Write a professional, objective summary. Do NOT make hiring recommendations - that's for admin to decide.
Return JSON: { "summary": "2-3 sentence summary", "adminNotes": "Any special observations for admin" }`;

    let aiSummary = { summary: '', adminNotes: '' };
    try {
        const response = await callAI([
            { role: 'system', content: 'Generate brief, professional evaluation summaries. Return JSON only.' },
            { role: 'user', content: summaryPrompt }
        ]);
        aiSummary = extractJson(response);
    } catch (error) {
        console.error('[EVAL] Failed to generate AI summary:', error.message);
        aiSummary = {
            summary: `Candidate achieved ${potential.grade} grade with ${potential.score}/100 potential score. ${trend.description}.`,
            adminNotes: 'AI summary generation failed. Please review individual answers.'
        };
    }

    return {
        summary: aiSummary.summary,
        adminNotes: aiSummary.adminNotes,
        strengths: topStrengths,
        weaknesses: topWeaknesses,
        bestDimensions,
        worstDimensions
    };
}

/**
 * Evaluate coding submission
 * @param {Object} codeSubmission - Code and results
 * @returns {Object} Coding evaluation
 */
function evaluateCoding(codeSubmission) {
    if (!codeSubmission) return null;

    const { code, passed, output, problem } = codeSubmission;

    // Check for empty/template code
    const codeWithoutComments = (code || '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/#.*$/gm, '')
        .replace(/\s+/g, '')
        .trim();

    if (codeWithoutComments.length < 20) {
        return {
            approach: 0,
            explanation: 0,
            correctness: 0,
            efficiency: 0,
            overall: 0,
            feedback: 'No code solution was submitted'
        };
    }

    // Count comments (for explanation score)
    const commentLines = (code.match(/\/\/.*$|\/\*[\s\S]*?\*\/|#.*$/gm) || []).length;
    const totalLines = code.split('\n').length;
    const commentRatio = commentLines / totalLines;

    // Approach score (based on structure)
    const hasFunction = /function\s+\w+|def\s+\w+|public\s+\w+/.test(code);
    const hasVariables = /let\s+\w+|const\s+\w+|var\s+\w+|\w+\s*=/.test(code);
    const hasLoops = /for\s*\(|while\s*\(|forEach|map\(/.test(code);
    const hasConditionals = /if\s*\(|switch\s*\(|ternary|\?/.test(code);

    const approachScore = Math.min(100,
        (hasFunction ? 30 : 10) +
        (hasVariables ? 20 : 10) +
        (hasLoops ? 25 : 10) +
        (hasConditionals ? 25 : 10));

    // Explanation score (based on comments)
    const explanationScore = Math.min(100, Math.round(commentRatio * 300) + 20);

    // Correctness (based on test results)
    const correctnessScore = passed ? 85 : 35;

    // Efficiency (basic heuristics)
    const hasNestedLoops = /for[\s\S]*for|while[\s\S]*while/.test(code);
    const usesBuiltins = /map\(|filter\(|reduce\(|sort\(/.test(code);
    const efficiencyScore = (hasNestedLoops ? 40 : 70) + (usesBuiltins ? 15 : 0);

    // Weighted overall
    const overall = Math.round(
        approachScore * 0.30 +
        explanationScore * 0.25 +
        correctnessScore * 0.25 +
        efficiencyScore * 0.20
    );

    return {
        approach: approachScore,
        explanation: explanationScore,
        correctness: correctnessScore,
        efficiency: Math.min(100, efficiencyScore),
        overall,
        feedback: passed
            ? 'Code executed successfully with correct output'
            : 'Code did not pass all test cases'
    };
}

/**
 * MAIN EVALUATION FUNCTION
 * Evaluates entire interview and generates results for admin review
 * 
 * @param {Array} questionsAndAnswers - All Q&A from interview
 * @param {Object} context - { role, domain, keySkills, blueprint }
 * @param {Object} codingSubmission - Optional coding results
 * @returns {Object} Complete evaluation for admin review
 */
async function evaluateInterview(questionsAndAnswers, context, codingSubmission = null) {
    console.log('[EVAL] Starting interview evaluation...');
    console.log(`[EVAL] Total answers: ${questionsAndAnswers.length}`);
    console.log(`[EVAL] Role: ${context.role}, Domain: ${context.domain}`);

    // 1. Pre-check for empty/invalid answers
    const validAnswers = questionsAndAnswers.filter(qa => {
        const answer = (qa.answer || '').trim();
        return answer.length > 5;
    });

    const invalidCount = questionsAndAnswers.length - validAnswers.length;
    if (invalidCount > questionsAndAnswers.length * 0.5) {
        console.log('[EVAL] Majority invalid answers, returning low scores');
        return {
            success: true,
            overallScore: Math.max(5, 25 - invalidCount * 2),
            dimensions: Object.fromEntries(
                Object.keys(DIMENSIONS).map(k => [k, { score: 10, peak: 15, average: 10 }])
            ),
            trend: { overall: 'insufficient_data', boost: 1.0, description: 'Most answers were empty or invalid' },
            potentialIndex: { score: 15, grade: 'F', baseScore: 15 },
            perAnswerEvaluations: [],
            codingEvaluation: null,
            summary: {
                summary: 'Candidate provided insufficient responses to most questions.',
                adminNotes: 'Review required - majority of answers were empty or invalid',
                strengths: [],
                weaknesses: ['Incomplete responses', 'Lack of engagement']
            },
            evaluatedAt: new Date().toISOString(),
            requiresAdminReview: true
        };
    }

    // 2. Evaluate each answer
    const evaluations = [];
    for (let i = 0; i < questionsAndAnswers.length; i++) {
        const qa = questionsAndAnswers[i];
        const evaluation = await evaluateSingleAnswer(qa, context, i);
        evaluations.push(evaluation);
    }

    // 3. Calculate trend
    const trend = calculateTrend(evaluations);
    console.log(`[EVAL] Trend: ${trend.overall} (boost: ${trend.boost})`);

    // 4. Aggregate dimensions
    const dimensions = aggregateDimensions(evaluations);

    // 5. Calculate potential index
    const potential = calculatePotentialIndex(dimensions, trend);
    console.log(`[EVAL] Potential: ${potential.score} (${potential.grade})`);

    // 6. Evaluate coding if present
    const codingEvaluation = evaluateCoding(codingSubmission);
    if (codingEvaluation) {
        console.log(`[EVAL] Coding score: ${codingEvaluation.overall}`);
    }

    // 7. Generate summary for admin
    const summary = await generateSummary(evaluations, dimensions, trend, potential, context);

    // 8. Calculate overall score
    let overallScore = potential.score;
    if (codingEvaluation) {
        // Blend interview (70%) + coding (30%) for technical roles
        const isTechnical = context.domain === 'Technical' || context.domain === 'Semi-Technical';
        const codingWeight = isTechnical ? 0.30 : 0.15;
        overallScore = Math.round(potential.score * (1 - codingWeight) + codingEvaluation.overall * codingWeight);
    }

    // 9. Compile final result
    const result = {
        success: true,
        overallScore,
        technicalScore: dimensions.domainKnowledge?.score || 0,
        hrScore: dimensions.communication?.score || 0,
        dimensions,
        trend,
        potentialIndex: potential,
        perAnswerEvaluations: evaluations,
        codingEvaluation,
        summary,
        evaluatedAt: new Date().toISOString(),
        requiresAdminReview: true, // Always goes to admin

        // Legacy compatibility fields
        confidence: dimensions.confidence?.score || 0,
        relevance: dimensions.domainKnowledge?.score || 0,
        communication: dimensions.communication?.score || 0,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        feedback: summary.summary
    };

    console.log(`[EVAL] Evaluation complete. Overall: ${overallScore}, Grade: ${potential.grade}`);
    return result;
}

module.exports = {
    evaluateInterview,
    evaluateSingleAnswer,
    evaluateCoding,
    calculateTrend,
    aggregateDimensions,
    calculatePotentialIndex,
    DIMENSIONS
};
