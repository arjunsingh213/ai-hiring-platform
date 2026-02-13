/* ═══════════════════════════════════════════════════
   ATP REAL-TIME EVENT EMITTER
   WebSocket events for live ATP chart updates
   ═══════════════════════════════════════════════════ */

const { getIO } = require('../config/socket');

/**
 * Emit an ATP update event to a specific user's socket room.
 * The frontend listens for these events to refresh charts/scores
 * without requiring a full page reload.
 *
 * @param {string} userId - Target user's ID
 * @param {string} eventType - Type of update ('skill_update', 'domain_update', 'project_update', 'decay_applied')
 * @param {Object} data - Event payload
 */
function emitATPUpdate(userId, eventType, data = {}) {
    try {
        const io = getIO();
        io.to(userId).emit('atp_update', {
            type: eventType,
            timestamp: new Date().toISOString(),
            ...data
        });
        console.log(`[ATP-WS] Emitted ${eventType} to user ${userId}`);
    } catch (err) {
        // Socket may not be initialized yet — fail silently
        console.log(`[ATP-WS] Could not emit ${eventType}: ${err.message}`);
    }
}

/**
 * Emit a skill-level update (after interview/challenge).
 */
function emitSkillUpdate(userId, skillName, domain, updates) {
    emitATPUpdate(userId, 'skill_update', {
        skillName,
        domain,
        ...updates // { xp, level, score, confidence, riskIndex }
    });
}

/**
 * Emit a domain score recalculation event.
 */
function emitDomainUpdate(userId, domain, domainScore, riskAdjustedATP) {
    emitATPUpdate(userId, 'domain_update', {
        domain,
        domainScore,
        riskAdjustedATP
    });
}

/**
 * Emit a project verification update.
 */
function emitProjectUpdate(userId, projectId, status, atpImpactScore) {
    emitATPUpdate(userId, 'project_update', {
        projectId,
        status,
        atpImpactScore
    });
}

/**
 * Emit a cognitive metrics update after interview.
 */
function emitCognitiveUpdate(userId, cognitiveMetrics) {
    emitATPUpdate(userId, 'cognitive_update', {
        cognitiveMetrics
    });
}

/**
 * Emit a decay event (called from cron job).
 */
function emitDecayApplied(userId, decayedSkills) {
    emitATPUpdate(userId, 'decay_applied', {
        decayedSkills
    });
}

module.exports = {
    emitATPUpdate,
    emitSkillUpdate,
    emitDomainUpdate,
    emitProjectUpdate,
    emitCognitiveUpdate,
    emitDecayApplied
};
