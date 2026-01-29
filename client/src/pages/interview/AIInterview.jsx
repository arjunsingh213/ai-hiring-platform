import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import CodeIDE from '../../components/CodeIDE';
import InterviewProctor from '../../components/InterviewProctor';
import Skeleton, { CardSkeleton } from '../../components/Skeleton';
import './AIInterview.css';

// Programming languages to detect
const PROGRAMMING_LANGUAGES = [
    { name: 'Python', aliases: ['python', 'py'], judge0Id: 71 },
    { name: 'JavaScript', aliases: ['javascript', 'js', 'node', 'nodejs', 'react', 'vue', 'angular'], judge0Id: 63 },
    { name: 'Java', aliases: ['java', 'spring', 'springboot'], judge0Id: 62 },
    { name: 'C++', aliases: ['c++', 'cpp'], judge0Id: 54 },
    { name: 'C', aliases: ['c programming', 'c language'], judge0Id: 50 },
    { name: 'Go', aliases: ['go', 'golang'], judge0Id: 60 },
    { name: 'Ruby', aliases: ['ruby', 'rails'], judge0Id: 72 },
    { name: 'PHP', aliases: ['php', 'laravel'], judge0Id: 68 },
    { name: 'TypeScript', aliases: ['typescript', 'ts'], judge0Id: 74 },
    { name: 'Rust', aliases: ['rust'], judge0Id: 73 },
    { name: 'C#', aliases: ['c#', 'csharp', '.net', 'dotnet'], judge0Id: 51 }
];

// SVG Icon Components for professional UI
const Icons = {
    technical: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
    ),
    hr: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    ),
    behavioral: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
    dsa: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
    ),
    coding: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
    ),
    assessment: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
    ),
    screening: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    ),
    clock: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
    mic: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    ),
    speaker: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
    ),
    camera: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
        </svg>
    ),
    warning: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    ),
    check: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    ),
    skip: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
    ),
    play: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    ),
    stop: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
    ),
    repeat: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
    ),
    brain: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54"></path>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54"></path>
        </svg>
    ),
    chat: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    )
};

// Round type display names and icons as components
const ROUND_TYPE_INFO = {
    technical: { icon: <Icons.technical />, label: 'Technical Interview' },
    hr: { icon: <Icons.hr />, label: 'HR Interview' },
    behavioral: { icon: <Icons.behavioral />, label: 'Behavioral Interview' },
    dsa: { icon: <Icons.dsa />, label: 'DSA Challenge' },
    coding: { icon: <Icons.coding />, label: 'Coding Challenge' },
    assessment: { icon: <Icons.assessment />, label: 'Assessment' },
    screening: { icon: <Icons.screening />, label: 'Screening' }
};

// Clean AI-generated questions from internal reasoning/headers
const cleanQuestionText = (text) => {
    if (!text) return '';

    // Remove markdown headers (###, ##, #)
    let cleaned = text.replace(/^#+\s*/gm, '');

    // Remove pattern matches for common AI leakage
    const patternsToRemove = [
        /Goal:\s*.*/gi,
        /Plan:\s*.*/gi,
        /Duration:\s*.*/gi,
        /Overall Goal:\s*.*/gi,
        /Technical Round\s*\d*:\s*/gi,
        /Ice-Breaker\s*\(\w+\):\s*/gi,
        /\*\*Goal:\*\*\s*.*/gi,
        /\*\*Duration:\*\*\s*.*/gi,
    ];

    patternsToRemove.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // Remove bold asterisks from start/end if they wrap the whole thing
    cleaned = cleaned.replace(/^\*\*|\*\*$/g, '');

    return cleaned.trim();
};

const AIInterview = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const videoRef = useRef(null);
    const streamRef = useRef(null); // Track camera stream
    const isMountedRef = useRef(true); // Track mount status

    // Video recording refs
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const interviewStartTimeRef = useRef(null);
    const videoUrlRef = useRef(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [finalViolations, setFinalViolations] = useState([]);

    // Core interview state
    const [interview, setInterview] = useState(null);
    const [job, setJob] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [timeSpent, setTimeSpent] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [finalResults, setFinalResults] = useState(null);
    const [allAnswers, setAllAnswers] = useState([]);

    // Pipeline-aware state
    const [pipelineConfig, setPipelineConfig] = useState(null);
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [currentRound, setCurrentRound] = useState(null);

    // Round-specific data from backend
    const [dsaProblem, setDsaProblem] = useState(null);
    const [assessmentQuestions, setAssessmentQuestions] = useState([]);
    const [assessmentAnswers, setAssessmentAnswers] = useState({});
    const [currentAssessmentIndex, setCurrentAssessmentIndex] = useState(0);

    // Speech-to-Text states
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);

    // Text-to-Speech states
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(false);

    // Coding test states
    const [detectedLanguages, setDetectedLanguages] = useState([]);
    const [showCodingTest, setShowCodingTest] = useState(false);
    const [codingProblem, setCodingProblem] = useState(null);
    const [codingResults, setCodingResults] = useState(null);
    const [loadingProblem, setLoadingProblem] = useState(false);



    // Proctoring states
    const [proctoringViolations, setProctoringViolations] = useState([]);
    const [violationReport, setViolationReport] = useState(null);

    // Handle proctoring violations (log-only, no termination)
    const handleViolationLog = (violations) => {
        const violationsWithVideoTime = violations.map(v => ({
            ...v,
            videoTimestamp: interviewStartTimeRef.current
                ? Math.max(0, Math.round((new Date(v.timestamp).getTime() - interviewStartTimeRef.current) / 1000))
                : 0
        }));
        setProctoringViolations(violationsWithVideoTime);
    };

    // Video recording functions
    const startRecording = () => {
        if (!streamRef.current || mediaRecorderRef.current) return;

        try {
            recordedChunksRef.current = [];
            const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
            let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(streamRef.current, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
            };

            mediaRecorder.start(1000);
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            console.log('📹 Video recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecording = () => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
                resolve(null);
                return;
            }
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                console.log('📹 Video recording stopped, size:', blob.size);
                resolve(blob);
            };
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
            setIsRecording(false);
        });
    };

    const uploadVideoToCloudinary = async (videoBlob, cheatingMarkers, id = null) => {
        if (!videoBlob || videoBlob.size === 0) return null;
        try {
            setUploadingVideo(true);
            const formData = new FormData();
            formData.append('video', videoBlob, 'interview-recording.webm');
            formData.append('userId', localStorage.getItem('userId'));
            if (id || interviewId) formData.append('interviewId', id || interviewId);
            formData.append('cheatingMarkers', JSON.stringify(cheatingMarkers || []));

            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/interviews/upload-video`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();
            console.log('✅ Video uploaded:', result.data?.url);
            return result.data;
        } catch (error) {
            console.error('Video upload error:', error);
            return null;
        } finally {
            setUploadingVideo(false);
        }
    };

    const finalizeVideoRecording = async () => {
        try {
            const videoBlob = await stopRecording();
            if (videoBlob) {
                await uploadVideoToCloudinary(videoBlob, proctoringViolations);
            }
        } catch (error) {
            console.error('Error finalizing video:', error);
        }
    };








    // Init Speech Recognition
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
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech error:', event.error);
                if (event.error === 'not-allowed') {
                    toast.error('Microphone access denied');
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, []);

    // Init Text-to-Speech
    useEffect(() => {
        if ('speechSynthesis' in window) {
            setTtsSupported(true);
        }
    }, []);

    // Auto-speak question when it changes
    useEffect(() => {
        if (interview && interview.questions && interview.questions[currentQuestionIndex] && ttsSupported && !completed) {
            // Small delay to let the UI update first
            const timer = setTimeout(() => {
                speakQuestion();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentQuestionIndex, interview, ttsSupported, completed]);

    // Text-to-Speech function
    const speakQuestion = () => {
        if (!ttsSupported) {
            toast.warning('Text-to-Speech is not supported in your browser');
            return;
        }

        // Stop any current speech
        window.speechSynthesis.cancel();

        const rawQuestion = interview?.questions?.[currentQuestionIndex]?.question;
        if (!rawQuestion) return;

        const question = cleanQuestionText(rawQuestion);

        const utterance = new SpeechSynthesisUtterance(question);
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = 'en-US';

        // Get available voices and prefer a natural-sounding one
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const toggleListening = () => {
        if (!speechSupported) {
            toast.warning('Use Chrome for speech recognition');
            return;
        }
        // Stop TTS if speaking
        if (isSpeaking) {
            stopSpeaking();
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setTranscript('');
        } else {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchInterview();
        startCamera();
        const timer = setInterval(() => setTimeSpent(prev => prev + 1), 1000);
        return () => {
            isMountedRef.current = false;
            clearInterval(timer);
            stopCamera();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    // Start recording when camera is ready
    useEffect(() => {
        if (streamRef.current && !isRecording && !completed) {
            const timer = setTimeout(() => {
                interviewStartTimeRef.current = Date.now();
                startRecording();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isRecording, completed]);

    const fetchInterview = async () => {
        try {
            const response = await api.get(`/interviews/${interviewId}`);
            const data = response.data || response;
            console.log('[PIPELINE] Loaded interview:', data);

            // Check if completed
            if (data.status === 'completed') {
                setInterview(data);
                setCompleted(true);
                setFinalResults({
                    scoring: data.scoring,
                    recruiterReport: data.recruiterReport
                });
                return;
            }

            setInterview(data);
            if (data.jobId) setJob(data.jobId);

            // Pipeline-aware setup
            if (data.pipelineConfig) {
                console.log('[PIPELINE] Config found:', data.pipelineConfig);
                setPipelineConfig(data.pipelineConfig);
                setCurrentRoundIndex(data.currentRoundIndex || 0);

                // Get current round info
                const roundIdx = data.currentRoundIndex || 0;
                const round = data.pipelineConfig.rounds?.[roundIdx];
                if (round) {
                    setCurrentRound(round);
                    console.log('[PIPELINE] Current round:', round.roundType, round.title);

                    // Get jobId from the loaded data (not from state which might be stale)
                    const currentJobId = data.jobId?._id || data.jobId;

                    // If DSA/coding round, we need to fetch or have the problem
                    if ((round.roundType === 'dsa' || round.roundType === 'coding') && !dsaProblem) {
                        // Try to get DSA problem from job-interview start response
                        // For now, trigger a re-fetch via job-interview/start
                        await startRoundContent(round, currentJobId);
                    }

                    // If assessment round, fetch questions
                    if (round.roundType === 'assessment' && assessmentQuestions.length === 0) {
                        await startRoundContent(round, currentJobId);
                    }
                }
            }

            // Set question index with bounds check for Q&A rounds
            const questionsLen = data.questions?.length || 0;
            const responsesLen = data.responses?.length || 0;

            if (responsesLen > 0 && responsesLen < questionsLen) {
                setCurrentQuestionIndex(responsesLen);
                setAllAnswers(data.responses);
            } else if (responsesLen >= questionsLen && questionsLen > 0 && !data.pipelineConfig) {
                // Legacy: All questions answered without pipeline - show completion
                setCompleted(true);
                setFinalResults({
                    scoring: data.scoring || {},
                    recruiterReport: data.recruiterReport
                });
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load interview');
            navigate('/jobseeker/interviews');
        }
    };

    // State for loading assessment questions
    const [loadingAssessment, setLoadingAssessment] = useState(false);

    // Fetch round-specific content (DSA problem or assessment questions)
    // jobIdParam is passed directly to avoid stale state issues
    const startRoundContent = async (round, jobIdParam = null) => {
        try {
            const userId = localStorage.getItem('userId');
            // Use passed jobId first, then fallback to state (state might be stale)
            const jobId = jobIdParam || interview?.jobId?._id || interview?.jobId;

            console.log('[ASSESSMENT] startRoundContent called for:', round.roundType, 'jobId:', jobId);

            if (!jobId) {
                console.error('[ASSESSMENT] No jobId available! Check if jobIdParam was passed.');
                return;
            }

            // Show loading for DSA/coding rounds
            if (round.roundType === 'dsa' || round.roundType === 'coding') {
                setLoadingProblem(true);
            }

            // Show loading for assessment rounds
            if (round.roundType === 'assessment') {
                setLoadingAssessment(true);
                console.log('[ASSESSMENT] Loading MCQ questions...');
            }

            const apiResponse = await api.post('/job-interview/start', { userId, jobId });
            // Handle both response.data and direct response
            const response = apiResponse.data || apiResponse;

            console.log('[ASSESSMENT] Full API response:', JSON.stringify(response, null, 2).substring(0, 500));

            if (response.dsaProblem) {
                console.log('[PIPELINE] DSA problem received:', response.dsaProblem.title);
                setDsaProblem(response.dsaProblem);
                setCodingProblem({
                    ...response.dsaProblem,
                    languageId: 63 // Default to JavaScript
                });
                setShowCodingTest(true);
            }

            if (response.assessmentQuestions && Array.isArray(response.assessmentQuestions)) {
                console.log('[ASSESSMENT] ✅ MCQ questions received:', response.assessmentQuestions.length);
                console.log('[ASSESSMENT] First question:', response.assessmentQuestions[0]?.question?.substring(0, 50));
                setAssessmentQuestions(response.assessmentQuestions);
                setCurrentAssessmentIndex(0);
                setAssessmentAnswers({});
                setLoadingAssessment(false);  // Explicitly set loading false here
            } else if (round.roundType === 'assessment') {
                console.error('[ASSESSMENT] ❌ No questions in response. Response keys:', Object.keys(response));
                toast.error('Failed to load assessment questions');
            }
        } catch (error) {
            console.error('[PIPELINE] Error fetching round content:', error);
            toast.error('Failed to load round content');
        } finally {
            setLoadingProblem(false);
            setLoadingAssessment(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (!isMountedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            // Removed direct setIsRecording(true), recording logic moved to useEffect
        } catch (e) {
            console.error('Camera access error:', e);
            toast.error(`Camera Failed: ${e.name}: ${e.message}`);
        }
    };


    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }
        stopFaceVerification();
    };

    // Detect programming languages from job requirements and description
    const detectLanguagesFromJob = (jobData) => {
        if (!jobData) return [];

        const detected = [];
        const skills = jobData.requirements?.skills || [];
        const description = (jobData.description || '').toLowerCase();

        // Check skills array
        for (const lang of PROGRAMMING_LANGUAGES) {
            const found = lang.aliases.some(alias =>
                skills.some(skill => skill.toLowerCase().includes(alias)) ||
                description.includes(alias.toLowerCase())
            );
            if (found && !detected.find(d => d.name === lang.name)) {
                detected.push(lang);
            }
        }

        console.log('[CODING] Detected languages from job:', detected.map(l => l.name));
        return detected;
    };

    // Load coding problem for the candidate
    const loadCodingProblem = async (languages) => {
        console.log('[CODING] Loading problem for languages:', languages);
        setLoadingProblem(true);

        try {
            const primaryLanguage = languages[0] || { name: 'JavaScript', judge0Id: 63 };

            const response = await api.post('/code/generate-problem', {
                skills: job?.requirements?.skills || [],
                language: primaryLanguage.name,
                difficulty: 'easy'
            });

            if (response.success && response.problem) {
                console.log('[CODING] Problem generated:', response.problem.title);
                setCodingProblem({
                    ...response.problem,
                    languageId: primaryLanguage.judge0Id || 63
                });
                setShowCodingTest(true);
            } else {
                throw new Error('Failed to generate problem');
            }
        } catch (error) {
            console.error('[CODING] Error loading problem:', error);
            toast.error('Could not load coding test. Proceeding to results.');
            navigate(`/interview/${interviewId}/results`);
        } finally {
            setLoadingProblem(false);
        }
    };

    // Handle coding test completion - FIXED to advance to next pipeline round
    const handleCodingComplete = async (codingResult) => {
        console.log('[CODING] Coding test completed:', codingResult);
        setCodingResults(codingResult);
        setShowCodingTest(false);
        setDsaProblem(null); // Reset for potential next coding round

        try {
            // Save coding results to interview
            await api.post(`/interviews/${interviewId}/coding-results`, {
                codingResults: codingResult
            });

            // Submit round completion to advance pipeline
            const roundResponse = await api.post(`/interviews/${interviewId}/round-complete`, {
                roundIndex: currentRoundIndex,
                roundType: currentRound?.roundType || 'coding',
                score: codingResult.score || 0,
                details: codingResult
            });

            toast.success(`Coding test completed! Score: ${codingResult.score}/100`);

            // Check if there are more rounds
            if (roundResponse.data?.isComplete || roundResponse.isComplete) {
                // All rounds done - finalize video and go to results
                await finalizeVideoRecording();
                stopCamera();
                navigate(`/interview/${interviewId}/results`);
            } else {
                // Advance to next round
                const nextRoundIdx = (roundResponse.data?.currentRoundIndex ?? roundResponse.currentRoundIndex) || currentRoundIndex + 1;
                setCurrentRoundIndex(nextRoundIdx);

                const nextRound = pipelineConfig?.rounds?.[nextRoundIdx];
                if (nextRound) {
                    setCurrentRound(nextRound);
                    setCurrentQuestionIndex(0);
                    setAnswer('');
                    console.log(`[PIPELINE] Advancing to round ${nextRoundIdx + 1}: ${nextRound.title}`);
                    toast.info(`Starting ${nextRound.title}...`);

                    // Re-fetch interview to get questions for next round
                    await fetchInterview();
                } else {
                    // No more rounds defined - go to results
                    navigate(`/interview/${interviewId}/results`);
                }
            }
        } catch (error) {
            console.error('[CODING] Error saving coding results:', error);
            toast.error('Error saving results, but continuing...');
            // Still try to advance
            if (pipelineConfig?.rounds?.length > currentRoundIndex + 1) {
                setCurrentRoundIndex(prev => prev + 1);
                setCurrentRound(pipelineConfig.rounds[currentRoundIndex + 1]);
                await fetchInterview();
            } else {
                navigate(`/interview/${interviewId}/results`);
            }
        }
    };

    // Skip coding test - FIXED to advance to next pipeline round
    const handleSkipCoding = async () => {
        setShowCodingTest(false);
        setCodingResults({ skipped: true, score: 0 });
        setDsaProblem(null);

        try {
            await api.post(`/interviews/${interviewId}/coding-results`, {
                codingResults: { skipped: true, score: 0 }
            });

            // Submit round completion
            const roundResponse = await api.post(`/interviews/${interviewId}/round-complete`, {
                roundIndex: currentRoundIndex,
                roundType: currentRound?.roundType || 'coding',
                score: 0,
                details: { skipped: true }
            });

            toast.info('Coding test skipped.');

            // Check if there are more rounds
            if (roundResponse.data?.isComplete || roundResponse.isComplete) {
                await finalizeVideoRecording();
                stopCamera();
                navigate(`/interview/${interviewId}/results`);
            } else {
                const nextRoundIdx = (roundResponse.data?.currentRoundIndex ?? roundResponse.currentRoundIndex) || currentRoundIndex + 1;
                setCurrentRoundIndex(nextRoundIdx);

                const nextRound = pipelineConfig?.rounds?.[nextRoundIdx];
                if (nextRound) {
                    setCurrentRound(nextRound);
                    setCurrentQuestionIndex(0);
                    toast.info(`Starting ${nextRound.title}...`);
                    await fetchInterview();
                } else {
                    navigate(`/interview/${interviewId}/results`);
                }
            }
        } catch (error) {
            console.error('[CODING] Error saving skip:', error);
            navigate(`/interview/${interviewId}/results`);
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim()) {
            toast.warning('Please provide an answer');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        setSubmitting(true);
        try {
            const questions = interview.questions || [];
            const currentQ = questions[currentQuestionIndex];

            setAllAnswers(prev => [...prev, {
                questionIndex: currentQuestionIndex,
                answer: answer.trim(),
                timeSpent,
                category: currentQ?.category
            }]);

            // Submit answer (backend will generate next question for job interviews)
            const response = await api.post(`/interviews/${interviewId}/response`, {
                questionIndex: currentQuestionIndex,
                answer: answer.trim(),
                timeSpent,
                round: currentRound
            });

            setAnswer('');
            setTranscript('');
            setTimeSpent(0);

            // Re-fetch interview to get the dynamically generated next question
            const updatedInterview = await api.get(`/interviews/${interviewId}`);
            const latestInterview = updatedInterview.data || updatedInterview;
            setInterview(latestInterview);

            const updatedQuestions = latestInterview.questions || [];
            const nextIndex = currentQuestionIndex + 1;

            // Pipeline-aware: Check if round is complete based on question count for this round
            const roundQuestionCount = currentRound?.questionConfig?.questionCount ||
                pipelineConfig?.rounds?.[currentRoundIndex]?.questionConfig?.questionCount || 5;

            // Use currentQuestionIndex + 1 as the count of answered questions (0-indexed)
            const answeredInRound = currentQuestionIndex + 1;

            console.log(`[INTERVIEW] Q ${answeredInRound}/${roundQuestionCount} in ${currentRound?.roundType || 'round'}`);

            if (answeredInRound >= roundQuestionCount || nextIndex >= updatedQuestions.length) {
                // This round is complete - complete round and check for next
                console.log('[INTERVIEW] Round complete - advancing to next round or completing interview');
                await completeCurrentRound();
            } else {
                setCurrentQuestionIndex(nextIndex);
            }
        } catch (e) {
            console.error('Submit error:', e);
            // Check if this is a validation error (gibberish rejection)
            if (e.response?.status === 400 && e.response?.data?.code === 'INVALID_ANSWER') {
                toast.error(e.response.data.error || 'Please provide a valid answer');
            } else {
                toast.error('Failed to submit');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Complete current round and advance to next (or finish interview)
    const completeCurrentRound = async () => {
        try {
            // Submit round completion to backend
            const roundResponse = await api.post(`/interviews/${interviewId}/round-complete`, {
                roundIndex: currentRoundIndex,
                roundType: currentRound?.roundType || 'technical',
                score: 0, // Backend will calculate from responses
                details: { completedQuestions: currentQuestionIndex + 1 }
            });

            const roundRes = roundResponse.data || roundResponse;
            // API returns: { success: true, data: { isComplete, currentRoundIndex, ... }}
            const resData = roundRes.data || roundRes;

            console.log('[INTERVIEW] Round complete response:', { isComplete: resData.isComplete, currentRoundIndex: resData.currentRoundIndex });

            if (resData.isComplete) {
                // All rounds complete - finalize video and go to results
                await finalizeVideoRecording();
                stopCamera();
                toast.success('Interview complete!');
                navigate(`/interview/${interviewId}/results`);
            } else {
                // Advance to next round
                const nextRoundIdx = resData.currentRoundIndex || currentRoundIndex + 1;
                const nextRound = pipelineConfig?.rounds?.[nextRoundIdx];

                if (nextRound) {
                    console.log(`[PIPELINE] Advancing to round ${nextRoundIdx + 1}: ${nextRound.title}`);
                    toast.info(`Starting ${nextRound.title}...`);

                    setCurrentRoundIndex(nextRoundIdx);
                    setCurrentRound(nextRound);
                    setCurrentQuestionIndex(0);
                    setAllAnswers([]);

                    // Re-fetch to get new questions for next round
                    await fetchInterview();
                } else {
                    // No more rounds
                    stopCamera();
                    navigate(`/interview/${interviewId}/results`);
                }
            }
        } catch (error) {
            console.error('Complete round error:', error);
            toast.error('Error completing round');
            // Try to continue anyway
            if (pipelineConfig?.rounds?.length > currentRoundIndex + 1) {
                setCurrentRoundIndex(prev => prev + 1);
                setCurrentRound(pipelineConfig.rounds[currentRoundIndex + 1]);
                setCurrentQuestionIndex(0);
                await fetchInterview();
            } else {
                navigate(`/interview/${interviewId}/results`);
            }
        }
    };

    // Legacy complete interview (for non-pipeline interviews)
    const completeInterview = async () => {
        await completeCurrentRound();
    };

    // Loading
    // Show loading state when generating coding problem
    if (loadingProblem) {
        return (
            <div className="ai-interview loading-state coding-prep">
                <div className="code-animation">
                    <div className="code-lines">
                        <span className="code-line" style={{ animationDelay: '0s' }}>{'function solve() {'}</span>
                        <span className="code-line" style={{ animationDelay: '0.3s' }}>{'  // Analyzing job requirements...'}</span>
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

    // Show CodeIDE for DSA/coding pipeline rounds - USE EXISTING CODEIDE WITHOUT AI GENERATION
    if (currentRound?.roundType === 'dsa' || currentRound?.roundType === 'coding') {
        // Create simple problem from pipeline config - no AI generation
        const codingConfig = currentRound?.codingConfig || {};
        const jobSkills = job?.requirements?.skills || pipelineConfig?.settings?.focusSkills || [];

        const simpleProblem = {
            title: currentRound?.title || 'Coding Challenge',
            description: `Complete the coding challenge for this interview.\n\nFocus Areas: ${codingConfig.topics?.join(', ') || jobSkills.slice(0, 3).join(', ') || 'General Programming'}\n\nDifficulty: ${codingConfig.difficulty || 'medium'}\n\nWrite clean, efficient code that demonstrates your programming skills.`,
            difficulty: codingConfig.difficulty || 'medium',
            starterCode: null, // Will use default template
            timeLimit: codingConfig.timePerProblem || 25
        };

        return (
            <CodeIDE
                language={codingConfig.languages?.[0] || 'JavaScript'}
                languageId={63} // JavaScript default
                problem={simpleProblem}
                onComplete={handleCodingComplete}
                onSkip={handleSkipCoding}
                timeLimit={simpleProblem.timeLimit}
            />
        );
    }

    // Show loading for Assessment MCQ generation
    if (currentRound?.roundType === 'assessment' && (loadingAssessment || assessmentQuestions.length === 0)) {
        return (
            <div className="ai-interview loading-state assessment-prep">
                <div className="loading-animation" style={{ textAlign: 'center' }}>
                    <div className="mcq-animation" style={{ fontSize: '64px', marginBottom: 'var(--spacing-md)' }}>
                        📝
                    </div>
                    <div className="loading-spinner" style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid var(--bg-tertiary)',
                        borderTop: '4px solid var(--primary)',
                        borderRadius: '50%',
                        margin: '0 auto var(--spacing-md)',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                </div>
                <h2>🎯 Generating Assessment Questions...</h2>
                <p>Creating personalized MCQ questions based on</p>
                <div className="skill-tags" style={{ justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
                    {(currentRound.assessmentConfig?.assessmentTypes || ['technical']).map((type, i) => (
                        <span key={i} className="skill-tag" style={{
                            background: type === 'technical' ? 'rgba(59, 130, 246, 0.2)' :
                                type === 'communication' ? 'rgba(16, 185, 129, 0.2)' :
                                    type === 'aptitude' ? 'rgba(249, 115, 22, 0.2)' :
                                        'rgba(139, 92, 246, 0.2)',
                            color: type === 'technical' ? '#3B82F6' :
                                type === 'communication' ? '#10B981' :
                                    type === 'aptitude' ? '#F97316' : '#8B5CF6'
                        }}>
                            {type === 'technical' ? '💻' : type === 'communication' ? '💬' : type === 'aptitude' ? '🧠' : '📊'} {type}
                        </span>
                    ))}
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Show Assessment MCQ if assessment round is active
    if (currentRound?.roundType === 'assessment' && assessmentQuestions.length > 0) {
        const currentQ = assessmentQuestions[currentAssessmentIndex];
        const assessmentProgress = ((currentAssessmentIndex + 1) / assessmentQuestions.length) * 100;
        const typeInfo = ROUND_TYPE_INFO[currentQ?.type] || ROUND_TYPE_INFO.assessment;

        const handleAssessmentAnswer = (questionId, answerId) => {
            setAssessmentAnswers(prev => ({ ...prev, [questionId]: answerId }));
        };

        const handleNextAssessmentQuestion = () => {
            if (currentAssessmentIndex < assessmentQuestions.length - 1) {
                setCurrentAssessmentIndex(prev => prev + 1);
            } else {
                // Submit all assessment answers
                handleAssessmentComplete();
            }
        };

        const handleAssessmentComplete = async () => {
            setSubmitting(true);
            try {
                // Calculate score with detailed logging
                let correct = 0;
                const answerDetails = [];

                assessmentQuestions.forEach((q, idx) => {
                    // Try multiple key formats: q.id, array index, or string index
                    const userAnswer = assessmentAnswers[q.id] || assessmentAnswers[idx] || assessmentAnswers[idx.toString()];
                    const isCorrect = userAnswer === q.correctAnswer;

                    console.log(`[SCORING] Q${idx + 1}: User answered "${userAnswer}", Correct is "${q.correctAnswer}", Match: ${isCorrect}`);

                    if (isCorrect) correct++;
                    answerDetails.push({
                        questionId: q.id || idx,
                        question: q.question?.substring(0, 50),
                        userAnswer,
                        correctAnswer: q.correctAnswer,
                        isCorrect
                    });
                });

                const score = Math.round((correct / assessmentQuestions.length) * 100);
                console.log(`[SCORING] Assessment complete: ${correct}/${assessmentQuestions.length} = ${score}%`);

                // Save to backend
                await api.post(`/interviews/${interviewId}/round-complete`, {
                    roundIndex: currentRoundIndex,
                    roundType: 'assessment',
                    score,
                    details: { assessmentAnswers, answerDetails, correct, total: assessmentQuestions.length }
                });

                toast.success(`Assessment complete! Score: ${score}% (${correct}/${assessmentQuestions.length} correct)`);

                // Check if more rounds
                if (pipelineConfig?.rounds?.length > currentRoundIndex + 1) {
                    // Advance to next round
                    setCurrentRoundIndex(prev => prev + 1);
                    setCurrentRound(pipelineConfig.rounds[currentRoundIndex + 1]);
                    setAssessmentQuestions([]);
                    setAssessmentAnswers({});
                    setCurrentAssessmentIndex(0);
                    await fetchInterview();
                } else {
                    // All rounds complete
                    navigate(`/interview/${interviewId}/results`);
                }
            } catch (error) {
                console.error('Assessment submit error:', error);
                toast.error('Failed to submit assessment');
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="ai-interview assessment-mode">
                {/* Header with round progress */}
                <div className="interview-header">
                    <div className="header-left">
                        <h2>{typeInfo.icon} {currentRound.title || 'Assessment'}</h2>
                        {job && <p className="job-context">{job.title}</p>}
                        {pipelineConfig?.rounds && (
                            <div className="rounds-progress">
                                {pipelineConfig.rounds.map((r, i) => (
                                    <span
                                        key={i}
                                        className={`round-dot ${i === currentRoundIndex ? 'active' : i < currentRoundIndex ? 'done' : ''}`}
                                        title={r.title}
                                    >
                                        {ROUND_TYPE_INFO[r.roundType]?.icon || <Icons.screening />}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="header-right">
                        <div className="timer"><Icons.clock /> {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobseeker/interviews')}>Exit</button>
                    </div>
                </div>

                {/* Progress */}
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${assessmentProgress}%` }}></div>
                </div>

                {/* Assessment Question Card */}
                <div className="assessment-content">
                    <div className="assessment-card card">
                        <div className="assessment-header">
                            <span className="question-number">Question {currentAssessmentIndex + 1} of {assessmentQuestions.length}</span>
                            <span className={`question-type-badge ${currentQ?.type}`}>
                                {currentQ?.type === 'technical' ? <><Icons.technical /> Technical</> :
                                    currentQ?.type === 'communication' ? <><Icons.chat /> Communication</> :
                                        currentQ?.type === 'aptitude' ? <><Icons.brain /> Aptitude</> : <><Icons.assessment /> Assessment</>}
                            </span>
                        </div>

                        <h3 className="assessment-question">{currentQ?.question}</h3>

                        <div className="assessment-options">
                            {currentQ?.options?.map((opt) => (
                                <label
                                    key={opt.id}
                                    className={`option-card ${assessmentAnswers[currentQ.id] === opt.id ? 'selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name={`q-${currentQ.id}`}
                                        value={opt.id}
                                        checked={assessmentAnswers[currentQ.id] === opt.id}
                                        onChange={() => handleAssessmentAnswer(currentQ.id, opt.id)}
                                    />
                                    <span className="option-letter">{opt.id}</span>
                                    <span className="option-text">{opt.text}</span>
                                </label>
                            ))}
                        </div>

                        <div className="assessment-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleNextAssessmentQuestion}
                                disabled={!assessmentAnswers[currentQ?.id] || submitting}
                            >
                                {submitting ? 'Saving...' :
                                    currentAssessmentIndex < assessmentQuestions.length - 1 ? 'Next Question →' : 'Submit Assessment'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show coding IDE if coding test is active
    if (showCodingTest && codingProblem) {
        return (
            <CodeIDE
                language={codingProblem.language || detectedLanguages[0]?.name || 'JavaScript'}
                languageId={codingProblem.languageId || detectedLanguages[0]?.judge0Id || 63}
                problem={codingProblem}
                onComplete={handleCodingComplete}
                onSkip={handleSkipCoding}
                timeLimit={codingProblem.timeLimit || 15}
            />
        );
    }

    // Loading interview
    if (!interview) {
        return (
            <div className="ai-interview loading-state">
                <div className="skeleton-interview-loader">
                    <Skeleton variant="title" width="200px" />
                    <Skeleton variant="text" width="300px" />
                    <div style={{ marginTop: '24px' }}>
                        <CardSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    const questions = interview.questions || [];

    // Completed
    if (completed && finalResults) {
        const score = finalResults.scoring?.overallScore || 0;
        return (
            <div className="ai-interview">
                <div className="completion-screen">
                    <div className="completion-card card-glass">
                        <div className={`completion-icon ${score >= 60 ? 'success' : 'warning'}`}>
                            {score >= 60 ? <Icons.check /> : <Icons.warning />}
                        </div>
                        <h1>Interview Completed!</h1>
                        <div className="score-display">
                            <div className="score-circle">
                                <svg viewBox="0 0 36 36">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none" stroke={score >= 60 ? 'var(--accent)' : 'var(--warning)'}
                                        strokeWidth="3" strokeDasharray={`${score}, 100`} />
                                </svg>
                                <span className="score-text">{Math.round(score)}%</span>
                            </div>
                            <p className="score-label">Overall Score</p>
                        </div>
                        <div className="round-scores">
                            <div className="round-score-item">
                                <span className="round-value">{Math.round(finalResults.scoring?.technicalScore || finalResults.scoring?.technicalAccuracy || 0)}%</span>
                            </div>
                            <div className="round-score-item">
                                <span className="round-label">HR</span>
                                <span className="round-value">{Math.round(finalResults.scoring?.communicationScore || finalResults.scoring?.communication || 0)}%</span>
                            </div>
                        </div>
                        {finalResults.scoring?.strengths?.length > 0 && (
                            <div className="strengths-section">
                                <h3>Strengths</h3>
                                <div className="strength-tags">
                                    {finalResults.scoring.strengths.map((s, i) => (
                                        <span key={i} className="strength-tag"><Icons.check /> {s}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {finalResults.scoring?.weaknesses?.length > 0 && (
                            <div className="weaknesses-section">
                                <h3>Areas to Improve</h3>
                                <div className="strength-tags">
                                    {finalResults.scoring.weaknesses.map((w, i) => (
                                        <span key={i} className="weakness-tag"><Icons.warning /> {w}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="completion-actions">
                            <button className="btn btn-primary" onClick={() => navigate('/jobseeker/jobs')}>
                                Browse Jobs
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/jobseeker/interviews')}>
                                My Interviews
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Current question with safety check
    const currentQuestion = questions[currentQuestionIndex] || { question: 'No question available' };

    // Pipeline-aware progress calculation
    const getCurrentRoundQuestionCount = () => {
        if (pipelineConfig?.rounds?.[currentRoundIndex]?.questionConfig?.questionCount) {
            return pipelineConfig.rounds[currentRoundIndex].questionConfig.questionCount;
        }
        return 5; // Default fallback
    };

    const totalQ = pipelineConfig?.rounds
        ? getCurrentRoundQuestionCount()
        : (interview.jobId ? 10 : questions.length || 1);

    const currentRoundType = currentRound?.roundType || pipelineConfig?.rounds?.[0]?.roundType || 'technical';
    const progress = ((currentQuestionIndex + 1) / totalQ) * 100;

    // Get next round info for button text
    const getNextButtonText = () => {
        if (submitting) return 'Saving...';

        const isLastQuestionInRound = currentQuestionIndex >= totalQ - 1;

        if (!isLastQuestionInRound) return 'Next →';

        // Check if there's a next round
        if (pipelineConfig?.rounds && currentRoundIndex < pipelineConfig.rounds.length - 1) {
            const nextRound = pipelineConfig.rounds[currentRoundIndex + 1];
            const nextRoundInfo = ROUND_TYPE_INFO[nextRound?.roundType];
            return `Continue to ${nextRound?.title || nextRoundInfo?.label || 'Next Round'} →`;
        }

        return 'Complete Interview';
    };

    return (
        <div className="ai-interview">


            {/* Header */}
            <div className="interview-header">
                <div className="header-left">
                    <h2>AI Interview</h2>
                    {job && <p className="job-context">{job.title}</p>}

                    {/* Pipeline-aware rounds display */}
                    {pipelineConfig?.rounds && pipelineConfig.rounds.length > 0 ? (
                        <div className="rounds-progress">
                            {pipelineConfig.rounds.map((r, i) => (
                                <span
                                    key={i}
                                    className={`round-dot ${i === currentRoundIndex ? 'active' : i < currentRoundIndex ? 'done' : ''}`}
                                    title={r.title || ROUND_TYPE_INFO[r.roundType]?.label}
                                >
                                    {ROUND_TYPE_INFO[r.roundType]?.icon || <Icons.screening />}
                                </span>
                            ))}
                        </div>
                    ) : (
                        // Legacy fallback for non-pipeline interviews
                        <div className="round-indicator">
                            <span className={`round-badge active`}>Technical</span>
                            <span className="round-arrow">→</span>
                            <span className={`round-badge`}>HR</span>
                        </div>
                    )}
                    <p className="question-progress">
                        Q {currentQuestionIndex + 1}/{totalQ} ({currentRound?.title || ROUND_TYPE_INFO[currentRoundType]?.label || 'Interview'})
                    </p>
                </div>
                <div className="header-right">
                    <div className="timer">⏱️ {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                        if (window.confirm('Are you sure you want to exit? Your progress will be saved, but this session will end.')) {
                            setSubmitting(true);
                            await finalizeVideoRecording();
                            stopCamera();
                            navigate('/jobseeker/interviews');
                        }
                    }}>Exit</button>
                </div>
            </div>

            {/* Progress */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Content */}
            <div className="interview-content">
                {/* Video */}
                <div className="video-section">
                    <div className="video-container">
                        <video ref={videoRef} autoPlay muted className="video-feed"></video>
                        {isRecording && <div className="recording-indicator"><span className="recording-dot"></span> Recording</div>}

                        {/* Proctoring Component - detects tab switch, face, etc */}
                        <InterviewProctor
                            videoRef={videoRef}
                            enabled={isRecording}
                            onViolationLog={handleViolationLog}
                        />

                        {/* Violation Counter Badge */}
                        {proctoringViolations.length > 0 && (
                            <div className="violation-counter-badge">
                                <Icons.warning /> {proctoringViolations.length}
                            </div>
                        )}
                    </div>
                    <p className="camera-info text-muted"><Icons.camera /> {isRecording ? 'Camera active' : 'Camera off'}</p>

                </div>

                {/* Question & Answer */}
                <div className="question-section">
                    <div className="question-card card">
                        <div className="question-header">
                            <span className="question-badge">
                                {ROUND_TYPE_INFO[currentRoundType]?.icon || <Icons.technical />} {currentRound?.title || ROUND_TYPE_INFO[currentRoundType]?.label || 'Technical'}
                            </span>
                            <span className={`difficulty-badge ${currentQuestion.difficulty || 'medium'}`}>
                                {currentQuestion.difficulty || 'Medium'}
                            </span>
                        </div>
                        <h3 className="question-text">{cleanQuestionText(currentQuestion.question)}</h3>
                        {currentQuestion.assessingSkill && (
                            <p className="assessing-skill">Skill: {currentQuestion.assessingSkill}</p>
                        )}
                        {/* Text-to-Speech Button */}
                        <button
                            className={`tts-btn ${isSpeaking ? 'speaking' : ''}`}
                            onClick={isSpeaking ? stopSpeaking : speakQuestion}
                            disabled={!ttsSupported}
                            title={isSpeaking ? 'Stop reading' : 'Read question aloud'}
                        >
                            {isSpeaking ? <><Icons.speaker /> Stop Reading</> : <><Icons.play /> Read Question</>}
                        </button>
                    </div>

                    <div className="answer-section">
                        <div className="answer-header">
                            <label className="form-label">Your Answer</label>
                            <button
                                className={`speech-btn ${isListening ? 'listening' : ''}`}
                                onClick={toggleListening}
                                disabled={!speechSupported || submitting}
                            >
                                {isListening ? <><Icons.stop /> Stop</> : <><Icons.mic /> Speak</>}
                            </button>
                        </div>

                        {isListening && (
                            <div className="listening-indicator">
                                <span className="listening-dot"></span>
                                Listening... {transcript && <span className="interim-text">"{transcript}"</span>}
                            </div>
                        )}

                        <textarea
                            className="answer-input input"
                            placeholder="Type or speak your answer..."
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            rows="8"
                            disabled={submitting}
                        />

                        <div className="answer-actions">
                            <button className="btn btn-secondary" onClick={() => setAnswer('')}>Clear</button>
                            <button
                                className="btn btn-primary"
                                onClick={submitAnswer}
                                disabled={submitting || !answer.trim()}
                            >
                                {getNextButtonText()}
                            </button>
                        </div>
                    </div>

                    <div className="interview-tips card-glass">
                        <h4><Icons.brain /> {currentRound?.title || ROUND_TYPE_INFO[currentRoundType]?.label || 'Interview'} Tips</h4>
                        <ul>
                            {(currentRoundType === 'technical' || currentRoundType === 'coding' || currentRoundType === 'dsa') ? (
                                <>
                                    <li>Be specific about technologies</li>
                                    <li>Explain your approach step by step</li>
                                </>
                            ) : currentRoundType === 'hr' || currentRoundType === 'behavioral' ? (
                                <>
                                    <li>Use STAR method</li>
                                    <li>Be honest about challenges</li>
                                </>
                            ) : (
                                <>
                                    <li>Answer clearly and concisely</li>
                                    <li>Provide specific examples</li>
                                </>
                            )}
                            <li><Icons.mic /> Click Speak to use voice!</li>
                        </ul>
                    </div>
                </div>
            </div>
            {submitting && (
                <div className="submitting-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    color: 'white'
                }}>
                    <div className="loading-spinner" style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '4px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '20px'
                    }}></div>
                    <p style={{ fontSize: '1.2rem' }}>
                        {uploadingVideo ? '📤 Uploading interview recording...' : '🔍 Evaluating your responses...'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AIInterview;
