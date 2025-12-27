import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
import CodeIDE from '../../components/CodeIDE';
import InterviewProctor from '../../components/InterviewProctor';
import './OnboardingInterview.css';

const OnboardingInterview = ({
    parsedResume,
    userId,
    desiredRole,
    onComplete,
    onSkip
}) => {
    const toast = useToast();
    const videoRef = useRef(null);
    const streamRef = useRef(null); // Track camera stream for proper cleanup

    // Video recording refs for admin review
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const interviewStartTimeRef = useRef(null);
    const videoUrlRef = useRef(null); // Store uploaded video URL

    // Guards to prevent duplicate API calls
    const isSubmittingRef = useRef(false);
    const isLoadingCodingRef = useRef(false);

    const [isRecording, setIsRecording] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    // Interview state
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes total interview timer
    const [cameraEnabled, setCameraEnabled] = useState(false);

    // Speech recognition
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState(''); // For real-time speech display
    const [speechSupported, setSpeechSupported] = useState(false);
    const recognitionRef = useRef(null);

    // Text-to-speech
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(false);

    // Coding test state
    const [showCodingTest, setShowCodingTest] = useState(false);
    const [codingProblem, setCodingProblem] = useState(null);
    const [detectedLanguages, setDetectedLanguages] = useState([]);
    const [codingResults, setCodingResults] = useState(null);
    const [loadingProblem, setLoadingProblem] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Draggable camera state
    const [cameraPosition, setCameraPosition] = useState({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cameraRef = useRef(null);

    // Proctoring state
    const [proctoringEnabled, setProctoringEnabled] = useState(true);
    const [isAutoFailed, setIsAutoFailed] = useState(false);

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setSpeechSupported(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                // IMPORTANT: Only process new results starting from resultIndex
                // This prevents duplication of earlier results
                let newFinalText = '';
                let interimText = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        newFinalText += result[0].transcript + ' ';
                    } else {
                        interimText += result[0].transcript;
                    }
                }

                // Show interim text for real-time feedback
                setTranscript(interimText);

                // Only append final text to answer (new text only)
                if (newFinalText.trim()) {
                    setAnswer(prev => prev + (prev ? ' ' : '') + newFinalText.trim());
                    setTranscript(''); // Clear interim after final result
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }

        if ('speechSynthesis' in window) {
            setTtsSupported(true);
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Mic start error", e);
            }
        }
    };

    // Load questions (start interview) on mount
    useEffect(() => {
        startInterview();
    }, []);

    // Detect programming languages from resume
    useEffect(() => {
        const detectLanguages = async () => {
            if (parsedResume?.skills && parsedResume.skills.length > 0) {
                try {
                    const response = await api.post('/code/detect-languages', {
                        skills: parsedResume.skills
                    });
                    if (response.success && response.languages?.length > 0) {
                        setDetectedLanguages(response.languages);
                        console.log('Detected programming languages:', response.languages);
                    }
                } catch (error) {
                    console.log('Language detection skipped:', error.message);
                }
            }
        };
        detectLanguages();
    }, [parsedResume]);


    // Timer effect
    useEffect(() => {
        if (!loading && !completed && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [loading, completed, timeLeft]);

    const speakQuestion = (text) => {
        if (!text || !ttsSupported) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Speak question when it changes
    useEffect(() => {
        if (questions[currentIndex] && ttsSupported && !completed) {
            speakQuestion(questions[currentIndex].question);
        }
    }, [currentIndex, questions, completed]);

    // Stop camera function - reusable for cleanup
    const stopCamera = () => {
        console.log('Stopping camera...');
        // Stop stream from ref first (most reliable)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('Track stopped:', track.kind);
            });
            streamRef.current = null;
        }
        // Also try from video element as backup
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraEnabled(false);
    };

    // Initialize camera
    useEffect(() => {
        // Small delay to ensure video element is mounted
        const timer = setTimeout(() => {
            initCamera();
        }, 500);
        return () => {
            clearTimeout(timer);
            stopCamera(); // Use robust cleanup function
        };
    }, []);

    const initCamera = async () => {
        try {
            console.log('Initializing camera...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' },
                audio: false
            });
            console.log('Camera stream obtained:', stream);

            // Store stream in ref for cleanup
            streamRef.current = stream;

            // Wait a moment for video element to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraEnabled(true);
                console.log('Camera enabled successfully');
            } else {
                console.log('Video ref not ready, retrying...');
                // Retry once more after a short delay
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        setCameraEnabled(true);
                        console.log('Camera enabled on retry');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Camera initialization error:', error.name, error.message);
            setCameraEnabled(false);
        }
    };

    // Start video recording when camera is enabled
    const startRecording = () => {
        if (!streamRef.current || mediaRecorderRef.current) return;

        try {
            recordedChunksRef.current = [];

            // Try to get supported mime type
            const mimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4'
            ];

            let mimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(streamRef.current, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onerror = (error) => {
                console.error('MediaRecorder error:', error);
            };

            mediaRecorder.start(1000); // Record in 1-second chunks
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            console.log('📹 Video recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    // Stop recording and return video blob
    const stopRecording = () => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, {
                    type: 'video/webm'
                });
                console.log('📹 Video recording stopped, size:', blob.size);
                resolve(blob);
            };

            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            setIsRecording(false);
        });
    };

    // Upload video to Cloudinary via backend
    const uploadVideoToCloudinary = async (videoBlob, cheatingMarkers) => {
        if (!videoBlob || videoBlob.size === 0) {
            console.log('No video to upload');
            return null;
        }

        try {
            setUploadingVideo(true);
            console.log('📤 Uploading video to Cloudinary...');

            const formData = new FormData();
            formData.append('video', videoBlob, 'interview-recording.webm');
            formData.append('userId', userId);
            formData.append('cheatingMarkers', JSON.stringify(cheatingMarkers || []));

            // Use same base URL pattern as the api service - VITE_API_URL already contains /api
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/onboarding-interview/upload-video`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Video uploaded successfully:', result.data?.url);
            return result.data;
        } catch (error) {
            console.error('Video upload error:', error);
            return null;
        } finally {
            setUploadingVideo(false);
        }
    };

    const [loadingNext, setLoadingNext] = useState(false);

    // Handle camera drag events
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            // Keep within viewport bounds
            const maxX = window.innerWidth - 200;
            const maxY = window.innerHeight - 150;
            setCameraPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
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

    // Start video recording when camera becomes enabled
    useEffect(() => {
        if (cameraEnabled && streamRef.current && !isRecording && !completed) {
            // Small delay to ensure stream is stable
            const timer = setTimeout(() => {
                startRecording();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [cameraEnabled, completed]);

    // Re-attach video stream when switching views (interview/coding test)
    // This ensures the camera stays visible when transitioning to coding mode
    useEffect(() => {
        if (showCodingTest && cameraEnabled && streamRef.current && videoRef.current) {
            // Small delay to ensure video element is mounted after view switch
            const timer = setTimeout(() => {
                if (videoRef.current && streamRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                    videoRef.current.play().catch(() => { });
                    console.log('Camera stream re-attached for coding test');
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showCodingTest, cameraEnabled]);

    // Start dynamic interview on mount
    useEffect(() => {
        startInterview();
    }, []);

    const startInterview = async () => {
        try {
            setLoading(true);
            const response = await api.post('/onboarding-interview/start', {
                parsedResume,
                desiredRole,
                experienceLevel: parsedResume?.experience?.length > 2 ? 'experienced' : 'fresher'
            });

            if (response.success && response.question) {
                setQuestions([response.question]);
                // Set interview start time for violation timestamps
                interviewStartTimeRef.current = Date.now();
                // Timer already set to 2700 (45 min) in initial state - no reset needed
            } else {
                throw new Error('Failed to start interview');
            }
        } catch (error) {
            console.error('Failed to start interview:', error);
            // Fallback to static if server fails
            setQuestions(getDefaultQuestions());
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAnswer = async (manualAnswer = null) => {
        const textToSubmit = (typeof manualAnswer === 'string') ? manualAnswer : answer;

        if (!textToSubmit.trim()) {
            toast.warning('Please provide an answer');
            return;
        }

        const currentQ = questions[currentIndex];
        setLoadingNext(true); // Show analyzing state

        try {
            // Call next endpoint which handles validation AND generation
            const response = await api.post('/onboarding-interview/next', {
                currentQuestion: currentQ,
                answer: textToSubmit.trim(),
                history: answers, // Send previous answers for context
                parsedResume,
                desiredRole,
                experienceLevel: parsedResume?.experience?.length > 2 ? 'experienced' : 'fresher'
            });

            if (response.success) {
                if (!response.valid) {
                    // Validation failed (Gibberish/Irrelevant)
                    toast.error(response.message || 'Please provide a valid, relevant answer.');
                    setLoadingNext(false);
                    return; // Stop here, let them retry
                }

                // Answer is valid
                const newAnswer = {
                    question: currentQ.question,
                    answer: textToSubmit.trim(),
                    category: currentQ.category,
                    round: currentQ.round,
                    timeSpent: 120 - timeLeft
                };

                const updatedAnswers = [...answers, newAnswer];
                setAnswers(updatedAnswers);
                setAnswer('');

                // HARD LIMIT: Stop at 10 questions (5 tech + 5 HR)
                // Check both answer count AND currentIndex to be safe
                // HARD LIMIT: Stop at question 10
                const nextIndex = currentIndex + 1;

                if (response.completed || updatedAnswers.length >= 10 || nextIndex >= 10) {
                    // Interview done - move to coding test or final evaluation
                    submitInterview(updatedAnswers);
                } else if (response.question && questions.length < 10) {
                    // Add next question and proceed (only if under limit)
                    setQuestions(prev => {
                        if (prev.length >= 10) return prev; // Safety check
                        return [...prev, response.question];
                    });
                    setCurrentIndex(nextIndex);
                    // DON'T reset timer - it's a total interview timer now
                } else {
                    // Safety fallback - submit if somehow we're at limit
                    submitInterview(updatedAnswers);
                }
            } else {
                toast.error('Failed to process answer. Please try again.');
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.error('Network error. Please try again.');
        } finally {
            setLoadingNext(false);
        }
    };

    const handleSkipQuestion = () => {
        handleSubmitAnswer("I don't know the answer to this question (Skipped).");
    };

    const submitInterview = async (allAnswers) => {
        // Guard against duplicate submissions
        if (isSubmittingRef.current) {
            console.log('[INTERVIEW] Submission already in progress, skipping duplicate');
            return;
        }
        isSubmittingRef.current = true;

        setSubmitting(true);
        try {
            // Calculate video timestamps for proctoring violations
            const interviewDuration = interviewStartTimeRef.current
                ? (Date.now() - interviewStartTimeRef.current) / 1000
                : 0;

            // Format proctoring violations with video timestamps
            const formattedViolations = proctoringViolations.map(v => {
                // Calculate video timestamp (seconds from start)
                const violationTime = new Date(v.timestamp).getTime();
                const startTime = interviewStartTimeRef.current || Date.now();
                const videoTimestamp = Math.max(0, (violationTime - startTime) / 1000);

                return {
                    type: v.type,
                    severity: v.severity,
                    timestamp: v.timestamp,
                    videoTimestamp: Math.round(videoTimestamp), // Seconds from video start
                    description: v.message || `${v.type} detected`,
                    duration: 5 // Default flag duration in seconds
                };
            });

            console.log('Submitting interview with violations:', formattedViolations.length);

            // Stop video recording and get the blob
            console.log('📹 Stopping video recording...');
            const videoBlob = await stopRecording();

            // Upload video to Cloudinary if we have a recording
            let videoData = null;
            if (videoBlob && videoBlob.size > 0) {
                console.log('📤 Uploading video, size:', videoBlob.size);
                toast.info('Uploading interview recording...');
                videoData = await uploadVideoToCloudinary(videoBlob, formattedViolations);
                if (videoData) {
                    videoUrlRef.current = videoData.url;
                    console.log('✅ Video uploaded:', videoData.url);
                }
            }

            const response = await api.post('/onboarding-interview/submit', {
                userId,
                questionsAndAnswers: allAnswers,
                parsedResume,
                desiredRole,
                // Include proctoring data for admin review
                proctoringFlags: formattedViolations,
                // Include video recording data
                videoRecording: videoData ? {
                    url: videoData.url,
                    secureUrl: videoData.secureUrl || videoData.url, // Admin page needs secureUrl
                    publicId: videoData.publicId,
                    duration: Math.round(interviewDuration),
                    format: videoData.format || 'webm',
                    fileSize: videoData.fileSize,
                    cheatingMarkers: formattedViolations.map(v => ({
                        timestamp: v.videoTimestamp,
                        type: v.type,
                        description: v.description,
                        duration: v.duration,
                        severity: v.severity
                    }))
                } : null
            });

            if (response.success) {
                // DON'T show actual results to candidate - just store internally
                setResults(response.data);

                // ALWAYS show coding test after interview
                toast.success('Interview complete! Preparing coding challenge...');
                loadCodingProblem();
            } else {
                throw new Error(response.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Interview submission error:', error);
            toast.error('Failed to submit interview. Proceeding to coding test.');
            setResults({ pendingReview: true, feedback: 'Interview submission had issues.' });

            // Still proceed to coding test
            loadCodingProblem();
        } finally {
            setSubmitting(false);
        }
    };

    // Load coding problem for the candidate
    const loadCodingProblem = async () => {
        // Guard against duplicate loads
        if (isLoadingCodingRef.current) {
            console.log('[CODING TEST] Problem loading already in progress, skipping duplicate');
            return;
        }
        isLoadingCodingRef.current = true;

        console.log('[CODING TEST] Starting loadCodingProblem...');
        console.log('[CODING TEST] Detected languages:', detectedLanguages);

        setLoadingProblem(true);
        try {
            // Use detected language or fallback to JavaScript
            const primaryLanguage = detectedLanguages[0] || { name: 'JavaScript', judge0Id: 63 };
            console.log('[CODING TEST] Primary language:', primaryLanguage);

            const requestData = {
                skills: parsedResume?.skills || [],
                language: primaryLanguage?.name || 'JavaScript',
                difficulty: 'easy'
            };
            console.log('[CODING TEST] Request data:', requestData);

            const response = await api.post('/code/generate-problem', requestData);
            console.log('[CODING TEST] Response:', response);

            if (response.success && response.problem) {
                console.log('[CODING TEST] Problem generated successfully:', response.problem.title);
                setCodingProblem({
                    ...response.problem,
                    languageId: primaryLanguage?.judge0Id || 63 // JavaScript fallback
                });
                setShowCodingTest(true);
            } else {
                console.error('[CODING TEST] Response missing success or problem:', response);
                throw new Error('Failed to generate problem');
            }
        } catch (error) {
            console.error('[CODING TEST] Error loading coding problem:', error);
            console.error('[CODING TEST] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast.error('Could not load coding test. Skipping to results.');
            setCompleted(true);
        } finally {
            setLoadingProblem(false);
        }
    };

    // Handle coding test completion
    const handleCodingComplete = (codingResult) => {
        setCodingResults(codingResult);
        setShowCodingTest(false);

        // Update results with coding score
        setResults(prev => ({
            ...prev,
            codingScore: codingResult.score,
            codingPassed: codingResult.testsPassed,
            codingLanguage: codingResult.language
        }));

        // Stop camera when interview is complete
        stopCamera();

        toast.success(`Coding test completed! Score: ${codingResult.score}/100`);
        setCompleted(true);
    };

    // Skip coding test
    const handleSkipCoding = () => {
        setShowCodingTest(false);
        setCodingResults({ skipped: true });

        // Stop camera when interview is complete
        stopCamera();

        toast.info('Coding test skipped.');
        setCompleted(true);
    };

    const handleFinish = () => {
        // Stop camera when finishing interview
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            setCameraEnabled(false);
        }
        onComplete({
            ...results,
            codingResults,
            proctoringViolations // Include violations in final report for admin
        });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Proctoring state - store violations for final evaluation
    const [proctoringViolations, setProctoringViolations] = useState([]);
    const [violationReport, setViolationReport] = useState(null);

    // Handle proctoring violations (log-only, no termination)
    const handleViolationLog = (violations, getReport) => {
        setProctoringViolations(violations);
        if (getReport) {
            setViolationReport(getReport());
        }
    };

    const currentQ = questions[currentIndex];
    const progress = questions.length > 0 ? ((currentIndex + 1) / 10) * 100 : 0; // Fixed to 10 max
    // Questions 1-5 (index 0-4) are Technical, Questions 6-10 (index 5-9) are HR
    const isHRRound = currentIndex >= 5;

    if (loading) {
        return (
            <div className="onboarding-interview loading-state">
                <div className="loading-spinner"></div>
                <h2>Generating Your Personalized Interview...</h2>
                <p>Based on your resume, we're creating tailored questions just for you.</p>
            </div>
        );
    }

    // Show loading state when generating coding problem
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
                <h2>🧑‍💻 Preparing Your Coding Challenge...</h2>
                <p>Creating a personalized problem for <strong>{detectedLanguages[0]?.name || 'programming'}</strong></p>
                <div className="skill-tags">
                    {detectedLanguages.slice(0, 4).map((lang, i) => (
                        <span key={i} className="skill-tag">{lang.name}</span>
                    ))}
                </div>
            </div>
        );
    }

    // Show coding IDE if coding test is active
    if (showCodingTest && codingProblem) {
        return (
            <div className="onboarding-interview coding-mode">
                {/* Floating Camera during Coding Challenge - positioned at corner */}
                <div
                    ref={cameraRef}
                    className={`camera-section draggable coding-camera ${isDragging ? 'dragging' : ''}`}
                    style={{
                        position: 'fixed',
                        right: '20px',
                        bottom: '20px',
                        zIndex: 1000,
                        ...(cameraPosition.x !== null && {
                            right: 'auto',
                            left: cameraPosition.x,
                            top: cameraPosition.y,
                            bottom: 'auto'
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
                        <span className="drag-icon">⋮⋮</span>
                    </div>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={cameraEnabled ? 'active' : 'disabled'}
                    />
                    {isRecording && (
                        <span className="recording-indicator" title="Recording in progress">
                            ● REC
                        </span>
                    )}
                    {/* Proctoring during coding */}
                    <InterviewProctor
                        videoRef={videoRef}
                        enabled={proctoringEnabled && cameraEnabled && !completed}
                        onViolationLog={handleViolationLog}
                    />
                </div>

                {/* CodeIDE Component - Full Screen */}
                <CodeIDE
                    language={codingProblem.language || detectedLanguages[0]?.name || 'JavaScript'}
                    languageId={codingProblem.languageId || detectedLanguages[0]?.judge0Id || 63}
                    problem={codingProblem}
                    onComplete={handleCodingComplete}
                    onSkip={handleSkipCoding}
                    timeLimit={codingProblem.timeLimit || 15}
                />
            </div>
        );
    }

    if (completed && results) {
        // Show "Pending Review" message instead of actual scores
        // Candidate should NOT see their results until admin approves
        return (
            <div className="onboarding-interview results-state">
                <div className="results-card pending-review">
                    {/* Pending Review Icon */}
                    <div className="pending-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>

                    <h2>🎯 Interview Submitted Successfully!</h2>
                    <p className="pending-message">
                        Your interview has been submitted and is now being reviewed by our team.
                    </p>

                    {/* What happens next */}
                    <div className="next-steps-card">
                        <h4>📋 What Happens Next?</h4>
                        <ul className="next-steps-list">
                            <li>
                                <span className="step-icon">👀</span>
                                <span>Our team will review your responses within 24-48 hours</span>
                            </li>
                            <li>
                                <span className="step-icon">📧</span>
                                <span>You'll receive an email notification with your results</span>
                            </li>
                            <li>
                                <span className="step-icon">✅</span>
                                <span>Once approved, you'll be able to apply to jobs on our platform</span>
                            </li>
                        </ul>
                    </div>

                    {/* Coding test completion note if applicable */}
                    {codingResults && !codingResults.skipped && (
                        <div className="coding-submitted-note">
                            <span className="note-icon">💻</span>
                            <span>Coding challenge also submitted for review</span>
                        </div>
                    )}

                    {/* Proctoring note if violations were detected */}
                    {proctoringViolations.length > 0 && (
                        <div className="proctoring-note">
                            <span className="note-icon">📝</span>
                            <span>Your session included {proctoringViolations.length} activity flag(s) which will be reviewed</span>
                        </div>
                    )}

                    <button className="btn-primary finish-btn" onClick={handleFinish}>
                        Continue to Dashboard →
                    </button>

                    <p className="support-text">
                        Questions? Contact <a href="mailto:support@aihiring.com">support@aihiring.com</a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="onboarding-interview">
            {/* Header */}
            <div className="interview-header">
                <div className="header-left">
                    <span className={`round-badge ${isHRRound ? 'hr' : 'tech'}`}>
                        {isHRRound ? 'HR Round' : 'Technical Round'}
                    </span>
                    <span className="question-counter">
                        Question {Math.min(currentIndex + 1, 10)} of 10
                    </span>
                </div>
                <div className="header-right">
                    <span className={`timer ${timeLeft < 30 ? 'warning' : ''}`}>
                        ⏱️ {formatTime(timeLeft)}
                    </span>
                    <button className="skip-interview-btn" onClick={() => {
                        if (onSkip && typeof onSkip === 'function') {
                            onSkip();
                        } else {
                            // Fallback if onSkip not provided
                            stopCamera();
                            toast.info('Interview skipped. You can take it later from your dashboard.');
                            window.location.href = '/jobseeker/home';
                        }
                    }}>
                        Skip Interview
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Main content */}
            <div className="interview-content">
                {/* Draggable Camera preview */}
                <div
                    ref={cameraRef}
                    className={`camera-section draggable ${isDragging ? 'dragging' : ''}`}
                    style={{
                        ...(cameraPosition.x !== null && {
                            right: 'auto',
                            left: cameraPosition.x,
                            top: cameraPosition.y
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
                        <span className="drag-icon">⋮⋮</span>
                        <span className="drag-hint">Drag to move</span>
                    </div>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={cameraEnabled ? 'active' : 'disabled'}
                    />
                    {!cameraEnabled && (
                        <div className="camera-placeholder">
                            <span>📷</span>
                            <p>Camera unavailable</p>
                            <button
                                className="camera-retry-btn"
                                onClick={initCamera}
                            >
                                🔄 Retry
                            </button>
                        </div>
                    )}

                    {/* Proctoring Component - Log Only Mode */}
                    <InterviewProctor
                        videoRef={videoRef}
                        enabled={proctoringEnabled && cameraEnabled && !completed}
                        onViolationLog={handleViolationLog}
                    />
                </div>

                {/* Question Card - Full Width Expanded */}
                <motion.div
                    className="question-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="question-header">
                        <span className="question-icon">💭</span>
                        <span className="question-label">Interview Question</span>
                        {ttsSupported && (
                            <motion.button
                                className="repeat-btn"
                                onClick={() => speakQuestion(currentQ?.question)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                🔄 Repeat
                            </motion.button>
                        )}
                    </div>
                    <h2 className="question-text">
                        {isSpeaking && <span className="speaking-indicator">🔊</span>}
                        {currentQ?.question}
                    </h2>
                    {currentQ?.assessingSkill && (
                        <div className="skill-badge">
                            <span className="skill-icon">🎯</span>
                            Assessing: <strong>{currentQ.assessingSkill}</strong>
                        </div>
                    )}
                </motion.div>

                {/* Answer Section - Full Width */}
                <motion.div
                    className="answer-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Real-time speech transcript display */}
                    {isListening && transcript && (
                        <div className="speech-transcript">
                            <span className="listening-indicator">● Listening...</span>
                            <span className="transcript-text">"{transcript}"</span>
                        </div>
                    )}

                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here or use the microphone..."
                        className="answer-input"
                    />

                    <div className="answer-footer">
                        <motion.button
                            className={`mic-btn ${isListening ? 'listening' : ''}`}
                            onClick={toggleListening}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isListening ? (
                                <>
                                    <span className="mic-pulse"></span>
                                    🎙️ Listening...
                                </>
                            ) : (
                                <>🎤 Speak</>
                            )}
                        </motion.button>
                        <span className="char-count">{answer.length} characters</span>
                    </div>
                </motion.div>

                {/* Action Buttons - Sleek Design */}
                <motion.div
                    className="action-buttons"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <motion.button
                        className="btn-skip"
                        onClick={handleSkipQuestion}
                        disabled={submitting}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        Skip Question
                    </motion.button>
                    <motion.button
                        className="btn-next"
                        onClick={handleSubmitAnswer}
                        disabled={submitting || !answer.trim() || loadingNext}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loadingNext ? (
                            <>
                                <span className="btn-spinner"></span>
                                Analyzing...
                            </>
                        ) : currentIndex < 9 ? (
                            <>
                                Next Question
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </>
                        ) : (
                            <>
                                Submit Interview
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </div>

            {submitting && (
                <div className="submitting-overlay">
                    <div className="loading-spinner"></div>
                    <p>
                        {uploadingVideo
                            ? '📤 Uploading interview recording...'
                            : '🔍 Evaluating your responses...'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default OnboardingInterview;
