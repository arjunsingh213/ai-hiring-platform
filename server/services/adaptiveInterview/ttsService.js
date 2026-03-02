const axios = require('axios');

class TTSService {
    /**
     * Converts text to speech using ElevenLabs (or fallback)
     * Returns a buffer that can be chunked for streaming over WebSockets.
     * @param {string} text 
     * @returns {Buffer} Audio data (mp3)
     */
    static async generateAudio(text) {
        if (!process.env.ELEVENLABS_API_KEY) {
            console.warn('[TTSService] No ElevenLabs API key found. Returning valid silent MP3 buffer.');
            // Base64 for a 1-second silent MP3
            const silentMp3Base64 = 'SUQzBAAAAAAAAFRTU0UAAAAPAAADTGFtZTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
            return Buffer.from(silentMp3Base64, 'base64');
        }

        try {
            // Default to 'Adam' for high-quality professional voice available on all free tiers
            const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Standard ElevenLabs voice

            const response = await axios({
                method: 'post',
                url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                data: {
                    text: text,
                    model_id: 'eleven_turbo_v2_5', // Faster model for real-time
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                },
                responseType: 'arraybuffer'
            });

            return Buffer.from(response.data);
        } catch (error) {
            console.error('[TTSService] ElevenLabs API error:', error.response?.data ? error.response.data.toString() : error.message);
            throw new Error('TTS Generation failed');
        }
    }
}

module.exports = TTSService;
