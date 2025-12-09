/**
 * Gemini AI Service
 * Uses Google's Gemini Flash 2.0 for resume parsing and question generation
 */

const axios = require('axios');

class GeminiService {
    constructor() {
        // SECURITY: Only use environment variable - never hardcode API keys
        this.apiKey = process.env.GEMINI_API_KEY;

        if (!this.apiKey) {
            console.warn('WARNING: GEMINI_API_KEY not set in environment variables');
        }

        // Use v1 API with gemini-2.0-flash model
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';

        console.log('GeminiService initialized');
        console.log('  API Key configured:', this.apiKey ? 'Yes' : 'No');
        console.log('  Endpoint:', this.baseUrl);
    }

    /**
     * Make API call to Gemini
     */
    async callGemini(prompt, options = {}) {
        try {
            const response = await axios.post(
                `${this.baseUrl}?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        maxOutputTokens: options.maxTokens || 2048,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('No response from Gemini');
            }
            return text;
        } catch (error) {
            console.error('Gemini API error:', error.response?.data || error.message);
            throw new Error(`Gemini API failed: ${error.message}`);
        }
    }

    /**
     * Parse resume using Gemini Flash 2.0
     */
    async parseResume(resumeText) {
        const prompt = `You are an expert resume parser. Analyze the following resume text and extract structured information.

RESUME TEXT:
${resumeText}

Extract and return a JSON object with this exact structure:
{
    "personalInfo": {
        "name": "candidate name",
        "email": "email if found",
        "phone": "phone if found",
        "location": "location if found"
    },
    "summary": "brief professional summary",
    "skills": ["skill1", "skill2", "skill3"],
    "experience": [
        {
            "company": "company name",
            "position": "job title",
            "duration": "time period",
            "description": "role description",
            "achievements": ["achievement1", "achievement2"]
        }
    ],
    "education": [
        {
            "institution": "school name",
            "degree": "degree name",
            "field": "field of study",
            "year": "graduation year"
        }
    ],
    "projects": [
        {
            "name": "project name",
            "description": "what it does",
            "technologies": ["tech1", "tech2"]
        }
    ],
    "certifications": ["cert1", "cert2"]
}

Important: Extract ALL skills mentioned in the resume, including programming languages, frameworks, tools, and soft skills.
Return ONLY the JSON, no additional text or markdown formatting.`;

        try {
            const response = await this.callGemini(prompt, { temperature: 0.3 });

            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('Gemini parsed resume - Skills found:', parsed.skills?.length || 0);
                return parsed;
            }
            throw new Error('Failed to parse resume JSON from Gemini response');
        } catch (error) {
            console.error('Resume parsing error:', error);
            throw error;
        }
    }

    /**
     * Generate interview questions based on resume
     */
    async generateQuestions(parsedResume, desiredRole, interviewType = 'technical') {
        const skills = parsedResume?.skills?.join(', ') || 'general skills';
        const experience = parsedResume?.experience?.map(e => e.position).join(', ') || 'no specific experience';
        const projects = parsedResume?.projects?.map(p => p.name).join(', ') || 'no projects listed';

        const prompt = `You are an expert interviewer. Generate 5 unique ${interviewType} interview questions for a candidate applying for "${desiredRole || 'Software Developer'}" role.

CANDIDATE PROFILE:
- Skills: ${skills}
- Experience: ${experience}
- Projects: ${projects}

Generate 5 ${interviewType === 'technical' ? 'technical/coding' : 'behavioral/HR'} questions that:
1. Are SPECIFIC to the candidate's actual skills and experience listed above
2. Are NOT generic questions - reference their specific technologies or projects
3. Test their depth of knowledge in their claimed skills
4. Are appropriate for their experience level
5. Each question should be unique and different from others

Return a JSON array with exactly 5 questions:
[
    {
        "question": "Specific question text mentioning their actual skills",
        "category": "${interviewType}",
        "difficulty": "medium",
        "assessingSkill": "which specific skill this tests",
        "expectedTopics": ["topic1", "topic2"],
        "timeLimit": 120
    }
]

IMPORTANT: Make questions SPECIFIC to their resume. If they know React, ask about React. If they have a specific project, ask about it.
Return ONLY the JSON array, no additional text.`;

        try {
            const response = await this.callGemini(prompt, { temperature: 0.8 });

            // Extract JSON array from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0]);
                console.log(`Gemini generated ${questions.length} ${interviewType} questions`);
                return questions;
            }
            throw new Error('Failed to parse questions JSON from Gemini response');
        } catch (error) {
            console.error('Question generation error:', error);
            // Return fallback questions
            return this.getFallbackQuestions(interviewType, desiredRole, skills);
        }
    }

    /**
     * Evaluate interview answers using Gemini
     */
    async evaluateAnswers(questionsAndAnswers, jobContext) {
        const qaText = questionsAndAnswers.map((qa, i) =>
            `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
        ).join('\n\n');

        const prompt = `You are an expert interview evaluator. Evaluate the following interview responses for a "${jobContext.jobTitle || 'Software Developer'}" position.

INTERVIEW RESPONSES:
${qaText}

Evaluate and return a JSON object:
{
    "overallScore": 75,
    "technicalScore": 70,
    "hrScore": 80,
    "communication": 75,
    "confidence": 70,
    "relevance": 80,
    "problemSolving": 70,
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2"],
    "areasToImprove": [
        {"area": "Area Name", "suggestion": "How to improve", "priority": "high"}
    ],
    "feedback": "Overall feedback paragraph",
    "technicalFeedback": "Specific technical feedback",
    "communicationFeedback": "Communication feedback",
    "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Score each metric from 0-100 based on:
- Quality and depth of answers
- Relevance to the questions asked
- Communication clarity
- Technical accuracy (for technical questions)
- Problem-solving approach

Return ONLY the JSON, no additional text.`;

        try {
            const response = await this.callGemini(prompt, { temperature: 0.5 });

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Failed to parse evaluation JSON');
        } catch (error) {
            console.error('Evaluation error:', error);
            // Return rule-based evaluation
            return this.calculateFallbackScore(questionsAndAnswers);
        }
    }

    /**
     * Fallback questions when AI fails
     */
    getFallbackQuestions(interviewType, role, skills) {
        const techQuestions = [
            { question: `Explain your experience with ${skills.split(',')[0] || 'programming'}. What projects have you built?`, category: 'technical', difficulty: 'medium', assessingSkill: 'Technical depth', timeLimit: 150 },
            { question: 'Describe a challenging bug you fixed recently. How did you debug it?', category: 'technical', difficulty: 'medium', assessingSkill: 'Problem solving', timeLimit: 150 },
            { question: 'How do you ensure code quality in your projects?', category: 'technical', difficulty: 'medium', assessingSkill: 'Best practices', timeLimit: 120 },
            { question: 'Explain a complex technical concept to someone non-technical.', category: 'technical', difficulty: 'medium', assessingSkill: 'Communication', timeLimit: 120 },
            { question: 'What new technology have you learned recently? How did you apply it?', category: 'technical', difficulty: 'easy', assessingSkill: 'Learning ability', timeLimit: 120 }
        ];

        const hrQuestions = [
            { question: 'Tell me about yourself and your career journey.', category: 'behavioral', difficulty: 'easy', assessingSkill: 'Self-awareness', timeLimit: 120 },
            { question: 'Describe a time you worked effectively in a team to solve a problem.', category: 'behavioral', difficulty: 'medium', assessingSkill: 'Teamwork', timeLimit: 150 },
            { question: 'How do you handle disagreements with colleagues?', category: 'behavioral', difficulty: 'medium', assessingSkill: 'Conflict resolution', timeLimit: 120 },
            { question: 'What are your career goals for the next 3-5 years?', category: 'behavioral', difficulty: 'easy', assessingSkill: 'Career planning', timeLimit: 120 },
            { question: 'Why are you interested in this role?', category: 'behavioral', difficulty: 'easy', assessingSkill: 'Motivation', timeLimit: 120 }
        ];

        return interviewType === 'technical' ? techQuestions : hrQuestions;
    }

    /**
     * Fallback scoring when AI evaluation fails
     * More generous scoring that doesn't penalize short answers too harshly
     */
    calculateFallbackScore(questionsAndAnswers) {
        let totalScore = 0;
        let techScore = 0, hrScore = 0, techCount = 0, hrCount = 0;

        questionsAndAnswers.forEach(qa => {
            const answer = qa.answer || '';
            const wordCount = answer.trim().split(/\s+/).filter(w => w).length;

            // Base score starts at 60 (passing grade)
            let score = 60;

            // Add points for answer length (up to +20 for detailed answers)
            if (wordCount >= 100) score += 20;
            else if (wordCount >= 50) score += 15;
            else if (wordCount >= 25) score += 10;
            else if (wordCount >= 10) score += 5;
            else if (wordCount >= 5) score += 2;
            // Very short answers still get base 60

            // Bonus for professional keywords (up to +10)
            const keywords = ['experience', 'project', 'team', 'learned', 'achieved',
                'implemented', 'developed', 'managed', 'created', 'improved',
                'solved', 'built', 'designed', 'worked', 'collaborated'];
            const matchedKeywords = keywords.filter(kw =>
                answer.toLowerCase().includes(kw.toLowerCase())
            );
            score += Math.min(10, matchedKeywords.length * 2);

            // Bonus for structured response (sentences)
            const sentenceCount = (answer.match(/[.!?]/g) || []).length;
            if (sentenceCount >= 3) score += 5;
            else if (sentenceCount >= 1) score += 2;

            // Cap at 100
            score = Math.min(100, score);

            totalScore += score;
            if (qa.category === 'technical' || qa.round === 'technical') {
                techScore += score;
                techCount++;
            } else {
                hrScore += score;
                hrCount++;
            }
        });

        const avgScore = questionsAndAnswers.length > 0 ? Math.round(totalScore / questionsAndAnswers.length) : 65;

        return {
            overallScore: avgScore,
            technicalScore: techCount > 0 ? Math.round(techScore / techCount) : 65,
            hrScore: hrCount > 0 ? Math.round(hrScore / hrCount) : 65,
            communication: avgScore,
            confidence: Math.min(100, avgScore + 5),
            relevance: avgScore,
            problemSolving: avgScore,
            strengths: avgScore >= 70
                ? ['Good communication', 'Detailed responses', 'Professional vocabulary']
                : avgScore >= 60
                    ? ['Completed interview', 'Basic competency shown']
                    : ['Completed interview'],
            weaknesses: avgScore < 60
                ? ['Could provide more detail', 'Consider using specific examples']
                : [],
            areasToImprove: [
                { area: 'Answer Depth', suggestion: 'Use specific examples from your experience', priority: avgScore < 70 ? 'high' : 'low' },
                { area: 'Structure', suggestion: 'Structure answers with situation, action, and result', priority: 'medium' }
            ],
            feedback: avgScore >= 80
                ? 'Excellent responses! Your answers were detailed and professional.'
                : avgScore >= 70
                    ? 'Good job! You demonstrated solid knowledge and communication.'
                    : avgScore >= 60
                        ? 'Thank you for completing the interview. Consider providing more detailed answers with specific examples.'
                        : 'Thank you for completing the interview. More detailed answers would help showcase your skills better.',
            technicalFeedback: 'Continue practicing technical explanations and problem-solving approaches.',
            communicationFeedback: 'Consider using the STAR method (Situation, Task, Action, Result) for behavioral questions.',
            recommendations: [
                'Prepare 2-3 specific examples from your experience',
                'Practice explaining your projects concisely',
                'Research common interview questions for your role'
            ]
        };
    }
}

module.exports = new GeminiService();
