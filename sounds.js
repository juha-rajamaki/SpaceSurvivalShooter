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

    // Background music generator
    startMusic() {
        if (!this.enabled || !this.musicEnabled || !this.audioContext || this.currentMusicLoop) return;

        // Simple ambient space music using oscillators
        const playMusicLoop = () => {
            if (!this.enabled || !this.musicEnabled) {
                this.currentMusicLoop = null;
                return;
            }

            const now = this.audioContext.currentTime;
            const measureLength = 2; // 2 seconds per measure

            // Bass line
            const bassFreqs = [55, 55, 62, 49]; // A1, A1, B1, G1
            const bassOsc = this.audioContext.createOscillator();
            const bassGain = this.audioContext.createGain();
            const bassFilter = this.audioContext.createBiquadFilter();

            bassOsc.type = 'sine';
            bassFilter.type = 'lowpass';
            bassFilter.frequency.value = 200;

            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(this.musicGainNode);

            // Program bass pattern
            bassFreqs.forEach((freq, i) => {
                const time = now + i * 0.5;
                bassOsc.frequency.setValueAtTime(freq, time);
            });

            bassGain.gain.setValueAtTime(0.4, now);
            bassGain.gain.setValueAtTime(0.4, now + measureLength - 0.1);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + measureLength);

            bassOsc.start(now);
            bassOsc.stop(now + measureLength);

            // Ambient pad
            const padOsc = this.audioContext.createOscillator();
            const padGain = this.audioContext.createGain();
            const padFilter = this.audioContext.createBiquadFilter();

            padOsc.type = 'triangle';
            padFilter.type = 'lowpass';
            padFilter.frequency.value = 800;

            padOsc.connect(padFilter);
            padFilter.connect(padGain);
            padGain.connect(this.musicGainNode);

            // Slowly modulate pad frequency for ambient effect
            padOsc.frequency.setValueAtTime(220, now); // A3
            padOsc.frequency.exponentialRampToValueAtTime(247, now + measureLength/2); // B3
            padOsc.frequency.exponentialRampToValueAtTime(220, now + measureLength); // back to A3

            padGain.gain.setValueAtTime(0, now);
            padGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
            padGain.gain.setValueAtTime(0.15, now + measureLength - 0.2);
            padGain.gain.linearRampToValueAtTime(0, now + measureLength);

            padOsc.start(now);
            padOsc.stop(now + measureLength);

            // Arpeggio
            const arpNotes = [440, 554, 659, 554]; // A4, C#5, E5, C#5
            arpNotes.forEach((freq, i) => {
                const arpOsc = this.audioContext.createOscillator();
                const arpGain = this.audioContext.createGain();

                arpOsc.type = 'sine';
                arpOsc.connect(arpGain);
                arpGain.connect(this.musicGainNode);

                const startTime = now + i * 0.25;
                arpOsc.frequency.setValueAtTime(freq, startTime);

                arpGain.gain.setValueAtTime(0, startTime);
                arpGain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
                arpGain.gain.setValueAtTime(0.1, startTime + 0.15);
                arpGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

                arpOsc.start(startTime);
                arpOsc.stop(startTime + 0.25);
            });

            // Schedule next loop
            this.currentMusicLoop = setTimeout(playMusicLoop, measureLength * 1000);
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