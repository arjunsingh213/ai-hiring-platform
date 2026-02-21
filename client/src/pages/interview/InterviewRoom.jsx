import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../services/api';
import './InterviewRoom.css';

/* ═══════════════════════════════════════════════════════════════
   FROSCEL INTERVIEW ROOM™ — Main Video Interview Component
   Enterprise-grade WebRTC video interview with AI co-interviewer
   ═══════════════════════════════════════════════════════════════ */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const InterviewRoom = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();

    // ── State ──
    const [roomData, setRoomData] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);

    // Media state
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Participants & streams
    const [participants, setParticipants] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [screenShareStreams, setScreenShareStreams] = useState(new Map()); // socketId → screen stream
    const [pinnedParticipant, setPinnedParticipant] = useState(null); // socketId or 'local'
    const [myDisplayName, setMyDisplayName] = useState('User');

    // Side panel
    const [activePanel, setActivePanel] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [notes, setNotes] = useState([]);
    const [noteInput, setNoteInput] = useState('');
    const [transcript, setTranscript] = useState([]);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [codeValue, setCodeValue] = useState('// Start coding here...\n');
    const [codeLang, setCodeLang] = useState('javascript');

    // End call modal
    const [showEndModal, setShowEndModal] = useState(false);

    // Timer
    const [elapsedTime, setElapsedTime] = useState(0);

    // ── Refs ──
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const screenShareRef = useRef(null); // screen share stream ref
    const peerConnectionsRef = useRef(new Map()); // socketId → RTCPeerConnection
    const screenPeerConnectionsRef = useRef(new Map()); // socketId → RTCPeerConnection for screen
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const timerRef = useRef(null);
    const chatEndRef = useRef(null);

    // ── Get user info ──
    const getUserInfo = useCallback(() => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        const userId = user._id || user.id || localStorage.getItem('userId');
        // Try to get name from room data participants first (most accurate)
        let name = 'User';
        if (roomData?.participants) {
            const me = roomData.participants.find(p => p.userId === userId || p.userId?._id === userId);
            if (me?.name) name = me.name;
        }
        if (name === 'User') {
            name = user.profile?.name || user.name || 'User';
        }
        return { userId, name, role: localStorage.getItem('userRole') || 'jobseeker' };
    }, [roomData]);

    // ── Format time ──
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // ═══ INITIALIZE ROOM ═══
    useEffect(() => {
        const initRoom = async () => {
            try {
                // 1. Fetch room data
                // NOTE: api interceptor already unwraps response.data, so result IS the JSON body
                const result = await api.get(`/video-rooms/${roomCode}`);
                // result = { success, data: roomDocument, userRole, accessToken }
                const roomDoc = result.data;   // The actual room document
                const myRole = result.userRole; // 'recruiter' | 'candidate' | 'panelist'
                setRoomData(roomDoc);
                setUserRole(myRole);
                setNotes(roomDoc?.notes || []);
                setTranscript(roomDoc?.transcript || []);
                console.log('[InterviewRoom] Room loaded, my role:', myRole, 'room status:', roomDoc?.status);

                // Extract current user's display name from room participants (DB name)
                const myUserId = JSON.parse(localStorage.getItem('user') || '{}')._id || localStorage.getItem('userId');
                const myParticipant = roomDoc?.participants?.find(
                    p => (p.userId === myUserId || p.userId?._id === myUserId)
                );
                const displayName = myParticipant?.name || JSON.parse(localStorage.getItem('user') || '{}').profile?.name || 'User';
                setMyDisplayName(displayName);
                console.log('[InterviewRoom] My display name:', displayName, 'role:', myRole, 'from', myParticipant ? 'room data' : 'localStorage');

                // 2. Get local media
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: 'user' },
                    audio: { echoCancellation: true, noiseSuppression: true }
                });
                localStreamRef.current = stream;
                // Attach immediately if ref is available
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.play().catch(() => { });
                }

                // 3. Join via API (result is already unwrapped by interceptor)
                const joinResult = await api.post(`/video-rooms/${roomCode}/join`);

                // 4. Connect socket — strip /api from API URL since socket namespace is on root
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const socketUrl = apiUrl.replace(/\/api\/?$/, '');
                console.log('[InterviewRoom] Connecting socket to:', `${socketUrl}/video-room`);

                const socket = io(`${socketUrl}/video-room`, {
                    transports: ['websocket', 'polling'],
                    withCredentials: true,
                    auth: {
                        token: localStorage.getItem('token'),
                        userId: myUserId,
                        role: myRole
                    }
                });
                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('[InterviewRoom] ✅ Socket connected, id:', socket.id);
                    socket.emit('join-room', {
                        roomCode,
                        userId: myUserId,
                        role: myRole,
                        name: displayName,
                        accessToken: joinResult.data?.accessToken || result.accessToken
                    });
                });

                socket.on('connect_error', (err) => {
                    console.error('[InterviewRoom] ❌ Socket connect error:', err.message, err);
                });

                socket.on('disconnect', (reason) => {
                    console.log('[InterviewRoom] ⚠️ Socket disconnected:', reason);
                });

                // Debug: log connection state after 2 seconds
                setTimeout(() => {
                    console.log('[InterviewRoom] Socket state after 2s:', {
                        connected: socket.connected,
                        id: socket.id,
                        nsp: socket.nsp
                    });
                }, 2000);

                // 5. Handle existing participants
                socket.on('room-participants', ({ participants: existing, roomCode: rc }) => {
                    console.log('[InterviewRoom] 📋 Received room-participants:', {
                        count: existing.length,
                        names: existing.map(p => p.name),
                        roomCode: rc
                    });
                    setParticipants(existing);
                    existing.forEach(p => {
                        console.log('[InterviewRoom] Creating peer connection for existing participant:', p.name);
                        createPeerConnection(p.socketId, true, p);
                    });
                });

                // 6. New participant joined
                socket.on('participant-joined', (participant) => {
                    console.log('[InterviewRoom] 🟢 Participant joined:', {
                        name: participant.name,
                        socketId: participant.socketId,
                        role: participant.role,
                        participantCount: participant.participantCount
                    });
                    setParticipants(prev => [...prev.filter(p => p.socketId !== participant.socketId), participant]);
                    createPeerConnection(participant.socketId, false, participant);
                });

                // 7. Participant left
                socket.on('participant-left', ({ socketId, name }) => {
                    console.log('[InterviewRoom] 🔴 Participant left:', name);
                    setParticipants(prev => prev.filter(p => p.socketId !== socketId));
                    const pc = peerConnectionsRef.current.get(socketId);
                    if (pc) { pc.close(); peerConnectionsRef.current.delete(socketId); }
                    setRemoteStreams(prev => { const n = new Map(prev); n.delete(socketId); return n; });
                });

                // 8. WebRTC signaling — with collision handling
                socket.on('offer', async ({ from, offer, userId, role, name }) => {
                    try {
                        let pc = peerConnectionsRef.current.get(from);
                        if (!pc) {
                            pc = createPeerConnection(from, false, { userId, role, name, socketId: from });
                        }

                        // Handle offer collision: if we already have a local offer pending,
                        // use "polite peer" pattern — lower socket ID yields
                        const isPolite = socket.id < from;
                        const offerCollision = pc.signalingState !== 'stable' && pc.signalingState !== 'closed';

                        if (offerCollision && !isPolite) {
                            console.log('[WebRTC] Ignoring offer collision (we are impolite peer)');
                            return;
                        }

                        if (offerCollision && isPolite) {
                            console.log('[WebRTC] Rolling back local offer (we are polite peer)');
                            await pc.setLocalDescription({ type: 'rollback' });
                        }

                        await pc.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit('answer', { to: from, answer });
                    } catch (err) {
                        console.error('[WebRTC] Offer handling error:', err.message);
                    }
                });

                socket.on('answer', async ({ from, answer }) => {
                    try {
                        const pc = peerConnectionsRef.current.get(from);
                        if (pc && pc.signalingState === 'have-local-offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(answer));
                        } else {
                            console.log('[WebRTC] Ignoring answer — state:', pc?.signalingState);
                        }
                    } catch (err) {
                        console.error('[WebRTC] Answer handling error:', err.message);
                    }
                });

                socket.on('ice-candidate', async ({ from, candidate }) => {
                    const pc = peerConnectionsRef.current.get(from);
                    if (pc && candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.error('[WebRTC] ICE candidate error:', err.message);
                        }
                    }
                });

                // 9. Media events
                socket.on('participant-audio-toggled', ({ socketId, enabled }) => {
                    setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, audioEnabled: enabled } : p));
                });

                socket.on('participant-video-toggled', ({ socketId, enabled }) => {
                    setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, videoEnabled: enabled } : p));
                });

                // 9b. Admin-forced mute/camera (recruiter can mute others)
                socket.on('admin-forced-mute', ({ muted }) => {
                    if (localStreamRef.current) {
                        const audioTrack = localStreamRef.current.getAudioTracks()[0];
                        if (audioTrack) {
                            audioTrack.enabled = !muted;
                            setAudioEnabled(!muted);
                        }
                    }
                });

                socket.on('admin-forced-camera', ({ disabled }) => {
                    if (localStreamRef.current) {
                        const videoTrack = localStreamRef.current.getVideoTracks()[0];
                        if (videoTrack) {
                            videoTrack.enabled = !disabled;
                            setVideoEnabled(!disabled);
                        }
                    }
                });

                // 9c. Screen share notification from other participant
                socket.on('screen-share-started', ({ userId: sharerUserId, socketId: sharerSocketId, name: sharerName }) => {
                    console.log('[InterviewRoom] Screen share started by:', sharerName);
                    setParticipants(prev => prev.map(p => p.socketId === sharerSocketId ? { ...p, isScreenSharing: true } : p));
                });

                socket.on('screen-share-stopped', ({ socketId: sharerSocketId }) => {
                    setParticipants(prev => prev.map(p => p.socketId === sharerSocketId ? { ...p, isScreenSharing: false } : p));
                });

                // 10. Chat
                socket.on('chat-message', (msg) => {
                    setChatMessages(prev => [...prev, msg]);
                });

                // 11. AI events (recruiter only)
                socket.on('ai-suggestion', (suggestion) => {
                    setAiSuggestions(prev => [suggestion, ...prev]);
                });

                // 12. Transcript
                socket.on('transcript-update', (entry) => {
                    setTranscript(prev => [...prev, entry]);
                });

                // 13. Code sync
                socket.on('code-change', ({ code, language }) => {
                    setCodeValue(code);
                    if (language) setCodeLang(language);
                });

                // 14. Call ended
                socket.on('call-ended', ({ endedBy }) => {
                    handleEndCallConfirmed(false);
                });

                // 15. Room status
                socket.on('room_status_changed', ({ status: newStatus }) => {
                    setRoomData(prev => prev ? { ...prev, status: newStatus } : prev);
                });

                setStatus('ready');

                // Start timer if room is live
                if (roomDoc?.status === 'live' && roomDoc?.startedAt) {
                    const elapsed = Math.floor((Date.now() - new Date(roomDoc.startedAt).getTime()) / 1000);
                    setElapsedTime(elapsed);
                }

            } catch (err) {
                console.error('[InterviewRoom] Init error:', err);
                setError(err.response?.data?.error || err.message || 'Failed to join room');
                setStatus('error');
            }
        };

        initRoom();

        return () => {
            // Cleanup
            if (socketRef.current) socketRef.current.disconnect();
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            peerConnectionsRef.current.forEach(pc => pc.close());
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [roomCode]);

    // ── Timer ──
    useEffect(() => {
        if (roomData?.status === 'live' || status === 'ready') {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [roomData?.status, status]);

    // ── Scroll chat ──
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ── Re-attach local video when ref becomes available after render ──
    useEffect(() => {
        if (status === 'ready' && localStreamRef.current && localVideoRef.current) {
            if (!localVideoRef.current.srcObject) {
                localVideoRef.current.srcObject = localStreamRef.current;
                localVideoRef.current.play().catch(() => { });
                console.log('[InterviewRoom] Re-attached local video to ref');
            }
        }
    }, [status]);

    // ═══ WEBRTC PEER CONNECTION ═══
    const createPeerConnection = (socketId, isInitiator, participantInfo) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(socketId, pc);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setRemoteStreams(prev => {
                const updated = new Map(prev);
                updated.set(socketId, remoteStream);
                return updated;
            });
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', {
                    to: socketId,
                    candidate: event.candidate
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE state for ${socketId}:`, pc.iceConnectionState);
        };

        // Create offer if initiator
        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    socketRef.current?.emit('offer', {
                        to: socketId,
                        offer: pc.localDescription
                    });
                })
                .catch(err => console.error('[WebRTC] Offer error:', err));
        }

        return pc;
    };

    // ═══ MEDIA CONTROLS ═══
    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudioEnabled(audioTrack.enabled);
                socketRef.current?.emit('toggle-audio', { roomCode, enabled: audioTrack.enabled });
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoEnabled(videoTrack.enabled);
                socketRef.current?.emit('toggle-video', { roomCode, enabled: videoTrack.enabled });
            }
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (isScreenSharing) {
                // Stop screen share — restore camera
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = stream.getVideoTracks()[0];
                peerConnectionsRef.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(videoTrack);
                });
                localStreamRef.current.getVideoTracks().forEach(t => t.stop());
                localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                localStreamRef.current.addTrack(videoTrack);
                if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
                setIsScreenSharing(false);
                socketRef.current?.emit('screen-share-stop', { roomCode });
            } else {
                // Start screen share
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                peerConnectionsRef.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(screenTrack);
                });
                screenTrack.onended = () => toggleScreenShare(); // Handle browser stop
                setIsScreenSharing(true);
                socketRef.current?.emit('screen-share-start', { roomCode });
            }
        } catch (err) {
            console.error('[ScreenShare]', err);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            socketRef.current?.emit('recording-stop', { roomCode });
        } else {
            const stream = localStreamRef.current;
            if (!stream) return;
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            recordedChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                // Upload to server (Cloudinary via backend)
                const formData = new FormData();
                formData.append('recording', blob, `interview-${roomCode}.webm`);
                try {
                    await api.post(`/video-rooms/${roomCode}/recording`, {
                        duration: elapsedTime,
                        format: 'webm'
                    });
                } catch (err) {
                    console.error('[Recording] Upload error:', err);
                }
            };
            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            socketRef.current?.emit('recording-start', { roomCode });
        }
    };

    // ═══ CHAT ═══
    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        socketRef.current?.emit('chat-message', {
            roomCode,
            message: chatInput.trim(),
            senderName: myDisplayName,
            senderRole: userRole
        });
        setChatInput('');
    };

    // ═══ NOTES ═══
    const addNote = async () => {
        if (!noteInput.trim()) return;
        try {
            await api.post(`/video-rooms/${roomCode}/notes`, {
                content: noteInput.trim(),
                type: 'manual'
            });
            setNotes(prev => [...prev, { content: noteInput.trim(), type: 'manual', createdBy: 'recruiter', timestamp: new Date() }]);
            setNoteInput('');
        } catch (err) {
            console.error('[Notes]', err);
        }
    };

    // ═══ END CALL ═══
    const handleEndCallConfirmed = async (sendUpdate = true) => {
        try {
            if (sendUpdate && userRole === 'recruiter') {
                await api.put(`/video-rooms/${roomCode}/status`, { status: 'completed' });
                socketRef.current?.emit('end-call', { roomCode });
            }
            // Stop all tracks
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            peerConnectionsRef.current.forEach(pc => pc.close());
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            socketRef.current?.disconnect();

            // Navigate back
            const userRoleNav = localStorage.getItem('userRole');
            if (userRoleNav === 'recruiter') {
                navigate('/recruiter/applications');
            } else {
                navigate('/jobseeker/dashboard');
            }
        } catch (err) {
            console.error('[EndCall]', err);
            navigate('/');
        }
    };

    // ═══ PANEL TOGGLE ═══
    const togglePanel = (panel) => {
        setActivePanel(prev => prev === panel ? null : panel);
    };

    // ═══ ADMIN CONTROLS (Recruiter only) ═══
    const adminMuteParticipant = (socketId, mute) => {
        socketRef.current?.emit('admin-mute-participant', {
            roomCode,
            targetSocketId: socketId,
            muted: mute
        });
        // Optimistic update
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, audioEnabled: !mute } : p));
    };

    const adminToggleCamera = (socketId, disable) => {
        socketRef.current?.emit('admin-toggle-camera', {
            roomCode,
            targetSocketId: socketId,
            disabled: disable
        });
        setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, videoEnabled: !disable } : p));
    };

    // ── Get grid class ──
    const getGridClass = () => {
        if (pinnedParticipant) return 'grid-pinned';
        const count = remoteStreams.size + 1; // +1 for local
        if (count === 1) return 'grid-1';
        if (count === 2) return 'grid-2';
        if (count === 3) return 'grid-3';
        return 'grid-4';
    };

    // ═══ RENDER ═══

    // Error state
    if (status === 'error') {
        return (
            <div className="interview-room">
                <div className="ir-waiting-screen">
                    <div style={{ fontSize: '48px' }}>⚠️</div>
                    <div className="ir-waiting-text">Unable to Join Room</div>
                    <div className="ir-waiting-subtext">{error}</div>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            marginTop: '16px', padding: '10px 24px', borderRadius: '8px',
                            border: 'none', background: '#6366f1', color: 'white',
                            fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (status === 'loading') {
        return (
            <div className="interview-room">
                <div className="ir-waiting-screen">
                    <div className="ir-waiting-spinner"></div>
                    <div className="ir-waiting-text">Joining Interview Room...</div>
                    <div className="ir-waiting-subtext">Setting up your camera and microphone</div>
                </div>
            </div>
        );
    }

    const userInfo = getUserInfo();

    return (
        <div className="interview-room">
            {/* ── Top Bar ── */}
            <div className="ir-topbar">
                <div className="ir-topbar-left">
                    <span className="ir-logo">Froscel™</span>
                    <div className="ir-room-info">
                        <span className="ir-room-code">{roomCode}</span>
                        <span className={`ir-room-status ${roomData?.status || 'waiting'}`}>
                            {roomData?.status === 'live' ? 'Live' : roomData?.status === 'waiting' ? 'Waiting' : 'Scheduled'}
                        </span>
                    </div>
                </div>
                <div className="ir-topbar-center">
                    <span className="ir-timer">⏱ {formatTime(elapsedTime)}</span>
                    {roomData?.duration && (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                            / {roomData.duration} min
                        </span>
                    )}
                </div>
                <div className="ir-topbar-right">
                    {userRole === 'recruiter' && (
                        <span className={`ir-integrity-badge ${roomData?.overallIntegrity || 'green'}`}>
                            {roomData?.overallIntegrity === 'green' ? '🟢' : roomData?.overallIntegrity === 'yellow' ? '🟡' : '🔴'}
                            {' '}{(roomData?.overallIntegrity || 'green').toUpperCase()}
                        </span>
                    )}
                    <span className="ir-participants-count">
                        👥 {participants.length + 1}
                    </span>
                </div>
            </div>

            {/* ── Main Area ── */}
            <div className="ir-main">
                {/* Video Area */}
                <div className="ir-video-area">
                    <div className={`ir-video-grid ${getGridClass()}`}>
                        {/* Local self-view — always visible */}
                        <div className={`ir-video-tile ${pinnedParticipant === 'local' ? 'pinned' : ''} ${pinnedParticipant && pinnedParticipant !== 'local' ? 'sidebar-tile' : ''}`}>
                            <video
                                ref={el => {
                                    localVideoRef.current = el;
                                    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                                        el.srcObject = localStreamRef.current;
                                        el.play().catch(() => { });
                                    }
                                }}
                                autoPlay playsInline muted className="mirror"
                            />
                            {!videoEnabled && (
                                <div className="ir-video-off-overlay">
                                    <div className="ir-avatar">{myDisplayName.charAt(0).toUpperCase()}</div>
                                </div>
                            )}
                            <div className="ir-video-name">
                                {myDisplayName} (You)
                                <span className="role-tag">{userRole === 'recruiter' ? 'Host' : 'Candidate'}</span>
                            </div>
                            <div className={`ir-mic-indicator ${audioEnabled ? 'active' : 'muted'}`}>
                                {audioEnabled ? '🎤' : '🔇'}
                            </div>
                            <button
                                className={`ir-pin-btn ${pinnedParticipant === 'local' ? 'pinned' : ''}`}
                                onClick={() => setPinnedParticipant(prev => prev === 'local' ? null : 'local')}
                                title={pinnedParticipant === 'local' ? 'Unpin' : 'Pin'}
                            >📌</button>
                        </div>

                        {/* Remote video tiles */}
                        {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
                            const participant = participants.find(p => p.socketId === socketId);
                            return (
                                <div key={socketId} className={`ir-video-tile ${pinnedParticipant === socketId ? 'pinned' : ''} ${pinnedParticipant && pinnedParticipant !== socketId ? 'sidebar-tile' : ''}`}>
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={el => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
                                    />
                                    {participant?.videoEnabled === false && (
                                        <div className="ir-video-off-overlay">
                                            <div className="ir-avatar">{(participant?.name || 'P').charAt(0).toUpperCase()}</div>
                                        </div>
                                    )}
                                    <div className="ir-video-name">
                                        {participant?.name || 'Participant'}
                                        <span className="role-tag">{participant?.role === 'recruiter' ? 'Host' : participant?.role === 'candidate' ? 'Candidate' : participant?.role || ''}</span>
                                    </div>
                                    <div className={`ir-mic-indicator ${participant?.audioEnabled === false ? 'muted' : 'active'}`}>
                                        {participant?.audioEnabled === false ? '🔇' : '🎤'}
                                    </div>
                                    <button
                                        className={`ir-pin-btn ${pinnedParticipant === socketId ? 'pinned' : ''}`}
                                        onClick={() => setPinnedParticipant(prev => prev === socketId ? null : socketId)}
                                        title={pinnedParticipant === socketId ? 'Unpin' : 'Pin'}
                                    >📌</button>
                                    {/* Recruiter admin controls on remote tiles */}
                                    {userRole === 'recruiter' && (
                                        <div className="ir-admin-controls">
                                            <button
                                                className="ir-admin-btn"
                                                onClick={() => adminMuteParticipant(socketId, participant?.audioEnabled !== false)}
                                                title={participant?.audioEnabled === false ? 'Unmute' : 'Mute'}
                                            >
                                                {participant?.audioEnabled === false ? '🔇' : '🎤'}
                                            </button>
                                            <button
                                                className="ir-admin-btn"
                                                onClick={() => adminToggleCamera(socketId, participant?.videoEnabled !== false)}
                                                title={participant?.videoEnabled === false ? 'Enable Camera' : 'Disable Camera'}
                                            >
                                                {participant?.videoEnabled === false ? '📷' : '📹'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Waiting message — non-blocking, shown below video */}
                    {participants.length === 0 && (
                        <div style={{
                            textAlign: 'center', padding: '16px',
                            color: 'rgba(255,255,255,0.5)', fontSize: '14px'
                        }}>
                            Waiting for other participant to join...
                            <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(255,255,255,0.3)' }}>
                                Room: <strong>{roomCode}</strong>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Side Panel ── */}
                {activePanel && (
                    <div className="ir-side-panel">
                        <div className="ir-panel-header">
                            <span className="ir-panel-title">
                                {activePanel === 'chat' && '💬 Chat'}
                                {activePanel === 'participants' && '👥 Participants'}
                                {activePanel === 'notes' && '📝 Notes'}
                                {activePanel === 'transcript' && '📄 Transcript'}
                                {activePanel === 'ai' && '🤖 AI Assistant'}
                                {activePanel === 'code' && '💻 Code Editor'}
                                {activePanel === 'whiteboard' && '🎨 Whiteboard'}
                            </span>
                            <button className="ir-panel-close" onClick={() => setActivePanel(null)}>✕</button>
                        </div>

                        <div className="ir-panel-body">
                            {/* Participants Panel */}
                            {activePanel === 'participants' && (
                                <div className="ir-participants-list">
                                    {/* Self */}
                                    <div className="ir-participant-item self">
                                        <div className="ir-participant-avatar" style={{ background: '#6366f1' }}>
                                            {myDisplayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ir-participant-info">
                                            <div className="ir-participant-name">
                                                {myDisplayName} <span className="ir-you-badge">(You)</span>
                                            </div>
                                            <div className="ir-participant-role">
                                                {userRole === 'recruiter' ? '👑 Host' : '👤 Candidate'}
                                            </div>
                                        </div>
                                        <div className="ir-participant-status online"></div>
                                    </div>

                                    {/* Remote Participants */}
                                    {participants.map((p) => (
                                        <div key={p.socketId} className="ir-participant-item">
                                            <div className="ir-participant-avatar" style={{ background: p.role === 'recruiter' ? '#6366f1' : '#10b981' }}>
                                                {(p.name || 'P').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ir-participant-info">
                                                <div className="ir-participant-name">{p.name || 'Participant'}</div>
                                                <div className="ir-participant-role">
                                                    {p.role === 'recruiter' ? '👑 Host' : '👤 Candidate'}
                                                </div>
                                            </div>
                                            <div className="ir-participant-status online"></div>
                                            {/* Admin controls for recruiter */}
                                            {userRole === 'recruiter' && (
                                                <div className="ir-participant-actions">
                                                    <button
                                                        className="ir-admin-btn-sm"
                                                        onClick={() => adminMuteParticipant(p.socketId, p.audioEnabled !== false)}
                                                        title={p.audioEnabled === false ? 'Unmute' : 'Mute'}
                                                    >
                                                        {p.audioEnabled === false ? '🔇' : '🎙️'}
                                                    </button>
                                                    <button
                                                        className="ir-admin-btn-sm"
                                                        onClick={() => adminToggleCamera(p.socketId, p.videoEnabled !== false)}
                                                        title={p.videoEnabled === false ? 'Enable Camera' : 'Disable Camera'}
                                                    >
                                                        {p.videoEnabled === false ? '📷' : '📹'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {participants.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontSize: '13px' }}>
                                            No other participants yet
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Chat Panel */}
                            {activePanel === 'chat' && (
                                <div className="ir-chat-messages">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`ir-chat-msg ${msg.senderId === userInfo.userId ? 'self' : 'other'}`}>
                                            {msg.senderId !== userInfo.userId && (
                                                <div className="ir-chat-msg-sender">{msg.senderName}</div>
                                            )}
                                            {msg.message}
                                            <div className="ir-chat-msg-time">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            )}

                            {/* Notes Panel (Recruiter only) */}
                            {activePanel === 'notes' && (
                                <div>
                                    {notes.map((note, i) => (
                                        <div key={i} className="ir-note-item">
                                            {note.competencyCategory && <div className="note-tag">{note.competencyCategory}</div>}
                                            <div className="note-text">{note.content}</div>
                                        </div>
                                    ))}
                                    {userRole === 'recruiter' && (
                                        <>
                                            <textarea
                                                className="ir-note-input"
                                                placeholder="Add a note..."
                                                value={noteInput}
                                                onChange={(e) => setNoteInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                                            />
                                            <button
                                                onClick={addNote}
                                                style={{
                                                    width: '100%', marginTop: '6px', padding: '8px',
                                                    borderRadius: '6px', border: 'none', background: '#6366f1',
                                                    color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                                }}
                                            >
                                                Save Note
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Transcript Panel */}
                            {activePanel === 'transcript' && (
                                <div>
                                    {transcript.map((entry, i) => (
                                        <div key={i} className="ir-transcript-entry">
                                            <div className="speaker">{entry.speakerName || entry.speakerRole}</div>
                                            <div className="text">{entry.text}</div>
                                            <div className="time">
                                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </div>
                                    ))}
                                    {transcript.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontSize: '13px' }}>
                                            Transcript will appear here as the conversation progresses
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Panel (Recruiter Only) */}
                            {activePanel === 'ai' && userRole === 'recruiter' && (
                                <div>
                                    {aiSuggestions.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0', fontSize: '13px' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                                            AI suggestions will appear here during the interview
                                        </div>
                                    ) : (
                                        aiSuggestions.map((s, i) => (
                                            <div key={i} className="ir-ai-suggestion">
                                                <div className="ir-ai-suggestion-header">
                                                    🤖 AI Suggestion • {s.type || 'follow-up'}
                                                </div>
                                                <div className="ir-ai-suggestion-text">{s.suggestion}</div>
                                                <div className="ir-ai-suggestion-actions">
                                                    <button className="ir-ai-btn approve" onClick={() => {
                                                        socketRef.current?.emit('ai-suggestion-response', {
                                                            roomCode, suggestionId: i, action: 'approved'
                                                        });
                                                    }}>✓ Use</button>
                                                    <button className="ir-ai-btn reject" onClick={() => {
                                                        socketRef.current?.emit('ai-suggestion-response', {
                                                            roomCode, suggestionId: i, action: 'rejected'
                                                        });
                                                    }}>✕ Skip</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Code Editor Panel */}
                            {activePanel === 'code' && (
                                <div className="ir-code-editor-container">
                                    <div className="ir-code-toolbar">
                                        <select
                                            className="ir-code-lang-select"
                                            value={codeLang}
                                            onChange={(e) => setCodeLang(e.target.value)}
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="typescript">TypeScript</option>
                                        </select>
                                        <button className="ir-code-run-btn" onClick={() => {
                                            socketRef.current?.emit('code-run-request', { roomCode, code: codeValue, language: codeLang });
                                        }}>
                                            ▶ Run
                                        </button>
                                    </div>
                                    <textarea
                                        className="ir-note-input"
                                        style={{ flex: 1, fontFamily: '"Fira Code", monospace', fontSize: '13px', minHeight: '300px' }}
                                        value={codeValue}
                                        onChange={(e) => {
                                            setCodeValue(e.target.value);
                                            socketRef.current?.emit('code-change', { roomCode, code: e.target.value, language: codeLang });
                                        }}
                                    />
                                </div>
                            )}

                            {/* Whiteboard Panel */}
                            {activePanel === 'whiteboard' && (
                                <div className="ir-whiteboard-container">
                                    <div className="ir-whiteboard-toolbar">
                                        <button className="ir-wb-tool-btn active" title="Pen">✏️</button>
                                        <button className="ir-wb-tool-btn" title="Eraser">🧹</button>
                                        <button className="ir-wb-tool-btn" onClick={() => {
                                            socketRef.current?.emit('whiteboard-clear', { roomCode });
                                        }} title="Clear">🗑️</button>
                                    </div>
                                    <canvas
                                        className="ir-whiteboard-canvas"
                                        width={320}
                                        height={400}
                                        style={{ width: '100%', height: '400px' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Chat input area */}
                        {activePanel === 'chat' && (
                            <div className="ir-chat-input-area">
                                <input
                                    className="ir-chat-input"
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                                />
                                <button className="ir-chat-send-btn" onClick={sendChatMessage}>➤</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Control Bar ── */}
            <div className="ir-controls">
                <button
                    className={`ir-control-btn ${!audioEnabled ? 'muted' : ''}`}
                    onClick={toggleAudio}
                    title={audioEnabled ? 'Mute' : 'Unmute'}
                >
                    {audioEnabled ? '🎤' : '🔇'}
                </button>
                <button
                    className={`ir-control-btn ${!videoEnabled ? 'muted' : ''}`}
                    onClick={toggleVideo}
                    title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                    {videoEnabled ? '📹' : '📷'}
                </button>
                <button
                    className={`ir-control-btn ${isScreenSharing ? 'active' : ''}`}
                    onClick={toggleScreenShare}
                    title="Screen Share"
                >
                    🖥️
                </button>

                {userRole === 'recruiter' && (
                    <button
                        className={`ir-control-btn ${isRecording ? 'recording-active' : ''}`}
                        onClick={toggleRecording}
                        title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                        {isRecording ? '⏹️' : '⏺️'}
                    </button>
                )}

                <div className="ir-controls-divider" />

                <button className={`ir-control-btn ${activePanel === 'participants' ? 'active' : ''}`} onClick={() => togglePanel('participants')} title="Participants">
                    👥
                </button>
                <button className={`ir-control-btn ${activePanel === 'chat' ? 'active' : ''}`} onClick={() => togglePanel('chat')} title="Chat">
                    💬
                </button>
                <button className={`ir-control-btn ${activePanel === 'code' ? 'active' : ''}`} onClick={() => togglePanel('code')} title="Code Editor">
                    💻
                </button>
                <button className={`ir-control-btn ${activePanel === 'whiteboard' ? 'active' : ''}`} onClick={() => togglePanel('whiteboard')} title="Whiteboard">
                    🎨
                </button>

                {userRole === 'recruiter' && (
                    <>
                        <div className="ir-controls-divider" />
                        <button className={`ir-control-btn ${activePanel === 'notes' ? 'active' : ''}`} onClick={() => togglePanel('notes')} title="Notes">
                            📝
                        </button>
                        <button className={`ir-control-btn ${activePanel === 'transcript' ? 'active' : ''}`} onClick={() => togglePanel('transcript')} title="Transcript">
                            📄
                        </button>
                        <button className={`ir-control-btn ${activePanel === 'ai' ? 'active' : ''}`} onClick={() => togglePanel('ai')} title="AI Assistant">
                            🤖
                        </button>
                    </>
                )}

                <div className="ir-controls-divider" />
                <button className="ir-control-btn-end" onClick={() => setShowEndModal(true)} title="End Call">
                    📞
                </button>
            </div>

            {/* ── End Call Modal ── */}
            {showEndModal && (
                <div className="ir-end-modal-overlay" onClick={() => setShowEndModal(false)}>
                    <div className="ir-end-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>End Interview?</h3>
                        <p>
                            {userRole === 'recruiter'
                                ? 'This will end the interview for all participants. The recording and transcript will be saved.'
                                : 'You will leave the interview room. The recruiter may continue the session.'}
                        </p>
                        <div className="ir-end-modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEndModal(false)}>Cancel</button>
                            <button className="end-btn" onClick={() => handleEndCallConfirmed(true)}>
                                {userRole === 'recruiter' ? 'End Interview' : 'Leave Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewRoom;
