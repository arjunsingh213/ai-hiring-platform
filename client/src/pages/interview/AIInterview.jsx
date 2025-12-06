import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './AIInterview.css';

const AIInterview = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);

    const [interview, setInterview] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [timeSpent, setTimeSpent] = useState(0);
    const [proctoringWarnings, setProctoringWarnings] = useState([]);

    useEffect(() => {
        fetchInterview();
        startCamera();

        const timer = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(timer);
            stopCamera();
        };
    }, []);

    const fetchInterview = async () => {
        try {
            const response = await api.get(`/interviews/${interviewId}`);
            setInterview(response.data);
        } catch (error) {
            console.error('Error fetching interview:', error);
            alert('Interview not found');
            navigate('/jobseeker/interviews');
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Please allow camera and microphone access for the interview');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim()) {
            alert('Please provide an answer');
            return;
        }

        try {
            const response = await api.post(`/interviews/${interviewId}/response`, {
                questionIndex: currentQuestionIndex,
                answer,
                timeSpent
            });

            setAnswer('');
            setTimeSpent(0);

            if (response.data.nextQuestion) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
            } else {
                // Interview complete
                completeInterview();
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            alert('Failed to submit answer');
        }
    };

    const completeInterview = async () => {
        try {
            await api.post(`/interviews/${interviewId}/complete`);
            alert('Interview completed successfully!');
            navigate('/jobseeker/interviews');
        } catch (error) {
            console.error('Error completing interview:', error);
        }
    };

    const reportProctoringFlag = async (type) => {
        try {
            await api.post(`/interviews/${interviewId}/proctoring-flag`, {
                type,
                severity: 'medium',
                description: `${type} detected during interview`
            });
            setProctoringWarnings(prev => [...prev, type]);
        } catch (error) {
            console.error('Error reporting proctoring flag:', error);
        }
    };

    if (!interview) {
        return <div className="loading-state">Loading interview...</div>;
    }

    const currentQuestion = interview.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / interview.questions.length) * 100;

    return (
        <div className="ai-interview">
            {/* Header */}
            <div className="interview-header">
                <div className="header-left">
                    <h2>AI Interview - {interview.interviewType}</h2>
                    <p>Question {currentQuestionIndex + 1} of {interview.questions.length}</p>
                </div>
                <div className="header-right">
                    <div className="timer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobseeker/interviews')}>
                        Exit Interview
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Main Content */}
            <div className="interview-content">
                {/* Video Section */}
                <div className="video-section">
                    <div className="video-container">
                        <video ref={videoRef} autoPlay muted className="video-feed"></video>
                        {isRecording && (
                            <div className="recording-indicator">
                                <span className="recording-dot"></span>
                                Recording
                            </div>
                        )}
                    </div>

                    {/* Proctoring Warnings */}
                    {proctoringWarnings.length > 0 && (
                        <div className="proctoring-warnings">
                            <h4>⚠️ Proctoring Alerts</h4>
                            <ul>
                                {proctoringWarnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Camera Controls */}
                    <div className="camera-info">
                        <p className="text-muted">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Your camera is being monitored for proctoring
                        </p>
                    </div>
                </div>

                {/* Question & Answer Section */}
                <div className="question-section">
                    <div className="question-card card">
                        <div className="question-header">
                            <span className="question-badge">Question {currentQuestionIndex + 1}</span>
                            <span className="difficulty-badge">{currentQuestion?.difficulty || 'Medium'}</span>
                        </div>
                        <h3 className="question-text">{currentQuestion?.question}</h3>
                        {currentQuestion?.category && (
                            <p className="question-category">Category: {currentQuestion.category}</p>
                        )}
                    </div>

                    <div className="answer-section">
                        <label className="form-label">Your Answer</label>
                        <textarea
                            className="answer-input input"
                            placeholder="Type your answer here..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            rows="10"
                        />

                        <div className="answer-actions">
                            <button className="btn btn-secondary" onClick={() => setAnswer('')}>
                                Clear
                            </button>
                            <button className="btn btn-primary" onClick={submitAnswer}>
                                {currentQuestionIndex < interview.questions.length - 1 ? 'Next Question' : 'Complete Interview'}
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="interview-tips card-glass">
                        <h4>💡 Interview Tips</h4>
                        <ul>
                            <li>Speak clearly and maintain eye contact with the camera</li>
                            <li>Take your time to think before answering</li>
                            <li>Provide specific examples when possible</li>
                            <li>Stay focused - tab switching is monitored</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIInterview;
