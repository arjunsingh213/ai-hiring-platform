// Live Camera Face Verification Component
// Captures live video, performs liveness detection (blink/smile), and matches with uploaded photo

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    loadModels,
    detectFace,
    compareFaces,
    LivenessDetector,
    validateFaceQuality
} from '../services/faceValidationService';
import './LiveCameraVerification.css';

const LiveCameraVerification = ({
    referenceDescriptor, // Face descriptor from uploaded photo
    onVerificationComplete, // Callback with result
    onCancel
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const livenessDetectorRef = useRef(new LivenessDetector());
    const animationRef = useRef(null);

    const [status, setStatus] = useState('loading'); // loading, ready, verifying, success, failed
    const [message, setMessage] = useState('Initializing camera...');
    const [currentChallenge, setCurrentChallenge] = useState(null);
    const [progress, setProgress] = useState({ completed: [false, false], blinkCount: 0 });
    const [faceMatch, setFaceMatch] = useState(null);
    const [detectionBox, setDetectionBox] = useState(null);
    const [qualityMetrics, setQualityMetrics] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [capturedFrame, setCapturedFrame] = useState(null);

    // Initialize camera and models
    useEffect(() => {
        const initialize = async () => {
            try {
                setMessage('Loading face detection models...');
                await loadModels();

                setMessage('Accessing camera...');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                setStatus('ready');
                setMessage('Position your face in the frame');
                setCurrentChallenge(livenessDetectorRef.current.getCurrentChallenge());
            } catch (error) {
                console.error('Initialization error:', error);
                setStatus('failed');
                setMessage('Failed to access camera. Please allow camera permission and try again.');
            }
        };

        initialize();

        return () => {
            // Cleanup
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Main detection loop
    const runDetection = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || status === 'success' || status === 'failed') {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        try {
            const detections = await detectFace(video);

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detections.length === 0) {
                setMessage('No face detected. Please look at the camera.');
                setDetectionBox(null);
                animationRef.current = requestAnimationFrame(runDetection);
                return;
            }

            if (detections.length > 1) {
                setMessage('Multiple faces detected. Please ensure only you are in the frame.');
                animationRef.current = requestAnimationFrame(runDetection);
                return;
            }

            const detection = detections[0];
            const box = detection.detection.box;

            // Draw detection box
            const boxColor = status === 'verifying' ? '#4CAF50' : '#2196F3';
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw face landmarks
            const landmarks = detection.landmarks;
            ctx.fillStyle = '#00FF00';
            landmarks.positions.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            });

            setDetectionBox(box);

            // Validate face quality
            const quality = validateFaceQuality(detection, {
                width: canvas.width,
                height: canvas.height
            });
            setQualityMetrics(quality);

            if (!quality.valid && status !== 'verifying') {
                setMessage(quality.issues[0] || 'Adjust your position');
                animationRef.current = requestAnimationFrame(runDetection);
                return;
            }

            // If ready and quality is good, start verification
            if (status === 'ready' && quality.valid) {
                setStatus('verifying');
                setMessage('Starting verification...');
            }

            // Process liveness challenges
            if (status === 'verifying') {
                const livenessResult = livenessDetectorRef.current.processFrame(detection);
                setProgress(livenessDetectorRef.current.getProgress());
                setCurrentChallenge(livenessDetectorRef.current.getCurrentChallenge());
                setMessage(livenessResult.message);

                // Check if all challenges completed
                if (livenessDetectorRef.current.allChallengesCompleted()) {
                    // Now compare with reference face
                    if (referenceDescriptor) {
                        const matchResult = compareFaces(
                            new Float32Array(referenceDescriptor),
                            detection.descriptor
                        );
                        setFaceMatch(matchResult);

                        // Capture final frame
                        const captureCanvas = document.createElement('canvas');
                        captureCanvas.width = video.videoWidth;
                        captureCanvas.height = video.videoHeight;
                        captureCanvas.getContext('2d').drawImage(video, 0, 0);
                        setCapturedFrame(captureCanvas.toDataURL('image/jpeg', 0.8));

                        if (matchResult.match) {
                            setStatus('success');
                            setMessage('Verification successful! Face matched.');

                            // Delay before callback
                            setTimeout(() => {
                                onVerificationComplete({
                                    success: true,
                                    faceMatch: matchResult,
                                    livenessCompleted: true,
                                    capturedImage: captureCanvas.toDataURL('image/jpeg', 0.8),
                                    descriptor: Array.from(detection.descriptor)
                                });
                            }, 2000);
                        } else {
                            setStatus('failed');
                            setMessage('Face does not match the uploaded photo. Please try again.');
                        }
                    } else {
                        // No reference - just liveness verification
                        setStatus('success');
                        setMessage('Liveness verification successful!');

                        const captureCanvas = document.createElement('canvas');
                        captureCanvas.width = video.videoWidth;
                        captureCanvas.height = video.videoHeight;
                        captureCanvas.getContext('2d').drawImage(video, 0, 0);

                        setTimeout(() => {
                            onVerificationComplete({
                                success: true,
                                livenessCompleted: true,
                                capturedImage: captureCanvas.toDataURL('image/jpeg', 0.8),
                                descriptor: Array.from(detection.descriptor)
                            });
                        }, 2000);
                    }
                    return;
                }
            }

        } catch (error) {
            console.error('Detection error:', error);
        }

        animationRef.current = requestAnimationFrame(runDetection);
    }, [status, referenceDescriptor, onVerificationComplete]);

    // Start detection when ready
    useEffect(() => {
        if (status === 'ready' || status === 'verifying') {
            animationRef.current = requestAnimationFrame(runDetection);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [status, runDetection]);

    const handleRetry = () => {
        livenessDetectorRef.current.reset();
        setStatus('ready');
        setMessage('Position your face in the frame');
        setFaceMatch(null);
        setProgress({ completed: [false, false], blinkCount: 0 });
        setCurrentChallenge(livenessDetectorRef.current.getCurrentChallenge());
    };

    return (
        <div className="live-camera-verification">
            <div className="verification-header">
                <h2>🔐 Face Verification</h2>
                <p>Complete the liveness check to verify your identity</p>
            </div>

            <div className="camera-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                />
                <canvas ref={canvasRef} className="detection-overlay" />

                {/* Status overlay */}
                <div className={`status-overlay ${status}`}>
                    <div className="status-icon">
                        {status === 'loading' && <div className="spinner"></div>}
                        {status === 'success' && <span>✅</span>}
                        {status === 'failed' && <span>❌</span>}
                    </div>
                </div>

                {/* Face guide oval */}
                {(status === 'ready' || status === 'verifying') && (
                    <div className="face-guide">
                        <div className={`guide-oval ${detectionBox ? 'detected' : ''}`}></div>
                    </div>
                )}
            </div>

            {/* Challenge progress */}
            <div className="challenge-section">
                <div className="challenge-progress">
                    <div className={`challenge-step ${progress.completed[0] ? 'completed' : currentChallenge === 'BLINK' ? 'active' : ''}`}>
                        <span className="step-icon">{progress.completed[0] ? '✓' : '👁️'}</span>
                        <span className="step-label">Blink</span>
                    </div>
                    <div className="challenge-connector"></div>
                    <div className={`challenge-step ${progress.completed[1] ? 'completed' : currentChallenge === 'SMILE' ? 'active' : ''}`}>
                        <span className="step-icon">{progress.completed[1] ? '✓' : '😊'}</span>
                        <span className="step-label">Smile</span>
                    </div>
                </div>

                <div className={`message-box ${status}`}>
                    <p>{message}</p>
                </div>

                {currentChallenge === 'BLINK' && (
                    <div className="blink-counter">
                        Blinks: {progress.blinkCount} / {progress.requiredBlinks || 2}
                    </div>
                )}
            </div>

            {/* Face match result */}
            {faceMatch && (
                <div className={`match-result ${faceMatch.match ? 'success' : 'failed'}`}>
                    <h4>Face Match Result</h4>
                    <p>Confidence: {faceMatch.confidence}%</p>
                    <p>Verdict: {faceMatch.verdict}</p>
                </div>
            )}

            {/* Quality metrics */}
            {qualityMetrics && status === 'verifying' && (
                <div className="quality-metrics">
                    <div className="metric">
                        <span>Face Size:</span>
                        <span>{qualityMetrics.metrics?.facePercentage}%</span>
                    </div>
                    <div className="metric">
                        <span>Head Tilt:</span>
                        <span>{qualityMetrics.metrics?.headTilt}°</span>
                    </div>
                    <div className="metric">
                        <span>Quality Score:</span>
                        <span>{qualityMetrics.score}/100</span>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="verification-actions">
                {status === 'failed' && (
                    <button className="btn btn-primary" onClick={handleRetry}>
                        Try Again
                    </button>
                )}
                <button className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default LiveCameraVerification;
