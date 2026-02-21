const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const VideoRoom = require('../models/VideoRoom');
const Job = require('../models/Job');
const User = require('../models/User');
const Interview = require('../models/Interview');
const { userAuth, requireRole } = require('../middleware/userAuth');
const jwt = require('jsonwebtoken');

/* ═══════════════════════════════════════════════════════════════
   FROSCEL INTERVIEW ROOM™ — Video Room Routes
   ═══════════════════════════════════════════════════════════════ */

// Generate a secure room access token
const generateRoomToken = (userId, roomCode, role) => {
    return jwt.sign(
        { userId, roomCode, role, type: 'room_access' },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
    );
};

// ─── Create / Schedule Video Interview Room ───
router.post('/', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const {
            jobId,
            candidateId,
            scheduledAt,
            duration = 45,
            interviewType = 'one_on_one',
            roundIndex = 0,
            aiConfig = {},
            panelists = [],
            interviewerNotes = '',
            evaluationCriteria = []
        } = req.body;

        // Validate required fields
        if (!jobId || !candidateId || !scheduledAt) {
            return res.status(400).json({
                success: false,
                error: 'jobId, candidateId, and scheduledAt are required'
            });
        }

        // Verify job exists and belongs to recruiter
        const job = await Job.findOne({ _id: jobId, recruiterId: req.userId });
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found or unauthorized' });
        }

        // Verify candidate exists
        const candidate = await User.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ success: false, error: 'Candidate not found' });
        }

        const recruiter = await User.findById(req.userId);

        // Generate room code
        const roomCode = crypto.randomUUID().split('-')[0].toUpperCase();

        // Build participants array
        const participants = [
            {
                userId: req.userId,
                role: 'recruiter',
                name: recruiter?.profile?.name || 'Recruiter',
                email: recruiter?.email,
                accessToken: generateRoomToken(req.userId, roomCode, 'recruiter')
            },
            {
                userId: candidateId,
                role: 'candidate',
                name: candidate?.profile?.name || 'Candidate',
                email: candidate?.email,
                accessToken: generateRoomToken(candidateId, roomCode, 'candidate')
            }
        ];

        // Add panelists for panel interviews
        if (interviewType === 'panel' && panelists.length > 0) {
            for (const panelistId of panelists) {
                const panelist = await User.findById(panelistId);
                if (panelist) {
                    participants.push({
                        userId: panelistId,
                        role: 'panelist',
                        name: panelist?.profile?.name || 'Panelist',
                        email: panelist?.email,
                        accessToken: generateRoomToken(panelistId, roomCode, 'panelist')
                    });
                }
            }
        }

        // Create room
        const videoRoom = new VideoRoom({
            roomCode,
            jobId,
            candidateId,
            recruiterId: req.userId,
            roundIndex,
            status: 'scheduled',
            scheduledAt: new Date(scheduledAt),
            duration,
            interviewType,
            participants,
            aiConfig: {
                enabled: aiConfig.enabled || false,
                permissions: {
                    suggestFollowUps: aiConfig.suggestFollowUps ?? true,
                    askDirectly: aiConfig.askDirectly ?? false,
                    probeVagueAnswers: aiConfig.probeVagueAnswers ?? true,
                    detectContradictions: aiConfig.detectContradictions ?? true,
                    suggestDifficultyEscalation: aiConfig.suggestDifficultyEscalation ?? true
                },
                scope: {
                    skills: job.requirements?.skills || [],
                    competencies: evaluationCriteria,
                    maxDirectQuestions: aiConfig.maxDirectQuestions || 3
                }
            },
            recording: { enabled: true },
            interviewerNotes,
            evaluationCriteria,
            createdBy: req.userId
        });

        // Add audit entry
        videoRoom.addAuditEntry('room_created', req.userId, 'recruiter', {
            jobTitle: job.title,
            candidateName: candidate?.profile?.name,
            scheduledAt,
            duration,
            interviewType
        });

        await videoRoom.save();

        // ── Send persistent notification + email to candidate ──
        try {
            const Notification = require('../models/Notification');
            const roomLink = `/interview-room/${roomCode}`;

            // 1. Create DB notification (persists even if candidate is offline)
            await Notification.create({
                userId: candidateId,
                sender: req.userId,
                type: 'interview_reminder',
                title: 'Video Interview Scheduled',
                message: `You have a video interview for "${job.title}" on ${new Date(scheduledAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
                relatedEntity: { entityType: 'interview', entityId: videoRoom._id },
                actionUrl: roomLink,
                actionText: 'Join Interview',
                priority: 'high'
            });

            // 2. Send email invitation with all details
            const { sendVideoInterviewInvitation } = require('../services/emailService');
            await sendVideoInterviewInvitation({
                candidateEmail: candidate.email,
                candidateName: candidate?.profile?.name || 'Candidate',
                recruiterName: recruiter?.profile?.name || 'Recruiter',
                jobTitle: job.title,
                scheduledAt,
                duration,
                roomCode,
                roomLink
            });

            // 3. Real-time socket push (for candidates currently online)
            const { getIO } = require('../config/socket');
            const io = getIO();
            io.to(candidateId.toString()).emit('receive_notification', {
                type: 'video_interview_scheduled',
                title: 'Video Interview Scheduled',
                message: `You have a video interview for "${job.title}" scheduled on ${new Date(scheduledAt).toLocaleDateString()}`,
                data: { roomCode, jobTitle: job.title, scheduledAt, duration }
            });
        } catch (notifErr) {
            console.log('Notification/email delivery error (room still created):', notifErr.message);
        }

        res.status(201).json({
            success: true,
            data: videoRoom,
            roomLink: `/interview-room/${roomCode}`
        });
    } catch (error) {
        console.error('Error creating video room:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ─── Check if a video room exists for candidate + job ───
router.get('/check/:jobId/:candidateId', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const room = await VideoRoom.findOne({
            jobId: req.params.jobId,
            candidateId: req.params.candidateId,
            status: { $in: ['scheduled', 'waiting', 'live', 'completed'] }
        })
            .sort({ createdAt: -1 })
            .select('roomCode status scheduledAt duration interviewType')
            .lean();

        res.json({ success: true, room: room || null });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Get My Video Rooms (candidate-facing) ───
router.get('/my/rooms', userAuth, async (req, res) => {
    try {
        const userId = req.userId;
        console.log('[VideoRoom /my/rooms] Looking up rooms for userId:', userId, 'type:', typeof userId);

        // Primary query: check participants array
        let rooms = await VideoRoom.find({
            'participants.userId': userId,
            status: { $in: ['scheduled', 'waiting', 'live', 'completed'] }
        })
            .populate('jobId', 'title company')
            .populate('recruiterId', 'profile.name profile.photo')
            .populate('candidateId', 'profile.name profile.photo')
            .sort({ scheduledAt: -1 })
            .lean();

        console.log('[VideoRoom /my/rooms] Found via participants.userId:', rooms.length);

        // Fallback: also check top-level candidateId and recruiterId fields
        if (rooms.length === 0) {
            rooms = await VideoRoom.find({
                $or: [
                    { candidateId: userId },
                    { recruiterId: userId }
                ],
                status: { $in: ['scheduled', 'waiting', 'live', 'completed'] }
            })
                .populate('jobId', 'title company')
                .populate('recruiterId', 'profile.name profile.photo')
                .populate('candidateId', 'profile.name profile.photo')
                .sort({ scheduledAt: -1 })
                .lean();
            console.log('[VideoRoom /my/rooms] Found via candidateId/recruiterId fallback:', rooms.length);
        }

        res.json({ success: true, data: rooms });
    } catch (error) {
        console.error('Error fetching my rooms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Get Room by Code ───
router.get('/:roomCode', userAuth, async (req, res) => {
    try {
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode })
            .populate('jobId', 'title company requirements')
            .populate('candidateId', 'profile.name profile.photo email')
            .populate('recruiterId', 'profile.name profile.photo email');

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        // Verify participant belongs to room
        const isParticipant = room.participants.some(
            p => p.userId.toString() === req.userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ success: false, error: 'Not authorized to access this room' });
        }

        // Determine user role in room
        const participant = room.participants.find(
            p => p.userId.toString() === req.userId.toString()
        );

        // Filter sensitive data for candidates
        let responseData = room.toObject();
        if (participant.role === 'candidate') {
            delete responseData.integritySignals;
            delete responseData.aiConfig;
            delete responseData.auditLog;
            delete responseData.postInterviewReport;
            delete responseData.recruiterValidation;
            delete responseData.interviewerNotes;
            // Remove access tokens of other participants
            responseData.participants = responseData.participants.map(p => {
                if (p.userId.toString() !== req.userId.toString()) {
                    delete p.accessToken;
                }
                return p;
            });
        }

        res.json({
            success: true,
            data: responseData,
            userRole: participant.role,
            accessToken: participant.accessToken
        });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Join Room (validate & get token) ───
router.post('/:roomCode/join', userAuth, async (req, res) => {
    try {
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });
        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        const participant = room.participants.find(
            p => p.userId.toString() === req.userId.toString()
        );

        if (!participant) {
            return res.status(403).json({ success: false, error: 'You are not invited to this room' });
        }

        if (room.status === 'completed' || room.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'This interview has already ended' });
        }

        // Mark participant as joined
        participant.joinedAt = new Date();
        participant.isActive = true;

        // Generate fresh access token
        participant.accessToken = generateRoomToken(req.userId, room.roomCode, participant.role);

        // Update room status if recruiter joins
        if (participant.role === 'recruiter' && room.status === 'scheduled') {
            room.status = 'waiting';
        }

        // If all required participants joined, mark as live
        const recruiterJoined = room.participants.some(p => p.role === 'recruiter' && p.isActive);
        const candidateJoined = room.participants.some(p => p.role === 'candidate' && p.isActive);
        if (recruiterJoined && candidateJoined && room.status !== 'live') {
            room.status = 'live';
            room.startedAt = new Date();
        }

        room.addAuditEntry('participant_joined', req.userId, participant.role, {
            name: participant.name
        });

        await room.save();

        res.json({
            success: true,
            data: {
                roomCode: room.roomCode,
                status: room.status,
                role: participant.role,
                accessToken: participant.accessToken,
                participants: room.participants.map(p => ({
                    userId: p.userId,
                    role: p.role,
                    name: p.name,
                    isActive: p.isActive
                }))
            }
        });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Update Room Status ───
router.put('/:roomCode/status', userAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        // Only recruiter can change status
        const participant = room.participants.find(
            p => p.userId.toString() === req.userId.toString() && p.role === 'recruiter'
        );

        if (!participant) {
            return res.status(403).json({ success: false, error: 'Only the recruiter can update room status' });
        }

        const validTransitions = {
            scheduled: ['waiting', 'cancelled'],
            waiting: ['live', 'cancelled'],
            live: ['completed'],
            completed: ['archived']
        };

        if (!validTransitions[room.status]?.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot transition from ${room.status} to ${status}`
            });
        }

        room.status = status;
        if (status === 'live') room.startedAt = new Date();
        if (status === 'completed') {
            room.endedAt = new Date();
            // Mark all participants as inactive
            room.participants.forEach(p => {
                p.isActive = false;
                if (!p.leftAt) p.leftAt = new Date();
            });
        }

        room.addAuditEntry(`room_${status === 'completed' ? 'ended' : 'started'}`, req.userId, 'recruiter');
        await room.save();

        // Notify all participants via socket
        try {
            const { getIO } = require('../config/socket');
            const io = getIO();
            room.participants.forEach(p => {
                io.to(p.userId.toString()).emit('room_status_changed', {
                    roomCode: room.roomCode,
                    status: room.status
                });
            });
        } catch (err) {
            console.log('Socket notification skipped:', err.message);
        }

        res.json({ success: true, data: { status: room.status } });
    } catch (error) {
        console.error('Error updating room status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Save Recording ───
router.post('/:roomCode/recording', userAuth, async (req, res) => {
    try {
        const { cloudinaryUrl, cloudinarySecureUrl, cloudinaryPublicId, duration, fileSize, format } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        room.recording = {
            ...room.recording,
            status: 'ready',
            cloudinaryUrl,
            cloudinarySecureUrl,
            cloudinaryPublicId,
            duration,
            fileSize,
            format,
            uploadedAt: new Date()
        };

        room.addAuditEntry('recording_stopped', req.userId, 'recruiter', { duration, fileSize });
        await room.save();

        res.json({ success: true, data: room.recording });
    } catch (error) {
        console.error('Error saving recording:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Save Transcript Entry ───
router.post('/:roomCode/transcript', userAuth, async (req, res) => {
    try {
        const { text, speakerRole, speakerName } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        room.addTranscriptEntry(req.userId, speakerRole, speakerName, text);
        await room.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving transcript:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Add Recruiter Note ───
router.post('/:roomCode/notes', userAuth, async (req, res) => {
    try {
        const { content, competencyCategory, type = 'manual' } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        room.notes.push({
            type,
            content,
            competencyCategory,
            createdBy: 'recruiter',
            timestamp: new Date()
        });

        room.addAuditEntry('recruiter_note_added', req.userId, 'recruiter');
        await room.save();

        res.json({ success: true, data: room.notes[room.notes.length - 1] });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Recruiter Validate Report ───
router.put('/:roomCode/validate', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { status, comments, aiObservations, finalEvaluation, atpUpdateApproved } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        room.recruiterValidation = {
            status: status || 'validated',
            validatedAt: new Date(),
            validatedBy: req.userId,
            comments,
            aiObservations: aiObservations || [],
            finalEvaluation: finalEvaluation || {},
            atpUpdateApproved: atpUpdateApproved || false
        };

        room.addAuditEntry('report_validated', req.userId, 'recruiter', {
            status,
            atpUpdateApproved
        });

        await room.save();

        res.json({ success: true, data: room.recruiterValidation });
    } catch (error) {
        console.error('Error validating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── List Rooms for Recruiter ───
router.get('/recruiter/:recruiterId', userAuth, async (req, res) => {
    try {
        if (req.userId.toString() !== req.params.recruiterId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const rooms = await VideoRoom.find({ recruiterId: req.params.recruiterId })
            .populate('jobId', 'title')
            .populate('candidateId', 'profile.name profile.photo email')
            .sort({ scheduledAt: -1 });

        res.json({ success: true, data: rooms });
    } catch (error) {
        console.error('Error fetching recruiter rooms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── List Rooms for Candidate ───
router.get('/candidate/:candidateId', userAuth, async (req, res) => {
    try {
        if (req.userId.toString() !== req.params.candidateId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const rooms = await VideoRoom.find({
            candidateId: req.params.candidateId,
            status: { $ne: 'cancelled' }
        })
            .populate('jobId', 'title company')
            .populate('recruiterId', 'profile.name profile.photo')
            .select('-integritySignals -aiConfig -auditLog -postInterviewReport -recruiterValidation -interviewerNotes')
            .sort({ scheduledAt: -1 });

        res.json({ success: true, data: rooms });
    } catch (error) {
        console.error('Error fetching candidate rooms:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── AI Config Update (mid-interview) ───
router.put('/:roomCode/ai-config', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { enabled, permissions } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        if (typeof enabled === 'boolean') {
            room.aiConfig.enabled = enabled;
            if (!enabled) {
                room.aiConfig.disabledAt = new Date();
                room.aiConfig.disabledBy = req.userId;
            }
            room.addAuditEntry(enabled ? 'ai_enabled' : 'ai_disabled', req.userId, 'recruiter');
        }

        if (permissions) {
            Object.assign(room.aiConfig.permissions, permissions);
        }

        await room.save();

        res.json({ success: true, data: room.aiConfig });
    } catch (error) {
        console.error('Error updating AI config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Generate Post-Interview Report ───
router.post('/:roomCode/report', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const reportGeneratorService = require('../services/ai/reportGeneratorService');
        const report = await reportGeneratorService.generateReport(req.params.roomCode);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Validate Post-Interview Report ───
router.put('/:roomCode/report/validate', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const reportGeneratorService = require('../services/ai/reportGeneratorService');
        const { decision, overrideScore, overrideRecommendation, comments, competencyOverrides } = req.body;

        const result = await reportGeneratorService.validateReport(
            req.params.roomCode,
            req.userId,
            { decision, overrideScore, overrideRecommendation, comments, competencyOverrides }
        );

        // If accepted or edited, trigger ATP update
        if ((decision === 'accepted' || decision === 'edited') && req.body.updateATP !== false) {
            try {
                const atpService = require('../services/aiTalentPassportService');
                const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });
                if (room && room.candidateId) {
                    await atpService.updateTalentPassport(room.candidateId);
                    room.addAuditEntry('atp_updated', req.userId, 'recruiter', {
                        decision,
                        overrideScore: overrideScore || null
                    });
                    await room.save();
                }
            } catch (atpErr) {
                console.log('[Report] ATP update skipped:', atpErr.message);
            }
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error validating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Add Integrity Signal ───
router.post('/:roomCode/integrity', userAuth, async (req, res) => {
    try {
        const { level, reason, details } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode });

        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found' });
        }

        room.integritySignals.push({
            level,
            reason,
            details,
            timestamp: new Date()
        });

        room.addAuditEntry('integrity_signal_changed', req.userId, 'system', { level, reason });
        await room.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error adding integrity signal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Reschedule Video Interview ───
router.put('/:roomCode/reschedule', userAuth, requireRole('recruiter'), async (req, res) => {
    try {
        const { scheduledAt, duration } = req.body;
        const room = await VideoRoom.findOne({ roomCode: req.params.roomCode, recruiterId: req.userId });
        if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
        if (room.status === 'completed') {
            return res.status(400).json({ success: false, error: 'Cannot reschedule a completed interview' });
        }

        room.scheduledAt = new Date(scheduledAt);
        if (duration) room.duration = duration;
        // Reset status back to scheduled
        room.status = 'scheduled';
        room.startedAt = null;
        room.addAuditEntry('room_created', req.userId, 'recruiter', {
            action: 'rescheduled', previousDate: room.scheduledAt, newDate: scheduledAt
        });
        await room.save();

        // Re-notify candidate
        try {
            const candidate = await User.findById(room.candidateId);
            const job = await Job.findById(room.jobId);
            const recruiter = await User.findById(req.userId);
            const Notification = require('../models/Notification');
            const roomLink = `/interview-room/${room.roomCode}`;

            await Notification.create({
                userId: room.candidateId,
                sender: req.userId,
                type: 'interview_reminder',
                title: 'Interview Rescheduled',
                message: `Your video interview for "${job?.title}" has been rescheduled to ${new Date(scheduledAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
                relatedEntity: { entityType: 'interview', entityId: room._id },
                actionUrl: roomLink,
                actionText: 'View Details',
                priority: 'high'
            });

            const { sendVideoInterviewInvitation } = require('../services/emailService');
            await sendVideoInterviewInvitation({
                candidateEmail: candidate?.email,
                candidateName: candidate?.profile?.name || 'Candidate',
                recruiterName: recruiter?.profile?.name || 'Recruiter',
                jobTitle: job?.title || 'Position',
                scheduledAt,
                duration: duration || room.duration,
                roomCode: room.roomCode,
                roomLink
            });

            const { getIO } = require('../config/socket');
            const io = getIO();
            io.to(room.candidateId.toString()).emit('receive_notification', {
                type: 'video_interview_rescheduled',
                title: 'Interview Rescheduled',
                message: `Your video interview has been rescheduled to ${new Date(scheduledAt).toLocaleDateString()}`,
                data: { roomCode: room.roomCode, scheduledAt, duration: duration || room.duration }
            });
        } catch (notifErr) {
            console.log('Reschedule notification error:', notifErr.message);
        }

        res.json({ success: true, data: room });
    } catch (error) {
        console.error('Error rescheduling:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;

