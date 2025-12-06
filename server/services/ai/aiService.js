const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class AIService {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    /**
     * Generate interview questions from resume data
     */
    async generateInterviewQuestions(resumeData, interviewType = 'technical') {
        try {
            const prompt = this.buildQuestionPrompt(resumeData, interviewType);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseQuestions(text, interviewType);
        } catch (error) {
            console.error('Error generating questions:', error);
            throw new Error('Failed to generate interview questions');
        }
    }

    /**
     * Build prompt for question generation
     */
    buildQuestionPrompt(resumeData, interviewType) {
        const { skills, experience, education, projects } = resumeData;

        if (interviewType === 'technical') {
            return `You are an expert technical interviewer. Based on the following resume data, generate 5 technical interview questions that are relevant, challenging, and assess the candidate's skills.

Resume Data:
- Skills: ${skills?.join(', ') || 'Not specified'}
- Experience: ${experience?.map(exp => `${exp.position} at ${exp.company}`).join('; ') || 'Not specified'}
- Projects: ${projects?.map(proj => proj.name).join(', ') || 'Not specified'}
- Education: ${education?.map(edu => `${edu.degree} in ${edu.field}`).join('; ') || 'Not specified'}

Generate 5 technical questions in the following JSON format:
[
  {
    "question": "Question text here",
    "category": "technical_skill",
    "difficulty": "medium"
  }
]

Focus on practical problem-solving, coding concepts, and real-world scenarios. Make questions specific to their skills and experience.`;
        } else {
            return `You are an expert HR interviewer. Based on the following resume data, generate 5 HR/behavioral interview questions that assess communication, teamwork, problem-solving, and cultural fit.

Resume Data:
- Experience: ${experience?.map(exp => `${exp.position} at ${exp.company}`).join('; ') || 'Not specified'}
- Skills: ${skills?.join(', ') || 'Not specified'}

Generate 5 HR questions in the following JSON format:
[
  {
    "question": "Question text here",
    "category": "behavioral",
    "difficulty": "medium"
  }
]

Focus on behavioral questions, situational scenarios, and communication skills.`;
        }
    }

    /**
     * Parse generated questions
     */
    parseQuestions(text, interviewType) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const questions = JSON.parse(jsonMatch[0]);
                return questions.map(q => ({
                    question: q.question,
                    generatedBy: 'ai',
                    category: q.category || (interviewType === 'technical' ? 'technical_skill' : 'behavioral'),
                    difficulty: q.difficulty || 'medium'
                }));
            }

            // Fallback: parse line by line
            const lines = text.split('\n').filter(line => line.trim());
            const questions = [];

            for (const line of lines) {
                if (line.match(/^\d+[\.\)]/)) {
                    const questionText = line.replace(/^\d+[\.\)]\s*/, '').trim();
                    if (questionText) {
                        questions.push({
                            question: questionText,
                            generatedBy: 'ai',
                            category: interviewType === 'technical' ? 'technical_skill' : 'behavioral',
                            difficulty: 'medium'
                        });
                    }
                }
            }

            return questions.slice(0, 5);
        } catch (error) {
            console.error('Error parsing questions:', error);
            return this.getFallbackQuestions(interviewType);
        }
    }

    /**
     * Evaluate interview response
     */
    async evaluateResponse(question, answer, interviewType) {
        try {
            const prompt = `You are an expert interviewer evaluating a candidate's response.

Question: ${question}
Candidate's Answer: ${answer}
Interview Type: ${interviewType}

Evaluate the response on the following criteria (0-100 scale):
1. Technical Accuracy (for technical) / Relevance (for HR)
2. Communication Quality
3. Confidence
4. Completeness

Provide the evaluation in JSON format:
{
  "score": 75,
  "technicalAccuracy": 80,
  "communication": 70,
  "confidence": 75,
  "relevance": 80,
  "feedback": "Brief feedback here"
}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                score: 70,
                technicalAccuracy: 70,
                communication: 70,
                confidence: 70,
                relevance: 70,
                feedback: 'Response evaluated'
            };
        } catch (error) {
            console.error('Error evaluating response:', error);
            return {
                score: 70,
                technicalAccuracy: 70,
                communication: 70,
                confidence: 70,
                relevance: 70,
                feedback: 'Unable to evaluate response'
            };
        }
    }

    /**
     * Generate overall interview feedback
     */
    async generateFeedback(responses, interviewType) {
        try {
            const avgScore = responses.reduce((sum, r) => sum + (r.score || 0), 0) / responses.length;

            const prompt = `You are an expert interviewer providing feedback on a ${interviewType} interview.

Average Score: ${avgScore}/100
Number of Questions: ${responses.length}

Based on the overall performance, provide:
1. Top 3 strengths
2. Top 3 areas for improvement
3. Overall assessment (2-3 sentences)

Provide in JSON format:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "overallFeedback": "Overall assessment here",
  "passed": true/false
}

Consider passing score as 60/100.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                strengths: ['Good communication', 'Relevant experience', 'Clear responses'],
                weaknesses: ['Could provide more details', 'Practice technical concepts', 'Improve confidence'],
                overallFeedback: 'Overall performance was satisfactory.',
                passed: avgScore >= 60
            };
        } catch (error) {
            console.error('Error generating feedback:', error);
            return {
                strengths: ['Completed interview', 'Attempted all questions'],
                weaknesses: ['Practice more', 'Improve technical skills'],
                overallFeedback: 'Keep practicing and improving.',
                passed: false
            };
        }
    }

    /**
     * Fallback questions if AI generation fails
     */
    getFallbackQuestions(interviewType) {
        if (interviewType === 'technical') {
            return [
                {
                    question: 'Explain the difference between var, let, and const in JavaScript.',
                    generatedBy: 'ai',
                    category: 'technical_skill',
                    difficulty: 'easy'
                },
                {
                    question: 'What is the time complexity of binary search?',
                    generatedBy: 'ai',
                    category: 'technical_skill',
                    difficulty: 'medium'
                },
                {
                    question: 'Describe how you would optimize a slow database query.',
                    generatedBy: 'ai',
                    category: 'technical_skill',
                    difficulty: 'medium'
                },
                {
                    question: 'What are the principles of RESTful API design?',
                    generatedBy: 'ai',
                    category: 'technical_skill',
                    difficulty: 'medium'
                },
                {
                    question: 'Explain a challenging technical problem you solved recently.',
                    generatedBy: 'ai',
                    category: 'technical_skill',
                    difficulty: 'hard'
                }
            ];
        } else {
            return [
                {
                    question: 'Tell me about yourself and your professional background.',
                    generatedBy: 'ai',
                    category: 'behavioral',
                    difficulty: 'easy'
                },
                {
                    question: 'Describe a time when you faced a conflict with a team member. How did you handle it?',
                    generatedBy: 'ai',
                    category: 'behavioral',
                    difficulty: 'medium'
                },
                {
                    question: 'What are your greatest strengths and how do they apply to this role?',
                    generatedBy: 'ai',
                    category: 'behavioral',
                    difficulty: 'easy'
                },
                {
                    question: 'Where do you see yourself in 5 years?',
                    generatedBy: 'ai',
                    category: 'behavioral',
                    difficulty: 'medium'
                },
                {
                    question: 'Why do you want to work for our company?',
                    generatedBy: 'ai',
                    category: 'behavioral',
                    difficulty: 'medium'
                }
            ];
        }
    }

    /**
     * Format job description using AI
     */
    async formatJobDescription(rawText) {
        try {
            const prompt = `You are an expert job posting formatter. Take the following raw job description and format it professionally with proper sections.

Raw Text:
${rawText}

Format it with these sections:
- Job Title
- Company Overview
- Role Description
- Key Responsibilities
- Required Qualifications
- Preferred Qualifications
- Benefits

Also suggest:
- Required technical skills (as array)
- Experience level (entry/mid/senior/expert)
- Suggested role tags

Return in JSON format:
{
  "formattedDescription": "Formatted markdown text",
  "suggestedSkills": ["skill1", "skill2"],
  "experienceLevel": "mid",
  "roleTags": ["tag1", "tag2"]
}`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                formattedDescription: rawText,
                suggestedSkills: [],
                experienceLevel: 'mid',
                roleTags: []
            };
        } catch (error) {
            console.error('Error formatting job description:', error);
            return {
                formattedDescription: rawText,
                suggestedSkills: [],
                experienceLevel: 'mid',
                roleTags: []
            };
        }
    }
}

module.exports = new AIService();
