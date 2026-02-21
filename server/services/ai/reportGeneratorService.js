/**
 * FROSCEL INTERVIEW ROOM™ — Report Generator Service
 * Generates comprehensive post-interview intelligence reports
 * 
 * Consolidates: transcript, notes, integrity signals, AI interventions
 * Produces: competency analysis, confidence scores, recommendations
 */

const geminiService = require('./geminiService');
const VideoRoom = require('../../models/VideoRoom');

class ReportGeneratorService {

    /**
     * Generate full post-interview report
     * Called when interview status changes to 'completed'
     */
    async generateReport(roomCode) {
        try {
            const room = await VideoRoom.findOne({ roomCode })
                .populate('candidateId', 'profile email jobSeekerProfile')
                .populate('jobId', 'title description skills requirements');

            if (!room) throw new Error('Room not found');

            const transcript = room.transcript || [];
            const notes = room.notes || [];
            const integritySignals = room.integritySignals || [];
            const job = room.jobId;
            const candidate = room.candidateId;

            // Build comprehensive prompt
            const fullTranscript = transcript.map(t =>
                `[${t.speakerRole}] ${t.speakerName}: ${t.text}`
            ).join('\n');

            const notesText = notes.map(n =>
                `[${n.competencyCategory || 'general'}] ${n.content}`
            ).join('\n');

            const integrityText = integritySignals.map(s =>
                `[${s.level}] ${s.reason} - ${s.details || ''}`
            ).join('\n');

            const duration = room.startedAt && room.endedAt
                ? Math.round((new Date(room.endedAt) - new Date(room.startedAt)) / 60000)
                : room.duration || 0;

            const prompt = `Generate a comprehensive post-interview intelligence report.

POSITION: ${job?.title || 'Unknown Position'}
JOB DESCRIPTION: ${(job?.description || '').slice(0, 1500)}
REQUIRED SKILLS: ${(job?.skills || []).join(', ')}

CANDIDATE: ${candidate?.profile?.name || 'Unknown'}
INTERVIEW DURATION: ${duration} minutes
INTERVIEW TYPE: ${room.interviewType || 'one_on_one'}

FULL TRANSCRIPT:
${fullTranscript.slice(0, 8000)}

RECRUITER NOTES:
${notesText || 'No notes recorded'}

INTEGRITY SIGNALS:
${integrityText || 'No signals recorded (all green)'}

Generate a detailed JSON report:
{
  "executiveSummary": "3-4 sentence overview",
  "overallScore": 0-100,
  "recommendation": "strong_hire" | "hire" | "maybe" | "no_hire",
  "confidenceLevel": "high" | "medium" | "low",
  
  "competencyScores": [
    {
      "competency": "Competency Name",
      "score": 0-100,
      "evidence": ["Key observation 1", "Key observation 2"],
      "strengths": ["strength"],
      "concerns": ["concern if any"]
    }
  ],

  "technicalAssessment": {
    "score": 0-100,
    "depth": "surface" | "moderate" | "deep" | "expert",
    "keyFindings": ["finding 1", "finding 2"],
    "skillsVerified": ["skill1", "skill2"],
    "skillGaps": ["gap1"]
  },

  "communicationAssessment": {
    "score": 0-100,
    "clarity": 0-100,
    "structuredThinking": 0-100,
    "notes": "Brief assessment"
  },

  "behavioralInsights": {
    "leadershipIndicators": ["indicator"],
    "teamworkEvidence": ["evidence"],
    "problemSolvingApproach": "Description",
    "culturalFitNotes": "Assessment"
  },

  "integrityAssessment": {
    "overallLevel": "green" | "yellow" | "red",
    "flagCount": 0,
    "summary": "Brief integrity assessment"
  },

  "keyQuotes": [
    {
      "quote": "Notable candidate quote",
      "context": "Why this is significant",
      "sentiment": "positive" | "neutral" | "concerning"
    }
  ],

  "followUpRecommendations": [
    "Recommended next step 1",
    "Recommended next step 2"
  ],

  "comparisonNotes": "How this candidate compares (general guidance)"
}

Be thorough but objective. Base scores on evidence from the transcript.`;

            const result = await geminiService._callWithCacheAndRateLimit(
                'recruiter_reports', prompt, {}
            );

            let report;
            if (result) {
                report = this._parseJSON(result);
            }

            if (!report) {
                report = this._generateFallbackReport(transcript, notes, integritySignals, duration);
            }

            // Save to room
            room.postInterviewReport = {
                generatedAt: new Date(),
                summary: report.executiveSummary || report.summary,
                overallScore: report.overallScore || 50,
                recommendation: report.recommendation || 'maybe',
                competencyScores: report.competencyScores || [],
                technicalAssessment: report.technicalAssessment || {},
                communicationAssessment: report.communicationAssessment || {},
                behavioralInsights: report.behavioralInsights || {},
                integrityAssessment: report.integrityAssessment || {},
                keyQuotes: report.keyQuotes || [],
                followUpRecommendations: report.followUpRecommendations || [],
                rawReport: report
            };

            room.addAuditEntry('report_generated', 'system', 'system', {
                overallScore: report.overallScore,
                recommendation: report.recommendation
            });

            await room.save();

            return report;
        } catch (error) {
            console.error('[ReportGenerator] Error generating report:', error.message);
            throw error;
        }
    }

    /**
     * Validate/update report with recruiter feedback
     */
    async validateReport(roomCode, recruiterId, validation) {
        try {
            const room = await VideoRoom.findOne({ roomCode });
            if (!room) throw new Error('Room not found');

            room.recruiterValidation = {
                validatedBy: recruiterId,
                validatedAt: new Date(),
                decision: validation.decision, // 'accepted', 'edited', 'rejected'
                overrideScore: validation.overrideScore,
                overrideRecommendation: validation.overrideRecommendation,
                recruiterComments: validation.comments,
                competencyOverrides: validation.competencyOverrides || []
            };

            room.addAuditEntry('report_validated', recruiterId, 'recruiter', {
                decision: validation.decision,
                overrideScore: validation.overrideScore
            });

            await room.save();
            return room.recruiterValidation;
        } catch (error) {
            console.error('[ReportGenerator] Validation error:', error.message);
            throw error;
        }
    }

    _generateFallbackReport(transcript, notes, integritySignals, duration) {
        const candidateResponses = transcript.filter(t => t.speakerRole === 'candidate').length;
        const hasRedFlags = integritySignals.some(s => s.level === 'red');
        const hasYellowFlags = integritySignals.some(s => s.level === 'yellow');

        return {
            executiveSummary: `Interview lasted ${duration} minutes with ${candidateResponses} candidate responses. AI analysis was unavailable — manual review recommended.`,
            overallScore: 50,
            recommendation: 'maybe',
            confidenceLevel: 'low',
            competencyScores: [],
            technicalAssessment: { score: 50, depth: 'moderate', keyFindings: ['Manual review required'], skillsVerified: [], skillGaps: [] },
            communicationAssessment: { score: 50, clarity: 50, structuredThinking: 50, notes: 'AI assessment unavailable' },
            behavioralInsights: {},
            integrityAssessment: {
                overallLevel: hasRedFlags ? 'red' : hasYellowFlags ? 'yellow' : 'green',
                flagCount: integritySignals.filter(s => s.level !== 'green').length,
                summary: hasRedFlags ? 'Integrity concerns detected' : 'No major integrity issues'
            },
            keyQuotes: [],
            followUpRecommendations: ['Review transcript manually', 'Consider scheduling follow-up']
        };
    }

    _parseJSON(text) {
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch {
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                try { return JSON.parse(jsonMatch[1].trim()); } catch { }
            }
            const objMatch = text.match(/(\{[\s\S]*\})/);
            if (objMatch) {
                try { return JSON.parse(objMatch[1]); } catch { }
            }
            return null;
        }
    }
}

module.exports = new ReportGeneratorService();
