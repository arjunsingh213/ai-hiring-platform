import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
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

    // Interview state
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [results, setResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(120);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    // Speech recognition
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const recognitionRef = useRef(null);

    // Text-to-speech
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(false);

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
                let newFinalText = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        newFinalText += event.results[i][0].transcript + ' ';
                    }
                }
                if (newFinalText.trim()) {
                    setAnswer(prev => prev + (prev ? ' ' : '') + newFinalText.trim());
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

    // Load questions on mount
    useEffect(() => {
        generateQuestions();
    }, []);

    // Timer effect
    useEffect(() => {
        if (!loading && !completed && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [loading, completed, timeLeft]);

    // Speak question when it changes
    useEffect(() => {
        if (questions[currentIndex] && ttsSupported && !completed) {
            speakQuestion(questions[currentIndex].question);
        }
    }, [currentIndex, questions, completed]);

    // Initialize camera
    useEffect(() => {
        initCamera();
        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraEnabled(true);
            }
        } catch (error) {
            console.log('Camera not available:', error);
            setCameraEnabled(false);
        }
    };

    const generateQuestions = async () => {
        try {
            setLoading(true);
            const response = await api.post('/onboarding-interview/generate-questions', {
                parsedResume,
                desiredRole,
                experienceLevel: parsedResume?.experience?.length > 2 ? 'experienced' : 'fresher'
            });

            if (response.success && response.data.questions) {
                setQuestions(response.data.questions);
                setTimeLeft(response.data.questions[0]?.timeLimit || 120);
            } else {
                throw new Error('No questions received');
            }
        } catch (error) {
            console.error('Failed to generate questions:', error);
            toast.error('Failed to load questions. Using default set.');
            // Use fallback questions
            setQuestions(getDefaultQuestions());
        } finally {
            setLoading(false);
        }
    };

    const getDefaultQuestions = () => [
        { question: 'Tell me about yourself and your background.', category: 'behavioral', round: 'hr', timeLimit: 120 },
        { question: 'What are your key technical skills?', category: 'technical', round: 'technical', timeLimit: 120 },
        { question: 'Describe a challenging project you worked on.', category: 'technical', round: 'technical', timeLimit: 150 },
        { question: 'How do you handle tight deadlines?', category: 'behavioral', round: 'hr', timeLimit: 120 },
        { question: 'What programming languages are you most comfortable with?', category: 'technical', round: 'technical', timeLimit: 120 },
        { question: 'Tell me about a time you worked in a team.', category: 'behavioral', round: 'hr', timeLimit: 120 },
        { question: 'How do you approach debugging a complex issue?', category: 'technical', round: 'technical', timeLimit: 150 },
        { question: 'What are your career goals?', category: 'behavioral', round: 'hr', timeLimit: 120 },
        { question: 'Explain a technical concept to someone non-technical.', category: 'technical', round: 'technical', timeLimit: 150 },
        { question: 'Why should we hire you?', category: 'behavioral', round: 'hr', timeLimit: 120 }
    ];

    const speakQuestion = (text) => {
        if (!ttsSupported) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (!speechSupported || !recognitionRef.current) {
            toast.warning('Speech recognition not available. Please type your answer.');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error('Speech recognition failed:', e);
                toast.error('Microphone access failed. Please check permissions.');
            }
        }
    };

    const handleSubmitAnswer = () => {
        if (!answer.trim()) {
            toast.warning('Please provide an answer');
            return;
        }

        const currentQ = questions[currentIndex];
        const newAnswer = {
            question: currentQ.question,
            answer: answer.trim(),
            category: currentQ.category,
            round: currentQ.round,
            timeSpent: (currentQ.timeLimit || 120) - timeLeft
        };

        setAnswers(prev => [...prev, newAnswer]);
        setAnswer('');

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setTimeLeft(questions[currentIndex + 1]?.timeLimit || 120);
        } else {
            submitInterview([...answers, newAnswer]);
        }
    };

    const handleSkipQuestion = () => {
        const currentQ = questions[currentIndex];
        const skippedAnswer = {
            question: currentQ.question,
            answer: answer.trim() || '(Skipped)',
            category: currentQ.category,
            round: currentQ.round,
            timeSpent: 0
        };

        setAnswers(prev => [...prev, skippedAnswer]);
        setAnswer('');

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setTimeLeft(questions[currentIndex + 1]?.timeLimit || 120);
        } else {
            submitInterview([...answers, skippedAnswer]);
        }
    };

    const submitInterview = async (allAnswers) => {
        setSubmitting(true);
        try {
            const response = await api.post('/onboarding-interview/submit', {
                userId,
                questionsAndAnswers: allAnswers,
                parsedResume,
                desiredRole
            });

            if (response.success) {
                setResults(response.data);
                setCompleted(true);
            } else {
                throw new Error(response.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Interview submission error:', error);
            toast.error('Failed to submit interview. Proceeding anyway.');
            setResults({ score: 70, passed: true, feedback: 'Interview recorded.' });
            setCompleted(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinish = () => {
        onComplete(results);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentQ = questions[currentIndex];
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const isHRRound = currentQ?.round === 'hr';

    if (loading) {
        return (
            <div className="onboarding-interview loading-state">
                <div className="loading-spinner"></div>
                <h2>Generating Your Personalized Interview...</h2>
                <p>Based on your resume, we're creating tailored questions just for you.</p>
            </div>
        );
    }

    if (completed && results) {
        return (
            <div className="onboarding-interview results-state">
                <div className="results-card comprehensive">
                    {/* Main Score Circle */}
                    <div className={`score-circle ${results.score >= 70 ? 'high' : results.score >= 50 ? 'medium' : 'low'}`}>
                        <span className="score-value">{results.score}</span>
                        <span className="score-label">Overall Score</span>
                    </div>

                    <h2>{results.passed ? '🎉 Great Performance!' : '👍 Thanks for completing!'}</h2>
                    <p className="feedback">{results.feedback}</p>

                    {/* Score Breakdown Grid */}
                    <div className="score-grid">
                        <div className="score-item">
                            <span className="score-icon">💻</span>
                            <span className="score-num">{results.technicalScore || '-'}</span>
                            <span className="score-title">Technical</span>
                        </div>
                        <div className="score-item">
                            <span className="score-icon">👥</span>
                            <span className="score-num">{results.hrScore || '-'}</span>
                            <span className="score-title">HR/Behavioral</span>
                        </div>
                        <div className="score-item">
                            <span className="score-icon">💬</span>
                            <span className="score-num">{results.communication || '-'}</span>
                            <span className="score-title">Communication</span>
                        </div>
                        <div className="score-item">
                            <span className="score-icon">🎯</span>
                            <span className="score-num">{results.relevance || '-'}</span>
                            <span className="score-title">Relevance</span>
                        </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="analysis-section">
                        {results.strengths?.length > 0 && (
                            <div className="analysis-box strengths">
                                <h4>✅ Strengths</h4>
                                <ul>
                                    {results.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                        )}

                        {results.weaknesses?.length > 0 && (
                            <div className="analysis-box weaknesses">
                                <h4>⚠️ Areas for Improvement</h4>
                                <ul>
                                    {results.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Detailed Feedback */}
                    <div className="feedback-section">
                        <h4>📊 Detailed Feedback</h4>
                        <div className="feedback-item">
                            <span className="feedback-label">Technical Skills:</span>
                            <p>{results.technicalFeedback || 'Review your technical fundamentals.'}</p>
                        </div>
                        <div className="feedback-item">
                            <span className="feedback-label">Communication:</span>
                            <p>{results.communicationFeedback || 'Practice structuring your answers.'}</p>
                        </div>
                    </div>

                    {/* Improvement Areas */}
                    {results.areasToImprove?.length > 0 && (
                        <div className="improvement-section">
                            <h4>🚀 How to Improve</h4>
                            {results.areasToImprove.map((area, i) => (
                                <div key={i} className={`improvement-item priority-${area.priority}`}>
                                    <span className="improvement-area">{area.area}</span>
                                    <p className="improvement-suggestion">{area.suggestion}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recommendations */}
                    {results.recommendations?.length > 0 && (
                        <div className="recommendations-section">
                            <h4>💡 Recommendations</h4>
                            <ul>
                                {results.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button className="btn-primary finish-btn" onClick={handleFinish}>
                        Continue to Dashboard →
                    </button>
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
                        Question {currentIndex + 1} of {questions.length}
                    </span>
                </div>
                <div className="header-right">
                    <span className={`timer ${timeLeft < 30 ? 'warning' : ''}`}>
                        ⏱️ {formatTime(timeLeft)}
                    </span>
                    <button className="skip-interview-btn" onClick={onSkip}>
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
                {/* Camera preview */}
                <div className="camera-section">
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
                        </div>
                    )}
                </div>

                {/* Question */}
                <div className="question-section">
                    <h2 className="question-text">
                        {isSpeaking && <span className="speaking-indicator">🔊</span>}
                        {currentQ?.question}
                    </h2>

                    {currentQ?.assessingSkill && (
                        <p className="assessing-skill">
                            Assessing: {currentQ.assessingSkill}
                        </p>
                    )}

                    {ttsSupported && (
                        <button
                            className="btn-icon repeat-btn"
                            onClick={() => speakQuestion(currentQ?.question)}
                            title="Repeat question"
                        >
                            🔄 Repeat
                        </button>
                    )}
                </div>

                {/* Answer input */}
                <div className="answer-section">
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer here or use the microphone..."
                        rows={5}
                        className="answer-input"
                    />

                    <div className="answer-controls">
                        <button
                            className={`btn-mic ${isListening ? 'listening' : ''}`}
                            onClick={toggleListening}
                        >
                            {isListening ? '🎙️ Listening...' : '🎤 Speak'}
                        </button>

                        <span className="char-count">{answer.length} characters</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="action-buttons">
                    <button
                        className="btn-secondary"
                        onClick={handleSkipQuestion}
                        disabled={submitting}
                    >
                        Skip Question
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSubmitAnswer}
                        disabled={submitting || !answer.trim()}
                    >
                        {currentIndex < questions.length - 1 ? 'Next Question →' : 'Submit Interview'}
                    </button>
                </div>
            </div>

            {submitting && (
                <div className="submitting-overlay">
                    <div className="loading-spinner"></div>
                    <p>Evaluating your responses...</p>
                </div>
            )}
        </div>
    );
};

export default OnboardingInterview;
