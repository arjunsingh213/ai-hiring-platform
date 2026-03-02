const SessionStore = require('./sessionStore');
const AnalysisService = require('./analysisService');
const QuestionService = require('./questionService');
const TTSService = require('./ttsService');
const Interview = require('../../models/Interview'); // Just to save async

class Orchestrator {

    /**
     * Handles a completed candidate answer chunk
     */
    static async handleAnswer(socket, answerText) {
        const session = SessionStore.getSession(socket.id);
        if (!session) return;

        console.log(`[Adaptive] Processing answer for ${socket.id}. Turn ${session.turnCount + 1}/${session.maxTurns}`);

        // Add to buffer
        session.transcriptBuffer.push({ role: 'candidate', text: answerText });

        // Find previous question
        const previousQuestion = [...session.transcriptBuffer].reverse().find(t => t.role === 'interviewer')?.text || "Tell me about your experience.";

        // --- Pass 1: Strict JSON Analysis ---
        const analysis = await AnalysisService.analyzeTurn(answerText, session.currentSkill, previousQuestion);
        console.log(`[Adaptive] Analysis result:`, analysis);

        // --- Deterministic Strategy Engine ---
        session.strategy = this._determineStrategy(session, analysis);

        // --- Early Exit & Turn Limit Checking ---
        if (session.strategy === 'switch_skill') {
            session.consecutiveFailures += 1;
        } else if (!['repeat_question', 'clarify_question', 'natural_conversation'].includes(session.strategy)) {
            session.consecutiveFailures = 0;
        }

        const isMaxTurnsReached = session.turnCount >= session.maxTurns - 1;
        const isPoorPerformanceExit = session.consecutiveFailures >= 4;

        if (isMaxTurnsReached || isPoorPerformanceExit) {
            let exitMessage = "It seems we've covered a lot of ground today. Thank you so much for your time, that concludes this round of the interview!";
            let reason = 'max_turns_reached';

            if (isPoorPerformanceExit) {
                console.log(`[Adaptive] Early exit triggered for ${socket.id} due to 4 consecutive failures.`);
                exitMessage = "I think I have a good understanding of your background now. Thank you so much for your time, that concludes this round of the interview!";
                reason = 'poor_performance';
            }

            // Emit completion text
            console.log(`[Adaptive] Emitting exit message to ${socket.id}: "${exitMessage}"`);
            socket.emit('ai_question_text', { text: exitMessage });

            try {
                const audioBuffer = await TTSService.generateAudio(exitMessage);
                this._streamAudioBuffer(socket, audioBuffer);
            } catch (e) {
                console.error('[Adaptive] Exit TTS Failed:', e);
            }

            this._persistTurnAsync(session, answerText, exitMessage, analysis);

            // Wait a few seconds for audio to play before triggering frontend hook redirect
            setTimeout(() => {
                socket.emit('interview_complete', { reason });
            }, 6000);

            return; // Terminate loop
        }

        // Track coverage/weaknesses
        if (analysis.weakness_detected) session.weaknesses.push(analysis.weakness_detected);
        if (analysis.skill_detected && analysis.skill_detected !== "unknown") {
            if (!session.testedSubskills.includes(analysis.skill_detected)) {
                session.testedSubskills.push(analysis.skill_detected);
            }
        }

        // Decide if we switch main skills (either naturally or forced by "I don't know")
        session.skillCoverageMap[session.currentSkill] += 1;

        if (session.strategy === 'switch_skill' || session.skillCoverageMap[session.currentSkill] >= 3) {
            // Find explicitly the NEXT skill in the array to ensure we actually change topics
            const currentIndex = session.jobSkills.indexOf(session.currentSkill);

            // Try subsequent skills first
            let nextSkill = session.jobSkills.slice(currentIndex + 1).find(s => (session.skillCoverageMap[s] || 0) < 3);

            // If all subsequent are full, try from the beginning (wrap around)
            if (!nextSkill) {
                nextSkill = session.jobSkills.find(s => (session.skillCoverageMap[s] || 0) < 3 && s !== session.currentSkill);
            }

            // Absolute fallback: if literally everything is full or single skill list, just grab the first alternative
            if (!nextSkill && session.jobSkills.length > 1) {
                nextSkill = session.jobSkills.find(s => s !== session.currentSkill);
            }

            if (nextSkill && nextSkill !== session.currentSkill) {
                // Mark the old skill as explicitly maxed out so we don't accidentally come back to it
                if (session.strategy === 'switch_skill') {
                    session.skillCoverageMap[session.currentSkill] = 3;
                }
                session.currentSkill = nextSkill;
                session.strategy = 'switch_skill';
            }
        }


        // --- Pass 2: Question Generation ---
        const nextQuestion = await QuestionService.generateQuestion({
            currentSkill: session.currentSkill,
            depthLevel: analysis.depth_level,
            strategy: session.strategy,
            testedSubskills: session.testedSubskills,
            previousAnswer: answerText,
            previousQuestion: previousQuestion, // Expose previous question for repeat/clarify
            roundType: session.roundType // Pass roundType to adjust AI persona
        });

        session.transcriptBuffer.push({ role: 'interviewer', text: nextQuestion });

        // Increment turn count for every LLM exchange to prevent infinite stalling
        session.turnCount += 1;

        // Emit text immediately
        console.log(`[Adaptive] Emitting question to ${socket.id}: "${nextQuestion}"`);
        socket.emit('ai_question_text', { text: nextQuestion });

        // --- TTS Generation (Streaming Buffer) ---
        try {
            const audioBuffer = await TTSService.generateAudio(nextQuestion);
            // Simulate streaming chunks (In a real scenario with elevenlabs websocket, this would stream natively. 
            // Here we chunk the buffer over standard socket io events to simulate streaming playback)
            this._streamAudioBuffer(socket, audioBuffer);
        } catch (e) {
            console.error('[Adaptive] TTS Failed:', e);
            socket.emit('tts_error', { message: 'Voice generation failed, falling back to text.' });
        }

        // --- Async Persistence (Does not block loop) ---
        this._persistTurnAsync(session, answerText, nextQuestion, analysis);
    }

    /**
     * Deterministic Rules Engine
     */
    static _determineStrategy(session, analysis) {
        // If the LLM already identified a conversational need, trust it
        const convStrategies = ['repeat_question', 'clarify_question', 'encouragement', 'natural_conversation', 'switch_skill'];
        if (convStrategies.includes(analysis.follow_up_strategy)) {
            return analysis.follow_up_strategy;
        }

        // If clarity is extremely low, and it wasn't caught as small talk/I don't know, ask for clarification.
        if (analysis.clarity_score < 0.2) return 'clarify_question';
        if (analysis.clarity_score < 0.5) return 'encouragement'; // Or drill down gently.

        const depth = analysis.depth_level;
        session.depthMap[session.currentSkill] = depth;

        if (depth === 'basic') return 'drill_concept';
        if (depth === 'intermediate') return 'scenario_based';
        if (depth === 'advanced') return 'escalate_difficulty';

        return 'drill_concept';
    }

    /**
     * Simulate streaming the MP3 buffer
     */
    static _streamAudioBuffer(socket, buffer) {
        // Send in 32kb chunks
        const chunkSize = 32768;
        let offset = 0;

        const sendChunk = () => {
            if (offset < buffer.length) {
                const chunk = buffer.slice(offset, offset + chunkSize);
                socket.emit('ai_question_audio_chunk', { chunk: chunk.toString('base64'), isFinal: false });
                offset += chunkSize;
                setTimeout(sendChunk, 50); // slight delay to act like a stream
            } else {
                socket.emit('ai_question_audio_chunk', { chunk: null, isFinal: true });
            }
        };
        sendChunk();
    }

    /**
     * Helper to map LLM depth to DB enum
     */
    static _mapDepthToDifficulty(depthLevel) {
        if (!depthLevel) return 'easy';
        const d = depthLevel.toLowerCase();
        if (d.includes('none') || d.includes('basic')) return 'easy';
        if (d.includes('intermediate')) return 'medium';
        if (d.includes('advanced')) return 'hard';
        return 'medium'; // default fallback
    }

    /**
     * Fire and forget DB save
     */
    static async _persistTurnAsync(session, answerText, nextQuestionText, analysis) {
        if (!session.interviewId) return; // Mocking locally

        try {
            const mappedDifficulty = this._mapDepthToDifficulty(analysis.depth_level);

            await Interview.findByIdAndUpdate(session.interviewId, {
                $push: {
                    responses: {
                        questionIndex: session.turnCount - 1,
                        answer: answerText,
                        timeSpent: 0,
                        evaluation: {
                            score: analysis.clarity_score * 100,
                            feedback: analysis.weakness_detected || 'Good response',
                            topicsAddressed: analysis.skill_detected !== "unknown" ? [analysis.skill_detected] : []
                        }
                    },
                    questions: {
                        question: nextQuestionText,
                        generatedBy: 'adaptive',
                        category: session.currentSkill,
                        difficulty: mappedDifficulty,
                        roundIndex: 0
                    }
                }
            });
            console.log(`[Adaptive] DB Persisted turn async for ${session.interviewId}`);
        } catch (e) {
            console.error('[Adaptive] DB persistence failed:', e.message);
        }
    }
}

module.exports = Orchestrator;
