const geminiService = require('../ai/geminiService');
const openRouterService = require('../ai/openRouterService');

class AnalysisService {
    /**
     * Analyzes candidate's answer using Gemini (fallback to Trinity)
     * strictly returns parsed JSON.
     * @param {string} answerText 
     * @param {string} currentSkill 
     * @param {string} previousQuestion 
     */
    static async analyzeTurn(answerText, currentSkill, previousQuestion) {
        const systemPrompt = `You are an intelligent, empathetic, and professional tech recruiter conducting a voice interview. 
Your primary goal is to maintain a natural, human-like conversation. You MUST listen carefully to what the candidate just said.

Context:
- Skill we are discussing: ${currentSkill}
- My last question to the candidate: "${previousQuestion}"
- Candidate's reply just now: "${answerText}"

CRITICAL CONVERSATIONAL RULES (ABSOLUTE PRIORITY):
1. IF the candidate asks you to repeat the question (e.g. "can you repeat that", "say again", "what was the question"):
   - You MUST set follow_up_strategy to "repeat_question". Do NOT evaluate their skill.
2. IF the candidate says they don't know the answer, refuses to answer (e.g. "No"), gives a completely empty/evasive answer, or is genuinely confused about the technical concept:
   - You MUST set follow_up_strategy to "switch_skill" to move to an easier/different topic.
   - You MUST give a low clarity_score (e.g. 0.0 or 0.1).
   - Set weakness_detected to "Candidate was unfamiliar with this concept or refused to answer."
3. IF the candidate makes small talk, asks about the company, or says something unrelated to the technical question:
   - You MUST set follow_up_strategy to "natural_conversation".

Only if the candidate actually attempted to answer the technical question, apply standard evaluation:
- Assess their depth and clarity objectively.
- Determine if you should drill deeper ("drill_concept"), give a scenario ("scenario_based"), switch topics ("switch_skill"), or escalate difficulty ("escalate").

Return JSON only. Output structure:
{
  "skill_detected": "skill name",
  "depth_level": "basic" | "intermediate" | "advanced",
  "clarity_score": 0.0 to 1.0,
  "follow_up_strategy": "drill_concept" | "scenario_based" | "escalate" | "switch_skill" | "repeat_question" | "clarify_question" | "encouragement" | "natural_conversation",
  "weakness_detected": "brief description or empty string"
}`;

        try {
            // Primary: Trinity as requested by user
            return await this._callTrinityFallback(systemPrompt);
        } catch (error) {
            console.error('[AnalysisService] AI logic failed, using safe default:', error.message);
            return {
                skill_detected: "unknown",
                depth_level: "basic",
                clarity_score: 0.5,
                follow_up_strategy: "drill_concept",
                weakness_detected: ""
            };
        }
    }

    static async _callGeminiDirectly(prompt) {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            // using flash for fast analysis
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            return this._parseJson(responseText);
        } catch (e) {
            throw new Error(`Gemini Error: ${e.message}`);
        }
    }

    static async _callTrinityFallback(prompt) {
        // Fallback to arcee-ai/trinity-large-preview:free
        try {
            const response = await openRouterService.callModel(
                'arcee-ai/trinity-large-preview:free',
                [
                    { role: 'system', content: 'You are a strict JSON outputting AI.' },
                    { role: 'user', content: prompt }
                ],
                process.env.OPENROUTER_LLAMA_KEY || process.env.OPENROUTER_API_KEY,
                { temperature: 0.1 }
            );
            return this._parseJson(response);
        } catch (e) {
            console.error('[AnalysisService] Trinity fallback failed:', e);
            // Return safe default to avoid crashing interview
            return {
                skill_detected: "unknown",
                depth_level: "basic",
                clarity_score: 0.5,
                follow_up_strategy: "drill_concept",
                weakness_detected: ""
            };
        }
    }

    static _parseJson(text) {
        try {
            // Clean markdown if present
            const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('[AnalysisService] JSON parse failed on:', text);
            throw new Error('Invalid JSON string from LLM');
        }
    }
}

module.exports = AnalysisService;
