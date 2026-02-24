const express = require('express');
const router = express.Router();
const openRouterService = require('../services/ai/openRouterService');
const groqService = require('../services/ai/groqService');
const { userAuth, requireRole } = require('../middleware/userAuth');

// Helper to keep conversational history clean
const buildChatContext = (messages, currentDraft) => {
    let systemPrompt = 'You are an expert AI recruiting assistant helping a hiring manager craft a job posting. Keep responses extremely concise. Ask ONLY ONE focused question at a time to uncover missing details like role title, seniority, responsibilities, compensation (salary range), qualifications (education/certifications), or skills. Try to infer seniority from the responsibilities if not explicitly stated. Do not ask for details already present in the current draft.';

    if (currentDraft && currentDraft !== 'null' && currentDraft !== 'Hello.') {
        systemPrompt += `\n\nCurrent Draft Details (DO NOT ask about these again):\n${currentDraft}`;
    }

    return [
        { role: 'system', content: systemPrompt },
        ...messages
    ];
};

// 1. Conversational Chat
router.post('/chat', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { messages, currentDraft } = req.body;
        const context = buildChatContext(messages || [], currentDraft);

        let responseText;
        try {
            // Try OpenRouter first (fast interactive)
            responseText = await openRouterService.callModel(
                'arcee-ai/trinity-large-preview:free',
                context,
                openRouterService.apiKeys.llama,
                { temperature: 0.7, maxTokens: 500, purpose: 'job_builder_chat' }
            );
        } catch (orError) {
            console.warn('OpenRouter failed for chat (error):', orError.message);
        }

        // Fallback to Groq if OpenRouter failed OR returned a blank response
        if (!responseText) {
            console.log('[JobBuilder] OpenRouter returned blank or failed, falling back to Groq...');
            try {
                responseText = await groqService.callModel(
                    context,
                    { temperature: 0.7, maxTokens: 500, purpose: 'job_builder_chat' }
                );
            } catch (groqError) {
                console.error('[JobBuilder] Groq also failed:', groqError.message);
            }
        }

        if (!responseText) {
            console.error('[JobBuilder] CRITICAL: Both AI services returned blank responses!');
            return res.json({ reply: "I'm sorry, my AI engine didn't return a response. Could you rephrase that?" });
        }
        res.json({ reply: responseText });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat' });
    }
});

// 2. AI Parsing of pasted JD
router.post('/parse', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { text } = req.body;
        const prompt = `Extract quick signals from this raw job description text.
Text: ${text.substring(0, 3000)}

Return ONLY structured JSON:
{
"role_title": "Title if found",
"extracted_skills": ["Skill 1", "Skill 2"],
"responsibilities": ["Resp 1"],
"qualifications": ["Qualification 1"],
"compensation_raw": "e.g. $120k - $150k",
"inferred_seniority": "Junior|Mid|Senior|Lead",
"parsing_confidence": 0-100
}`;
        const context = [{ role: 'user', content: prompt }];

        let responseText;
        try {
            responseText = await openRouterService.callModel(
                'arcee-ai/trinity-large-preview:free',
                context,
                openRouterService.apiKeys.llama,
                { temperature: 0.2, maxTokens: 1000, purpose: 'job_builder_parse' }
            );
        } catch (orError) {
            console.warn('OpenRouter failed for parse (error):', orError.message);
        }

        if (!responseText) {
            console.log('[JobBuilder] OpenRouter parse returned blank or failed, falling back to Groq...');
            try {
                responseText = await groqService.callModel(
                    context,
                    { temperature: 0.2, maxTokens: 1000, purpose: 'job_builder_parse' }
                );
            } catch (groqError) {
                console.error('[JobBuilder] Groq parse also failed:', groqError.message);
            }
        }

        let parsed = openRouterService.cleanAIGeneratedJson(responseText);
        res.json({ parsed });
    } catch (error) {
        console.error('Parse error:', error);
        res.status(500).json({ error: 'Failed to parse text' });
    }
});

// 3. Smart Role Templates & Groq Full Generation
router.post('/generate-full', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { context, templateName } = req.body;

        let draft;
        if (templateName) {
            draft = await groqService.expandRoleTemplate(templateName, context, { userId: req.user._id });
        } else {
            draft = await groqService.generateFullJobDraft(context, { userId: req.user._id });
        }

        res.json({ draft });
    } catch (error) {
        console.error('Generate full error:', error);
        res.status(500).json({ error: 'Failed to generate full draft' });
    }
});

// 4. Skill Intelligence
router.post('/skills', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { skill } = req.body;
        const prompt = `Suggest 4 highly related technical/soft skills for "${skill}".
Return ONLY a JSON array of strings: ["Skill A", "Skill B"]`;

        const context = [{ role: 'user', content: prompt }];

        let responseText;
        try {
            responseText = await openRouterService.callModel(
                'arcee-ai/trinity-large-preview:free',
                context,
                openRouterService.apiKeys.llama,
                { temperature: 0.3, maxTokens: 200, purpose: 'job_builder_skills' }
            );
        } catch (orError) {
            console.warn('OpenRouter failed for skills (error):', orError.message);
        }

        if (!responseText) {
            console.log('[JobBuilder] OpenRouter skills returned blank or failed, falling back to Groq...');
            try {
                responseText = await groqService.callModel(
                    context,
                    { temperature: 0.3, maxTokens: 200, purpose: 'job_builder_skills' }
                );
            } catch (groqError) {
                console.error('[JobBuilder] Groq skills also failed:', groqError.message);
            }
        }

        let suggestions = openRouterService.cleanAIGeneratedJson(responseText);
        res.json({ suggestions });
    } catch (error) {
        console.error('Skill error:', error);
        // Silently fail and return empty array for suggestions
        res.json({ suggestions: [] });
    }
});

module.exports = router;
