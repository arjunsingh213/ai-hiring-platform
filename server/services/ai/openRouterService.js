/**
 * OpenRouter AI Service
 * Multi-model AI integration for the AI Interview System
 * 
 * Models:
 * - Llama 3.1 8B: Resume Parsing
 * - Gemma 2 9B: JD-Resume Matching, Recruiter Reports
 * - Qwen3 235B: Question Generation, Answer Evaluation
 * - Mistral 7B: Fast Scoring
 */

const axios = require('axios');

class OpenRouterService {
    constructor() {
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

        // Model configurations
        this.models = {
            resumeParsing: 'meta-llama/llama-3.1-8b-instruct:free',
            jdMatching: 'meta-llama/llama-3.1-8b-instruct:free',
            questionGeneration: 'qwen/qwen3-235b-a22b:free',
            answerEvaluation: 'qwen/qwen3-235b-a22b:free',
            fastScoring: 'mistralai/mistral-7b-instruct:free',
            recruiterReport: 'meta-llama/llama-3.1-8b-instruct:free'
        };

        // API Keys from environment
        this.apiKeys = {
            llama: process.env.OPENROUTER_LLAMA_KEY || process.env.OPENROUTER_API_KEY,
            qwen: process.env.OPENROUTER_QWEN_KEY || process.env.OPENROUTER_API_KEY,
            mistral: process.env.OPENROUTER_MISTRAL_KEY || process.env.OPENROUTER_API_KEY,
            gemma: process.env.OPENROUTER_GEMMA_KEY || process.env.OPENROUTER_API_KEY
        };

        // Debug: Log which keys are present
        console.log('OpenRouter API Keys Status:');
        console.log('  - LLAMA:', this.apiKeys.llama ? '✓ Present' : '✗ Missing');
        console.log('  - QWEN:', this.apiKeys.qwen ? '✓ Present' : '✗ Missing');
        console.log('  - MISTRAL:', this.apiKeys.mistral ? '✓ Present' : '✗ Missing');
        console.log('  - GEMMA:', this.apiKeys.gemma ? '✓ Present' : '✗ Missing');
    }

    /**
     * Make API call to OpenRouter
     */
    async callModel(model, messages, apiKey, options = {}) {
        try {
            const response = await axios.post(this.baseUrl, {
                model,
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2048,
                ...options
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
                    'X-Title': 'AI Hiring Platform'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error(`OpenRouter API error (${model}):`, error.response?.data || error.message);
            throw new Error(`AI model call failed: ${error.message}`);
        }
    }

    /**
     * Parse resume using Llama 8B
     */
    async parseResume(resumeText) {
        const prompt = `You are an expert resume parser. Extract structured information from the following resume text.

Resume Text:
${resumeText}

Extract and return in JSON format:
{
    "personalInfo": {
        "name": "",
        "email": "",
        "phone": "",
        "location": ""
    },
    "summary": "",
    "skills": [],
    "experience": [
        {
            "company": "",
            "position": "",
            "duration": "",
            "description": "",
            "achievements": []
        }
    ],
    "education": [
        {
            "institution": "",
            "degree": "",
            "field": "",
            "year": ""
        }
    ],
    "projects": [
        {
            "name": "",
            "description": "",
            "technologies": []
        }
    ],
    "certifications": [],
    "languages": []
}

Return ONLY valid JSON, no additional text.`;

        try {
            const response = await this.callModel(
                this.models.resumeParsing,
                [{ role: 'user', content: prompt }],
                this.apiKeys.llama,
                { temperature: 0.3 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse resume JSON');
        } catch (error) {
            console.error('Resume parsing error:', error);
            return this.getDefaultParsedResume();
        }
    }

    /**
     * Match resume to job description using Gemma 2 9B
     */
    async matchResumeToJD(resumeData, jobDescription, jobRequirements) {
        const prompt = `You are an expert recruiter AI. Analyze how well this candidate matches the job requirements.

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
- Skills: ${jobRequirements?.skills?.join(', ') || 'Not specified'}
- Experience: ${jobRequirements?.minExperience || 0}-${jobRequirements?.maxExperience || 5} years
- Education: ${jobRequirements?.education?.join(', ') || 'Not specified'}
- Level: ${jobRequirements?.experienceLevel || 'Not specified'}

CANDIDATE RESUME:
- Skills: ${resumeData?.skills?.join(', ') || 'Not specified'}
- Experience: ${JSON.stringify(resumeData?.experience || [])}
- Education: ${JSON.stringify(resumeData?.education || [])}

Evaluate the match and return JSON:
{
    "overallMatch": 85,
    "skillsMatch": 90,
    "experienceMatch": 80,
    "educationMatch": 85,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill3"],
    "strengths": ["strength1", "strength2"],
    "concerns": ["concern1"],
    "interviewFocus": ["topic1", "topic2"],
    "recommendation": "proceed" 
}

Score 0-100. Return ONLY valid JSON.`;

        try {
            const response = await this.callModel(
                this.models.jdMatching,
                [{ role: 'user', content: prompt }],
                this.apiKeys.llama,
                { temperature: 0.4 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse match JSON');
        } catch (error) {
            console.error('JD matching error:', error);
            return {
                overallMatch: 70,
                skillsMatch: 70,
                experienceMatch: 70,
                educationMatch: 70,
                matchedSkills: [],
                missingSkills: [],
                strengths: [],
                concerns: [],
                interviewFocus: [],
                recommendation: 'proceed'
            };
        }
    }

    /**
     * Generate adaptive interview questions using Qwen3 235B
     * Questions are based on job description, skills, roles, and responsibilities
     */
    async generateAdaptiveQuestions(context) {
        const { resumeData, jobDescription, jobTitle, jobRequirements, matchScore, previousAnswers, interviewType } = context;

        let previousContext = '';
        if (previousAnswers && previousAnswers.length > 0) {
            previousContext = `\n\nPREVIOUS Q&A:\n${previousAnswers.map((qa, i) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}\nScore: ${qa.score}/100`
            ).join('\n\n')}`;
        }

        // Extract job-specific information
        const requiredSkills = jobRequirements?.skills?.join(', ') || matchScore?.matchedSkills?.join(', ') || 'General skills';
        const missingSkills = matchScore?.missingSkills?.join(', ') || '';
        const experienceLevel = jobRequirements?.experienceLevel || 'mid';
        const focusAreas = matchScore?.interviewFocus?.join(', ') || 'Core competencies';

        const prompt = `You are an expert interviewer conducting a ${interviewType} interview for a specific job position.

=== JOB DETAILS ===
JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription || 'Not provided'}

=== JOB REQUIREMENTS ===
REQUIRED SKILLS: ${requiredSkills}
MISSING SKILLS (to probe): ${missingSkills || 'None identified'}
EXPERIENCE LEVEL: ${experienceLevel}
EDUCATION: ${jobRequirements?.education?.join(', ') || 'Not specified'}

=== CANDIDATE PROFILE ===
CANDIDATE SKILLS: ${resumeData?.skills?.join(', ') || 'Not specified'}
EXPERIENCE: ${resumeData?.experience?.map(e => `${e.position} at ${e.company}`).join('; ') || 'Not specified'}
MATCH SCORE: ${matchScore?.overallMatch || 75}%
FOCUS AREAS: ${focusAreas}
${previousContext}

=== QUESTION GENERATION RULES ===
${previousAnswers?.length > 0 ?
                `Generate 1 ADAPTIVE follow-up question:
- If previous score was LOW (<60): Ask an easier question to assess basic understanding
- If previous score was MEDIUM (60-80): Probe deeper on the same topic
- If previous score was HIGH (>80): Challenge with a harder question
- Focus on: ${focusAreas}` :
                `Generate 5 ROLE-SPECIFIC interview questions:

1. ICE-BREAKER (Easy): Ask about their experience with a KEY SKILL from the job requirements
2. TECHNICAL (Medium): Ask how they would apply ${requiredSkills.split(',')[0] || 'their skills'} in a real scenario
3. BEHAVIORAL (Medium): Ask about a past experience demonstrating skills needed for this role
4. PROBLEM-SOLVING (Medium-Hard): Present a scenario related to the job responsibilities
5. ROLE FIT (Medium): Ask why they're suitable for this specific ${jobTitle} position

IMPORTANT:
- Questions MUST be specific to the job title "${jobTitle}"
- Questions MUST assess the required skills: ${requiredSkills}
- If candidate is missing skills (${missingSkills}), include questions to assess their ability to learn
- Make questions practical and scenario-based when possible`}

=== OUTPUT FORMAT ===
Return ONLY valid JSON:
{
    "questions": [
        {
            "question": "Specific question text related to the job",
            "category": "technical|behavioral|situational|competency|role_fit",
            "difficulty": "easy|medium|hard",
            "expectedTopics": ["skill1", "skill2"],
            "assessingSkill": "The specific skill this question assesses",
            "timeLimit": 120
        }
    ]
}`;

        try {
            const response = await this.callModel(
                this.models.questionGeneration,
                [{ role: 'user', content: prompt }],
                this.apiKeys.qwen,
                { temperature: 0.8, maxTokens: 2048 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.questions || [];
            }
            throw new Error('Failed to parse questions JSON');
        } catch (error) {
            console.error('Question generation error:', error);
            return this.getFallbackQuestions(interviewType, jobTitle, requiredSkills);
        }
    }

    /**
     * Evaluate answer using Qwen3 235B
     */
    async evaluateAnswer(question, answer, context) {
        const { jobTitle, expectedTopics, difficulty, interviewType } = context;

        const prompt = `You are an expert interviewer evaluating a candidate's response.

JOB: ${jobTitle}
INTERVIEW TYPE: ${interviewType}
QUESTION: ${question}
DIFFICULTY: ${difficulty || 'medium'}
EXPECTED TOPICS: ${expectedTopics?.join(', ') || 'Relevant skills and experience'}

CANDIDATE'S ANSWER:
${answer}

Evaluate thoroughly and return JSON:
{
    "score": 75,
    "technicalAccuracy": 80,
    "communication": 70,
    "confidence": 75,
    "relevance": 80,
    "completeness": 70,
    "feedback": "Brief constructive feedback",
    "topicsAddressed": ["topic1"],
    "topicsMissed": ["topic2"],
    "followUpSuggestion": "Suggested follow-up question if needed",
    "strengthsShown": ["strength1"],
    "improvementAreas": ["area1"]
}

Score each metric 0-100. Return ONLY valid JSON.`;

        try {
            const response = await this.callModel(
                this.models.answerEvaluation,
                [{ role: 'user', content: prompt }],
                this.apiKeys.qwen,
                { temperature: 0.5 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse evaluation JSON');
        } catch (error) {
            console.error('Answer evaluation error:', error);
            return {
                score: 70,
                technicalAccuracy: 70,
                communication: 70,
                confidence: 70,
                relevance: 70,
                completeness: 70,
                feedback: 'Answer evaluated',
                topicsAddressed: [],
                topicsMissed: [],
                followUpSuggestion: '',
                strengthsShown: [],
                improvementAreas: []
            };
        }
    }

    /**
     * Evaluate ALL answers HOLISTICALLY at interview end
     * Uses Qwen3 235B for comprehensive analysis
     * This should give LOW scores to rubbish/gibberish answers
     */
    async evaluateAllAnswers(questionsAndAnswers, jobContext) {
        const { jobTitle, jobDescription, requiredSkills } = jobContext;

        const qaFormatted = questionsAndAnswers.map((qa, i) =>
            `Q${i + 1} [${qa.category}]: ${qa.question}\nA${i + 1}: ${qa.answer}`
        ).join('\n\n');

        const prompt = `You are a STRICT and CRITICAL interview evaluator. Your job is to evaluate interview answers HONESTLY.

=== JOB CONTEXT ===
Job Title: ${jobTitle}
Required Skills: ${requiredSkills?.join(', ') || 'Not specified'}
Job Description: ${jobDescription?.substring(0, 500) || 'Not provided'}

=== INTERVIEW Q&A ===
${qaFormatted}

=== STRICT EVALUATION RULES ===
1. GIBBERISH/NONSENSE answers (random text, "asdf", single words, unrelated content) = 0-15 points
2. VERY SHORT answers (less than 20 words) = 15-30 points
3. IRRELEVANT answers (doesn't address the question) = 20-40 points
4. GENERIC answers (no specific examples, very vague) = 40-55 points
5. BASIC answers (addresses question but lacks depth) = 55-70 points
6. GOOD answers (clear, relevant, some examples) = 70-85 points
7. EXCELLENT answers (detailed, specific examples, demonstrates expertise) = 85-100 points

BE HARSH. If the answers don't demonstrate real knowledge or provide specific examples, the score should be LOW.

Return JSON:
{
    "overallScore": 0-100,
    "technicalScore": 0-100,
    "hrScore": 0-100,
    "confidence": 0-100,
    "relevance": 0-100,
    "strengths": ["specific strength 1", "specific strength 2"],
    "weaknesses": ["specific weakness 1", "specific weakness 2"],
    "feedback": "Overall assessment of the candidate's performance"
}

BE STRICT AND HONEST. Return ONLY valid JSON.`;

        try {
            const response = await this.callModel(
                this.models.answerEvaluation,
                [{ role: 'user', content: prompt }],
                this.apiKeys.qwen,
                { temperature: 0.3 } // Lower temp for more consistent evaluation
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse overall evaluation JSON');
        } catch (error) {
            console.error('Overall evaluation error:', error);
            // Return null to trigger local rule-based evaluation
            throw error;
        }
    }

    /**
     * Quick scoring using Mistral 7B (fast)
     */
    async quickScore(question, answer) {
        const prompt = `Rate this interview answer quickly.

Q: ${question}
A: ${answer}

Return JSON with score 0-100:
{"score": 75, "brief": "One line assessment"}`;

        try {
            const response = await this.callModel(
                this.models.fastScoring,
                [{ role: 'user', content: prompt }],
                this.apiKeys.mistral,
                { temperature: 0.3, maxTokens: 100 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { score: 70, brief: 'Answer recorded' };
        } catch (error) {
            console.error('Quick scoring error:', error);
            return { score: 70, brief: 'Answer recorded' };
        }
    }

    /**
     * Generate comprehensive recruiter report using Gemma 2 9B
     */
    async generateRecruiterReport(interviewData) {
        const {
            candidate,
            job,
            matchScore,
            responses,
            overallScore,
            proctoring
        } = interviewData;

        const responseSummary = responses?.map((r, i) =>
            `Q${i + 1}: ${r.question}\nA: ${r.answer?.substring(0, 200)}...\nScore: ${r.score}/100`
        ).join('\n\n') || 'No responses recorded';

        const prompt = `You are a senior HR manager creating a comprehensive candidate assessment report.

CANDIDATE: ${candidate?.name || 'Candidate'}
POSITION: ${job?.title || 'Position'}
COMPANY: ${job?.company?.name || 'Company'}

MATCH ANALYSIS:
- Overall Match: ${matchScore?.overallMatch || 70}%
- Skills Match: ${matchScore?.skillsMatch || 70}%
- Experience Match: ${matchScore?.experienceMatch || 70}%

INTERVIEW PERFORMANCE:
- Overall Score: ${overallScore || 70}/100
- Questions Answered: ${responses?.length || 0}

INTERVIEW RESPONSES:
${responseSummary}

PROCTORING:
- Flags: ${proctoring?.totalFlags || 0}
- Risk Level: ${proctoring?.riskLevel || 'low'}

Generate a professional recruiter report in JSON:
{
    "summary": "2-3 sentence executive summary",
    "recommendation": "highly_recommended|recommended|consider|not_recommended",
    "overallAssessment": {
        "score": 75,
        "grade": "A|B|C|D|F",
        "verdict": "Brief verdict"
    },
    "keyStrengths": ["strength1", "strength2", "strength3"],
    "concerns": ["concern1", "concern2"],
    "technicalAssessment": {
        "score": 80,
        "summary": "Technical skills summary"
    },
    "communicationAssessment": {
        "score": 75,
        "summary": "Communication assessment"
    },
    "cultureFit": {
        "score": 70,
        "summary": "Culture fit assessment"
    },
    "suggestedNextSteps": ["step1", "step2"],
    "suggestedQuestions": ["question1", "question2"],
    "salaryRecommendation": "Based on performance",
    "riskFactors": ["risk1"],
    "finalNotes": "Any additional observations"
}

Be objective and professional. Return ONLY valid JSON.`;

        try {
            const response = await this.callModel(
                this.models.recruiterReport,
                [{ role: 'user', content: prompt }],
                this.apiKeys.llama,
                { temperature: 0.6, maxTokens: 2048 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const report = JSON.parse(jsonMatch[0]);
                report.generatedAt = new Date();
                return report;
            }
            throw new Error('Failed to parse report JSON');
        } catch (error) {
            console.error('Report generation error:', error);
            return this.getDefaultReport(overallScore);
        }
    }

    // ============ FALLBACK METHODS ============

    getDefaultParsedResume() {
        return {
            personalInfo: { name: '', email: '', phone: '', location: '' },
            summary: '',
            skills: [],
            experience: [],
            education: [],
            projects: [],
            certifications: [],
            languages: []
        };
    }

    getFallbackQuestions(interviewType, jobTitle = 'the position', requiredSkills = '') {
        const skills = requiredSkills ? requiredSkills.split(',').map(s => s.trim()).slice(0, 3) : [];
        const primarySkill = skills[0] || 'your core skills';

        if (interviewType === 'technical') {
            return [
                { question: `Tell me about your experience with ${primarySkill} and how you've applied it in your previous roles.`, category: 'technical', difficulty: 'easy', timeLimit: 120, assessingSkill: primarySkill },
                { question: `Describe a challenging technical problem you solved using ${skills[1] || primarySkill}. What was your approach?`, category: 'technical', difficulty: 'medium', timeLimit: 180, assessingSkill: skills[1] || primarySkill },
                { question: `How would you design a solution for a real-world problem as a ${jobTitle}? Walk me through your thought process.`, category: 'technical', difficulty: 'medium', timeLimit: 150, assessingSkill: 'Problem Solving' },
                { question: `Explain a system or project you designed. What were the key technical decisions you made and why?`, category: 'technical', difficulty: 'hard', timeLimit: 180, assessingSkill: 'System Design' },
                { question: `Why are you interested in this ${jobTitle} position and what unique value would you bring?`, category: 'role_fit', difficulty: 'easy', timeLimit: 120, assessingSkill: 'Role Fit' }
            ];
        }
        return [
            { question: `Tell me about yourself and your journey towards becoming a ${jobTitle}.`, category: 'behavioral', difficulty: 'easy', timeLimit: 120, assessingSkill: 'Communication' },
            { question: `Describe a time when you had to learn ${primarySkill} quickly. How did you approach it?`, category: 'behavioral', difficulty: 'medium', timeLimit: 150, assessingSkill: primarySkill },
            { question: `Tell me about a challenging project or situation. How did you handle it and what was the outcome?`, category: 'behavioral', difficulty: 'medium', timeLimit: 150, assessingSkill: 'Problem Solving' },
            { question: `What are your key strengths that would make you successful as a ${jobTitle}?`, category: 'competency', difficulty: 'medium', timeLimit: 150, assessingSkill: 'Self-awareness' },
            { question: `Where do you see yourself in 3-5 years, and how does this ${jobTitle} role fit into your career plans?`, category: 'role_fit', difficulty: 'easy', timeLimit: 120, assessingSkill: 'Career Goals' }
        ];
    }

    getDefaultReport(overallScore = 70) {
        const passed = overallScore >= 60;
        return {
            summary: 'Interview completed. Review recommended for final decision.',
            recommendation: passed ? 'consider' : 'not_recommended',
            overallAssessment: {
                score: overallScore,
                grade: overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C' : 'D',
                verdict: passed ? 'Candidate shows potential' : 'Further evaluation needed'
            },
            keyStrengths: ['Completed interview', 'Attempted all questions'],
            concerns: ['Limited assessment data'],
            technicalAssessment: { score: overallScore, summary: 'Technical assessment pending' },
            communicationAssessment: { score: overallScore, summary: 'Communication assessment pending' },
            cultureFit: { score: overallScore, summary: 'Culture fit assessment pending' },
            suggestedNextSteps: ['Schedule follow-up interview', 'Technical assessment'],
            suggestedQuestions: [],
            salaryRecommendation: 'Standard range',
            riskFactors: [],
            finalNotes: 'Automated report - manual review recommended',
            generatedAt: new Date()
        };
    }
}

module.exports = new OpenRouterService();
