import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import InterviewDeclaration from '../../components/InterviewDeclaration';
import useFaceDetection from '../../hooks/useFaceDetection';
import './InterviewReadiness.css';



const InterviewReadiness = ({
    // Props for inline mode (platform interview)
    inline = false,
    onReady = null,  // Callback when readiness is complete
    onCancel = null, // Callback to cancel
    customInterviewId = null // Override interview ID
}) => {
    const params = useParams();
    const interviewId = customInterviewId || params.interviewId || 'platform-interview';
    const navigate = useNavigate();
    const toast = useToast();

    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const noiseCheckIntervalRef = useRef(null);
    const faceCheckIntervalRef = useRef(null);

    // State
    const [loading, setLoading] = useState(true);
    const [interview, setInterview] = useState(null);
    const [job, setJob] = useState(null);
    const [consentChecked, setConsentChecked] = useState(false);
    const [showDeclarationModal, setShowDeclarationModal] = useState(false);

    // System check states
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraStatus, setCameraStatus] = useState('idle');
    const [micStatus, setMicStatus] = useState('idle');
    const [micStream, setMicStream] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const [internetStatus, setInternetStatus] = useState('idle');
    const [latency, setLatency] = useState(null);

    // Noise detection
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [noiseStatus, setNoiseStatus] = useState('idle');
    const [isCheckingNoise, setIsCheckingNoise] = useState(false);

    // Face capture and detection
    const [faceStatus, setFaceStatus] = useState('idle'); // idle, detecting, captured, no-face
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [capturedImageData, setCapturedImageData] = useState(null);
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [captureCountdown, setCaptureCountdown] = useState(0);

    // AI Face Detection Hook
    const faceDetection = useFaceDetection(videoRef, cameraStatus === 'ready' && showCaptureModal);
    const { faceDetected, loading: modelsLoading } = faceDetection;

    useEffect(() => {
        fetchInterviewData();
        return () => cleanup();
    }, [interviewId]);

    const cleanup = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
        }
        if (noiseCheckIntervalRef.current) {
            clearInterval(noiseCheckIntervalRef.current);
        }
        if (faceCheckIntervalRef.current) {
            clearInterval(faceCheckIntervalRef.current);
        }
        // Only close AudioContext if it exists and isn't already closed
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
        }
    };

    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play().catch(() => { });
        }
    }, [cameraStream, showCaptureModal]);






    const fetchInterviewData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/interviews/${interviewId}`);
            const interviewData = response.data?.data || response.data;
            setInterview(interviewData);

            // Extract jobId - handles both populated object and string ID
            const jobId = typeof interviewData?.jobId === 'object'
                ? interviewData?.jobId?._id
                : interviewData?.jobId;

            if (jobId) {
                try {
                    const jobResponse = await api.get(`/jobs/${jobId}`);
                    setJob(jobResponse.data?.data || jobResponse.data);
                } catch (err) {
                    console.log('Could not fetch job data:', err.message);
                }
            }
        } catch (error) {
            console.error('Error fetching interview:', error);

            // SECURITY: If unauthorized or forbidden, redirect to landing/signup
            if (error.status === 401 || error.status === 403 || error.code === 'FORBIDDEN') {
                toast.error('Access denied. You do not have permission to view this interview.');
                navigate('/');
                return;
            }

            toast.error('Failed to load interview details');
        } finally {
            setLoading(false);
        }
    };

    // CAMERA TEST
    const testCamera = async () => {
        setCameraStatus('testing');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            setCameraStream(stream);
            setCameraStatus('ready');
            toast.success('Camera is working!');
        } catch (error) {
            console.error('Camera error:', error);
            setCameraStatus('error');
            toast.error('Camera access denied.');
        }
    };

    // MICROPHONE TEST
    const testMicrophone = async () => {
        setMicStatus('testing');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicStream(stream);

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            setMicStatus('ready');
            toast.success('Microphone is working!');
        } catch (error) {
            console.error('Microphone error:', error);
            setMicStatus('error');
            toast.error('Microphone access denied.');
        }
    };

    // NOISE CHECK
    const checkBackgroundNoise = useCallback(() => {
        if (!analyserRef.current) return;

        setIsCheckingNoise(true);
        setNoiseStatus('checking');

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let maxNoiseLevel = 0;
        let sampleCount = 0;
        const maxSamples = 30;

        noiseCheckIntervalRef.current = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const avg = sum / bufferLength;
            const normalizedLevel = Math.min(100, (avg / 128) * 100);

            setNoiseLevel(normalizedLevel);
            maxNoiseLevel = Math.max(maxNoiseLevel, normalizedLevel);
            sampleCount++;

            if (sampleCount >= maxSamples) {
                clearInterval(noiseCheckIntervalRef.current);
                setIsCheckingNoise(false);

                if (maxNoiseLevel < 15) {
                    setNoiseStatus('quiet');
                    toast.success('Environment is quiet!');
                } else {
                    setNoiseStatus('noisy');
                    toast.error(`Too noisy (${Math.round(maxNoiseLevel)}%). Find a quieter space.`);
                }
            }
        }, 100);
    }, []);

    // RECORD SAMPLE
    const startRecording = () => {
        if (!micStream) return;

        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(micStream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioURL(URL.createObjectURL(blob));
        };

        mediaRecorder.start();
        setIsRecording(true);

        setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
                setIsRecording(false);
            }
        }, 3000);
    };

    const playRecording = () => {
        if (audioURL) new Audio(audioURL).play();
    };

    // INTERNET TEST
    const testInternet = async () => {
        setInternetStatus('testing');
        try {
            const startTime = performance.now();
            await api.get('/health');
            const ping = Math.round(performance.now() - startTime);
            setLatency(ping);

            if (ping < 300) {
                setInternetStatus('ready');
                toast.success(`Connection stable: ${ping}ms`);
            } else if (ping < 1000) {
                setInternetStatus('slow');
                toast.warning(`Slow connection: ${ping}ms`);
            } else {
                setInternetStatus('error');
                toast.error('Connection too slow');
            }
        } catch (error) {
            setInternetStatus('error');
            toast.error('No internet connection');
        }
    };

    // FACE CAPTURE
    const openCaptureModal = () => {
        if (!cameraStream) {
            toast.error('Test camera first');
            return;
        }
        setShowCaptureModal(true);
        setFaceDetected(false);
    };

    const startCapture = () => {
        if (!faceDetected) {
            toast.error('No face detected. Position your face in the frame.');
            return;
        }

        setCaptureCountdown(3);
        const interval = setInterval(() => {
            setCaptureCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    capturePhoto();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        if (!faceDetected) {
            setFaceStatus('no-face');
            // Defer toast to avoid setState during render cycle
            setTimeout(() => toast.error('No face detected in photo. Please try again.'), 0);
            return;
        }

        const photoData = canvas.toDataURL('image/jpeg', 0.7); // Compress more (0.7 quality)
        setCapturedPhoto(photoData);
        setFaceStatus('captured');
        setShowCaptureModal(false);

        // Store only compressed photo for interview verification
        try {
            localStorage.setItem(`interview_${interviewId}_photo`, photoData);
        } catch (storageError) {
            console.warn('LocalStorage quota issue:', storageError);
        }

        // Defer toast to avoid setState during render cycle
        setTimeout(() => toast.success('Face captured successfully! Your identity will be verified during the interview.'), 0);
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
        setCapturedImageData(null);
        setFaceStatus('idle');
        localStorage.removeItem(`interview_${interviewId}_photo`);
        localStorage.removeItem(`interview_${interviewId}_imageData`);
    };

    // RUN ALL TESTS
    const runAllTests = async () => {
        await testCamera();
        await testMicrophone();
        await testInternet();
    };

    // Handle declaration acceptance
    const handleDeclarationAccept = (declarations) => {
        setConsentChecked(true);
        setShowDeclarationModal(false);
        toast.success('Declaration accepted. You can now start the interview.');
    };

    const handleDeclarationDecline = () => {
        setShowDeclarationModal(false);
        toast.info('You must accept the declaration to proceed.');
    };

    // Check requirements
    const allSystemsReady = cameraStatus === 'ready' &&
        micStatus === 'ready' &&
        (internetStatus === 'ready' || internetStatus === 'slow') &&
        (noiseStatus === 'quiet' || noiseStatus === 'idle') &&
        faceStatus === 'captured';

    const canStart = allSystemsReady && consentChecked;

    // Start interview
    const handleStartInterview = () => {
        cleanup();

        // If inline mode with callback, use callback instead of navigate
        if (inline && onReady) {
            onReady({
                capturedPhoto,
                capturedImageData,
                faceStatus,
                allSystemsReady
            });
        } else {
            navigate(`/interview/${interviewId}`);
        }
    };

    const pipelineRounds = job?.interviewPipeline?.rounds?.length > 0 ? job.interviewPipeline.rounds : null;

    if (loading) {
        return (
            <div className="readiness-page">
                <div className="readiness-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading interview details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="readiness-page">
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Photo Capture Modal */}
            {showCaptureModal && (
                <div className="capture-modal-overlay">
                    <div className="capture-modal">
                        <h3>Face Verification</h3>
                        <p>Position your face within the oval guide</p>

                        <div className="capture-preview">
                            <video ref={videoRef} autoPlay muted playsInline />
                            <div className={`face-outline ${faceDetected ? 'detected' : ''}`}></div>

                            {/* Face detection indicator */}
                            <div className={`face-status-indicator ${faceDetected ? 'detected' : 'not-detected'}`}>
                                {faceDetected ? (
                                    <><span className="status-dot green"></span> Face Detected</>
                                ) : (
                                    <><span className="status-dot red"></span> No Face Detected</>
                                )}
                            </div>

                            {captureCountdown > 0 && (
                                <div className="countdown">{captureCountdown}</div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowCaptureModal(false)}>
                                Cancel
                            </button>
                            <button
                                className={`capture-action-btn ${faceDetected ? '' : 'disabled'}`}
                                onClick={startCapture}
                                disabled={!faceDetected || captureCountdown > 0}
                            >
                                {captureCountdown > 0 ? `Capturing in ${captureCountdown}...` : 'Capture Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="readiness-header">
                <div className="header-left">
                    <h1>Interview Preparation</h1>
                    {job && <p className="job-info">{job.title} at {job.company?.name}</p>}
                </div>
                <button
                    className={`start-btn ${canStart ? 'active' : ''}`}
                    onClick={handleStartInterview}
                    disabled={!canStart}
                >
                    Start Interview
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>
            </header>

            {/* Main Content */}
            <div className="readiness-content">
                {/* Left Panel */}
                <div className="left-panel">
                    <section className="section guidelines-section">
                        <h2>Before You Begin</h2>
                        <p className="section-desc">This interview includes identity verification for integrity.</p>

                        <ul className="guidelines-list">
                            <li className="do">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" /></svg>
                                Answer naturally — there are no trick questions
                            </li>
                            <li className="do">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" /></svg>
                                Keep your face visible throughout the interview
                            </li>
                            <li className="do">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" /></svg>
                                Find a quiet, well-lit space
                            </li>
                            <li className="warning">
                                <svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2V8h2v5z" fill="currentColor" /></svg>
                                Your identity will be verified periodically during the interview
                            </li>
                            <li className="dont">
                                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" /></svg>
                                Don't switch tabs or have someone else take the interview
                            </li>
                        </ul>
                    </section>

                    <section className="section structure-section">
                        <h2>Interview Structure</h2>
                        {pipelineRounds ? (
                            <div className="pipeline-rounds">
                                {pipelineRounds.map((round, i) => (
                                    <div key={i} className="round-card">
                                        <span className="round-num">{round.roundNumber}</span>
                                        <div className="round-info">
                                            <strong>{round.title}</strong>
                                            <span>{round.description || `${round.roundType} questions`}</span>
                                        </div>
                                        {round.duration && <span className="round-time">{round.duration}m</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="default-structure">
                                <div className="struct-intro">
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0', textAlign: 'left' }}>
                                        Your interview rounds will be customized based on your resume and domain
                                    </p>
                                </div>
                                <div className="struct-items-row">
                                    <div className="struct-item">
                                        <div className="struct-icon tech">1</div>
                                        <div className="struct-info">
                                            <strong>Core Skills Assessment</strong>
                                            <span>Based on your domain expertise</span>
                                        </div>
                                    </div>
                                    <div className="struct-item">
                                        <div className="struct-icon behav">2</div>
                                        <div className="struct-info">
                                            <strong>Deep Dive / Scenario</strong>
                                            <span>Applied problem solving</span>
                                        </div>
                                    </div>
                                    <div className="struct-item">
                                        <div className="struct-icon situ">3</div>
                                        <div className="struct-info">
                                            <strong>HR & Communication</strong>
                                            <span>Soft skills & collaboration</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="coding-note" style={{ marginTop: '8px', padding: '12px 16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', fontSize: '0.85rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>💻</span>
                                    <span>Coding round will be added only if programming languages are detected in your resume</span>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="section consent-section">
                        <div className="declaration-prompt">
                            <div className="declaration-icon-text">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 12L11 14L15 10" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="12" cy="12" r="10" />
                                </svg>
                                <span className="declaration-label">
                                    {consentChecked ? (
                                        'Declaration Accepted ✓'
                                    ) : (
                                        'Complete Interview Declaration'
                                    )}
                                </span>
                            </div>
                            <button
                                className={`declaration-btn ${consentChecked ? 'accepted' : ''}`}
                                onClick={() => setShowDeclarationModal(true)}
                            >
                                {consentChecked ? 'View Declaration' : 'Read & Accept'}
                            </button>
                        </div>
                        {!consentChecked && (
                            <p className="declaration-note">
                                You must read and accept the interview declaration before starting.
                            </p>
                        )}
                    </section>
                </div>

                {/* Right Panel */}
                <div className="right-panel">
                    <div className="system-check-card">
                        <div className="card-header">
                            <h2>System Check</h2>
                            <button className="run-all-btn" onClick={runAllTests}>Run All Tests</button>
                        </div>

                        {/* Camera */}
                        <div className="check-item">
                            <div className="check-header">
                                <div className="check-icon">
                                    <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor" /></svg>
                                </div>
                                <span className="check-name">Camera</span>
                                <span className={`check-badge ${cameraStatus}`}>
                                    {cameraStatus === 'idle' ? 'Not Tested' : cameraStatus === 'testing' ? 'Testing...' : cameraStatus === 'ready' ? 'Ready' : 'Failed'}
                                </span>
                            </div>

                            <div className="camera-preview">
                                {cameraStatus === 'ready' && !capturedPhoto ? (
                                    <video ref={videoRef} autoPlay muted playsInline />
                                ) : capturedPhoto ? (
                                    <img src={capturedPhoto} alt="Your face" />
                                ) : (
                                    <div className="preview-placeholder">
                                        <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor" /></svg>
                                        <span>Camera preview</span>
                                    </div>
                                )}
                            </div>

                            {cameraStatus === 'ready' && !capturedPhoto && (
                                <button className="capture-btn" onClick={openCaptureModal}>
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="currentColor" /><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor" /></svg>
                                    Capture Face for Verification
                                </button>
                            )}

                            {capturedPhoto && (
                                <div className="photo-actions">
                                    <span className="verified-badge">
                                        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" /></svg>
                                        Face Verified
                                    </span>
                                    <button className="retake-btn" onClick={retakePhoto}>Retake</button>
                                </div>
                            )}

                            {faceStatus === 'no-face' && (
                                <p className="error-message">No face detected. Position yourself properly and try again.</p>
                            )}

                            {cameraStatus === 'idle' && (
                                <button className="test-btn" onClick={testCamera}>Test Camera</button>
                            )}
                        </div>

                        {/* Microphone */}
                        <div className="check-item">
                            <div className="check-header">
                                <div className="check-icon">
                                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="currentColor" /></svg>
                                </div>
                                <span className="check-name">Microphone</span>
                                <span className={`check-badge ${micStatus}`}>
                                    {micStatus === 'idle' ? 'Not Tested' : micStatus === 'testing' ? 'Testing...' : micStatus === 'ready' ? 'Ready' : 'Failed'}
                                </span>
                            </div>

                            {micStatus === 'ready' && (
                                <>
                                    <div className="mic-controls">
                                        <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={startRecording} disabled={isRecording}>
                                            {isRecording ? <><span className="rec-dot"></span>Recording...</> : 'Record Sample'}
                                        </button>
                                        {audioURL && <button className="play-btn" onClick={playRecording}><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>Play</button>}
                                    </div>

                                    <div className="noise-check">
                                        <div className="noise-header">
                                            <span>Background Noise</span>
                                            <span className={`noise-badge ${noiseStatus}`}>
                                                {noiseStatus === 'idle' ? 'Not Checked' : noiseStatus === 'checking' ? 'Checking...' : noiseStatus === 'quiet' ? 'Quiet' : 'Too Noisy'}
                                            </span>
                                        </div>
                                        {isCheckingNoise && <div className="noise-meter"><div className="noise-bar" style={{ width: `${noiseLevel}%` }}></div></div>}
                                        <button className={`noise-btn ${noiseStatus === 'noisy' ? 'retry' : ''}`} onClick={checkBackgroundNoise} disabled={isCheckingNoise}>
                                            {isCheckingNoise ? 'Listening...' : noiseStatus === 'noisy' ? 'Check Again' : 'Check Environment'}
                                        </button>
                                        {noiseStatus === 'noisy' && <p className="noise-warning">Find a quieter location.</p>}
                                    </div>
                                </>
                            )}

                            {micStatus === 'idle' && <button className="test-btn" onClick={testMicrophone}>Test Microphone</button>}
                        </div>

                        {/* Internet */}
                        <div className="check-item">
                            <div className="check-header">
                                <div className="check-icon">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor" /></svg>
                                </div>
                                <span className="check-name">Connection</span>
                                <span className={`check-badge ${internetStatus}`}>
                                    {internetStatus === 'idle' ? 'Not Tested' : internetStatus === 'testing' ? 'Testing...' : internetStatus === 'ready' ? `${latency}ms` : internetStatus === 'slow' ? `Slow (${latency}ms)` : 'Failed'}
                                </span>
                            </div>
                            <button className="test-btn" onClick={testInternet} disabled={internetStatus === 'testing'}>
                                {internetStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>

                        {/* Summary */}
                        <div className={`status-summary ${allSystemsReady ? 'ready' : 'pending'}`}>
                            {allSystemsReady ? (
                                <><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" /></svg>All systems ready</>
                            ) : (
                                <><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /></svg>Complete all checks</>
                            )}
                        </div>

                        {/* Checklist */}
                        <div className="requirement-checklist">
                            <div className={`req-item ${cameraStatus === 'ready' ? 'done' : ''}`}><span className="req-check">{cameraStatus === 'ready' ? '✓' : '○'}</span>Camera</div>
                            <div className={`req-item ${faceStatus === 'captured' ? 'done' : ''}`}><span className="req-check">{faceStatus === 'captured' ? '✓' : '○'}</span>Face captured</div>
                            <div className={`req-item ${micStatus === 'ready' ? 'done' : ''}`}><span className="req-check">{micStatus === 'ready' ? '✓' : '○'}</span>Microphone</div>
                            <div className={`req-item ${noiseStatus === 'quiet' ? 'done' : noiseStatus === 'noisy' ? 'warning' : ''}`}><span className="req-check">{noiseStatus === 'quiet' ? '✓' : noiseStatus === 'noisy' ? '!' : '○'}</span>Quiet</div>
                            <div className={`req-item ${internetStatus === 'ready' || internetStatus === 'slow' ? 'done' : ''}`}><span className="req-check">{internetStatus === 'ready' || internetStatus === 'slow' ? '✓' : '○'}</span>Internet</div>
                            <div className={`req-item ${consentChecked ? 'done' : ''}`}><span className="req-check">{consentChecked ? '✓' : '○'}</span>Consent</div>
                        </div>

                        <button className={`mobile-start-btn ${canStart ? 'active' : ''}`} onClick={handleStartInterview} disabled={!canStart}>
                            Start Interview
                        </button>
                    </div>
                </div>
            </div>

            {/* Interview Declaration Modal */}
            <InterviewDeclaration
                isOpen={showDeclarationModal}
                onAccept={handleDeclarationAccept}
                onDecline={handleDeclarationDecline}
            />
        </div>
    );
};

export default InterviewReadiness;
