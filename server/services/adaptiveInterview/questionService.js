const openRouterService = require('../ai/openRouterService');

class QuestionService {
    /**
     * Generates a conversational follow-up question based on the orchestrator's deterministic state.
     * For platform interviews, enriches the prompt with resume projects, experience, and desired role.
     */
    static async generateQuestion({ currentSkill, depthLevel, strategy, testedSubskills, previousAnswer, previousQuestion, roundType = 'technical', resumeContext = null }) {
        const subskillsContext = testedSubskills.length > 0
            ? `Avoid repeating these specific areas: ${testedSubskills.join(', ')}`
            : '';

        const personaMap = {
            'hr': 'empathetic and professional HR Recruiter focusing on cultural fit, work history, and soft skills (ABSOLUTELY NO technical architecture/coding questions)',
            'behavioral': 'expert Behavioral Interviewer focusing intensely on past experiences, how the candidate handled conflict/situations, and soft skills (ABSOLUTELY NO technical drill-downs)',
            'technical': 'intelligent, empathetic, and professional tech recruiter conducting a voice interview'
        };
        const persona = personaMap[roundType] || personaMap['technical'];

        // Build resume-enriched context for platform interviews
        let platformContext = '';
        if (resumeContext) {
            const parts = [];
            if (resumeContext.desiredRole) parts.push(`- Desired Role: ${resumeContext.desiredRole}`);
            if (resumeContext.experienceLevel) parts.push(`- Experience Level: ${resumeContext.experienceLevel}`);
            if (resumeContext.domains?.length > 0) parts.push(`- Interested Domains: ${resumeContext.domains.join(', ')}`);
            if (resumeContext.projects?.length > 0) {
                const projectsSummary = resumeContext.projects.slice(0, 3).map(p =>
                    `"${p.name || p.title}" (${p.description?.substring(0, 100) || 'No description'})`
                ).join('; ');
                parts.push(`- Candidate's Projects: ${projectsSummary}`);
            }
            if (resumeContext.experience?.length > 0) {
                const expSummary = resumeContext.experience.slice(0, 3).map(e =>
                    `${e.role || e.title} at ${e.company} (${e.duration || ''})`
                ).join('; ');
                parts.push(`- Work Experience: ${expSummary}`);
            }
            if (parts.length > 0) {
                platformContext = `\n\nCANDIDATE PROFILE (from their resume - use this to ask personalized questions):\n${parts.join('\n')}\n\nIMPORTANT: Reference the candidate's ACTUAL projects and experience when asking questions. For example, ask about a specific project they built, or about challenges they faced in their previous role. Make the conversation personal and relevant to THEIR background.`;
            }
        }

        let strategyGuideline = '';
        switch (strategy) {
            case 'repeat_question':
                strategyGuideline = `You MUST simply repeat Your Previous Question politely. (e.g., "Sure, I was asking...")`;
                break;
            case 'clarify_question':
                strategyGuideline = `You MUST rephrase Your Previous Question to be simpler and easier to understand.`;
                break;
            case 'encouragement':
                strategyGuideline = `The candidate is struggling. You MUST show empathy ("That's completely fine", "No worries at all") and then ask a slightly easier question within the current topic.`;
                break;
            case 'switch_skill':
                strategyGuideline = `The candidate indicated they do not know the answer. You MUST dynamically acknowledge this with a completely unique, natural, and varied empathetic transition (e.g., "Got it", "Fair enough", "Makes sense", "Let's move to another topic"). NEVER, UNDER ANY CIRCUMSTANCES, use the exact phrases "Let's switch gears" or "No problem at all". Then, you MUST ask a completely new, basic question entirely about the new Current Topic (${currentSkill}). DO NOT ask about or reference Your Previous Question.`;
                break;
            case 'natural_conversation':
                strategyGuideline = `The candidate made small talk or gave a short affirmative answer (like "Yes", "Sure"). Respond naturally to their comment briefly, then steer back or ask the next logical follow-up.`;
                break;
            case 'scenario_based':
                strategyGuideline = `Propose a brief hypothetical scenario related to their previous answer to test their practical application of the concept.`;
                break;
            case 'escalate':
                strategyGuideline = `The candidate gave a strong answer. Ask an advanced follow-up question that increases the abstract or technical difficulty based on their previous statement.`;
                break;
            case 'drill_concept':
            default:
                strategyGuideline = `Build directly on their previous statement to probe for specific details or decision-making logic. DO NOT simply repeat your previous question.`;
                break;
        }

        const systemPrompt = `You are an ${persona}.
Generate ONE clear, human-sounding response or follow-up question.

Context:
- Current Topic: ${currentSkill}
- Candidate's Statement: "${previousAnswer || 'N/A'}"
- Your Previous Question: "${previousQuestion}"
- Strategic Objective (MUST FOLLOW STRICTLY): ${strategy}
${platformContext}

Guidelines based on Strategic Objective:
- ${strategyGuideline}

Tone Rules:
- Maintain a highly empathetic, professional demeanor. You are talking to a human.
- Do not use generic filler enthusiasm (avoid "That's a great point", "I love that").
- Ensure the response is concise, easy to listen to, and focused.

Return ONLY the raw spoken text.`;

        try {
            // Primary: Trinity as requested by user
            return await this._callTrinityFallback(systemPrompt, currentSkill);
        } catch (error) {
            console.error('[QuestionService] Trinity primary failed, falling back to Gemini:', error.message);
            return await this._callGeminiDirectly(systemPrompt);
        }
    }

    static async _callGeminiDirectly(prompt) {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            throw new Error(`Gemini Error: ${e.message} `);
        }
    }

    static async _callTrinityFallback(prompt, currentSkill) {
        try {
            const response = await openRouterService.callModel(
                'arcee-ai/trinity-large-preview:free',
                [
                    { role: 'system', content: 'You are an interviewer. Return ONLY the question string.' },
                    { role: 'user', content: prompt }
                ],
                process.env.OPENROUTER_LLAMA_KEY || process.env.OPENROUTER_API_KEY,
                { temperature: 0.7 }
            );
            return response.replace(/^["']|["']$/g, '').trim(); // clean quotes if any
        } catch (e) {
            console.error('[QuestionService] Trinity fallback failed:', e.message);
            return `Could you elaborate more on your experience with ${currentSkill}?`;
        }
    }

    /**
     * Specifically generates the FIRST question of a new round, bypassing the need for a previous answer or strategy.
     */
    static async generateOpeningQuestion({ roundType, skills, resumeContext }) {
        const personaMap = {
            'hr': 'empathetic and professional HR Recruiter focusing on cultural fit, work history, and soft skills (ABSOLUTELY NO technical architecture/coding questions)',
            'behavioral': 'expert Behavioral Interviewer focusing intensely on past experiences, how the candidate handled conflict/situations, and soft skills (ABSOLUTELY NO technical drill-downs)',
            'technical': 'expert technical interviewer conducting a deep-dive technical round'
        };
        const persona = personaMap[roundType] || personaMap['technical'];

        let platformContext = '';
        if (resumeContext) {
            const parts = [];
            if (resumeContext.desiredRole) parts.push(`- Desired Role: ${resumeContext.desiredRole}`);
            if (resumeContext.experienceLevel) parts.push(`- Experience Level: ${resumeContext.experienceLevel}`);
            if (resumeContext.domains?.length > 0) parts.push(`- Interested Domains: ${resumeContext.domains.join(', ')}`);
            if (skills?.length > 0) parts.push(`- Core Skills: ${skills.join(', ')}`);
            if (resumeContext.projects?.length > 0) {
                const projectsSummary = resumeContext.projects.slice(0, 2).map(p =>
                    `"${p.name || p.title}" (${p.description?.substring(0, 100) || ''})`
                ).join('; ');
                parts.push(`- Projects: ${projectsSummary}`);
            }
            if (parts.length > 0) {
                platformContext = `\nCANDIDATE PROFILE:\n${parts.join('\n')}\n`;
            }
        } else if (skills?.length > 0) {
            platformContext = `\nCANDIDATE SKILLS: ${skills.join(', ')}\n`;
        }

        const systemPrompt = `You are an ${persona}.
You are starting a brand new interview round (${roundType}). The candidate is already in the call with you, so DO NOT say "Hello" or "Welcome".
Just dive directly into the first question of this new round in a natural conversational way.
${platformContext}
Generate EXACTLY ONE opening question appropriate for a ${roundType} round based on their profile.
Return ONLY the raw spoken text.`;

        try {
            return await this._callTrinityFallback(systemPrompt, skills?.[0] || 'your background');
        } catch (error) {
            console.error('[QuestionService] Trinity opening failed, falling back to Gemini:', error.message);
            return await this._callGeminiDirectly(systemPrompt);
        }
    }
}

module.exports = QuestionService;
