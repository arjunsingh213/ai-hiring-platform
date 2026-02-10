const AIUsage = require('../../models/AIUsage');
const User = require('../../models/User');

class AIUsageService {
    /**
     * Log an AI request and update user usage
     */
    async logUsage(data) {
        try {
            const {
                userId,
                model,
                purpose,
                inputTokens = 0,
                outputTokens = 0,
                status = 'success',
                errorMessage = null,
                metadata = {}
            } = data;

            const totalTokens = inputTokens + outputTokens;

            // Create usage log
            const log = new AIUsage({
                userId,
                model,
                purpose,
                inputTokens,
                outputTokens,
                totalTokens,
                status,
                errorMessage,
                metadata
            });
            await log.save();

            // Update user's cumulative usage if it was successful
            if (status === 'success' && userId && totalTokens > 0) {
                await User.findByIdAndUpdate(userId, {
                    $inc: { 'aiUsage.totalTokensUsed': totalTokens }
                });
            }

            return log;
        } catch (error) {
            console.error('[AIUsageService] Failed to log usage:', error);
            // Don't throw to avoid breaking the main AI flow
            return null;
        }
    }

    /**
     * Check if a user has tokens remaining
     */
    async checkLimit(userId) {
        try {
            const user = await User.findById(userId).select('aiUsage');
            if (!user) return { allowed: false, reason: 'User not found' };

            // For admins/super_admins, maybe we don't enforce limits?
            // But for tracking, we still log.

            const { tokenLimit, totalTokensUsed } = user.aiUsage || { tokenLimit: 100000, totalTokensUsed: 0 };

            if (totalTokensUsed >= tokenLimit) {
                return {
                    allowed: false,
                    reason: 'AI token limit reached',
                    limit: tokenLimit,
                    used: totalTokensUsed
                };
            }

            return {
                allowed: true,
                remaining: tokenLimit - totalTokensUsed
            };
        } catch (error) {
            console.error('[AIUsageService] Error checking limit:', error);
            return { allowed: true }; // Allow on error to avoid blocking users
        }
    }

    /**
     * Get user-wise usage statistics
     */
    async getUserStats(limit = 100) {
        try {
            const stats = await AIUsage.aggregate([
                { $match: { status: 'success' } },
                {
                    $group: {
                        _id: '$userId',
                        totalTokens: { $sum: '$totalTokens' },
                        inputTokens: { $sum: '$inputTokens' },
                        outputTokens: { $sum: '$outputTokens' },
                        requests: { $sum: 1 },
                        lastUsed: { $max: '$timestamp' }
                    }
                },
                { $sort: { totalTokens: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userDetails'
                    }
                },
                {
                    $unwind: {
                        path: '$userDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        userId: '$_id',
                        name: { $ifNull: ['$userDetails.profile.name', 'System'] },
                        email: { $ifNull: ['$userDetails.email', 'N/A'] },
                        totalTokens: 1,
                        inputTokens: 1,
                        outputTokens: 1,
                        requests: 1,
                        lastUsed: 1
                    }
                }
            ]);
            return stats;
        } catch (error) {
            console.error('[AIUsageService] User stats error:', error);
            return [];
        }
    }

    /**
     * Get aggregated stats for admin dashboard
     */
    async getGlobalStats() {
        try {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const oneMinuteAgo = new Date(now.getTime() - 60000);
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Basic Overview
            const overviewStats = await AIUsage.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRequests: { $sum: 1 },
                        totalTokens: { $sum: '$totalTokens' },
                        inputTokens: { $sum: '$inputTokens' },
                        outputTokens: { $sum: '$outputTokens' }
                    }
                }
            ]);

            // Rate metrics (RPM, TPM, RPD)
            const [rateMetrics, rpdMetric] = await Promise.all([
                AIUsage.aggregate([
                    { $match: { timestamp: { $gte: oneMinuteAgo } } },
                    {
                        $group: {
                            _id: null,
                            rpm: { $sum: 1 },
                            tpm: { $sum: '$totalTokens' }
                        }
                    }
                ]),
                AIUsage.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } })
            ]);

            const usageByModel = await AIUsage.aggregate([
                {
                    $group: {
                        _id: '$model',
                        tokens: { $sum: '$totalTokens' },
                        requests: { $sum: 1 }
                    }
                },
                { $sort: { tokens: -1 } }
            ]);

            const requestsByPurpose = await AIUsage.aggregate([
                {
                    $group: {
                        _id: '$purpose',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const userStats = await this.getUserStats(10);

            return {
                overview: {
                    ...(overviewStats[0] || { totalRequests: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 }),
                    rpm: rateMetrics[0]?.rpm || 0,
                    tpm: rateMetrics[0]?.tpm || 0,
                    rpd: rpdMetric || 0
                },
                byModel: usageByModel,
                byPurpose: requestsByPurpose,
                byUser: userStats
            };
        } catch (error) {
            console.error('[AIUsageService] Stats error:', error);
            throw error;
        }
    }
}

module.exports = new AIUsageService();
