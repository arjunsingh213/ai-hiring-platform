const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const ChallengeAttempt = require('../models/ChallengeAttempt');
const Post = require('../models/Post');
const User = require('../models/User');
const SkillNode = require('../models/SkillNode'); // Required for skill challenges
const challengeEvaluator = require('../utils/challengeEvaluator'); // AI generation

// ===== GET /api/challenges — All active challenges (Community) =====
router.get('/', async (req, res) => {
    try {
        const { domain, challengeType, status } = req.query;

        let query = { status: status || 'active' };

        // Filter by Domain
        if (domain) query.domain = domain;

        // Filter by Type (Custom vs Domain/System)
        if (challengeType) {
            query.challengeType = challengeType;
        } else {
            // Default: Hide domain challenges if not explicitly requested
            // (Domain challenges are usually personalized and fetched via /domain endpoint)
            query.challengeType = { $ne: 'domain' };
        }

        const challenges = await Challenge.find(query)
            .sort({ createdAt: -1 })
            .populate('creatorId', 'firstName lastName headline avatar')
            .limit(50); // Pagination could be added

        res.json({
            success: true,
            data: challenges
        });
    } catch (err) {
        console.error('Error fetching challenges:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== GET /api/challenges/domain — Skill Ladders & Domain Challenges =====
router.get('/domain', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

        // 1. Fetch User Skills
        const skillNodes = await SkillNode.find({ userId }).sort({ xp: -1 });

        if (!skillNodes || skillNodes.length === 0) {
            return res.json({
                success: true,
                data: [],
                skillLadders: [],
                message: "No skills found. Upload a resume to get started."
            });
        }

        // 2. Build Skill Ladders
        const skillLadders = await Promise.all(skillNodes.map(async (node) => {
            const levels = [];

            // For each level 1-4
            for (let i = 1; i <= 4; i++) {
                let status = 'locked';
                let challenge = null;

                // Determine Status
                if (i <= node.highestLevelCompleted) {
                    status = 'completed';
                } else if (i === (node.highestLevelCompleted || 0) + 1) {
                    status = 'unlocked';
                }

                // If unlocked or completed, find the challenge
                if (status === 'unlocked' || status === 'completed') {
                    // Try to find an EXISTING active challenge for this user/skill/level
                    // FIX: Removed .select restriction to ensure questions are returned
                    challenge = await Challenge.findOne({
                        challengeType: 'domain',
                        targetSkill: node.skillName,
                        skillNodeLevel: i,
                        assignedTo: userId,
                        status: 'active'
                    });

                    // If no active challenge found and it's invalid 'unlocked' state, 
                    // client will show 'Generate' button.
                    if (!challenge && status === 'unlocked') {
                        status = 'generate';
                    }
                }

                levels.push({
                    level: i,
                    status,
                    challenge
                });
            }

            return {
                skillNode: node,
                levels,
                mastered: node.level >= 4
            };
        }));

        res.json({
            success: true,
            skillLadders,
            message: "Skill ladders loaded"
        });

    } catch (err) {
        console.error('Error fetching domain challenges:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== GET /api/challenges/history — User's Attempt History =====
router.get('/history', async (req, res) => {
    try {
        const { userId, limit = 50 } = req.query;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

        const attempts = await ChallengeAttempt.find({ userId, status: 'completed' })
            .sort({ completedAt: -1 })
            .limit(parseInt(limit))
            .populate('challengeId', 'title domain difficulty rewardPoints');

        res.json({
            success: true,
            data: attempts
        });
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== GET /api/challenges/history/stats — Summary Stats =====
router.get('/history/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

        const attempts = await ChallengeAttempt.find({ userId, status: 'completed' })
            .populate('challengeId', 'domain');

        const totalCompleted = attempts.length;
        const avgScore = totalCompleted > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a.finalScore || 0), 0) / totalCompleted)
            : 0;
        const totalATPEarned = attempts.reduce((sum, a) => sum + (a.atpImpactScore || 0), 0);

        // Score History for trend
        const scoreHistory = attempts.map(a => ({
            score: a.finalScore,
            date: a.completedAt,
            domain: a.challengeId?.domain || 'General'
        }));

        // Group by Domain
        const byDomain = {};
        attempts.forEach(a => {
            const domain = a.challengeId?.domain || 'General';
            byDomain[domain] = (byDomain[domain] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                totalCompleted,
                avgScore,
                totalATPEarned,
                scoreHistory,
                byDomain,
                streak: 1 // Simplified
            }
        });
    } catch (err) {
        console.error('Error fetching history stats:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== POST /api/challenges/domain/generate — AI Generate =====
router.post('/domain/generate', async (req, res) => {
    try {
        const { userId, skillName, level, forceRegenerate } = req.body;

        // Check if active challenge already exists (unless forcing regeneration)
        if (!forceRegenerate) {
            const existing = await Challenge.findOne({
                challengeType: 'domain',
                targetSkill: skillName,
                skillNodeLevel: level,
                assignedTo: userId,
                status: 'active'
            });
            if (existing) {
                return res.json({ success: true, data: existing, message: 'Existing challenge found' });
            }
        }

        // Generate via AI
        console.log(`[API] Generating challenge for ${skillName} L${level}...`);
        const aiChallenge = await challengeEvaluator.generateLeveledChallenge(skillName, level);

        if (!aiChallenge) {
            return res.status(500).json({ success: false, message: "Failed to generate challenge" });
        }

        // Create new Challenge document
        const newChallenge = new Challenge({
            ...aiChallenge,
            creatorId: userId,
            assignedTo: userId,
            challengeType: 'domain',
            status: 'active',
            domain: skillName.toLowerCase(), // Ensure consistency
            targetSkill: skillName,
            skillNodeLevel: level,
            createdAt: Date.now()
        });

        await newChallenge.save();
        console.log(`[API] Created new challenge: ${newChallenge._id}`);

        res.json({ success: true, data: newChallenge });

    } catch (err) {
        console.error('Error generating challenge:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== POST /api/challenges — Create Custom Challenge =====
router.post('/', async (req, res) => {
    try {
        const { title, description, domain, difficulty, timeLimit, questions, creatorId } = req.body;

        const newChallenge = new Challenge({
            title,
            description,
            domain,
            difficulty,
            timeLimit,
            questions,
            creatorId: creatorId || req.user?.id,
            challengeType: 'custom',
            status: 'active'
        });

        await newChallenge.save();
        res.json({ success: true, data: newChallenge });
    } catch (err) {
        console.error('Error creating challenge:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== POST /api/challenges/:id/start — Start a Challenge (Create Attempt) =====
router.post('/:id/start', async (req, res) => {
    try {
        const { userId } = req.body;
        const challengeId = req.params.id;

        const challenge = await Challenge.findById(challengeId);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });

        // Check for existing in-progress attempt
        let attempt = await ChallengeAttempt.findOne({
            challengeId,
            userId,
            status: 'in-progress'
        });

        if (attempt) {
            return res.json({ success: true, attemptId: attempt._id, message: 'Resuming existing attempt' });
        }

        // Create new attempt
        attempt = new ChallengeAttempt({
            challengeId,
            userId,
            status: 'in-progress',
            startedAt: Date.now()
        });

        await attempt.save();

        res.json({ success: true, attemptId: attempt._id });
    } catch (err) {
        console.error('Error starting challenge:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== POST /api/challenges/:id/submit =====
router.post('/:id/submit', async (req, res) => {
    try {
        const { content, answers, attemptId, antiCheatData } = req.body;
        const userId = req.body.userId || req.user.id;

        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found' });

        // 1. Evaluate Score
        let score = 0; // percentage
        let rawScore = 0;
        let maxPossible = 100;
        let feedback = "";
        let evaluationDetails = [];

        if (challenge.questions && challenge.questions.length > 0 && answers) {
            const evalResult = await challengeEvaluator.evaluateChallenge(challenge, answers);
            rawScore = evalResult.totalScore; // Assign raw points
            maxPossible = evalResult.maxPossible || 100;
            score = evalResult.accuracy || 0; // Assign percentage
            feedback = evalResult.feedback;
            evaluationDetails = evalResult.scores;
        } else {
            score = Math.floor(Math.random() * 20) + 80; // Fallback mock
        }

        const passed = score >= (challenge.passingScore || 70);

        // 2. Update ChallengeAttempt (CRITICAL for History)
        let riskLevel = 'low';
        let atpImpactScore = 0;
        let atpApplied = false;

        if (attemptId) {
            const attempt = await ChallengeAttempt.findById(attemptId);
            if (attempt) {
                attempt.status = 'completed';
                attempt.completedAt = Date.now();
                attempt.answers = answers; // storing detailed answers
                attempt.finalScore = score;
                attempt.feedback = feedback;
                attempt.endTime = Date.now();

                const startTime = attempt.startedAt || attempt.createdAt || Date.now();
                attempt.timeSpent = Math.round((Date.now() - new Date(startTime).getTime()) / 1000) || 0;
                attempt.riskLevel = riskLevel;

                // Calculate ATP Impact (Score/Points impact)
                if (passed && riskLevel === 'low') {
                    // Impact is 1/10th of reward points (e.g., 200 XP -> 20 ATP points)
                    atpImpactScore = challenge.rewardPoints ? Math.round(challenge.rewardPoints / 10) : 10;
                    attempt.atpImpactScore = atpImpactScore;
                    attempt.atpApplied = true;

                    // Update User ATP - Increment both Problem Solving and Overall Talent Score
                    // Use $min/$max logic if these are percentages, but here they seem treated as points
                    // We'll increment and the model's 'max: 100' validation will handle capping if needed
                    await User.findByIdAndUpdate(userId, {
                        $inc: {
                            'aiTalentPassport.problemSolvingScore': atpImpactScore,
                            'aiTalentPassport.talentScore': Math.round(atpImpactScore / 2) // Talent score grows overall
                        }
                    });
                    atpApplied = true;
                }

                // Save anti-cheat data if provided
                if (antiCheatData) {
                    attempt.antiCheatLog = {
                        tabSwitches: antiCheatData.tabSwitches || 0,
                        focusLosses: antiCheatData.focusLosses || 0,
                        pasteAttempts: antiCheatData.pasteAttempts || 0,
                        suspiciousActions: []
                    };
                }

                await attempt.save();
            }
        }

        // 3. Update Challenge Submissions (Legacy/Stats)
        const submission = {
            userId,
            content: content || 'Interactive Submission',
            submittedAt: Date.now(),
            score,
            feedback
        };
        challenge.submissions.unshift(submission);

        // 4. Update SkillNode (if passed domain challenge)
        if (passed && challenge.challengeType === 'domain') {
            const skillNode = await SkillNode.findOne({ userId, skillName: challenge.targetSkill });
            if (skillNode) {
                // Ensure we don't double-count if they re-take a passed challenge
                if (challenge.skillNodeLevel > skillNode.highestLevelCompleted) {
                    skillNode.highestLevelCompleted = challenge.skillNodeLevel;
                    // Add full level XP
                    skillNode.xp += challenge.rewardPoints || 100;
                    skillNode.challengesCompleted += 1;

                    // Update main level based on new highest completed
                    skillNode.level = skillNode.highestLevelCompleted;
                } else {
                    // Small XP bump for practice
                    skillNode.xp += 10;
                }
                await skillNode.save();
            }
        }

        await challenge.save();

        res.json({
            success: true,
            score,
            rawScore,
            maxPossible,
            totalScore: rawScore,
            feedback,
            passed,
            attemptId,
            riskLevel,
            atpApplied,
            atpImpactScore
        });
    } catch (err) {
        console.error('Error submitting challenge:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

module.exports = router;
