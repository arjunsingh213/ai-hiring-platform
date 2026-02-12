import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import useAntiCheat from '../../hooks/useAntiCheat';

// Per-question time limits based on question type (in seconds)
const QUESTION_TIME_LIMITS = {
    mcq: 60,              // 60s — pick an answer, not enough to camera→AI→select
    'short-answer': 90,   // 90s — camera→AI→type takes ~40s, leaves little for natural answer
    code: 150,            // 150s — coding needs more time, but AI code is detectable
    essay: 120,           // 120s
    simulation: 120       // 120s
};

const ChallengeDetail = ({ challenge, onClose, onComplete }) => {
    const [view, setView] = useState('info'); // info | active | results
    const [attemptId, setAttemptId] = useState(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);       // overall timer
    const [questionTime, setQuestionTime] = useState(0); // per-question timer
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [starting, setStarting] = useState(false);
    const [warningFlash, setWarningFlash] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const timerRef = useRef(null);
    const qTimerRef = useRef(null);
    const questionStartTimeRef = useRef(null);
    const perQuestionTimingRef = useRef([]);
    const userId = localStorage.getItem('userId');

    const antiCheat = useAntiCheat(view === 'active');

    // Initialize answers
    useEffect(() => {
        if (challenge?.questions) {
            setAnswers(challenge.questions.map((q, i) => ({
                questionIndex: i,
                answer: '',
                codeSubmission: '',
                timeSpent: 0
            })));
            perQuestionTimingRef.current = challenge.questions.map(() => ({
                startedAt: null,
                firstKeystroke: null,
                submittedAt: null,
                tabSwitchesDuring: 0,
                idleGaps: []
            }));
        }
    }, [challenge]);

    // Overall timer
    useEffect(() => {
        if (view === 'active' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [view, timeLeft > 0]);

    // Per-question timer
    useEffect(() => {
        if (view !== 'active') return;

        const questions = challenge?.questions || [];
        const q = questions[currentQ];
        if (!q) return;

        // Set per-question time limit
        const qLimit = QUESTION_TIME_LIMITS[q.questionType] || 90;
        setQuestionTime(qLimit);
        questionStartTimeRef.current = Date.now();

        // Record start time for this question
        if (perQuestionTimingRef.current[currentQ]) {
            perQuestionTimingRef.current[currentQ].startedAt = Date.now();
        }

        qTimerRef.current = setInterval(() => {
            setQuestionTime(prev => {
                if (prev <= 1) {
                    clearInterval(qTimerRef.current);
                    // Auto-advance to next question or submit
                    handleQuestionTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(qTimerRef.current);
    }, [view, currentQ]);

    // Flash warning on tab switches
    useEffect(() => {
        if (view !== 'active') return;
        if (antiCheat.tabSwitches > 0) {
            // Record tab switch for current question
            if (perQuestionTimingRef.current[currentQ]) {
                perQuestionTimingRef.current[currentQ].tabSwitchesDuring++;
            }
            triggerWarning(`⚠️ Tab switch detected! (${antiCheat.tabSwitches} total) — Score penalty: -${antiCheat.tabSwitches * 3}%`);
        }
    }, [antiCheat.tabSwitches]);

    // Flash warning on focus loss
    useEffect(() => {
        if (view !== 'active' || antiCheat.focusLosses === 0) return;
        triggerWarning(`👁️ Window focus lost — This is being recorded`);
    }, [antiCheat.focusLosses]);

    const triggerWarning = (msg) => {
        setWarningMessage(msg);
        setWarningFlash(true);
        setTimeout(() => setWarningFlash(false), 3000);
    };

    const handleQuestionTimeout = () => {
        // Save timing data for current question
        if (perQuestionTimingRef.current[currentQ]) {
            perQuestionTimingRef.current[currentQ].submittedAt = Date.now();
        }

        const questions = challenge?.questions || [];
        if (currentQ < questions.length - 1) {
            setCurrentQ(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startChallenge = async () => {
        if (!userId) {
            alert('User ID not found. Please log in again.');
            return;
        }

        setStarting(true);
        try {
            const res = await api.post(`/challenges/${challenge._id}/start`, { userId });

            // Fix: res is already the response body thanks to api.interceptors.response
            if (res.success) {
                setAttemptId(res.attemptId);
                setTimeLeft((challenge.timeLimit || 30) * 60);
                setCurrentQ(0);
                setView('active');
                antiCheat.reset();
            } else {
                alert(res.error || 'Failed to start challenge');
            }
        } catch (err) {
            console.error('Start Challenge Error Object:', err);
            // If err is a string (from res.send), or has .error or .message
            const msg = (typeof err === 'string' ? err : (err.error || err.message)) || 'Failed to start challenge';
            alert(`Error: ${msg}`);
        } finally {
            setStarting(false);
        }
    };

    const updateAnswer = (value, field = 'answer') => {
        const updated = [...answers];
        updated[currentQ] = { ...updated[currentQ], [field]: value };
        setAnswers(updated);
        antiCheat.checkRapidInjection(value);

        // Track first keystroke for this question
        if (perQuestionTimingRef.current[currentQ] && !perQuestionTimingRef.current[currentQ].firstKeystroke) {
            perQuestionTimingRef.current[currentQ].firstKeystroke = Date.now();
        }
    };

    const goToNextQuestion = () => {
        // Save timing for current question
        if (perQuestionTimingRef.current[currentQ]) {
            perQuestionTimingRef.current[currentQ].submittedAt = Date.now();
        }

        const questions = challenge?.questions || [];
        if (currentQ < questions.length - 1) {
            setCurrentQ(prev => prev + 1);
        }
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        clearInterval(timerRef.current);
        clearInterval(qTimerRef.current);

        // Save timing for last question
        if (perQuestionTimingRef.current[currentQ]) {
            perQuestionTimingRef.current[currentQ].submittedAt = Date.now();
        }

        try {
            const report = antiCheat.getAntiCheatReport();
            // Enhance report with per-question timing data
            report.perQuestionTiming = perQuestionTimingRef.current;

            const res = await api.post(`/challenges/${challenge._id}/submit`, {
                userId,
                attemptId,
                answers,
                antiCheatData: report
            });

            if (res.success) {
                setResults(res);
                setView('results');
            } else {
                alert(res.error || 'Submission failed');
            }
        } catch (err) {
            alert(err.error || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const questions = challenge?.questions || [];
    const currentQuestion = questions[currentQ];
    const qTimeLimit = currentQuestion ? (QUESTION_TIME_LIMITS[currentQuestion.questionType] || 90) : 90;
    const qTimePercent = (questionTime / qTimeLimit) * 100;

    return (
        <motion.div
            className="challenge-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={view !== 'active' ? onClose : undefined}
        >
            <motion.div
                className="challenge-detail-modal"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                {/* ---- Info View ---- */}
                {view === 'info' && (
                    <>
                        <div className="challenge-detail-header">
                            <div>
                                <h2 className="challenge-detail-title">{challenge.title}</h2>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <span className={`difficulty-badge ${challenge.difficulty}`}>{challenge.difficulty}</span>
                                    <span className="domain-badge">{challenge.domain}</span>
                                </div>
                            </div>
                            <button className="challenge-detail-close" onClick={onClose}>✕</button>
                        </div>

                        <div className="challenge-detail-body">
                            <div className="detail-section">
                                <h3>Description</h3>
                                <p className="detail-description">{challenge.description}</p>
                            </div>

                            <div className="detail-section">
                                <h3>Challenge Info</h3>
                                <div className="detail-stats-grid">
                                    <div className="detail-stat">
                                        <div className="detail-stat-value">{challenge.timeLimit || 30}</div>
                                        <div className="detail-stat-label">Minutes</div>
                                    </div>
                                    <div className="detail-stat">
                                        <div className="detail-stat-value">{questions.length}</div>
                                        <div className="detail-stat-label">Questions</div>
                                    </div>
                                    <div className="detail-stat">
                                        <div className="detail-stat-value">{challenge.maxAttempts || 3}</div>
                                        <div className="detail-stat-label">Max Attempts</div>
                                    </div>
                                    <div className="detail-stat">
                                        <div className="detail-stat-value">+{challenge.atpImpact?.maxContribution || 0}</div>
                                        <div className="detail-stat-label">ATP Impact</div>
                                    </div>
                                </div>
                            </div>

                            {/* Anti-cheat notice */}
                            <div className="proctoring-notice">
                                <span className="proctoring-notice-icon">🛡️</span>
                                <div>
                                    <strong>Proctored Challenge</strong>
                                    <p>This challenge monitors tab switches, copy-paste, and timing patterns. Each question has its own time limit and you cannot go back to previous questions.</p>
                                </div>
                            </div>

                            {challenge.skillTags?.length > 0 && (
                                <div className="detail-section">
                                    <h3>Skills Tested</h3>
                                    <div className="challenge-card-skills">
                                        {challenge.skillTags.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
                                    </div>
                                </div>
                            )}

                            <button
                                className="start-challenge-btn"
                                onClick={startChallenge}
                                disabled={starting || (challenge.attemptCount >= (challenge.maxAttempts || 3))}
                            >
                                {starting ? 'Starting...' : challenge.attemptCount >= (challenge.maxAttempts || 3) ? 'Max Attempts Reached' : 'Start Challenge'}
                            </button>
                        </div>
                    </>
                )}

                {/* ---- Active Challenge View ---- */}
                {view === 'active' && currentQuestion && (
                    <div className="active-challenge">
                        {/* Proctoring banner */}
                        <div className="proctoring-banner">
                            <span className="proctoring-shield">🛡️</span>
                            <span>Proctored</span>
                            {antiCheat.tabSwitches > 0 && (
                                <span className="proctoring-violation-count">
                                    ⚠️ {antiCheat.tabSwitches} violation{antiCheat.tabSwitches > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {/* Warning flash overlay */}
                        <AnimatePresence>
                            {warningFlash && (
                                <motion.div
                                    className="anticheat-warning-flash"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    {warningMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Timer bar */}
                        <div className="challenge-timer">
                            <span className="question-progress">
                                Question {currentQ + 1} of {questions.length}
                            </span>
                            <span className={`timer-value ${timeLeft < 60 ? 'critical' : timeLeft < 300 ? 'warning' : ''}`}>
                                ⏱ {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* Per-question timer bar */}
                        <div className="question-timer-bar-container">
                            <div
                                className={`question-timer-bar ${qTimePercent < 25 ? 'critical' : qTimePercent < 50 ? 'warning' : ''}`}
                                style={{ width: `${qTimePercent}%` }}
                            />
                            <span className="question-timer-text">
                                {questionTime}s left for this question
                            </span>
                        </div>

                        <div className="question-container">
                            <p className="question-text">{currentQuestion.questionText}</p>

                            {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
                                <div className="mcq-options">
                                    {currentQuestion.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            className={`mcq-option ${answers[currentQ]?.answer === opt ? 'selected' : ''}`}
                                            onClick={() => updateAnswer(opt)}
                                        >
                                            {String.fromCharCode(65 + i)}. {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {(currentQuestion.questionType === 'short-answer' || currentQuestion.questionType === 'essay' || currentQuestion.questionType === 'simulation') && (
                                <textarea
                                    className="text-answer-input"
                                    placeholder="Type your answer..."
                                    value={answers[currentQ]?.answer || ''}
                                    onChange={e => updateAnswer(e.target.value)}
                                    onPaste={e => {
                                        e.preventDefault();
                                        triggerWarning('🚫 Paste is disabled during proctored challenges');
                                    }}
                                />
                            )}

                            {currentQuestion.questionType === 'code' && (
                                <textarea
                                    className="code-editor-input"
                                    placeholder={`// Write your ${currentQuestion.codeLanguage || 'code'} solution here...`}
                                    value={answers[currentQ]?.codeSubmission || ''}
                                    onChange={e => updateAnswer(e.target.value, 'codeSubmission')}
                                    onPaste={e => {
                                        e.preventDefault();
                                        triggerWarning('🚫 Paste is disabled during proctored challenges');
                                    }}
                                    spellCheck="false"
                                />
                            )}
                        </div>

                        {/* Sequential navigation — NO going back */}
                        <div className="question-nav-btns">
                            <div className="question-dots">
                                {questions.map((_, i) => (
                                    <span
                                        key={i}
                                        className={`q-dot ${i === currentQ ? 'current' : i < currentQ ? 'done' : 'upcoming'}`}
                                    />
                                ))}
                            </div>
                            {currentQ < questions.length - 1 ? (
                                <button
                                    className="nav-btn next"
                                    onClick={goToNextQuestion}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    className="nav-btn submit"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Challenge'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ---- Results View ---- */}
                {view === 'results' && results && (
                    <div className="challenge-results">
                        <button className="challenge-detail-close" onClick={() => { onComplete && onComplete(); }} style={{ position: 'absolute', top: 20, right: 20 }}>✕</button>

                        <div className="results-score-circle">
                            <svg viewBox="0 0 120 120" width="120" height="120">
                                <circle className="score-circle-bg" cx="60" cy="60" r="50" />
                                <circle
                                    className="score-circle-fill"
                                    cx="60" cy="60" r="50"
                                    stroke={results.score >= 70 ? '#10b981' : results.score >= 40 ? '#f59e0b' : '#ef4444'}
                                    strokeDasharray={`${(results.score / 100) * 314} 314`}
                                    transform="rotate(-90 60 60)"
                                />
                            </svg>
                            <div className="score-circle-text">
                                <span className="score-value">{results.score}%</span>
                                <span className="score-label">SCORE</span>
                            </div>
                        </div>

                        {/* Show penalty breakdown if any */}
                        {(results.tabSwitchPenalty > 0 || results.heldForReview) && (
                            <div className="penalty-breakdown">
                                {results.tabSwitchPenalty > 0 && (
                                    <div className="penalty-item">
                                        <span>⚠️ Tab switch penalty</span>
                                        <span className="penalty-value">-{results.tabSwitchPenalty}%</span>
                                    </div>
                                )}
                                {results.rawScore && results.rawScore !== results.score && (
                                    <div className="penalty-item">
                                        <span>Raw score before penalties</span>
                                        <span>{results.rawScore}%</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="results-details">
                            <div className="result-item">
                                <span className="result-item-label">Total Points</span>
                                <span className="result-item-value">{results.totalScore}/{results.maxPossible}</span>
                            </div>
                            <div className="result-item">
                                <span className="result-item-label">ATP Impact</span>
                                <span className="result-item-value" style={{ color: results.atpApplied ? '#10b981' : '#f59e0b' }}>
                                    {results.atpApplied ? `+${results.atpImpactScore}` : 'Under Review'}
                                </span>
                            </div>
                            <div className="result-item">
                                <span className="result-item-label">Risk Level</span>
                                <span className={`risk-indicator ${results.riskLevel}`}>{results.riskLevel}</span>
                            </div>
                            {results.heldForReview && (
                                <div className="result-item" style={{ color: '#fbbf24', fontSize: '0.82rem' }}>
                                    ⚠️ Your submission is being reviewed due to suspicious activity. ATP will be applied after admin approval.
                                </div>
                            )}
                        </div>

                        <button
                            className="start-challenge-btn"
                            onClick={() => { onComplete && onComplete(); }}
                            style={{ marginTop: 24 }}
                        >
                            Done
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default ChallengeDetail;
