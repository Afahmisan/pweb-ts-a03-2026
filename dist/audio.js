/**
 * Audio & Voice Announcement Specialist
 * - Web Audio API Synthesizer (2-tone hospital bell chime)
 * - Web Speech API (Indonesian voice announcement)
 */
export class AudioManager {
    /**
     * Initialize or resume AudioContext on user interaction
     */
    static unlockAudio() {
        try {
            if (!this.audioCtx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.audioCtx = new AudioContextClass();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            if ('speechSynthesis' in window && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            this.isAudioUnlocked = true;
        }
        catch (err) {
            console.warn('AudioContext initialization failed:', err);
        }
    }
    static toggleSound(enabled) {
        if (enabled !== undefined) {
            this.isSoundEnabled = enabled;
        }
        else {
            this.isSoundEnabled = !this.isSoundEnabled;
        }
        if (!this.isSoundEnabled) {
            this.queue = [];
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            this.isProcessing = false;
        }
        return this.isSoundEnabled;
    }
    static isEnabled() {
        return this.isSoundEnabled;
    }
    /**
     * Synthesize a two-tone hospital ding-dong chime using Web Audio API
     */
    static playHospitalChime() {
        return new Promise((resolve) => {
            if (!this.isSoundEnabled) {
                resolve();
                return;
            }
            this.unlockAudio();
            if (!this.audioCtx) {
                resolve();
                return;
            }
            try {
                const now = this.audioCtx.currentTime;
                // Note 1: E5 (659.25 Hz)
                const osc1 = this.audioCtx.createOscillator();
                const gain1 = this.audioCtx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(659.25, now);
                gain1.gain.setValueAtTime(0.001, now);
                gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
                gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
                osc1.connect(gain1);
                gain1.connect(this.audioCtx.destination);
                osc1.start(now);
                osc1.stop(now + 0.6);
                // Note 2: C5 (523.25 Hz) delayed by 0.35s
                const osc2 = this.audioCtx.createOscillator();
                const gain2 = this.audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(523.25, now + 0.35);
                gain2.gain.setValueAtTime(0.001, now + 0.35);
                gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.4);
                gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
                osc2.connect(gain2);
                gain2.connect(this.audioCtx.destination);
                osc2.start(now + 0.35);
                osc2.stop(now + 1.15);
                setTimeout(() => {
                    resolve();
                }, 1050);
            }
            catch (err) {
                console.warn('Chime audio error:', err);
                resolve();
            }
        });
    }
    /**
     * Enqueue a ticket announcement (FIFO) to prevent simultaneous audio collisions
     */
    static speakAnnouncement(ticketNumber, serviceName, isRecall = false) {
        if (!this.isSoundEnabled || !('speechSynthesis' in window)) {
            return;
        }
        const announceKey = `${ticketNumber}_${serviceName}_${isRecall ? 'recall' : 'call'}`;
        const now = Date.now();
        // In-memory debounce (prevents same tab fast duplicate invocation within 1200ms)
        if (this.lastAnnounceKey === announceKey && now - this.lastAnnounceTimestamp < 1200) {
            return;
        }
        // Cross-tab broadcast deduplication
        try {
            const stored = localStorage.getItem('hospital_audio_last_announcement');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.key === announceKey && now - parsed.time < 1200) {
                    return;
                }
            }
            localStorage.setItem('hospital_audio_last_announcement', JSON.stringify({ key: announceKey, time: now }));
        }
        catch {
            // Ignore if localStorage unavailable
        }
        this.lastAnnounceKey = announceKey;
        this.lastAnnounceTimestamp = now;
        this.queue.push({ ticketNumber, serviceName, isRecall });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    /**
     * Process the queued announcements sequentially
     */
    static async processQueue() {
        if (this.isProcessing || this.queue.length === 0 || !this.isSoundEnabled) {
            return;
        }
        this.isProcessing = true;
        while (this.queue.length > 0) {
            if (!this.isSoundEnabled) {
                this.queue = [];
                break;
            }
            const item = this.queue.shift();
            if (!item)
                break;
            // Chime tone precedes vocal announcement for acoustic clarity
            await this.playHospitalChime();
            await this.speakUtterance(item);
            // Brief pause between sequential queue announcements
            if (this.queue.length > 0) {
                await new Promise((r) => setTimeout(r, 350));
            }
        }
        this.isProcessing = false;
    }
    /**
     * Normalize service name for natural Indonesian TTS pronunciation.
     * Converts ALL CAPS words (e.g. "PSIKOLOG" -> "Psikolog") so TTS does not spell them out letter-by-letter.
     * Preserves real hospital acronyms like IGD, ICU, THT, BPJS.
     * Converts hyphens (e.g. "UMUM-1" -> "Umum 1") so TTS says "satu" instead of "minus satu".
     */
    static normalizeServiceNameForSpeech(rawName) {
        if (!rawName)
            return '';
        const text = rawName.replace(/[-_]+/g, ' ').trim();
        const knownAcronyms = new Set([
            'IGD', 'UGD', 'ICU', 'NICU', 'PICU', 'HCU', 'ICCU',
            'THT', 'BPJS', 'MRI', 'CT', 'EKG', 'EEG', 'USG',
            'LAB', 'HIV', 'TB', 'PONEK', 'VK'
        ]);
        const words = text.split(/\s+/).map((word) => {
            const upper = word.toUpperCase();
            if (knownAcronyms.has(upper)) {
                return upper;
            }
            if (/^\d+$/.test(word)) {
                return word;
            }
            if (word === word.toUpperCase() && word.length > 1) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word;
        });
        return words.join(' ');
    }
    /**
     * Speak a single utterance with full browser lifecycle handlers
     */
    static speakUtterance(item) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve();
                return;
            }
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
                const formattedTicket = item.ticketNumber.replace('-', ', ');
                const normalizedServiceName = AudioManager.normalizeServiceNameForSpeech(item.serviceName);
                const prefix = item.isRecall ? 'Panggilan ulang. ' : '';
                const message = `${prefix}Nomor antrian ${formattedTicket}, silakan menuju loket ${normalizedServiceName}.`;
                const utterance = new SpeechSynthesisUtterance(message);
                utterance.lang = 'id-ID';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                const voices = window.speechSynthesis.getVoices();
                const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
                if (idVoice) {
                    utterance.voice = idVoice;
                }
                // Store active utterance reference to prevent Chromium garbage collection bug
                this.currentUtterance = utterance;
                let isDone = false;
                const finalize = () => {
                    if (isDone)
                        return;
                    isDone = true;
                    this.currentUtterance = null;
                    resolve();
                };
                utterance.onend = finalize;
                utterance.onerror = (err) => {
                    console.warn('Speech synthesis error:', err);
                    finalize();
                };
                // Safety timeout to guarantee queue never locks up (max 6.5s per utterance)
                setTimeout(finalize, 6500);
                // Workaround for Chrome bug where long speech pauses unexpectedly
                const intervalId = setInterval(() => {
                    if (isDone) {
                        clearInterval(intervalId);
                        return;
                    }
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                }, 300);
                window.speechSynthesis.speak(utterance);
            }
            catch (err) {
                console.warn('Speech synthesis error:', err);
                resolve();
            }
        });
    }
}
AudioManager.audioCtx = null;
AudioManager.isAudioUnlocked = false;
AudioManager.isSoundEnabled = true;
AudioManager.queue = [];
AudioManager.isProcessing = false;
AudioManager.currentUtterance = null;
AudioManager.lastAnnounceKey = '';
AudioManager.lastAnnounceTimestamp = 0;
