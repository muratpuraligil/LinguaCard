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

// Minimal silent wav base64 to keep media session & audio engine active in background/lockscreen
const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

export class AudioStudyService {
    private words: Word[] = [];
    private currentIndex: number = 0;
    private direction: LanguageDirection = LanguageDirection.TR_EN;
    private delaySeconds: number = 4;
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private currentPhase: AudioPhase = 'front';

    private carrierAudio: HTMLAudioElement | null = null;
    private speechAudio: HTMLAudioElement | null = null;
    private delayTimer: ReturnType<typeof setTimeout> | null = null;
    private countdownInterval: ReturnType<typeof setInterval> | null = null;
    private callbacks: AudioStudyCallbacks = {};
    private abortController: AbortController | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initAudioElements();
        }
    }

    private initAudioElements() {
        try {
            if (!this.carrierAudio) {
                this.carrierAudio = new Audio(SILENT_AUDIO_URI);
                this.carrierAudio.loop = true;
                this.carrierAudio.volume = 0.01;
            }
            if (!this.speechAudio) {
                this.speechAudio = new Audio();
                this.speechAudio.preload = 'auto';
            }
        } catch (e) {
            console.warn('[AudioStudyService] Audio element initialization notice:', e);
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
        } else {
            this.playCurrentStep();
        }
    }

    public next() {
        if (!this.isRunning || this.words.length === 0) return;
        this.clearTimers();
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
    }

    private playCurrentStep() {
        if (!this.isRunning || this.isPaused) return;
        if (this.currentIndex >= this.words.length) {
            this.handleCompletion();
            return;
        }

        const currentWord = this.words[this.currentIndex];
        if (!currentWord) return;

        this.updateMediaSession(currentWord);

        const isFrontTR = this.direction === LanguageDirection.TR_EN;
        const frontText = isFrontTR ? currentWord.turkish : currentWord.english;
        const frontLang = isFrontTR ? 'tr' : 'en';

        this.currentPhase = 'front';
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

        this.delayTimer = setTimeout(() => {
            this.clearTimers();
            if (!this.isRunning || this.isPaused) return;
            this.playBackTranslation();
        }, this.delaySeconds * 1000);
    }

    private playBackTranslation() {
        if (!this.isRunning || this.isPaused) return;
        const currentWord = this.words[this.currentIndex];
        if (!currentWord) return;

        const isFrontTR = this.direction === LanguageDirection.TR_EN;
        const backText = isFrontTR ? currentWord.english : currentWord.turkish;
        const backLang = isFrontTR ? 'en' : 'tr';

        this.currentPhase = 'back';
        this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'back');
        this.callbacks.onStateChange?.(true, 'back');

        this.speakText(backText, backLang, () => {
            if (!this.isRunning || this.isPaused) return;

            // Wait 1.5s after translation before moving to next word
            this.currentPhase = 'transition';
            this.callbacks.onWordChange?.(this.currentIndex, currentWord, 'transition');
            this.callbacks.onStateChange?.(true, 'transition');

            this.delayTimer = setTimeout(() => {
                if (!this.isRunning || this.isPaused) return;
                this.next();
            }, 1500);
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

    private updateMediaSession(word: Word) {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
        try {
            const isFrontTR = this.direction === LanguageDirection.TR_EN;
            const primary = isFrontTR ? word.turkish : word.english;
            const secondary = isFrontTR ? word.english : word.turkish;

            navigator.mediaSession.metadata = new MediaMetadata({
                title: `${this.currentIndex + 1}/${this.words.length}: ${primary}`,
                artist: `Çeviri: ${secondary}`,
                album: 'LinguaCard Dinleme Modu'
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
