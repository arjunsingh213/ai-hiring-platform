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

            // Determine interview type from Interview document (platform vs job_specific)
            const detectedInterviewType = interview?.interviewType || (data.interviewType || 'job_specific');

            const session = SessionStore.createSession(socket.id, {
                interviewId,
                candidateId,
                jobId,
                interviewType: detectedInterviewType,
                jobSkills: activeSkills,
                maxTurns: maxTurns || 8
            });
            console.log(`[Adaptive] Session created. Type: ${detectedInterviewType}, MaxTurns: ${session.maxTurns}`);
            session.roundType = currentRoundType;

            socket.emit('session_initialized', {
                status: 'ready',
                currentSkill: session.currentSkill
            });

            // Restore conversation state for this ROUND specifically
            const currentRoundQs = (interview?.questions || []).filter(q =>
                q.roundIndex === currentRoundIndex || (currentRoundIndex === 0 && q.roundIndex === undefined)
            );

            // Restore session counters based on this round's questions/responses
            const currentRoundResponses = (interview?.responses || []).filter(r =>
                r.roundIndex === currentRoundIndex || (currentRoundIndex === 0 && r.roundIndex === undefined)
            );
            session.turnCount = currentRoundResponses.length;

            // Build transcript buffer (only for current round context)
            currentRoundQs.forEach((q, i) => {
                session.transcriptBuffer.push({ role: 'interviewer', text: q.question });
                const ans = currentRoundResponses.find(r => r.questionIndex === i);
                if (ans) {
                    session.transcriptBuffer.push({ role: 'candidate', text: ans.answer });
                }
            });

            // Emit the active question for this round
            if (currentRoundQs.length > 0) {
                const lastQuestion = currentRoundQs[currentRoundQs.length - 1].question;
                console.log(`[Adaptive] Resuming round ${currentRoundIndex}. Emitting last question.`);
                socket.emit('ai_question_text', { text: lastQuestion });

                try {
                    const audioBuffer = await TTSService.generateAudio(lastQuestion);
                    Orchestrator._streamAudioBuffer(socket, audioBuffer);
                } catch (e) {
                    console.error('[Adaptive] TTS Failed on resume:', e);
                }
            } else if (currentRoundIndex > 0) {
                // BUG FIX #5: Platform interview transitioning to a NEW round with NO questions yet
                console.log(`[Adaptive] No questions found for round ${currentRoundIndex}. Auto-generating opening question...`);

                const QuestionService = require('./questionService');
                const resumeContext = interview?.metadata ? {
                    desiredRole: interview.metadata.desiredRole,
                    experienceLevel: interview.metadata.experienceLevel,
                    domains: interview.metadata.jobDomains || [],
                    projects: interview.metadata.resumeProjects || [],
                    experience: interview.metadata.resumeExperience || []
                } : null;

                const openingQuestion = await QuestionService.generateOpeningQuestion({
                    roundType: currentRoundType,
                    skills: activeSkills,
                    resumeContext: resumeContext
                });

                console.log(`[Adaptive] Generated opening question: "${openingQuestion}"`);

                // Add it to the session and emit
                session.transcriptBuffer.push({ role: 'interviewer', text: openingQuestion });
                socket.emit('ai_question_text', { text: openingQuestion });

                // Generate Audio
                try {
                    const audioBuffer = await TTSService.generateAudio(openingQuestion);
                    Orchestrator._streamAudioBuffer(socket, audioBuffer);
                } catch (e) {
                    console.error('[Adaptive] TTS Failed for opening question:', e);
                }

                // Persist it immediately to the DB so it's logged as the first question of this round index
                try {
                    await Interview.findByIdAndUpdate(interviewId, {
                        $push: {
                            questions: {
                                question: openingQuestion,
                                category: session.currentSkill,
                                difficulty: 'medium',
                                generatedBy: 'adaptive',
                                assessingSkill: session.currentSkill,
                                roundIndex: currentRoundIndex
                            }
                        }
                    });
                } catch (dbErr) {
                    console.error('[Adaptive] Failed to persist opening question automatically:', dbErr);
                }
            } else {
                console.log(`[Adaptive] Warning: No initial question found for Round 0 in interview ${interviewId}`);
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
