const socketIO = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: function (origin, callback) {
                if (!origin) return callback(null, true);
                const domain = origin.toLowerCase();
                const isAllowed =
                    domain.includes('localhost') ||
                    domain.includes('127.0.0.1') ||
                    domain.includes('froscel.com') ||
                    domain.includes('vercel.app');

                if (isAllowed) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            },
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ New client connected:', socket.id);

        // Join user-specific room
        socket.on('join', (userId) => {
            console.log(`[Socket] User ${userId} joined with socket ${socket.id}`);
            if (!userId) {
                console.log('[Socket] join failed: userId is null/undefined');
                return;
            }
            socket.join(userId);
            socket.userId = userId; // Store userId on socket for disconnect handling

            // Broadcast that user is now online
            socket.broadcast.emit('user_online', { userId });

            // Log rooms
            const rooms = Array.from(socket.rooms);
            console.log(`[Socket] Socket ${socket.id} is now in rooms:`, rooms);
        });

        // Handle messaging
        socket.on('send_message', (data) => {
            io.to(data.recipientId).emit('receive_message', data);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            if (data.recipientId) {
                socket.to(data.recipientId).emit('user_typing', {
                    userId: data.userId,
                    conversationId: `${data.userId}-${data.recipientId}`
                });
            }
        });

        socket.on('stop_typing', (data) => {
            if (data.recipientId) {
                socket.to(data.recipientId).emit('user_stopped_typing', {
                    userId: data.userId,
                    conversationId: `${data.userId}-${data.recipientId}`
                });
            }
        });

        // Handle notifications
        socket.on('send_notification', (data) => {
            io.to(data.userId).emit('receive_notification', data);
        });

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);

            // Broadcast that user is now offline
            if (socket.userId) {
                socket.broadcast.emit('user_offline', { userId: socket.userId });
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

/* ═══════════════════════════════════════════════════════════════
   FROSCEL INTERVIEW ROOM™ — Video Room Socket Namespace
   WebRTC signaling, real-time collaboration, AI events
   ═══════════════════════════════════════════════════════════════ */

// Track active rooms
// { roomCode: { participants: Map<socketId, info>, waitingList: Map<socketId, info> } }
const activeRooms = new Map();

// This is initialized separately after the main socket setup
// Call setupVideoRoomNamespace(io) from server.js after initializeSocket
const setupVideoRoomNamespace = (io) => {
    const videoNs = io.of('/video-room');

    const getOrCreateRoom = (roomCode) => {
        if (!activeRooms.has(roomCode)) {
            activeRooms.set(roomCode, { participants: new Map(), waitingList: new Map() });
        }
        return activeRooms.get(roomCode);
    };

    // Evict stale connections for same userId across participants + waitingList
    const evictStaleConnections = (room, roomCode, userId, currentSocketId, socket) => {
        for (const [sid, p] of room.participants.entries()) {
            if (p.userId === userId && sid !== currentSocketId) {
                console.log(`[VideoRoom] Evicting stale participant: ${p.name} (${sid})`);
                room.participants.delete(sid);
                socket.to(roomCode).emit('participant-left', {
                    socketId: sid, name: p.name, userId: p.userId
                });
                const oldSocket = videoNs.sockets.get(sid);
                if (oldSocket) oldSocket.disconnect(true);
            }
        }
        for (const [sid, p] of room.waitingList.entries()) {
            if (p.userId === userId && sid !== currentSocketId) {
                console.log(`[VideoRoom] Evicting stale waiting entry: ${p.name} (${sid})`);
                room.waitingList.delete(sid);
                const oldSocket = videoNs.sockets.get(sid);
                if (oldSocket) oldSocket.disconnect(true);
            }
        }
    };

    videoNs.on('connection', (socket) => {
        console.log('[VideoRoom] ✅ Socket connected:', socket.id, 'transport:', socket.conn?.transport?.name);

        // ─────────────────────────────────────────────────
        // JOIN ROOM — Lobby / Waiting Room logic
        // Recruiters auto-join. Candidates go to waiting list.
        // ─────────────────────────────────────────────────
        socket.on('join-room', ({ roomCode, userId, role, name, accessToken }) => {
            console.log(`[VideoRoom] 🚪 ${name} (${role}) joining room ${roomCode}, socketId: ${socket.id}`);

            socket.join(roomCode);
            socket.roomCode = roomCode;
            socket.userId = userId;
            socket.userRole = role;
            socket.userName = name;

            const room = getOrCreateRoom(roomCode);
            evictStaleConnections(room, roomCode, userId, socket.id, socket);

            // Recruiters/panelists auto-admit
            if (role === 'recruiter' || role === 'panelist') {
                room.participants.set(socket.id, { userId, role, name, socketId: socket.id });

                console.log(`[VideoRoom] ✅ Auto-admitted ${name} (${role}). Room has ${room.participants.size} participants.`);

                // Notify others
                socket.to(roomCode).emit('participant-joined', {
                    userId, role, name, socketId: socket.id,
                    participantCount: room.participants.size
                });

                // Send existing participants to this joiner
                const existing = Array.from(room.participants.values())
                    .filter(p => p.socketId !== socket.id);
                socket.emit('room-participants', { participants: existing, roomCode });

                // Send any currently waiting candidates
                const waiting = Array.from(room.waitingList.values());
                if (waiting.length > 0) {
                    socket.emit('waiting-list-update', { waiting, roomCode });
                }
            } else {
                // Candidate goes to waiting list
                room.waitingList.set(socket.id, { userId, role, name, socketId: socket.id });
                console.log(`[VideoRoom] ⏳ ${name} added to waiting list. ${room.waitingList.size} waiting.`);

                // Tell the candidate they are in the lobby
                socket.emit('waiting-for-admission', {
                    roomCode,
                    message: 'Waiting for the host to let you in...',
                    position: room.waitingList.size
                });

                // Notify all recruiters/panelists that someone is waiting
                room.participants.forEach((p, sid) => {
                    if (p.role === 'recruiter' || p.role === 'panelist') {
                        videoNs.to(sid).emit('admission-request', {
                            socketId: socket.id,
                            userId, name, role,
                            waitingCount: room.waitingList.size
                        });
                    }
                });
            }
        });

        // ─────────────────────────────────────────────────
        // ADMIT PARTICIPANT — Recruiter admits a waiting candidate
        // ─────────────────────────────────────────────────
        socket.on('admit-participant', ({ roomCode, targetSocketId }) => {
            if (socket.userRole !== 'recruiter' && socket.userRole !== 'panelist') return;

            const room = activeRooms.get(roomCode);
            if (!room) return;

            const candidate = room.waitingList.get(targetSocketId);
            if (!candidate) {
                console.log(`[VideoRoom] Admit failed — socket ${targetSocketId} not in waiting list`);
                return;
            }

            // Move from waiting to participants
            room.waitingList.delete(targetSocketId);
            room.participants.set(targetSocketId, candidate);

            console.log(`[VideoRoom] ✅ ${candidate.name} admitted by ${socket.userName}. Room: ${room.participants.size} active, ${room.waitingList.size} waiting.`);

            // Tell the admitted candidate
            videoNs.to(targetSocketId).emit('admission-granted', {
                roomCode,
                message: `You have been admitted by ${socket.userName}`
            });

            // Send existing participants to the newly admitted candidate
            const existing = Array.from(room.participants.values())
                .filter(p => p.socketId !== targetSocketId);
            videoNs.to(targetSocketId).emit('room-participants', {
                participants: existing,
                roomCode
            });

            // Notify all other participants that this person joined
            const targetSocket = videoNs.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.to(roomCode).emit('participant-joined', {
                    userId: candidate.userId,
                    role: candidate.role,
                    name: candidate.name,
                    socketId: targetSocketId,
                    participantCount: room.participants.size
                });
            }

            // Update waiting list for all recruiters
            room.participants.forEach((p, sid) => {
                if (p.role === 'recruiter' || p.role === 'panelist') {
                    videoNs.to(sid).emit('waiting-list-update', {
                        waiting: Array.from(room.waitingList.values()),
                        roomCode
                    });
                }
            });
        });

        // ─────────────────────────────────────────────────
        // ADMIT ALL — Recruiter admits everyone in the waiting list
        // ─────────────────────────────────────────────────
        socket.on('admit-all', ({ roomCode }) => {
            if (socket.userRole !== 'recruiter' && socket.userRole !== 'panelist') return;

            const room = activeRooms.get(roomCode);
            if (!room || room.waitingList.size === 0) return;

            console.log(`[VideoRoom] ✅ Admitting ALL (${room.waitingList.size}) waiting participants by ${socket.userName}`);

            room.waitingList.forEach((candidate, targetSocketId) => {
                // Move to participants
                room.participants.set(targetSocketId, candidate);

                // Tell the admitted candidate
                videoNs.to(targetSocketId).emit('admission-granted', {
                    roomCode,
                    message: `You have been admitted by ${socket.userName}`
                });

                // Send existing participants to them
                const existing = Array.from(room.participants.values())
                    .filter(p => p.socketId !== targetSocketId);
                videoNs.to(targetSocketId).emit('room-participants', {
                    participants: existing,
                    roomCode
                });

                // Notify others
                const targetSocket = videoNs.sockets.get(targetSocketId);
                if (targetSocket) {
                    targetSocket.to(roomCode).emit('participant-joined', {
                        userId: candidate.userId,
                        role: candidate.role,
                        name: candidate.name,
                        socketId: targetSocketId,
                        participantCount: room.participants.size
                    });
                }
            });

            // Clear waiting list
            room.waitingList.clear();

            // Notify recruiters
            room.participants.forEach((p, sid) => {
                if (p.role === 'recruiter' || p.role === 'panelist') {
                    videoNs.to(sid).emit('waiting-list-update', {
                        waiting: [],
                        roomCode
                    });
                }
            });
        });

        // ─────────────────────────────────────────────────
        // DENY PARTICIPANT — Recruiter denies a waiting candidate
        // ─────────────────────────────────────────────────
        socket.on('deny-participant', ({ roomCode, targetSocketId }) => {
            if (socket.userRole !== 'recruiter' && socket.userRole !== 'panelist') return;

            const room = activeRooms.get(roomCode);
            if (!room) return;

            const candidate = room.waitingList.get(targetSocketId);
            if (!candidate) return;

            room.waitingList.delete(targetSocketId);
            console.log(`[VideoRoom] ❌ ${candidate.name} denied by ${socket.userName}`);

            // Notify the denied candidate
            videoNs.to(targetSocketId).emit('admission-denied', {
                roomCode,
                message: 'The host has declined your request to join'
            });

            // Update waiting list for recruiters
            room.participants.forEach((p, sid) => {
                if (p.role === 'recruiter' || p.role === 'panelist') {
                    videoNs.to(sid).emit('waiting-list-update', {
                        waiting: Array.from(room.waitingList.values()),
                        roomCode
                    });
                }
            });
        });

        // ─────────────────────────────────────────────────
        // ADMIT ALL — Recruiter admits all waiting candidates
        // ─────────────────────────────────────────────────
        socket.on('admit-all', ({ roomCode }) => {
            if (socket.userRole !== 'recruiter' && socket.userRole !== 'panelist') return;
            const room = activeRooms.get(roomCode);
            if (!room) return;

            const waitingEntries = Array.from(room.waitingList.entries());
            for (const [sid, candidate] of waitingEntries) {
                room.waitingList.delete(sid);
                room.participants.set(sid, candidate);

                videoNs.to(sid).emit('admission-granted', {
                    roomCode,
                    message: `You have been admitted by ${socket.userName}`
                });

                const existing = Array.from(room.participants.values())
                    .filter(p => p.socketId !== sid);
                videoNs.to(sid).emit('room-participants', { participants: existing, roomCode });

                const targetSocket = videoNs.sockets.get(sid);
                if (targetSocket) {
                    targetSocket.to(roomCode).emit('participant-joined', {
                        userId: candidate.userId, role: candidate.role,
                        name: candidate.name, socketId: sid,
                        participantCount: room.participants.size
                    });
                }
            }

            // Clear waiting list for recruiters
            room.participants.forEach((p, sid) => {
                if (p.role === 'recruiter' || p.role === 'panelist') {
                    videoNs.to(sid).emit('waiting-list-update', { waiting: [], roomCode });
                }
            });
        });

        // ─── WebRTC Signaling ───
        socket.on('offer', ({ to, offer }) => {
            videoNs.to(to).emit('offer', {
                from: socket.id,
                offer,
                userId: socket.userId,
                role: socket.userRole,
                name: socket.userName
            });
        });

        socket.on('answer', ({ to, answer }) => {
            videoNs.to(to).emit('answer', {
                from: socket.id,
                answer
            });
        });

        socket.on('ice-candidate', ({ to, candidate }) => {
            videoNs.to(to).emit('ice-candidate', {
                from: socket.id,
                candidate
            });
        });

        // ─── Media Control Events ───
        socket.on('toggle-audio', ({ roomCode, enabled }) => {
            socket.to(roomCode).emit('participant-audio-toggled', {
                userId: socket.userId,
                socketId: socket.id,
                enabled
            });
        });

        socket.on('toggle-video', ({ roomCode, enabled }) => {
            socket.to(roomCode).emit('participant-video-toggled', {
                userId: socket.userId,
                socketId: socket.id,
                enabled
            });
        });

        // ─── Screen Share ───
        socket.on('screen-share-start', ({ roomCode }) => {
            socket.to(roomCode).emit('screen-share-started', {
                userId: socket.userId,
                socketId: socket.id,
                name: socket.userName
            });
        });

        socket.on('screen-share-stop', ({ roomCode }) => {
            socket.to(roomCode).emit('screen-share-stopped', {
                userId: socket.userId,
                socketId: socket.id
            });
        });

        // ─── Admin Controls (Recruiter only) ───
        socket.on('admin-mute-participant', ({ roomCode, targetSocketId, muted }) => {
            // Only allow recruiter to admin-mute
            if (socket.userRole !== 'recruiter') return;
            console.log(`[VideoRoom] Admin ${socket.userName} ${muted ? 'muting' : 'unmuting'} socket ${targetSocketId}`);
            videoNs.to(targetSocketId).emit('admin-forced-mute', { muted });
            // Also broadcast the state change to all participants
            socket.to(roomCode).emit('participant-audio-toggled', {
                socketId: targetSocketId,
                enabled: !muted
            });
        });

        socket.on('admin-toggle-camera', ({ roomCode, targetSocketId, disabled }) => {
            if (socket.userRole !== 'recruiter') return;
            console.log(`[VideoRoom] Admin ${socket.userName} ${disabled ? 'disabling' : 'enabling'} camera for socket ${targetSocketId}`);
            videoNs.to(targetSocketId).emit('admin-forced-camera', { disabled });
            socket.to(roomCode).emit('participant-video-toggled', {
                socketId: targetSocketId,
                enabled: !disabled
            });
        });

        // ─── Recording Events ───
        socket.on('recording-start', ({ roomCode }) => {
            socket.to(roomCode).emit('recording-started', {
                startedBy: socket.userName
            });
        });

        socket.on('recording-stop', ({ roomCode }) => {
            socket.to(roomCode).emit('recording-stopped', {
                stoppedBy: socket.userName
            });
        });

        // ─── Chat Messages ───
        socket.on('chat-message', ({ roomCode, message, senderName, senderRole }) => {
            videoNs.to(roomCode).emit('chat-message', {
                message,
                senderName,
                senderRole,
                senderId: socket.userId,
                timestamp: new Date().toISOString()
            });
        });

        // ─── AI Co-Interviewer Events (Recruiter Only) ───
        socket.on('ai-suggestion', ({ roomCode, suggestion, type }) => {
            // Only send to recruiters and panelists, never to candidates
            const room = activeRooms.get(roomCode);
            if (room) {
                room.participants.forEach((participant, socketId) => {
                    if (participant.role === 'recruiter' || participant.role === 'panelist') {
                        videoNs.to(socketId).emit('ai-suggestion', {
                            suggestion,
                            type,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
        });

        socket.on('ai-suggestion-response', ({ roomCode, suggestionId, action, editedText }) => {
            // Log AI suggestion response (approve/reject/edit)
            videoNs.to(roomCode).emit('ai-suggestion-responded', {
                suggestionId,
                action,
                editedText,
                respondedBy: socket.userName,
                timestamp: new Date().toISOString()
            });
        });

        // ─── Integrity Signals (Recruiter Only) ───
        socket.on('integrity-update', ({ roomCode, level, reason, details }) => {
            const room = activeRooms.get(roomCode);
            if (room) {
                room.participants.forEach((participant, socketId) => {
                    if (participant.role === 'recruiter' || participant.role === 'panelist') {
                        videoNs.to(socketId).emit('integrity-update', {
                            level,
                            reason,
                            details,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
        });

        // ─── Transcript Events + AI Processing ───
        // Track room transcripts for AI analysis
        socket.on('transcript-update', ({ roomCode, text, speakerName, speakerRole }) => {
            const entry = {
                text,
                speakerName,
                speakerRole,
                speakerId: socket.userId,
                timestamp: new Date().toISOString()
            };

            // Broadcast to all
            videoNs.to(roomCode).emit('transcript-update', entry);

            // Store in room context
            const room = activeRooms.get(roomCode);
            if (room) {
                if (!room.transcript) room.transcript = [];
                room.transcript.push(entry);

                // Trigger AI analysis every ~4 candidate responses (async, non-blocking)
                if (speakerRole === 'candidate' && room.aiEnabled) {
                    const candidateCount = room.transcript.filter(t => t.speakerRole === 'candidate').length;
                    if (candidateCount % 4 === 0 && candidateCount > 0) {
                        _triggerAIAnalysis(videoNs, room, roomCode);
                    }
                }
            }
        });

        // ─── On-Demand AI Analysis (Recruiter triggers) ───
        socket.on('request-ai-analysis', async ({ roomCode, type, context }) => {
            if (socket.userRole !== 'recruiter' && socket.userRole !== 'panelist') return;

            const room = activeRooms.get(roomCode);
            if (!room) return;

            try {
                const videoAIService = require('../services/ai/videoAIService');

                let result;
                switch (type) {
                    case 'follow_up':
                        result = await videoAIService.generateFollowUpSuggestion({
                            transcript: room.transcript || [],
                            jobTitle: room.jobTitle || context?.jobTitle,
                            jobSkills: context?.jobSkills,
                            evaluationCriteria: context?.evaluationCriteria,
                            recentQuestion: context?.recentQuestion,
                            recentAnswer: context?.recentAnswer
                        });
                        _emitToRecruiters(videoNs, room, roomCode, 'ai-suggestion', {
                            suggestion: result.question || result.suggestion,
                            type: result.type || 'follow_up',
                            rationale: result.rationale,
                            targetCompetency: result.targetCompetency,
                            timestamp: new Date().toISOString()
                        });
                        break;

                    case 'contradictions':
                        result = await videoAIService.detectContradictions(room.transcript || []);
                        _emitToRecruiters(videoNs, room, roomCode, 'ai-contradiction-result', {
                            ...result,
                            timestamp: new Date().toISOString()
                        });
                        break;

                    case 'notes':
                        result = await videoAIService.generateLiveNotes({
                            transcript: room.transcript || [],
                            jobTitle: room.jobTitle || context?.jobTitle,
                            jobSkills: context?.jobSkills,
                            evaluationCriteria: context?.evaluationCriteria
                        });
                        _emitToRecruiters(videoNs, room, roomCode, 'ai-notes-generated', {
                            notes: result,
                            timestamp: new Date().toISOString()
                        });
                        break;

                    case 'summary':
                        result = await videoAIService.generateQuickSummary({
                            transcript: room.transcript || [],
                            jobTitle: room.jobTitle || context?.jobTitle,
                            duration: context?.duration,
                            integritySignals: room.integritySignals,
                            notes: context?.notes
                        });
                        _emitToRecruiters(videoNs, room, roomCode, 'ai-summary-generated', {
                            ...result,
                            timestamp: new Date().toISOString()
                        });
                        break;
                }
            } catch (error) {
                console.error('[VideoRoom] AI analysis error:', error.message);
                socket.emit('ai-error', { message: 'AI analysis failed', type });
            }
        });

        // ─── Integrity Check (Client reports behavioral data) ───
        socket.on('integrity-check', async ({ roomCode, behaviorData }) => {
            const room = activeRooms.get(roomCode);
            if (!room) return;

            try {
                const videoAIService = require('../services/ai/videoAIService');
                const result = await videoAIService.analyzeIntegritySignals(behaviorData);

                if (!room.integritySignals) room.integritySignals = [];
                room.integritySignals.push({ ...result, timestamp: new Date().toISOString() });

                // Only send to recruiters
                _emitToRecruiters(videoNs, room, roomCode, 'integrity-update', {
                    ...result,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('[VideoRoom] Integrity check error:', error.message);
            }
        });

        // ─── Set AI Config for Room ───
        socket.on('set-ai-config', ({ roomCode, aiEnabled, jobTitle, jobSkills }) => {
            const room = activeRooms.get(roomCode);
            if (room && (socket.userRole === 'recruiter' || socket.userRole === 'panelist')) {
                room.aiEnabled = aiEnabled;
                room.jobTitle = jobTitle;
                room.jobSkills = jobSkills;
                console.log(`[VideoRoom] AI config set for ${roomCode}: enabled=${aiEnabled}`);
            }
        });


        // ─── Whiteboard Sync ───
        socket.on('whiteboard-draw', ({ roomCode, drawData }) => {
            socket.to(roomCode).emit('whiteboard-draw', {
                drawData,
                drawnBy: socket.userId
            });
        });

        socket.on('whiteboard-clear', ({ roomCode }) => {
            socket.to(roomCode).emit('whiteboard-cleared', {
                clearedBy: socket.userName
            });
        });

        // ─── Code Editor Sync ───
        socket.on('code-change', ({ roomCode, code, language, cursorPosition }) => {
            socket.to(roomCode).emit('code-change', {
                code,
                language,
                cursorPosition,
                changedBy: socket.userId,
                changedByName: socket.userName
            });
        });

        socket.on('code-run-request', ({ roomCode, code, language }) => {
            videoNs.to(roomCode).emit('code-run-requested', {
                code,
                language,
                requestedBy: socket.userName
            });
        });

        // ─── End Call ───
        socket.on('end-call', ({ roomCode }) => {
            videoNs.to(roomCode).emit('call-ended', {
                endedBy: socket.userName,
                endedByRole: socket.userRole
            });
        });

        // ─── Disconnect ───
        socket.on('disconnect', () => {
            console.log('[VideoRoom] Socket disconnected:', socket.id);

            if (socket.roomCode) {
                const room = activeRooms.get(socket.roomCode);
                if (room) {
                    // 1. Check if they were an active participant
                    if (room.participants.has(socket.id)) {
                        room.participants.delete(socket.id);
                        socket.to(socket.roomCode).emit('participant-left', {
                            userId: socket.userId,
                            socketId: socket.id,
                            name: socket.userName,
                            role: socket.userRole,
                            participantCount: room.participants.size
                        });
                    }

                    // 2. Check if they were in the waiting list
                    if (room.waitingList.has(socket.id)) {
                        room.waitingList.delete(socket.id);
                        // Notify recruiters that a waiting participant left
                        room.participants.forEach((p, sid) => {
                            if (p.role === 'recruiter' || p.role === 'panelist') {
                                videoNs.to(sid).emit('waiting-list-update', {
                                    waiting: Array.from(room.waitingList.values()),
                                    roomCode: socket.roomCode
                                });
                            }
                        });
                    }

                    // Clean up empty rooms
                    if (room.participants.size === 0 && room.waitingList.size === 0) {
                        activeRooms.delete(socket.roomCode);
                    }
                }
            }
        });
    });

    return videoNs;
};

// ─── Helper: Emit only to recruiters/panelists in a room ───
function _emitToRecruiters(videoNs, room, roomCode, event, data) {
    if (!room || !room.participants) return;
    room.participants.forEach((participant, socketId) => {
        if (participant.role === 'recruiter' || participant.role === 'panelist') {
            videoNs.to(socketId).emit(event, data);
        }
    });
}

// ─── Helper: Auto-trigger AI analysis on transcript accumulation ───
async function _triggerAIAnalysis(videoNs, room, roomCode) {
    try {
        const videoAIService = require('../services/ai/videoAIService');

        // Generate follow-up suggestion
        const transcript = room.transcript || [];
        const lastCandidate = [...transcript].reverse().find(t => t.speakerRole === 'candidate');
        const lastRecruiter = [...transcript].reverse().find(t => t.speakerRole === 'recruiter');

        const suggestion = await videoAIService.generateFollowUpSuggestion({
            transcript,
            jobTitle: room.jobTitle,
            jobSkills: room.jobSkills,
            recentQuestion: lastRecruiter?.text,
            recentAnswer: lastCandidate?.text
        });

        _emitToRecruiters(videoNs, room, roomCode, 'ai-suggestion', {
            suggestion: suggestion.question || suggestion.suggestion,
            type: suggestion.type || 'follow_up',
            rationale: suggestion.rationale,
            targetCompetency: suggestion.targetCompetency,
            timestamp: new Date().toISOString(),
            auto: true
        });
    } catch (error) {
        console.error('[VideoRoom] Auto AI analysis error:', error.message);
    }
}

module.exports = { initializeSocket, getIO, setupVideoRoomNamespace };
