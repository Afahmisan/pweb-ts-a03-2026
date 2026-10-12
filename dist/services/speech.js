import { getCounterForService } from './storage.js';
export class SpeechService {
    static initVoices() {
        if (this.isInitialized || typeof window === 'undefined' || !('speechSynthesis' in window))
            return;
        this.isInitialized = true;
        const pickVoices = () => {
            try {
                const voices = window.speechSynthesis.getVoices();
                if (!voices || voices.length === 0)
                    return;
                this.cachedIdVoice = voices.find(v => v.lang && (v.lang.toLowerCase().includes('id') || v.lang.toLowerCase().includes('ind'))) || null;
                this.cachedEnVoice = voices.find(v => v.lang && (v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().includes('eng'))) || null;
            }
            catch {
                // Ignore
            }
        };
        pickVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = pickVoices;
        }
    }
    /**
     * Format teks dan parameter pitch pengumuman dwibahasa secara deterministik
     */
    static formatAnnouncement(ticketOrNumber, counterName) {
        const ticketNumber = typeof ticketOrNumber === 'string' ? ticketOrNumber : ticketOrNumber.ticketNumber;
        let rawDest = typeof ticketOrNumber === 'string' ? counterName : (ticketOrNumber.counterName || counterName);
        if (!rawDest && typeof ticketOrNumber !== 'string' && ticketOrNumber.serviceCode) {
            rawDest = getCounterForService(ticketOrNumber.serviceCode);
        }
        // Ekstrak nomor loket (misal "Loket 02" -> 2)
        let counterNum = 1;
        let idCounter = '';
        let enCounter = '';
        if (rawDest) {
            const numMatch = rawDest.match(/\d+/);
            if (numMatch) {
                counterNum = parseInt(numMatch[0], 10);
                idCounter = `Loket ${counterNum}`;
                enCounter = `Counter ${counterNum}`;
            }
            else {
                idCounter = rawDest;
                enCounter = rawDest;
            }
        }
        // Variasi pitch alami & profesional antar loket:
        // Loket 1: 1.0, Loket 2: 1.05, Loket 3: 1.10, Loket 4: 0.95
        let counterPitch = 1.0;
        switch (counterNum) {
            case 1:
                counterPitch = 1.0;
                break;
            case 2:
                counterPitch = 1.05;
                break;
            case 3:
                counterPitch = 1.1;
                break;
            case 4:
                counterPitch = 0.95;
                break;
            default:
                counterPitch = 1.0 + ((counterNum - 1) % 4) * 0.05;
                break;
        }
        let spokenId = '';
        let spokenEn = '';
        if (ticketNumber.toLowerCase().includes('panduan')) {
            spokenId = 'Panduan suara: Silakan sentuh tombol layanan yang Anda tuju.';
            spokenEn = 'Voice guide: Please touch the service button you wish to visit.';
        }
        else {
            // Pisahkan digit angka agar dieja satu per satu: misal "001" -> "nol nol satu" & "zero zero one"
            const [prefix, numPart] = ticketNumber.includes('-') ? ticketNumber.split('-') : ['', ticketNumber];
            const digitWordsId = {
                '0': 'nol',
                '1': 'satu',
                '2': 'dua',
                '3': 'tiga',
                '4': 'empat',
                '5': 'lima',
                '6': 'enam',
                '7': 'tujuh',
                '8': 'delapan',
                '9': 'sembilan'
            };
            const digitWordsEn = {
                '0': 'zero',
                '1': 'one',
                '2': 'two',
                '3': 'three',
                '4': 'four',
                '5': 'five',
                '6': 'six',
                '7': 'seven',
                '8': 'eight',
                '9': 'nine'
            };
            const spokenDigitsId = (numPart || '')
                .split('')
                .map(d => digitWordsId[d] || d)
                .join(' ');
            const spokenDigitsEn = (numPart || '')
                .split('')
                .map(d => digitWordsEn[d] || d)
                .join(' ');
            const prefixText = prefix ? `${prefix}, ` : '';
            const idDestination = idCounter ? `, silakan menuju ${idCounter}` : '';
            const enDestination = enCounter ? `, please proceed to ${enCounter}` : '';
            spokenId = `Nomor antrian ${prefixText}${spokenDigitsId}${idDestination}.`;
            spokenEn = `Queue number ${prefixText}${spokenDigitsEn}${enDestination}.`;
        }
        return {
            spokenId,
            spokenEn,
            idCounter,
            enCounter,
            counterNum,
            pitch: counterPitch
        };
    }
    /**
     * Memainkan nada lonceng rumah sakit (clinical ding-dong chime) sebelum ucapan
     */
    static playHospitalChime() {
        return new Promise(resolve => {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) {
                    resolve();
                    return;
                }
                if (!this.audioCtx) {
                    this.audioCtx = new AudioContextClass();
                }
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume().catch(() => { });
                }
                const now = this.audioCtx.currentTime;
                // Dua nada ding-dong klinis lembut: E5 (659Hz) -> G5 (784Hz)
                const osc1 = this.audioCtx.createOscillator();
                const gain1 = this.audioCtx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(659.25, now);
                gain1.gain.setValueAtTime(0.2, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc1.connect(gain1);
                gain1.connect(this.audioCtx.destination);
                osc1.start(now);
                osc1.stop(now + 0.35);
                const osc2 = this.audioCtx.createOscillator();
                const gain2 = this.audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(783.99, now + 0.22);
                gain2.gain.setValueAtTime(0.25, now + 0.22);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
                osc2.connect(gain2);
                gain2.connect(this.audioCtx.destination);
                osc2.start(now + 0.22);
                osc2.stop(now + 0.55);
                setTimeout(() => resolve(), 450);
            }
            catch {
                resolve();
            }
        });
    }
    /**
     * Mengumumkan nomor tiket dan loket tujuan secara dwibahasa (Bahasa Indonesia dilanjutkan Bahasa Inggris)
     */
    static async announceTicket(ticketOrNumber, counterName) {
        if (this.isMuted)
            return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window))
            return;
        this.initVoices();
        try {
            // 1. Bersihkan antrean speech lama
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
            }
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            // 2. Mainkan nada lonceng pembuka
            try {
                await this.playHospitalChime();
            }
            catch {
                // Tetap lanjutkan pengucapan meskipun chime tertahan
            }
            const announcement = this.formatAnnouncement(ticketOrNumber, counterName);
            const spokenId = announcement.spokenId;
            const spokenEn = announcement.spokenEn;
            const counterPitch = announcement.pitch;
            // Pastikan referensi voice terbaru jika belum di-cache
            const voices = window.speechSynthesis.getVoices();
            if (!this.cachedIdVoice && voices && voices.length > 0) {
                this.cachedIdVoice = voices.find(v => v.lang && (v.lang.toLowerCase().includes('id') || v.lang.toLowerCase().includes('ind'))) || null;
            }
            if (!this.cachedEnVoice && voices && voices.length > 0) {
                this.cachedEnVoice = voices.find(v => v.lang && (v.lang.toLowerCase().startsWith('en') || v.lang.toLowerCase().includes('eng'))) || null;
            }
            // Buat pengucapan Bahasa Indonesia
            const utteranceId = new SpeechSynthesisUtterance(spokenId);
            utteranceId.lang = 'id-ID';
            utteranceId.rate = 0.92;
            utteranceId.pitch = counterPitch;
            if (this.cachedIdVoice) {
                utteranceId.voice = this.cachedIdVoice;
            }
            // Buat pengucapan Bahasa Inggris
            const utteranceEn = new SpeechSynthesisUtterance(spokenEn);
            utteranceEn.lang = 'en-US';
            utteranceEn.rate = 0.92;
            utteranceEn.pitch = counterPitch;
            if (this.cachedEnVoice) {
                utteranceEn.voice = this.cachedEnVoice;
            }
            let enSpoken = false;
            let enTimer = null;
            const speakEn = () => {
                if (enSpoken || this.isMuted)
                    return;
                enSpoken = true;
                if (enTimer !== null) {
                    clearTimeout(enTimer);
                    enTimer = null;
                }
                try {
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                    window.speechSynthesis.speak(utteranceEn);
                }
                catch (e) {
                    console.warn('Speech speak EN error:', e);
                }
            };
            utteranceId.onend = () => {
                setTimeout(speakEn, 250);
            };
            utteranceId.onerror = (e) => {
                console.warn('SpeechSynthesis ID error:', e);
                setTimeout(speakEn, 250);
            };
            utteranceEn.onerror = (e) => {
                console.warn('SpeechSynthesis EN error:', e);
            };
            // Fallback timer jika browser tidak memicu onend
            enTimer = window.setTimeout(speakEn, 6500);
            // Mulai pengumuman Bahasa Indonesia
            setTimeout(() => {
                try {
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                    window.speechSynthesis.speak(utteranceId);
                }
                catch (speakErr) {
                    console.warn('Speech speak ID error:', speakErr);
                    speakEn();
                }
            }, 50);
        }
        catch (err) {
            console.warn('SpeechService announceTicket error:', err);
        }
    }
    static unlockAudio() {
        try {
            this.initVoices();
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass && !this.audioCtx) {
                this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => { });
            }
            if ('speechSynthesis' in window && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }
        catch {
            // Ignore
        }
    }
    static toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        return this.isMuted;
    }
    static getMuteState() {
        return this.isMuted;
    }
}
SpeechService.isMuted = false;
SpeechService.audioCtx = null;
SpeechService.cachedIdVoice = null;
SpeechService.cachedEnVoice = null;
SpeechService.isInitialized = false;
