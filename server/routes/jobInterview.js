/**
 * Job-Specific Interview API
 * Generates interview questions based on job description instead of resume
 * Uses the same AI models and logic as platform interview
 */

const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const Interview = require('../models/Interview');
// const deepseekService = require('../services/ai/deepseekService'); // Removed
const geminiService = require('../services/ai/geminiService'); // Gemini as primary AI
const { requirePlatformInterview } = require('../middleware/platformInterviewGuard');

/**
 * POST /api/job-interview/start
 * Start a job-specific interview session based on recruiter's pipeline config
 * Respects the interview rounds configured by the recruiter
 */
router.post('/start', requirePlatformInterview, async (req, res) => {
    try {
        const { userId, jobId } = req.body;

        if (!userId || !jobId) {
            return res.status(400).json({
                success: false,
                error: 'User ID and Job ID are required'
            });
        }

        // Get job details with pipeline config
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        // Check for existing interview
        let interview = await Interview.findOne({
            userId,
            jobId,
            status: { $in: ['scheduled', 'in_progress'] }
        });

        if (interview) {
            // Return existing interview with current round info
            // NOTE: DSA/coding rounds use frontend CodeIDE directly - no server-side problem generation
            const currentRound = interview.pipelineConfig?.rounds?.[interview.currentRoundIndex] || null;

            let assessmentQuestions = null;

            // Only generate assessment questions (DSA uses frontend CodeIDE)
            if (currentRound?.roundType === 'assessment') {
                console.log('[JOB INTERVIEW] Generating assessment questions for existing interview');
                const jobContext = {
                    title: job.title,
                    description: job.description?.substring(0, 500),
                    skills: job.requirements?.skills || [],
                    experienceLevel: job.requirements?.experienceLevel
                };
                assessmentQuestions = await generateAssessmentQuestions(
                    currentRound.assessmentConfig?.assessmentTypes || ['technical'],
                    currentRound.assessmentConfig?.questionCount || 10,
                    jobContext
                );
            }

            return res.json({
                success: true,
                interview: {
                    id: interview._id,
                    status: interview.status,
                    currentRoundIndex: interview.currentRoundIndex,
                    currentQuestion: interview.responses?.length || 0
                },
                currentRound,
                pipelineConfig: interview.pipelineConfig,
                assessmentQuestions,
                message: 'Existing interview found'
            });
        }

        // Get pipeline config from job (or use default if not configured)
        let pipelineConfig = job.interviewPipeline;

        // If no pipeline configured, use default technical + HR
        if (!pipelineConfig || !pipelineConfig.rounds || pipelineConfig.rounds.length === 0) {
            pipelineConfig = {
                pipelineType: 'standard_4round',
                rounds: [
                    { roundNumber: 1, roundType: 'technical', title: 'Technical Interview', duration: 30, isAIEnabled: true, questionConfig: { questionCount: 5, focusSkills: job.requirements?.skills?.slice(0, 3) || [] } },
                    { roundNumber: 2, roundType: 'hr', title: 'HR Interview', duration: 20, isAIEnabled: true, questionConfig: { questionCount: 5, focusSkills: [] } }
                ],
                settings: { requirePlatformInterview: false, autoRejectBelowScore: null, autoAdvanceAboveScore: 70 }
            };
        }

        // Get first round config
        const firstRound = pipelineConfig.rounds[0];

        // Prepare first round content based on round type
        // NOTE: DSA/coding rounds use frontend CodeIDE directly - no server-side problem generation
        let firstQuestion = null;
        let assessmentQuestions = null;
        let dsaProblem = null;

        const jobContext = {
            title: job.title,
            description: job.description?.substring(0, 500),
            skills: job.requirements?.skills || [],
            experienceLevel: job.requirements?.experienceLevel
        };

        if (firstRound.roundType === 'dsa' || firstRound.roundType === 'coding') {
            // Generate DSA problem for coding round
            console.log('[JOB INTERVIEW] Generating DSA problem for coding round...');
            const codingConfig = firstRound.codingConfig || {};
            dsaProblem = await generateDSAProblem(
                codingConfig.topics || ['arrays', 'strings'],
                codingConfig.difficulty || 'medium',
                job.requirements?.skills || []
            );
            console.log('[JOB INTERVIEW] DSA problem generated:', dsaProblem?.title);
        } else if (firstRound.roundType === 'assessment') {
            // Generate MCQ assessment questions via AI
            assessmentQuestions = await generateAssessmentQuestions(
                firstRound.assessmentConfig?.assessmentTypes || ['technical'],
                firstRound.assessmentConfig?.questionCount || 10,
                jobContext
            );
        } else {
            // Generate interview question (technical, hr, behavioral, screening)
            const jobDescriptionSummary = `
Job Title: ${job.title}
Required Skills: ${job.requirements?.skills?.join(', ') || 'Not specified'}
Experience Level: ${job.requirements?.experienceLevel || 'Not specified'}
Description: ${job.description?.substring(0, 500) || 'Not provided'}
            `.trim();

            const systemInstruction = `
You are a professional interviewer conducting a ${firstRound.roundType} interview for the role of ${job.title}.

INSTRUCTIONS:
1. Roleplay as the interviewer. Speak directly to the candidate.
2. Ask exactly ONE question to start the interview.
3. DO NOT generate a list of potential questions.
4. DO NOT explain your reasoning.
5. Return ONLY the question text.
6. Example output: "Could you tell me about your experience with ${job.requirements?.skills?.[0] || 'this role'}?"
`;

            firstQuestion = await geminiService.generateAdaptiveQuestion(
                systemInstruction + `\n\nJOB CONTEXT:\n${jobDescriptionSummary}\n\nTASK: Ask the first question now.`,
                []
            );

            // If Gemini fails (returns null), handle gracefully without DeepSeek
            if (!firstQuestion) {
                console.log('Gemini failed to generate first question, falling back to basic question');
                firstQuestion = {
                    question: 'Tell me about your experience relevant to this role.',
                    type: firstRound.roundType
                };
            } else {
                // Wrap simple string response in object structure expected by code below
                firstQuestion = {
                    question: firstQuestion,
                    type: firstRound.roundType
                };
            }
        }

        // Create new interview with pipeline config
        interview = new Interview({
            userId,
            jobId,
            interviewType: 'job_specific',
            status: 'in_progress',
            pipelineConfig: pipelineConfig,
            currentRoundIndex: 0,
            roundResults: [],
            questions: firstQuestion ? [{
                question: firstQuestion.question,
                generatedBy: 'ai',
                category: firstQuestion.type || firstRound.roundType,
                difficulty: 'medium',
                expectedTopics: job.requirements?.skills?.slice(0, 3) || []
            }] : [],
            responses: []
        });

        await interview.save();

        // Update job applicant status
        const applicant = job.applicants.find(a => a.userId.toString() === userId);
        if (applicant) {
            applicant.interviewId = interview._id;
            applicant.status = 'interviewing';
            await job.save();
        }

        console.log(`[JOB INTERVIEW] Started interview ${interview._id} for job ${jobId} - Round: ${firstRound.roundType}`);

        res.json({
            success: true,
            interview: {
                id: interview._id,
                status: 'in_progress',
                currentRoundIndex: 0
            },
            pipelineConfig: pipelineConfig,
            currentRound: firstRound,
            // Round-specific data
            dsaProblem: dsaProblem,
            question: firstQuestion,
            assessmentQuestions: assessmentQuestions,
            jobContext: {
                title: job.title,
                company: job.company?.name,
                skills: job.requirements?.skills
            },
            totalRounds: pipelineConfig.rounds.length
        });
    } catch (error) {
        console.error('Job interview start error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper: Generate DSA problem via AI
async function generateDSAProblem(topics, difficulty, jobSkills) {
    // For reliability, use curated fallback problems based on difficulty
    // AI generation is being skipped for now to ensure proper problems are always shown
    console.log(`[DSA] Generating ${difficulty} problem for topics: ${topics.join(', ')}`);

    // Curated DSA problems based on difficulty
    const problemBank = {
        easy: [
            {
                title: "Two Sum",
                description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists.`,
                difficulty: 'easy',
                starterCode: `function twoSum(nums, target) {
    // Your code here
    
}

// Test your solution
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
console.log(twoSum([3, 2, 4], 6));       // Expected: [1, 2]`,
                testCases: [
                    { input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]" },
                    { input: "[3, 2, 4], 6", expectedOutput: "[1, 2]" },
                    { input: "[3, 3], 6", expectedOutput: "[0, 1]" }
                ],
                timeLimit: 15
            },
            {
                title: "Reverse String",
                description: `Write a function that reverses a string. The input string is given as an array of characters s.

You must do this by modifying the input array in-place with O(1) extra memory.

**Example 1:**
Input: s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]

**Example 2:**
Input: s = ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]

**Constraints:**
- 1 <= s.length <= 10^5
- s[i] is a printable ASCII character.`,
                difficulty: 'easy',
                starterCode: `function reverseString(s) {
    // Your code here - modify array in place
    
}

// Test your solution
let test1 = ["h","e","l","l","o"];
reverseString(test1);
console.log(test1); // Expected: ["o","l","l","e","h"]`,
                testCases: [
                    { input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]' },
                    { input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]' }
                ],
                timeLimit: 15
            }
        ],
        medium: [
            {
                title: "Valid Parentheses",
                description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
Input: s = "()"
Output: true

**Example 2:**
Input: s = "()[]{}"
Output: true

**Example 3:**
Input: s = "(]"
Output: false

**Constraints:**
- 1 <= s.length <= 10^4
- s consists of parentheses only '()[]{}'`,
                difficulty: 'medium',
                starterCode: `function isValid(s) {
    // Your code here
    
}

// Test your solution
console.log(isValid("()"));      // Expected: true
console.log(isValid("()[]{}"));  // Expected: true
console.log(isValid("(]"));      // Expected: false`,
                testCases: [
                    { input: '"()"', expectedOutput: "true" },
                    { input: '"()[]{}"', expectedOutput: "true" },
                    { input: '"(]"', expectedOutput: "false" },
                    { input: '"{[]}"', expectedOutput: "true" }
                ],
                timeLimit: 20
            },
            {
                title: "Maximum Subarray",
                description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

**Example 1:**
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.

**Example 2:**
Input: nums = [1]
Output: 1
Explanation: The subarray [1] has the largest sum 1.

**Example 3:**
Input: nums = [5,4,-1,7,8]
Output: 23
Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.

**Constraints:**
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4`,
                difficulty: 'medium',
                starterCode: `function maxSubArray(nums) {
    // Your code here
    
}

// Test your solution
console.log(maxSubArray([-2,1,-3,4,-1,2,1,-5,4])); // Expected: 6
console.log(maxSubArray([1]));                      // Expected: 1
console.log(maxSubArray([5,4,-1,7,8]));            // Expected: 23`,
                testCases: [
                    { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6" },
                    { input: "[1]", expectedOutput: "1" },
                    { input: "[5,4,-1,7,8]", expectedOutput: "23" }
                ],
                timeLimit: 20
            }
        ],
        hard: [
            {
                title: "Merge K Sorted Lists",
                description: `You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.

**Example 1:**
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]
Explanation: The linked-lists are:
[1->4->5, 1->3->4, 2->6]
merging them into one sorted list: 1->1->2->3->4->4->5->6

**Example 2:**
Input: lists = []
Output: []

**Constraints:**
- k == lists.length
- 0 <= k <= 10^4
- 0 <= lists[i].length <= 500
- -10^4 <= lists[i][j] <= 10^4`,
                difficulty: 'hard',
                starterCode: `function mergeKLists(lists) {
    // Your code here
    // lists is an array of arrays representing linked lists
    
}

// Test your solution
console.log(mergeKLists([[1,4,5],[1,3,4],[2,6]])); // Expected: [1,1,2,3,4,4,5,6]`,
                testCases: [
                    { input: "[[1,4,5],[1,3,4],[2,6]]", expectedOutput: "[1,1,2,3,4,4,5,6]" },
                    { input: "[]", expectedOutput: "[]" }
                ],
                timeLimit: 30
            }
        ]
    };

    // Select problem based on difficulty
    const problems = problemBank[difficulty] || problemBank.medium;
    const selectedProblem = problems[Math.floor(Math.random() * problems.length)];

    console.log(`[DSA] Selected problem: ${selectedProblem.title}`);
    return selectedProblem;
}

// Helper: Generate assessment MCQ questions via AI
async function generateAssessmentQuestions(assessmentTypes, questionCount, jobContext) {
    try {
        // Limit question count for faster response
        const actualQuestionCount = Math.min(questionCount, 10);

        // Make sure we have assessment types, default to technical if empty
        const types = assessmentTypes && assessmentTypes.length > 0 ? assessmentTypes : ['technical'];

        console.log('[ASSESSMENT] Generating questions for types:', types);

        // Use Gemini to generate questions based on Job Description
        console.log('[ASSESSMENT] Calling Gemini to generate MCQ questions for:', jobContext.title);
        const generatedQuestions = await geminiService.generateAssessmentQuestions(
            types,
            actualQuestionCount,
            jobContext
        );

        if (generatedQuestions && generatedQuestions.length > 0) {
            console.log(`[ASSESSMENT] ✅ Successfully generated ${generatedQuestions.length} MCQ questions via Gemini`);
            return generatedQuestions;
        }

        // Fallback questions
        console.log('[ASSESSMENT] AI response invalid, using fallback questions');
        return generateFallbackAssessment(assessmentTypes, questionCount, jobContext);
    } catch (error) {
        console.error('[ASSESSMENT] Generation error:', error.message);
        console.log('[ASSESSMENT] Using fallback questions due to error');
        return generateFallbackAssessment(assessmentTypes, questionCount, jobContext);
    }
}

function generateFallbackAssessment(types, count, jobContext = {}) {
    const skills = jobContext.skills || ['Programming', 'Problem Solving'];
    const questions = [];

    // Pre-defined quality MCQ questions by type
    const questionBank = {
        technical: [
            {
                question: `Which data structure would be most efficient for implementing a priority queue?`,
                options: [
                    { id: 'A', text: 'Array' },
                    { id: 'B', text: 'Linked List' },
                    { id: 'C', text: 'Heap' },
                    { id: 'D', text: 'Stack' }
                ],
                correctAnswer: 'C',
                explanation: 'Heaps provide O(log n) insertion and O(1) access to min/max element, making them ideal for priority queues.',
                difficulty: 'medium'
            },
            {
                question: `What is the time complexity of binary search?`,
                options: [
                    { id: 'A', text: 'O(1)' },
                    { id: 'B', text: 'O(n)' },
                    { id: 'C', text: 'O(log n)' },
                    { id: 'D', text: 'O(n²)' }
                ],
                correctAnswer: 'C',
                explanation: 'Binary search halves the search space each iteration, resulting in O(log n) complexity.',
                difficulty: 'easy'
            },
            {
                question: `In a REST API, which HTTP method should be used to update an existing resource?`,
                options: [
                    { id: 'A', text: 'GET' },
                    { id: 'B', text: 'POST' },
                    { id: 'C', text: 'PUT' },
                    { id: 'D', text: 'DELETE' }
                ],
                correctAnswer: 'C',
                explanation: 'PUT is the standard HTTP method for updating existing resources in RESTful APIs.',
                difficulty: 'easy'
            },
            {
                question: `What will be the output of: console.log(typeof null)?`,
                options: [
                    { id: 'A', text: 'null' },
                    { id: 'B', text: 'undefined' },
                    { id: 'C', text: 'object' },
                    { id: 'D', text: 'number' }
                ],
                correctAnswer: 'C',
                explanation: 'This is a well-known JavaScript quirk - typeof null returns "object" due to historical reasons.',
                difficulty: 'medium'
            },
            {
                question: `Which sorting algorithm has the best average-case time complexity?`,
                options: [
                    { id: 'A', text: 'Bubble Sort - O(n²)' },
                    { id: 'B', text: 'Quick Sort - O(n log n)' },
                    { id: 'C', text: 'Selection Sort - O(n²)' },
                    { id: 'D', text: 'Insertion Sort - O(n²)' }
                ],
                correctAnswer: 'B',
                explanation: 'Quick Sort has an average-case time complexity of O(n log n), making it one of the most efficient sorting algorithms.',
                difficulty: 'easy'
            },
            {
                question: `In CSS, which property is used to create space outside an element's border?`,
                options: [
                    { id: 'A', text: 'padding' },
                    { id: 'B', text: 'margin' },
                    { id: 'C', text: 'border-spacing' },
                    { id: 'D', text: 'gap' }
                ],
                correctAnswer: 'B',
                explanation: 'Margin creates space outside the border, while padding creates space inside the border.',
                difficulty: 'easy'
            }
        ],
        communication: [
            {
                question: `Find the grammatical error in this sentence: "The team have completed their project on time."`,
                options: [
                    { id: 'A', text: 'No error' },
                    { id: 'B', text: '"have" should be "has" (subject-verb agreement)' },
                    { id: 'C', text: '"their" should be "its"' },
                    { id: 'D', text: '"on time" should be "in time"' }
                ],
                correctAnswer: 'B',
                explanation: '"Team" is a collective noun and takes a singular verb "has" in American English.',
                difficulty: 'medium'
            },
            {
                question: `Fill in the blank: "The report ___ submitted to the manager yesterday."`,
                options: [
                    { id: 'A', text: 'was' },
                    { id: 'B', text: 'were' },
                    { id: 'C', text: 'is' },
                    { id: 'D', text: 'are' }
                ],
                correctAnswer: 'A',
                explanation: '"Report" is singular and the action happened in the past, so "was" is correct.',
                difficulty: 'easy'
            },
            {
                question: `Which sentence is grammatically correct?`,
                options: [
                    { id: 'A', text: 'Neither the manager nor the employees was present.' },
                    { id: 'B', text: 'Neither the manager nor the employees were present.' },
                    { id: 'C', text: 'Neither the manager nor the employees is present.' },
                    { id: 'D', text: 'Neither the manager nor the employees are presented.' }
                ],
                correctAnswer: 'B',
                explanation: 'With "neither...nor", the verb agrees with the nearest subject (employees = plural = were).',
                difficulty: 'medium'
            },
            {
                question: `When sending a professional email requesting a deadline extension, which approach is most appropriate?`,
                options: [
                    { id: 'A', text: 'Just state you need more time without explanation' },
                    { id: 'B', text: 'Explain the reason briefly and propose a new deadline' },
                    { id: 'C', text: 'Apologize excessively throughout the email' },
                    { id: 'D', text: 'Wait until after the deadline to send the request' }
                ],
                correctAnswer: 'B',
                explanation: 'Professional communication includes providing context and offering solutions.',
                difficulty: 'easy'
            },
            {
                question: `Identify the best greeting for a formal business email to someone you haven't met:`,
                options: [
                    { id: 'A', text: 'Hey there!' },
                    { id: 'B', text: 'Dear Mr./Ms. [Last Name],' },
                    { id: 'C', text: 'Hi buddy,' },
                    { id: 'D', text: 'To whom this may concern,' }
                ],
                correctAnswer: 'B',
                explanation: 'Formal emails use proper titles and correct punctuation.',
                difficulty: 'easy'
            }
        ],
        aptitude: [
            {
                question: `If 5 machines can produce 5 widgets in 5 minutes, how long will it take 100 machines to produce 100 widgets?`,
                options: [
                    { id: 'A', text: '1 minute' },
                    { id: 'B', text: '5 minutes' },
                    { id: 'C', text: '20 minutes' },
                    { id: 'D', text: '100 minutes' }
                ],
                correctAnswer: 'B',
                explanation: 'Each machine produces 1 widget in 5 minutes. With 100 machines, 100 widgets are produced in 5 minutes.',
                difficulty: 'medium'
            },
            {
                question: `A train travels 60 km in the first hour, 80 km in the second hour. What is the average speed?`,
                options: [
                    { id: 'A', text: '60 km/h' },
                    { id: 'B', text: '70 km/h' },
                    { id: 'C', text: '80 km/h' },
                    { id: 'D', text: '140 km/h' }
                ],
                correctAnswer: 'B',
                explanation: 'Average speed = Total distance / Total time = 140 km / 2 hours = 70 km/h.',
                difficulty: 'easy'
            },
            {
                question: `Complete the series: 2, 6, 12, 20, 30, ?`,
                options: [
                    { id: 'A', text: '36' },
                    { id: 'B', text: '40' },
                    { id: 'C', text: '42' },
                    { id: 'D', text: '44' }
                ],
                correctAnswer: 'C',
                explanation: 'The pattern is n(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42.',
                difficulty: 'medium'
            }
        ],
        reasoning: [
            {
                question: `All roses are flowers. Some flowers fade quickly. Which statement is definitely true?`,
                options: [
                    { id: 'A', text: 'All roses fade quickly' },
                    { id: 'B', text: 'Some roses fade quickly' },
                    { id: 'C', text: 'Roses are flowers' },
                    { id: 'D', text: 'No roses fade quickly' }
                ],
                correctAnswer: 'C',
                explanation: 'The first statement directly confirms that roses are flowers. The second statement only says "some" flowers fade quickly, not all.',
                difficulty: 'medium'
            },
            {
                question: `If A is taller than B, and B is taller than C, which statement must be true?`,
                options: [
                    { id: 'A', text: 'C is taller than A' },
                    { id: 'B', text: 'A is taller than C' },
                    { id: 'C', text: 'B is the tallest' },
                    { id: 'D', text: 'C and A are the same height' }
                ],
                correctAnswer: 'B',
                explanation: 'By transitive property: A > B and B > C, therefore A > C.',
                difficulty: 'easy'
            },
            {
                question: `Looking at a data chart showing sales declining for 6 consecutive months, the most logical conclusion is:`,
                options: [
                    { id: 'A', text: 'Sales will definitely continue to decline' },
                    { id: 'B', text: 'The company is about to go bankrupt' },
                    { id: 'C', text: 'There is a concerning negative trend that needs investigation' },
                    { id: 'D', text: 'The data is probably wrong' }
                ],
                correctAnswer: 'C',
                explanation: 'A 6-month decline indicates a trend that warrants investigation, but doesn\'t predict future outcomes definitively.',
                difficulty: 'medium'
            }
        ]
    };

    for (let i = 0; i < count; i++) {
        const type = types[i % types.length] || 'technical';
        const bank = questionBank[type] || questionBank.technical;
        const baseQ = bank[i % bank.length];

        questions.push({
            id: i + 1,
            type,
            ...baseQ
        });
    }

    return questions;
}


/**
 * POST /api/job-interview/next
 * Generate next question based on previous answer and job description
 */
router.post('/next', requirePlatformInterview, async (req, res) => {
    try {
        const { interviewId, answer, currentQuestion, questionIndex } = req.body;

        const interview = await Interview.findById(interviewId).populate('jobId');
        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const job = interview.jobId;
        const currentCount = questionIndex || interview.responses.length;

        // Check if interview is complete (10 questions)
        if (currentCount >= 10) {
            return res.json({
                success: true,
                completed: true,
                message: 'Interview questions complete. Ready to submit.',
                totalAnswered: currentCount
            });
        }

        // Store the response
        if (answer && currentQuestion) {
            interview.responses.push({
                questionIndex: currentCount,
                answer: answer,
                timeSpent: 120 // Default 2 minutes
            });
        }

        // Build history for context
        const history = interview.questions.slice(0, currentCount + 1).map((q, i) => ({
            question: q.question,
            answer: interview.responses[i]?.answer || '',
            type: q.category
        }));

        // Determine round: 1-5 technical, 6-10 HR
        const round = currentCount + 1 <= 5 ? 'technical' : 'hr';

        // Generate job-specific summary for context
        const jobDescriptionSummary = `
Job Title: ${job.title}
Required Skills: ${job.requirements?.skills?.join(', ') || 'Not specified'}
Experience Level: ${job.requirements?.experienceLevel || 'Not specified'}
Description: ${job.description?.substring(0, 300) || 'Not provided'}
        `.trim();

        // Generate next question
        // Generate next question using Gemini
        const systemInstruction = `
You are a professional interviewer conducting a ${round} interview for the role of ${job.title}.
Your goal is to assess the candidate's fit based on the Job Description below.

INSTRUCTIONS:
1. Ask ONE clear, professional question relevant to the ${round} round.
2. Based *strictly* on the Job Description and Skills.
3. If this is a 'screening' round, verify basic qualifications and communication.
4. If 'technical', test specific skills mentioned in JD.
5. If 'hr', assess fit and behavior.
6. CRITICAL: Return ONLY the question text. Do NOT include labels like "Question:", "Reasoning:", "Difficulty:", or conversational fillers like "Okay, here is a question".
7. Do not use markdown formatting like **bold** for the question text itself.
`;

        let nextQuestion = await geminiService.generateAdaptiveQuestion(
            systemInstruction + `\n\nJOB CONTEXT:\n${jobDescriptionSummary}\n\nHISTORY (${history.length} qs so far):\n${JSON.stringify(history)}\n\nGenerate the next question:`,
            history
        );

        // Fallback if Gemini fails
        if (!nextQuestion) {
            console.log('Gemini failed to generate next question');
            // Try one more time with simpler prompt
            nextQuestion = await geminiService.generateAdaptiveQuestion(
                `You are an interviewer. Ask a ${round} question for ${job.title}. Return ONLY the question text.`,
                history
            );
        } else {
            // Gemini returns string directly
        }

        // Use an object structure for the next step 
        const nextQuestionObj = {
            question: typeof nextQuestion === 'object' ? nextQuestion.question : nextQuestion,
            type: round
        };

        // Add to interview questions
        interview.questions.push({
            question: nextQuestionObj.question,
            generatedBy: 'ai',
            category: nextQuestionObj.type || round,
            difficulty: 'medium'
        });

        await interview.save();

        console.log(`[JOB INTERVIEW] Question ${currentCount + 2}/10 for interview ${interviewId}`);

        res.json({
            success: true,
            question: nextQuestionObj,
            questionNumber: currentCount + 2,
            totalQuestions: 10,
            isHRRound: round === 'hr',
            completed: false
        });
    } catch (error) {
        console.error('Job interview next question error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/job-interview/submit
 * Submit completed job interview for evaluation
 */
router.post('/submit', requirePlatformInterview, async (req, res) => {
    try {
        const { interviewId, answers, codingResults } = req.body;

        const interview = await Interview.findById(interviewId).populate('jobId');
        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        const job = interview.jobId;

        // Build Q&A for evaluation
        const questionsAndAnswers = interview.questions.map((q, i) => ({
            question: q.question,
            answer: answers[i]?.answer || interview.responses[i]?.answer || '',
            category: q.category,
            round: i < 5 ? 'technical' : 'hr'
        }));

        // Evaluate using same AI service
        // Evaluate using Gemini (Primary) or DeepSeek (Fallback)
        let evaluation;
        try {
            evaluation = await geminiService.evaluateAnswers(questionsAndAnswers, {
                jobTitle: job.title,
                jobDescription: job.description,
                requiredSkills: job.requirements?.skills
            });
        } catch (err) {
            console.log('Gemini evaluation failed, using fallback logic');
            evaluation = await deepseekService.evaluateAllAnswers(questionsAndAnswers, {
                jobTitle: job.title,
                jobDescription: job.description,
                requiredSkills: job.requirements?.skills
            });
        }

        // Combine with coding results if available
        let finalScore = evaluation.overallScore || 10;
        if (codingResults && codingResults.score !== undefined) {
            // 60% interview, 40% coding
            finalScore = Math.round((evaluation.overallScore * 0.6) + (codingResults.score * 0.4));
        }

        // Determine pass/fail
        const passed = (
            finalScore >= 60 &&
            (evaluation.technicalScore || 10) >= 50 &&
            (evaluation.hrScore || 10) >= 50
        );

        // Update interview record
        interview.status = 'completed';
        interview.completedAt = new Date();
        interview.passed = passed;
        interview.scoring = {
            technicalScore: evaluation.technicalScore || 10,
            communicationScore: evaluation.communicationScore || evaluation.communication || 10,
            confidenceScore: evaluation.confidenceScore || evaluation.confidence || 10,
            relevanceScore: evaluation.relevanceScore || evaluation.relevance || 10,
            overallScore: finalScore,
            strengths: evaluation.strengths || [],
            weaknesses: evaluation.weaknesses || [],
            detailedFeedback: evaluation.feedback
        };

        await interview.save();

        // Update job applicant status
        const applicantIndex = job.applicants.findIndex(
            a => a.userId.toString() === interview.userId.toString()
        );
        if (applicantIndex !== -1) {
            job.applicants[applicantIndex].status = passed ? 'shortlisted' : 'reviewed';
            job.applicants[applicantIndex].interviewScore = finalScore;
            job.applicants[applicantIndex].interviewCompleted = true;
            await job.save();
        }

        console.log(`[JOB INTERVIEW] Interview ${interviewId} completed. Score: ${finalScore}, Passed: ${passed}`);

        res.json({
            success: true,
            data: {
                score: finalScore,
                technicalScore: evaluation.technicalScore || 10,
                communicationScore: evaluation.communicationScore || 10,
                codingScore: codingResults?.score,
                passed,
                feedback: evaluation.feedback,
                strengths: evaluation.strengths || [],
                weaknesses: evaluation.weaknesses || [],
                recommendations: evaluation.recommendations || []
            }
        });
    } catch (error) {
        console.error('Job interview submit error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/job-interview/:interviewId
 * Get interview status and details
 */
router.get('/:interviewId', async (req, res) => {
    try {
        const { interviewId } = req.params;

        const interview = await Interview.findById(interviewId)
            .populate('jobId', 'title company description requirements')
            .populate('userId', 'profile.name');

        if (!interview) {
            return res.status(404).json({
                success: false,
                error: 'Interview not found'
            });
        }

        res.json({
            success: true,
            interview: {
                id: interview._id,
                status: interview.status,
                passed: interview.passed,
                scoring: interview.scoring,
                completedAt: interview.completedAt,
                job: interview.jobId,
                questionsAnswered: interview.responses.length,
                totalQuestions: 10
            }
        });
    } catch (error) {
        console.error('Get interview error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
