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
        scoreThreshold: 0.2 // RELAXED: from 0.4 (original 0.5)
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

    if (offsetX > 0.4 || offsetY > 0.4) { // RELAXED: from 0.3
        issues.push('Face is not centered. Please center your face in the frame.');
        score -= 20;
    } else if (offsetX > 0.3 || offsetY > 0.3) { // RELAXED: from 0.2
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

    if (eyeAngle > 25) { // RELAXED: from 15
        issues.push('Please keep your head straight (not tilted).');
        score -= 25;
    } else if (eyeAngle > 15) { // RELAXED: from 10
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
 * Tracks head turn detection (left then right) for liveness verification
 */
export class LivenessDetector {
    constructor() {
        this.challenges = ['TURN_LEFT', 'TURN_RIGHT'];
        this.currentChallenge = 0;
        this.challengeCompleted = [false, false];
        this.yawHistory = [];
        this.baselineYaw = null;
        this.leftTurnDetected = false;
        this.rightTurnDetected = false;
        this.turnThreshold = 20; // Degrees to turn
        this.neutralThreshold = 10; // Degrees considered neutral/center
    }

    reset() {
        this.currentChallenge = 0;
        this.challengeCompleted = [false, false];
        this.yawHistory = [];
        this.baselineYaw = null;
        this.leftTurnDetected = false;
        this.rightTurnDetected = false;
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

        // Calculate head yaw (left-right rotation) from landmarks
        const yaw = this.calculateHeadYaw(landmarks);

        // Store yaw history
        this.yawHistory.push(yaw);
        if (this.yawHistory.length > 10) {
            this.yawHistory.shift();
        }

        // Establish baseline when first detecting face
        if (this.baselineYaw === null && this.yawHistory.length >= 5) {
            this.baselineYaw = this.yawHistory.reduce((a, b) => a + b, 0) / this.yawHistory.length;
        }

        const challenge = this.getCurrentChallenge();

        if (challenge === 'TURN_LEFT') {
            return this.checkTurnLeft(yaw);
        } else if (challenge === 'TURN_RIGHT') {
            return this.checkTurnRight(yaw);
        }

        return { status: 'COMPLETE', message: 'Verification complete!' };
    }

    calculateHeadYaw(landmarks) {
        // Use nose and eye positions to estimate head yaw
        const nose = landmarks.getNose();
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        // Get center points
        const noseCenter = {
            x: nose[3].x, // Nose tip
            y: nose[3].y
        };

        const leftEyeCenter = {
            x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
            y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length
        };

        const rightEyeCenter = {
            x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
            y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length
        };

        // Calculate eye midpoint
        const eyeMidpoint = {
            x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
            y: (leftEyeCenter.y + rightEyeCenter.y) / 2
        };

        // Distance between eyes (for normalization)
        const eyeDistance = Math.abs(rightEyeCenter.x - leftEyeCenter.x);

        // Nose offset from eye midpoint (normalized)
        const noseOffset = (noseCenter.x - eyeMidpoint.x) / eyeDistance;

        // Convert to approximate yaw angle (rough estimation)
        // INVERTED because video is mirrored (selfie mode)
        // Positive = user turning left (appears right on screen)
        // Negative = user turning right (appears left on screen)
        const yaw = -noseOffset * 45; // Negative to match mirrored display

        return yaw;
    }

    checkTurnLeft(yaw) {
        const relativeYaw = yaw - (this.baselineYaw || 0);

        // Check if turned left enough (negative yaw = looking left)
        if (relativeYaw < -this.turnThreshold) {
            this.leftTurnDetected = true;
            this.challengeCompleted[0] = true;
            this.currentChallenge = 1;
            console.log('Left turn detected!', relativeYaw);
            return {
                status: 'CHALLENGE_COMPLETE',
                message: '✓ Left turn detected! Now turn RIGHT →',
                yaw: relativeYaw.toFixed(1),
                direction: 'left'
            };
        }

        // Show progress
        const progress = Math.min(100, Math.abs(relativeYaw / this.turnThreshold) * 100);

        return {
            status: 'WAITING',
            message: '← Turn your head LEFT',
            yaw: relativeYaw.toFixed(1),
            progress: progress.toFixed(0),
            direction: 'left',
            targetDirection: 'left'
        };
    }

    checkTurnRight(yaw) {
        const relativeYaw = yaw - (this.baselineYaw || 0);

        // Check if turned right enough (positive yaw = looking right)
        if (relativeYaw > this.turnThreshold) {
            this.rightTurnDetected = true;
            this.challengeCompleted[1] = true;
            console.log('Right turn detected!', relativeYaw);
            return {
                status: 'CHALLENGE_COMPLETE',
                message: '✓ Right turn detected! Verifying face match...',
                yaw: relativeYaw.toFixed(1),
                direction: 'right'
            };
        }

        // Show progress
        const progress = Math.min(100, Math.abs(relativeYaw / this.turnThreshold) * 100);

        return {
            status: 'WAITING',
            message: 'Turn your head RIGHT →',
            yaw: relativeYaw.toFixed(1),
            progress: progress.toFixed(0),
            direction: 'right',
            targetDirection: 'right'
        };
    }

    getProgress() {
        return {
            challenges: this.challenges,
            completed: this.challengeCompleted,
            current: this.currentChallenge,
            leftTurnDetected: this.leftTurnDetected,
            rightTurnDetected: this.rightTurnDetected
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
