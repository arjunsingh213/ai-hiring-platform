const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const ChallengeAttempt = require('../models/ChallengeAttempt');
const ChallengeRiskLog = require('../models/ChallengeRiskLog');
const AdminChallengeAction = require('../models/AdminChallengeAction');
const User = require('../models/User');

// ===== GET /api/admin/challenges/stats — Dashboard summary =====
router.get('/stats', async (req, res) => {
    try {
        const [
            totalActive, totalSuspended, totalCustom, totalDomain,
            flaggedAttempts, highRiskAttempts, totalAttempts
        ] = await Promise.all([
            Challenge.countDocuments({ status: 'active' }),
            Challenge.countDocuments({ status: 'suspended' }),
            Challenge.countDocuments({ challengeType: 'custom', status: 'active' }),
            Challenge.countDocuments({ challengeType: 'domain', status: 'active' }),
            ChallengeRiskLog.countDocuments({ adminReviewed: false }),
            ChallengeAttempt.countDocuments({ riskLevel: { $in: ['high', 'critical'] } }),
            ChallengeAttempt.countDocuments({ status: 'completed' })
        ]);

        // Top domains
        const topDomains = await Challenge.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$domain', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Most flagged challenges
        const mostFlagged = await ChallengeRiskLog.aggregate([
            { $group: { _id: '$challengeId', flagCount: { $sum: 1 } } },
            { $sort: { flagCount: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'challenges', localField: '_id', foreignField: '_id', as: 'challenge' } },
            { $unwind: { path: '$challenge', preserveNullAndEmptyArrays: true } },
            { $project: { challengeId: '$_id', flagCount: 1, title: '$challenge.title', domain: '$challenge.domain' } }
        ]);

        res.json({
            success: true,
            data: {
                totalActive,
                totalSuspended,
                totalCustom,
                totalDomain,
                flaggedAttempts,
                highRiskAttempts,
                totalAttempts,
                topDomains,
                mostFlagged
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET /api/admin/challenges — All challenges with stats =====
router.get('/', async (req, res) => {
    try {
        const { status, domain, challengeType, search, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (domain) query.domain = domain;
        if (challengeType) query.challengeType = challengeType;
        if (search) query.title = { $regex: search, $options: 'i' };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [challenges, total] = await Promise.all([
            Challenge.find(query)
                .populate('creatorId', 'profile.name profile.photo email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Challenge.countDocuments(query)
        ]);

        res.json({ success: true, data: challenges, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET /api/admin/challenges/flagged — Flagged attempts needing review =====
router.get('/flagged', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            ChallengeRiskLog.find({ adminReviewed: false })
                .populate({ path: 'attemptId', select: 'finalScore riskScore riskLevel antiCheatLog aiDetection timeSpent status' })
                .populate({ path: 'challengeId', select: 'title domain difficulty' })
                .populate({ path: 'userId', select: 'profile.name profile.photo email' })
                .sort({ riskScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            ChallengeRiskLog.countDocuments({ adminReviewed: false })
        ]);

        res.json({ success: true, data: logs, total });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET /api/admin/challenges/:id — Detailed challenge view =====
router.get('/:id', async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id)
            .populate('creatorId', 'profile.name profile.photo email')
            .lean();

        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });

        const [attempts, riskLogs, adminActions] = await Promise.all([
            ChallengeAttempt.find({ challengeId: req.params.id })
                .populate('userId', 'profile.name profile.photo email')
                .sort({ createdAt: -1 })
                .limit(50)
                .lean(),
            ChallengeRiskLog.find({ challengeId: req.params.id })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
            AdminChallengeAction.find({ challengeId: req.params.id })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean()
        ]);

        res.json({ success: true, data: { ...challenge, attempts, riskLogs, adminActions } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== PUT /api/admin/challenges/:id — Edit challenge =====
router.put('/:id', async (req, res) => {
    try {
        const { adminId, domain, difficulty, atpWeight, status, notes } = req.body;
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });

        const previousValues = {};
        const newValues = {};

        if (domain && domain !== challenge.domain) {
            previousValues.domain = challenge.domain;
            newValues.domain = domain;
            challenge.domain = domain;
            challenge.adminOverrides.domainCorrected = true;
        }
        if (difficulty && difficulty !== challenge.difficulty) {
            previousValues.difficulty = challenge.difficulty;
            newValues.difficulty = difficulty;
            challenge.difficulty = difficulty;
            challenge.adminOverrides.difficultyAdjusted = true;
        }
        if (atpWeight !== undefined) {
            previousValues.atpMaxContribution = challenge.atpImpact.maxContribution;
            newValues.atpMaxContribution = atpWeight;
            challenge.atpImpact.maxContribution = atpWeight;
            challenge.adminOverrides.atpWeightAdjusted = true;
        }
        if (status) {
            previousValues.status = challenge.status;
            newValues.status = status;
            challenge.status = status;
        }

        challenge.adminOverrides.lastModifiedBy = adminId;
        challenge.adminOverrides.lastModifiedAt = new Date();
        if (notes) challenge.adminOverrides.notes = notes;

        await challenge.save();

        // Log action
        await AdminChallengeAction.create({
            adminId,
            challengeId: challenge._id,
            action: 'edit_challenge',
            previousValues,
            newValues,
            reason: notes || 'Admin edit',
            ip: req.ip
        });

        res.json({ success: true, data: challenge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST /api/admin/challenges/:id/suspend — Suspend challenge =====
router.post('/:id/suspend', async (req, res) => {
    try {
        const { adminId, reason } = req.body;
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });

        const prev = challenge.status;
        challenge.status = 'suspended';
        challenge.adminOverrides.lastModifiedBy = adminId;
        challenge.adminOverrides.lastModifiedAt = new Date();
        challenge.adminOverrides.notes = reason;
        await challenge.save();

        await AdminChallengeAction.create({
            adminId, challengeId: challenge._id,
            action: 'suspend_challenge',
            previousValues: { status: prev }, newValues: { status: 'suspended' },
            reason, ip: req.ip
        });

        res.json({ success: true, data: challenge });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== DELETE /api/admin/challenges/:id — Delete challenge =====
router.delete('/:id', async (req, res) => {
    try {
        const { adminId, reason } = req.body;
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });

        challenge.status = 'deleted';
        await challenge.save();

        await AdminChallengeAction.create({
            adminId, challengeId: challenge._id,
            action: 'delete_challenge',
            previousValues: { status: 'active' }, newValues: { status: 'deleted' },
            reason: reason || 'Admin deletion', ip: req.ip
        });

        res.json({ success: true, message: 'Challenge deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST /api/admin/challenges/attempts/:id/review — Review flagged attempt =====
router.post('/attempts/:id/review', async (req, res) => {
    try {
        const { adminId, action, notes } = req.body;
        const riskLog = await ChallengeRiskLog.findById(req.params.id);
        if (!riskLog) return res.status(404).json({ success: false, error: 'Risk log not found' });

        riskLog.adminReviewed = true;
        riskLog.reviewedBy = adminId;
        riskLog.reviewedAt = new Date();
        riskLog.adminAction = action;
        riskLog.adminNotes = notes;
        riskLog.resolvedAt = new Date();
        await riskLog.save();

        // Update attempt status
        const attempt = await ChallengeAttempt.findById(riskLog.attemptId);
        if (attempt) {
            if (action === 'approved') {
                attempt.status = 'reviewed';
                attempt.atpApplied = true;
                attempt.atpHeldForReview = false;
                await attempt.save();

                // Apply held ATP
                if (attempt.atpImpactScore > 0) {
                    await User.findByIdAndUpdate(attempt.userId, {
                        $inc: { 'aiTalentPassport.problemSolvingScore': attempt.atpImpactScore },
                        $set: { 'aiTalentPassport.lastUpdated': new Date() }
                    });
                }
            } else if (action === 'rejected') {
                attempt.status = 'reviewed';
                attempt.atpApplied = false;
                attempt.atpImpactScore = 0;
                await attempt.save();
            }
        }

        await AdminChallengeAction.create({
            adminId, challengeId: riskLog.challengeId, attemptId: riskLog.attemptId,
            targetUserId: riskLog.userId,
            action: 'review_attempt',
            newValues: { action, notes },
            reason: notes, ip: req.ip
        });

        res.json({ success: true, message: 'Attempt reviewed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST /api/admin/challenges/attempts/:id/reset-atp — Reset ATP impact =====
router.post('/attempts/:id/reset-atp', async (req, res) => {
    try {
        const { adminId, reason } = req.body;
        const attempt = await ChallengeAttempt.findById(req.params.id);
        if (!attempt) return res.status(404).json({ success: false, error: 'Attempt not found' });

        const prevScore = attempt.atpImpactScore;

        // Reverse the ATP
        if (attempt.atpApplied && prevScore > 0) {
            await User.findByIdAndUpdate(attempt.userId, {
                $inc: { 'aiTalentPassport.problemSolvingScore': -prevScore },
                $set: { 'aiTalentPassport.lastUpdated': new Date() }
            });
        }

        attempt.atpApplied = false;
        attempt.atpImpactScore = 0;
        await attempt.save();

        await AdminChallengeAction.create({
            adminId, attemptId: attempt._id, challengeId: attempt.challengeId,
            targetUserId: attempt.userId,
            action: 'reset_atp',
            previousValues: { atpImpactScore: prevScore },
            newValues: { atpImpactScore: 0 },
            reason, ip: req.ip
        });

        res.json({ success: true, message: 'ATP impact reset' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== POST /api/admin/challenges/users/:id/ban — Ban abusive creator =====
router.post('/users/:id/ban', async (req, res) => {
    try {
        const { adminId, reason } = req.body;

        // Suspend all challenges by this user
        await Challenge.updateMany(
            { creatorId: req.params.id, status: 'active' },
            { $set: { status: 'suspended', 'adminOverrides.notes': `Creator banned: ${reason}` } }
        );

        // Mark user as repeat offender
        await User.findByIdAndUpdate(req.params.id, {
            $set: {
                'accountStatus.isSuspended': true,
                'accountStatus.suspendedAt': new Date(),
                'accountStatus.suspendedBy': adminId,
                'accountStatus.suspensionReason': reason,
                'accountStatus.isRepeatOffender': true,
                'accountStatus.offenderMarkedAt': new Date(),
                'accountStatus.offenderNotes': `Banned from challenges: ${reason}`
            }
        });

        await AdminChallengeAction.create({
            adminId, targetUserId: req.params.id,
            action: 'ban_creator',
            reason, ip: req.ip
        });

        res.json({ success: true, message: 'Creator banned and all challenges suspended' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ======================= SKILLNODE ADMIN ENDPOINTS =======================

const SkillNode = require('../models/SkillNode');

// ===== GET /api/admin/challenges/skillnodes/stats — SkillNode dashboard summary =====
router.get('/skillnodes/stats', async (req, res) => {
    try {
        const [totalSkillNodes, totalUsers] = await Promise.all([
            SkillNode.countDocuments(),
            SkillNode.distinct('userId').then(ids => ids.length)
        ]);

        // Level distribution
        const levelDistribution = await SkillNode.aggregate([
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Average XP
        const avgXpResult = await SkillNode.aggregate([
            { $group: { _id: null, avgXp: { $avg: '$xp' }, totalXp: { $sum: '$xp' } } }
        ]);
        const avgXp = Math.round(avgXpResult[0]?.avgXp || 0);
        const totalXp = avgXpResult[0]?.totalXp || 0;

        // Top skills by user count
        const topSkills = await SkillNode.aggregate([
            { $group: { _id: '$skillNameNormalized', displayName: { $first: '$skillName' }, count: { $sum: 1 }, avgXp: { $avg: '$xp' }, avgLevel: { $avg: '$level' } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { skill: '$displayName', count: 1, avgXp: { $round: ['$avgXp', 0] }, avgLevel: { $round: ['$avgLevel', 1] } } }
        ]);

        // Top domains
        const topDomains = await SkillNode.aggregate([
            { $group: { _id: '$domainCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);

        // High-risk nodes (riskScore > 50)
        const highRiskCount = await SkillNode.countDocuments({ riskScore: { $gt: 50 } });

        // Expert-verified count (level 4)
        const expertCount = await SkillNode.countDocuments({ level: 4 });

        // Recent activity (last 24h)
        const recentActivity = await SkillNode.countDocuments({
            updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        res.json({
            success: true, data: {
                totalSkillNodes, totalUsers, avgXp, totalXp,
                levelDistribution, topSkills, topDomains,
                highRiskCount, expertCount, recentActivity
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GET /api/admin/challenges/skillnodes — Paginated SkillNode listing =====
router.get('/skillnodes', async (req, res) => {
    try {
        const { search, domain, level, riskMin, page = 1, limit = 30 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { skillName: { $regex: search, $options: 'i' } },
                { skillNameNormalized: { $regex: search.toLowerCase(), $options: 'i' } }
            ];
        }
        if (domain) query.domainCategory = domain;
        if (level !== undefined && level !== '') query.level = parseInt(level);
        if (riskMin) query.riskScore = { $gte: parseInt(riskMin) };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [nodes, total] = await Promise.all([
            SkillNode.find(query)
                .populate('userId', 'profile.name profile.photo email')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            SkillNode.countDocuments(query)
        ]);

        res.json({
            success: true, data: nodes, total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== PUT /api/admin/challenges/skillnodes/:id — Admin adjust SkillNode =====
router.put('/skillnodes/:id', async (req, res) => {
    try {
        const { adminId, xpAdjustment, levelOverride, riskOverride, reason } = req.body;
        const node = await SkillNode.findById(req.params.id);
        if (!node) return res.status(404).json({ success: false, error: 'SkillNode not found' });

        const previousValues = { xp: node.xp, level: node.level, riskScore: node.riskScore };

        if (xpAdjustment !== undefined) {
            node.xp = Math.max(0, node.xp + parseInt(xpAdjustment));
            node.xpHistory.push({
                amount: parseInt(xpAdjustment),
                reason: `Admin adjustment: ${reason || 'No reason provided'}`,
                timestamp: new Date()
            });
        }
        if (levelOverride !== undefined) {
            node.level = Math.max(0, Math.min(4, parseInt(levelOverride)));
            node.highestLevelCompleted = Math.max(node.highestLevelCompleted, node.level);
        }
        if (riskOverride !== undefined) {
            node.riskScore = Math.max(0, Math.min(100, parseInt(riskOverride)));
        }

        await node.save();

        // Log admin action
        await AdminChallengeAction.create({
            adminId, targetUserId: node.userId,
            action: 'adjust_skillnode',
            previousValues,
            newValues: { xp: node.xp, level: node.level, riskScore: node.riskScore },
            reason: reason || 'Admin SkillNode adjustment',
            ip: req.ip
        });

        res.json({ success: true, data: node });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

