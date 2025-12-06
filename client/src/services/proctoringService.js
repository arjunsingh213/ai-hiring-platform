import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

class ProctoringService {
    constructor() {
        this.model = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            await tf.ready();
            this.model = await faceLandmarksDetection.load(
                faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
                { maxFaces: 3 }
            );
            this.isInitialized = true;
            console.log('✅ Proctoring service initialized');
        } catch (error) {
            console.error('Failed to initialize proctoring:', error);
        }
    }

    async detectFaces(videoElement) {
        if (!this.isInitialized || !this.model) {
            return { faces: [], warnings: [] };
        }

        try {
            const predictions = await this.model.estimateFaces({
                input: videoElement,
                returnTensors: false,
                flipHorizontal: false
            });

            const warnings = [];

            // Check for multiple faces
            if (predictions.length > 1) {
                warnings.push({
                    type: 'multiple_faces',
                    severity: 'high',
                    message: 'Multiple faces detected'
                });
            }

            // Check if no face detected
            if (predictions.length === 0) {
                warnings.push({
                    type: 'no_face',
                    severity: 'medium',
                    message: 'No face detected - please stay in frame'
                });
            }

            // Check eye gaze (simplified - looking away detection)
            if (predictions.length === 1) {
                const face = predictions[0];
                const leftEye = face.annotations.leftEyeUpper0;
                const rightEye = face.annotations.rightEyeUpper0;

                if (leftEye && rightEye) {
                    const eyeDistance = Math.abs(leftEye[0][0] - rightEye[0][0]);

                    // If eyes are too far apart or too close, might be looking away
                    if (eyeDistance < 50 || eyeDistance > 150) {
                        warnings.push({
                            type: 'looking_away',
                            severity: 'medium',
                            message: 'Please look at the camera'
                        });
                    }
                }
            }

            return {
                faces: predictions,
                warnings
            };
        } catch (error) {
            console.error('Face detection error:', error);
            return { faces: [], warnings: [] };
        }
    }

    // Detect if user switched tabs or lost focus
    setupFocusDetection(onFocusLoss) {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                onFocusLoss({
                    type: 'tab_switch',
                    severity: 'high',
                    message: 'Tab switching detected'
                });
            }
        };

        const handleBlur = () => {
            onFocusLoss({
                type: 'window_blur',
                severity: 'medium',
                message: 'Window lost focus'
            });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }
}

export default new ProctoringService();
