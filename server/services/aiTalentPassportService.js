/**
 * AI Talent Passport Service
 * Calculates and updates AI Talent Passport metrics based on existing interview/coding data
 * PURE ADDITIVE FEATURE - Does not modify any existing functionality
 */

const User = require('../models/User');
const Interview = require('../models/Interview');
const SkillNode = require('../models/SkillNode');
const geminiService = require('./ai/geminiService'); // For ATP synthesis

class AITalentPassportService {
    /**
     * Calculate ATP scores from existing user data
     * Uses data from: platformInterview, interviewStatus, completed interviews, coding tests
     */
    async calculatePassportScores(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            // Fetch all completed interviews for this user
            const interviews = await Interview.find({
                userId,
                status: 'completed'
            }).sort({ completedAt: -1 });

            // Fetch all skill nodes for this user
            const skillNodes = await SkillNode.find({ userId });

            const scores = {
                talentScore: 0,
                domainScore: 0,
                communicationScore: 0,
                problemSolvingScore: 0,
                gdScore: 0,
                professionalismScore: 0
            };

            // Calculate from platform interview
            if (user.platformInterview?.status === 'passed' && user.platformInterview?.score) {
                scores.talentScore += user.platformInterview.score * 0.3; // 30% weight
            }

            // Calculate from existing interviewStatus
            if (user.interviewStatus?.completed) {
                scores.domainScore = user.interviewStatus.technicalScore || 0;
                scores.communicationScore = user.interviewStatus.hrScore || 0;
                scores.talentScore += (user.interviewStatus.overallScore || 0) * 0.2; // 20% weight
            }

            // Calculate from completed interviews
            if (interviews.length > 0) {
                let totalTechnical = 0;
                let totalCommunication = 0;
                let totalProblemSolving = 0;
                let count = 0;

                interviews.forEach(interview => {
                    if (interview.scoring) {
                        totalTechnical += interview.scoring.technicalAccuracy || 0;
                        totalCommunication += interview.scoring.communication || 0;
                        totalProblemSolving += interview.scoring.relevance || 0;
                        count++;
                    }
                });

                if (count > 0) {
                    scores.domainScore = Math.max(scores.domainScore, totalTechnical / count);
                    scores.communicationScore = Math.max(scores.communicationScore, totalCommunication / count);
                    scores.problemSolvingScore = totalProblemSolving / count;
                }
            }

            // Calculate Domain Score from SkillNodes (aggregated level/XP)
            if (skillNodes.length > 0) {
                const totalSkillScore = skillNodes.reduce((acc, node) => acc + (node.level * 25), 0);
                const avgSkillScore = totalSkillScore / skillNodes.length;
                scores.domainScore = Math.round((scores.domainScore + avgSkillScore) / 2);
            }

            // GD Score (placeholder for future feature)
            scores.gdScore = 50; // Default mid-range

            // Professionalism Score (based on reliability and completion)
            scores.professionalismScore = this.calculateProfessionalismScore(user, interviews);

            // Calculate final talent score (weighted average)
            scores.talentScore = Math.min(100, Math.round(
                scores.domainScore * 0.25 +
                scores.communicationScore * 0.20 +
                scores.problemSolvingScore * 0.25 +
                scores.professionalismScore * 0.20 +
                scores.gdScore * 0.10
            ));

            return scores;
        } catch (error) {
            console.error('Error calculating passport scores:', error);
            throw error;
        }
    }

    /**
     * Calculate professionalism score
     */
    calculateProfessionalismScore(user, interviews) {
        let score = 80; // Base score

        // Bonus for completed platform interview
        if (user.platformInterview?.status === 'passed') {
            score += 10;
        }

        // Penalty for proctoring flags (Anti-Cheat Layer)
        if (user.interviewStatus?.proctoringFlags?.length > 0) {
            score -= Math.min(40, user.interviewStatus.proctoringFlags.length * 5);
        }

        // Bonus for multiple completed interviews
        if (interviews.length > 0) {
            score += Math.min(10, interviews.length * 2);
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate global percentile (based on talent score)
     */
    calculateGlobalPercentile(talentScore) {
        // Simple percentile mapping
        if (talentScore >= 90) return 95;
        if (talentScore >= 80) return 85;
        if (talentScore >= 70) return 70;
        if (talentScore >= 60) return 55;
        if (talentScore >= 50) return 40;
        if (talentScore >= 40) return 25;
        return 10;
    }

    /**
     * Determine level band based on talent score
     */
    determineLevelBand(talentScore) {
        if (talentScore >= 90) return 'Level 7';
        if (talentScore >= 80) return 'Level 6';
        if (talentScore >= 70) return 'Level 5';
        if (talentScore >= 60) return 'Level 4';
        if (talentScore >= 50) return 'Level 3';
        if (talentScore >= 40) return 'Level 2';
        return 'Level 1';
    }

    /**
     * Generate skill heatmap from user skills and interview data
     */
    generateSkillHeatmap(user, interviews) {
        const skillMap = new Map();

        // Add skills from user profile
        if (user.jobSeekerProfile?.skills) {
            user.jobSeekerProfile.skills.forEach(skill => {
                const proficiency = this.convertLevelToScore(skill.level);
                skillMap.set(skill.name, { proficiency, assessedDate: new Date() });
            });
        }

        // Enhance with interview data
        interviews.forEach(interview => {
            if (interview.matchScore?.matchedSkills) {
                interview.matchScore.matchedSkills.forEach(skill => {
                    if (!skillMap.has(skill)) {
                        skillMap.set(skill, { proficiency: 70, assessedDate: interview.completedAt });
                    }
                });
            }
        });

        return Array.from(skillMap.entries()).map(([skillName, data]) => ({
            skillName,
            proficiency: data.proficiency,
            assessedDate: data.assessedDate
        }));
    }

    /**
     * Convert skill level to score
     */
    convertLevelToScore(level) {
        const levelMap = {
            'beginner': 25,
            'intermediate': 50,
            'advanced': 75,
            'expert': 95
        };
        return levelMap[level] || 50;
    }

    /**
     * Calculate behavioralProfile from interview data
     */
    calculateBehavioralProfile(interviews) {
        let avgConfidence = 0;
        let count = 0;

        interviews.forEach(interview => {
            if (interview.scoring?.confidence) {
                avgConfidence += interview.scoring.confidence;
                count++;
            }
        });

        const confidence = count > 0 ? avgConfidence / count : 50;

        return {
            leadership: Math.min(100, confidence + 10),
            teamwork: 70, // Default
            confidence: Math.round(confidence),
            stressResponse: confidence >= 70 ? 'Good' : 'Average',
            communicationStyle: 'Analytical'
        };
    }

    /**
     * Calculate reliability metrics
     */
    calculateReliability(user, interviews) {
        const completedCount = interviews.length;
        const totalAttempted = user.platformInterview?.attempts || 1;

        return {
            punctuality: 95, // Default high value
            taskCompletionRate: Math.min(100, (completedCount / Math.max(1, totalAttempted)) * 100),
            responsiveness: 85, // Default
            consistency: completedCount > 2 ? 90 : 70
        };
    }

    /**
     * Generate career predictions based on skills and scores
     */
    async generateCareerPredictions(user, scores) {
        const recommendedRoles = [];

        // Based on domain score and skills
        if (scores.domainScore >= 70) {
            recommendedRoles.push({
                role: user.jobSeekerProfile?.desiredRole || 'Software Engineer',
                fitScore: scores.domainScore,
                salaryEstimate: {
                    min: 60000,
                    max: 90000,
                    currency: 'USD'
                }
            });
        }

        if (scores.communicationScore >= 75) {
            recommendedRoles.push({
                role: 'Technical Lead',
                fitScore: (scores.domainScore + scores.communicationScore) / 2,
                salaryEstimate: {
                    min: 80000,
                    max: 120000,
                    currency: 'USD'
                }
            });
        }

        // Learning roadmap
        const learningRoadmap = [];
        if (scores.problemSolvingScore < 70) {
            learningRoadmap.push({
                skill: 'Problem Solving',
                currentLevel: 'Intermediate',
                targetLevel: 'Advanced',
                estimatedTime: '3 months',
                priority: 'High'
            });
        }

        return {
            recommendedRoles,
            readinessPercentage: scores.talentScore,
            learningRoadmap
        };
    }

    /**
     * Update AI Talent Passport for a user
     * This is the main function called after interviews/assessments
     */
    async updateTalentPassport(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const interviews = await Interview.find({
                userId,
                status: 'completed'
            }).sort({ completedAt: -1 });

            // Calculate all scores
            const scores = await this.calculatePassportScores(userId);
            const globalPercentile = this.calculateGlobalPercentile(scores.talentScore);
            const levelBand = this.determineLevelBand(scores.talentScore);
            const skillHeatmap = this.generateSkillHeatmap(user, interviews);
            const behavioralProfile = this.calculateBehavioralProfile(interviews);
            const reliability = this.calculateReliability(user, interviews);
            const careerPredictions = await this.generateCareerPredictions(user, scores);

            // Proof of work (coding tasks from interviews)
            const proofOfWork = {
                codingTasks: {
                    completed: interviews.filter(i => i.interviewType === 'technical').length,
                    avgScore: scores.problemSolvingScore
                },
                simulations: { completed: 0, avgScore: 0 },
                missions: { completed: 0, avgScore: 0 }
            };

            // Update user's ATP (ADDITIVE UPDATE - preserves existing data)
            const updateData = {
                'aiTalentPassport.talentScore': scores.talentScore,
                'aiTalentPassport.domainScore': scores.domainScore,
                'aiTalentPassport.communicationScore': scores.communicationScore,
                'aiTalentPassport.problemSolvingScore': scores.problemSolvingScore,
                'aiTalentPassport.gdScore': scores.gdScore,
                'aiTalentPassport.professionalismScore': scores.professionalismScore,
                'aiTalentPassport.globalPercentile': globalPercentile,
                'aiTalentPassport.levelBand': levelBand,
                'aiTalentPassport.skillHeatmap': skillHeatmap,
                'aiTalentPassport.proofOfWork': proofOfWork,
                'aiTalentPassport.behavioralProfile': behavioralProfile,
                'aiTalentPassport.reliability': reliability,
                'aiTalentPassport.careerPredictions': careerPredictions,
                'aiTalentPassport.lastUpdated': new Date(),
                'aiTalentPassport.totalAssessmentsCompleted': interviews.length,
                'aiTalentPassport.isActive': true
            };

            await User.findByIdAndUpdate(userId, { $set: updateData });

            console.log(`✅ AI Talent Passport updated for user ${userId}`);
            return updateData;
        } catch (error) {
            console.error('Error updating talent passport:', error);
            throw error;
        }
    }
}

module.exports = new AITalentPassportService();
