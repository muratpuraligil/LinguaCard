import { Word, LanguageDirection } from '../types';

export type AudioPhase = 'front' | 'thinking' | 'back' | 'transition';

export interface AudioStudyCallbacks {
    onWordChange?: (index: number, word: Word, phase: AudioPhase) => void;
    onStateChange?: (isPlaying: boolean, phase: AudioPhase, remainingDelay?: number) => void;
    onComplete?: () => void;
}

export interface AudioStudyOptions {
    words: Word[];
    startIndex?: number;
    direction?: LanguageDirection;
    delaySeconds?: number;
    callbacks?: AudioStudyCallbacks;
}

// Generate a real 3-second PCM WAV silence buffer to keep audio engine & hardware clock running on iOS/Android background
function generateSilentWavUrl(durationSec = 3): string {
    if (typeof window === 'undefined') return '';
    try {
        const sampleRate = 8000;
        const numChannels = 1;
        const bytesPerSample = 1;
        const numSamples = sampleRate * durationSec;
        const dataSize = numSamples * numChannels * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + dataSize, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
        view.setUint16(32, numChannels * bytesPerSample, true);
        view.setUint16(34, 8, true); // 8-bit
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true);

        const uint8 = new Uint8Array(buffer, 44, dataSize);
        uint8.fill(128); // 8-bit PCM silence is 128

        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    } catch {
        return '';
    }
}

export class AudioStudyService {
    private words: Word[] = [];
    private currentIndex: number = 0;
    private direction: LanguageDirection = LanguageDirection.TR_EN;
    private delaySeconds: number = 4;
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private currentPhase: AudioPhase = 'front';

    private carrierAudio: HTMLAudioElement | null = null;
    private carrierBlobUrl: string | null = null;
    private speechAudio: HTMLAudioElement | null = null;
    private delayTimer: ReturnType<typeof setTimeout> | null = null;
    private countdownInterval: ReturnType<typeof setInterval> | null = null;
    private phaseEndTime: number = 0;
    private onPhaseEndCallback: (() => void) | null = null;
    private callbacks: AudioStudyCallbacks = {};
    private abortController: AbortController | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initAudioElements();
        }
    }

    private initAudioElements() {
        try {
            if (!this.carrierAudio && typeof window !== 'undefined') {
                this.carrierBlobUrl = generateSilentWavUrl(3);
                if (this.carrierBlobUrl) {
                    this.carrierAudio = new Audio(this.carrierBlobUrl);
                    this.carrierAudio.loop = true;
                    this.carrierAudio.playsInline = true;
                    this.carrierAudio.volume = 0.05;
                    this.carrierAudio.ontimeupdate = () => {
                        this.handleCarrierClockTick();
                    };
                }
            }
            if (!this.speechAudio && typeof window !== 'undefined') {
                this.speechAudio = new Audio();
                this.speechAudio.preload = 'auto';
                this.speechAudio.playsInline = true;
                this.speechAudio.referrerPolicy = 'no-referrer';
            }
        } catch (e) {
            console.warn('[AudioStudyService] Audio element initialization notice:', e);
        }
    }

    private setPhaseTimer(durationMs: number, onEnd: () => void) {
        this.clearTimers();
        this.phaseEndTime = Date.now() + durationMs;
        this.onPhaseEndCallback = onEnd;

        // Backup setTimeout for desktop and active tabs
        this.delayTimer = setTimeout(() => {
            if (this.onPhaseEndCallback === onEnd) {
                this.phaseEndTime = 0;
                this.onPhaseEndCallback = null;
                onEnd();
            }
        }, durationMs);
    }

    private handleCarrierClockTick() {
        if (!this.isRunning || this.isPaused) return;

        if (this.phaseEndTime > 0 && Date.now() >= this.phaseEndTime) {
            const cb = this.onPhaseEndCallback;
            this.phaseEndTime = 0;
            this.onPhaseEndCallback = null;
            this.clearTimers();
            cb?.();
        }
    }

    public startListeningSession(options: AudioStudyOptions) {
        this.stop(); // Stop any existing session safely

        this.words = options.words || [];
        this.currentIndex = options.startIndex !== undefined ? options.startIndex : 0;
        this.direction = options.direction || LanguageDirection.TR_EN;
        this.delaySeconds = options.delaySeconds !== undefined ? options.delaySeconds : 4;
        this.callbacks = options.callbacks || {};
        this.isRunning = true;
        this.isPaused = false;
        this.abortController = new AbortController();

        this.initAudioElements();

        // Start carrier audio to unlock background audio session on mobile
        if (this.carrierAudio) {
            this.carrierAudio.play().catch(() => {
                // Ignore autoplay policies; will resume on first explicit click
            });
        }

        this.setupMediaSessionHandlers();
        this.playCurrentStep();
    }

    public setDelaySeconds(seconds: number) {
        this.delaySeconds = Math.max(2, Math.min(10, seconds));
    }

    public pause() {
        if (!this.isRunning || this.isPaused) return;
        this.isPaused = true;
        this.clearTimers();
        if (this.speechAudio) {
            this.speechAudio.pause();
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.pause();
        }
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
        this.callbacks.onStateChange?.(false, this.currentPhase);
    }

    public resume() {
        if (!this.isRunning || !this.isPaused) return;
        this.isPaused = false;
        if (this.carrierAudio) {
            this.carrierAudio.play().catch(() => {});
        }
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
        this.callbacks.onStateChange?.(true, this.currentPhase);

        // Resume based on current phase
        if (this.currentPhase === 'thinking') {
            this.startThinkingDelay();
        } else if (this.currentPhase === 'transition') {
            this.delayTimer = setTimeout(() => {
                if (!this.isRunning || this.isPaused) return;
                this.advanceToNext();
            }, 500);
        } else {
            this.playCurrentStep();
        }
    }

    public next() {
        if (!this.isRunning || this.words.length === 0) return;
        this.clearTimers();
        if (this.currentPhase === 'back') {
            // Flip back to front face first before advancing to avoid translation flash
            this.currentPhase = 'transition';
            const currentWord = this.words[this.currentIndex];
            if (currentWord) {
                this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'transition');
                this.callbacks.onStateChange?.(true, 'transition');
            }
            this.delayTimer = setTimeout(() => {
                if (!this.isRunning || this.isPaused) return;
                this.advanceToNext();
            }, 450);
            return;
        }
        this.advanceToNext();
    }

    private advanceToNext() {
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex += 1;
            this.currentPhase = 'front';
            this.playCurrentStep();
        } else {
            this.handleCompletion();
        }
    }

    public prev() {
        if (!this.isRunning || this.words.length === 0) return;
        this.clearTimers();
        if (this.currentPhase === 'back') {
            // Flip back to front face first before jumping to previous word
            this.currentPhase = 'transition';
            const currentWord = this.words[this.currentIndex];
            if (currentWord) {
                this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'transition');
                this.callbacks.onStateChange?.(true, 'transition');
            }
            this.delayTimer = setTimeout(() => {
                if (!this.isRunning || this.isPaused) return;
                this.advanceToPrev();
            }, 450);
            return;
        }
        this.advanceToPrev();
    }

    private advanceToPrev() {
        if (this.currentIndex > 0) {
            this.currentIndex -= 1;
            this.currentPhase = 'front';
            this.playCurrentStep();
        } else {
            this.playCurrentStep();
        }
    }

    public stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentPhase = 'front';
        this.clearTimers();

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        if (this.carrierAudio) {
            this.carrierAudio.pause();
            this.carrierAudio.currentTime = 0;
        }

        if (this.speechAudio) {
            this.speechAudio.pause();
            this.speechAudio.removeAttribute('src');
            this.speechAudio.load();
        }

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        this.clearMediaSession();
        this.callbacks.onStateChange?.(false, 'front');
    }

    public cleanup() {
        this.stop();
        this.callbacks = {};
        if (this.carrierBlobUrl && typeof window !== 'undefined') {
            URL.revokeObjectURL(this.carrierBlobUrl);
            this.carrierBlobUrl = null;
        }
        this.carrierAudio = null;
        this.speechAudio = null;
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    public isSessionRunning(): boolean {
        return this.isRunning;
    }

    public isSessionPaused(): boolean {
        return this.isPaused;
    }

    private clearTimers() {
        if (this.delayTimer) {
            clearTimeout(this.delayTimer);
            this.delayTimer = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        this.phaseEndTime = 0;
        this.onPhaseEndCallback = null;
    }

    private playCurrentStep() {
        if (!this.isRunning || this.isPaused) return;
        if (this.currentIndex >= this.words.length) {
            this.handleCompletion();
            return;
        }

        const currentWord = this.words[this.currentIndex];
        if (!currentWord) return;

        const isFrontTR = this.direction === LanguageDirection.TR_EN;
        const frontText = isFrontTR ? currentWord.turkish : currentWord.english;
        const frontLang = isFrontTR ? 'tr' : 'en';

        this.currentPhase = 'front';
        this.updateMediaSession(currentWord, 'front');
        this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'front');
        this.callbacks.onStateChange?.(true, 'front');

        this.speakText(frontText, frontLang, () => {
            if (!this.isRunning || this.isPaused) return;
            this.startThinkingDelay();
        });
    }

    private startThinkingDelay() {
        this.currentPhase = 'thinking';
        const currentWord = this.words[this.currentIndex];
        this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'thinking');

        let remaining = this.delaySeconds;
        this.callbacks.onStateChange?.(true, 'thinking', remaining);

        this.clearTimers();

        this.countdownInterval = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
                this.callbacks.onStateChange?.(true, 'thinking', remaining);
            }
        }, 1000);

        this.setPhaseTimer(this.delaySeconds * 1000, () => {
            if (!this.isRunning || this.isPaused) return;
            this.playBackTranslation();
        });
    }

    private playBackTranslation() {
        if (!this.isRunning || this.isPaused) return;
        const currentWord = this.words[this.currentIndex];
        if (!currentWord) return;

        const isFrontTR = this.direction === LanguageDirection.TR_EN;
        const backText = isFrontTR ? currentWord.english : currentWord.turkish;
        const backLang = isFrontTR ? 'en' : 'tr';

        this.currentPhase = 'back';
        this.updateMediaSession(currentWord, 'back');
        this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'back');
        this.callbacks.onStateChange?.(true, 'back');

        this.speakText(backText, backLang, () => {
            if (!this.isRunning || this.isPaused) return;

            // Step 1: Kullanıcının sarı kartı rahatça görmesi ve okuyabilmesi için çeviri sonrası 2.2 saniye açık tut
            this.setPhaseTimer(2200, () => {
                if (!this.isRunning || this.isPaused) return;

                // Step 2: handleNext mantığı - Önce kartı ön yüze çevir (isFlipped = false)
                this.currentPhase = 'transition';
                this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'transition');
                this.callbacks.onStateChange?.(true, 'transition');

                // Step 3: Kart ön yüze dönerken tam 350ms bekle, ardından yeni kelimeye geç (böylece sonraki çeviri asla yansımaz)
                this.setPhaseTimer(350, () => {
                    if (!this.isRunning || this.isPaused) return;
                    this.advanceToNext();
                });
            });
        });
    }

    private speakText(text: string, lang: 'tr' | 'en', onEnded: () => void) {
        if (!text || !text.trim()) {
            onEnded();
            return;
        }

        const encoded = encodeURIComponent(text.trim());
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;

        if (!this.speechAudio) {
            this.speechAudio = new Audio();
            this.speechAudio.preload = 'auto';
            this.speechAudio.playsInline = true;
            this.speechAudio.referrerPolicy = 'no-referrer';
        } else {
            this.speechAudio.referrerPolicy = 'no-referrer';
            this.speechAudio.playsInline = true;
        }

        let hasEnded = false;
        const safeEnd = () => {
            if (hasEnded) return;
            hasEnded = true;
            if (this.speechAudio) {
                this.speechAudio.onended = null;
                this.speechAudio.onerror = null;
            }
            onEnded();
        };

        this.speechAudio.onended = safeEnd;
        this.speechAudio.onerror = () => {
            // Graceful fallback to Web Speech API
            this.speakWebSpeechFallback(text, lang === 'tr' ? 'tr-TR' : 'en-US', safeEnd);
        };

        this.speechAudio.src = ttsUrl;
        const playPromise = this.speechAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // Fallback to Web Speech if audio element playback is blocked
                this.speakWebSpeechFallback(text, lang === 'tr' ? 'tr-TR' : 'en-US', safeEnd);
            });
        }
    }

    private speakWebSpeechFallback(text: string, langCode: string, onEnded: () => void) {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            onEnded();
            return;
        }

        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = langCode;
            utterance.rate = 0.95;

            let hasCalled = false;
            const finish = () => {
                if (!hasCalled) {
                    hasCalled = true;
                    onEnded();
                }
            };

            utterance.onend = finish;
            utterance.onerror = finish;
            window.speechSynthesis.speak(utterance);
        } catch {
            onEnded();
        }
    }

    private handleCompletion() {
        this.stop();
        this.callbacks.onComplete?.();
    }

    private setupMediaSessionHandlers() {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.playbackState = 'playing';
            navigator.mediaSession.setActionHandler('play', () => this.resume());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('stop', () => this.stop());
        } catch (e) {
            console.warn('[AudioStudyService] MediaSession setup notice:', e);
        }
    }

    private generateCardArtwork(word: Word, phase: AudioPhase): string | null {
        if (typeof document === 'undefined') return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            const isFrontTR = this.direction === LanguageDirection.TR_EN;
            const primaryText = isFrontTR ? word.turkish : word.english;
            const secondaryText = isFrontTR ? word.english : word.turkish;
            const showBack = phase === 'back';

            // Background canvas
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, 512, 512);

            // Card container: Golden yellow when translation is shown, zinc dark when thinking
            ctx.fillStyle = showBack ? '#eab308' : '#18181b';
            ctx.strokeStyle = showBack ? '#fde047' : '#27272a';
            ctx.lineWidth = 6;
            
            const r = 32;
            const x = 24, y = 24, w = 464, h = 464;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Top Header: LinguaCard & Progress
            ctx.fillStyle = showBack ? '#000000' : '#a1a1aa';
            ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`LinguaCard • ${this.currentIndex + 1}/${this.words.length}`, 48, 72);

            // Status Badge
            ctx.textAlign = 'right';
            ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
            if (showBack) {
                ctx.fillText('✨ ÇEVİRİ', 464, 72);
            } else {
                ctx.fillText('🤔 DÜŞÜNÜN...', 464, 72);
            }

            // Category if available
            if (word.category) {
                ctx.fillStyle = showBack ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
                ctx.fillRect(48, 96, Math.min(416, ctx.measureText(word.category).width + 24), 32);
                ctx.fillStyle = showBack ? '#000000' : '#60a5fa';
                ctx.font = '600 16px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(word.category, 60, 118);
            }

            // Primary Word (Big text)
            ctx.fillStyle = showBack ? '#000000' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = '900 46px system-ui, -apple-system, sans-serif';
            ctx.fillText(primaryText, 256, 230);

            // Divider
            ctx.strokeStyle = showBack ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(80, 270);
            ctx.lineTo(432, 270);
            ctx.stroke();

            // Translation / Secondary Text
            if (showBack) {
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
                ctx.fillText(secondaryText, 256, 330);

                if (word.example_sentence) {
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = 'italic 18px system-ui, -apple-system, sans-serif';
                    ctx.fillText(`"${word.example_sentence.slice(0, 40)}..."`, 256, 385);
                }
            } else {
                ctx.fillStyle = '#71717a';
                ctx.font = 'italic 24px system-ui, -apple-system, sans-serif';
                ctx.fillText('Çeviriyi tahmin edin...', 256, 330);
            }

            // Bottom Brand
            ctx.fillStyle = showBack ? 'rgba(0,0,0,0.4)' : '#52525b';
            ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
            ctx.fillText('LinguaCard Akıllı Sesli Pratik', 256, 445);

            return canvas.toDataURL('image/png');
        } catch {
            return null;
        }
    }

    private updateMediaSession(word: Word, phase: AudioPhase = 'front') {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
        try {
            const isFrontTR = this.direction === LanguageDirection.TR_EN;
            const primary = isFrontTR ? word.turkish : word.english;
            const secondary = isFrontTR ? word.english : word.turkish;

            const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
            const basePath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
            const icon512 = `${baseOrigin}${basePath}/icon-512.png`;
            const icon192 = `${baseOrigin}${basePath}/icon-192.png`;

            const artworkList: MediaImage[] = [
                { src: icon512, sizes: '512x512', type: 'image/png' },
                { src: icon192, sizes: '192x192', type: 'image/png' }
            ];

            const artworkDataUrl = this.generateCardArtwork(word, phase);
            if (artworkDataUrl) {
                artworkList.push({ src: artworkDataUrl, sizes: '512x512', type: 'image/png' });
            }

            navigator.mediaSession.metadata = new MediaMetadata({
                title: `[${this.currentIndex + 1}/${this.words.length}] ${primary}`,
                artist: phase === 'back' ? `✨ Çeviri: ${secondary}` : `🤔 Çeviriyi düşünün... (${secondary.slice(0, 1)}...)`,
                album: 'LinguaCard Dinleme Modu',
                artwork: artworkList
            });
            navigator.mediaSession.playbackState = this.isPaused ? 'paused' : 'playing';
        } catch (e) {
            // Silently ignore older browsers
        }
    }

    private clearMediaSession() {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
        try {
            navigator.mediaSession.playbackState = 'none';
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
            navigator.mediaSession.setActionHandler('stop', null);
        } catch { }
    }
}

export const audioStudyService = new AudioStudyService();
