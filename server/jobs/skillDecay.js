/* ═══════════════════════════════════════════════════
   SKILL DECAY CRON JOB
   Runs daily at 2 AM — applies decay to skills
   that haven't been assessed in 90+ days
   ═══════════════════════════════════════════════════ */
const cron = require('node-cron');
const User = require('../models/User');

const DECAY_THRESHOLD_DAYS = 90;
const DECAY_RATE = 0.95;       // 5% decay per run for stale skills
const MIN_CONFIDENCE = 10;     // Confidence floor
const MIN_RECENCY = 5;         // Recency floor

/**
 * Apply skill decay to all users with stale skills.
 * Reduces confidence and recency for skills not assessed within
 * DECAY_THRESHOLD_DAYS. Logs decay events to interviewSkillHistory.
 */
async function runSkillDecay() {
    const startTime = Date.now();
    console.log('[SkillDecay] Starting skill decay job...');

    try {
        const cutoffDate = new Date(Date.now() - DECAY_THRESHOLD_DAYS * 86400000);

        // Find users with domainScores that have stale skills
        const users = await User.find({
            'aiTalentPassport.domainScores': { $exists: true, $ne: [] }
        }).select('aiTalentPassport profile.name');

        let usersAffected = 0;
        let skillsDecayed = 0;

        for (const user of users) {
            if (!user.aiTalentPassport?.domainScores) continue;

            let userModified = false;

            for (const domain of user.aiTalentPassport.domainScores) {
                if (!domain.skills || domain.skills.length === 0) continue;

                for (const skill of domain.skills) {
                    const lastAssessed = skill.lastAssessedAt ? new Date(skill.lastAssessedAt) : null;

                    // Skip if recently assessed or never assessed
                    if (!lastAssessed || lastAssessed > cutoffDate) continue;

                    // Calculate days since last assessment
                    const daysSinceAssessed = Math.floor(
                        (Date.now() - lastAssessed.getTime()) / 86400000
                    );

                    // Progressive decay — worse the longer stale
                    const decayFactor = daysSinceAssessed > 180
                        ? DECAY_RATE * 0.9  // 10% base decay for very stale (180+ days)
                        : DECAY_RATE;       // 5% base decay for 90-180 days

                    const prevConfidence = skill.confidence || 0;
                    const prevRecency = skill.recencyScore || 0;

                    // Apply decay with floors
                    skill.confidence = Math.max(MIN_CONFIDENCE,
                        Math.round((skill.confidence || 0) * decayFactor)
                    );
                    skill.recencyScore = Math.max(MIN_RECENCY,
                        Math.round((skill.recencyScore || 100) * decayFactor)
                    );

                    // Recalculate skill score with decayed confidence
                    const rawScore = Math.round(
                        (skill.challengePerformance || 0) * 0.4 +
                        (skill.interviewPerformance || 0) * 0.5 +
                        (skill.projectValidation || 0) * 0.1
                    );
                    // Apply recency penalty to score
                    skill.score = Math.round(rawScore * (skill.recencyScore / 100));

                    // Log decay event
                    if (!user.aiTalentPassport.interviewSkillHistory) {
                        user.aiTalentPassport.interviewSkillHistory = [];
                    }
                    user.aiTalentPassport.interviewSkillHistory.push({
                        source: 'decay',
                        skillName: skill.skillName,
                        domain: domain.domain,
                        xpDelta: 0,
                        scoreDelta: skill.score - rawScore,
                        detail: `Decay applied: ${daysSinceAssessed} days stale. Confidence ${prevConfidence}→${skill.confidence}, Recency ${prevRecency}→${skill.recencyScore}`,
                        timestamp: new Date()
                    });

                    skillsDecayed++;
                    userModified = true;
                }

                // Recalculate domain score after decay
                if (domain.skills.length > 0) {
                    domain.domainScore = Math.round(
                        domain.skills.reduce((sum, s) => sum + (s.score || 0), 0) /
                        domain.skills.length
                    );
                    const avgRisk = domain.skills.reduce((sum, s) => sum + (s.riskIndex || 0), 0) /
                        domain.skills.length;
                    domain.riskAdjustedATP = Math.round(domain.domainScore * (1 - avgRisk / 100));
                    domain.domainStabilityIndex = Math.round(100 - avgRisk);
                    // Market readiness drops with stale skills
                    const avgRecency = domain.skills.reduce((sum, s) => sum + (s.recencyScore || 0), 0) /
                        domain.skills.length;
                    domain.marketReadinessScore = Math.round(domain.domainScore * (avgRecency / 100));
                }
                domain.lastUpdated = new Date();
            }

            if (userModified) {
                user.aiTalentPassport.lastUpdated = new Date();
                await user.save();
                usersAffected++;
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[SkillDecay] Complete in ${elapsed}ms — ${usersAffected} users, ${skillsDecayed} skills decayed`);

        return { usersAffected, skillsDecayed, elapsed };
    } catch (err) {
        console.error('[SkillDecay] Error:', err.message);
        return { error: err.message };
    }
}

/**
 * Schedule the cron job — runs daily at 2:00 AM server time
 */
function scheduleSkillDecay() {
    cron.schedule('0 2 * * *', async () => {
        console.log('[SkillDecay] Cron triggered at', new Date().toISOString());
        await runSkillDecay();
    }, {
        timezone: 'Asia/Kolkata'
    });
    console.log('[SkillDecay] Cron job scheduled — daily at 2:00 AM IST');
}

module.exports = { runSkillDecay, scheduleSkillDecay };
