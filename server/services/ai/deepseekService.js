/**
 * DeepSeek AI Service
 * Uses OpenRouter for AI model access - Llama 3.1 as primary (free tier)
 */

const axios = require('axios');

// DeepSeek API configuration
// DeepSeek API configuration (via OpenRouter for Free Tier)
// AI Model Configurations - Llama 3.1 is PRIMARY (free tier reliable)
const MODELS = {
    // Primary model - Llama 3.2 3B (FREE tier)
    LLAMA: {
        name: 'meta-llama/llama-3.2-3b-instruct:free',  // FREE tier model
        key: process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_LLAMA_KEY || process.env.OPENROUTER_CHIMERA_KEY
    },
    // Fallback 1 - Mistral 7B (also free)
    MISTRAL: {
        name: 'mistralai/mistral-7b-instruct:free',
        key: process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_MISTRAL_KEY
    },
    // Fallback 2 - Gemma (free)
    GEMMA: {
        name: 'google/gemma-2-9b-it:free',
        key: process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_GEMMA_KEY
    },
    // Premium model - DeepSeek (requires credits)
    CHIMERA: {
        name: 'deepseek/deepseek-r1',
        key: process.env.OPENROUTER_CHIMERA_KEY || process.env.DEEPSEEK_API_KEY
    }
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Base function to call OpenRouter
 */
async function callOpenRouter(messages, modelConfig, options = {}) {
    if (!modelConfig.key) {
        throw new Error(`Missing API Key for model: ${modelConfig.name}. Please set OPENROUTER_API_KEY in your .env file.`);
    }

    console.log(`[AI] Calling model: ${modelConfig.name}`);

    try {
        const response = await axios.post(OPENROUTER_URL, {
            model: modelConfig.name,
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 4096
        }, {
            headers: {
                'Authorization': `Bearer ${modelConfig.key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'AI Hiring Platform'
            },
            timeout: 60000  // 60 second timeout
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        console.error(`[AI] Model ${modelConfig.name} failed (${status}): ${errorMsg}`);
        const enhancedError = new Error(`AI Call Failed (${modelConfig.name}): ${errorMsg}`);
        enhancedError.status = status;
        throw enhancedError;
    }
}

/**
 * Execute AI call with chained fallback strategy
 * @param {Array} messages - Chat messages
 * @param {Array} models - Array of model configs to try in order [primary, fallback1, fallback2, ...]
 * @param {Object} options - API options
 */
async function callWithFallback(messages, models, options = {}) {
    const modelList = Array.isArray(models) ? models : [models];

    for (let i = 0; i < modelList.length; i++) {
        const model = modelList[i];
        try {
            return await callOpenRouter(messages, model, options);
        } catch (error) {
            // 402 = Payment Required (out of credits) - MUST fallback
            // 429 = Rate limit, 503 = Service unavailable, 404 = Not found, 401 = Auth error
            const isRetryable = error.status === 402 || error.status === 429 || error.status === 503 ||
                error.status === 404 || error.status === 401 || error.status === 500 ||
                error.message.includes('Rate limit') || error.message.includes('No endpoints') ||
                error.message.includes('auth') || error.message.includes('credits');

            if (isRetryable && i < modelList.length - 1) {
                console.warn(`⚠️ Model ${model.name} failed (${error.status}). Trying next: ${modelList[i + 1].name}`);
                continue;
            }
            console.error(`❌ All models exhausted. Last error:`, error.message);
            throw error;
        }
    }
}




/**
 * Detect programming languages from parsed resume skills
 * @param {Array} skills - Array of skills from resume
 * @returns {Array} - Detected programming languages
 */
const PROGRAMMING_LANGUAGES = {
    'python': { name: 'Python', judge0Id: 71, extension: 'py' },
    'javascript': { name: 'JavaScript', judge0Id: 63, extension: 'js' },
    'java': { name: 'Java', judge0Id: 62, extension: 'java' },
    'c#': { name: 'C#', judge0Id: 51, extension: 'cs' },
    'csharp': { name: 'C#', judge0Id: 51, extension: 'cs' },
    'c++': { name: 'C++', judge0Id: 54, extension: 'cpp' },
    'cpp': { name: 'C++', judge0Id: 54, extension: 'cpp' },
    'c': { name: 'C', judge0Id: 50, extension: 'c' },
    'go': { name: 'Go', judge0Id: 60, extension: 'go' },
    'golang': { name: 'Go', judge0Id: 60, extension: 'go' },
    'ruby': { name: 'Ruby', judge0Id: 72, extension: 'rb' },
    'php': { name: 'PHP', judge0Id: 68, extension: 'php' },
    'typescript': { name: 'TypeScript', judge0Id: 74, extension: 'ts' },
    'rust': { name: 'Rust', judge0Id: 73, extension: 'rs' },
    'kotlin': { name: 'Kotlin', judge0Id: 78, extension: 'kt' },
    'swift': { name: 'Swift', judge0Id: 83, extension: 'swift' },
    'scala': { name: 'Scala', judge0Id: 81, extension: 'scala' },
    'r': { name: 'R', judge0Id: 80, extension: 'r' }
};

function detectProgrammingLanguages(skills) {
    if (!skills || !Array.isArray(skills)) return [];

    const detected = [];
    const skillsLower = skills.map(s => s.toLowerCase().trim());

    // Short language names that need exact matching (to avoid false positives)
    const shortLanguages = ['c', 'r', 'go'];

    for (const [key, value] of Object.entries(PROGRAMMING_LANGUAGES)) {
        const isShortName = shortLanguages.includes(key) || key.length <= 2;

        const matched = skillsLower.some(skill => {
            if (isShortName) {
                // STRICT EXACT MATCH for short names - NO REGEX to avoid false positives
                // "go" should ONLY match: "go", "golang", "go language", "go programming"
                // Should NOT match: "google", "mongodb", "django", or any word containing "go"
                return skill === key ||
                    skill === `${key}lang` ||  // golang
                    skill === `${key} programming` ||
                    skill === `${key} language` ||
                    skill === `${key} developer`;
            } else {
                // For longer names, allow partial matches
                return skill === key ||
                    skill.includes(key) ||
                    (key.length > 2 && skill.startsWith(key));
            }
        });

        if (matched && !detected.find(d => d.name === value.name)) {
            detected.push(value);
        }
    }

    console.log('[DETECT] Skills:', skills.slice(0, 5), '-> Languages:', detected.map(d => d.name));
    return detected;
}

/**
 * Generate a coding problem using DeepSeek-R1
 * @param {string} language - Programming language
 * @param {string} skillLevel - easy, medium, hard
 * @param {Array} skills - User's skills from resume
 */
async function generateCodingProblem(language, skillLevel = 'easy', skills = []) {
    console.log('🔵 [AI] generateCodingProblem called');
    console.log('🔵 [AI] Parameters:', { language, skillLevel, skillsCount: skills.length });

    const prompt = `Generate a coding problem for a ${skillLevel} level interview in ${language}.

The candidate has these skills: ${skills.join(', ') || 'general programming'}

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
    "title": "Problem Title",
    "description": "Clear problem description with examples",
    "difficulty": "${skillLevel}",
    "language": "${language}",
    "starterCode": "// Starter code template with function signature",
    "testCases": [
        {"input": "example input 1", "expectedOutput": "expected output 1"},
        {"input": "example input 2", "expectedOutput": "expected output 2"}
    ],
    "hints": ["Hint 1", "Hint 2"],
    "timeLimit": 15,
    "sampleSolution": "// Sample solution code"
}

Make the problem practical and relevant to real-world scenarios. Include 3-4 test cases.`;

    try {
        console.log('🔵 [AI] Calling DeepSeek API for coding problem...');
        const response = await callDeepSeek([
            { role: 'system', content: 'You are a coding interview expert. Always respond with valid JSON only, no markdown formatting.' },
            { role: 'user', content: prompt }
        ]);

        console.log('🔵 [AI] Raw response length:', response?.length);

        // Clean the response - remove any markdown code blocks
        let cleanResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanResponse);
        console.log('✅ [AI] Coding problem parsed successfully:', parsed.title);
        return parsed;
    } catch (error) {
        console.error('❌ [AI] Failed to generate coding problem:', error.message);
        console.error('❌ [AI] Full error:', error);
        // Return a fallback problem
        console.log('🔶 [AI] Returning fallback problem for:', language);
        return getFallbackProblem(language);
    }
}

/**
 * Evaluate code solution using DeepSeek-R1
 */
async function evaluateCodeSolution(code, problem, language, output, passed) {
    // Check for empty or minimal code (just comments/template)
    const codeWithoutComments = code
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/#.*$/gm, '') // Remove Python comments
        .replace(/\s+/g, '') // Remove whitespace
        .trim();

    const isEmptyOrMinimal = codeWithoutComments.length < 20;
    const isJustTemplate = code.includes('# Your code here') ||
        code.includes('// Write your code here') ||
        code.includes('pass') && codeWithoutComments.length < 50;

    // If code is empty or just template, give 0
    if (isEmptyOrMinimal || isJustTemplate) {
        console.log('[CODING] Empty or minimal code detected, score: 0');
        return {
            score: 0,
            codeQuality: 'No solution provided',
            efficiency: 'N/A - no code submitted',
            correctness: 'Incorrect - no solution was implemented',
            suggestions: ['Actually implement a solution', 'Write code that solves the problem'],
            overallFeedback: 'You did not submit a solution. Please write code that addresses the problem.'
        };
    }

    const prompt = `Evaluate this code solution STRICTLY. Be harsh on poor solutions.

Language: ${language}
Problem: ${problem.title}
Description: ${problem.description}

Submitted Code:
${code}

Execution Output: ${output || 'No output'}
Test Cases Passed: ${passed ? 'Yes' : 'No'}

SCORING GUIDELINES:
- 0-20: No solution / completely wrong / just template code
- 21-40: Attempted but significantly wrong
- 41-60: Partially correct, has bugs or missing edge cases
- 61-80: Mostly correct, minor issues
- 81-100: Correct and well-written

If the code is just a template with "pass" or "# Your code here", score it 0.
If tests did not pass, score should be below 50 unless logic is sound.

Provide evaluation as JSON:
{
    "score": 0-100,
    "codeQuality": "Assessment of code quality, readability, best practices",
    "efficiency": "Time/space complexity analysis",
    "correctness": "Is the solution correct?",
    "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"],
    "overallFeedback": "Summary feedback"
}`;

    try {
        const response = await callDeepSeek([
            { role: 'system', content: 'You are a strict code review expert. Score fairly but harshly. Respond with valid JSON only.' },
            { role: 'user', content: prompt }
        ]);

        let cleanResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const result = JSON.parse(cleanResponse);
        console.log('[CODING] AI evaluation score:', result.score);
        return result;
    } catch (error) {
        console.error('Code evaluation failed:', error);
        // Fallback scores are now much lower
        return {
            score: passed ? 40 : 10,
            codeQuality: 'Unable to evaluate code quality',
            efficiency: 'N/A',
            correctness: passed ? 'Solution passed test cases but could not be fully evaluated' : 'Solution did not pass test cases',
            suggestions: ['Review your solution and try again'],
            overallFeedback: passed ? 'Your solution works but needs review.' : 'Your solution needs significant improvement.'
        };
    }
}

/**
 * Fallback coding problems when API fails
 */
function getFallbackProblem(language) {
    const problems = {
        'Python': {
            title: 'Two Sum',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9',
            difficulty: 'easy',
            language: 'Python',
            starterCode: `def two_sum(nums, target):
    """
    Find two numbers that add up to target.
    
    Args:
        nums: List of integers
        target: Target sum
    
    Returns:
        List of two indices
    """
    # Your code here
    pass

# Test your solution
print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
print(two_sum([3, 2, 4], 6))       # Expected: [1, 2]`,
            testCases: [
                { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
                { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
                { input: '[3, 3], 6', expectedOutput: '[0, 1]' }
            ],
            hints: ['Use a hash map to store seen numbers', 'Think about what value you need to find for each number'],
            timeLimit: 15,
            sampleSolution: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`
        },
        'JavaScript': {
            title: 'Two Sum',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]',
            difficulty: 'easy',
            language: 'JavaScript',
            starterCode: `function twoSum(nums, target) {
    // Your code here
    
}

// Test your solution
console.log(twoSum([2, 7, 11, 15], 9));  // Expected: [0, 1]
console.log(twoSum([3, 2, 4], 6));       // Expected: [1, 2]`,
            testCases: [
                { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
                { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' }
            ],
            hints: ['Use a Map to store seen numbers', 'For each number, check if target - number exists'],
            timeLimit: 15,
            sampleSolution: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}`
        },
        'Java': {
            title: 'Two Sum',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            difficulty: 'easy',
            language: 'Java',
            starterCode: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
    
    public static void main(String[] args) {
        int[] result = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println(Arrays.toString(result));  // Expected: [0, 1]
    }
}`,
            testCases: [
                { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
                { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' }
            ],
            hints: ['Use a HashMap', 'Store number and its index'],
            timeLimit: 15,
            sampleSolution: `public static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> map = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (map.containsKey(complement)) {
            return new int[]{map.get(complement), i};
        }
        map.put(nums[i], i);
    }
    return new int[]{};
}`
        }
    };

    return problems[language] || problems['JavaScript'];
}

/**
 * Generate personalized interview questions using DeepSeek-R1 (Legacy Batch Mode)
 */
async function generateInterviewQuestions(resumeText, role, experienceLevel) {
    const prompt = `You are an expert technical interviewer. Generate 10 personalized interview questions based STRICTLY on the candidate's resume and desired role.
    
    Role: ${role}
    Experience Level: ${experienceLevel}
    Resume Summary: ${resumeText.substring(0, 3000)}...

    Requirements:
    1. Questions MUST be specific to the projects and skills mentioned in the resume.
    2. Include 5 Technical questions (deep dive into their specific tech stack).
    3. Include 5 Behavioral/HR questions based on their experience level.
    
    Return ONLY a valid JSON object with this structure:
    {
        "technical": [
            { "question": "Question text", "type": "technical", "topic": "React/Node/etc", "difficulty": "medium" }
        ],
        "behavioral": [
            { "question": "Question text", "type": "hr", "topic": "Leadership/Conflict", "difficulty": "easy" }
        ]
    }`;

    try {
        const response = await callDeepSeek([
            { role: 'system', content: 'You are a strict technical interviewer using DeepSeek-R1 model for deep reasoning. Return only valid JSON.' },
            { role: 'user', content: prompt }
        ]);

        let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanResponse);

        return [
            ...parsed.technical,
            ...parsed.behavioral
        ];
    } catch (error) {
        console.error('DeepSeek question generation failed:', error);
        throw error;
    }
}

/**
 * Generate a SINGLE personalized interview question based on history
 */
async function generateNextQuestion(resumeText, role, experienceLevel, history = []) {
    const questionCount = history.length + 1;
    const isTechnical = questionCount <= 5; // First 5 technical, last 5 behavioral

    // Debug logging
    console.log(`[Interview] Generating Q${questionCount}/10 - ${isTechnical ? 'TECHNICAL' : 'HR/BEHAVIORAL'}`);
    console.log(`[Interview] History length: ${history.length}`);

    // Construct conversation history for context
    const conversationContext = history.map((h, i) => `Q${i + 1}: ${h.question}\nA: ${h.answer}`).join('\n\n');

    const prompt = `You are an expert ${isTechnical ? 'technical' : 'HR'} interviewer conducting a live interview.
    
    ⚠️ CRITICAL: You MUST ask questions about the SPECIFIC SKILLS listed below. Do NOT ask generic questions.
    
    Candidate Role: ${role}
    Experience: ${experienceLevel}
    
    📋 CANDIDATE'S ACTUAL SKILLS FROM RESUME (USE THESE):
    ${resumeText}
    
    Current Interview Progress: ${questionCount}/10
    
    ${!isTechnical ? '🔴 THIS IS THE HR ROUND (Questions 6-10). DO NOT ASK TECHNICAL QUESTIONS.' : ''}
    
    Previous Conversation:
    ${conversationContext}
    
    Task: Generate the NEXT question (Question #${questionCount}).
    Type: ${isTechnical ? 'TECHNICAL - About their ACTUAL skills listed above' : 'HR/BEHAVIORAL - Soft Skills Assessment'}
    
    ${isTechnical ? `
    TECHNICAL ROUND RULES:
    - Ask about the SPECIFIC technologies/skills listed in the candidate's resume above
    - If resume shows "Python, React, MongoDB" - ask about Python OR React OR MongoDB specifically
    - Ask CONCEPTUAL questions about their actual skills (explain concepts, compare technologies, describe approaches)
    - DO NOT ask to write code or implement anything
    - Questions should test understanding of THEIR LISTED SKILLS, not random topics
    ` : `
    HR ROUND RULES - EXPERIENCE LEVEL: ${experienceLevel}
    
    ${experienceLevel === 'fresher' || experienceLevel === 'Entry Level' || experienceLevel === 'Intern/Junior' ? `
    ⚠️ FRESHER CANDIDATE - ASK SIMPLE, RELATABLE QUESTIONS:
    - Ask about COLLEGE PROJECTS, academic experiences, team assignments
    - Ask about handling conflicts with classmates/teammates in group projects
    - Ask about time management during exams/submissions
    - Ask about learning new technologies for college projects
    - Ask about overcoming challenges in academic work
    - DO NOT ask about "stakeholders", "clients", "business decisions", "work deadlines"
    - EXAMPLE GOOD QUESTIONS:
      * "Tell me about a project you did in college that you're proud of"
      * "How did you handle a disagreement with teammates in a group project?"
      * "Describe a time when you had to learn something new quickly for an assignment"
    ` : `
    ⚠️ EXPERIENCED CANDIDATE (${experienceLevel}):
    - Ask about workplace challenges, stakeholder management, project delivery
    - Ask about handling conflicts with team members or clients
    - Ask about leadership, mentoring junior developers
    - Ask about meeting deadlines, prioritization, work pressure
    - EXAMPLE GOOD QUESTIONS:
      * "Describe a challenging project and how you ensured timely delivery"
      * "Tell me about a time you had to push back on a stakeholder request"
      * "How do you mentor junior team members?"
    `}
    
    GENERAL HR RULES:
    - DO NOT ASK ANY TECHNICAL QUESTIONS - this is NOT the technical round
    - Focus on: soft skills, personality, work ethic, collaboration, time management
    `}
    
    Return ONLY this JSON:
    {
        "question": "The actual question text - MUST reference their specific skills if technical",
        "type": "${isTechnical ? 'technical' : 'hr'}",
        "difficulty": "medium",
        "topic": "${isTechnical ? 'Specific skill from their resume' : 'Behavioral/Soft Skills'}"
    }`;

    try {
        const response = await callDeepSeek([
            { role: 'system', content: 'You are an adaptive technical interviewer. Return valid JSON only.' },
            { role: 'user', content: prompt }
        ]);

        return extractJson(response);
    } catch (error) {
        console.error('DeepSeek dynamic question failed:', error);
        // Fallback
        return {
            question: `Tell me more about your experience with ${isTechnical ? 'technical challenges' : 'teamwork'}.`,
            type: isTechnical ? 'technical' : 'hr',
            topic: 'General'
        };
    }
}

/**
 * Helper to extract JSON from conversational response
 */
function extractJson(text) {
    try {
        // 1. Try direct parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Extract between ```json and ```
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[1]); } catch (e) { }
        }

        // 3. Extract between first { and last }
        const bracketMatch = text.match(/\{[\s\S]*\}/);
        if (bracketMatch) {
            try { return JSON.parse(bracketMatch[0]); } catch (e) { }
        }

        throw new Error(`Failed to extract JSON from response: ${text.substring(0, 100)}...`);
    }
}


/**
 * Main AI call function - Uses Llama 3.1 as primary (free tier)
 */
async function callDeepSeek(messages, options = {}) {
    // Use free-tier models in order: Llama -> Mistral -> Gemma
    return callWithFallback(messages, [MODELS.LLAMA, MODELS.MISTRAL, MODELS.GEMMA], options);
}

/**
 * Generate contextual question using rich prompt (for adaptive interviews)
 */
async function generateContextualQuestion(contextPrompt) {
    try {
        console.log('[AI] Generating contextual question with adaptive prompt');
        const response = await callDeepSeek([
            { role: 'system', content: 'You are an expert technical interviewer. Generate specific, personalized interview questions. Return ONLY the question text, no preamble.' },
            { role: 'user', content: contextPrompt }
        ]);

        // Return just the question text (trimmed)
        return response.trim();
    } catch (error) {
        console.error('[AI] Contextual question generation failed:', error.message);
        // Fallback to generic question
        return "Tell me about your experience and what motivated you to pursue this role.";
    }
}

/**
 * Validates answer - ONLY blocks gibberish and completely off-topic responses
 * Wrong technical answers are ALLOWED - the final evaluation will score them appropriately
 */
async function validateAnswer(question, answer) {
    // Minimum length check
    if (!answer || answer.trim().length < 5) {
        return { valid: false, message: "Please provide a longer response." };
    }

    // Simple gibberish detection (no AI needed for obvious cases)
    const gibberishPattern = /^[a-z]{10,}$|^[^a-zA-Z]*$|^(.)\1{5,}$/i;
    if (gibberishPattern.test(answer.trim())) {
        return { valid: false, message: "Please provide a real answer, not random characters." };
    }

    const prompt = `You are a LENIENT answer validator. Your job is to check if the answer is a GENUINE ATTEMPT to respond.

Question: "${question}"
Answer: "${answer}"

ONLY mark as INVALID if:
1. The answer is GIBBERISH (random characters like "asdfgh", "jkljkl", keyboard mashing)
2. The answer is COMPLETELY OFF-TOPIC (e.g., answering "the weather is nice" when asked about JavaScript)
3. The answer is in a non-English language

MARK AS VALID even if:
- The answer is WRONG (e.g., saying "var is block-scoped" when it's actually function-scoped)
- The answer is incomplete or vague
- The answer shows misunderstanding of the concept
- The answer is too short but makes an attempt

This is an EXAM - wrong answers get low scores at the end, but they should NOT be blocked here.

Return JSON:
{
    "valid": true/false,
    "message": "Only if invalid: brief reason (max 15 words)"
}`;

    try {
        const response = await callDeepSeek([
            { role: 'system', content: 'You are lenient. Allow wrong answers through. Only block gibberish and off-topic. Return JSON.' },
            { role: 'user', content: prompt }
        ]);

        return extractJson(response);
    } catch (error) {
        console.error('Validation failed:', error);
        // If validation fails, ALLOW the answer through (fail-open)
        return { valid: true };
    }
}

/**
 * Parse resume text into structured JSON using DeepSeek-R1
 */
async function parseResume(resumeText) {
    if (!resumeText || resumeText.length < 50) {
        throw new Error('Resume text too short');
    }

    const prompt = `You are an expert resume parser. Extract structured data from the following resume text.
    
    Resume Text:
    ${resumeText.substring(0, 5000)}... (truncated if too long)
    
    Return ONLY a valid JSON object with this exact structure:
    {
        "basics": {
            "name": "Full Name",
            "email": "email@example.com",
            "phone": "Phone Number",
            "linkedin": "LinkedIn URL",
            "summary": "Brief professional summary (max 3 sentences)"
        },
        "skills": ["Skill 1", "Skill 2", "Skill 3"],
        "experience": [
            {
                "company": "Company Name",
                "role": "Job Title",
                "duration": "Start - End",
                "description": "Key responsibilities (max 2 sentences)"
            }
        ],
        "education": [
            {
                "institution": "University Name",
                "degree": "Degree",
                "year": "Year"
            }
        ],
        "projects": [
            {
                "name": "Project Name",
                "description": "Brief description",
                "techStack": ["Tech 1", "Tech 2"]
            }
        ]
    }
    
    If specific fields are missing, leave them as empty strings or empty arrays. Do not invent information.`;

    try {
        const response = await callDeepSeek([
            { role: 'system', content: 'You are a precise JSON extractor. Return only valid JSON.' },
            { role: 'user', content: prompt }
        ]);

        return extractJson(response);
    } catch (error) {
        console.error('DeepSeek resume parsing failed:', error);
        throw error;
    }
}

/**
 * Evaluate ALL answers using the NEW multi-dimensional evaluation engine
 * Results go to admin for review - AI only scores, doesn't decide
 */
async function evaluateAllAnswers(questionsAndAnswers, jobContext, blueprint = null) {
    const { jobTitle, jobDescription, requiredSkills } = jobContext;

    // Import evaluation engine
    const evaluationEngine = require('./evaluationEngine');

    console.log('[EVALUATION] Using new multi-dimensional evaluation engine');

    try {
        // Build context for evaluation engine
        const context = {
            role: jobTitle || 'Not specified',
            domain: blueprint?.domain || 'General',
            keySkills: requiredSkills || blueprint?.keySkills || [],
            experienceLevel: blueprint?.experienceLevel || 'mid'
        };

        // Call the new evaluation engine
        const result = await evaluationEngine.evaluateInterview(
            questionsAndAnswers,
            context,
            null // Coding submission handled separately
        );

        // Add legacy compatibility fields
        result.areasToImprove = result.summary?.weaknesses?.map(w => ({
            area: w,
            suggestion: `Focus on improving ${w.toLowerCase()}`,
            priority: 'medium'
        })) || [];

        result.recommendations = [];
        if (result.overallScore >= 75) {
            result.recommendations.push('Strong candidate - ready for next steps');
        } else if (result.overallScore >= 55) {
            result.recommendations.push('Borderline candidate - admin review recommended');
        } else {
            result.recommendations.push('Needs significant improvement');
        }

        console.log(`[EVALUATION] Complete. Score: ${result.overallScore}, Grade: ${result.potentialIndex?.grade}`);
        return result;

    } catch (error) {
        console.error('[EVALUATION] Evaluation engine failed, using legacy method:', error.message);

        // Fallback to legacy evaluation
        return await legacyEvaluateAllAnswers(questionsAndAnswers, jobContext);
    }
}

/**
 * Legacy evaluation fallback (old method)
 */
async function legacyEvaluateAllAnswers(questionsAndAnswers, jobContext) {
    const { jobTitle, jobDescription, requiredSkills } = jobContext;

    // PRE-EVALUATION: Check for non-answers
    const nonAnswerPatterns = [
        /^i\s*don'?t\s*know$/i,
        /^idk$/i,
        /^no\s*idea$/i,
        /^not\s*sure$/i,
        /^i\s*have\s*no\s*(idea|clue)$/i,
        /^pass$/i,
        /^skip$/i,
        /^next$/i,
        /^n\/a$/i,
        /^\.+$/,
        /^no$/i,
        /^yes$/i,
        /^maybe$/i
    ];

    const nonAnswerCount = questionsAndAnswers.filter(qa => {
        const answer = (qa.answer || '').trim().toLowerCase();
        return answer.length < 15 || nonAnswerPatterns.some(p => p.test(answer));
    }).length;

    const totalQuestions = questionsAndAnswers.length;
    const nonAnswerPercentage = (nonAnswerCount / totalQuestions) * 100;

    console.log(`[EVALUATION-LEGACY] Non-answer percentage: ${nonAnswerPercentage.toFixed(0)}%`);

    if (nonAnswerPercentage >= 60) {
        return {
            overallScore: Math.max(5, 30 - nonAnswerPercentage * 0.3),
            technicalScore: 10,
            hrScore: 10,
            confidence: 5,
            relevance: 5,
            communication: 10,
            strengths: [],
            weaknesses: ['Provided no substantive answers'],
            feedback: 'Candidate did not provide meaningful answers.',
            requiresAdminReview: true
        };
    }

    const qaFormatted = questionsAndAnswers.map((qa, i) =>
        `Q${i + 1} [${qa.category || qa.type}]: ${qa.question}\nA${i + 1}: ${qa.answer}`
    ).join('\n\n');

    const prompt = `Evaluate this interview strictly. Return JSON with overallScore (0-100), technicalScore, hrScore, confidence, communication, strengths [], weaknesses [], feedback.

Job: ${jobTitle}
Skills: ${requiredSkills?.join(', ') || 'Not specified'}

Q&A:
${qaFormatted}

BE STRICT. Return ONLY valid JSON.`;

    try {
        const response = await callWithFallback(
            [
                { role: 'system', content: 'Strict interview evaluator. Return valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            [MODELS.LLAMA, MODELS.MISTRAL]
        );

        const result = extractJson(response);
        result.requiresAdminReview = true;
        return result;
    } catch (error) {
        console.error('[EVALUATION-LEGACY] Failed:', error);
        return {
            overallScore: 50,
            technicalScore: 50,
            hrScore: 50,
            feedback: 'Evaluation failed - manual review required',
            requiresAdminReview: true
        };
    }
}

module.exports = {
    callDeepSeek,
    detectProgrammingLanguages,
    generateCodingProblem,
    evaluateCodeSolution,
    getFallbackProblem,
    generateInterviewQuestions,
    generateNextQuestion,
    generateContextualQuestion,  // NEW: For adaptive interviews
    validateAnswer,
    parseResume,
    evaluateAllAnswers,
    PROGRAMMING_LANGUAGES
};
