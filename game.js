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
        this.enemyRespawnDelay = 20; // Seconds after enemies cleared
        this.timeSinceEnemiesCleared = 0;
        this.allEnemiesCleared = false;
        this.gameWon = false;

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
            fire: false
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
            switch (e.key.toLowerCase()) {
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
                    // Activate shield if available
                    if (this.player && this.player.hasShieldAvailable) {
                        const activated = this.powerUpManager.activateShield(this.player);
                        if (activated) {
                            this.showPowerUpMessage('SHIELD ACTIVATED');
                            window.soundManager.playPowerUp();
                            this.updatePowerUpUI();
                        }
                    }
                    break;
                case 'p':
                    this.togglePause();
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
            shieldAvailable: document.getElementById('shield-available'),
            activePowerups: document.getElementById('active-powerups'),
            startScreen: document.getElementById('start-screen'),
            gameOver: document.getElementById('game-over'),
            finalScore: document.getElementById('final-score'),
            finalWave: document.getElementById('final-wave'),
            highScore: document.getElementById('high-score')
        };

        // Display high score on start screen
        this.ui.highScore.textContent = this.highScore;
    }

    loadHighScore() {
        const saved = localStorage.getItem('spaceShooterHighScore');
        return saved ? parseInt(saved, 10) : 0;
    }

    saveHighScore() {
        localStorage.setItem('spaceShooterHighScore', this.highScore.toString());
    }

    startGame() {
        this.ui.startScreen.classList.add('hidden');
        this.isRunning = true;

        // Start background music
        window.soundManager.startMusic();
        this.gameOver = false;
        this.gameWon = false;
        this.score = 0;
        this.round = 1;
        this.currentTime = this.roundTime; // Reset timer to 2 minutes
        this.allEnemiesCleared = false;
        this.timeSinceEnemiesCleared = 0;

        // Create player
        this.player = new PlayerShuttle(this.scene);

        // Start first round
        this.startRound();

        // Start game loop
        this.animate();
    }

    restartGame() {
        // Clean up existing entities
        this.cleanup();

        // Reset UI
        this.ui.gameOver.classList.add('hidden');

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

        if (this.player) {
            this.scene.remove(this.player.mesh);
        }

        this.asteroids = [];
        this.enemies = [];
        this.mines = [];
        this.blackHoles = [];
        this.lasers = [];
        this.enemyLasers = [];

        this.powerUpManager.reset();
    }

    startRound() {
        // Calculate round difficulty - More action from the start!
        this.roundConfig.asteroidCount = 5 + Math.floor(this.round * 0.7);

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

        // Spawn asteroids
        for (let i = 0; i < this.roundConfig.asteroidCount; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * this.bounds.width,
                (Math.random() - 0.5) * this.bounds.height,
                0
            );

            // Don't spawn too close to player
            if (position.length() > 10) {
                const sizes = ['large', 'medium', 'small'];
                const size = sizes[Math.floor(Math.random() * sizes.length)];
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


    togglePause() {
        if (!this.isRunning || this.gameOver) return;
        this.isPaused = !this.isPaused;
    }

    update(deltaTime) {
        if (!this.isRunning || this.isPaused || this.gameOver) return;

        const currentTime = Date.now() * 0.001;

        // Update round timer
        this.currentTime -= deltaTime;
        if (this.currentTime <= 0) {
            this.currentTime = 0;
            this.endGame(); // Time ran out - player failed the round
            return;
        }

        // Check for round completion and next round
        if (this.enemies.length === 0) {
            if (!this.allEnemiesCleared) {
                this.allEnemiesCleared = true;
                this.timeSinceEnemiesCleared = 0;
            }

            this.timeSinceEnemiesCleared += deltaTime;

            if (this.timeSinceEnemiesCleared >= this.enemyRespawnDelay) {
                // Move to next round
                this.round++;

                if (this.round > this.maxRounds) {
                    this.winGame(); // Completed all 10 rounds!
                    return;
                }

                // Reset timer for new round
                this.currentTime = this.roundTime;
                this.spawnEnemyRound();
                this.allEnemiesCleared = false;
            }
        } else {
            this.allEnemiesCleared = false;
        }

        // Update player
        if (this.player) {
            // Handle player update and firing first to get acceleration
            const newLasers = this.player.update(deltaTime, this.input, currentTime);
            if (newLasers) {
                this.lasers.push(...newLasers);
                window.soundManager.playLaser();
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
            const laser = enemy.update(deltaTime, currentTime);
            if (laser) {
                this.enemyLasers.push(laser);
                window.soundManager.playEnemyLaser();
            }
            this.physics.updatePosition(enemy, deltaTime);
            this.physics.keepInBounds(enemy, this.bounds);
        });

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
                    const damage = Math.max(0, 50 - distance * 5);
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
                    // Damage asteroid
                    if (this.asteroids[j].takeDamage(this.lasers[i].damage)) {
                        // Asteroid destroyed
                        this.particleSystem.createExplosion(
                            this.asteroids[j].mesh.position,
                            new THREE.Color(0.5, 0.3, 0.2),
                            30
                        );
                        window.soundManager.playExplosion(this.asteroids[j].size);

                        // Drop score collectibles based on asteroid size
                        const asteroidPos = this.asteroids[j].mesh.position.clone();
                        let dropCount = 0;

                        if (this.asteroids[j].size === 'large') {
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
                            this.powerUpManager.spawnPowerUpAt(
                                asteroidPos.clone().add(offset),
                                'score'
                            );
                        }

                        // Create fragments
                        const fragments = this.asteroids[j].break();

                        // Add score based on asteroid size
                        const asteroidScore = this.asteroids[j].size === 'large' ? 100 :
                                            this.asteroids[j].size === 'medium' ? 75 : 50;

                        this.asteroids.splice(j, 1);
                        this.asteroids.push(...fragments);

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
                    // Damage enemy
                    if (this.enemies[j].takeDamage(this.lasers[i].damage)) {
                        // Enemy destroyed
                        this.particleSystem.createExplosion(
                            this.enemies[j].mesh.position,
                            new THREE.Color(1, 0.5, 0),
                            50
                        );
                        window.soundManager.playExplosion('medium');

                        this.enemies[j].destroy();
                        this.enemies.splice(j, 1);
                        this.addScore(200);
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
        this.asteroids.forEach(asteroid => {
            if (this.physics.checkCollision(this.player, asteroid)) {
                this.physics.bounceObjects(this.player, asteroid);
                this.damagePlayer(20);
            }
        });

        // Player vs enemies
        this.enemies.forEach(enemy => {
            if (this.physics.checkCollision(this.player, enemy)) {
                this.physics.bounceObjects(this.player, enemy);
                this.damagePlayer(30);
            }
        });

        // Player vs black holes
        this.blackHoles.forEach(blackHole => {
            const distance = this.player.mesh.position.distanceTo(blackHole.mesh.position);
            if (distance < blackHole.radius) {
                this.damagePlayer(100); // Instant death
            }
        });
    }

    damagePlayer(amount) {
        if (this.player.takeDamage(amount)) {
            this.endGame();
        } else {
            window.soundManager.playHit();
            // Flash effect
            this.player.mesh.traverse(child => {
                if (child.material) {
                    const originalEmissive = child.material.emissive.clone();
                    child.material.emissive.setHex(0xff0000);
                    setTimeout(() => {
                        child.material.emissive = originalEmissive;
                    }, 100);
                }
            });
        }
    }

    addScore(points) {
        this.score += points;
        this.ui.score.textContent = this.score;
    }

    showPowerUpMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
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
        this.ui.healthFill.style.width = healthPercent + '%';
        this.ui.healthText.textContent = `${Math.ceil(this.player.health)}/${this.player.maxHealth}`;

        // Update ammo display
        this.ui.ammo.textContent = this.player.ammo;
        // Change color based on ammo level
        if (this.player.ammo === 0) {
            this.ui.ammo.style.color = '#ff0000'; // Red when empty
        } else if (this.player.ammo < 20) {
            this.ui.ammo.style.color = '#ffaa00'; // Orange when low
        } else {
            this.ui.ammo.style.color = '#ffffff'; // White when normal
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

        // Show/hide shield available indicator
        if (this.player.hasShieldAvailable) {
            this.ui.shieldAvailable.classList.remove('hidden');
        } else {
            this.ui.shieldAvailable.classList.add('hidden');
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

        // Show game over screen
        this.ui.gameOver.classList.remove('hidden');
        this.ui.gameOver.querySelector('h1').textContent = 'GAME OVER';
        this.ui.gameOver.querySelector('h1').style.color = '#ff0000';
        this.ui.finalScore.textContent = this.score;

        // Show round reached
        this.ui.finalWave.textContent = `Round ${this.round}`;

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

        // Show victory screen
        this.ui.gameOver.classList.remove('hidden');
        this.ui.gameOver.querySelector('h1').textContent = 'VICTORY!';
        this.ui.gameOver.querySelector('h1').style.color = '#00ff00';
        this.ui.finalScore.textContent = this.score;
        this.ui.finalWave.textContent = `All ${this.maxRounds} Rounds Complete!`;

        // Play victory sound and stop music
        window.soundManager.playWaveComplete();
        window.soundManager.stopMusic();
    }

    spawnEnemyRound() {
        // Calculate number of enemies with difficulty scaling
        const baseEnemies = 2;
        const enemyCount = baseEnemies + Math.floor(this.round * 0.8);

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

// Initialize game
const game = new Game();
game.clock = new THREE.Clock();