const openRouterService = require('../ai/openRouterService');

class QuestionService {
    /**
     * Generates a conversational follow-up question based on the orchestrator's deterministic state.
     */
    static async generateQuestion({ currentSkill, depthLevel, strategy, testedSubskills, previousAnswer, previousQuestion, roundType = 'technical' }) {
        const subskillsContext = testedSubskills.length > 0
            ? `Avoid repeating these specific areas: ${testedSubskills.join(', ')}`
            : '';

        const personaMap = {
            'hr': 'empathetic and professional HR Recruiter focusing on cultural fit, work history, and soft skills (ABSOLUTELY NO technical architecture/coding questions)',
            'behavioral': 'expert Behavioral Interviewer focusing intensely on past experiences, how the candidate handled conflict/situations, and soft skills (ABSOLUTELY NO technical drill-downs)',
            'technical': 'intelligent, empathetic, and professional tech recruiter conducting a voice interview'
        };
        const persona = personaMap[roundType] || personaMap['technical'];

        const systemPrompt = `You are an ${persona}.
Generate ONE clear, human-sounding response or follow-up question.

Context:
- Current Topic: ${currentSkill}
- Candidate's Statement: "${previousAnswer || 'N/A'}"
- Your Previous Question: "${previousQuestion}"
- Strategic Objective (MUST FOLLOW STRICTLY): ${strategy}

Guidelines based on Strategic Objective:
- IF "repeat_question": You MUST simply repeat Your Previous Question politely. (e.g., "Sure, I was asking...")
- IF "clarify_question": You MUST rephrase Your Previous Question to be simpler and easier to understand.
- IF "encouragement": The candidate is struggling. You MUST show empathy ("That's completely fine", "No worries at all") and then ask a slightly easier question within the current topic.
- IF "switch_skill": The candidate indicated they do not know the answer. You MUST dynamically and naturally acknowledge this with a varied empathetic transition (e.g., "No problem at all", "That's completely fine", "Not to worry, let's move on"). Do not repeat the exact same phrase every time. Then, you MUST ask a completely new, basic question entirely about the new Current Topic (${currentSkill}). DO NOT ask about or reference Your Previous Question (${previousQuestion}).
- IF "natural_conversation": The candidate made small talk. Respond naturally to their comment briefly, then steer back.
- OTHERWISE (technical drill): Build directly on their previous statement to probe for specific technical details or decision-making logic.

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
}

module.exports = QuestionService;
