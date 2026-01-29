/**
 * useFaceDetection Hook
 * Uses face-api.js to detect face presence, count, and eye/head direction
 * Triggers warnings when face is missing, multiple faces detected, or looking away
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Detection thresholds
const THRESHOLDS = {
    NO_FACE_WARNING_DELAY: 3000,    // 3 seconds before warning
    NO_FACE_DISMISS_DELAY: 10000,   // 10 seconds to auto-fail
    LOOK_AWAY_WARNING_DELAY: 3000,  // 3 seconds before lookaway warning
    DETECTION_INTERVAL: 500,        // Check every 500ms
    FACE_DETECTION_SCORE: 0.2,      // RELAXED: Minimum confidence for face detection (from 0.4)
};

const useFaceDetection = (videoRef, enabled = true) => {
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceCount, setFaceCount] = useState(0);
    const [isLookingAway, setIsLookingAway] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Warning tracking
    const [noFaceTime, setNoFaceTime] = useState(0);
    const [lookAwayTime, setLookAwayTime] = useState(0);

    const faceApiRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const noFaceTimerRef = useRef(null);
    const lookAwayTimerRef = useRef(null);

    // Load face-api.js models
    const loadModels = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Dynamic import face-api.js
            const faceapi = await import('face-api.js');
            faceApiRef.current = faceapi;

            // Models are served from public/models folder
            // Models are served from public/models folder - handle base URL correctly
            const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
            const MODEL_URL = `${baseUrl}models`;

            console.log(`🔄 Loading face detection models from: ${MODEL_URL}`);

            // Verify models exist before loading
            const manifestResponse = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
            if (!manifestResponse.ok) {
                throw new Error(`Model manifest not found at ${MODEL_URL} (Status: ${manifestResponse.status})`);
            }

            // Load the face detection models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
            ]);

            setModelsLoaded(true);
            setLoading(false);
            console.log('✅ Face detection models loaded successfully');
        } catch (err) {
            console.error('❌ Failed to load face detection models:', err);
            setError('Face detection models failed to load: ' + err.message);
            setLoading(false);
            // Don't set faceDetected to true on error - let the proctoring component handle this
        }
    }, []);

    // Perform face detection
    const detectFace = useCallback(async () => {
        if (!faceApiRef.current || !videoRef?.current || !modelsLoaded) return;

        const faceapi = faceApiRef.current;
        const video = videoRef.current;

        if (video.paused || video.ended || !video.videoWidth) return;

        try {
            // Detect all faces with landmarks - RELAXED threshold for better reliability
            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 224,
                    scoreThreshold: THRESHOLDS.FACE_DETECTION_SCORE // Relaxed from 0.7
                }))
                .withFaceLandmarks(true);

            const faces = detections.length;
            setFaceCount(faces);

            // Enhanced validation: Check if face is PROPERLY visible (not covered/obscured)
            let faceValid = false;
            if (faces === 1) {
                const detection = detections[0];
                const landmarks = detection.landmarks;

                // Landmarks check - if faceapi detected it and we have basic landmarks, it's a face
                const hasNose = landmarks.getNose()?.length > 0;
                const hasLeftEye = landmarks.getLeftEye()?.length > 0;
                const hasRightEye = landmarks.getRightEye()?.length > 0;

                // Face is valid if basic features exist and score is decent
                faceValid = !!(hasNose && hasLeftEye && hasRightEye && detection.detection.score >= THRESHOLDS.FACE_DETECTION_SCORE);

                if (faceValid) {
                    try {
                        // Calculate face orientation for "looking away" detection
                        const nose = landmarks.getNose();
                        const leftEye = landmarks.getLeftEye();
                        const rightEye = landmarks.getRightEye();

                        const eyeWidth = Math.abs(rightEye[3].x - leftEye[0].x);
                        const nosePos = nose[3].x;
                        const eyeCenter = (rightEye[3].x + leftEye[0].x) / 2;
                        const deviation = Math.abs(nosePos - eyeCenter) / eyeWidth;

                        // If nose is too far from eye center = looking away
                        setIsLookingAway(deviation > 0.35); // RELAXED: from 0.25 to 0.35
                    } catch (err) {
                        setIsLookingAway(false);
                    }
                } else {
                    setIsLookingAway(false);
                }
            } else {
                setIsLookingAway(false);
            }

            setFaceDetected(faceValid);

        } catch (err) {
            console.error('Face detection error:', err);
        }
    }, [videoRef, modelsLoaded]);

    // Track no-face duration
    useEffect(() => {
        if (!enabled || !modelsLoaded) return;

        if (!faceDetected) {
            // Start counting no-face time
            if (!noFaceTimerRef.current) {
                noFaceTimerRef.current = setInterval(() => {
                    setNoFaceTime(prev => prev + 1000);
                }, 1000);
            }
        } else {
            // Reset timer when face is detected
            if (noFaceTimerRef.current) {
                clearInterval(noFaceTimerRef.current);
                noFaceTimerRef.current = null;
            }
            setNoFaceTime(0);
        }

        return () => {
            if (noFaceTimerRef.current) {
                clearInterval(noFaceTimerRef.current);
                noFaceTimerRef.current = null;
            }
        };
    }, [faceDetected, enabled, modelsLoaded]);

    // Track look-away duration
    useEffect(() => {
        if (!enabled || !modelsLoaded) return;

        if (isLookingAway) {
            if (!lookAwayTimerRef.current) {
                lookAwayTimerRef.current = setInterval(() => {
                    setLookAwayTime(prev => prev + 1000);
                }, 1000);
            }
        } else {
            if (lookAwayTimerRef.current) {
                clearInterval(lookAwayTimerRef.current);
                lookAwayTimerRef.current = null;
            }
            setLookAwayTime(0);
        }

        return () => {
            if (lookAwayTimerRef.current) {
                clearInterval(lookAwayTimerRef.current);
                lookAwayTimerRef.current = null;
            }
        };
    }, [isLookingAway, enabled, modelsLoaded]);

    // Start detection loop
    useEffect(() => {
        if (!enabled || !modelsLoaded) return;

        detectionIntervalRef.current = setInterval(detectFace, THRESHOLDS.DETECTION_INTERVAL);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [detectFace, enabled, modelsLoaded]);

    // Load models on mount
    useEffect(() => {
        if (enabled) {
            loadModels();
        }
    }, [enabled, loadModels]);

    // Compute violation states
    const shouldWarnNoFace = noFaceTime >= THRESHOLDS.NO_FACE_WARNING_DELAY;
    const shouldDismissNoFace = noFaceTime >= THRESHOLDS.NO_FACE_DISMISS_DELAY;
    const shouldWarnLookAway = lookAwayTime >= THRESHOLDS.LOOK_AWAY_WARNING_DELAY;
    const hasMultipleFaces = faceCount > 1;

    return {
        // Detection state
        faceDetected,
        faceCount,
        isLookingAway,
        modelsLoaded,
        loading,
        error,

        // Duration tracking
        noFaceTime,
        lookAwayTime,

        // Warning triggers
        shouldWarnNoFace,
        shouldDismissNoFace,
        shouldWarnLookAway,
        hasMultipleFaces,

        // Any violation
        hasViolation: shouldWarnNoFace || shouldWarnLookAway || hasMultipleFaces
    };
};

export default useFaceDetection;
