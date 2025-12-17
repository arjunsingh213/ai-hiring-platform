import { useState, useRef, useCallback, useEffect } from 'react';
import { pipeline } from '@huggingface/transformers';

/**
 * Custom hook for Whisper-based Speech-to-Text
 * Uses whisper-tiny.en for efficient client-side transcription
 */
const useWhisperSTT = () => {
    // Model and pipeline state
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [modelProgress, setModelProgress] = useState(0);
    const transcriber = useRef(null);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);

    // Audio recording refs
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const streamRef = useRef(null);

    // Load the Whisper model
    const loadModel = useCallback(async () => {
        if (transcriber.current || isModelLoading) return;

        setIsModelLoading(true);
        setError(null);

        try {
            // Load whisper-tiny for English, optimized for speed
            transcriber.current = await pipeline(
                'automatic-speech-recognition',
                'Xenova/whisper-tiny.en',
                {
                    progress_callback: (progress) => {
                        if (progress.status === 'progress') {
                            setModelProgress(Math.round(progress.progress));
                        }
                    },
                    // Use WebGPU if available for faster inference
                    device: 'webgpu',
                    dtype: 'fp32',
                }
            );
            setModelLoaded(true);
            console.log('Whisper model loaded successfully');
        } catch (err) {
            console.error('Failed to load Whisper model:', err);
            // Fallback without WebGPU
            try {
                transcriber.current = await pipeline(
                    'automatic-speech-recognition',
                    'Xenova/whisper-tiny.en',
                    {
                        progress_callback: (progress) => {
                            if (progress.status === 'progress') {
                                setModelProgress(Math.round(progress.progress));
                            }
                        },
                    }
                );
                setModelLoaded(true);
                console.log('Whisper model loaded (CPU fallback)');
            } catch (fallbackErr) {
                setError('Failed to load speech recognition model');
                console.error('Whisper fallback failed:', fallbackErr);
            }
        } finally {
            setIsModelLoading(false);
        }
    }, [isModelLoading]);

    // Start recording audio
    const startRecording = useCallback(async () => {
        if (!modelLoaded) {
            await loadModel();
        }

        setError(null);
        audioChunks.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            streamRef.current = stream;

            mediaRecorder.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.start(1000); // Collect data every second
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Microphone access denied or unavailable');
        }
    }, [modelLoaded, loadModel]);

    // Stop recording and transcribe
    const stopRecording = useCallback(async () => {
        if (!mediaRecorder.current || !isRecording) return '';

        return new Promise((resolve) => {
            mediaRecorder.current.onstop = async () => {
                setIsRecording(false);
                setIsTranscribing(true);

                try {
                    // Create audio blob
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

                    // Create a URL for the blob that Whisper can read
                    const audioUrl = URL.createObjectURL(audioBlob);

                    if (transcriber.current) {
                        // Transcribe with Whisper using the blob URL
                        const result = await transcriber.current(audioUrl, {
                            chunk_length_s: 30,
                            stride_length_s: 5,
                            language: 'english',
                            task: 'transcribe',
                        });

                        // Clean up the URL
                        URL.revokeObjectURL(audioUrl);

                        const text = result.text || '';
                        setTranscript(prev => prev ? `${prev} ${text}` : text);
                        resolve(text);
                    } else {
                        resolve('');
                    }
                } catch (err) {
                    console.error('Transcription error:', err);
                    setError('Failed to transcribe audio');
                    resolve('');
                } finally {
                    setIsTranscribing(false);

                    // Stop media stream
                    if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                        streamRef.current = null;
                    }
                }
            };

            mediaRecorder.current.stop();
        });
    }, [isRecording]);

    // Clear transcript
    const clearTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        // State
        isModelLoading,
        modelLoaded,
        modelProgress,
        isRecording,
        isTranscribing,
        transcript,
        error,

        // Actions
        loadModel,
        startRecording,
        stopRecording,
        clearTranscript,
        setTranscript,
    };
};

export default useWhisperSTT;
