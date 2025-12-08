import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import './AIInterview.css';

const AIInterview = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const videoRef = useRef(null);

    const [interview, setInterview] = useState(null);
    const [job, setJob] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [timeSpent, setTimeSpent] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [finalResults, setFinalResults] = useState(null);
    const [currentRound, setCurrentRound] = useState('technical');
    const [allAnswers, setAllAnswers] = useState([]);

    // Speech-to-Text states
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);

    // Text-to-Speech states
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(false);

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

        const question = interview?.questions?.[currentQuestionIndex]?.question;
        if (!question) return;

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
        fetchInterview();
        startCamera();
        const timer = setInterval(() => setTimeSpent(prev => prev + 1), 1000);
        return () => {
            clearInterval(timer);
            stopCamera();
        };
    }, []);

    const fetchInterview = async () => {
        try {
            const response = await api.get(`/interviews/${interviewId}`);
            const data = response.data || response;
            console.log('Loaded interview:', data);

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

            // Set question index with bounds check
            const questionsLen = data.questions?.length || 0;
            const responsesLen = data.responses?.length || 0;

            if (responsesLen > 0 && responsesLen < questionsLen) {
                setCurrentQuestionIndex(responsesLen);
                setAllAnswers(data.responses);
            } else if (responsesLen >= questionsLen && questionsLen > 0) {
                // All questions answered - show completion
                setCompleted(true);
                setFinalResults({
                    scoring: data.scoring || {},
                    recruiterReport: data.recruiterReport
                });
            }
        } catch (error) {
            console.error('Error:', error);
            navigate('/jobseeker/interviews');
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsRecording(true);
        } catch (e) {
            setIsRecording(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop());
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

            await api.post(`/interviews/${interviewId}/response`, {
                questionIndex: currentQuestionIndex,
                answer: answer.trim(),
                timeSpent,
                round: currentRound
            });

            setAnswer('');
            setTranscript('');
            setTimeSpent(0);

            const nextIndex = currentQuestionIndex + 1;
            if (nextIndex >= questions.length) {
                await completeInterview();
            } else {
                const halfPoint = Math.ceil(questions.length / 2);
                if (currentRound === 'technical' && nextIndex >= halfPoint) {
                    setCurrentRound('hr');
                }
                setCurrentQuestionIndex(nextIndex);
            }
        } catch (e) {
            console.error('Submit error:', e);
            toast.error('Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    const completeInterview = async () => {
        try {
            const response = await api.post(`/interviews/${interviewId}/complete`, {
                allAnswers,
                evaluateOverall: true
            });
            setCompleted(true);
            setFinalResults(response.data || response);
            stopCamera();
        } catch (e) {
            console.error('Complete error:', e);
        }
    };

    // Loading
    if (!interview) {
        return (
            <div className="ai-interview loading-state">
                <div className="loading-spinner-large"></div>
                <p>Loading interview...</p>
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
                            {score >= 60 ? '✓' : '!'}
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
                                <span className="round-label">Technical</span>
                                <span className="round-value">{Math.round(finalResults.scoring?.technicalAccuracy || 0)}%</span>
                            </div>
                            <div className="round-score-item">
                                <span className="round-label">HR</span>
                                <span className="round-value">{Math.round(finalResults.scoring?.communication || 0)}%</span>
                            </div>
                        </div>
                        {finalResults.scoring?.strengths?.length > 0 && (
                            <div className="strengths-section">
                                <h3>Strengths</h3>
                                <div className="strength-tags">
                                    {finalResults.scoring.strengths.map((s, i) => (
                                        <span key={i} className="strength-tag">✓ {s}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {finalResults.scoring?.weaknesses?.length > 0 && (
                            <div className="weaknesses-section">
                                <h3>Areas to Improve</h3>
                                <div className="strength-tags">
                                    {finalResults.scoring.weaknesses.map((w, i) => (
                                        <span key={i} className="weakness-tag">⚠ {w}</span>
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
    const totalQ = questions.length || 1;
    const halfPoint = Math.ceil(totalQ / 2);
    const inTechnical = currentQuestionIndex < halfPoint;
    const qInRound = inTechnical ? currentQuestionIndex + 1 : currentQuestionIndex - halfPoint + 1;
    const roundTotal = inTechnical ? halfPoint : totalQ - halfPoint;
    const progress = ((currentQuestionIndex + 1) / totalQ) * 100;

    return (
        <div className="ai-interview">
            {/* Header */}
            <div className="interview-header">
                <div className="header-left">
                    <h2>AI Interview</h2>
                    {job && <p className="job-context">{job.title}</p>}
                    <div className="round-indicator">
                        <span className={`round-badge ${inTechnical ? 'active' : ''}`}>Technical</span>
                        <span className="round-arrow">→</span>
                        <span className={`round-badge ${!inTechnical ? 'active' : ''}`}>HR</span>
                    </div>
                    <p className="question-progress">Q {qInRound}/{roundTotal} ({inTechnical ? 'Technical' : 'HR'})</p>
                </div>
                <div className="header-right">
                    <div className="timer">⏱️ {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobseeker/interviews')}>Exit</button>
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
                    </div>
                    <p className="camera-info text-muted">📹 {isRecording ? 'Camera active' : 'Camera off'}</p>
                </div>

                {/* Question & Answer */}
                <div className="question-section">
                    <div className="question-card card">
                        <div className="question-header">
                            <span className="question-badge">{inTechnical ? '💻 Technical' : '👔 HR'}</span>
                            <span className={`difficulty-badge ${currentQuestion.difficulty || 'medium'}`}>
                                {currentQuestion.difficulty || 'Medium'}
                            </span>
                        </div>
                        <h3 className="question-text">{currentQuestion.question}</h3>
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
                            {isSpeaking ? '🔊 Stop Reading' : '🔈 Read Question'}
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
                                {isListening ? '🔴 Stop' : '🎤 Speak'}
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
                                {submitting ? 'Saving...' :
                                    currentQuestionIndex < totalQ - 1
                                        ? (currentQuestionIndex === halfPoint - 1 ? 'Continue to HR →' : 'Next →')
                                        : 'Complete Interview'
                                }
                            </button>
                        </div>
                    </div>

                    <div className="interview-tips card-glass">
                        <h4>💡 {inTechnical ? 'Technical Tips' : 'HR Tips'}</h4>
                        <ul>
                            {inTechnical ? (
                                <>
                                    <li>Be specific about technologies</li>
                                    <li>Explain your approach step by step</li>
                                </>
                            ) : (
                                <>
                                    <li>Use STAR method</li>
                                    <li>Be honest about challenges</li>
                                </>
                            )}
                            <li>🎤 Click Speak to use voice!</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIInterview;
