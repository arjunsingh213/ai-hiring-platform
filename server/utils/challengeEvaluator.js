/**
 * Challenge Evaluator
 * Uses Gemini 2.5 Flash for AI-powered challenge evaluation and generation
 */

const geminiService = require('../services/ai/geminiService');

/**
 * Evaluate a general challenge submission (quiz, writing, simulation)
 * @param {Object} challenge - Challenge document
 * @param {Array} answers - Array of { questionIndex, answer }
 * @returns {Object} { scores[], totalScore, accuracy, feedback }
 */
async function evaluateChallenge(challenge, answers) {
    const results = [];
    let totalScore = 0;
    let maxPossible = 0;

    for (const ans of answers) {
        const question = challenge.questions[ans.questionIndex];
        if (!question) continue;

        maxPossible += question.maxScore;
        let score = 0;
        let feedback = '';
        let isCorrect = false;

        if (question.questionType === 'mcq') {
            // Direct comparison for MCQs
            isCorrect = ans.answer?.trim()?.toLowerCase() === question.correctAnswer?.trim()?.toLowerCase();
            score = isCorrect ? question.maxScore : 0;
            feedback = isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.correctAnswer}`;
        } else if (question.questionType === 'short-answer') {
            // Use Gemini to evaluate short answers
            score = await evaluateWithAI(question, ans.answer, question.maxScore);
            isCorrect = score >= question.maxScore * 0.7;
            feedback = isCorrect ? 'Well answered!' : 'Your answer could be more complete.';
        } else if (question.questionType === 'essay' || question.questionType === 'simulation') {
            // Use Gemini for essay/simulation evaluation
            const evalResult = await evaluateEssayWithAI(question, ans.answer);
            score = evalResult.score;
            feedback = evalResult.feedback;
            isCorrect = score >= question.maxScore * 0.6;
        } else if (question.questionType === 'code') {
            // Delegate to code evaluator
            const codeResult = await evaluateCodingChallenge(
                ans.codeSubmission || ans.answer,
                question.testCases,
                question.codeLanguage
            );
            score = Math.round((codeResult.passRate / 100) * question.maxScore);
            feedback = codeResult.feedback;
            isCorrect = codeResult.passRate >= 70;
        }

        totalScore += score;
        results.push({
            questionIndex: ans.questionIndex,
            score,
            maxScore: question.maxScore,
            feedback,
            isCorrect
        });
    }

    const accuracy = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

    return { scores: results, totalScore, maxPossible, accuracy, feedback: `Scored ${totalScore}/${maxPossible} (${accuracy}%)` };
}

/**
 * Evaluate a short answer using Gemini
 */
async function evaluateWithAI(question, answer, maxScore) {
    try {
        const prompt = `Evaluate this answer to the following question.

Question: ${question.questionText}
${question.correctAnswer ? `Expected Answer: ${question.correctAnswer}` : ''}
${question.rubricCriteria?.length ? `Rubric: ${question.rubricCriteria.map(r => `${r.criterion} (${r.maxPoints} pts)`).join(', ')}` : ''}

Student Answer: ${answer}

Score this answer out of ${maxScore}. Respond ONLY with a JSON object (no markdown):
{"score": <number>, "feedback": "<brief feedback>"}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.2 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return Math.min(parsed.score || 0, maxScore);
        }
    } catch (err) {
        console.error('[ChallengeEval] AI evaluation failed:', err.message);
    }

    // Fallback: basic keyword matching
    if (question.correctAnswer) {
        const keywords = question.correctAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const ansLower = (answer || '').toLowerCase();
        const matches = keywords.filter(k => ansLower.includes(k)).length;
        return Math.round((matches / Math.max(keywords.length, 1)) * maxScore);
    }
    return Math.round(maxScore * 0.5);
}

/**
 * Evaluate essay or simulation answers using Gemini
 */
async function evaluateEssayWithAI(question, answer) {
    try {
        const rubricText = question.rubricCriteria?.length
            ? question.rubricCriteria.map(r => `- ${r.criterion}: ${r.maxPoints} points`).join('\n')
            : `- Content quality: ${Math.round(question.maxScore * 0.4)} points\n- Depth of analysis: ${Math.round(question.maxScore * 0.3)} points\n- Clarity: ${Math.round(question.maxScore * 0.3)} points`;

        const prompt = `You are evaluating a challenge submission. Score strictly and fairly.

Question: ${question.questionText}
Max Score: ${question.maxScore}

Rubric:
${rubricText}

Student Answer:
${answer}

Respond ONLY with a JSON object (no markdown):
{"score": <number out of ${question.maxScore}>, "feedback": "<constructive feedback, 2-3 sentences>"}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.2 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return {
                score: Math.min(parsed.score || 0, question.maxScore),
                feedback: parsed.feedback || 'Evaluation complete.'
            };
        }
    } catch (err) {
        console.error('[ChallengeEval] Essay evaluation failed:', err.message);
    }

    return { score: Math.round(question.maxScore * 0.5), feedback: 'Auto-evaluation unavailable. Score is estimated.' };
}

/**
 * Evaluate a coding challenge submission
 * @param {String} code - Submitted code
 * @param {Array} testCases - Array of { input, expectedOutput, hidden }
 * @param {String} language - Programming language
 * @returns {Object} { passRate, passed, total, feedback }
 */
async function evaluateCodingChallenge(code, testCases, language) {
    if (!testCases || testCases.length === 0) {
        // No test cases — use Gemini to evaluate code quality
        try {
            const result = await geminiService.evaluateCodeSolution(
                code,
                { description: 'Evaluate the submitted code for correctness and quality' },
                language || 'javascript',
                'N/A',
                true
            );
            if (result) {
                return {
                    passRate: result.score || 50,
                    passed: result.score >= 50 ? 1 : 0,
                    total: 1,
                    feedback: result.feedback || 'Code evaluated by AI.'
                };
            }
        } catch (err) {
            console.error('[ChallengeEval] Code evaluation failed:', err.message);
        }
        return { passRate: 50, passed: 0, total: 0, feedback: 'Unable to evaluate code submission.' };
    }

    // With test cases — use Gemini to check logic against test cases
    try {
        const testCaseStr = testCases.map((tc, i) =>
            `Test ${i + 1}: Input: ${tc.input} → Expected: ${tc.expectedOutput}`
        ).join('\n');

        const prompt = `Evaluate this ${language || 'code'} submission against the test cases.

CODE:
\`\`\`${language || 'code'}
${code}
\`\`\`

TEST CASES:
${testCaseStr}

For each test case, determine if the code would produce the expected output.
Respond ONLY with JSON (no markdown):
{"passed": <number of tests passed>, "total": ${testCases.length}, "results": [{"testIndex": <n>, "pass": <boolean>, "reason": "<brief>"}], "feedback": "<overall feedback>"}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.1 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            const passed = parsed.passed || 0;
            return {
                passRate: Math.round((passed / testCases.length) * 100),
                passed,
                total: testCases.length,
                feedback: parsed.feedback || `${passed}/${testCases.length} test cases passed.`
            };
        }
    } catch (err) {
        console.error('[ChallengeEval] Code test evaluation failed:', err.message);
    }

    return { passRate: 0, passed: 0, total: testCases.length, feedback: 'Code evaluation unavailable.' };
}

/**
 * Evaluate simulation answers for cross-question consistency
 */
async function evaluateSimulation(answers, consistencyRules) {
    try {
        const answerText = answers.map((a, i) =>
            `Question ${i + 1}: ${a.questionText || 'N/A'}\nAnswer: ${a.answer || 'N/A'}`
        ).join('\n\n');

        const prompt = `Evaluate these simulation answers for internal consistency and quality.

${consistencyRules ? `Consistency Rules: ${JSON.stringify(consistencyRules)}` : ''}

ANSWERS:
${answerText}

Check for:
1. Logical consistency across answers
2. Contradictions
3. Depth of reasoning
4. Practical applicability

Respond ONLY with JSON (no markdown):
{"consistencyScore": <0-100>, "contradictions": [<list of contradictions if any>], "overallQuality": <0-100>, "feedback": "<summary>"}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.2 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        }
    } catch (err) {
        console.error('[ChallengeEval] Simulation evaluation failed:', err.message);
    }

    return { consistencyScore: 70, contradictions: [], overallQuality: 60, feedback: 'Auto-evaluation unavailable.' };
}

/**
 * Generate domain-specific challenge content using Gemini
 * @param {String} domain - Challenge domain
 * @param {String} difficulty - Beginner/Intermediate/Advanced
 * @param {Array} skills - Relevant skill tags
 * @returns {Object} Generated challenge data
 */
async function generateDomainChallenge(domain, difficulty, skills = []) {
    try {
        const skillText = skills.length ? `Focus on these skills: ${skills.join(', ')}` : '';

        const prompt = `Generate a professional ${difficulty} level challenge for the ${domain} domain.
${skillText}

Create a challenge with 3-5 questions of varying types (mcq, short-answer, or code if applicable).

Respond ONLY with JSON (no markdown):
{
  "title": "<challenge title>",
  "description": "<2-3 sentence description>",
  "timeLimit": <minutes>,
  "questions": [
    {
      "questionText": "<question>",
      "questionType": "<mcq|short-answer|code>",
      "options": ["<for mcq only>"],
      "correctAnswer": "<correct answer>",
      "maxScore": <points>,
      "codeLanguage": "<if code type>"
    }
  ],
  "skillTags": ["<relevant skills>"],
  "scoringRubric": [{"criterion": "<name>", "maxPoints": <n>, "description": "<desc>"}]
}`;

        const result = await geminiService._callWithCacheAndRateLimit('challenge_eval', prompt, { temperature: 0.7 });
        if (result) {
            const cleaned = result.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleaned);
        }
    } catch (err) {
        console.error('[ChallengeEval] Challenge generation failed:', err.message);
    }

    return null;
}

module.exports = {
    evaluateChallenge,
    evaluateCodingChallenge,
    evaluateSimulation,
    generateDomainChallenge,
    generateLeveledChallenge
};

/**
 * Repair and parse potentially truncated or malformed JSON from AI
 */
function repairAndParseJSON(raw) {
    if (!raw || typeof raw !== 'string') return null;

    // 1. Strip markdown and clean
    let str = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // 2. Try direct parse
    try { return JSON.parse(str); } catch (e) { /* continue */ }

    // 3. Fix common AI JSON errors
    try {
        // Fix trailing commas in arrays/objects
        str = str.replace(/,\s*([\]}])/g, '$1');
        // Fix unescaped newlines in strings
        str = str.replace(/\n/g, '\\n');
        return JSON.parse(str);
    } catch (e) { /* continue */ }

    // 4. Force-repair truncated JSON (Basic implementation)
    try {
        const start = str.indexOf('{');
        const end = str.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            return JSON.parse(str.substring(start, end + 1));
        }
    } catch (e) {
        console.error('[ChallengeEval] JSON repair failed:', e.message);
    }
    return null;
}

/**
 * Generate a level-locked, per-user challenge for a specific skill
 * ALWAYS generates unique questions — bypasses cache to prevent cheating
 * @param {String} skill - Target skill name (e.g., "React", "Python")
 * @param {Number} level - Level 1-4 (Basic → Expert)
 * @param {String} domain - Domain category (e.g., "Software Engineering")
 * @param {String} userSeed - Unique seed per user for randomized parameters
 * @returns {Object} Generated challenge data with level-appropriate questions
 */
async function generateLeveledChallenge(skill, level, domain, userSeed = '') {
    const levelConfig = {
        1: {
            label: 'Basic', difficulty: 'Beginner', types: 'mcq', questionCount: '5',
            focus: 'core concepts', timeLimit: 20, xpReward: 100
        },
        2: {
            label: 'Intermediate', difficulty: 'Intermediate', types: 'mcq and short-answer', questionCount: '5',
            focus: 'practical application', timeLimit: 30, xpReward: 200
        },
        3: {
            label: 'Advanced', difficulty: 'Advanced', types: 'code', questionCount: '5',
            focus: 'complex problems', timeLimit: 50, xpReward: 300
        },
        4: {
            label: 'Expert', difficulty: 'Expert', types: 'system design', questionCount: '5',
            focus: 'architecture', timeLimit: 75, xpReward: 400
        }
    };

    const config = levelConfig[level] || levelConfig[1];
    const attemptSeed = userSeed || `${Date.now()}`;

    try {
        const prompt = `Generate a valid JSON object for a ${config.label} ${domain} challenge on "${skill}".
        
Requirements:
- valid JSON only, no markdown.
- EXACTLY ${config.questionCount} questions.
- Types: ${config.types}.
- Focus on ${config.focus}.
- This is for Level ${level} of the skill.

Structure:
{
  "title": "${skill} ${config.label} Challenge",
  "description": "A comprehensive ${config.label} level challenge covering ${config.focus} in ${skill}.",
  "questions": [
    {
      "questionText": "Clear, specific question about ${skill} ${config.focus}",
      "questionType": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "maxScore": 20
    }
  ],
  "skillTags": ["${skill}", "${domain}"],
  "timeLimit": ${config.timeLimit}
}

Ensure all strings are properly escaped. Do not use single quotes for JSON keys or values.`;

        const result = await geminiService.router.callGemini('challenge_gen', prompt, {
            temperature: 0.4, // Lower temperature for structure stability
            maxTokens: 4096
        });

        if (result) {
            const parsed = repairAndParseJSON(result);
            if (parsed && parsed.questions) {
                console.log(`[ChallengeEval] Generated ${parsed.questions.length} questions for ${skill} L${level}`);
                return {
                    ...parsed,
                    timeLimit: parsed.timeLimit || config.timeLimit,
                    rewardPoints: config.xpReward, // Renamed from xpReward to match Model
                    skillNodeLevel: level,
                    targetSkill: skill,
                    maxScore: parsed.questions.reduce((sum, q) => sum + (q.maxScore || 0), 0),
                    difficulty: config.difficulty
                };
            } else {
                console.error(`[ChallengeEval] Parsed JSON has no valid questions for ${skill} L${level}`);
            }
        }
    } catch (err) {
        console.error(`[ChallengeEval] Leveled challenge generation failed for ${skill} L${level}:`, err.message);
    }

    return null;
}
