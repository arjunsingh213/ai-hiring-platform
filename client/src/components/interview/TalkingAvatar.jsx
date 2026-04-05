import React, { useRef, useEffect, useMemo } from 'react';
import './TalkingAvatar.css';

/**
 * AI Voice Assistant Avatar
 * 
 * Replaces the old blue circle with the Froscel logo + dynamic audio-reactive spikes.
 * - Idle: gentle breathing scale + soft glow
 * - Speaking: spikes around logo pulse up/down like an audio visualizer, neon glow intensifies
 * - Listening: calm emerald ring pulse
 * - Thinking: orbiting particles
 */
const TalkingAvatar = ({ state = 'idle', size = 'default' }) => {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const phaseRef = useRef(0);

    // Number of spikes around the logo
    const SPIKE_COUNT = 48;

    // Pre-generate random offsets for organic feel (stable across renders)
    const spikeOffsets = useMemo(() => {
        return Array.from({ length: SPIKE_COUNT }, () => ({
            speed: 0.5 + Math.random() * 2.5,
            offset: Math.random() * Math.PI * 2,
            amplitude: 0.4 + Math.random() * 0.6,
        }));
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Size canvas
        const canvasSize = size === 'large' ? 350 : 280;
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        canvas.style.width = `${canvasSize}px`;
        canvas.style.height = `${canvasSize}px`;
        ctx.scale(dpr, dpr);

        const centerX = canvasSize / 2;
        const centerY = canvasSize / 2;
        const baseRadius = size === 'large' ? 85 : 70;

        const draw = () => {
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            phaseRef.current += 0.02;
            const t = phaseRef.current;

            const isSpeaking = state === 'speaking';
            const isListening = state === 'listening';
            const isThinking = state === 'thinking';

            // === OUTER GLOW (always visible, stronger when speaking) ===
            const glowRadius = baseRadius + 60;
            const glowAlpha = isSpeaking
                ? 0.15 + 0.1 * Math.sin(t * 3)
                : isListening
                    ? 0.08 + 0.04 * Math.sin(t * 2)
                    : 0.05 + 0.02 * Math.sin(t);

            const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, glowRadius);
            if (isSpeaking) {
                gradient.addColorStop(0, `rgba(200, 120, 255, ${glowAlpha * 1.5})`);
                gradient.addColorStop(0.5, `rgba(139, 92, 246, ${glowAlpha})`);
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            } else if (isListening) {
                gradient.addColorStop(0, `rgba(16, 185, 129, ${glowAlpha * 1.5})`);
                gradient.addColorStop(0.5, `rgba(16, 185, 129, ${glowAlpha})`);
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
            } else {
                gradient.addColorStop(0, `rgba(200, 140, 255, ${glowAlpha * 1.2})`);
                gradient.addColorStop(0.5, `rgba(139, 92, 246, ${glowAlpha})`);
                gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
            }
            ctx.beginPath();
            ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // === AUDIO-REACTIVE SPIKES (main feature) ===
            if (isSpeaking || isListening || isThinking) {
                const spikeBaseLen = isSpeaking ? 25 : isListening ? 10 : 8;
                const spikeMaxExtra = isSpeaking ? 35 : isListening ? 12 : 15;

                for (let i = 0; i < SPIKE_COUNT; i++) {
                    const angle = (i / SPIKE_COUNT) * Math.PI * 2;
                    const offset = spikeOffsets[i];

                    // Each spike oscillates independently
                    let spikeLen;
                    if (isSpeaking) {
                        // Vigorous oscillation — simulated audio reactivity
                        spikeLen = spikeBaseLen +
                            spikeMaxExtra * offset.amplitude *
                            Math.abs(Math.sin(t * offset.speed + offset.offset)) *
                            (0.5 + 0.5 * Math.sin(t * 1.5 + i * 0.3));
                    } else if (isThinking) {
                        // Subtle rotating wave
                        spikeLen = spikeBaseLen +
                            spikeMaxExtra * 0.5 *
                            Math.abs(Math.sin(t * 0.8 + angle * 3));
                    } else {
                        // Listening: gentle uniform pulse
                        spikeLen = spikeBaseLen +
                            spikeMaxExtra * 0.6 *
                            Math.abs(Math.sin(t * 1.2 + offset.offset));
                    }

                    const innerR = baseRadius + 8;
                    const outerR = innerR + spikeLen;

                    const x1 = centerX + Math.cos(angle) * innerR;
                    const y1 = centerY + Math.sin(angle) * innerR;
                    const x2 = centerX + Math.cos(angle) * outerR;
                    const y2 = centerY + Math.sin(angle) * outerR;

                    // Color based on angle position (matches logo gradient: pink → purple → blue)
                    const hue = 280 + (angle / (Math.PI * 2)) * 60; // 280-340 range
                    const saturation = isSpeaking ? 80 : 60;
                    const lightness = isSpeaking 
                        ? 60 + 20 * Math.sin(t * 3 + i * 0.2)
                        : isListening ? 55 : 50;
                    const alpha = isSpeaking
                        ? 0.5 + 0.4 * (spikeLen / (spikeBaseLen + spikeMaxExtra))
                        : 0.3 + 0.3 * (spikeLen / (spikeBaseLen + spikeMaxExtra));

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
                    ctx.lineWidth = isSpeaking ? 2.5 : 1.8;
                    ctx.lineCap = 'round';
                    ctx.stroke();

                    // Bright tip glow on speaking
                    if (isSpeaking && spikeLen > spikeBaseLen + spikeMaxExtra * 0.5) {
                        ctx.beginPath();
                        ctx.arc(x2, y2, 2, 0, Math.PI * 2);
                        ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.8})`;
                        ctx.fill();
                    }
                }
            }

            // === INNER RING (border around logo area) ===
            const ringAlpha = isSpeaking
                ? 0.6 + 0.3 * Math.sin(t * 4)
                : isListening
                    ? 0.4 + 0.2 * Math.sin(t * 2)
                    : 0.15 + 0.1 * Math.sin(t);

            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = isSpeaking
                ? `rgba(200, 140, 255, ${ringAlpha})`
                : isListening
                    ? `rgba(52, 211, 153, ${ringAlpha})`
                    : `rgba(167, 139, 250, ${ringAlpha})`;
            ctx.lineWidth = isSpeaking ? 2.5 : 1.5;
            ctx.stroke();

            // === LISTENING: additional pulse ring ===
            if (isListening) {
                const pulseProgress = (t * 0.5) % 1;
                const pulseR = baseRadius + 10 + pulseProgress * 50;
                const pulseAlpha = 0.4 * (1 - pulseProgress);
                ctx.beginPath();
                ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(52, 211, 153, ${pulseAlpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // === THINKING: orbiting dots ===
            if (isThinking) {
                for (let i = 0; i < 3; i++) {
                    const orbitAngle = t * 1.5 + (i * Math.PI * 2) / 3;
                    const orbitR = baseRadius + 25;
                    const dotX = centerX + Math.cos(orbitAngle) * orbitR;
                    const dotY = centerY + Math.sin(orbitAngle) * orbitR;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(251, 191, 36, ${0.6 + 0.3 * Math.sin(t * 2 + i)})`;
                    ctx.fill();
                }
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [state, size, spikeOffsets]);

    return (
        <div className={`ai-talking-avatar-container size-${size}`}>
            <div className="avatar-visualizer-wrapper">
                {/* Canvas for spikes and glow effects (behind logo) */}
                <canvas ref={canvasRef} className="avatar-spike-canvas" />

                {/* Logo image (center, on top of canvas) */}
                <div className={`avatar-logo-container state-${state}`}>
                    <img
                        src="/ai-avatar-logo.png"
                        alt="AI Assistant"
                        className="avatar-logo-img"
                        draggable={false}
                    />
                </div>
            </div>

            {/* Status badge */}
            <div className="avatar-status-badge">
                <span className={`status-dot ${state}`}></span>
                {state === 'speaking' ? 'Speaking' :
                 state === 'listening' ? 'Listening' :
                 state === 'thinking' ? 'Thinking' : 'Ready'}
            </div>
        </div>
    );
};

export default TalkingAvatar;
