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

            // Create master gain node for music
            this.musicGainNode = this.audioContext.createGain();
            this.musicGainNode.gain.value = this.musicVolume * this.masterVolume;
            this.musicGainNode.connect(this.audioContext.destination);

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
        this.saveSettings();
    }

    // Sound effect generators
    playLaser() {
        if (!this.enabled || !this.sfxEnabled || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, now);
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
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.2);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.25, now);
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
        gainNode.connect(this.audioContext.destination);

        // Adjust parameters based on explosion size
        let duration = 0.3;
        let frequency = 100;
        let volume = 0.5;

        if (size === 'small') {
            duration = 0.15;
            frequency = 200;
            volume = 0.3;
        } else if (size === 'large') {
            duration = 0.5;
            frequency = 50;
            volume = 0.7;
        }

        filter.frequency.setValueAtTime(frequency * 4, now);
        filter.frequency.exponentialRampToValueAtTime(frequency, now + duration);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.start(now);
        noise.stop(now + duration);

        // Add a low frequency thump
        const thump = this.audioContext.createOscillator();
        const thumpGain = this.audioContext.createGain();

        thump.connect(thumpGain);
        thumpGain.connect(this.audioContext.destination);

        thump.type = 'sine';
        thump.frequency.setValueAtTime(60, now);
        thump.frequency.exponentialRampToValueAtTime(20, now + duration * 0.7);

        thumpGain.gain.setValueAtTime(this.sfxVolume * this.masterVolume * volume * 0.5, now);
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
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.setValueAtTime(150, now + 0.05);
        oscillator.frequency.setValueAtTime(100, now + 0.1);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.4, now);
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
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(120, now);
        oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.1);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.25, now);
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
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.4, now);
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
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        oscillator.frequency.setValueAtTime(800, now + 0.2);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, now);
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, now + 0.25);
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
        gainNode.connect(this.audioContext.destination);

        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 10;

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.2, now);
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
        gainNode.connect(this.audioContext.destination);

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(30, now);
        oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.2);

        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, now);
        gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, now + 0.15);
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
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'square';
            const startTime = now + i * 0.2;
            oscillator.frequency.setValueAtTime(400 - i * 100, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, startTime + 0.3);

            gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, startTime);
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
            gainNode.connect(this.audioContext.destination);

            oscillator.type = 'sine';
            const startTime = now + i * 0.1;
            oscillator.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    }

    // Background music generator - DRUM AND BASS STYLE
    startMusic() {
        if (!this.enabled || !this.musicEnabled || !this.audioContext || this.currentMusicLoop) return;

        // Drum and Bass music at 174 BPM
        const playMusicLoop = () => {
            if (!this.enabled || !this.musicEnabled) {
                this.currentMusicLoop = null;
                return;
            }

            const now = this.audioContext.currentTime;
            const barLength = 1.38; // ~174 BPM (60/174 * 4 beats)

            // KICK DRUM - "Amen break" style pattern
            const kickTimes = [0, 0.345, 0.862, 1.035]; // Syncopated pattern
            kickTimes.forEach(time => {
                const kickOsc = this.audioContext.createOscillator();
                const kickGain = this.audioContext.createGain();
                const kickPitch = this.audioContext.createOscillator();
                const kickPitchGain = this.audioContext.createGain();

                kickOsc.type = 'sine';
                kickOsc.frequency.value = 60;

                kickPitch.type = 'sine';
                kickPitch.frequency.value = 60;

                const startTime = now + time;

                // Pitch envelope
                kickPitch.frequency.setValueAtTime(150, startTime);
                kickPitch.frequency.exponentialRampToValueAtTime(60, startTime + 0.02);

                kickPitchGain.gain.setValueAtTime(50, startTime);
                kickPitchGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.02);

                kickPitch.connect(kickPitchGain);
                kickPitchGain.connect(kickOsc.frequency);

                kickOsc.connect(kickGain);
                kickGain.connect(this.musicGainNode);

                kickGain.gain.setValueAtTime(0.6, startTime);
                kickGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

                kickOsc.start(startTime);
                kickOsc.stop(startTime + 0.15);
                kickPitch.start(startTime);
                kickPitch.stop(startTime + 0.02);
            });

            // SNARE - On 2 and 4
            [0.345, 1.035].forEach(time => {
                const noise = this.audioContext.createBufferSource();
                const noiseBuffer = this.audioContext.createBuffer(1, 4410, 44100); // 0.1 second
                const output = noiseBuffer.getChannelData(0);

                for (let i = 0; i < 4410; i++) {
                    output[i] = Math.random() * 2 - 1;
                }

                noise.buffer = noiseBuffer;

                const snareFilter = this.audioContext.createBiquadFilter();
                snareFilter.type = 'highpass';
                snareFilter.frequency.value = 200;

                const snareGain = this.audioContext.createGain();

                noise.connect(snareFilter);
                snareFilter.connect(snareGain);
                snareGain.connect(this.musicGainNode);

                const startTime = now + time;

                snareGain.gain.setValueAtTime(0.3, startTime);
                snareGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

                noise.start(startTime);
                noise.stop(startTime + 0.1);
            });

            // HI-HAT - Rapid 16th notes
            for (let i = 0; i < 16; i++) {
                const hihatTime = now + (i * barLength / 16);
                const noise = this.audioContext.createBufferSource();
                const noiseBuffer = this.audioContext.createBuffer(1, 1000, 44100);
                const output = noiseBuffer.getChannelData(0);

                for (let j = 0; j < 1000; j++) {
                    output[j] = Math.random() * 2 - 1;
                }

                noise.buffer = noiseBuffer;

                const hihatFilter = this.audioContext.createBiquadFilter();
                hihatFilter.type = 'highpass';
                hihatFilter.frequency.value = 8000;

                const hihatGain = this.audioContext.createGain();

                noise.connect(hihatFilter);
                hihatFilter.connect(hihatGain);
                hihatGain.connect(this.musicGainNode);

                // Accent pattern
                const volume = (i % 4 === 0) ? 0.15 : 0.08;

                hihatGain.gain.setValueAtTime(volume, hihatTime);
                hihatGain.gain.exponentialRampToValueAtTime(0.01, hihatTime + 0.02);

                noise.start(hihatTime);
                noise.stop(hihatTime + 0.02);
            }

            // BASS LINE - Deep sub bass
            const bassOsc = this.audioContext.createOscillator();
            const bassGain = this.audioContext.createGain();
            const bassFilter = this.audioContext.createBiquadFilter();

            bassOsc.type = 'sawtooth';
            bassFilter.type = 'lowpass';
            bassFilter.frequency.value = 100;
            bassFilter.Q.value = 10;

            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(this.musicGainNode);

            // Reese bass pattern
            const bassPattern = [41.2, 41.2, 46.2, 38.9]; // E1, E1, F#1, D1
            bassPattern.forEach((freq, i) => {
                const time = now + (i * barLength / 4);
                bassOsc.frequency.setValueAtTime(freq, time);
            });

            // Add wobble
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = 2; // 2Hz wobble
            lfoGain.gain.value = 20;
            lfo.connect(lfoGain);
            lfoGain.connect(bassFilter.frequency);

            bassGain.gain.setValueAtTime(0.3, now);
            bassGain.gain.setValueAtTime(0.3, now + barLength - 0.05);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + barLength);

            bassOsc.start(now);
            bassOsc.stop(now + barLength);
            lfo.start(now);
            lfo.stop(now + barLength);

            // Schedule next loop
            this.currentMusicLoop = setTimeout(playMusicLoop, barLength * 1000);
        };

        playMusicLoop();
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