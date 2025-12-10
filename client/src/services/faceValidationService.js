// Face Validation Service - Using face-api.js
// Provides face detection, quality validation, liveness detection, and face matching

import * as faceapi from 'face-api.js';

// Model loading state
let modelsLoaded = false;
let loadingPromise = null;

// CDN URLs for face-api.js models (jsDelivr)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

/**
 * Load face-api.js models from CDN
 */
export const loadModels = async () => {
    if (modelsLoaded) return true;

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            console.log('Loading face detection models...');

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);

            modelsLoaded = true;
            console.log('Face detection models loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading face detection models:', error);
            loadingPromise = null;
            throw new Error('Failed to load face detection models');
        }
    })();

    return loadingPromise;
};

/**
 * Detect faces in an image
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input - Image/video element
 * @returns {Promise<Object>} Detection results
 */
export const detectFace = async (input) => {
    await loadModels();

    const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5
    });

    const detections = await faceapi
        .detectAllFaces(input, options)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

    return detections;
};

/**
 * Validate face quality metrics
 * @param {Object} detection - Face detection result
 * @param {Object} imageSize - {width, height} of the image
 * @returns {Object} Validation results
 */
export const validateFaceQuality = (detection, imageSize) => {
    const issues = [];
    const warnings = [];
    let score = 100;

    if (!detection) {
        return {
            valid: false,
            score: 0,
            issues: ['No face detected in the image'],
            warnings: []
        };
    }

    const box = detection.detection.box;
    const landmarks = detection.landmarks;

    // 1. Face Size Check (minimum 100x100 pixels, at least 10% of image)
    const faceWidth = box.width;
    const faceHeight = box.height;
    const faceArea = faceWidth * faceHeight;
    const imageArea = imageSize.width * imageSize.height;
    const facePercentage = (faceArea / imageArea) * 100;

    if (faceWidth < 100 || faceHeight < 100) {
        issues.push('Face is too small. Please move closer to the camera.');
        score -= 30;
    } else if (facePercentage < 10) {
        warnings.push('Face could be larger in the frame.');
        score -= 10;
    }

    // 2. Face Position Check (should be centered)
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const imageCenterX = imageSize.width / 2;
    const imageCenterY = imageSize.height / 2;

    const offsetX = Math.abs(faceCenterX - imageCenterX) / imageSize.width;
    const offsetY = Math.abs(faceCenterY - imageCenterY) / imageSize.height;

    if (offsetX > 0.3 || offsetY > 0.3) {
        issues.push('Face is not centered. Please center your face in the frame.');
        score -= 20;
    } else if (offsetX > 0.2 || offsetY > 0.2) {
        warnings.push('Face could be more centered.');
        score -= 5;
    }

    // 3. Face Angle Check (using eye positions)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const eyeCenterLeft = {
        x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
        y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length
    };
    const eyeCenterRight = {
        x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
        y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length
    };

    const eyeAngle = Math.abs(Math.atan2(
        eyeCenterRight.y - eyeCenterLeft.y,
        eyeCenterRight.x - eyeCenterLeft.x
    ) * (180 / Math.PI));

    if (eyeAngle > 15) {
        issues.push('Please keep your head straight (not tilted).');
        score -= 25;
    } else if (eyeAngle > 10) {
        warnings.push('Slight head tilt detected.');
        score -= 10;
    }

    // 4. Check if face is partially cropped
    const margin = 20;
    if (box.x < margin || box.y < margin ||
        box.x + box.width > imageSize.width - margin ||
        box.y + box.height > imageSize.height - margin) {
        issues.push('Face is partially outside the frame.');
        score -= 20;
    }

    return {
        valid: issues.length === 0,
        score: Math.max(0, score),
        issues,
        warnings,
        metrics: {
            faceSize: { width: faceWidth, height: faceHeight },
            facePercentage: facePercentage.toFixed(1),
            centerOffset: { x: offsetX.toFixed(2), y: offsetY.toFixed(2) },
            headTilt: eyeAngle.toFixed(1)
        }
    };
};

/**
 * Extract 128-dimension face descriptor for comparison
 * @param {Object} detection - Face detection with descriptor
 * @returns {Float32Array|null} Face descriptor
 */
export const extractFaceDescriptor = (detection) => {
    if (!detection || !detection.descriptor) {
        return null;
    }
    return detection.descriptor;
};

/**
 * Compare two face descriptors
 * @param {Float32Array} descriptor1 - First face descriptor
 * @param {Float32Array} descriptor2 - Second face descriptor
 * @returns {Object} Match result with confidence
 */
export const compareFaces = (descriptor1, descriptor2) => {
    if (!descriptor1 || !descriptor2) {
        return { match: false, distance: Infinity, confidence: 0 };
    }

    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);

    // Distance thresholds:
    // < 0.4: Very confident match
    // 0.4 - 0.5: Likely match
    // 0.5 - 0.6: Uncertain
    // > 0.6: No match

    const match = distance < 0.5;
    const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));

    return {
        match,
        distance: distance.toFixed(3),
        confidence: confidence.toFixed(1),
        verdict: distance < 0.4 ? 'HIGH_MATCH' :
            distance < 0.5 ? 'MATCH' :
                distance < 0.6 ? 'UNCERTAIN' : 'NO_MATCH'
    };
};

/**
 * Detect liveness indicators from expressions
 * @param {Object} detection - Face detection with expressions
 * @returns {Object} Expression analysis
 */
export const analyzeExpressions = (detection) => {
    if (!detection || !detection.expressions) {
        return null;
    }

    const expressions = detection.expressions;
    const dominantExpression = Object.entries(expressions)
        .sort((a, b) => b[1] - a[1])[0];

    return {
        dominant: dominantExpression[0],
        confidence: (dominantExpression[1] * 100).toFixed(1),
        all: {
            neutral: (expressions.neutral * 100).toFixed(1),
            happy: (expressions.happy * 100).toFixed(1),
            surprised: (expressions.surprised * 100).toFixed(1),
            angry: (expressions.angry * 100).toFixed(1),
            sad: (expressions.sad * 100).toFixed(1)
        }
    };
};

/**
 * Liveness Detection State Machine
 * Tracks blink detection only (smile removed per user request)
 */
export class LivenessDetector {
    constructor() {
        this.challenges = ['BLINK']; // Only blink challenge
        this.currentChallenge = 0;
        this.challengeCompleted = [false];
        this.eyeOpenHistory = [];
        this.earHistory = [];
        this.lastBlinkTime = 0;
        this.blinkCount = 0;
        this.requiredBlinks = 2;
        this.blinkInProgress = false;
        this.consecutiveClosedFrames = 0;
        this.consecutiveOpenFrames = 0;
    }

    reset() {
        this.currentChallenge = 0;
        this.challengeCompleted = [false];
        this.eyeOpenHistory = [];
        this.earHistory = [];
        this.lastBlinkTime = 0;
        this.blinkCount = 0;
        this.blinkInProgress = false;
        this.consecutiveClosedFrames = 0;
        this.consecutiveOpenFrames = 0;
    }

    getCurrentChallenge() {
        if (this.allChallengesCompleted()) return null;
        return this.challenges[this.currentChallenge];
    }

    allChallengesCompleted() {
        return this.challengeCompleted.every(c => c);
    }

    processFrame(detection) {
        if (!detection) return { status: 'NO_FACE', message: 'No face detected' };

        const landmarks = detection.landmarks;

        // Only blink challenge now
        const challenge = this.getCurrentChallenge();

        if (challenge === 'BLINK') {
            return this.checkBlink(landmarks);
        }

        return { status: 'COMPLETE', message: 'Verification complete!' };
    }

    checkBlink(landmarks) {
        // Calculate Eye Aspect Ratio (EAR)
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        const leftEAR = this.calculateEAR(leftEye);
        const rightEAR = this.calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // Store EAR history for adaptive threshold
        this.earHistory.push(avgEAR);
        if (this.earHistory.length > 30) {
            this.earHistory.shift();
        }

        // Calculate adaptive threshold based on user's eye size
        // Use 75% of average EAR as closed threshold
        const avgOpenEAR = this.earHistory.length > 5
            ? this.earHistory.slice(0, 5).reduce((a, b) => a + b, 0) / 5
            : 0.25;
        const closedThreshold = Math.min(0.22, avgOpenEAR * 0.65);

        // Detect eye state with more lenient threshold
        const isEyeClosed = avgEAR < closedThreshold;

        // Track consecutive frames for more reliable detection
        if (isEyeClosed) {
            this.consecutiveClosedFrames++;
            this.consecutiveOpenFrames = 0;
        } else {
            this.consecutiveOpenFrames++;
            this.consecutiveClosedFrames = 0;
        }

        // Detect blink: eyes were open, then closed for 1+ frames, then open again
        if (!this.blinkInProgress && this.consecutiveClosedFrames >= 1) {
            this.blinkInProgress = true;
        }

        if (this.blinkInProgress && this.consecutiveOpenFrames >= 2) {
            // Blink completed!
            const now = Date.now();
            if (now - this.lastBlinkTime > 300) { // 300ms debounce
                this.blinkCount++;
                this.lastBlinkTime = now;
                this.blinkInProgress = false;

                console.log(`Blink detected! Count: ${this.blinkCount}`);

                if (this.blinkCount >= this.requiredBlinks) {
                    this.challengeCompleted[0] = true;
                    return { status: 'CHALLENGE_COMPLETE', message: 'Blinks verified! Verification complete!' };
                }
                return {
                    status: 'PROGRESS',
                    message: `Blink ${this.blinkCount}/${this.requiredBlinks} detected! Keep blinking!`
                };
            }
        }

        return {
            status: 'WAITING',
            message: `Please blink naturally (${this.blinkCount}/${this.requiredBlinks})`,
            earValue: avgEAR.toFixed(3),
            threshold: closedThreshold.toFixed(3)
        };
    }

    calculateEAR(eye) {
        // Eye Aspect Ratio calculation using 6 landmarks
        // Points: 0=outer corner, 1=upper outer, 2=upper inner, 3=inner corner, 4=lower inner, 5=lower outer
        const v1 = this.distance(eye[1], eye[5]); // Upper outer to lower outer
        const v2 = this.distance(eye[2], eye[4]); // Upper inner to lower inner
        const h = this.distance(eye[0], eye[3]);  // Outer corner to inner corner

        return (v1 + v2) / (2 * h);
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    getProgress() {
        return {
            challenges: this.challenges,
            completed: this.challengeCompleted,
            current: this.currentChallenge,
            blinkCount: this.blinkCount,
            requiredBlinks: this.requiredBlinks
        };
    }
}

/**
 * Validate a profile photo completely
 * @param {HTMLImageElement} image - The image to validate
 * @returns {Promise<Object>} Complete validation result
 */
export const validateProfilePhoto = async (image) => {
    try {
        await loadModels();

        const detections = await detectFace(image);

        // Check for no face
        if (detections.length === 0) {
            return {
                valid: false,
                error: 'NO_FACE',
                message: 'No face detected in the image. Please upload a clear photo of your face.',
                descriptor: null
            };
        }

        // Check for multiple faces
        if (detections.length > 1) {
            return {
                valid: false,
                error: 'MULTIPLE_FACES',
                message: 'Multiple faces detected. Please upload a photo with only your face.',
                descriptor: null
            };
        }

        const detection = detections[0];
        const imageSize = { width: image.width, height: image.height };

        // Validate quality
        const qualityResult = validateFaceQuality(detection, imageSize);

        // Extract descriptor for future matching
        const descriptor = extractFaceDescriptor(detection);

        // Analyze expressions
        const expressions = analyzeExpressions(detection);

        return {
            valid: qualityResult.valid,
            score: qualityResult.score,
            issues: qualityResult.issues,
            warnings: qualityResult.warnings,
            metrics: qualityResult.metrics,
            expressions,
            descriptor: descriptor ? Array.from(descriptor) : null,
            message: qualityResult.valid
                ? 'Face validation successful!'
                : 'Please address the issues and try again.'
        };
    } catch (error) {
        console.error('Face validation error:', error);
        return {
            valid: false,
            error: 'VALIDATION_ERROR',
            message: 'An error occurred during face validation. Please try again.',
            descriptor: null
        };
    }
};

export default {
    loadModels,
    detectFace,
    validateFaceQuality,
    extractFaceDescriptor,
    compareFaces,
    analyzeExpressions,
    validateProfilePhoto,
    LivenessDetector
};
