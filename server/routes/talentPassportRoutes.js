/**
 * AI Talent Passport Routes
 * NEW ADDITIVE FEATURE - Does not modify existing routes
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const aiTalentPassportService = require('../services/aiTalentPassportService');

/**
 * GET /api/talent-passport/:userId
 * Fetch AI Talent Passport for a user
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('aiTalentPassport profile.name');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // If passport doesn't exist or is empty, calculate it
        if (!user.aiTalentPassport || user.aiTalentPassport.talentScore === 0) {
            await aiTalentPassportService.updateTalentPassport(userId);
            const updatedUser = await User.findById(userId).select('aiTalentPassport profile.name');

            return res.json({
                success: true,
                data: {
                    userName: updatedUser.profile?.name,
                    passport: updatedUser.aiTalentPassport
                }
            });
        }

        res.json({
            success: true,
            data: {
                userName: user.profile?.name,
                passport: user.aiTalentPassport
            }
        });
    } catch (error) {
        console.error('Error fetching talent passport:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch talent passport'
        });
    }
});

/**
 * POST /api/talent-passport/:userId/refresh
 * Manually refresh/recalculate AI Talent Passport
 */
router.post('/:userId/refresh', async (req, res) => {
    try {
        const { userId } = req.params;

        const updatedData = await aiTalentPassportService.updateTalentPassport(userId);

        res.json({
            success: true,
            message: 'AI Talent Passport refreshed successfully',
            data: updatedData
        });
    } catch (error) {
        console.error('Error refreshing talent passport:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh talent passport'
        });
    }
});

/**
 * GET /api/talent-passport/:userId/summary
 * Get quick summary of ATP scores
 */
router.get('/:userId/summary', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('aiTalentPassport.talentScore aiTalentPassport.levelBand aiTalentPassport.globalPercentile profile.name');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                userName: user.profile?.name,
                talentScore: user.aiTalentPassport?.talentScore || 0,
                levelBand: user.aiTalentPassport?.levelBand || 'Level 1',
                globalPercentile: user.aiTalentPassport?.globalPercentile || 0
            }
        });
    } catch (error) {
        console.error('Error fetching ATP summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch summary'
        });
    }
});

module.exports = router;
