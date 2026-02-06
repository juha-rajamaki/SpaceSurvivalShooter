// Sound Manager for Space Survival Shooter
class SoundManager {
    constructor() {
        // Check for Web Audio API support
        this.audioContext = null;
        this.enabled = true;
        this.musicEnabled = true;
        this.sfxEnabled = true;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.6;
        this.musicVolume = 0.3;

        // Music variables
        this.musicOscillators = [];
        this.musicGainNode = null;
        this.currentMusicLoop = null;

        // Initialize audio context on first user interaction
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create compressor for consistent music volume
            this.musicCompressor = this.audioContext.createDynamicsCompressor();
            this.musicCompressor.threshold.value = -18;
            this.musicCompressor.knee.value = 12;
            this.musicCompressor.ratio.value = 6;
            this.musicCompressor.attack.value = 0.003;
            this.musicCompressor.release.value = 0.15;
            this.musicCompressor.connect(this.audioContext.destination);

            // Create master gain node for music (routes through compressor)
            this.musicGainNode = this.audioContext.createGain();
            this.musicGainNode.gain.value = this.musicVolume * this.masterVolume;
            this.musicGainNode.connect(this.musicCompressor);

            // Create master gain node for SFX
            this.sfxGainNode = this.audioContext.createGain();
            this.sfxGainNode.gain.value = this.sfxVolume * this.masterVolume;
            this.sfxGainNode.connect(this.audioContext.destination);

            this.initialized = true;
            console.log('Sound system initialized');

            // Load settings from localStorage
            this.loadSettings();

        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            this.enabled = false;
        }
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('soundSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            this.enabled = settings.enabled ?? true;
            this.musicEnabled = settings.musicEnabled ?? true;
            this.sfxEnabled = settings.sfxEnabled ?? true;
            this.masterVolume = settings.masterVolume ?? 0.5;
            this.sfxVolume = settings.sfxVolume ?? 0.6;
            this.musicVolume = settings.musicVolume ?? 0.3;

            if (this.musicGainNode) {
                this.musicGainNode.gain.value = this.musicVolume * this.masterVolume;
            }
            if (this.sfxGainNode) {
                this.sfxGainNode.gain.value = this.sfxVolume * this.masterVolume;
            }
        }
    }

    saveSettings() {
        const settings = {
            enabled: this.enabled,
            musicEnabled: this.musicEnabled,
            sfxEnabled: this.sfxEnabled,
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume
        };
        localStorage.setItem('soundSettings', JSON.stringify(settings));
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopMusic();
        } else if (this.musicEnabled) {
            this.startMusic();
        }
        this.saveSettings();
        return this.enabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else if (this.enabled) {
            this.startMusic();
        }
        this.saveSettings();
        return this.musicEnabled;
    }

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        this.saveSettings();
        return this.sfxEnabled;
    }

    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        if (this.musicGainNode) {
            this.musicGainNode.gain.value = this.musicVolume * this.masterVolume;
        }
        if (this.sfxGainNode) {
            this.sfxGainNode.gain.value = this.sfxVolume * this.masterVolume;
        }
        this.saveSettings();
    }

    // Sound effect generators
    playLaser() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    playEnemyLaser() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.2);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    playExplosion(size = 'medium') {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Create noise for explosion
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() - 0.5) * 2;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';

        const gainNode = this.audioContext.createGain();

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        // Adjust parameters based on explosion size
        let duration = 0.3;
        let frequency = 100;

        if (size === 'small') {
            duration = 0.15;
            frequency = 200;
        } else if (size === 'large') {
            duration = 0.5;
            frequency = 50;
        }

        filter.frequency.setValueAtTime(frequency * 4, now);
        filter.frequency.exponentialRampToValueAtTime(frequency, now + duration);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.start(now);
        noise.stop(now + duration);

        // Add a low frequency thump
        const thump = this.audioContext.createOscillator();
        const thumpGain = this.audioContext.createGain();

        thump.connect(thumpGain);
        thumpGain.connect(this.sfxGainNode);

        thump.type = 'sine';
        thump.frequency.setValueAtTime(60, now);
        thump.frequency.exponentialRampToValueAtTime(20, now + duration * 0.7);

        thumpGain.gain.setValueAtTime(0.15, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.7);

        thump.start(now);
        thump.stop(now + duration * 0.7);
    }

    playHit() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.setValueAtTime(150, now + 0.05);
        oscillator.frequency.setValueAtTime(100, now + 0.1);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }

    playBump() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(120, now);
        oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.1);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }

    playImpact() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Metallic crunch
        const bufferSize = this.audioContext.sampleRate * 0.15;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() - 0.5) * 2;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.15);
        filter.Q.value = 5;

        const gainNode = this.audioContext.createGain();

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.start(now);
        noise.stop(now + 0.15);
    }

    playPowerUp() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        oscillator.frequency.setValueAtTime(800, now + 0.2);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.setValueAtTime(0.3, now + 0.25);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    playShield() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 10;

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    playEngineBoost() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(30, now);
        oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.2);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.setValueAtTime(0.3, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }

    playGameOver() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;

        for (let i = 0; i < 3; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            oscillator.type = 'square';
            const startTime = now + i * 0.2;
            oscillator.frequency.setValueAtTime(400 - i * 100, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, startTime + 0.3);

            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        }
    }

    playWaveComplete() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const notes = [523, 659, 784, 1046]; // C, E, G, C (octave higher)

        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGainNode);

            oscillator.type = 'sine';
            const startTime = now + i * 0.1;
            oscillator.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    }

    // Helper: create a kick drum hit
    _kick(startTime, freq = 150, endFreq = 40, vol = 0.5, dur = 0.15) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.05);
        osc.connect(gain);
        gain.connect(this.musicGainNode);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
        osc.start(startTime);
        osc.stop(startTime + dur);
    }

    // Helper: create a noise hit (snare/clap/hihat)
    _noiseHit(startTime, filterType, filterFreq, filterQ, vol = 0.2, dur = 0.08) {
        const noise = this.audioContext.createBufferSource();
        const buf = this.audioContext.createBuffer(1, Math.floor(dur * 44100) + 1000, 44100);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buf;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        filter.Q.value = filterQ || 1;
        const gain = this.audioContext.createGain();
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGainNode);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
        noise.start(startTime);
        noise.stop(startTime + dur);
    }

    // Helper: create a bass note (extends 0.05s past dur for seamless looping)
    _bassNote(startTime, freq, dur, wave = 'sawtooth', filterFreq = 120, vol = 0.2) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        osc.type = wave;
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = 5;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGainNode);
        const end = dur + 0.05;
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.setValueAtTime(vol, startTime + end - 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + end);
        osc.start(startTime);
        osc.stop(startTime + end);
    }

    // Helper: create a pad chord (extends 0.1s past dur for seamless looping)
    _padChord(startTime, freqs, dur, wave = 'triangle', filterFreq = 500, vol = 0.05) {
        freqs.forEach(freq => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            osc.type = wave;
            osc.frequency.value = freq;
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGainNode);
            const end = dur + 0.1;
            gain.gain.setValueAtTime(vol, startTime);
            gain.gain.setValueAtTime(vol, startTime + end - 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + end);
            osc.start(startTime);
            osc.stop(startTime + end);
        });
    }

    // Precise scheduler: uses audio clock to avoid setTimeout drift
    _startLoop(barLength, scheduleFn) {
        this._nextBarTime = this.audioContext.currentTime;
        const lookahead = 0.1; // Schedule 100ms ahead
        const checkInterval = 50; // Check every 50ms

        const scheduler = () => {
            if (!this.enabled || !this.musicEnabled) {
                this.currentMusicLoop = null;
                return;
            }
            // Schedule bars as long as they fall within our lookahead window
            while (this._nextBarTime < this.audioContext.currentTime + lookahead) {
                scheduleFn(this._nextBarTime, barLength);
                this._nextBarTime += barLength;
            }
            this.currentMusicLoop = setTimeout(scheduler, checkInterval);
        };
        scheduler();
    }

    // Start music for a specific round
    startMusic(round = 1) {
        if (!this.enabled || !this.musicEnabled || !this.audioContext || this.currentMusicLoop) return;

        // Restore volume after fade
        this.musicGainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.musicGainNode.gain.setValueAtTime(this.musicVolume * this.masterVolume, this.audioContext.currentTime);

        this.currentRound = round;
        const configs = {
            1:  { bar: 1.38,  fn: (t, b) => this._schedR1(t, b) },
            2:  { bar: 1.875, fn: (t, b) => this._schedR2(t, b) },
            3:  { bar: 2.182, fn: (t, b) => this._schedR3(t, b) },
            4:  { bar: 1.778, fn: (t, b) => this._schedR4(t, b) },
            5:  { bar: 1.714, fn: (t, b) => this._schedR5(t, b) },
            6:  { bar: 1.92,  fn: (t, b) => this._schedR6(t, b) },
            7:  { bar: 2.034, fn: (t, b) => this._schedR7(t, b) },
            8:  { bar: 1.548, fn: (t, b) => this._schedR8(t, b) },
            9:  { bar: 2.526, fn: (t, b) => this._schedR9(t, b) },
            10: { bar: 2.286, fn: (t, b) => this._schedR10(t, b) },
        };
        const c = configs[round] || configs[10];
        this._startLoop(c.bar, c.fn);
    }

    // Round 1: DnB - 174 BPM, E minor (original with pitch-modulated kicks + Reese bass)
    _schedR1(t, bar) {
        const beat = bar / 4;
        const ctx = this.audioContext;

        // Pitch-modulated kick drums (punchy DnB style)
        [0, 0.345, 0.862, 1.035].forEach(o => {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            const kickPitch = ctx.createOscillator();
            const kickPitchGain = ctx.createGain();

            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(150, t + o);
            kickOsc.frequency.exponentialRampToValueAtTime(40, t + o + 0.08);

            // Pitch modulation for punch
            kickPitch.type = 'sine';
            kickPitch.frequency.setValueAtTime(50, t + o);
            kickPitchGain.gain.setValueAtTime(100, t + o);
            kickPitchGain.gain.exponentialRampToValueAtTime(0.01, t + o + 0.05);

            kickPitch.connect(kickPitchGain);
            kickPitchGain.connect(kickOsc.frequency);
            kickOsc.connect(kickGain);
            kickGain.connect(this.musicGainNode);

            kickGain.gain.setValueAtTime(0.5, t + o);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + o + 0.15);

            kickOsc.start(t + o);
            kickOsc.stop(t + o + 0.15);
            kickPitch.start(t + o);
            kickPitch.stop(t + o + 0.15);
        });

        // Snare hits
        [0.345, 1.035].forEach(o => this._noiseHit(t + o, 'highpass', 200, 1, 0.25, 0.1));

        // Hi-hat pattern (16th notes)
        for (let i = 0; i < 16; i++) {
            this._noiseHit(t + i * bar / 16, 'highpass', 8000, 1, (i % 4 === 0) ? 0.1 : 0.06, 0.02);
        }

        // Reese bass with detuned oscillators and filter wobble
        const bassFreqs = [41.2, 41.2, 46.2, 36.7];
        bassFreqs.forEach((freq, i) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc1.frequency.value = freq;
            osc2.frequency.value = freq * 1.005; // Slight detune for Reese effect

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, t + i * beat);
            filter.frequency.setValueAtTime(200, t + i * beat + beat * 0.4);
            filter.frequency.exponentialRampToValueAtTime(80, t + i * beat + beat * 0.9);
            filter.Q.value = 5;

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGainNode);

            const end = beat + 0.05;
            gain.gain.setValueAtTime(0.15, t + i * beat);
            gain.gain.setValueAtTime(0.15, t + i * beat + end - 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * beat + end);

            osc1.start(t + i * beat);
            osc1.stop(t + i * beat + end);
            osc2.start(t + i * beat);
            osc2.stop(t + i * beat + end);
        });

        // E minor pad
        this._padChord(t, [164.8, 196, 246.9], bar, 'triangle', 400, 0.04);
    }

    // Round 2: Space Techno - 128 BPM, C minor
    _schedR2(t, bar) {
        const beat = bar / 4;
        for (let i = 0; i < 4; i++) this._kick(t + i * beat, 140, 35, 0.5, 0.18);
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'bandpass', 1500, 3, 0.2, 0.08));
        for (let i = 0; i < 4; i++) this._noiseHit(t + i * beat + beat / 2, 'highpass', 9000, 1, 0.08, 0.03);
        [65.4, 65.4, 77.8, 49].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'sawtooth', 130, 0.2));
        this._padChord(t, [261.6, 311.1, 392], bar, 'triangle', 500, 0.04);
        this._noiseHit(t, 'bandpass', 800, 8, 0.08, 0.12);
    }

    // Round 3: Synthwave - 110 BPM, A minor
    _schedR3(t, bar) {
        const beat = bar / 4;
        [0, 2].forEach(i => this._kick(t + i * beat, 130, 40, 0.5, 0.2));
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'bandpass', 900, 2, 0.22, 0.12));
        for (let i = 0; i < 8; i++) this._noiseHit(t + i * beat / 2, 'highpass', 7000, 1, 0.07, 0.025);
        [55, 55, 65.4, 82.4].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'square', 100, 0.18));
        this._padChord(t, [220, 261.6, 329.6, 392], bar, 'triangle', 700, 0.05);
        [220, 329.6, 440, 329.6].forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'square'; osc.frequency.value = f;
            const flt = this.audioContext.createBiquadFilter();
            flt.type = 'lowpass'; flt.frequency.value = 1200;
            osc.connect(flt); flt.connect(gain); gain.connect(this.musicGainNode);
            gain.gain.setValueAtTime(0.06, t + i * beat);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * beat + 0.12);
            osc.start(t + i * beat); osc.stop(t + i * beat + 0.12);
        });
    }

    // Round 4: Dark Electro - 135 BPM, D minor
    _schedR4(t, bar) {
        const beat = bar / 4;
        for (let i = 0; i < 4; i++) this._kick(t + i * beat, 160, 35, 0.55, 0.16);
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'highpass', 300, 2, 0.25, 0.1));
        for (let i = 0; i < 16; i++) this._noiseHit(t + i * bar / 16, 'highpass', 10000, 1, (i % 4 === 0) ? 0.09 : 0.05, 0.02);
        [73.4, 73.4, 87.3, 55].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'sawtooth', 140, 0.22));
        this._padChord(t, [146.8, 174.6, 220], bar, 'sawtooth', 300, 0.03);
        [293.7, 349.2].forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const flt = this.audioContext.createBiquadFilter();
            osc.type = 'sawtooth'; osc.frequency.value = f;
            flt.type = 'lowpass'; flt.frequency.setValueAtTime(2000, t + i * 2 * beat);
            flt.frequency.exponentialRampToValueAtTime(300, t + i * 2 * beat + 0.2); flt.Q.value = 10;
            osc.connect(flt); flt.connect(gain); gain.connect(this.musicGainNode);
            gain.gain.setValueAtTime(0.07, t + i * 2 * beat);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 2 * beat + 0.2);
            osc.start(t + i * 2 * beat); osc.stop(t + i * 2 * beat + 0.2);
        });
    }

    // Round 5: Cyber Trance - 140 BPM, F minor
    _schedR5(t, bar) {
        const beat = bar / 4;
        for (let i = 0; i < 4; i++) this._kick(t + i * beat, 150, 38, 0.5, 0.17);
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'bandpass', 1200, 2, 0.2, 0.08));
        for (let i = 0; i < 16; i++) this._noiseHit(t + i * bar / 16, 'highpass', 8500, 1, 0.07, 0.02);
        [43.65, 43.65, 51.9, 65.4].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'sawtooth', 110, 0.2));
        this._padChord(t, [174.6, 207.7, 261.6], bar, 'triangle', 600, 0.05);
        const arp = [349.2, 415.3, 523.3, 698.5, 523.3, 415.3, 349.2, 261.6,
                     349.2, 415.3, 523.3, 698.5, 523.3, 415.3, 349.2, 261.6];
        arp.forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sawtooth'; osc.frequency.value = f;
            const flt = this.audioContext.createBiquadFilter();
            flt.type = 'lowpass'; flt.frequency.value = 1500;
            osc.connect(flt); flt.connect(gain); gain.connect(this.musicGainNode);
            const st = t + i * bar / 16;
            gain.gain.setValueAtTime(0.05, st);
            gain.gain.exponentialRampToValueAtTime(0.01, st + bar / 16 - 0.01);
            osc.start(st); osc.stop(st + bar / 16);
        });
    }

    // Round 6: Industrial - 125 BPM, B minor
    _schedR6(t, bar) {
        const beat = bar / 4;
        [0, 2, 2.5, 3].forEach(i => this._kick(t + i * beat, 120, 30, 0.55, 0.2));
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'bandpass', 400, 1, 0.3, 0.15));
        for (let i = 0; i < 8; i++) this._noiseHit(t + i * beat / 2, 'highpass', 6000, 5, 0.08, 0.03);
        [61.7, 61.7, 73.4, 92.5].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'sawtooth', 90, 0.22));
        this._padChord(t, [123.5, 146.8, 185], bar, 'sawtooth', 250, 0.03);
        [0, 2].forEach(i => this._noiseHit(t + i * beat + beat * 0.75, 'bandpass', 2000, 8, 0.06, 0.1));
    }

    // Round 7: Darkwave - 118 BPM, G minor
    _schedR7(t, bar) {
        const beat = bar / 4;
        [0, 2].forEach(i => this._kick(t + i * beat, 130, 35, 0.45, 0.2));
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'bandpass', 1800, 10, 0.15, 0.05));
        [0, 2, 4, 6].forEach(i => this._noiseHit(t + i * beat / 2, 'highpass', 7500, 1, 0.06, 0.025));
        [49, 49, 58.3, 73.4].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'square', 80, 0.18));
        this._padChord(t, [196, 233.1, 293.7, 349.2], bar, 'triangle', 500, 0.05);
        [587.3, 523.3, 466.2, 392].forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sine'; osc.frequency.value = f;
            osc.connect(gain); gain.connect(this.musicGainNode);
            gain.gain.setValueAtTime(0.06, t + i * beat);
            gain.gain.setValueAtTime(0.06, t + i * beat + beat * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * beat + beat);
            osc.start(t + i * beat); osc.stop(t + i * beat + beat);
        });
    }

    // Round 8: Breakbeat - 155 BPM, C# minor
    _schedR8(t, bar) {
        const beat = bar / 4;
        [0, 0.5, 2, 2.75].forEach(i => this._kick(t + i * beat, 160, 40, 0.5, 0.14));
        [1, 2.5, 3, 3.5].forEach(i => this._noiseHit(t + i * beat, 'highpass', 250, 1, 0.25, 0.1));
        for (let i = 0; i < 16; i++) this._noiseHit(t + i * bar / 16, 'highpass', 9000, 1, 0.06, 0.018);
        [69.3, 69.3, 82.4, 51.9].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'sawtooth', 130, 0.2));
        this._padChord(t, [138.6, 164.8, 207.7], bar, 'sawtooth', 350, 0.03);
        [277.2, 329.6, 277.2, 415.3].forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'square'; osc.frequency.value = f;
            const flt = this.audioContext.createBiquadFilter();
            flt.type = 'lowpass'; flt.frequency.value = 1800;
            osc.connect(flt); flt.connect(gain); gain.connect(this.musicGainNode);
            gain.gain.setValueAtTime(0.06, t + i * beat);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * beat + 0.08);
            osc.start(t + i * beat); osc.stop(t + i * beat + 0.08);
        });
    }

    // Round 9: Doom - 95 BPM, C tritone
    _schedR9(t, bar) {
        const beat = bar / 4;
        [0, 1.5, 2, 3].forEach(i => this._kick(t + i * beat, 100, 25, 0.55, 0.25));
        this._noiseHit(t + beat, 'bandpass', 300, 1, 0.3, 0.2);
        [0, 2].forEach(i => this._noiseHit(t + i * beat + beat * 0.5, 'bandpass', 3000, 12, 0.06, 0.08));
        this._bassNote(t, 32.7, bar, 'sawtooth', 70, 0.2);
        this._padChord(t, [130.8, 185], bar, 'sawtooth', 250, 0.04);
        this._bassNote(t, 27.5, bar, 'square', 50, 0.1);
    }

    // Round 10: Final Boss - 105 BPM, E minor
    _schedR10(t, bar) {
        const beat = bar / 4;
        [0, 0.5, 1, 2, 2.5, 3].forEach(i => this._kick(t + i * beat, 110, 28, 0.55, 0.2));
        [1, 3].forEach(i => this._noiseHit(t + i * beat, 'bandpass', 500, 1, 0.3, 0.15));
        for (let i = 0; i < 16; i++) this._noiseHit(t + i * bar / 16, 'highpass', 7000, 2, 0.07, 0.02);
        [41.2, 41.2, 49, 30.9].forEach((f, i) => this._bassNote(t + i * beat, f, beat, 'sawtooth', 100, 0.22));
        this._padChord(t, [164.8, 233.1, 246.9], bar, 'sawtooth', 300, 0.04);
        [329.6, 293.7, 246.9, 220].forEach((f, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sawtooth'; osc.frequency.value = f;
            const flt = this.audioContext.createBiquadFilter();
            flt.type = 'lowpass'; flt.frequency.value = 800; flt.Q.value = 3;
            osc.connect(flt); flt.connect(gain); gain.connect(this.musicGainNode);
            gain.gain.setValueAtTime(0.06, t + i * beat);
            gain.gain.setValueAtTime(0.06, t + i * beat + beat * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * beat + beat);
            osc.start(t + i * beat); osc.stop(t + i * beat + beat);
        });
        this._bassNote(t, 27.5, bar, 'sine', 40, 0.12);
    }

    fadeOutMusic(duration = 2) {
        if (!this.musicGainNode || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, now);
        this.musicGainNode.gain.linearRampToValueAtTime(0, now + duration);
        // Stop the loop after fade completes
        setTimeout(() => this.stopMusic(), duration * 1000);
    }

    stopMusic() {
        if (this.currentMusicLoop) {
            clearTimeout(this.currentMusicLoop);
            this.currentMusicLoop = null;
        }
    }
}

// Create global sound manager instance
window.soundManager = new SoundManager();