/**
 * FROSCEL INTERVIEW ROOM™ — Video AI Service
 * Live AI co-interviewer support for video interviews
 * 
 * Capabilities:
 *  - Follow-up question suggestions (private to recruiter)
 *  - Integrity signal analysis (green/yellow/red)
 *  - Contradiction detection across transcript
 *  - Structured competency-tagged note generation
 *  - Difficulty escalation recommendations
 *  - Post-interview summary generation
 *
 * Uses geminiService for AI calls (with OpenRouter fallback)
 */

const geminiService = require('./geminiService');

class VideoAIService {

    // ═══════════════════════════════════════════════════
    //  FOLLOW-UP QUESTION SUGGESTIONS
    //  Analyzes recent transcript + job context → suggests
    //  probing questions to the recruiter in real-time
    // ═══════════════════════════════════════════════════

    async generateFollowUpSuggestion(context) {
        const { transcript, jobTitle, jobSkills, evaluationCriteria, recentQuestion, recentAnswer } = context;

        // Build recent context (last 5 exchanges)
        const recentTranscript = (transcript || []).slice(-10).map(t =>
            `[${t.speakerRole || 'unknown'}] ${t.speakerName || ''}: ${t.text}`
        ).join('\n');

        const prompt = `You are an expert AI co-interviewer for a ${jobTitle || 'professional'} position.

ROLE: You assist the human interviewer by suggesting insightful follow-up questions.
These suggestions are PRIVATE — the candidate NEVER sees them.

JOB SKILLS REQUIRED: ${(jobSkills || []).join(', ') || 'General technical and soft skills'}
EVALUATION CRITERIA: ${(evaluationCriteria || []).map(c => c.name || c).join(', ') || 'Technical depth, problem-solving, communication'}

RECENT TRANSCRIPT:
${recentTranscript}

MOST RECENT Q&A:
Q: ${recentQuestion || 'N/A'}
A: ${recentAnswer || 'N/A'}

Generate exactly 1 follow-up question that:
1. Probes deeper into the candidate's answer
2. Tests practical application, not just theory
3. Reveals genuine experience vs rehearsed answers
4. Is conversational and natural

Also classify the suggestion type: "follow_up", "probe_depth", "scenario", "contradiction_check", "skill_verification"

Return JSON:
{
  "question": "Your suggested question here",
  "type": "follow_up",
  "rationale": "Brief reason why this question is valuable",
  "targetCompetency": "The skill or competency this targets"
}`;

        try {
            const result = await geminiService._callWithCacheAndRateLimit(
                'interview_questions', prompt, { skipCache: true }
            );

            if (!result) return this._getFallbackSuggestion(recentAnswer);

            const parsed = this._parseJSON(result);
            return parsed || this._getFallbackSuggestion(recentAnswer);
        } catch (error) {
            console.error('[VideoAI] Follow-up suggestion error:', error.message);
            return this._getFallbackSuggestion(recentAnswer);
        }
    }

    // ═══════════════════════════════════════════════════
    //  INTEGRITY SIGNAL ANALYSIS
    //  Analyzes behavioral signals → green/yellow/red
    // ═══════════════════════════════════════════════════

    async analyzeIntegritySignals(behaviorData) {
        const {
            tabSwitchCount = 0,
            focusLostCount = 0,
            longPauseDuration = 0,
            eyeContactScore = 100,
            audioInconsistencies = 0,
            suspiciousPatterns = [],
            transcriptLength = 0,
            interviewDuration = 0
        } = behaviorData;

        // Rule-based quick check first (fast, no AI call needed)
        const quickResult = this._quickIntegrityCheck(behaviorData);
        if (quickResult.level === 'red') return quickResult;

        // For borderline cases, get AI analysis
        if (quickResult.level === 'yellow' || suspiciousPatterns.length > 0) {
            const prompt = `Analyze this candidate's behavioral integrity signals during a live video interview.

BEHAVIORAL DATA:
- Tab switches: ${tabSwitchCount}
- Focus lost events: ${focusLostCount}
- Longest pause without speech: ${longPauseDuration}s
- Eye contact consistency: ${eyeContactScore}%
- Audio anomalies: ${audioInconsistencies}
- Interview duration so far: ${Math.round(interviewDuration / 60)} minutes
- Suspicious patterns flagged: ${suspiciousPatterns.join(', ') || 'None'}

Evaluate and return JSON:
{
  "level": "green" | "yellow" | "red",
  "confidence": 0.0-1.0,
  "reason": "Brief explanation",
  "details": "More context for the recruiter",
  "recommendation": "What the recruiter should do"
}

IMPORTANT: 
- "green" = Normal interview behavior, no concerns
- "yellow" = Minor concerns, recommend observation
- "red" = Strong indicators of dishonesty (reading from another screen, someone else answering, etc.)
- Be fair: some nervousness and pauses are normal
- Tab switches as low as 1 are OK (checking time, notifications)`;

            try {
                const result = await geminiService._callWithCacheAndRateLimit(
                    'answer_evaluation', prompt, { skipCache: true }
                );
                if (result) {
                    const parsed = this._parseJSON(result);
                    if (parsed) return parsed;
                }
            } catch (error) {
                console.error('[VideoAI] Integrity analysis error:', error.message);
            }
        }

        return quickResult;
    }

    // ═══════════════════════════════════════════════════
    //  CONTRADICTION DETECTION
    //  Scans transcript for inconsistencies in answers
    // ═══════════════════════════════════════════════════

    async detectContradictions(transcript) {
        if (!transcript || transcript.length < 6) return { found: false, contradictions: [] };

        const candidateResponses = transcript
            .filter(t => t.speakerRole === 'candidate')
            .map(t => t.text)
            .join('\n---\n');

        if (candidateResponses.length < 100) return { found: false, contradictions: [] };

        const prompt = `Analyze these candidate responses from a video interview for CONTRADICTIONS or INCONSISTENCIES.

CANDIDATE RESPONSES (chronological):
${candidateResponses.slice(0, 4000)}

Look for:
1. Conflicting claims about experience (e.g., "I led a team of 10" vs "I worked independently")
2. Timeline inconsistencies (e.g., dates that don't add up)
3. Skill level contradictions (claims expertise but can't answer basics)
4. Factual inconsistencies in stories

Return JSON:
{
  "found": true/false,
  "contradictions": [
    {
      "type": "experience" | "timeline" | "skill" | "factual",
      "statement1": "What they said earlier",
      "statement2": "What they said later that conflicts",
      "severity": "low" | "medium" | "high",
      "suggestedProbe": "A question to clarify this"
    }
  ]
}

IMPORTANT: Only flag genuine contradictions. Different phrasing of the same idea is NOT a contradiction. Be fair.`;

        try {
            const result = await geminiService._callWithCacheAndRateLimit(
                'answer_evaluation', prompt, { skipCache: true }
            );
            if (result) {
                const parsed = this._parseJSON(result);
                if (parsed) return parsed;
            }
        } catch (error) {
            console.error('[VideoAI] Contradiction detection error:', error.message);
        }

        return { found: false, contradictions: [] };
    }

    // ═══════════════════════════════════════════════════
    //  LIVE STRUCTURED NOTES
    //  Generates competency-tagged notes from transcript
    // ═══════════════════════════════════════════════════

    async generateLiveNotes(context) {
        const { transcript, jobTitle, jobSkills, evaluationCriteria } = context;

        if (!transcript || transcript.length < 4) return [];

        const recentTranscript = transcript.slice(-8).map(t =>
            `[${t.speakerRole}] ${t.speakerName}: ${t.text}`
        ).join('\n');

        const prompt = `Generate structured interview notes from this recent transcript segment.

POSITION: ${jobTitle || 'Professional'}
KEY SKILLS: ${(jobSkills || []).join(', ')}
CRITERIA: ${(evaluationCriteria || []).map(c => c.name || c).join(', ')}

RECENT TRANSCRIPT:
${recentTranscript}

Generate 1-3 concise observation notes. Return JSON array:
[
  {
    "content": "Key observation about the candidate",
    "competencyCategory": "technical" | "communication" | "problem_solving" | "leadership" | "cultural_fit",
    "sentiment": "positive" | "neutral" | "concern",
    "evidence": "Brief quote or reference from transcript"
  }
]

Keep notes brief, objective, and actionable.`;

        try {
            const result = await geminiService._callWithCacheAndRateLimit(
                'recruiter_reports', prompt, { skipCache: true }
            );
            if (result) {
                const parsed = this._parseJSON(result);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (error) {
            console.error('[VideoAI] Live notes error:', error.message);
        }

        return [];
    }

    // ═══════════════════════════════════════════════════
    //  DIFFICULTY ESCALATION
    //  Recommends harder questions when candidate excels
    // ═══════════════════════════════════════════════════

    async suggestDifficultyEscalation(performanceData) {
        const { currentDifficulty, correctAnswers, totalAnswers, strongAreas, weakAreas } = performanceData;

        const performanceRatio = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

        // Simple heuristic first
        if (performanceRatio < 0.5) {
            return {
                shouldEscalate: false,
                reason: 'Candidate is struggling, maintain or reduce difficulty',
                suggestedLevel: Math.max(1, (currentDifficulty || 3) - 1)
            };
        }

        if (performanceRatio > 0.8 && totalAnswers >= 3) {
            return {
                shouldEscalate: true,
                reason: 'Candidate is performing well, increase difficulty to find ceiling',
                suggestedLevel: Math.min(5, (currentDifficulty || 3) + 1),
                focusAreas: strongAreas || []
            };
        }

        return {
            shouldEscalate: false,
            reason: 'Maintaining current difficulty level',
            suggestedLevel: currentDifficulty || 3
        };
    }

    // ═══════════════════════════════════════════════════
    //  POST-INTERVIEW SUMMARY (Quick)
    //  Fast summary at end of interview for preview
    // ═══════════════════════════════════════════════════

    async generateQuickSummary(context) {
        const { transcript, jobTitle, duration, integritySignals, notes } = context;

        if (!transcript || transcript.length < 4) {
            return { summary: 'Insufficient transcript data for summary', keyPoints: [] };
        }

        const fullTranscript = transcript.map(t =>
            `[${t.speakerRole}] ${t.speakerName}: ${t.text}`
        ).join('\n');

        const prompt = `Generate a quick post-interview summary for the recruiter.

POSITION: ${jobTitle || 'Professional'}
DURATION: ${Math.round((duration || 0) / 60)} minutes
INTEGRITY STATUS: ${integritySignals?.length ? integritySignals[integritySignals.length - 1].level : 'green'}

TRANSCRIPT:
${fullTranscript.slice(0, 6000)}

RECRUITER NOTES DURING INTERVIEW:
${(notes || []).map(n => `- [${n.competencyCategory || 'general'}] ${n.content}`).join('\n') || 'No notes taken'}

Return JSON:
{
  "summary": "2-3 sentence overall assessment",
  "keyStrengths": ["strength 1", "strength 2"],
  "keyWeaknesses": ["concern 1"],
  "recommendedNextStep": "hire" | "second_round" | "reject" | "undecided",
  "confidenceLevel": "high" | "medium" | "low",
  "topCompetencies": [
    { "name": "competency", "score": 1-10, "evidence": "brief evidence" }
  ]
}`;

        try {
            const result = await geminiService._callWithCacheAndRateLimit(
                'recruiter_reports', prompt, {}
            );
            if (result) {
                const parsed = this._parseJSON(result);
                if (parsed) return parsed;
            }
        } catch (error) {
            console.error('[VideoAI] Quick summary error:', error.message);
        }

        return {
            summary: 'Unable to generate AI summary. Please review the transcript manually.',
            keyStrengths: [],
            keyWeaknesses: [],
            recommendedNextStep: 'undecided',
            confidenceLevel: 'low'
        };
    }

    // ═══════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════════════

    _quickIntegrityCheck(data) {
        const { tabSwitchCount = 0, focusLostCount = 0, longPauseDuration = 0 } = data;

        if (tabSwitchCount > 10 || focusLostCount > 8) {
            return {
                level: 'red',
                confidence: 0.85,
                reason: 'Excessive tab switching and focus loss detected',
                details: `${tabSwitchCount} tab switches, ${focusLostCount} focus losses`,
                recommendation: 'Ask the candidate directly about their setup and activity'
            };
        }

        if (tabSwitchCount > 4 || focusLostCount > 3 || longPauseDuration > 30) {
            return {
                level: 'yellow',
                confidence: 0.6,
                reason: 'Moderate behavioral anomalies detected',
                details: `${tabSwitchCount} tab switches, ${focusLostCount} focus losses, ` +
                    `longest pause: ${longPauseDuration}s`,
                recommendation: 'Monitor closely, consider asking about environment'
            };
        }

        return {
            level: 'green',
            confidence: 0.9,
            reason: 'Normal interview behavior',
            details: 'No significant anomalies detected',
            recommendation: 'Continue interview normally'
        };
    }

    _getFallbackSuggestion(recentAnswer) {
        const fallbacks = [
            { question: 'Can you walk me through a specific example of that?', type: 'probe_depth', rationale: 'Tests practical experience', targetCompetency: 'general' },
            { question: 'What was the most challenging aspect of that experience?', type: 'follow_up', rationale: 'Reveals problem-solving depth', targetCompetency: 'problem_solving' },
            { question: 'How would you approach this differently if given the chance?', type: 'scenario', rationale: 'Tests reflection and growth mindset', targetCompetency: 'self_awareness' },
            { question: 'Can you describe how that impacted the team or project outcome?', type: 'follow_up', rationale: 'Tests impact awareness', targetCompetency: 'leadership' }
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    _parseJSON(text) {
        if (!text) return null;
        try {
            // Try direct parse
            return JSON.parse(text);
        } catch {
            // Try extracting JSON from markdown blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                try { return JSON.parse(jsonMatch[1].trim()); } catch { }
            }
            // Try finding JSON object or array in text
            const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
            if (objMatch) {
                try { return JSON.parse(objMatch[1]); } catch { }
            }
            return null;
        }
    }
}

module.exports = new VideoAIService();
