class SpeechToTextService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
    }

    initialize() {
        // Check if browser supports Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        return true;
    }

    startListening(onTranscript, onError) {
        if (!this.recognition) {
            if (!this.initialize()) {
                onError?.('Speech recognition not supported');
                return false;
            }
        }

        this.transcript = '';
        this.isListening = true;

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            this.transcript = finalTranscript || interimTranscript;
            onTranscript?.(this.transcript, !finalTranscript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            onError?.(event.error);
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Restart if still supposed to be listening
                this.recognition.start();
            }
        };

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            onError?.(error.message);
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
        return this.transcript;
    }

    getTranscript() {
        return this.transcript;
    }

    clearTranscript() {
        this.transcript = '';
    }
}

export default new SpeechToTextService();
