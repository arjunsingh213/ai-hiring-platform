const SessionStore = require('./sessionStore');
const Orchestrator = require('./orchestrator');
const STTService = require('./sttService');
const TTSService = require('./ttsService');
const Interview = require('../../models/Interview');

const setupAdaptiveNamespace = (io) => {
    const adaptiveNs = io.of('/adaptive-interview');

    adaptiveNs.on('connection', (socket) => {
        console.log('[Adaptive] ✅ Socket connected:', socket.id);

        /**
         * Initialize the interview session
         */
        socket.on('start_interview', async (data) => {
            const { interviewId, candidateId, jobId, jobSkills, maxTurns, currentRoundIndex = 0 } = data;

            console.log(`[Adaptive] Starting session for ${candidateId}, interview: ${interviewId}, roundIndex: ${currentRoundIndex}`);

            // Fetch interview first to determine round type
            let interview = null;
            let currentRoundType = 'technical';
            try {
                interview = await Interview.findById(interviewId);
                if (interview?.pipelineConfig?.rounds) {
                    currentRoundType = interview.pipelineConfig.rounds[currentRoundIndex]?.roundType || 'technical';
                }
            } catch (err) {
                console.error('[Adaptive] Failed to fetch interview config:', err.message);
            }

            // Override technical skills with soft skills for HR/Behavioral rounds
            let activeSkills = jobSkills && jobSkills.length > 0 ? jobSkills : ['general_experience'];
            if (['hr', 'behavioral', 'screening'].includes(currentRoundType)) {
                activeSkills = [
                    'teamwork_and_collaboration',
                    'conflict_resolution',
                    'leadership_and_initiative',
                    'adaptability',
                    'communication_skills'
                ];
            }

            const session = SessionStore.createSession(socket.id, {
                interviewId,
                candidateId,
                jobId,
                jobSkills: activeSkills,
                maxTurns: maxTurns || 11
            });
            session.roundType = currentRoundType;

            socket.emit('session_initialized', {
                status: 'ready',
                currentSkill: session.currentSkill
            });

            // Push initial question if it exists in DB
            try {
                if (interview && interview.questions.length > 0) {
                    // Try to find the latest question for the *current* round specifically
                    const currentRoundQs = interview.questions.filter(q =>
                        q.roundIndex === interview.currentRoundIndex ||
                        q.roundIndex === currentRoundIndex ||
                        // Fallback for older data without roundIndex: just assume if there's questions, we use the last
                        q.roundIndex === undefined
                    );

                    const lastQuestion = currentRoundQs.length > 0
                        ? currentRoundQs[currentRoundQs.length - 1]
                        : interview.questions[interview.questions.length - 1];

                    console.log(`[Adaptive] 🤖 Emitting initial question: "${lastQuestion.question.substring(0, 50)}..."`);
                    socket.emit('ai_question_text', { text: lastQuestion.question });

                    // Generate and stream audio for the initial question
                    try {
                        const audioBuffer = await TTSService.generateAudio(lastQuestion.question);
                        Orchestrator._streamAudioBuffer(socket, audioBuffer);
                    } catch (e) {
                        console.error('[Adaptive] Initial TTS Failed:', e);
                        socket.emit('tts_error', { message: 'Voice generation failed, falling back to text.' });
                    }
                } else {
                    console.log(`[Adaptive] ⚠️ No initial questions found in DB for interview ${interviewId}`);
                }
            } catch (err) {
                console.error('[Adaptive] ❌ Failed to fetch initial question:', err.message);
            }
        });

        /**
         * Receive audio chunk from client (Whisper Pipeline)
         */
        socket.on('audio_chunk', async ({ audioBlob, mimeType }) => {
            const session = SessionStore.getSession(socket.id);
            if (!session) {
                socket.emit('error', { message: 'Session not initialized' });
                return;
            }

            try {
                // Accumulate chunks in session
                const buffer = Buffer.from(audioBlob);
                session.audioChunks.push(buffer);

                // Note: Real-time transcription while speaking is difficult with raw WebM chunks without headers.
                // We will transcribe the full set of chunks on 'silence_detected'.
            } catch (error) {
                console.error('[Adaptive] Audio chunk accumulation failed:', error);
            }
        });

        /**
         * Client indicates silence/done speaking
         */
        socket.on('silence_detected', async () => {
            const session = SessionStore.getSession(socket.id);
            if (!session || !session.audioChunks.length || session.isProcessing) return;

            // Lock session to prevent overlapping requests
            session.isProcessing = true;

            // Small delay to ensure last audio_chunk has arrived via network
            await new Promise(resolve => setTimeout(resolve, 200));

            try {
                socket.emit('status_update', { message: 'Transcribing...' });

                // Concatenate all chunks and transcribe
                const fullAudioBuffer = Buffer.concat(session.audioChunks);
                console.log(`[Adaptive] Transcribing ${fullAudioBuffer.length} bytes for ${socket.id}`);

                // Clear chunks for next turn immediately
                session.audioChunks = [];

                if (fullAudioBuffer.length < 10000) {
                    console.log(`[Adaptive] Native silence or empty buffer, prompting user.`);
                    socket.emit('ai_question_text', { text: "I didn't quite catch that. Could you please repeat your answer?" });

                    try {
                        const audioBuffer = await TTSService.generateAudio("I didn't quite catch that. Could you please repeat your answer?");
                        Orchestrator._streamAudioBuffer(socket, audioBuffer);
                    } catch (e) {
                        socket.emit('tts_error', { message: 'Voice generation failed.' });
                    }
                    session.isProcessing = false;
                    return;
                }

                let transcript = '';
                try {
                    transcript = await STTService.transcribeAudio(fullAudioBuffer);
                    console.log(`[Adaptive] Transcript: "${transcript}"`);
                } catch (sttError) {
                    console.log(`[Adaptive] STT Error caught softly, prompting user to repeat.`);
                    socket.emit('ai_question_text', { text: "I'm sorry, I had trouble hearing that clearly. Could you please repeat your answer?" });

                    try {
                        const audioBuffer = await TTSService.generateAudio("I'm sorry, I had trouble hearing that clearly. Could you please repeat your answer?");
                        Orchestrator._streamAudioBuffer(socket, audioBuffer);
                    } catch (e) {
                        socket.emit('tts_error', { message: 'Voice generation failed.' });
                    }
                    session.isProcessing = false;
                    return;
                }

                if (!transcript || transcript.trim().length < 2 || transcript.trim() === '.') {
                    console.log(`[Adaptive] Empty transcript received, ignoring or prompting to repeat.`);
                    socket.emit('tts_error', { message: 'Did not catch that, please speak clearly.' });
                    session.isProcessing = false;
                    return;
                }

                socket.emit('partial_transcript', { text: transcript, isFinal: true });

                // Pass control to the orchestrator to run the LLM loop
                await Orchestrator.handleAnswer(socket, transcript);
            } catch (error) {
                console.error('[Adaptive] Silence processing failed:', error);
                socket.emit('error', { message: 'Failed to process your response' });
                // We don't want to clear audioChunks here if it was just an STT timeout, 
                // but for general errors, it's safer to clear it.
            } finally {
                session.audioChunks = [];
                session.isProcessing = false; // Unlock session for next turn
            }
        });

        /**
         * Cleanup on disconnect
         */
        socket.on('disconnect', () => {
            console.log('[Adaptive] ❌ Socket disconnected:', socket.id);
            SessionStore.deleteSession(socket.id);
        });
    });

    return adaptiveNs;
};

module.exports = { setupAdaptiveNamespace };
