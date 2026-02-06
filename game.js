// Main game controller

const ROUND_CONFIG = [
    // R1: Tutorial — enemies don't shoot
    { asteroids: 8, hugeAsteroids: 0, enemies: 2, missileShips: 0, mines: 0, blackHoles: 0, matriarch: 0,
      enemySpeed: 25, enemyHealth: 40, enemyFireRate: 999,
      msHealth: 0, msFireRate: 0, largeBias: 0.40 },
    // R2: Enemies start shooting (slowly)
    { asteroids: 8, hugeAsteroids: 0, enemies: 3, missileShips: 0, mines: 0, blackHoles: 0, matriarch: 0,
      enemySpeed: 26, enemyHealth: 45, enemyFireRate: 1.2,
      msHealth: 0, msFireRate: 0, largeBias: 0.40 },
    // R3: Ramping up
    { asteroids: 10, hugeAsteroids: 0, enemies: 4, missileShips: 0, mines: 0, blackHoles: 0, matriarch: 0,
      enemySpeed: 28, enemyHealth: 50, enemyFireRate: 1.0,
      msHealth: 0, msFireRate: 0, largeBias: 0.40 },
    // R4: NEW — mines
    { asteroids: 10, hugeAsteroids: 0, enemies: 4, missileShips: 0, mines: 2, blackHoles: 0, matriarch: 0,
      enemySpeed: 30, enemyHealth: 55, enemyFireRate: 0.9,
      msHealth: 0, msFireRate: 0, largeBias: 0.50 },
    // R5: NEW — huge asteroid, dual weapon available
    { asteroids: 10, hugeAsteroids: 1, enemies: 5, missileShips: 0, mines: 2, blackHoles: 0, matriarch: 0,
      enemySpeed: 32, enemyHealth: 60, enemyFireRate: 0.85,
      msHealth: 0, msFireRate: 0, largeBias: 0.50 },
    // R6: NEW — missile ships + player missiles
    { asteroids: 12, hugeAsteroids: 1, enemies: 5, missileShips: 1, mines: 2, blackHoles: 0, matriarch: 0,
      enemySpeed: 33, enemyHealth: 65, enemyFireRate: 0.8,
      msHealth: 80, msFireRate: 3.0, largeBias: 0.50 },
    // R7: NEW — black holes
    { asteroids: 12, hugeAsteroids: 2, enemies: 6, missileShips: 1, mines: 3, blackHoles: 1, matriarch: 0,
      enemySpeed: 34, enemyHealth: 70, enemyFireRate: 0.75,
      msHealth: 85, msFireRate: 2.8, largeBias: 0.55 },
    // R8: Peak non-boss difficulty
    { asteroids: 14, hugeAsteroids: 2, enemies: 7, missileShips: 2, mines: 3, blackHoles: 1, matriarch: 0,
      enemySpeed: 35, enemyHealth: 75, enemyFireRate: 0.7,
      msHealth: 90, msFireRate: 2.6, largeBias: 0.55 },
    // R9: Slight ease before boss
    { asteroids: 12, hugeAsteroids: 2, enemies: 6, missileShips: 2, mines: 2, blackHoles: 1, matriarch: 0,
      enemySpeed: 36, enemyHealth: 80, enemyFireRate: 0.65,
      msHealth: 95, msFireRate: 2.5, largeBias: 0.55 },
    // R10: BOSS — reduced clutter, Matriarch focus
    { asteroids: 6, hugeAsteroids: 0, enemies: 3, missileShips: 1, mines: 1, blackHoles: 0, matriarch: 1,
      enemySpeed: 36, enemyHealth: 80, enemyFireRate: 0.65,
      msHealth: 95, msFireRate: 2.5, largeBias: 0.30 },
];

class Game {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.round = 1;
        this.maxRounds = ROUND_CONFIG.length;
        this.isRunning = false;
        this.isPaused = false;
        this.gameOver = false;

        // Round-based game (10 rounds, 2 minutes each)
        this.roundTime = 120; // 2 minutes per round
        this.currentTime = 120; // Countdown for current round
        this.enemyRespawnTimer = 0;
        this.enemyWaveNumber = 0;
        this.gameWon = false;
        this.waitingForRoundStart = false;
        this.roundStartCallback = null;

        // Cheat code tracker
        this._cheatBuffer = [];
        this._cheatCodes = {
            'ken': () => this.activateCheat(10),
            'son': () => this.activateCheat(6),
            'nom': () => this.activateCheat(8)
        };
        this._maxCheatLen = 3;

        // Initialize Three.js
        this.initThreeJS();

        // Initialize game systems
        this.physics = new Physics();
        this.particleSystem = new ParticleSystem(this.scene, 2000);
        this.powerUpManager = new PowerUpManager(this.scene);

        // Game entities
        this.player = null;
        this.asteroids = [];
        this.enemies = [];
        this.mines = [];
        this.blackHoles = [];
        this.lasers = [];
        this.enemyLasers = [];
        this.playerMissiles = [];
        this.debris = [];

        // Game bounds - INCREASED SIZE
        this.bounds = {
            minX: -100, maxX: 100,  // Doubled width
            minY: -60, maxY: 60,     // Doubled height
            minZ: -20, maxZ: 20,     // Doubled depth
            width: 200,              // Was 100
            height: 120              // Was 60
        };

        // Input handling
        this.input = {
            left: false,
            right: false,
            up: false,
            down: false,
            fire: false,
            shield: false,
            missile: false
        };

        this.setupEventListeners();
        this.initUI();
    }

    initThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000033, 50, 200);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 50);  // Increased from 30 to see larger area
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // Create starfield background
        this.createStarfield();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8
        });

        const starVertices = [];
        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 300;
            const y = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position',
            new THREE.Float32BufferAttribute(starVertices, 3));

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
        this.stars = stars;
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Enter key to start, restart, or begin next round
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.waitingForRoundStart) {
                    this.dismissRoundTransition();
                } else {
                    const startScreen = document.getElementById('start-screen');
                    const gameOverScreen = document.getElementById('game-over');
                    if (!startScreen.classList.contains('hidden')) {
                        document.getElementById('start-btn').click();
                    } else if (!gameOverScreen.classList.contains('hidden')) {
                        document.getElementById('restart-btn').click();
                    }
                }
                return;
            }

            // Cheat code detection
            const key = e.key.toLowerCase();
            if (this.isRunning && !this.gameOver) {
                this._cheatBuffer.push(key);
                if (this._cheatBuffer.length > this._maxCheatLen) {
                    this._cheatBuffer.shift();
                }
                const typed = this._cheatBuffer.join('');
                for (const [code, fn] of Object.entries(this._cheatCodes)) {
                    if (typed.endsWith(code)) {
                        this._cheatBuffer = [];
                        fn();
                        break;
                    }
                }
            }

            switch (key) {
                case 'arrowleft':
                case 'a':
                    this.input.left = true;
                    break;
                case 'arrowright':
                case 'd':
                    this.input.right = true;
                    break;
                case 'arrowup':
                case 'w':
                    this.input.up = true;
                    break;
                case 'arrowdown':
                case 's':
                    this.input.down = true;
                    break;
                case ' ':
                    e.preventDefault();
                    this.input.fire = true;
                    break;
                case 'shift':
                    e.preventDefault();
                    this.input.shield = true;
                    break;
                case 'control':
                    e.preventDefault();
                    this.input.missile = true;
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.key.toLowerCase()) {
                case 'arrowleft':
                case 'a':
                    this.input.left = false;
                    break;
                case 'arrowright':
                case 'd':
                    this.input.right = false;
                    break;
                case 'arrowup':
                case 'w':
                    this.input.up = false;
                    break;
                case 'arrowdown':
                case 's':
                    this.input.down = false;
                    break;
                case ' ':
                    this.input.fire = false;
                    break;
                case 'shift':
                    this.input.shield = false;
                    break;
                case 'control':
                    this.input.missile = false;
                    break;
            }
        });

        // UI buttons
        document.getElementById('start-btn').addEventListener('click', async () => {
            // Initialize sound system on first user interaction
            await window.soundManager.initialize();
            this.startGame();
        });

        document.getElementById('restart-btn').addEventListener('click', async () => {
            await window.soundManager.initialize();
            this.restartGame();
        });

        // Victory name submit
        document.getElementById('submit-name-btn').addEventListener('click', () => {
            this.submitHofName();
        });
        document.getElementById('winner-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitHofName();
            }
        });

        // Sound control buttons
        document.getElementById('toggle-sound').addEventListener('click', () => {
            const enabled = window.soundManager.toggleSound();
            document.getElementById('toggle-sound').classList.toggle('disabled', !enabled);
            document.getElementById('toggle-sound').textContent = enabled ? '🔊' : '🔇';
        });

        document.getElementById('toggle-music').addEventListener('click', () => {
            const enabled = window.soundManager.toggleMusic();
            document.getElementById('toggle-music').classList.toggle('disabled', !enabled);
        });

        document.getElementById('toggle-sfx').addEventListener('click', () => {
            const enabled = window.soundManager.toggleSFX();
            document.getElementById('toggle-sfx').classList.toggle('disabled', !enabled);
        });

        document.getElementById('volume-slider').addEventListener('input', (e) => {
            window.soundManager.setMasterVolume(e.target.value / 100);
        });

        // Initialize sound button states from saved settings
        if (!window.soundManager.enabled) {
            document.getElementById('toggle-sound').classList.add('disabled');
            document.getElementById('toggle-sound').textContent = '🔇';
        }
        if (!window.soundManager.musicEnabled) {
            document.getElementById('toggle-music').classList.add('disabled');
        }
        if (!window.soundManager.sfxEnabled) {
            document.getElementById('toggle-sfx').classList.add('disabled');
        }
        document.getElementById('volume-slider').value = window.soundManager.masterVolume * 100;
    }

    initUI() {
        this.ui = {
            score: document.getElementById('score'),
            ammo: document.getElementById('ammo'),
            round: document.getElementById('round'),
            timer: document.getElementById('timer'),
            healthFill: document.getElementById('health-fill'),
            healthText: document.getElementById('health-text'),
            shieldBarContainer: document.getElementById('shield-bar-container'),
            shieldFill: document.getElementById('shield-fill'),
            shieldText: document.getElementById('shield-text'),
            activePowerups: document.getElementById('active-powerups'),
            startScreen: document.getElementById('start-screen'),
            gameOver: document.getElementById('game-over'),
            finalScore: document.getElementById('final-score'),
            finalWave: document.getElementById('final-wave'),
            highScore: document.getElementById('high-score')
        };

        // Display high score on start screen
        this.ui.highScore.textContent = this.highScore;

        // Display Hall of Fame
        this.displayHallOfFame();
    }

    loadHighScore() {
        const saved = localStorage.getItem('spaceShooterHighScore');
        return saved ? parseInt(saved, 10) : 0;
    }

    saveHighScore() {
        localStorage.setItem('spaceShooterHighScore', this.highScore.toString());
    }

    loadHallOfFame() {
        try {
            const saved = localStorage.getItem('spaceShooterHallOfFame');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(e => e && typeof e.score === 'number' && typeof e.round === 'number' && typeof e.won === 'boolean')
                .map(e => ({
                    score: Math.max(0, e.score),
                    round: Math.max(1, Math.min(10, e.round)),
                    won: Boolean(e.won),
                    name: typeof e.name === 'string' ? e.name.slice(0, 16) : ''
                }))
                .slice(0, 5);
        } catch (e) {
            return [];
        }
    }

    saveHallOfFame(entry) {
        if (this._hofSaved) return;
        this._hofSaved = true;

        const sanitized = {
            score: Math.max(0, parseInt(entry.score, 10) || 0),
            round: Math.max(1, Math.min(this.maxRounds, parseInt(entry.round, 10) || 1)),
            won: Boolean(entry.won),
            name: typeof entry.name === 'string' ? entry.name.slice(0, 16) : ''
        };
        const hof = this.loadHallOfFame();
        hof.push(sanitized);
        hof.sort((a, b) => b.score - a.score);
        const top5 = hof.slice(0, 5);
        try {
            localStorage.setItem('spaceShooterHallOfFame', JSON.stringify(top5));
        } catch (e) { /* quota exceeded */ }
        return top5;
    }

    qualifiesForHallOfFame(score) {
        const hof = this.loadHallOfFame();
        if (hof.length < 5) return true;
        return score > hof[hof.length - 1].score;
    }

    displayHallOfFame() {
        const hof = this.loadHallOfFame();
        const list = document.getElementById('hof-list');
        list.textContent = '';

        if (hof.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'hof-empty';
            empty.textContent = 'No games played yet';
            list.appendChild(empty);
            return;
        }

        hof.forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = 'hof-entry';

            const rank = document.createElement('span');
            rank.className = 'hof-rank';
            rank.textContent = `#${i + 1}`;

            const name = document.createElement('span');
            name.className = 'hof-name';
            name.textContent = entry.name || 'Anonymous';

            const score = document.createElement('span');
            score.className = 'hof-score';
            score.textContent = entry.score.toLocaleString();

            const round = document.createElement('span');
            round.className = 'hof-round';
            if (entry.won) {
                round.textContent = 'R10 Victory!';
                round.classList.add('hof-victory');
            } else {
                round.textContent = `R${entry.round}/${this.maxRounds}`;
            }

            row.appendChild(rank);
            row.appendChild(name);
            row.appendChild(score);
            row.appendChild(round);
            list.appendChild(row);
        });
    }

    startGame() {
        this.ui.startScreen.classList.add('hidden');
        this.isRunning = true;

        // Start background music for round 1
        window.soundManager.startMusic(1);
        this.gameOver = false;
        this.gameWon = false;
        this._hofSaved = false;
        this.score = 0;
        this.round = 1;
        this.roundStats = { enemiesKilled: 0, asteroidsDestroyed: 0, scoreEarned: 0, damageTaken: 0 };
        this.currentTime = this.roundTime; // Reset timer to 2 minutes
        this.enemyRespawnTimer = 0;
        this.enemyWaveNumber = 0;

        // Create player
        this.player = new PlayerShuttle(this.scene);

        // Start first round
        this.startRound();

        // Spawn initial ammo crate at start of game
        const initialAmmoPos = new THREE.Vector3(
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 40,
            0
        );
        this.powerUpManager.spawnPowerUpAt(initialAmmoPos, 'ammo');

        // Start game loop
        this.animate();
    }

    restartGame() {
        // Clean up existing entities
        this.cleanup();

        // Reset UI
        this.ui.gameOver.classList.add('hidden');
        document.getElementById('hof-name-input').classList.add('hidden');
        this.ui.startScreen.classList.add('hidden');

        // Start new game
        this.startGame();
    }

    cleanup() {
        // Remove all entities
        this.asteroids.forEach(a => a.destroy());
        this.enemies.forEach(e => e.destroy());
        this.mines.forEach(m => m.destroy());
        this.blackHoles.forEach(b => b.destroy());
        this.lasers.forEach(l => l.destroy());
        this.enemyLasers.forEach(l => l.destroy());
        this.playerMissiles.forEach(m => m.destroy());
        this.debris.forEach(d => d.destroy());

        if (this.player) {
            this.scene.remove(this.player.mesh);
        }

        this.asteroids = [];
        this.enemies = [];
        this.mines = [];
        this.blackHoles = [];
        this.lasers = [];
        this.enemyLasers = [];
        this.playerMissiles = [];
        this.debris = [];

        this.powerUpManager.reset();
    }

    showRoundTransition(roundNumber, config, completedRound, completedStats) {
        const overlay = document.getElementById('round-transition');
        overlay.classList.remove('hidden');
        overlay.textContent = '';

        // Show stats from completed round (if available)
        if (completedRound && completedStats) {
            const statsSection = document.createElement('div');
            statsSection.className = 'round-stats';

            const statsHeading = document.createElement('h3');
            statsHeading.textContent = `Round ${completedRound} Complete!`;
            statsHeading.style.color = '#00ff00';
            statsSection.appendChild(statsHeading);

            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';

            const statItems = [
                { label: 'Enemies Killed', value: completedStats.enemiesKilled, icon: '👾' },
                { label: 'Asteroids Destroyed', value: completedStats.asteroidsDestroyed, icon: '☄️' },
                { label: 'Score Earned', value: completedStats.scoreEarned, icon: '⭐' },
                { label: 'Damage Taken', value: completedStats.damageTaken, icon: '💔' },
            ];

            statItems.forEach(stat => {
                const statDiv = document.createElement('div');
                statDiv.className = 'stat-entry';
                statDiv.textContent = `${stat.icon} ${stat.label}: ${stat.value}`;
                statsGrid.appendChild(statDiv);
            });

            statsSection.appendChild(statsGrid);

            const bonusDiv = document.createElement('div');
            bonusDiv.className = 'round-bonus';
            bonusDiv.textContent = '+100 AMMO BONUS';
            statsSection.appendChild(bonusDiv);

            overlay.appendChild(statsSection);

            // Separator
            const separator = document.createElement('hr');
            separator.style.cssText = 'border: 1px solid rgba(255,255,255,0.2); margin: 15px 0;';
            overlay.appendChild(separator);
        }

        const heading = document.createElement('h2');
        heading.textContent = `Round ${roundNumber}`;
        overlay.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'round-items-grid';

        // Only show enemies/hazards for this round, mark new types
        const items = [
            { key: 'asteroid', label: 'Asteroids', count: config.asteroidCount, cls: 'icon-asteroid', isNew: false },
            { key: 'enemy', label: 'Enemies', count: config.enemyCount, cls: 'icon-enemy', isNew: false },
        ];

        if (config.hugeAsteroidCount > 0) {
            items.push({ key: 'huge_asteroid', label: 'Huge Asteroid', count: config.hugeAsteroidCount, cls: 'icon-asteroid', isNew: roundNumber === 5 });
        }
        if (config.missileShipCount > 0) {
            items.push({ key: 'missileship', label: 'Missile Ships', count: config.missileShipCount, cls: 'icon-enemy', isNew: roundNumber === 6 });
        }
        if (config.mineCount > 0) {
            items.push({ key: 'mine', label: 'Mines', count: config.mineCount, cls: 'icon-mine', isNew: roundNumber === 4 });
        }
        if (config.blackHoleCount > 0) {
            items.push({ key: 'blackhole', label: 'Black Holes', count: config.blackHoleCount, cls: 'icon-blackhole', isNew: roundNumber === 7 });
        }
        if (config.matriarchCount > 0) {
            items.push({ key: 'matriarch', label: 'MATRIARCH', count: config.matriarchCount, cls: 'icon-matriarch', isNew: true });
        }

        // Round 2 is when enemies start shooting
        if (roundNumber === 2) {
            items[1].isNew = true;
            items[1].label = 'Enemies (now shooting!)';
        }

        items.forEach((item, i) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'round-item';
            if (item.isNew) itemDiv.classList.add('round-item-new');
            itemDiv.style.animationDelay = `${i * 0.08}s`;

            const iconSpan = document.createElement('span');
            iconSpan.className = `item-icon ${item.cls}`;
            // Use 3D preview if available
            if (this.itemPreviews && this.itemPreviews[item.key]) {
                const img = document.createElement('img');
                img.src = this.itemPreviews[item.key];
                img.alt = item.label;
                img.style.width = '100%';
                img.style.height = '100%';
                iconSpan.appendChild(img);
            }

            const labelSpan = document.createElement('span');
            labelSpan.className = 'item-label';
            labelSpan.textContent = item.label;

            const countSpan = document.createElement('span');
            countSpan.className = 'item-count';
            countSpan.textContent = `x${item.count}`;

            itemDiv.appendChild(iconSpan);
            itemDiv.appendChild(labelSpan);
            itemDiv.appendChild(countSpan);

            if (item.isNew) {
                const newTag = document.createElement('span');
                newTag.className = 'item-new-tag';
                newTag.textContent = 'NEW!';
                itemDiv.appendChild(newTag);
            }

            grid.appendChild(itemDiv);
        });

        overlay.appendChild(grid);

        // "Press Enter" prompt
        const prompt = document.createElement('p');
        prompt.className = 'round-prompt';
        prompt.textContent = 'Press ENTER to start';
        overlay.appendChild(prompt);

        // Pause game until player presses Enter
        this.isPaused = true;
        this.waitingForRoundStart = true;
    }

    dismissRoundTransition() {
        if (!this.waitingForRoundStart) return;
        const overlay = document.getElementById('round-transition');
        overlay.classList.add('hidden');
        this.isPaused = false;
        this.waitingForRoundStart = false;
        // Start music for this round
        window.soundManager.startMusic(this.round);
        if (this.roundStartCallback) {
            this.roundStartCallback();
            this.roundStartCallback = null;
        }
    }

    startRound() {
        this.beginRound(null, null);
    }

    beginRound(completedRound, completedStats) {
        this.round = Math.max(1, Math.min(ROUND_CONFIG.length, this.round));
        const cfg = ROUND_CONFIG[this.round - 1];

        // Update powerup manager round
        this.powerUpManager.currentRound = this.round;

        // Build transition config object for the UI
        const transitionConfig = {
            asteroidCount: cfg.asteroids,
            hugeAsteroidCount: cfg.hugeAsteroids,
            enemyCount: cfg.enemies,
            missileShipCount: cfg.missileShips,
            mineCount: cfg.mines,
            blackHoleCount: cfg.blackHoles,
            matriarchCount: cfg.matriarch
        };

        // Show round transition overlay (skip round 1 — player just clicked Start)
        if (this.round > 1) {
            this.showRoundTransition(this.round, transitionConfig, completedRound, completedStats);
        }

        const playerPos = this.player ? this.player.mesh.position : new THREE.Vector3(0, 0, 0);

        // Spawn huge asteroids
        for (let i = 0; i < cfg.hugeAsteroids; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );
            if (position.distanceTo(playerPos) > 20) {
                this.asteroids.push(new Asteroid(position, 'huge', this.scene));
            }
        }

        // Spawn asteroids with round-appropriate size weighting
        const largeBias = cfg.largeBias;
        for (let i = 0; i < cfg.asteroids; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );

            if (position.distanceTo(playerPos) > 15) {
                const random = Math.random();
                let size;
                if (random < largeBias) {
                    size = 'large';
                } else if (random < largeBias + (1 - largeBias) * 0.55) {
                    size = 'medium';
                } else {
                    size = 'small';
                }
                this.asteroids.push(new Asteroid(position, size, this.scene));
            }
        }

        // Spawn enemies in a circle pattern
        for (let i = 0; i < cfg.enemies; i++) {
            const angle = (Math.PI * 2 * i) / cfg.enemies;
            const distance = 35 + Math.random() * 20;
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                0
            );

            const enemy = new EnemyShip(position, this.scene, this.player);
            enemy.currentRound = this.round;
            enemy.maxSpeed = cfg.enemySpeed;
            enemy.health = cfg.enemyHealth;
            enemy.fireRate = cfg.enemyFireRate;
            this.enemies.push(enemy);
        }

        // Spawn missile ships
        for (let i = 0; i < cfg.missileShips; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 45 + Math.random() * 20;
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                0
            );
            const missileShip = new MissileShip(position, this.scene, this.player);
            missileShip.currentRound = this.round;
            missileShip.health = cfg.msHealth;
            missileShip.missileFireRate = cfg.msFireRate;
            this.enemies.push(missileShip);
        }

        // Spawn mines
        for (let i = 0; i < cfg.mines; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width * 0.7,
                (Math.random() - 0.5) * this.bounds.height * 0.7,
                0
            );
            this.mines.push(new SpaceMine(position, this.scene));
        }

        // Spawn black holes
        for (let i = 0; i < cfg.blackHoles; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width * 0.5,
                (Math.random() - 0.5) * this.bounds.height * 0.5,
                0
            );
            this.blackHoles.push(new BlackHole(position, this.scene));
        }

        // Spawn Matriarch boss
        if (cfg.matriarch > 0) {
            const matriarchPos = new THREE.Vector3(0, 50, 0);
            const matriarch = new Matriarch(matriarchPos, this.scene, this.player);
            this.enemies.push(matriarch);
        }
    }




    update(deltaTime) {
        if (!this.isRunning || this.isPaused || this.gameOver) return;

        const currentTime = Date.now() * 0.001;

        // Update round timer
        this.currentTime -= deltaTime;

        // Fade music out in the last 3 seconds of the round
        if (this.currentTime <= 3 && !this.musicFading) {
            this.musicFading = true;
            window.soundManager.fadeOutMusic(2.5);
        }

        if (this.currentTime <= 0) {
            this.currentTime = 0;
            this.musicFading = false;

            // Give +100 ammo bonus for surviving the round
            this.player.ammo = Math.min(this.player.ammo + 100, this.player.maxAmmo);

            // Save stats from completed round
            const completedStats = { ...this.roundStats };
            const completedRound = this.round;

            // Round complete — advance to next round
            this.round++;

            if (this.round > this.maxRounds) {
                this.winGame();
                return;
            }

            // Reset stats and enemy wave for new round
            this.roundStats = { enemiesKilled: 0, asteroidsDestroyed: 0, scoreEarned: 0, damageTaken: 0 };
            this.enemyWaveNumber = 0;
            this.enemyRespawnTimer = 0;

            // Clear all entities from previous round
            this.asteroids.forEach(a => a.destroy());
            this.enemies.forEach(e => e.destroy());
            this.mines.forEach(m => m.destroy());
            this.blackHoles.forEach(b => b.destroy());
            this.lasers.forEach(l => l.destroy());
            this.enemyLasers.forEach(l => l.destroy());
            this.playerMissiles.forEach(m => m.destroy());
            this.debris.forEach(d => d.destroy());
            this.asteroids = [];
            this.enemies = [];
            this.mines = [];
            this.blackHoles = [];
            this.lasers = [];
            this.enemyLasers = [];
            this.playerMissiles = [];
            this.debris = [];

            // Reset timer for new round
            this.currentTime = this.roundTime;
            this.beginRound(completedRound, completedStats);
        }

        // Update player
        if (this.player) {
            // Shield: active while holding Shift and reserve > 0
            if (this.input.shield && this.player.shieldReserve > 0) {
                this.player.shields = true;
                this.player.shieldReserve -= deltaTime;
                if (this.player.shieldReserve <= 0) {
                    this.player.shieldReserve = 0;
                    this.player.shields = false;
                }
            } else {
                this.player.shields = false;
            }

            // Slow health regeneration (100 HP over 120 seconds ≈ 0.83 HP/s)
            if (this.player.health < this.player.maxHealth) {
                this.player.health = Math.min(this.player.health + (this.player.maxHealth / 120) * deltaTime, this.player.maxHealth);
            }

            // Handle player update and firing first to get acceleration
            const newLasers = this.player.update(deltaTime, this.input, currentTime);
            if (newLasers) {
                this.lasers.push(...newLasers);
                window.soundManager.playLaser();
            }

            // Missile firing
            if (this.input.missile && this.player.hasMissiles && this.player.missiles > 0) {
                if (currentTime - this.player.lastMissileTime > this.player.missileFireRate) {
                    this.player.lastMissileTime = currentTime;
                    const missile = this.player.createMissile();
                    if (missile) {
                        // Give missile a live reference to all targets
                        missile.targets = [...this.enemies, ...this.asteroids];
                        this.playerMissiles.push(missile);
                        window.soundManager.playExplosion('small');
                    }
                }
            }

            // Update physics
            this.physics.updateVelocity(this.player, this.player.acceleration, deltaTime);
            this.physics.updatePosition(this.player, deltaTime);
            this.physics.keepInBounds(this.player, this.bounds);

            // Create engine trail particles
            if (this.input.up || this.input.down || this.input.left || this.input.right) {
                const trailPos = this.player.mesh.position.clone();
                trailPos.z -= 1.5;
                const direction = this.player.velocity.clone().normalize();
                const isBoosting = this.player.speedBoost;
                this.particleSystem.createEngineTrail(
                    trailPos,
                    direction,
                    isBoosting
                );

                // Play boost sound only once when boost starts
                if (isBoosting && !this.wasBoostingLastFrame) {
                    window.soundManager.playEngineBoost();
                }
                this.wasBoostingLastFrame = isBoosting;
            } else {
                this.wasBoostingLastFrame = false;
            }

            // Apply black hole gravity
            this.blackHoles.forEach(blackHole => {
                this.physics.applyGravitationalPull(this.player, blackHole);
            });

            // Camera follow with smoothing
            this.camera.position.x += (this.player.mesh.position.x - this.camera.position.x) * 0.1;
            this.camera.position.y += (this.player.mesh.position.y - this.camera.position.y) * 0.1;
        }

        // Update asteroids
        this.asteroids.forEach((asteroid, index) => {
            asteroid.update(deltaTime);
            this.physics.updatePosition(asteroid, deltaTime);
            this.physics.keepInBounds(asteroid, this.bounds);
        });

        // Update enemies
        this.enemies.forEach((enemy, index) => {
            const result = enemy.update(deltaTime, currentTime);
            if (result) {
                // Matriarch returns array of lasers, others return single projectile
                if (Array.isArray(result)) {
                    this.enemyLasers.push(...result);
                } else {
                    this.enemyLasers.push(result);
                }
                if (enemy instanceof MissileShip) {
                    window.soundManager.playExplosion('small');
                } else {
                    window.soundManager.playEnemyLaser();
                }
            }
            this.physics.updatePosition(enemy, deltaTime);
            this.physics.keepInBounds(enemy, this.bounds);
        });

        // Enemy respawning - when all regular enemies are destroyed, spawn replacements
        const matriarchAlive = this.enemies.some(e => e instanceof Matriarch);
        const regularEnemies = this.enemies.filter(e => !(e instanceof Matriarch) && !(e instanceof MissileShip));
        const missileShips = this.enemies.filter(e => e instanceof MissileShip);
        // No respawn waves during R10 boss fight
        if (this.round === 10 && matriarchAlive) {
            this.enemyRespawnTimer = 0;
        } else if (regularEnemies.length === 0 && missileShips.length === 0 && !this.isPaused && !this.gameOver && this.enemyWaveNumber < 4) {
            this.enemyRespawnTimer += deltaTime;
            if (this.enemyRespawnTimer >= 15) {
                this.enemyRespawnTimer = 0;
                this.enemyWaveNumber++;
                this.spawnReplacementEnemies();
            }
        } else {
            this.enemyRespawnTimer = 0;
        }

        // Update mines
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const shouldExplode = this.mines[i].update(deltaTime, this.player.mesh.position);
            if (shouldExplode) {
                this.particleSystem.createExplosion(
                    this.mines[i].mesh.position,
                    new THREE.Color(1, 0.3, 0),
                    100
                );
                window.soundManager.playExplosion('large');

                // Check damage to player
                const distance = this.mines[i].mesh.position.distanceTo(this.player.mesh.position);
                if (distance < 10) {
                    const damage = Math.max(0, 25 - distance * 2.5);
                    this.damagePlayer(damage);
                }

                this.mines[i].destroy();
                this.mines.splice(i, 1);
                this.addScore(100);
            }
        }

        // Update black holes
        this.blackHoles.forEach(blackHole => {
            blackHole.update(deltaTime);
        });

        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const shouldRemove = this.lasers[i].update(deltaTime);

            if (shouldRemove) {
                this.lasers[i].destroy();
                this.lasers.splice(i, 1);
            } else {
                // Add laser trail
                this.particleSystem.createLaserTrail(
                    this.lasers[i].mesh.position,
                    this.lasers[i].velocity.clone().normalize()
                );
            }
        }

        // Update enemy lasers
        for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
            const shouldRemove = this.enemyLasers[i].update(deltaTime);

            if (shouldRemove) {
                this.enemyLasers[i].destroy();
                this.enemyLasers.splice(i, 1);
            }
        }

        // Update missiles
        for (let i = this.playerMissiles.length - 1; i >= 0; i--) {
            // Update target list so missiles track current enemies
            this.playerMissiles[i].targets = [...this.enemies, ...this.asteroids];
            const shouldRemove = this.playerMissiles[i].update(deltaTime);
            if (shouldRemove) {
                this.playerMissiles[i].destroy();
                this.playerMissiles.splice(i, 1);
                continue;
            }

            // Check missile vs asteroids and enemies — explode on first hit
            let hit = false;
            const missilePos = this.playerMissiles[i].mesh.position;

            // Check asteroids
            for (let j = 0; j < this.asteroids.length; j++) {
                if (missilePos.distanceTo(this.asteroids[j].mesh.position) < this.asteroids[j].radius + 1) {
                    hit = true;
                    break;
                }
            }
            // Check enemies
            if (!hit) {
                for (let j = 0; j < this.enemies.length; j++) {
                    if (missilePos.distanceTo(this.enemies[j].mesh.position) < this.enemies[j].radius + 1) {
                        hit = true;
                        break;
                    }
                }
            }
            // Check mines
            if (!hit) {
                for (let j = 0; j < this.mines.length; j++) {
                    if (missilePos.distanceTo(this.mines[j].mesh.position) < this.mines[j].radius + 1) {
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                const blastPos = missilePos.clone();
                const blastRadius = this.playerMissiles[i].blastRadius;
                const blastDamage = this.playerMissiles[i].damage;

                // Big explosion effect
                this.particleSystem.createExplosion(blastPos, new THREE.Color(1, 0.5, 0), 120);
                window.soundManager.playExplosion('large');

                // Damage all asteroids in blast radius
                for (let j = this.asteroids.length - 1; j >= 0; j--) {
                    const dist = blastPos.distanceTo(this.asteroids[j].mesh.position);
                    if (dist < blastRadius) {
                        const dmg = blastDamage * (1 - dist / blastRadius);
                        if (this.asteroids[j].takeDamage(dmg)) {
                            this.particleSystem.createExplosion(this.asteroids[j].mesh.position, new THREE.Color(0.7, 0.4, 0.1), 30);
                            // Huge asteroids drop varied loot
                            if (this.asteroids[j].size === 'huge') {
                                const aPos = this.asteroids[j].mesh.position.clone();
                                const drops = Math.floor(Math.random() * 3) + 3;
                                for (let d = 0; d < drops; d++) {
                                    const off = new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0);
                                    const r = Math.random();
                                    const dtype = r < 0.25 ? 'ammo' : r < 0.40 ? 'health' : r < 0.50 ? 'shield' : 'score';
                                    this.powerUpManager.spawnPowerUpAt(aPos.clone().add(off), dtype);
                                }
                            }
                            const fragments = this.asteroids[j].break();
                            this.asteroids.splice(j, 1);
                            this.asteroids.push(...fragments);
                            this.roundStats.asteroidsDestroyed++;
                            this.addScore(50);
                        }
                    }
                }

                // Damage all enemies in blast radius
                let matriarchKilled = false;
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const dist = blastPos.distanceTo(this.enemies[j].mesh.position);
                    if (dist < blastRadius) {
                        const dmg = blastDamage * (1 - dist / blastRadius);
                        if (this.enemies[j].takeDamage(dmg, blastPos.clone())) {
                            const isMatriarch = this.enemies[j] instanceof Matriarch;
                            this.particleSystem.createExplosion(this.enemies[j].mesh.position, isMatriarch ? new THREE.Color(1, 0, 1) : new THREE.Color(1, 0.5, 0), isMatriarch ? 200 : 50);
                            const fragments = this.enemies[j].break();
                            this.debris.push(...fragments);
                            this.enemies.splice(j, 1);
                            this.roundStats.enemiesKilled++;
                            this.addScore(isMatriarch ? 2000 : 200);
                            if (isMatriarch && this.round === 10) matriarchKilled = true;
                        }
                    }
                }

                // Destroy all mines in blast radius
                for (let j = this.mines.length - 1; j >= 0; j--) {
                    const dist = blastPos.distanceTo(this.mines[j].mesh.position);
                    if (dist < blastRadius) {
                        this.particleSystem.createExplosion(this.mines[j].mesh.position, new THREE.Color(1, 0.3, 0), 60);
                        this.mines[j].destroy();
                        this.mines.splice(j, 1);
                        this.addScore(100);
                    }
                }

                this.playerMissiles[i].destroy();
                this.playerMissiles.splice(i, 1);

                if (matriarchKilled) {
                    this.winGame();
                    return;
                }
            }
        }

        // Update debris (visual only, no collisions)
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const shouldRemove = this.debris[i].update(deltaTime);
            if (shouldRemove) {
                this.debris[i].destroy();
                this.debris.splice(i, 1);
            }
        }

        // Update power-ups
        const powerUpEffect = this.powerUpManager.update(deltaTime, this.player, this.bounds);
        if (powerUpEffect) {
            this.showPowerUpMessage(powerUpEffect.message);
            window.soundManager.playPowerUp();

            // Add score if it's a score powerup
            if (powerUpEffect.scoreValue) {
                this.addScore(powerUpEffect.scoreValue);
            }

            this.updatePowerUpUI();
        }

        // Update particle system
        this.particleSystem.update(deltaTime);

        // Handle collisions
        this.handleCollisions();

        // Update UI
        this.updateUI();

        // Rotate starfield
        if (this.stars) {
            this.stars.rotation.y += deltaTime * 0.01;
        }
    }

    handleCollisions() {
        // Player laser vs asteroids
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                if (this.physics.checkCollision(this.lasers[i], this.asteroids[j])) {
                    // Tiny pixel debris on every hit
                    const hitPoint = this.lasers[i].mesh.position.clone();
                    this.particleSystem.createDebris(hitPoint, new THREE.Color(0.6, 0.4, 0.2), 8);

                    // Damage asteroid
                    if (this.asteroids[j].takeDamage(this.lasers[i].damage)) {
                        // Asteroid destroyed
                        if (this.asteroids[j].size === 'small') {
                            // Small asteroids shatter into tiny pixel debris
                            this.particleSystem.createDebris(
                                this.asteroids[j].mesh.position,
                                new THREE.Color(0.6, 0.4, 0.2),
                                25
                            );
                        } else if (this.asteroids[j].size === 'huge') {
                            // Huge asteroids get a massive explosion
                            this.particleSystem.createExplosion(
                                this.asteroids[j].mesh.position,
                                new THREE.Color(0.7, 0.4, 0.1),
                                80
                            );
                        } else {
                            this.particleSystem.createExplosion(
                                this.asteroids[j].mesh.position,
                                new THREE.Color(0.5, 0.3, 0.2),
                                30
                            );
                        }
                        window.soundManager.playExplosion(this.asteroids[j].size);

                        // Drop score collectibles based on asteroid size
                        const asteroidPos = this.asteroids[j].mesh.position.clone();
                        let dropCount = 0;

                        if (this.asteroids[j].size === 'huge') {
                            // Huge asteroids drop 3-5 collectibles
                            dropCount = Math.floor(Math.random() * 3) + 3;
                        } else if (this.asteroids[j].size === 'large') {
                            // Large asteroids drop 1-3 collectibles
                            dropCount = Math.floor(Math.random() * 3) + 1;
                        } else if (this.asteroids[j].size === 'medium') {
                            // Medium asteroids drop 0-1 collectibles (50% chance)
                            dropCount = Math.random() < 0.5 ? 1 : 0;
                        }

                        // Spawn collectibles with slight offset
                        for (let k = 0; k < dropCount; k++) {
                            const offset = new THREE.Vector3(
                                (Math.random() - 0.5) * 3,
                                (Math.random() - 0.5) * 3,
                                0
                            );
                            // Huge asteroids drop varied loot
                            let dropType = 'score';
                            if (this.asteroids[j].size === 'huge') {
                                const r = Math.random();
                                if (r < 0.25) dropType = 'ammo';
                                else if (r < 0.40) dropType = 'health';
                                else if (r < 0.50) dropType = 'shield';
                                else dropType = 'score';
                            }
                            this.powerUpManager.spawnPowerUpAt(
                                asteroidPos.clone().add(offset),
                                dropType
                            );
                        }

                        // Create fragments
                        const fragments = this.asteroids[j].break();

                        // Add score based on asteroid size
                        const asteroidScore = this.asteroids[j].size === 'huge' ? 200 :
                                            this.asteroids[j].size === 'large' ? 100 :
                                            this.asteroids[j].size === 'medium' ? 75 : 50;

                        this.asteroids.splice(j, 1);
                        this.asteroids.push(...fragments);
                        this.roundStats.asteroidsDestroyed++;

                        this.addScore(asteroidScore);
                    }

                    // Remove laser
                    this.lasers[i].destroy();
                    this.lasers.splice(i, 1);
                    break;
                }
            }
        }

        // Player laser vs enemies
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.physics.checkCollision(this.lasers[i], this.enemies[j])) {
                    // Damage enemy (pass hit position for Matriarch weak spot)
                    if (this.enemies[j].takeDamage(this.lasers[i].damage, this.lasers[i].mesh.position.clone())) {
                        const isMatriarch = this.enemies[j] instanceof Matriarch;
                        // Enemy destroyed - break into pieces
                        this.particleSystem.createExplosion(
                            this.enemies[j].mesh.position,
                            isMatriarch ? new THREE.Color(1, 0, 1) : new THREE.Color(1, 0.5, 0),
                            isMatriarch ? 200 : 50
                        );
                        window.soundManager.playExplosion(isMatriarch ? 'huge' : 'medium');

                        const fragments = this.enemies[j].break();
                        this.debris.push(...fragments);
                        this.enemies.splice(j, 1);
                        this.roundStats.enemiesKilled++;
                        this.addScore(isMatriarch ? 2000 : 200);

                        // Matriarch killed on round 10 = victory
                        if (isMatriarch && this.round === 10) {
                            this.lasers[i].destroy();
                            this.lasers.splice(i, 1);
                            this.winGame();
                            return;
                        }
                    } else {
                        // Just hit, not destroyed
                        window.soundManager.playHit();
                    }

                    // Remove laser
                    this.lasers[i].destroy();
                    this.lasers.splice(i, 1);
                    break;
                }
            }
        }

        // Player laser vs enemy missiles
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            for (let j = this.enemyLasers.length - 1; j >= 0; j--) {
                if (this.enemyLasers[j] instanceof EnemyMissile &&
                    this.physics.checkCollision(this.lasers[i], this.enemyLasers[j])) {
                    this.particleSystem.createExplosion(
                        this.enemyLasers[j].mesh.position,
                        new THREE.Color(1, 0.3, 0),
                        30
                    );
                    window.soundManager.playExplosion('small');
                    this.enemyLasers[j].destroy();
                    this.enemyLasers.splice(j, 1);
                    this.lasers[i].destroy();
                    this.lasers.splice(i, 1);
                    this.addScore(50);
                    break;
                }
            }
        }

        // Enemy laser vs player
        for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
            if (this.physics.checkCollision(this.enemyLasers[i], this.player)) {
                this.damagePlayer(this.enemyLasers[i].damage);
                this.enemyLasers[i].destroy();
                this.enemyLasers.splice(i, 1);
            }
        }

        // Player vs asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            if (this.physics.checkCollision(this.player, asteroid)) {
                this.physics.bounceObjects(this.player, asteroid);
                // Small rock debris at collision point
                const midpoint = this.player.mesh.position.clone()
                    .add(asteroid.mesh.position).multiplyScalar(0.5);
                this.particleSystem.createDebris(midpoint, new THREE.Color(0.7, 0.5, 0.3), 10);

                if (asteroid.size === 'huge') {
                    this.damagePlayer(80);
                    // Huge asteroid breaks into large pieces on player collision
                    this.particleSystem.createExplosion(asteroid.mesh.position, new THREE.Color(0.7, 0.4, 0.1), 80);
                    window.soundManager.playExplosion('huge');
                    const fragments = asteroid.break();
                    this.asteroids.splice(i, 1);
                    this.asteroids.push(...fragments);
                } else if (asteroid.size === 'large') {
                    this.damagePlayer(60);
                } else if (asteroid.size === 'medium') {
                    this.damagePlayer(40);
                } else {
                    this.damagePlayer(20);
                }
                window.soundManager.playBump();
            }
        }

        // Player vs enemies (1 hit survives, 2 hits kills from full health)
        this.enemies.forEach(enemy => {
            if (this.physics.checkCollision(this.player, enemy)) {
                this.physics.bounceObjects(this.player, enemy);
                // Impact sparks at collision point
                const midpoint = this.player.mesh.position.clone()
                    .add(enemy.mesh.position).multiplyScalar(0.5);
                const isMatriarch = enemy instanceof Matriarch;
                this.particleSystem.createExplosion(midpoint, isMatriarch ? new THREE.Color(1, 0, 1) : new THREE.Color(1, 0.3, 0.1), isMatriarch ? 30 : 15);
                window.soundManager.playImpact();
                this.damagePlayer(isMatriarch ? 50 : 25);
            }
        });

        // Player vs black holes
        this.blackHoles.forEach(blackHole => {
            const distance = this.player.mesh.position.distanceTo(blackHole.mesh.position);
            if (distance < blackHole.radius) {
                this.damagePlayer(50); // Black hole
            }
        });
    }

    damagePlayer(amount) {
        // Invincibility frames — ignore damage for 0.5s after last hit
        const now = performance.now();
        if (this.lastDamageTime && (now - this.lastDamageTime) < 500) return;
        this.lastDamageTime = now;

        this.roundStats.damageTaken += amount;

        if (this.player.takeDamage(amount)) {
            this.endGame();
        } else {
            window.soundManager.playHit();
            // Flash effect
            this.player.mesh.traverse(child => {
                if (child.material && child.material.emissive) {
                    const originalEmissive = child.material.emissive.clone();
                    child.material.emissive.setHex(0xff0000);
                    setTimeout(() => {
                        child.material.emissive = originalEmissive;
                    }, 100);
                }
            });
        }

        // Ensure at least 1 health box exists when health is critical (spawn off-screen)
        if (this.player.health > 0 && this.player.health <= 30) {
            const hasHealthBox = this.powerUpManager.powerUps.some(p => p.type === 'health' && !p.collected);
            if (!hasHealthBox) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 40 + Math.random() * 15;
                const pos = this.player.mesh.position.clone().add(
                    new THREE.Vector3(Math.cos(angle) * dist, Math.sin(angle) * dist, 0)
                );
                pos.x = Math.max(this.bounds.minX + 5, Math.min(this.bounds.maxX - 5, pos.x));
                pos.y = Math.max(this.bounds.minY + 5, Math.min(this.bounds.maxY - 5, pos.y));
                this.powerUpManager.spawnPowerUpAt(pos, 'health');
            }
        }

        // Immediately update health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        const hFill = document.getElementById('health-fill');
        const hText = document.getElementById('health-text');
        if (hFill) hFill.style.width = healthPercent + '%';
        if (hText) hText.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;

        const vignette = document.getElementById('low-health-vignette');
        if (this.player.health < 40) {
            vignette.classList.remove('hidden', 'yellow');
            vignette.classList.add('red');
        } else if (this.player.health < 80) {
            vignette.classList.remove('hidden', 'red');
            vignette.classList.add('yellow');
        } else {
            vignette.classList.add('hidden');
            vignette.classList.remove('yellow', 'red');
        }
    }

    addScore(points) {
        this.score += points;
        this.roundStats.scoreEarned += points;
        this.ui.score.textContent = this.score;
    }

    showPowerUpMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 25%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00ff00;
            font-size: 36px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            animation: fadeUp 2s ease-out forwards;
        `;
        document.body.appendChild(messageEl);

        setTimeout(() => messageEl.remove(), 2000);
    }

    updateUI() {
        // Update health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        const hFill = document.getElementById('health-fill');
        const hText = document.getElementById('health-text');
        if (hFill) hFill.style.width = healthPercent + '%';
        if (hText) hText.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;

        // Low health warning border
        const vignette = document.getElementById('low-health-vignette');
        if (this.player.health < 40) {
            vignette.classList.remove('hidden', 'yellow');
            vignette.classList.add('red');
        } else if (this.player.health < 80) {
            vignette.classList.remove('hidden', 'red');
            vignette.classList.add('yellow');
        } else {
            vignette.classList.add('hidden');
            vignette.classList.remove('yellow', 'red');
        }

        // Update ammo display
        this.ui.ammo.textContent = this.player.ammo;
        // Change color based on ammo level
        const lowAmmo = document.getElementById('low-ammo-warning');
        const outOfAmmo = document.getElementById('out-of-ammo-warning');
        if (this.player.ammo === 0) {
            this.ui.ammo.style.color = '#ff0000';
            if (lowAmmo) lowAmmo.classList.remove('hidden');
            // Ensure at least 1 ammo box exists (spawn off-screen)
            const hasAmmoBox = this.powerUpManager.powerUps.some(p => p.type === 'ammo' && !p.collected);
            if (!hasAmmoBox) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 40 + Math.random() * 15;
                const pos = this.player.mesh.position.clone().add(
                    new THREE.Vector3(Math.cos(angle) * dist, Math.sin(angle) * dist, 0)
                );
                pos.x = Math.max(this.bounds.minX + 5, Math.min(this.bounds.maxX - 5, pos.x));
                pos.y = Math.max(this.bounds.minY + 5, Math.min(this.bounds.maxY - 5, pos.y));
                this.powerUpManager.spawnPowerUpAt(pos, 'ammo');
            }
            // Show "OUT OF AMMO" above player
            if (outOfAmmo) {
                outOfAmmo.classList.remove('hidden');
                const pos = this.player.mesh.position.clone();
                pos.y += 3;
                pos.project(this.camera);
                const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
                outOfAmmo.style.left = x + 'px';
                outOfAmmo.style.top = y + 'px';
            }
        } else if (this.player.ammo < 20) {
            this.ui.ammo.style.color = '#ffaa00';
            if (lowAmmo) lowAmmo.classList.remove('hidden');
            if (outOfAmmo) outOfAmmo.classList.add('hidden');
        } else {
            this.ui.ammo.style.color = '#ffa500';
            if (lowAmmo) lowAmmo.classList.add('hidden');
            if (outOfAmmo) outOfAmmo.classList.add('hidden');
        }

        // Update missile count
        const missileContainer = document.getElementById('missile-count');
        const missileText = document.getElementById('missiles');
        if (this.player.hasMissiles) {
            missileContainer.classList.remove('hidden');
            missileText.textContent = this.player.missiles;
        } else {
            missileContainer.classList.add('hidden');
        }

        // Update round display
        this.ui.round.textContent = `${this.round}/${this.maxRounds}`;

        // Update timer display (M:SS format)
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        this.ui.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Change timer color when time is running out
        if (this.currentTime < 30) {
            this.ui.timer.style.color = '#ff0000'; // Red
        } else if (this.currentTime < 60) {
            this.ui.timer.style.color = '#ffaa00'; // Orange
        } else {
            this.ui.timer.style.color = '#ff00ff'; // Purple (default)
        }

        // Show/hide shield bar
        if (this.player.shieldReserve > 0) {
            this.ui.shieldBarContainer.classList.remove('hidden');
            const shieldPercent = (this.player.shieldReserve / this.player.maxShieldReserve) * 100;
            this.ui.shieldFill.style.width = shieldPercent + '%';
            this.ui.shieldText.textContent = Math.ceil(this.player.shieldReserve) + 's';
            if (this.player.shields) {
                this.ui.shieldFill.classList.add('active');
            } else {
                this.ui.shieldFill.classList.remove('active');
            }
        } else {
            this.ui.shieldBarContainer.classList.add('hidden');
        }

        // Boss health bar
        const bossContainer = document.getElementById('boss-health-container');
        const matriarch = this.enemies.find(e => e instanceof Matriarch);
        if (matriarch) {
            bossContainer.classList.remove('hidden');
            const bossFill = document.getElementById('boss-health-fill');
            const bossText = document.getElementById('boss-health-text');
            const bossPercent = (matriarch.health / matriarch.maxHealth) * 100;
            bossFill.style.width = bossPercent + '%';
            bossText.textContent = `${Math.ceil(matriarch.health)}/${matriarch.maxHealth}`;
        } else {
            bossContainer.classList.add('hidden');
        }
    }

    updatePowerUpUI() {
        const activePowerUps = this.powerUpManager.getActivePowerUps();
        this.ui.activePowerups.innerHTML = '';

        activePowerUps.forEach(powerUp => {
            const indicator = document.createElement('div');
            indicator.className = `powerup-indicator powerup-${powerUp.type}`;
            indicator.textContent = `${powerUp.type.toUpperCase()} ${powerUp.timeLeft}s`;
            this.ui.activePowerups.appendChild(indicator);
        });
    }

    endGame() {
        this.gameOver = true;
        this.isRunning = false;

        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            this.ui.highScore.textContent = this.highScore;
        }

        // Play game over sound and stop music
        window.soundManager.playGameOver();
        window.soundManager.stopMusic();

        // Create explosion effect
        if (this.player) {
            this.particleSystem.createExplosion(
                this.player.mesh.position,
                new THREE.Color(1, 0.5, 0),
                200
            );
            this.scene.remove(this.player.mesh);
        }

        // Check if score qualifies for Hall of Fame
        if (this.qualifiesForHallOfFame(this.score)) {
            this._pendingHofEntry = { score: this.score, round: this.round, won: false };
            this.showHofNameInput('GAME OVER', '#ff4444');
        } else {
            // Save without name and show game over directly
            this.saveHallOfFame({ score: this.score, round: this.round, won: false });
            this.showGameOverScreen('GAME OVER', '#ff4444', `Round ${this.round}`);
        }
    }

    winGame() {
        this.gameOver = true;
        this.gameWon = true;
        this.isRunning = false;

        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            this.ui.highScore.textContent = this.highScore;
        }

        // Play victory sound and stop music
        window.soundManager.playWaveComplete();
        window.soundManager.stopMusic();

        // Victory always qualifies for name entry
        this._pendingHofEntry = { score: this.score, round: this.maxRounds, won: true };
        this.showHofNameInput('VICTORY!', '#00ff00');
    }

    showHofNameInput(heading, color) {
        const overlay = document.getElementById('hof-name-input');
        document.getElementById('hof-heading').textContent = heading;
        document.getElementById('hof-heading').style.color = color;
        document.getElementById('hof-score').textContent = this.score;
        overlay.classList.remove('hidden');

        const nameInput = document.getElementById('winner-name');
        nameInput.value = '';
        setTimeout(() => nameInput.focus(), 100);
    }

    showGameOverScreen(heading, color, subtitle) {
        // Clean up entities and go back to main menu
        this.cleanup();
        this.displayHallOfFame();
        this.ui.startScreen.classList.remove('hidden');
    }

    submitHofName() {
        const nameInput = document.getElementById('winner-name');
        const name = nameInput.value.trim()
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 16) || 'Anonymous';

        // Hide name input
        document.getElementById('hof-name-input').classList.add('hidden');

        // Save to Hall of Fame with name
        const entry = this._pendingHofEntry || { score: this.score, round: this.round, won: false };
        entry.name = name;
        this.saveHallOfFame(entry);

        // Show appropriate game over screen
        if (entry.won) {
            this.showGameOverScreen('VICTORY!', '#00ff00', `All ${this.maxRounds} Rounds Complete!`);
        } else {
            this.showGameOverScreen('GAME OVER', '#ff4444', `Round ${entry.round}`);
        }
    }

    activateCheat(targetRound) {
        // Play powerup sound
        window.soundManager.playPowerUp();
        this.showPowerUpMessage(`SKIP TO ROUND ${targetRound}!`);

        // Max health
        this.player.health = this.player.maxHealth;

        // 1000 ammo
        this.player.ammo = 1000;
        this.player.maxAmmo = 1000;

        // 6-shot dual weapon
        this.player.weaponBoost = true;
        this.player.dualWeapon = true;
        this.player.fireRate = 0.08;

        // Full shield
        this.player.shieldReserve = this.player.maxShieldReserve;

        // Missiles
        this.player.hasMissiles = true;
        this.player.missiles = this.player.maxMissiles;

        // Clear all current entities
        this.asteroids.forEach(a => a.destroy());
        this.enemies.forEach(e => e.destroy());
        this.mines.forEach(m => m.destroy());
        this.blackHoles.forEach(b => b.destroy());
        this.lasers.forEach(l => l.destroy());
        this.enemyLasers.forEach(l => l.destroy());
        this.playerMissiles.forEach(m => m.destroy());
        this.debris.forEach(d => d.destroy());
        this.asteroids = [];
        this.enemies = [];
        this.mines = [];
        this.blackHoles = [];
        this.lasers = [];
        this.enemyLasers = [];
        this.playerMissiles = [];
        this.debris = [];

        // Skip to target round
        window.soundManager.fadeOutMusic(1);
        this.round = targetRound;
        this.currentTime = this.roundTime;
        this.enemyWaveNumber = 0;
        this.enemyRespawnTimer = 0;
        this.roundStats = { enemiesKilled: 0, asteroidsDestroyed: 0, scoreEarned: 0, damageTaken: 0 };
        this.beginRound(targetRound - 1, { enemiesKilled: 0, asteroidsDestroyed: 0, scoreEarned: 0, damageTaken: 0 });
    }

    spawnReplacementEnemies() {
        const roundIdx = Math.max(0, Math.min(ROUND_CONFIG.length - 1, this.round - 1));
        const cfg = ROUND_CONFIG[roundIdx];
        const baseCount = Math.min(2 + Math.floor(this.round * 0.2), 4);
        const currentCount = this.enemies.filter(e => !(e instanceof Matriarch)).length;
        const count = Math.min(baseCount, 6 - currentCount);
        if (count <= 0) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 45 + Math.random() * 20;
            const position = new THREE.Vector3(
                this.player.mesh.position.x + Math.cos(angle) * distance,
                this.player.mesh.position.y + Math.sin(angle) * distance,
                0
            );

            // Keep within bounds
            position.x = Math.max(this.bounds.minX + 10, Math.min(this.bounds.maxX - 10, position.x));
            position.y = Math.max(this.bounds.minY + 10, Math.min(this.bounds.maxY - 10, position.y));

            const enemy = new EnemyShip(position, this.scene, this.player);
            enemy.currentRound = this.round;

            // Use round config stats + modest health wave bonus only
            enemy.maxSpeed = cfg.enemySpeed;
            enemy.fireRate = cfg.enemyFireRate;
            enemy.health = cfg.enemyHealth + (this.enemyWaveNumber * 10);

            this.enemies.push(enemy);
        }
    }

    animate() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.animate());

        const deltaTime = Math.min(0.016, this.clock ? this.clock.getDelta() : 0.016);
        this.update(deltaTime);

        this.renderer.render(this.scene, this.camera);
    }
}

// Add fadeUp animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeUp {
        0% {
            opacity: 0;
            transform: translate(-50%, -30%);
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -70%);
        }
    }
`;
document.head.appendChild(style);

// Generate 3D preview icons for the legend
function generateItemPreviews() {
    const size = 64;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x606060);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(2, 2, 4);
    scene.add(dir);

    function render(mesh) {
        scene.add(mesh);
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL();
        scene.remove(mesh);
        return url;
    }

    const previews = {};

    // --- Collectibles ---

    // Shield (blue octahedron + glow)
    (function() {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0),
            new THREE.MeshPhongMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }));
        g.add(m);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })));
        g.rotation.set(0.3, 0.5, 0);
        previews.shield = render(g);
    })();

    // Weapon (red octahedron + glow)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0),
            new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 })));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })));
        g.rotation.set(0.3, 0.5, 0);
        previews.weapon = render(g);
    })();

    // Speed (yellow octahedron + glow)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0),
            new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 })));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })));
        g.rotation.set(0.3, 0.5, 0);
        previews.speed = render(g);
    })();

    // Score (green octahedron + glow)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0),
            new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 })));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })));
        g.rotation.set(0.3, 0.5, 0);
        previews.score = render(g);
    })();

    // Ammo (gray box with orange stripes)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x444444, emissiveIntensity: 0.3, shininess: 100 })));
        const stripe = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 });
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.25, 1.05), stripe);
        s1.position.y = 0.25;
        g.add(s1);
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.25, 1.05), stripe);
        s2.position.y = -0.25;
        g.add(s2);
        g.rotation.set(0.3, 0.5, 0);
        previews.ammo = render(g);
    })();

    // Health (white box with pink cross)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xff00ff, emissiveIntensity: 0.4, shininess: 100 })));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 1.05),
            new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.9 })));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 1.05),
            new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.9 })));
        g.rotation.set(0.3, 0.5, 0);
        previews.health = render(g);
    })();

    // --- Hazards ---

    // Asteroid (brown icosahedron)
    (function() {
        const geo = new THREE.IcosahedronGeometry(1, 0);
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            pos[i] += (Math.random() - 0.5) * 0.2;
            pos[i+1] += (Math.random() - 0.5) * 0.2;
            pos[i+2] += (Math.random() - 0.5) * 0.2;
        }
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo,
            new THREE.MeshPhongMaterial({ color: 0x8b7355, emissive: 0x4a3929, shininess: 10, flatShading: true }));
        m.rotation.set(0.4, 0.6, 0);
        previews.asteroid = render(m);
    })();

    // Enemy ship (red octahedron + weapons)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0),
            new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x880000, shininess: 100 })));
        const wMat = new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0xff5500 });
        const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5), wMat);
        w1.position.set(0.5, 0, 0.5);
        w1.rotation.x = Math.PI / 2;
        g.add(w1);
        const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5), wMat);
        w2.position.set(-0.5, 0, 0.5);
        w2.rotation.x = Math.PI / 2;
        g.add(w2);
        g.rotation.set(0.2, 0.4, 0);
        previews.enemy = render(g);
    })();

    // Space mine (gray sphere + spikes)
    (function() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0x444444, emissive: 0xff0000, emissiveIntensity: 0.3 })));
        const spikeMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        for (let i = 0; i < 8; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), spikeMat);
            const angle = (Math.PI * 2 * i) / 8;
            spike.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
            spike.lookAt(spike.position.clone().multiplyScalar(2));
            g.add(spike);
        }
        g.rotation.set(0.3, 0.3, 0);
        previews.mine = render(g);
    })();

    // Black hole (black sphere + orange rings)
    (function() {
        camera.position.set(0, 0, 8);
        camera.lookAt(0, 0, 0);
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0x000000 })));
        g.add(new THREE.Mesh(new THREE.RingGeometry(1, 1.5, 64),
            new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.4, side: THREE.DoubleSide })));
        g.add(new THREE.Mesh(new THREE.RingGeometry(1.5, 2.5, 64),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3, side: THREE.DoubleSide })));
        g.rotation.set(0.5, 0, 0);
        previews.blackhole = render(g);
        camera.position.set(0, 0, 4);
        camera.lookAt(0, 0, 0);
    })();

    renderer.dispose();
    return previews;
}

// Initialize game
const game = new Game();
game.clock = new THREE.Clock();

// Generate and apply 3D previews to start screen
const itemPreviews = generateItemPreviews();
game.itemPreviews = itemPreviews;

// Replace emoji icons with rendered 3D previews
document.querySelectorAll('.item-icon').forEach(el => {
    const classes = el.className.split(' ');
    for (const cls of classes) {
        const key = cls.replace('icon-', '');
        if (itemPreviews[key]) {
            const img = document.createElement('img');
            img.src = itemPreviews[key];
            img.alt = el.nextElementSibling ? el.nextElementSibling.textContent : key;
            img.style.width = '100%';
            img.style.height = '100%';
            el.textContent = '';
            el.appendChild(img);
            break;
        }
    }
});