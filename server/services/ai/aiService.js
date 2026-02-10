/**
 * AI Service - Main Entry Point
 * Delegates to OpenRouter for all AI operations
 * 
 * Model Assignments (ALL FREE TIER):
 * - Resume Parsing: Llama 3.2 3B (FREE)
 * - JD-Resume Matching: Llama 3.2 3B (FREE)
 * - Question Generation: Llama 3.2 3B (FREE)
 * - Answer Evaluation: Llama 3.2 3B (FREE)
 * - Fast Scoring: Llama 3.2 3B (FREE)
 * - Recruiter Report: Llama 3.2 3B (FREE)
 */

const openRouterService = require('./openRouterService');

class AIService {
    constructor() {
        this.openRouter = openRouterService;
    }

    /**
     * Parse resume text to structured data
     * Uses: Llama 3.2 3B (FREE)
     */
    async parseResume(resumeText, options = {}) {
        return this.openRouter.parseResume(resumeText, options);
    }

    /**
     * Match resume to job description
     * Uses: Gemma 2 9B
     */
    async matchResumeToJD(resumeData, jobDescription, jobRequirements, options = {}) {
        return this.openRouter.matchResumeToJD(resumeData, jobDescription, jobRequirements, options);
    }

    /**
     * Generate interview questions based on context
     * Uses: Qwen3 235B
     * Questions are based on job description, skills, roles, and responsibilities
     */
    async generateInterviewQuestions(resumeData, interviewType, jobContext = {}, options = {}) {
        const context = {
            resumeData,
            interviewType,
            jobTitle: jobContext.title || 'General Position',
            jobDescription: jobContext.description || '',
            jobRequirements: jobContext.requirements || {}, // Pass full job requirements
            matchScore: jobContext.matchScore || null,
            previousAnswers: []
        };

        return this.openRouter.generateAdaptiveQuestions(context, options);
    }

    /**
     * Generate adaptive follow-up question
     * Uses: Qwen3 235B
     */
    async generateAdaptiveQuestion(interview, previousQA, options = {}) {
        const context = {
            resumeData: interview.resumeData || {},
            jobTitle: interview.job?.title || 'Position',
            jobDescription: interview.job?.description || '',
            matchScore: interview.matchScore || null,
            previousAnswers: previousQA,
            interviewType: interview.interviewType
        };

        const questions = await this.openRouter.generateAdaptiveQuestions(context, options);
        return questions[0] || null;
    }

    /**
     * Evaluate interview response
     * Uses: Qwen3 235B (detailed) + Mistral 7B (quick)
     */
    async evaluateResponse(question, answer, interviewType, context = {}, options = {}) {
        // Get quick score first (fast feedback)
        const quickResult = await this.openRouter.quickScore(question, answer, options);

        // Get detailed evaluation
        const detailedResult = await this.openRouter.evaluateAnswer(question, answer, {
            jobTitle: context.jobTitle || 'Position',
            expectedTopics: context.expectedTopics || [],
            difficulty: context.difficulty || 'medium',
            interviewType
        }, options);

        return {
            ...detailedResult,
            quickScore: quickResult.score,
            quickFeedback: quickResult.brief,
            confidence: detailedResult.score || quickResult.score
        };
    }

    /**
     * Evaluate ALL answers holistically at the end of interview
     * Uses: Qwen3 235B for comprehensive analysis
     */
    async evaluateAllAnswers(questionsAndAnswers, jobContext, options = {}) {
        return this.openRouter.evaluateAllAnswers(questionsAndAnswers, jobContext, options);
    }

    /**
     * Generate feedback after interview
     * Uses: Qwen3 235B (via evaluate) + Gemma 2 9B (report structure)
     */
    async generateFeedback(responses, interviewType) {
        const avgScore = responses.length > 0
            ? responses.reduce((sum, r) => sum + (r.confidence || r.score || 70), 0) / responses.length
            : 70;

        const passed = avgScore >= 60;

        // Generate strengths and weaknesses from responses
        const allStrengths = responses
            .filter(r => r.strengthsShown)
            .flatMap(r => r.strengthsShown)
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 3);

        const allWeaknesses = responses
            .filter(r => r.improvementAreas)
            .flatMap(r => r.improvementAreas)
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 3);

        return {
            strengths: allStrengths.length > 0 ? allStrengths : ['Completed interview', 'Attempted all questions'],
            weaknesses: allWeaknesses.length > 0 ? allWeaknesses : ['Practice more', 'Provide specific examples'],
            overallFeedback: passed
                ? `Good performance with an average score of ${Math.round(avgScore)}%. Continue building on your strengths.`
                : `Performance needs improvement. Focus on the areas of improvement identified.`,
            passed,
            avgScore: Math.round(avgScore)
        };
    }

    /**
     * Generate comprehensive recruiter report
     * Uses: Gemma 2 9B
     */
    async generateRecruiterReport(interviewData, options = {}) {
        return this.openRouter.generateRecruiterReport(interviewData, options);
    }

    /**
     * Format job description using AI
     * Uses: Gemma 2 9B
     */
    async formatJobDescription(rawText) {
        // Use the JD matching model for formatting
        const prompt = `Format this job description professionally:

${rawText}

Return JSON:
{
    "formattedDescription": "Formatted markdown description",
    "suggestedSkills": ["skill1", "skill2"],
    "experienceLevel": "entry|mid|senior|expert",
    "roleTags": ["tag1", "tag2"]
}`;

        try {
            const response = await this.openRouter.callModel(
                this.openRouter.models.jdMatching,
                [{ role: 'user', content: prompt }],
                this.openRouter.apiKeys.gemma,
                { temperature: 0.4 }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
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
            console.error('Format job description error:', error);
            return {
                formattedDescription: rawText,
                suggestedSkills: [],
                experienceLevel: 'mid',
                roleTags: []
            };
        }
    }

    /**
     * Get fallback questions if AI fails
     */
    getFallbackQuestions(interviewType) {
        return this.openRouter.getFallbackQuestions(interviewType);
    }
}

module.exports = new AIService();
