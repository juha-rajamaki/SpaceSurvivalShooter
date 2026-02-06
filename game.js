// Main game controller

class Game {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.round = 1;
        this.maxRounds = 10;
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
        this._cheatCode = ['k', 'e', 'n'];

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

        // Round configuration
        this.roundConfig = {
            asteroidCount: 3,
            enemyCount: 0,
            mineCount: 0,
            blackHoleCount: 0
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
                if (this._cheatBuffer.length > this._cheatCode.length) {
                    this._cheatBuffer.shift();
                }
                if (this._cheatBuffer.length === this._cheatCode.length &&
                    this._cheatBuffer.every((k, i) => k === this._cheatCode[i])) {
                    this._cheatBuffer = [];
                    this.activateCheat();
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
                case 'm':
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
                case 'm':
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
                .map(e => ({ score: Math.max(0, e.score), round: Math.max(1, Math.min(10, e.round)), won: Boolean(e.won) }))
                .slice(0, 10);
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
            won: Boolean(entry.won)
        };
        const hof = this.loadHallOfFame();
        hof.push(sanitized);
        hof.sort((a, b) => b.score - a.score);
        const top10 = hof.slice(0, 10);
        try {
            localStorage.setItem('spaceShooterHallOfFame', JSON.stringify(top10));
        } catch (e) { /* quota exceeded */ }
        return top10;
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

            const score = document.createElement('span');
            score.className = 'hof-score';
            score.textContent = entry.score.toLocaleString();

            const round = document.createElement('span');
            round.className = 'hof-round';
            round.textContent = entry.won ? 'Victory!' : `Died R${entry.round}`;

            row.appendChild(rank);
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

        // Refresh Hall of Fame
        this.displayHallOfFame();

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
        // Calculate round difficulty - More action from the start!
        this.roundConfig.asteroidCount = 12 + Math.floor(this.round * 1.2);

        // Enemies from round 1!
        this.roundConfig.enemyCount = 2 + Math.floor(this.round * 0.8);

        // Mines from round 4
        if (this.round >= 4) {
            this.roundConfig.mineCount = Math.floor((this.round - 3) * 0.5) + 1;
        } else {
            this.roundConfig.mineCount = 0;
        }

        // Black holes from round 7
        if (this.round >= 7) {
            this.roundConfig.blackHoleCount = Math.floor((this.round - 6) * 0.3) + 1;
        } else {
            this.roundConfig.blackHoleCount = 0;
        }

        // Huge asteroids from round 5
        if (this.round >= 5) {
            this.roundConfig.hugeAsteroidCount = Math.floor((this.round - 4) * 0.5) + 1;
        } else {
            this.roundConfig.hugeAsteroidCount = 0;
        }

        // Show round transition overlay (skip round 1 — player just clicked Start)
        if (this.round > 1) {
            this.showRoundTransition(this.round, this.roundConfig);
        }

        // Spawn huge asteroids (round 5+)
        for (let i = 0; i < this.roundConfig.hugeAsteroidCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );
            if (position.length() > 20) {
                this.asteroids.push(new Asteroid(position, 'huge', this.scene));
            }
        }

        // Spawn asteroids
        for (let i = 0; i < this.roundConfig.asteroidCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );

            // Don't spawn too close to player
            if (position.length() > 10) {
                // Weight asteroid sizes to favor large asteroids
                const random = Math.random();
                let size;
                if (random < 0.5) {
                    size = 'large';    // 50% chance
                } else if (random < 0.8) {
                    size = 'medium';   // 30% chance
                } else {
                    size = 'small';    // 20% chance
                }
                this.asteroids.push(new Asteroid(position, size, this.scene));
            }
        }

        // Spawn enemies
        for (let i = 0; i < this.roundConfig.enemyCount; i++) {
            const angle = (Math.PI * 2 * i) / this.roundConfig.enemyCount;
            const position = new THREE.Vector3(
                Math.cos(angle) * 30,
                Math.sin(angle) * 20,
                0
            );
            const enemy = new EnemyShip(position, this.scene, this.player);
            enemy.currentRound = this.round;  // Pass round info to enemy
            this.enemies.push(enemy);
        }

        // Spawn mines
        for (let i = 0; i < this.roundConfig.mineCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width * 0.7,
                (Math.random() - 0.5) * this.bounds.height * 0.7,
                0
            );
            this.mines.push(new SpaceMine(position, this.scene));
        }

        // Spawn black holes
        for (let i = 0; i < this.roundConfig.blackHoleCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width * 0.5,
                (Math.random() - 0.5) * this.bounds.height * 0.5,
                0
            );
            this.blackHoles.push(new BlackHole(position, this.scene));
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
            this.spawnEnemyRound(completedRound, completedStats);
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
                // Matriarch returns array of lasers, EnemyShip returns single laser
                if (Array.isArray(result)) {
                    this.enemyLasers.push(...result);
                } else {
                    this.enemyLasers.push(result);
                }
                window.soundManager.playEnemyLaser();
            }
            this.physics.updatePosition(enemy, deltaTime);
            this.physics.keepInBounds(enemy, this.bounds);
        });

        // Enemy respawning - when all regular enemies are destroyed, spawn tougher ones
        const regularEnemies = this.enemies.filter(e => !(e instanceof Matriarch));
        if (regularEnemies.length === 0 && !this.isPaused && !this.gameOver) {
            this.enemyRespawnTimer += deltaTime;
            if (this.enemyRespawnTimer >= 3) {
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

        // Save to Hall of Fame
        this.saveHallOfFame({ score: this.score, round: this.round, won: false });

        // Show game over screen
        this.ui.gameOver.classList.remove('hidden');
        this.ui.gameOver.querySelector('h1').textContent = 'GAME OVER';
        this.ui.gameOver.querySelector('h1').style.color = '#ff0000';
        this.ui.finalScore.textContent = this.score;

        // Show round reached
        this.ui.finalWave.textContent = `Round ${this.round}`;

        // Focus Play Again button
        document.getElementById('restart-btn').focus();

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

        // Save to Hall of Fame
        this.saveHallOfFame({ score: this.score, round: this.maxRounds, won: true });

        // Show victory screen
        this.ui.gameOver.classList.remove('hidden');
        this.ui.gameOver.querySelector('h1').textContent = 'VICTORY!';
        this.ui.gameOver.querySelector('h1').style.color = '#00ff00';
        this.ui.finalScore.textContent = this.score;
        this.ui.finalWave.textContent = `All ${this.maxRounds} Rounds Complete!`;

        // Focus Play Again button
        document.getElementById('restart-btn').focus();

        // Play victory sound and stop music
        window.soundManager.playWaveComplete();
        window.soundManager.stopMusic();
    }

    spawnEnemyRound(completedRound, completedStats) {
        // Update powerup manager round
        this.powerUpManager.currentRound = this.round;

        // Calculate number of enemies with difficulty scaling
        const baseEnemies = 2;
        const enemyCount = baseEnemies + Math.floor(this.round * 0.8);

        // Calculate asteroid count - increases each round
        const asteroidCount = 8 + Math.floor(this.round * 2);

        // Huge asteroids from round 5
        const hugeAsteroidCount = this.round >= 5 ? Math.floor((this.round - 4) * 0.5) + 1 : 0;

        // Mines from round 4
        const mineCount = this.round >= 4 ? Math.floor((this.round - 3) * 0.5) + 1 : 0;

        // Black holes from round 7
        const blackHoleCount = this.round >= 7 ? Math.floor((this.round - 6) * 0.3) + 1 : 0;

        // Matriarch on round 10
        const matriarchCount = this.round === 10 ? 1 : 0;

        // Show round transition (pauses the game)
        this.showRoundTransition(this.round, {
            asteroidCount: asteroidCount,
            hugeAsteroidCount: hugeAsteroidCount,
            enemyCount: enemyCount,
            mineCount: mineCount,
            blackHoleCount: blackHoleCount,
            matriarchCount: matriarchCount
        }, completedRound, completedStats);

        // Spawn huge asteroids (round 5+)
        for (let i = 0; i < hugeAsteroidCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );
            if (position.distanceTo(this.player.mesh.position) > 20) {
                this.asteroids.push(new Asteroid(position, 'huge', this.scene));
            }
        }

        // Spawn asteroids - more and larger as rounds progress
        const largeBias = Math.min(0.7, 0.4 + this.round * 0.03); // Large chance grows per round
        for (let i = 0; i < asteroidCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );

            // Don't spawn too close to player
            if (position.distanceTo(this.player.mesh.position) > 15) {
                const random = Math.random();
                let size;
                if (random < largeBias) {
                    size = 'large';
                } else if (random < largeBias + 0.2) {
                    size = 'medium';
                } else {
                    size = 'small';
                }
                this.asteroids.push(new Asteroid(position, size, this.scene));
            }
        }

        // Spawn enemies in a circle pattern
        for (let i = 0; i < enemyCount; i++) {
            const angle = (Math.PI * 2 * i) / enemyCount;
            const distance = 40 + Math.random() * 20; // Random distance
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                0
            );

            const enemy = new EnemyShip(position, this.scene, this.player);
            enemy.currentRound = this.round;

            // Difficulty scaling
            enemy.maxSpeed = 30 + (this.round * 2); // +2 speed per round
            enemy.fireRate = Math.max(0.3, 0.8 - (this.round * 0.05)); // Faster shooting
            enemy.health = 50 + (this.round * 5); // +5 health per round

            this.enemies.push(enemy);
        }

        // Spawn mines
        for (let i = 0; i < mineCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width * 0.7,
                (Math.random() - 0.5) * this.bounds.height * 0.7,
                0
            );
            this.mines.push(new SpaceMine(position, this.scene));
        }

        // Spawn black holes
        for (let i = 0; i < blackHoleCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width * 0.5,
                (Math.random() - 0.5) * this.bounds.height * 0.5,
                0
            );
            this.blackHoles.push(new BlackHole(position, this.scene));
        }

        // Spawn Matriarch boss on round 10
        if (matriarchCount > 0) {
            const matriarchPos = new THREE.Vector3(0, 50, 0);
            const matriarch = new Matriarch(matriarchPos, this.scene, this.player);
            this.enemies.push(matriarch);
        }
    }

    activateCheat() {
        // Play powerup sound
        window.soundManager.playPowerUp();
        this.showPowerUpMessage('CHEAT ACTIVATED!');

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

        // Skip to round 10
        window.soundManager.fadeOutMusic(1);
        this.round = 10;
        this.currentTime = this.roundTime;
        this.enemyWaveNumber = 0;
        this.enemyRespawnTimer = 0;
        this.roundStats = { enemiesKilled: 0, asteroidsDestroyed: 0, scoreEarned: 0, damageTaken: 0 };
        this.spawnEnemyRound(9, { enemiesKilled: 0, asteroidsDestroyed: 0, scoreEarned: 0, damageTaken: 0 });
    }

    spawnReplacementEnemies() {
        const baseCount = 2 + Math.floor(this.round * 0.5);
        const cappedWave = Math.min(this.enemyWaveNumber, 8);
        const currentCount = this.enemies.filter(e => !(e instanceof Matriarch)).length;
        const count = Math.min(baseCount + cappedWave, 20 - currentCount);
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

            // Scale difficulty with round and wave number
            const waveBonus = this.enemyWaveNumber * 3;
            enemy.maxSpeed = 30 + (this.round * 2) + waveBonus;
            enemy.fireRate = Math.max(0.25, 0.8 - (this.round * 0.05) - (this.enemyWaveNumber * 0.03));
            enemy.health = 50 + (this.round * 5) + (this.enemyWaveNumber * 10);

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