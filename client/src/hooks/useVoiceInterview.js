import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const useVoiceInterview = (interviewId, isEnabled = true, resetTrigger = null) => {
    const [status, setStatus] = useState('connecting');
    const [avatarState, setAvatarState] = useState('idle');
    const [currentQuestionText, setCurrentQuestionText] = useState("Connecting to AI Interviewer...");
    const [partialTranscript, setPartialTranscript] = useState('');
    const [liveTranscript, setLiveTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);

    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const isRecordingSessionActive = useRef(false);

    const audioPlayerRef = useRef(typeof Audio !== "undefined" ? new Audio() : null);
    const audioChunksRef = useRef([]);
    const isPlayingRef = useRef(false);
    const safetyTimerRef = useRef(null);

    const configRef = useRef({});
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    // Mutable refs for callbacks
    const currentQuestionTextRef = useRef(currentQuestionText);
    const avatarStateRef = useRef(avatarState);
    const hasReceivedAudioRef = useRef(false);

    useEffect(() => { currentQuestionTextRef.current = currentQuestionText; }, [currentQuestionText]);
    useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);

    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            if (!interviewId) return;
            setConfigLoaded(false);
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/interviews/${interviewId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                if (data.success) {
                    const interview = data.data;
                    const isPlatform = interview.interviewType === 'platform';

                    configRef.current = {
                        interviewId,
                        candidateId: interview.userId?._id || interview.userId,
                        jobId: interview.jobId?._id || interview.jobId || null,
                        jobSkills: isPlatform
                            ? (interview.metadata?.resumeSkills || [])
                            : (interview.jobId?.requirements?.skills || []),
                        // Platform interview extras
                        interviewType: isPlatform ? 'platform' : 'job_specific',
                        resumeSkills: isPlatform ? (interview.metadata?.resumeSkills || []) : null,
                        resumeContext: isPlatform ? {
                            desiredRole: interview.metadata?.desiredRole,
                            experienceLevel: interview.metadata?.experienceLevel,
                            domains: interview.metadata?.jobDomains || [],
                            projects: interview.metadata?.resumeProjects || [],
                            experience: interview.metadata?.resumeExperience || []
                        } : null
                    };
                    console.log(`[Voice] Config loaded (${isPlatform ? 'PLATFORM' : 'JOB'}):`, configRef.current.jobSkills?.slice(0, 3));
                    setConfigLoaded(true);
                }
            } catch (err) {
                console.error('[Voice] Failed to fetch interview config:', err);
            }
        };
        fetchConfig();
    }, [interviewId]);

    const stopRecording = useCallback(async () => {
        if (!isRecordingSessionActive.current) return null;
        isRecordingSessionActive.current = false;
        console.log('[Voice] Stopping Mic');

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Stop live speech recognition
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
        }

        setIsSpeaking(false);
        setVolumeLevel(0);

        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('silence_detected');
            setAvatarState('thinking');
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (isRecordingSessionActive.current) return;
        isRecordingSessionActive.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socketRef.current && socketRef.current.connected) {
                    event.data.arrayBuffer().then(buffer => {
                        socketRef.current.emit('audio_chunk', { audioBlob: buffer });
                    });
                }
            };

            mediaRecorder.start(500);
            setIsSpeaking(true);
            setAvatarState('listening');

            const source = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            let silenceStart = Date.now();
            let isUserCurrentlySpeaking = false;
            let speakingStartTime = null;

            const checkVolume = () => {
                if (!analyserRef.current || !isRecordingSessionActive.current) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;

                setVolumeLevel(Math.min(100, Math.round(average * 2.5)));

                // ONLY trigger VAD logic if we are supposed to be listening (not speaking, not processing)
                if (avatarStateRef.current === 'listening') {
                    if (average > 4) { // Slightly higher threshold to ignore static
                        if (!isUserCurrentlySpeaking) {
                            isUserCurrentlySpeaking = true;
                            speakingStartTime = Date.now();
                        }
                        silenceStart = Date.now();
                    } else if (isUserCurrentlySpeaking) {
                        const hasSpokenEnough = speakingStartTime && (Date.now() - speakingStartTime > 2000);
                        if (hasSpokenEnough && Date.now() - silenceStart > 4000) {
                            isUserCurrentlySpeaking = false;
                            speakingStartTime = null;
                            stopRecording();
                        }
                    }
                }

                if (isRecordingSessionActive.current) requestAnimationFrame(checkVolume);
            };

            checkVolume();

            // Start live speech recognition for real-time transcript
            finalTranscriptRef.current = '';
            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'en-US';
                    recognitionRef.current = recognition;

                    recognition.onresult = (event) => {
                        let currentInterim = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                // Append finalized text to our accumulated ref
                                finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + transcript).trim();
                            } else {
                                currentInterim = transcript;
                            }
                        }
                        // Display: all finalized text + current interim (no duplication)
                        const display = currentInterim
                            ? (finalTranscriptRef.current + ' ' + currentInterim).trim()
                            : finalTranscriptRef.current;
                        setLiveTranscript(display);
                    };

                    recognition.onerror = (e) => {
                        if (e.error !== 'aborted') console.log('[Voice] SpeechRecognition error:', e.error);
                    };

                    recognition.start();
                    console.log('[Voice] Live speech recognition started');
                }
            } catch (e) {
                console.log('[Voice] SpeechRecognition not available:', e.message);
            }
        } catch (error) {
            console.error('[Voice] Mic failed:', error);
            setStatus('error');
            isRecordingSessionActive.current = false;
        }
    }, [stopRecording]);

    const transitionToListening = useCallback(() => {
        isPlayingRef.current = false;
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        audioChunksRef.current = [];
        if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
        }

        setAvatarState('listening');
        startRecording();
    }, [startRecording]);

    // Use Refs for functions called in listeners to keep useEffect dependencies stable
    const transitionRef = useRef(transitionToListening);
    useEffect(() => { transitionRef.current = transitionToListening; }, [transitionToListening]);

    const speakWithNativeTTS = useCallback((text) => {
        if (!window.speechSynthesis) {
            transitionRef.current();
            return;
        }
        window.speechSynthesis.cancel();

        // Remove markdown or AI prefixes before speaking
        const cleanText = text.replace(/\*\*/g, '').replace(/question:/i, '').trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => transitionRef.current();
        utterance.onerror = () => transitionRef.current();

        window.speechSynthesis.speak(utterance);
    }, []);

    const nativeTTSRef = useRef(speakWithNativeTTS);
    useEffect(() => { nativeTTSRef.current = speakWithNativeTTS; }, [speakWithNativeTTS]);

    useEffect(() => {
        if (!interviewId || !isEnabled || !configLoaded) return;

        // Reset state for new connection (important for multi-round interviews)
        setStatus('connecting');
        setAvatarState('idle');
        setCurrentQuestionText("Connecting to AI Interviewer...");

        const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        console.log('[Voice] 🔌 Establishing connection for', interviewId, 'round trigger:', resetTrigger);

        const newSocket = io(`${socketUrl}/adaptive-interview`, {
            withCredentials: true,
            transports: ['websocket'],
            reconnection: true
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            const config = configRef.current;
            newSocket.emit('start_interview', {
                interviewId: config.interviewId,
                candidateId: config.candidateId,
                jobId: config.jobId,
                jobSkills: config.jobSkills,
                currentRoundIndex: resetTrigger,
                // Platform interview extras
                interviewType: config.interviewType || 'job_specific',
                resumeSkills: config.resumeSkills,
                resumeContext: config.resumeContext
            });
        });

        newSocket.on('session_initialized', () => {
            setStatus('ready');
            setAvatarState('idle');
            setCurrentQuestionText("System ready.");
        });

        newSocket.on('ai_question_text', (data) => {
            console.log('[Voice] 🤖 Question Received:', data.text);
            if (data.text) {
                setCurrentQuestionText(data.text);
                setAvatarState('speaking');
                setPartialTranscript('');
                setLiveTranscript('');
                finalTranscriptRef.current = '';
                audioChunksRef.current = [];
                isPlayingRef.current = false;
                hasReceivedAudioRef.current = false;

                if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

                safetyTimerRef.current = setTimeout(() => {
                    if (avatarStateRef.current === 'speaking' && !hasReceivedAudioRef.current) {
                        console.log('[Voice] 🎙️ Server audio delay, using native fallback.');
                        nativeTTSRef.current(data.text);
                    }
                }, 5000);
            }
        });

        newSocket.on('ai_question_audio_chunk', async (data) => {
            hasReceivedAudioRef.current = true;
            if (data.chunk) {
                const byteCharacters = atob(data.chunk);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                audioChunksRef.current.push(new Uint8Array(byteNumbers));
            }

            if (data.isFinal && !isPlayingRef.current) {
                isPlayingRef.current = true;
                const blob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });

                // If it's the silent fallback MP3 (elevenlabs not configured or failed)
                if (blob.size < 500) {
                    nativeTTSRef.current(currentQuestionTextRef.current);
                    return;
                }

                if (audioPlayerRef.current) {
                    audioPlayerRef.current.src = URL.createObjectURL(blob);
                    try {
                        await audioPlayerRef.current.play();
                        audioPlayerRef.current.onended = () => transitionRef.current();
                    } catch (e) {
                        nativeTTSRef.current(currentQuestionTextRef.current);
                    }
                } else {
                    nativeTTSRef.current(currentQuestionTextRef.current);
                }
            }
        });

        newSocket.on('tts_error', () => {
            nativeTTSRef.current(currentQuestionTextRef.current);
        });

        newSocket.on('partial_transcript', (data) => {
            if (data.isFinal) setPartialTranscript(data.text);
            else setPartialTranscript(prev => prev + ' ' + data.text);
        });

        newSocket.on('interview_complete', (data) => {
            console.log('[Voice] 🏁 Interview Complete Event:', data.reason);
            setStatus('completed');
            setAvatarState('idle');
            setCurrentQuestionText("Interview Complete. Redirecting...");
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
            window.speechSynthesis.cancel();
            newSocket.disconnect();
        });

        return () => {
            console.log('[Voice] 🛑 Socket Cleanup');
            newSocket.disconnect();
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
            window.speechSynthesis.cancel();
        };
        // MUST ONLY DEPEND ON interviewId OR resetTrigger to flush state correctly between rounds
    }, [interviewId, resetTrigger, isEnabled, configLoaded]);

    const forceSilenceDetection = () => stopRecording();

    const skipAIPlayback = useCallback(() => {
        window.speechSynthesis.cancel();
        transitionRef.current();
    }, []);

    return {
        status,
        avatarState,
        currentQuestionText,
        partialTranscript,
        liveTranscript,
        isSpeaking,
        volumeLevel,
        startRecording,
        stopRecording,
        forceSilenceDetection,
        skipAIPlayback
    };
};

export default useVoiceInterview;
