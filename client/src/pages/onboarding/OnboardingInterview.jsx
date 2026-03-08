import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
import CodeIDE from '../../components/CodeIDE';
import InterviewProctor from '../../components/InterviewProctor';
import RoundInfoPage from '../../components/interview/RoundInfoPage';
import InterviewResultsPreview from '../../components/interview/InterviewResultsPreview';
import FeedbackModal from '../../components/FeedbackModal';
import useVoiceInterview from '../../hooks/useVoiceInterview';
import {
    Bot, Mic, Volume2, MessageSquare, SkipForward, CheckCircle2,
    Camera, RefreshCw, PartyPopper, Upload, Search, GripVertical,
    Send, Ear, CircleDot
} from 'lucide-react';
import './OnboardingInterview.css';

const OnboardingInterview = ({
    parsedResume,
    userId,
    desiredRole,
    experienceLevel,
    yearsOfExperience,
    jobDomains,
    onComplete,
    onSkip
}) => {
    const toast = useToast();
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const isMountedRef = useRef(true);

    // Video recording refs
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const interviewStartTimeRef = useRef(null);

    // Guards
    const isSubmittingRef = useRef(false);
    const isLoadingCodingRef = useRef(false);
    const isStartingRef = useRef(false);

    const [isRecording, setIsRecording] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    // Interview state
    const [interviewId, setInterviewId] = useState(null);
    const [pipelineConfig, setPipelineConfig] = useState(null);
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    // Round management
    const [showRoundInfo, setShowRoundInfo] = useState(false);
    const [currentRoundInfo, setCurrentRoundInfo] = useState(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [resetTrigger, setResetTrigger] = useState(0);

    // Coding test state
    const [showCodingTest, setShowCodingTest] = useState(false);
    const [codingProblem, setCodingProblem] = useState(null);
    const [codingResults, setCodingResults] = useState(null);
    const [loadingProblem, setLoadingProblem] = useState(false);

    // Camera drag state
    const [cameraPosition, setCameraPosition] = useState({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cameraRef = useRef(null);

    // Proctoring state
    const [proctoringEnabled, setProctoringEnabled] = useState(true);
    const [proctoringViolations, setProctoringViolations] = useState([]);
    const proctoringViolationsRef = useRef([]);
    const [finalViolations, setFinalViolations] = useState([]);
    const [showFeedback, setShowFeedback] = useState(false);

    // Resume context for voice AI
    const [resumeContext, setResumeContext] = useState(null);
    const [resumeSkills, setResumeSkills] = useState([]);

    // ─── Voice Interview Hook ────────────────────────────────
    const voiceMode = useVoiceInterview(
        interviewId,
        voiceEnabled,
        resetTrigger
    );

    // ─── Proctoring Handler ──────────────────────────────────
    const handleViolationLog = useCallback((violations) => {
        setProctoringViolations(() => {
            const violationsWithVideoTime = violations.map(v => ({
                ...v,
                videoTimestamp: interviewStartTimeRef.current
                    ? Math.max(0, Math.round((new Date(v.timestamp).getTime() - interviewStartTimeRef.current) / 1000))
                    : 0
            }));
            proctoringViolationsRef.current = violationsWithVideoTime;
            return violationsWithVideoTime;
        });
    }, []);

    // ─── Camera Functions ────────────────────────────────────
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraEnabled(false);
    };

    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' },
                audio: true // Audio needed for voice interview
            });
            if (!isMountedRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            streamRef.current = stream;
            await new Promise(resolve => setTimeout(resolve, 100));
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraEnabled(true);
            }
        } catch (error) {
            console.error('Camera init error:', error);
            setCameraEnabled(false);
        }
    };

    // ─── Video Recording ─────────────────────────────────────
    const startRecordingVideo = () => {
        if (!streamRef.current || mediaRecorderRef.current) return;
        try {
            recordedChunksRef.current = [];
            const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
            let mimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) { mimeType = type; break; }
            }
            const mediaRecorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
            mediaRecorder.ondataavailable = (event) => {
                if (event.data?.size > 0) recordedChunksRef.current.push(event.data);
            };
            mediaRecorder.start(1000);
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecordingVideo = () => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null); return;
            }
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                resolve(blob);
            };
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            setIsRecording(false);
        });
    };

    const uploadVideoToCloudinary = async (videoBlob, cheatingMarkers, intId = null) => {
        if (!videoBlob || videoBlob.size === 0) return null;
        try {
            setUploadingVideo(true);
            const formData = new FormData();
            formData.append('video', videoBlob, 'interview-recording.webm');
            formData.append('userId', userId);
            if (intId) formData.append('interviewId', intId);
            formData.append('cheatingMarkers', JSON.stringify(cheatingMarkers || []));
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/onboarding-interview/upload-video`, {
                method: 'POST', body: formData, credentials: 'include'
            });
            if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Video upload error:', error);
            return null;
        } finally {
            setUploadingVideo(false);
        }
    };

    const finalizeVideoRecording = async (violations = null, intId = null) => {
        try {
            setUploadingVideo(true);
            const videoBlob = await stopRecordingVideo();
            if (videoBlob?.size > 0) {
                const markers = violations || finalViolations || proctoringViolations;
                await uploadVideoToCloudinary(videoBlob, markers, intId || interviewId);
            }
        } catch (error) {
            console.error('Error finalizing video:', error);
        } finally {
            setUploadingVideo(false);
        }
    };

    // ─── Start Platform Interview ────────────────────────────
    useEffect(() => {
        startInterview();
    }, []);

    const startInterview = async () => {
        if (isStartingRef.current) return;
        isStartingRef.current = true;

        try {
            setLoading(true);
            const response = await api.post('/onboarding-interview/start-voice', {
                userId,
                parsedResume,
                desiredRole,
                experienceLevel,
                yearsOfExperience: yearsOfExperience || 0,
                jobDomains: jobDomains || []
            });

            if (response.success) {
                setInterviewId(response.interviewId);
                setPipelineConfig(response.pipelineConfig);
                setCurrentRoundIndex(response.currentRoundIndex || 0);
                setResumeContext(response.resumeContext);
                setResumeSkills(response.resumeSkills || []);
                interviewStartTimeRef.current = Date.now();

                // Show first round info page
                const firstRound = response.pipelineConfig?.rounds?.[0];
                if (firstRound) {
                    setCurrentRoundInfo({
                        roundNumber: 1,
                        displayName: firstRound.title,
                        roundType: firstRound.roundType,
                        description: `Round 1: ${firstRound.title}`,
                        tips: firstRound.roundType === 'technical'
                            ? ['Answer clearly and provide specific examples from your experience']
                            : ['Be genuine and share real experiences from your career'],
                        questionCount: firstRound.questionConfig?.questionCount || 8,
                        difficulty: experienceLevel === 'fresher' ? 'easy' : 'medium',
                        totalRounds: response.pipelineConfig.rounds.length,
                        isCodingRound: firstRound.roundType === 'coding'
                    });
                    setShowRoundInfo(true);
                }

                console.log('[PLATFORM] Interview started:', response.interviewId, 'Rounds:', response.pipelineConfig.rounds.length);
            } else {
                throw new Error('Failed to start platform interview');
            }
        } catch (error) {
            console.error('Failed to start interview:', error);
            toast.error('Failed to start interview. Please try again.');
            isStartingRef.current = false;
        } finally {
            setLoading(false);
        }
    };

    // ─── Camera Init (after round info dismissed) ────────────
    useEffect(() => {
        if (showRoundInfo) return;
        const timer = setTimeout(() => initCamera(), 500);
        return () => {
            clearTimeout(timer);
            if (showRoundInfo) stopCamera();
        };
    }, [showRoundInfo]);

    // Start video recording when camera enabled
    useEffect(() => {
        if (cameraEnabled && streamRef.current && !isRecording && !completed) {
            const timer = setTimeout(() => startRecordingVideo(), 500);
            return () => clearTimeout(timer);
        }
    }, [cameraEnabled, completed]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopCamera();
            if (mediaRecorderRef.current?.state !== 'inactive') {
                try { mediaRecorderRef.current?.stop(); } catch (e) { }
            }
        };
    }, []);

    // ─── Round Management ────────────────────────────────────
    const handleStartRound = () => {
        setShowRoundInfo(false);
        setCurrentRoundInfo(null);

        const currentRound = pipelineConfig?.rounds?.[currentRoundIndex];

        if (currentRound?.roundType === 'coding') {
            // Load coding problem for this round
            loadCodingProblem(currentRound.codingConfig);
        } else {
            // Start voice interview for this round
            setVoiceEnabled(true);
            setResetTrigger(currentRoundIndex);
        }
    };

    // Listen for voice interview round completion
    useEffect(() => {
        if (voiceMode.status === 'completed') {
            console.log('[PLATFORM] Voice round completed, advancing...');
            setVoiceEnabled(false);
            advanceToNextRound();
        }
    }, [voiceMode.status]);

    const advanceToNextRound = () => {
        const nextIndex = currentRoundIndex + 1;
        const totalRounds = pipelineConfig?.rounds?.length || 2;

        if (nextIndex >= totalRounds) {
            // All rounds done — submit interview for evaluation
            submitInterview();
            return;
        }

        // Show next round info
        const nextRound = pipelineConfig.rounds[nextIndex];
        setCurrentRoundIndex(nextIndex);

        setCurrentRoundInfo({
            roundNumber: nextIndex + 1,
            displayName: nextRound.title,
            roundType: nextRound.roundType,
            description: `Round ${nextIndex + 1}: ${nextRound.title}`,
            tips: nextRound.roundType === 'coding'
                ? ['You will be given a coding problem to solve', 'Focus on writing clean, working code']
                : nextRound.roundType === 'behavioral'
                    ? ['Share specific examples from your experience', 'Use the STAR method for behavioral answers']
                    : ['Demonstrate your technical depth', 'Explain your reasoning clearly'],
            questionCount: nextRound.questionConfig?.questionCount || 8,
            difficulty: nextRound.codingConfig?.difficulty || 'medium',
            totalRounds,
            isCodingRound: nextRound.roundType === 'coding'
        });
        setShowRoundInfo(true);
    };

    // ─── Coding Challenge ────────────────────────────────────
    const loadCodingProblem = async (codingConfig = null) => {
        if (isLoadingCodingRef.current) return;
        isLoadingCodingRef.current = true;
        setLoadingProblem(true);

        try {
            const primaryLanguage = codingConfig?.languages?.[0] || 'JavaScript';
            const response = await api.post('/code/generate-problem', {
                skills: resumeSkills,
                language: primaryLanguage,
                difficulty: codingConfig?.difficulty || 'easy'
            });

            if (response.success && response.problem) {
                setCodingProblem({
                    ...response.problem,
                    languageId: response.problem.languageId || 63
                });
                setShowCodingTest(true);
            } else {
                throw new Error('Failed to generate problem');
            }
        } catch (error) {
            console.error('Error loading coding problem:', error);
            toast.error('Could not load coding test. Skipping to next round.');
            advanceToNextRound();
        } finally {
            setLoadingProblem(false);
            isLoadingCodingRef.current = false;
        }
    };

    const handleCodingComplete = async (codingResult) => {
        setCodingResults(codingResult);
        setShowCodingTest(false);
        toast.success(`Coding test completed! Score: ${codingResult.score}/100`);
        advanceToNextRound();
    };

    const handleSkipCoding = () => {
        setShowCodingTest(false);
        setCodingResults({ skipped: true });
        toast.info('Coding test skipped.');
        advanceToNextRound();
    };

    // ─── Submit Interview ────────────────────────────────────
    const submitInterview = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitting(true);
        setVoiceEnabled(false);

        try {
            const formattedViolations = proctoringViolations.map(v => ({
                type: v.type,
                severity: v.severity,
                timestamp: v.timestamp,
                videoTimestamp: v.videoTimestamp || 0,
                description: v.message || `${v.type} detected`,
                duration: 5
            }));
            setFinalViolations(formattedViolations);

            const response = await api.post('/onboarding-interview/submit', {
                userId,
                interviewId,
                questionsAndAnswers: [], // Voice interview Q&A is stored server-side via socket
                parsedResume,
                desiredRole,
                proctoringFlags: formattedViolations,
                videoRecording: null,
                codingResults: codingResults || null
            });

            if (response.success) {
                setResults(response.data);
                toast.success('Interview submitted! Showing results...');
                await finalizeVideoRecording(formattedViolations, interviewId);
                stopCamera();
                setCompleted(true);
            } else {
                throw new Error(response.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Interview submission error:', error);
            toast.error('Failed to submit interview.');
            setResults({ pendingReview: true, feedback: 'Interview submission had issues.' });
            await finalizeVideoRecording();
            stopCamera();
            setCompleted(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinish = () => {
        stopCamera();
        onComplete({
            ...results,
            codingResults,
            proctoringViolations
        });
    };

    // ─── Camera Drag ─────────────────────────────────────────
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setCameraPosition({
                x: Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 200)),
                y: Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 150))
            });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Re-attach camera in coding mode
    useEffect(() => {
        if (showCodingTest && cameraEnabled && streamRef.current && videoRef.current) {
            const timer = setTimeout(() => {
                if (videoRef.current && streamRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                    videoRef.current.play().catch(() => { });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showCodingTest, cameraEnabled]);

    // ─── Derive current round info ───────────────────────────
    const currentRound = pipelineConfig?.rounds?.[currentRoundIndex] || {};
    const totalRounds = pipelineConfig?.rounds?.length || 2;

    // ════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════

    // Loading state
    if (loading) {
        return (
            <div className="onboarding-interview loading-state">
                <div className="loading-spinner"></div>
                <h2>Preparing Your Video Interview...</h2>
                <p>Building a personalized interview based on your resume and experience.</p>
            </div>
        );
    }

    // Round info page
    if (showRoundInfo && currentRoundInfo) {
        return (
            <RoundInfoPage
                roundNumber={currentRoundInfo.roundNumber}
                totalRounds={currentRoundInfo.totalRounds || totalRounds}
                displayName={currentRoundInfo.displayName}
                description={currentRoundInfo.description}
                tips={currentRoundInfo.tips}
                difficulty={currentRoundInfo.difficulty}
                questionCount={currentRoundInfo.questionCount}
                isCodingRound={currentRoundInfo.isCodingRound}
                onStartRound={handleStartRound}
            />
        );
    }

    // Loading coding problem
    if (loadingProblem) {
        return (
            <div className="onboarding-interview loading-state coding-prep">
                <div className="code-animation">
                    <div className="code-lines">
                        <span className="code-line" style={{ animationDelay: '0s' }}>{'function solve() {'}</span>
                        <span className="code-line" style={{ animationDelay: '0.3s' }}>{'  // Analyzing your skills...'}</span>
                        <span className="code-line" style={{ animationDelay: '0.6s' }}>{'  const challenge = generate();'}</span>
                        <span className="code-line" style={{ animationDelay: '0.9s' }}>{'  return personalize(challenge);'}</span>
                        <span className="code-line" style={{ animationDelay: '1.2s' }}>{'}'}</span>
                    </div>
                    <div className="cursor-blink">|</div>
                </div>
                <h2>Preparing Your Coding Challenge...</h2>
                <p>Creating a personalized problem based on your skills</p>
            </div>
        );
    }

    // Coding test
    if (showCodingTest && codingProblem) {
        return (
            <div className="onboarding-interview coding-mode">
                <div
                    ref={cameraRef}
                    className={`camera-section draggable coding-camera ${isDragging ? 'dragging' : ''}`}
                    style={{
                        position: 'fixed', right: '20px', bottom: '20px', zIndex: 1000,
                        ...(cameraPosition.x !== null && {
                            right: 'auto', left: cameraPosition.x, top: cameraPosition.y, bottom: 'auto'
                        })
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const rect = cameraRef.current.getBoundingClientRect();
                        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        setIsDragging(true);
                    }}
                >
                    <div className="camera-drag-handle"><GripVertical size={14} className="drag-icon" /></div>
                    <video ref={videoRef} autoPlay muted playsInline className={cameraEnabled ? 'active' : 'disabled'} />
                    {isRecording && <span className="recording-indicator" title="Recording">● REC</span>}
                    <InterviewProctor
                        videoRef={videoRef}
                        enabled={proctoringEnabled && cameraEnabled && !completed}
                        initialViolations={proctoringViolations}
                        onViolationLog={handleViolationLog}
                    />
                </div>
                <CodeIDE
                    language={codingProblem.language || 'JavaScript'}
                    languageId={codingProblem.languageId || 63}
                    problem={codingProblem}
                    onComplete={handleCodingComplete}
                    timeLimit={codingProblem.timeLimit || 25}
                />
            </div>
        );
    }

    // Results view
    if (completed && results) {
        return (
            <div className="interview-completion-page animate-fade-in">
                <div className="completion-banner success">
                    <div className="banner-icon"><CheckCircle2 size={28} /></div>
                    <div className="banner-content">
                        <h3>Interview Submitted Successfully</h3>
                        <p>Below are your <strong>AI Evaluation Results</strong>. You can now start applying for jobs!</p>
                    </div>
                </div>
                <InterviewResultsPreview results={results} onContinue={onComplete} />
            </div>
        );
    }

    // Default completion fallback
    if (completed) {
        return (
            <div className="interview-completion-page animate-fade-in">
                <div className="completion-content">
                    <div className="completion-icon"><PartyPopper size={48} /></div>
                    <h2>Interview Completed!</h2>
                    <p>Thank you for completing the interview.</p>
                    <p className="sub-text">Your responses have been submitted for review.</p>
                    <button className="btn btn-primary" onClick={onComplete}>Continue to Dashboard</button>
                </div>
            </div>
        );
    }

    // ─── MAIN VOICE INTERVIEW VIEW ───────────────────────────
    return (
        <div className={`onboarding-interview ${cameraEnabled ? 'camera-active' : ''}`}>
            {/* Top Bar */}
            <div className="interview-header">
                <div className="header-left">
                    <span className={`round-badge ${currentRound.roundType === 'behavioral' ? 'hr' : 'tech'}`}>
                        {currentRound.title || 'Interview Round'}
                    </span>
                    <span className="question-counter">
                        Turn {(voiceMode.status === 'ready' || voiceMode.status === 'connecting') ? '...' : '—'} of 8
                    </span>
                    <span className="round-counter">
                        Round {currentRoundIndex + 1} of {totalRounds}
                    </span>
                </div>
                <div className="header-right">
                    {voiceMode.status === 'connecting' && (
                        <span className="status-badge connecting">Connecting...</span>
                    )}
                    {voiceMode.status === 'ready' && (
                        <span className="status-badge ready">AI Ready</span>
                    )}
                </div>
            </div>

            {/* Main Content - Voice Interview */}
            <div className="interview-content">
                {/* Camera Section */}
                <div
                    ref={cameraRef}
                    className={`camera-section draggable ${isDragging ? 'dragging' : ''}`}
                    style={{
                        ...(cameraPosition.x !== null && {
                            right: 'auto', left: cameraPosition.x, top: cameraPosition.y
                        })
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const rect = cameraRef.current.getBoundingClientRect();
                        setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        setIsDragging(true);
                    }}
                >
                    <div className="camera-drag-handle">
                        <GripVertical size={14} className="drag-icon" />
                        <span className="drag-hint">Drag to move</span>
                    </div>
                    <video ref={videoRef} autoPlay muted playsInline className={cameraEnabled ? 'active' : 'disabled'} />
                    {!cameraEnabled && (
                        <div className="camera-placeholder">
                            <Camera size={24} />
                            <p>Camera unavailable</p>
                            <button className="camera-retry-btn" onClick={initCamera}><RefreshCw size={14} /> Retry</button>
                        </div>
                    )}
                    {isRecording && <span className="recording-indicator" title="Recording">● REC</span>}
                    <InterviewProctor
                        videoRef={videoRef}
                        enabled={proctoringEnabled && cameraEnabled && !completed}
                        initialViolations={proctoringViolations}
                        onViolationLog={handleViolationLog}
                    />
                </div>

                {/* AI Interviewer Voice Section */}
                <motion.div
                    className="question-card voice-interview-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* AI Avatar & Status */}
                    <div className="ai-interviewer-section">
                        <div className={`ai-avatar ${voiceMode.avatarState}`}>
                            <div className="avatar-ring">
                                <div className="avatar-icon">
                                    {voiceMode.avatarState === 'speaking' ? <Volume2 size={28} /> :
                                        voiceMode.avatarState === 'listening' ? <Ear size={28} /> :
                                            voiceMode.avatarState === 'thinking' ? <CircleDot size={28} className="pulse-icon" /> :
                                                <Bot size={28} />}
                                </div>
                            </div>
                            <span className="avatar-label">
                                {voiceMode.avatarState === 'speaking' ? 'AI Speaking...' :
                                    voiceMode.avatarState === 'listening' ? 'Listening to you...' :
                                        voiceMode.avatarState === 'thinking' ? 'Processing...' :
                                            voiceMode.status === 'connecting' ? 'Connecting...' : 'AI Interviewer'}
                            </span>
                        </div>

                        {/* Volume indicator when user is speaking */}
                        {voiceMode.avatarState === 'listening' && (
                            <div className="volume-indicator">
                                <div className="volume-bar" style={{ height: `${Math.min(100, voiceMode.volumeLevel)}%` }}></div>
                                <div className="volume-bar" style={{ height: `${Math.min(100, voiceMode.volumeLevel * 0.7)}%`, animationDelay: '0.1s' }}></div>
                                <div className="volume-bar" style={{ height: `${Math.min(100, voiceMode.volumeLevel * 1.2)}%`, animationDelay: '0.2s' }}></div>
                                <div className="volume-bar" style={{ height: `${Math.min(100, voiceMode.volumeLevel * 0.5)}%`, animationDelay: '0.15s' }}></div>
                                <div className="volume-bar" style={{ height: `${Math.min(100, voiceMode.volumeLevel * 0.9)}%`, animationDelay: '0.25s' }}></div>
                            </div>
                        )}
                    </div>

                    {/* Question Text Display */}
                    <div className="voice-question-display">
                        <div className="question-header">
                            <MessageSquare size={16} className="question-icon" />
                            <span className="question-label">AI Interviewer</span>
                            {voiceMode.avatarState === 'speaking' && (
                                <motion.button
                                    className="skip-audio-btn"
                                    onClick={voiceMode.skipAIPlayback}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <SkipForward size={14} /> Skip Audio
                                </motion.button>
                            )}
                        </div>
                        <p className="question-text voice-question-text">
                            {voiceMode.currentQuestionText || 'Waiting for AI interviewer...'}
                        </p>
                    </div>

                    {/* User Live Transcript */}
                    <div className={`user-transcript ${voiceMode.avatarState === 'listening' ? 'active' : ''}`}>
                        <div className="transcript-header">
                            <Mic size={14} className="transcript-icon" />
                            <span className="transcript-label">Your Response</span>
                            {voiceMode.avatarState === 'listening' && (
                                <span className="live-badge">LIVE</span>
                            )}
                        </div>
                        <p className="transcript-text">
                            {voiceMode.avatarState === 'listening' && voiceMode.liveTranscript
                                ? `"${voiceMode.liveTranscript}"`
                                : voiceMode.partialTranscript
                                    ? `"${voiceMode.partialTranscript}"`
                                    : voiceMode.avatarState === 'listening'
                                        ? 'Speak your answer... your response will appear here in real-time'
                                        : ''}
                        </p>
                    </div>

                    {/* Action Buttons (Moved inside card to ensure visibility) */}
                    <div className="voice-actions" style={{ minHeight: '56px', display: 'flex', justifyContent: 'center' }}>
                        {voiceMode.avatarState === 'listening' && (
                            <motion.button
                                className="btn-next voice-done-btn"
                                onClick={voiceMode.forceSilenceDetection}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Send size={18} /> Submit Answer
                            </motion.button>
                        )}
                        {voiceMode.avatarState === 'thinking' && (
                            <div className="processing-indicator">
                                <div className="loading-spinner small"></div>
                                <span>Processing your response...</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Submitting/Uploading Overlay */}
            {(submitting || uploadingVideo) && (
                <div className="submitting-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999, color: 'white'
                }}>
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
                        {uploadingVideo ? <><Upload size={20} style={{ marginRight: 8 }} /> Uploading interview recording...</> : <><Search size={20} style={{ marginRight: 8 }} /> Evaluating your responses...</>}
                    </p>
                </div>
            )}

            {showFeedback && (
                <FeedbackModal featureId="onboarding" onClose={() => setShowFeedback(false)} userId={userId} />
            )}
        </div>
    );
};

export default OnboardingInterview;
