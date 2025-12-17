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
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const audioDataRef = useRef([]);

    // Load the Whisper model
    const loadModel = useCallback(async () => {
        if (transcriber.current || isModelLoading) return;

        setIsModelLoading(true);
        setError(null);

        try {
            // Load whisper-tiny for English
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
            console.log('Whisper model loaded successfully');
        } catch (err) {
            console.error('Failed to load Whisper model:', err);
            setError('Failed to load speech recognition model');
        } finally {
            setIsModelLoading(false);
        }
    }, [isModelLoading]);

    // Convert Float32Array to WAV blob
    const float32ToWav = (audioData, sampleRate = 16000) => {
        const numChannels = 1;
        const bytesPerSample = 2;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = audioData.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        // Audio data
        let offset = 44;
        for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    };

    // Start recording audio using Web Audio API
    const startRecording = useCallback(async () => {
        if (!modelLoaded) {
            await loadModel();
        }

        setError(null);
        audioDataRef.current = [];

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

            // Create audio context for raw PCM capture
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);

            // Use ScriptProcessor for audio capture (deprecated but widely supported)
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Make a copy of the audio data
                audioDataRef.current.push(new Float32Array(inputData));
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);
            console.log('Recording started with Web Audio API');
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Microphone access denied or unavailable');
        }
    }, [modelLoaded, loadModel]);

    // Stop recording and transcribe
    const stopRecording = useCallback(async () => {
        if (!isRecording) return '';

        setIsRecording(false);
        setIsTranscribing(true);

        try {
            // Stop audio processing
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }
            if (audioContextRef.current) {
                await audioContextRef.current.close();
                audioContextRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // Combine all audio chunks
            const totalLength = audioDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
            const combinedAudio = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of audioDataRef.current) {
                combinedAudio.set(chunk, offset);
                offset += chunk.length;
            }

            console.log('Audio collected:', combinedAudio.length, 'samples');

            if (combinedAudio.length < 1600) { // Less than 0.1 second
                console.log('Audio too short, skipping transcription');
                setIsTranscribing(false);
                return '';
            }

            // Convert to WAV blob and create URL
            const wavBlob = float32ToWav(combinedAudio, 16000);
            const audioUrl = URL.createObjectURL(wavBlob);

            if (transcriber.current) {
                console.log('Starting transcription...');
                const result = await transcriber.current(audioUrl, {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                    language: 'english',
                    task: 'transcribe',
                });

                URL.revokeObjectURL(audioUrl);

                const text = result.text?.trim() || '';
                console.log('Transcription result:', text);

                if (text) {
                    setTranscript(prev => prev ? `${prev} ${text}` : text);
                }

                setIsTranscribing(false);
                return text;
            }
        } catch (err) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe audio');
        }

        setIsTranscribing(false);
        return '';
    }, [isRecording]);

    // Clear transcript
    const clearTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (processorRef.current) {
                processorRef.current.disconnect();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
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
