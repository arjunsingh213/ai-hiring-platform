const axios = require('axios');
const aiUsageService = require('./aiUsageService');

class GroqService {
    constructor() {
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.1-8b-instant';

        // Read from environment variable
        this.apiKey = process.env.GROQ_API_KEY;
    }

    /**
     * Clean AI-generated JSON to fix common parsing errors
     */
    cleanAIGeneratedJson(jsonStr) {
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            let cleaned = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
            }
            try {
                return JSON.parse(cleaned);
            } catch (e2) {
                console.error('[Groq JSON Clean] Failed to parse:', e2.message);
                throw e2;
            }
        }
    }

    /**
     * Make API call to Groq
     */
    async callModel(messages, options = {}) {
        const startTime = Date.now();

        // Determine whether JSON mode is requested
        const requestData = {
            model: this.model,
            messages,
            temperature: options.temperature ?? 0.2, // Low temp by default for deterministic output
            max_tokens: options.maxTokens || 4000
        };

        if (options.jsonMode === true) {
            requestData.response_format = { type: "json_object" };
        }

        try {
            const response = await axios.post(this.baseUrl, requestData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const usage = response.data.usage;
            if (usage && options.userId) {
                await aiUsageService.logUsage({
                    userId: options.userId,
                    model: this.model,
                    purpose: options.purpose || 'job_builder_groq',
                    inputTokens: usage.prompt_tokens,
                    outputTokens: usage.completion_tokens,
                    status: 'success',
                    metadata: {
                        latency: Date.now() - startTime,
                        provider: 'Groq'
                    }
                });
            }

            let content = response.data.choices[0].message.content;
            if (options.jsonMode === true) {
                return typeof content === 'string' ? this.cleanAIGeneratedJson(content) : content;
            }
            return content;
        } catch (error) {
            console.error(`[GROQ_SERVICE] API error (${this.model}):`, error.response?.data || error.message);
            if (error.response?.data?.error) {
                console.error(`[GROQ_SERVICE] Detailed Error:`, JSON.stringify(error.response.data.error, null, 2));
            }

            if (options.userId) {
                await aiUsageService.logUsage({
                    userId: options.userId,
                    model: this.model,
                    purpose: options.purpose || 'job_builder_groq',
                    status: 'failed',
                    errorMessage: error.message,
                    metadata: {
                        latency: Date.now() - startTime,
                        provider: 'Groq'
                    }
                });
            }

            throw new Error(`Groq AI call failed: ${error.message}`);
        }
    }

    /**
     * Generate full structured job from context
     */
    async generateFullJobDraft(context, options = {}) {
        const prompt = `You are an expert technical recruiter and HR systems architect. Convert the following context into a structured SMART_JOB output. Follow the interview policy constraints.

Interview Duration Policy:
- Minimum duration: 10 minutes
- Maximum duration: 30 minutes
- Default target: 20 minutes
- Prefer multiple short focused rounds over long sessions.

Experience Modeling Policy:
Convert requested years of experience into ownership levels:
- learning_with_guidance (0-2 years)
- feature_owner (3-5 years)
- system_owner (5-8 years)
- architecture_leader (8+ years)

Context:
${JSON.stringify(context, null, 2)}

Produce ONLY a valid JSON object matching exactly this structure. DO NOT use markdown, just raw JSON text starting with { and ending with }.

{
  "role_title": "Clean concise title",
  "seniority_level": "Entry|Junior|Mid|Senior|Lead",
  "role_complexity": "Low|Medium|High",
  "salary_range": {
     "min": 0,
     "max": 0,
     "currency": "USD",
     "period": "year"
  },
  "qualifications": ["Degree in CS", "3+ years in React"],
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "required_skills": ["Skill 1", "Skill 2"],
  "preferred_skills": ["Skill A", "Skill B"],
  "experience_model": "learning_with_guidance|feature_owner|system_owner|architecture_leader",
  "hiring_goals": ["Goal 1"],
  "suggested_interview_rounds": [
    {
       "title": "Round Title",
       "duration": 20,
       "type": "Technical|Behavioral|System Design"
    }
  ],
  "recommended_modules": [],
  "explainability_summary": {
    "reason_summary": "Brief explanation of why these rounds and skills were chosen.",
    "confidence_score": 90
  }
}`;

        return this.callModel([
            { role: 'system', content: 'You are a helpful AI designed to output JSON.' },
            { role: 'user', content: prompt }
        ], { ...options, jsonMode: true, temperature: 0.1 });
    }

    /**
     * Expand a predefined template intelligently
     */
    async expandRoleTemplate(templateName, modifications, options = {}) {
        const prompt = `Use this base role template "${templateName}" and intelligently expand it based on these modifications/requirements:
${JSON.stringify(modifications, null, 2)}

Produce ONLY a valid JSON object representing the SMART_JOB structure as previously defined.`;

        return this.callModel([
            { role: 'system', content: 'You are an HR design architect AI designed to output JSON.' },
            { role: 'user', content: prompt }
        ], { ...options, jsonMode: true, temperature: 0.2, purpose: 'template_expansion' });
    }
}

module.exports = new GroqService();
