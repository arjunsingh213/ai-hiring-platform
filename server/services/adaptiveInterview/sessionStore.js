const sessions = new Map();

class SessionStore {
    /**
     * Create a new in-memory session
     * @param {string} socketId - The active socket ID
     * @param {Object} data - Initial session data
     */
    static createSession(socketId, data) {
        const defaultState = {
            interviewId: data.interviewId || null,
            candidateId: data.candidateId || null,
            jobId: data.jobId || null,
            jobSkills: data.jobSkills || [],
            currentSkill: data.jobSkills?.[0] || null,
            skillCoverageMap: {}, // Track questions asked per skill
            depthMap: {}, // Track depth level reached per skill (basic/intermediate/advanced)
            testedSubskills: [],
            transcriptBuffer: [], // Entire interview transcript so far
            audioChunks: [], // Raw audio chunks for transcription
            strategy: 'initial', // drill_concept, scenario_based, escalate, switch_skill
            weaknesses: [],
            strengths: [],
            turnCount: 0,
            consecutiveFailures: 0,
            isProcessing: false, // Lock to prevent concurrent triggers
            maxTurns: data.maxTurns || 15
        };

        const session = { ...defaultState, ...data };

        // Initialize maps
        session.jobSkills.forEach(skill => {
            if (!session.skillCoverageMap[skill]) session.skillCoverageMap[skill] = 0;
            if (!session.depthMap[skill]) session.depthMap[skill] = 'basic';
        });

        sessions.set(socketId, session);
        return session;
    }

    static getSession(socketId) {
        return sessions.get(socketId);
    }

    static updateSession(socketId, updates) {
        const session = sessions.get(socketId);
        if (session) {
            Object.assign(session, updates);
            return session;
        }
        return null;
    }

    static deleteSession(socketId) {
        sessions.delete(socketId);
    }
}

module.exports = SessionStore;
