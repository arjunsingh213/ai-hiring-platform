/**
 * DeepSeek AI Service
 * Uses DeepSeek-R1 model for resume parsing, skill matching, and code generation
 */

const axios = require('axios');

// DeepSeek API configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-reasoner'; // DeepSeek-R1 model

/**
 * Make a request to DeepSeek API
 */
async function callDeepSeek(messages, options = {}) {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY not found in environment variables');
    }

    try {
        const response = await axios.post(DEEPSEEK_API_URL, {
            model: DEEPSEEK_MODEL,
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 4096,
            ...options
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minute timeout for R1 model (reasoning takes time)
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('DeepSeek API error:', error.response?.data || error.message);
        throw new Error(`DeepSeek API failed: ${error.response?.data?.error?.message || error.message}`);
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

    for (const [key, value] of Object.entries(PROGRAMMING_LANGUAGES)) {
        if (skillsLower.some(skill =>
            skill === key ||
            skill.includes(key) ||
            (key.length > 2 && skill.startsWith(key))
        )) {
            if (!detected.find(d => d.name === value.name)) {
                detected.push(value);
            }
        }
    }

    return detected;
}

/**
 * Generate a coding problem using DeepSeek-R1
 * @param {string} language - Programming language
 * @param {string} skillLevel - easy, medium, hard
 * @param {Array} skills - User's skills from resume
 */
async function generateCodingProblem(language, skillLevel = 'easy', skills = []) {
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
        const response = await callDeepSeek([
            { role: 'system', content: 'You are a coding interview expert. Always respond with valid JSON only, no markdown formatting.' },
            { role: 'user', content: prompt }
        ]);

        // Clean the response - remove any markdown code blocks
        let cleanResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Failed to generate coding problem:', error);
        // Return a fallback problem
        return getFallbackProblem(language);
    }
}

/**
 * Evaluate code solution using DeepSeek-R1
 */
async function evaluateCodeSolution(code, problem, language, output, passed) {
    const prompt = `Evaluate this code solution:

Language: ${language}
Problem: ${problem.title}
Description: ${problem.description}

Submitted Code:
${code}

Execution Output: ${output}
Test Cases Passed: ${passed ? 'Yes' : 'No'}

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
            { role: 'system', content: 'You are a code review expert. Respond with valid JSON only.' },
            { role: 'user', content: prompt }
        ]);

        let cleanResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return JSON.parse(cleanResponse);
    } catch (error) {
        console.error('Code evaluation failed:', error);
        return {
            score: passed ? 70 : 30,
            codeQuality: 'Unable to evaluate code quality',
            efficiency: 'N/A',
            correctness: passed ? 'Solution passed test cases' : 'Solution did not pass all test cases',
            suggestions: ['Review your solution and try again'],
            overallFeedback: passed ? 'Good job! Your solution works.' : 'Your solution needs improvement.'
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

module.exports = {
    callDeepSeek,
    detectProgrammingLanguages,
    generateCodingProblem,
    evaluateCodeSolution,
    getFallbackProblem,
    PROGRAMMING_LANGUAGES
};
