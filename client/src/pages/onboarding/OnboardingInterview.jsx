import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
import CodeIDE from '../../components/CodeIDE';
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

    // Coding test state
    const [showCodingTest, setShowCodingTest] = useState(false);
    const [codingProblem, setCodingProblem] = useState(null);
    const [detectedLanguages, setDetectedLanguages] = useState([]);
    const [codingResults, setCodingResults] = useState(null);
    const [loadingProblem, setLoadingProblem] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

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

    const [loadingNext, setLoadingNext] = useState(false);

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
                setTimeLeft(120);
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
                if (response.completed || updatedAnswers.length >= 10 || currentIndex >= 9) {
                    // Interview done - move to coding test or final evaluation
                    submitInterview(updatedAnswers);
                } else if (response.question && updatedAnswers.length < 10 && currentIndex < 9) {
                    // Add next question and proceed (only if under limit)
                    setQuestions(prev => [...prev, response.question]);
                    setCurrentIndex(prev => prev + 1);
                    setTimeLeft(120);
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

                // Check if user has programming skills → show coding test
                if (detectedLanguages.length > 0) {
                    toast.success('Interview complete! Preparing coding challenge...');
                    loadCodingProblem();
                } else {
                    // Non-technical user → skip to results
                    setCompleted(true);
                }
            } else {
                throw new Error(response.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Interview submission error:', error);
            toast.error('Failed to submit interview. Proceeding anyway.');
            setResults({ score: 70, passed: true, feedback: 'Interview recorded.' });

            // Still check for coding test
            if (detectedLanguages.length > 0) {
                loadCodingProblem();
            } else {
                setCompleted(true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Load coding problem for the candidate
    const loadCodingProblem = async () => {
        console.log('🔵 [CODING TEST] Starting loadCodingProblem...');
        console.log('🔵 [CODING TEST] Detected languages:', detectedLanguages);

        setLoadingProblem(true);
        try {
            const primaryLanguage = detectedLanguages[0];
            console.log('🔵 [CODING TEST] Primary language:', primaryLanguage);

            const requestData = {
                skills: parsedResume?.skills || [],
                language: primaryLanguage?.name || 'JavaScript',
                difficulty: 'easy'
            };
            console.log('🔵 [CODING TEST] Request data:', requestData);

            const response = await api.post('/code/generate-problem', requestData);
            console.log('🔵 [CODING TEST] Response:', response);

            if (response.success && response.problem) {
                console.log('✅ [CODING TEST] Problem generated successfully:', response.problem.title);
                setCodingProblem({
                    ...response.problem,
                    languageId: primaryLanguage?.judge0Id || 71
                });
                setShowCodingTest(true);
            } else {
                console.error('❌ [CODING TEST] Response missing success or problem:', response);
                throw new Error('Failed to generate problem');
            }
        } catch (error) {
            console.error('❌ [CODING TEST] Error loading coding problem:', error);
            console.error('❌ [CODING TEST] Error details:', {
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

        toast.success(`Coding test completed! Score: ${codingResult.score}/100`);
        setCompleted(true);
    };

    // Skip coding test
    const handleSkipCoding = () => {
        setShowCodingTest(false);
        setCodingResults({ skipped: true });
        toast.info('Coding test skipped.');
        setCompleted(true);
    };

    const handleFinish = () => {
        onComplete({
            ...results,
            codingResults
        });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    if (completed && results) {
        return (
            <div className="onboarding-interview results-state">
                <div className="results-card comprehensive">
                    {/* Main Score Circle */}
                    <div className={`score-circle ${results.score >= 70 ? 'high' : results.score >= 50 ? 'medium' : 'low'}`}>
                        <span className="score-value">{results.score}</span>
                        <span className="score-label">Overall Score</span>
                    </div>

                    <h2>
                        {results.passed
                            ? '🎉 Great Performance!'
                            : results.score >= 50
                                ? '⚠️ Needs Improvement'
                                : '❌ Did Not Pass'}
                    </h2>
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
                        {results.codingScore !== undefined && (
                            <div className="score-item coding">
                                <span className="score-icon">🧑‍💻</span>
                                <span className="score-num">{results.codingScore}</span>
                                <span className="score-title">Coding ({results.codingLanguage || 'Code'})</span>
                            </div>
                        )}
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
                        Question {currentIndex + 1} of 10
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
                        disabled={submitting || !answer.trim() || loadingNext}
                    >
                        {loadingNext
                            ? 'Analyzing & Generating Next Question...'
                            : (currentIndex < 9 ? 'Next Question →' : 'Submit Interview')}
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
