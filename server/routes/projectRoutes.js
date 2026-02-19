/**
 * Project Routes
 * Submit GitHub projects for admin verification → ATP credit
 * Now with automated GitHub analysis + WebSocket events
 */

const express = require('express');
const router = express.Router();
const VerifiedProject = require('../models/VerifiedProject');
const User = require('../models/User');
const { analyzeRepository } = require('../utils/githubAnalyzer');
const { emitProjectUpdate } = require('../utils/atpEmitter');

// ===== POST /api/projects/submit — User submits a project =====
router.post('/submit', async (req, res) => {
    try {
        const { userId, githubUrl, title, description, domain, techStack } = req.body;

        if (!userId || !githubUrl || !title || !domain) {
            return res.status(400).json({
                success: false,
                error: 'userId, githubUrl, title, and domain are required'
            });
        }

        // Check for duplicate URL
        const existing = await VerifiedProject.findOne({ userId, githubUrl });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'This project URL has already been submitted'
            });
        }

        const project = new VerifiedProject({
            userId,
            githubUrl,
            title,
            description: description || '',
            domain,
            techStack: techStack || [],
            status: 'pending'
        });

        await project.save();

        // Kick off background GitHub analysis (non-blocking)
        analyzeRepository(githubUrl).then(async (analysis) => {
            if (analysis.success) {
                project.githubAnalysis = {
                    analyzedAt: new Date(),
                    techStackDetected: analysis.techStack || [],
                    commitCount: analysis.metrics?.commitCount || 0,
                    contributorCount: analysis.metrics?.contributorCount || 0,
                    estimatedLOC: analysis.metrics?.estimatedLinesOfCode || 0,
                    complexityEstimate: analysis.complexity || 'medium',
                    originalityScore: analysis.originality?.score || 0,
                    isFork: analysis.originality?.isFork || false,
                    atpImpactEstimate: analysis.atpImpact || 0,
                    developmentDays: analysis.metrics?.developmentDays || 0
                };
                // Auto-update tech stack if empty and detected
                if ((!project.techStack || project.techStack.length === 0) && analysis.techStack?.length > 0) {
                    project.techStack = analysis.techStack.slice(0, 10);
                }
                await project.save();
                console.log(`[GitHub] Auto-analysis complete for "${title}": ${analysis.complexity} complexity, originality ${analysis.originality?.score}`);
            }
        }).catch(err => {
            console.log(`[GitHub] Background analysis failed for "${title}": ${err.message}`);
        });

        res.json({
            success: true,
            message: 'Project submitted for admin review (GitHub analysis running in background)',
            data: project
        });
    } catch (err) {
        console.error('Error submitting project:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== GET /api/projects/user/:userId — Get user's projects =====
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;

        const projects = await VerifiedProject.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: projects });
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== GET /api/projects/pending — Admin: get all pending projects =====
router.get('/pending', async (req, res) => {
    try {
        const projects = await VerifiedProject.find({ status: 'pending' })
            .populate('userId', 'profile.name profile.photo email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: projects });
    } catch (err) {
        console.error('Error fetching pending projects:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== POST /api/projects/:id/analyze — On-demand GitHub analysis =====
router.post('/:id/analyze', async (req, res) => {
    try {
        const project = await VerifiedProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const analysis = await analyzeRepository(project.githubUrl);
        if (!analysis.success) {
            return res.status(400).json({
                success: false,
                error: analysis.error || 'GitHub analysis failed'
            });
        }

        // Store analysis results on the project
        project.githubAnalysis = {
            analyzedAt: new Date(),
            techStackDetected: analysis.techStack || [],
            commitCount: analysis.metrics?.commitCount || 0,
            contributorCount: analysis.metrics?.contributorCount || 0,
            estimatedLOC: analysis.metrics?.estimatedLinesOfCode || 0,
            complexityEstimate: analysis.complexity || 'medium',
            originalityScore: analysis.originality?.score || 0,
            isFork: analysis.originality?.isFork || false,
            atpImpactEstimate: analysis.atpImpact || 0,
            developmentDays: analysis.metrics?.developmentDays || 0
        };

        // Auto-update fields from analysis
        if (analysis.techStack?.length > 0) {
            project.techStack = analysis.techStack.slice(0, 10);
        }
        project.complexity = analysis.complexity || project.complexity;
        project.linesOfCode = analysis.metrics?.estimatedLinesOfCode || project.linesOfCode;
        project.isOriginal = analysis.originality?.isLikelyOriginal ?? project.isOriginal;

        await project.save();

        res.json({
            success: true,
            message: 'GitHub analysis complete',
            data: { project, analysis }
        });
    } catch (err) {
        console.error('Error analyzing project:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

// ===== POST /api/projects/:id/review — Admin: approve/reject =====
router.post('/:id/review', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, adminId, adminNotes, complexity, linesOfCode, isOriginal } = req.body;

        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ success: false, error: 'Action must be approved or rejected' });
        }

        const project = await VerifiedProject.findById(id);
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        project.status = action;
        project.adminReviewedBy = adminId;
        project.adminNotes = adminNotes || '';
        project.reviewedAt = new Date();

        // Use GitHub analysis data as defaults if admin doesn't override
        const analysisData = project.githubAnalysis || {};
        project.complexity = complexity || analysisData.complexityEstimate || project.complexity;
        project.linesOfCode = linesOfCode || analysisData.estimatedLOC || project.linesOfCode;
        project.isOriginal = isOriginal !== undefined ? isOriginal :
            (analysisData.originalityScore > 50 ? true : project.isOriginal);

        // If approved and original, update ATP Impact metrics
        if (action === 'approved' && project.isOriginal !== false) {
            const complexityWeight = { low: 5, medium: 10, high: 20 };
            const impactScore = analysisData.atpImpactEstimate || complexityWeight[project.complexity] || 10;
            project.atpImpactScore = impactScore;
            project.atpImpactApplied = true;

            // Update user's ATP domain scores
            const user = await User.findById(project.userId);
            if (user && user.aiTalentPassport) {
                if (!user.aiTalentPassport.domainScores) {
                    user.aiTalentPassport.domainScores = [];
                }

                let domainEntry = user.aiTalentPassport.domainScores.find(d => d.domain === project.domain);
                if (!domainEntry) {
                    user.aiTalentPassport.domainScores.push({
                        domain: project.domain,
                        domainScore: 0,
                        skills: [],
                        lastUpdated: new Date()
                    });
                    domainEntry = user.aiTalentPassport.domainScores[user.aiTalentPassport.domainScores.length - 1];
                }

                const techStackToUse = (analysisData.techStackDetected?.length > 0)
                    ? analysisData.techStackDetected
                    : project.techStack;

                if (techStackToUse && techStackToUse.length > 0) {
                    for (const tech of techStackToUse) {
                        let skillEntry = domainEntry.skills.find(s => s.skillName.toLowerCase() === tech.toLowerCase());
                        if (skillEntry) {
                            skillEntry.projectValidation = Math.min(100, (skillEntry.projectValidation || 0) + impactScore);
                            skillEntry.score = Math.round(
                                (skillEntry.challengePerformance || 0) * 0.4 +
                                (skillEntry.interviewPerformance || 0) * 0.5 +
                                (skillEntry.projectValidation || 0) * 0.1
                            );
                            skillEntry.lastAssessedAt = new Date();
                        }
                    }
                }

                if (!user.aiTalentPassport.interviewSkillHistory) {
                    user.aiTalentPassport.interviewSkillHistory = [];
                }
                user.aiTalentPassport.interviewSkillHistory.push({
                    source: 'project',
                    sourceId: project._id,
                    skillName: Array.isArray(techStackToUse) ? techStackToUse.join(', ') : 'N/A',
                    domain: project.domain,
                    xpDelta: impactScore,
                    scoreDelta: impactScore,
                    detail: `Project approved: ${project.title}`,
                    timestamp: new Date()
                });

                user.aiTalentPassport.lastUpdated = new Date();
                await user.save();
            }
        }

        // ALWAYS save the project status regardless of action
        await project.save();

        // Emit WebSocket updates AFTER successful save
        if (action === 'approved') {
            console.log(`[ProjectReview] Emitting approved update for user ${project.userId}`);
            emitProjectUpdate(
                project.userId.toString(),
                project._id.toString(),
                'approved',
                project.atpImpactScore || 0
            );
        } else if (action === 'rejected') {
            console.log(`[ProjectReview] Emitting rejected update for user ${project.userId}`);
            emitProjectUpdate(
                project.userId.toString(),
                project._id.toString(),
                'rejected',
                0
            );
        }

        res.json({
            success: true,
            message: `Project ${action} successfully`,
            data: project
        });
    } catch (err) {
        console.error('Error reviewing project:', err);
        res.status(500).json({ success: false, error: err.message || 'Server Error' });
    }
});

module.exports = router;
