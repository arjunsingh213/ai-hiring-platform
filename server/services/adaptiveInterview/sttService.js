const axios = require('axios');
const FormData = require('form-data');

class STTService {
    /**
     * Transcribes audio using Groq Whisper.
     * @param {Buffer} audioBuffer - The audio chunk buffer
     * @param {string} mimeType - e.g., 'audio/webm' or 'audio/wav'
     * @returns {string} - The transcribed text
     */
    static async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
        try {
            const form = new FormData();

            // Map common mime types to generic extensions for Whisper
            let ext = 'webm';
            if (mimeType.includes('mp4')) ext = 'mp4';
            if (mimeType.includes('wav')) ext = 'wav';
            if (mimeType.includes('mpeg')) ext = 'mp3';

            form.append('file', audioBuffer, {
                filename: `audio.${ext}`,
                contentType: mimeType || 'audio/webm',
            });
            form.append('model', 'whisper-large-v3-turbo');
            form.append('response_format', 'text');

            const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            return typeof response.data === 'string' ? response.data : response.data.text;
        } catch (error) {
            console.error('[STTService] Whisper transcription failed:', error.response?.data || error.message);
            throw new Error('Transcription failed');
        }
    }
}

module.exports = STTService;
