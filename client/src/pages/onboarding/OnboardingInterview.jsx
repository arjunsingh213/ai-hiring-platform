import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
import CodeIDE from '../../components/CodeIDE';
import InterviewProctor from '../../components/InterviewProctor';
import RoundInfoPage from '../../components/interview/RoundInfoPage';
import InterviewResultsPreview from '../../components/interview/InterviewResultsPreview';
import FeedbackModal from '../../components/FeedbackModal';
import './OnboardingInterview.css';

const OnboardingInterview = ({
    parsedResume,
    userId,
    desiredRole,
    experienceLevel,     // NEW: fresher or experienced
    yearsOfExperience,   // NEW: years in role
    jobDomains,          // NEW: selected domains
    onComplete,
    onSkip
}) => {
    const toast = useToast();
    const videoRef = useRef(null);
    const streamRef = useRef(null); // Track camera stream for proper cleanup
    const isMountedRef = useRef(true); // Track mount status to prevent race conditions

    // Video recording refs for admin review
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const interviewStartTimeRef = useRef(null);
    const videoUrlRef = useRef(null); // Store uploaded video URL

    // Guards to prevent duplicate API calls
    const isSubmittingRef = useRef(false);
    const isLoadingCodingRef = useRef(false);
    const isStartingRef = useRef(false); // Guard against duplicate startInterview calls

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

    // Blueprint and progress state for domain-adaptive interviews
    const [blueprint, setBlueprint] = useState(null);
    const [progress, setProgress] = useState({
        currentQuestion: 1,
        totalQuestions: 15,
        currentRound: 1,
        totalRounds: 3
    });
    const [showRoundInfo, setShowRoundInfo] = useState(false);
    const [currentRoundInfo, setCurrentRoundInfo] = useState(null);

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
    const [languagesChecked, setLanguagesChecked] = useState(false); // Track if detection completed
    const [codingResults, setCodingResults] = useState(null);
    const [loadingProblem, setLoadingProblem] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Draggable camera state
    const [cameraPosition, setCameraPosition] = useState({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cameraRef = useRef(null);

    // Proctoring state - CUMULATIVE across entire interview
    const [proctoringEnabled, setProctoringEnabled] = useState(true);
    const [isAutoFailed, setIsAutoFailed] = useState(false);
    const [proctoringViolations, setProctoringViolations] = useState([]);
    const proctoringViolationsRef = useRef([]);

    const [currentInterviewId, setCurrentInterviewId] = useState(null);
    const [finalViolations, setFinalViolations] = useState([]); // Store violations at interview submit for later upload
    const [showFeedback, setShowFeedback] = useState(false);

    // Handle violations from InterviewProctor - accumulate for entire interview
    const handleViolationLog = useCallback((violations) => {
        // Use functional update to avoid dependency on proctoringViolations
        setProctoringViolations(prev => {
            const violationsWithVideoTime = violations.map(v => ({
                ...v,
                videoTimestamp: interviewStartTimeRef.current
                    ? Math.max(0, Math.round((new Date(v.timestamp).getTime() - interviewStartTimeRef.current) / 1000))
                    : 0
            }));
            proctoringViolationsRef.current = violationsWithVideoTime;
            console.log(`[PROCTORING] Total violations: ${violations.length}`);
            return violationsWithVideoTime;
        });
    }, []);

    const finalizeVideoRecording = async (violations = null, interviewId = null) => {
        try {
            console.log('📹 Finalizing video recording...');
            setUploadingVideo(true); // Start blocking UI
            const videoBlob = await stopRecording();

            if (videoBlob && videoBlob.size > 0) {
                const markers = violations || finalViolations || proctoringViolations;
                const id = interviewId || currentInterviewId;

                await uploadVideoToCloudinary(videoBlob, markers, id);
            }
        } catch (error) {
            console.error('Error finalizing video:', error);
        } finally {
            setUploadingVideo(false); // End blocking UI
        }
    };

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
                    // ALWAYS set the result - even if empty - so we know detection completed
                    const detected = response.languages || [];
                    setDetectedLanguages(detected);
                    setLanguagesChecked(true);
                    console.log('[LANGUAGE DETECT] Result:', detected.length > 0 ? detected.map(l => l.name) : 'NO programming languages found');
                } catch (error) {
                    console.log('Language detection skipped:', error.message);
                    setLanguagesChecked(true); // Mark as checked even on error
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

    // Speak question when it changes (but NOT on round info page)
    useEffect(() => {
        if (questions[currentIndex] && ttsSupported && !completed && !showRoundInfo) {
            speakQuestion(questions[currentIndex].question);
        }
    }, [currentIndex, questions, completed, showRoundInfo]);

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

    // Initialize camera only when not showing RoundInfoPage (so video element is mounted)
    useEffect(() => {
        // Don't init camera while RoundInfoPage is showing (video element not mounted)
        if (showRoundInfo) {
            console.log('[CAMERA] Waiting for RoundInfoPage to dismiss...');
            return;
        }

        // Small delay to ensure video element is mounted
        const timer = setTimeout(() => {
            initCamera();
        }, 500);
        return () => {
            clearTimeout(timer);
            // Only stop camera if we're showing RoundInfoPage (cleanup during unmount)
            if (showRoundInfo) {
                stopCamera();
            }
        };
    }, [showRoundInfo]);

    const initCamera = async () => {
        try {
            console.log('Initializing camera...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' },
                audio: false
            });
            console.log('Camera stream obtained:', stream);

            // Store stream in ref for cleanup
            if (!isMountedRef.current) {
                console.log('[CAMERA] Component unmounted during init, stopping stream immediately');
                stream.getTracks().forEach(track => track.stop());
                return;
            }
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
    const uploadVideoToCloudinary = async (videoBlob, cheatingMarkers, interviewId = null) => {
        if (!videoBlob || videoBlob.size === 0) {
            console.log('No video to upload');
            return null;
        }

        try {
            setUploadingVideo(true);
            console.log(`📤 Uploading video to Cloudinary (interviewId: ${interviewId})...`);

            const formData = new FormData();
            formData.append('video', videoBlob, 'interview-recording.webm');
            formData.append('userId', userId);
            if (interviewId) {
                formData.append('interviewId', interviewId);
            }
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

    // Cleanup camera on component unmount - CRITICAL for stopping camera when exiting
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            console.log('[CLEANUP] Component unmounting, stopping camera...');
            stopCamera();

            // Also stop video recording if active
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current = null;
                } catch (e) {
                    console.error('Error stopping recorder:', e);
                }
            }
        };
    }, []);

    // Start dynamic interview on mount
    useEffect(() => {
        startInterview();
    }, []);

    const startInterview = async () => {
        // Guard against duplicate calls (React StrictMode double-mounts in dev)
        if (isStartingRef.current) {
            console.log('[INTERVIEW] startInterview already in progress, skipping duplicate');
            return;
        }
        isStartingRef.current = true;

        try {
            setLoading(true);
            const response = await api.post('/onboarding-interview/start', {
                userId,
                parsedResume,
                desiredRole,
                experienceLevel,
                yearsOfExperience: yearsOfExperience || 0,
                jobDomains: jobDomains || []
            });

            if (response.success && response.question) {
                setQuestions([response.question]);
                // Set interview start time for violation timestamps
                interviewStartTimeRef.current = Date.now();

                // Store blueprint if provided
                if (response.blueprint) {
                    setBlueprint(response.blueprint);
                    setProgress({
                        currentQuestion: 1,
                        totalQuestions: response.blueprint.totalQuestions || 15,
                        currentRound: 1,
                        totalRounds: response.blueprint.totalRounds || 3
                    });

                    // Show first round info page
                    const firstRound = response.blueprint.rounds?.[0];
                    if (firstRound) {
                        setCurrentRoundInfo({
                            roundNumber: 1,
                            ...firstRound,
                            totalRounds: response.blueprint.totalRounds
                        });
                        setShowRoundInfo(true);
                    }
                }
            } else {
                throw new Error('Failed to start interview');
            }
        } catch (error) {
            console.error('Failed to start interview:', error);
            showToast('Failed to start interview. Please try again or contact support.', 'error');
            isStartingRef.current = false; // Reset flag on error
        } finally {
            setLoading(false);
        }
    };

    // Handle round info page dismiss
    const handleStartRound = () => {
        setShowRoundInfo(false);
        setCurrentRoundInfo(null);

        // Speak the current question after dismissing round info
        if (questions[currentIndex] && ttsSupported) {
            setTimeout(() => {
                speakQuestion(questions[currentIndex].question);
            }, 300);
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

        // Use blueprint's total questions or fallback to 15
        const totalQuestionsLimit = blueprint?.totalQuestions || progress.totalQuestions || 15;

        try {
            // Call next endpoint which handles validation AND generation
            const response = await api.post('/onboarding-interview/next', {
                userId, // Pass userId for tracking
                currentQuestion: currentQ,
                answer: textToSubmit.trim(),
                history: answers, // Send previous answers for context
                parsedResume,
                desiredRole,
                experienceLevel,
                yearsOfExperience: yearsOfExperience || 0,
                jobDomains: jobDomains || [],
                blueprint // Send blueprint for proper round tracking
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

                // Check if interview is completed based on blueprint
                const nextIndex = currentIndex + 1;

                // Handle round transition - show RoundInfoPage between rounds
                if (response.showRoundInfo && response.roundInfo) {
                    setCurrentRoundInfo({
                        ...response.roundInfo,
                        totalRounds: blueprint?.totalRounds || progress.totalRounds
                    });
                    setShowRoundInfo(true);
                    // Add the next question but we'll show round info first
                    if (response.question) {
                        setQuestions(prev => [...prev, response.question]);
                    }
                    setCurrentIndex(nextIndex);
                } else if (response.completed || updatedAnswers.length >= totalQuestionsLimit || nextIndex >= totalQuestionsLimit) {
                    // Interview done - move to coding test or final evaluation
                    submitInterview(updatedAnswers);
                } else if (response.question && questions.length < totalQuestionsLimit) {
                    // Add next question and proceed
                    setQuestions(prev => {
                        if (prev.length >= totalQuestionsLimit) return prev; // Safety check
                        return [...prev, response.question];
                    });
                    setCurrentIndex(nextIndex);
                    // Update progress
                    if (response.progress) {
                        setProgress(response.progress);
                    }
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

            // STORE VIOLATIONS for later upload but DON'T stop recording yet if moving to coding
            setFinalViolations(formattedViolations);

            const response = await api.post('/onboarding-interview/submit', {
                userId,
                questionsAndAnswers: allAnswers,
                parsedResume,
                desiredRole,
                // Include proctoring data for admin review
                proctoringFlags: formattedViolations,
                // videoRecording data is NO LONGER sent here, will be updated in next step
                videoRecording: null
            });

            if (response.success) {
                // Store the interview ID for linking the video later
                if (response.data?.interviewId) {
                    setCurrentInterviewId(response.data.interviewId);
                    console.log('📍 Current interview ID stored:', response.data.interviewId);
                }

                // Show actual results to candidate (Preliminary)
                setResults(response.data);

                // Show success toast
                toast.success('Interview submitted! Showing preliminary results...');

                // DEBUG: Log detectedLanguages to trace coding test decision
                console.log('[INTERVIEW] detectedLanguages:', detectedLanguages, 'length:', detectedLanguages?.length || 0, 'checked:', languagesChecked);

                // Only show coding test if candidate has programming skills
                // languagesChecked ensures detection completed; length > 0 means they have coding skills
                if (languagesChecked && detectedLanguages && detectedLanguages.length > 0) {
                    console.log('[INTERVIEW] Has programming languages, showing coding test');
                    toast.success('Interview complete! Preparing coding challenge...');
                    loadCodingProblem();
                } else {
                    // Non-technical role - FINALIZE VIDEO NOW
                    console.log('[INTERVIEW] No programming languages, finalizing video...');
                    await finalizeVideoRecording(formattedViolations, response.data?.interviewId);

                    stopCamera();
                    setCompleted(true);
                }
            } else {
                throw new Error(response.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Interview submission error:', error);
            toast.error('Failed to submit interview.');
            setResults({ pendingReview: true, feedback: 'Interview submission had issues.' });

            // On error, try to finalize whatever we have recorded
            await finalizeVideoRecording();

            // Skip to results (don't force coding test on error for non-technical)
            stopCamera();
            setCompleted(true);
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
            await finalizeVideoRecording();
            setCompleted(true);
        } finally {
            setLoadingProblem(false);
        }
    };

    // Handle coding test completion
    const handleCodingComplete = async (codingResult) => {
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
        // Use await to ensure upload finishes before showing completion screen
        await finalizeVideoRecording();
        setCompleted(true);

        // Show feedback modal - only if not already shown for this session
        const feedbackShown = localStorage.getItem(`feedback_onboarding_${userId}`);
        if (!feedbackShown) {
            setShowFeedback(true);
            localStorage.setItem(`feedback_onboarding_${userId}`, 'true');
        }
    };

    // Skip coding test
    const handleSkipCoding = async () => {
        setShowCodingTest(false);
        setCodingResults({ skipped: true });

        // Finalize video recording even if skipped
        // Stop camera first
        stopCamera();

        toast.info('Coding test skipped.');
        await finalizeVideoRecording();
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

    const currentQ = questions[currentIndex];
    const progressPercent = questions.length > 0 ? ((currentIndex + 1) / progress.totalQuestions) * 100 : 0;

    // Get current round info from blueprint
    const getCurrentRoundFromBlueprint = () => {
        if (!blueprint || !blueprint.rounds) {
            // Fallback for legacy behavior
            return {
                displayName: currentIndex >= 5 ? 'HR Round' : 'Technical Round',
                roundNumber: currentIndex >= 5 ? 2 : 1,
                isCodingRound: false
            };
        }

        // Calculate which round based on question index
        let questionCount = 0;
        for (let i = 0; i < blueprint.rounds.length; i++) {
            questionCount += blueprint.rounds[i].questionCount || 5;
            if (currentIndex < questionCount) {
                return {
                    ...blueprint.rounds[i],
                    roundNumber: i + 1
                };
            }
        }
        // Return last round if beyond expected
        const lastRound = blueprint.rounds[blueprint.rounds.length - 1];
        return { ...lastRound, roundNumber: blueprint.rounds.length };
    };

    const currentRound = getCurrentRoundFromBlueprint();
    const isHRRound = currentRound.displayName?.toLowerCase().includes('hr') ||
        currentRound.displayName?.toLowerCase().includes('behavioral');

    if (loading) {
        return (
            <div className="onboarding-interview loading-state">
                <div className="loading-spinner"></div>
                <h2>Generating Your Personalized Interview...</h2>
                <p>Based on your resume, we're creating tailored questions just for you.</p>
                {blueprint && (
                    <div className="blueprint-info" style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <p>Domain: <strong>{blueprint.domain}</strong></p>
                        <p>Rounds: {blueprint.totalRounds} • Questions: {blueprint.totalQuestions}</p>
                    </div>
                )}
            </div>
        );
    }

    // Show round info page between rounds
    if (showRoundInfo && currentRoundInfo) {
        return (
            <RoundInfoPage
                roundNumber={currentRoundInfo.roundNumber}
                totalRounds={currentRoundInfo.totalRounds || progress.totalRounds}
                displayName={currentRoundInfo.displayName}
                icon={currentRoundInfo.icon}
                description={currentRoundInfo.description}
                tips={currentRoundInfo.tips}
                difficulty={currentRoundInfo.difficulty}
                questionCount={currentRoundInfo.questionCount}
                focus={currentRoundInfo.focus}
                isCodingRound={currentRoundInfo.isCodingRound}
                onStartRound={handleStartRound}
            />
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
                        initialViolations={proctoringViolations}
                        onViolationLog={handleViolationLog}
                    />
                </div>

                {/* CodeIDE Component - Full Screen */}
                <CodeIDE
                    language={codingProblem.language || detectedLanguages[0]?.name || 'JavaScript'}
                    languageId={codingProblem.languageId || detectedLanguages[0]?.judge0Id || 63}
                    problem={codingProblem}
                    onComplete={handleCodingComplete}

                    timeLimit={codingProblem.timeLimit || 15}
                />
            </div>
        );
    }

    // Render Results view if completed and results exist
    if (completed && results) {
        return (
            <div className="interview-completion-page animate-fade-in">
                <div className="completion-banner success">
                    <div className="banner-icon">✓</div>
                    <div className="banner-content">
                        <h3>Interview Submitted Successfully</h3>
                        <p>Below are your <strong>AI Evaluation Results</strong>. You can now start applying for jobs!</p>
                    </div>
                </div>

                {/* Reuse InterviewResults component but pass data directly */}
                <InterviewResultsPreview results={results} onContinue={onComplete} />
            </div>
        );
    }

    // Default completion view (fallback)
    if (completed) {
        return (
            <div className="interview-completion-page animate-fade-in">
                <div className="completion-content">
                    <div className="completion-icon">🎉</div>
                    <h2>Interview Completed!</h2>
                    <p>Thank you for completing the interview.</p>
                    <p className="sub-text">Your responses have been submitted for review.</p>
                    <button className="btn btn-primary" onClick={onComplete}>
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`onboarding-interview ${cameraEnabled ? 'camera-active' : ''}`}>
            {/* Top Bar - Progress & Timer */}
            <div className="interview-header">
                <div className="header-left">
                    <span className={`round-badge ${isHRRound ? 'hr' : 'tech'}`}>
                        {currentRound && currentRound.displayName ? currentRound.displayName : (isHRRound ? 'HR Round' : 'Technical Round')}
                    </span>
                    <span className="question-counter">
                        Question {currentIndex + 1} of {progress.totalQuestions}
                    </span>
                    {blueprint && (
                        <span className="round-counter">
                            Round {currentRound.roundNumber} of {blueprint.totalRounds || progress.totalRounds}
                        </span>
                    )}
                </div>
                <div className="header-right">
                    <span className={`timer ${timeLeft < 30 ? 'warning' : ''}`}>
                        ⏱️ {formatTime(timeLeft)}
                    </span>


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


                    {/* Proctoring Component - Maintains cumulative violations across all rounds */}
                    <InterviewProctor
                        videoRef={videoRef}
                        enabled={proctoringEnabled && cameraEnabled && !completed}
                        initialViolations={proctoringViolations}
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
                        ) : currentIndex < (progress.totalQuestions - 1) ? (
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

            {(submitting || uploadingVideo) && (
                <div className="submitting-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    color: 'white'
                }}>
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
                        {uploadingVideo
                            ? '📤 Uploading interview recording...'
                            : '🔍 Evaluating your responses...'}
                    </p>
                </div>
            )}

            {showFeedback && (
                <FeedbackModal
                    featureId="onboarding"
                    onClose={() => setShowFeedback(false)}
                    userId={userId}
                />
            )}
        </div>
    );
};

export default OnboardingInterview;
