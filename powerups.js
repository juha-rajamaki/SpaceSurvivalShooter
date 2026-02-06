// Power-up system

class PowerUp {
    constructor(position, type, scene) {
        this.scene = scene;
        this.type = type; // 'shield', 'weapon', 'speed', 'multiplier'
        this.radius = 0.8;
        this.collected = false;

        // Set properties based on type
        const config = {
            shield: { color: 0x00aaff, icon: '🛡️', duration: 15 },
            weapon: { color: 0xff0000, icon: '🔫', duration: 45 },
            speed: { color: 0xffff00, icon: '⚡', duration: 10 },
            score: { color: 0x00ff00, icon: '⭐', scoreValue: 150 },
            ammo: { color: 0xffaa00, icon: '💥', ammoValue: 100 },
            health: { color: 0xff00ff, icon: '❤️' },
            dualweapon: { color: 0xff4400, icon: '🔥' },
            missile: { color: 0xff2200, icon: '🚀', missileCount: 5 }
        };

        this.config = config[type];

        // Create power-up mesh - different appearance for special types
        if (type === 'health') {
            // Health box - white box with pink cross
            const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
            const boxMaterial = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.4,
                shininess: 100,
                specular: 0xffffff
            });
            this.mesh = new THREE.Mesh(boxGeometry, boxMaterial);
            this.mesh.position.copy(position);

            // Cross horizontal bar
            const crossH = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.25, 1.05),
                new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.9 })
            );
            this.mesh.add(crossH);

            // Cross vertical bar
            const crossV = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.8, 1.05),
                new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.9 })
            );
            this.mesh.add(crossV);

            // Strong glow
            const glowGeometry = new THREE.SphereGeometry(1, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.2
            });
            this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
            this.mesh.add(this.glow);

            this.core = null;
            this.stripe1 = null;
            this.stripe2 = null;
        } else if (type === 'ammo') {
            // Create metal ammo box
            const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const boxMaterial = new THREE.MeshPhongMaterial({
                color: 0x888888,
                emissive: 0x444444,
                emissiveIntensity: 0.3,
                shininess: 100,
                specular: 0xffffff
            });
            this.mesh = new THREE.Mesh(boxGeometry, boxMaterial);
            this.mesh.position.copy(position);

            // Add warning stripes
            const stripeGeometry = new THREE.BoxGeometry(0.85, 0.2, 0.85);
            const stripeMaterial = new THREE.MeshBasicMaterial({
                color: this.config.color,
                transparent: true,
                opacity: 0.9
            });
            this.stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
            this.stripe1.position.y = 0.2;
            this.mesh.add(this.stripe1);

            this.stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial);
            this.stripe2.position.y = -0.2;
            this.mesh.add(this.stripe2);

            // Add glow for ammo
            const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: this.config.color,
                transparent: true,
                opacity: 0.15
            });
            this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
            this.mesh.add(this.glow);

            this.core = null; // No core for ammo boxes
        } else {
            // Standard powerup appearance
            const geometry = new THREE.OctahedronGeometry(0.5, 0);
            const material = new THREE.MeshPhongMaterial({
                color: this.config.color,
                emissive: this.config.color,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.copy(position);

            // Outer glow
            const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: this.config.color,
                transparent: true,
                opacity: 0.2
            });
            this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
            this.mesh.add(this.glow);

            // Inner core - use MeshPhongMaterial so we can animate emissive
            const coreGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const coreMaterial = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 0.5
            });
            this.core = new THREE.Mesh(coreGeometry, coreMaterial);
            this.mesh.add(this.core);
        }

        scene.add(this.mesh);

        this.rotationSpeed = 2;
        this.bobSpeed = 2;
        this.bobAmount = 0.5;
        this.initialY = position.y;
        this.time = 0;
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Rotation - slower for ammo boxes
        if (this.type === 'ammo') {
            this.mesh.rotation.y += this.rotationSpeed * 0.3 * deltaTime;
        } else {
            this.mesh.rotation.y += this.rotationSpeed * deltaTime;
            this.mesh.rotation.x += this.rotationSpeed * 0.5 * deltaTime;
        }

        // Bobbing motion
        this.mesh.position.y = this.initialY + Math.sin(this.time * this.bobSpeed) * this.bobAmount;

        // Pulsing glow
        const pulse = Math.sin(this.time * 3) * 0.2 + 1;
        this.glow.scale.setScalar(pulse);

        if (this.type === 'ammo') {
            // Pulsing stripes for ammo boxes
            const stripePulse = Math.sin(this.time * 4) * 0.3 + 0.7;
            if (this.stripe1) this.stripe1.material.opacity = stripePulse;
            if (this.stripe2) this.stripe2.material.opacity = stripePulse;
        } else {
            this.mesh.material.emissiveIntensity = 0.5 + Math.sin(this.time * 4) * 0.3;
        }

        // Sparkle effect on core (only for non-ammo powerups)
        if (this.core) {
            this.core.material.emissiveIntensity = Math.abs(Math.sin(this.time * 10));
        }
    }

    apply(player) {
        switch (this.type) {
            case 'shield':
                // Add 30s to shield reserve
                player.shieldReserve = Math.min(player.shieldReserve + 30, player.maxShieldReserve);
                return {
                    message: 'SHIELD +30s (Hold SHIFT to use)',
                    type: 'shield'
                };

            case 'weapon':
                if (player.weaponBoost) {
                    // Already has triple — upgrade to 6-shot dual fire
                    player.dualWeapon = true;
                    player.fireRate = 0.08;
                    player.ammo = Math.min(player.ammo + 100, player.maxAmmo);
                    return {
                        message: '6-SHOT DUAL FIRE +100 AMMO',
                        type: 'dualweapon'
                    };
                }
                player.weaponBoost = true;
                player.fireRate = 0.08;
                player.ammo = Math.min(player.ammo + 100, player.maxAmmo);
                return {
                    message: 'TRIPLE SHOT +100 AMMO',
                    type: 'weapon'
                };

            case 'speed':
                player.speedBoost = true;
                player.maxSpeed = 60; // 1.5x speed
                player.accelerationForce = 120; // Much faster acceleration!
                return {
                    message: 'SPEED BOOST',
                    duration: this.config.duration,
                    type: 'speed'
                };

            case 'score':
                // Instant score bonus - no duration needed
                return {
                    message: `+${this.config.scoreValue} POINTS`,
                    scoreValue: this.config.scoreValue,
                    type: 'score'
                };

            case 'ammo':
                // Instant ammo refill - no duration needed
                player.ammo = Math.min(player.ammo + this.config.ammoValue, player.maxAmmo);
                return {
                    message: `+${this.config.ammoValue} AMMO`,
                    ammoValue: this.config.ammoValue,
                    type: 'ammo'
                };

            case 'health':
                // Full health restore
                player.health = player.maxHealth;
                return {
                    message: 'FULL HEALTH RESTORED',
                    type: 'health'
                };

            case 'dualweapon':
                // Permanent 6-shot (triple both directions)
                player.weaponBoost = true;
                player.dualWeapon = true;
                player.fireRate = 0.08;
                player.ammo = Math.min(player.ammo + 100, player.maxAmmo);
                return {
                    message: '6-SHOT DUAL FIRE +100 AMMO',
                    type: 'dualweapon'
                };

            case 'missile':
                // Add missiles
                player.hasMissiles = true;
                player.missiles = Math.min(player.missiles + this.config.missileCount, player.maxMissiles);
                return {
                    message: `+${this.config.missileCount} MISSILES (Press M)`,
                    type: 'missile'
                };
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class PowerUpManager {
    constructor(scene) {
        this.scene = scene;
        this.powerUps = [];
        this.activePowerUps = [];
        this.spawnTimer = 0;
        this.spawnInterval = 15; // Spawn every 15 seconds - less frequent
        this.currentRound = 1;
    }

    update(deltaTime, player, bounds) {
        // Update spawn timer
        this.spawnTimer += deltaTime;

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnPowerUp(bounds);
        }

        // Update existing power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);

            // Check collection
            if (!powerUp.collected && player && player.mesh) {
                const distance = powerUp.mesh.position.distanceTo(player.mesh.position);
                if (distance < powerUp.radius + player.radius) {
                    const effect = powerUp.apply(player);

                    // Only add to active powerups if it has a duration and isn't stored
                    if (effect.duration && !effect.stored) {
                        this.activePowerUps.push({
                            type: effect.type,
                            duration: effect.duration,
                            timeLeft: effect.duration,
                            message: effect.message
                        });
                    }

                    powerUp.destroy();
                    this.powerUps.splice(i, 1);

                    // Return effect for UI update
                    return effect;
                }
            }
        }

        // Update active power-ups
        for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
            const active = this.activePowerUps[i];
            active.timeLeft -= deltaTime;

            if (active.timeLeft <= 0) {
                // Deactivate power-up
                this.deactivatePowerUp(active.type, player);
                this.activePowerUps.splice(i, 1);
            }
        }

        return null;
    }

    spawnPowerUp(bounds) {
        const random = Math.random();
        let type;

        // Build available types based on current round
        if (this.currentRound >= 7 && random < 0.08) {
            type = 'missile';      // 8% chance (R7+)
        } else if (this.currentRound >= 5 && random < 0.12) {
            type = 'dualweapon';   // ~4% chance (R5+)
        } else if (random < 0.10) {
            type = 'health';       // 10% chance
        } else if (random < 0.20) {
            type = 'weapon';       // 10% chance
        } else if (random < 0.23) {
            type = 'shield';       // 3% chance
        } else if (random < 0.33) {
            type = 'speed';        // 10% chance
        } else if (random < 0.58) {
            type = 'ammo';         // 25% chance
        } else {
            type = 'score';        // rest
        }

        const position = new THREE.Vector3(
            (Math.random() - 0.5) * bounds.width * 0.8,
            (Math.random() - 0.5) * bounds.height * 0.8,
            0
        );

        const powerUp = new PowerUp(position, type, this.scene);
        this.powerUps.push(powerUp);
    }

    spawnPowerUpAt(position, type) {
        // Spawn a specific powerup type at a specific position
        const powerUp = new PowerUp(position, type, this.scene);
        this.powerUps.push(powerUp);
    }

    deactivatePowerUp(type, player) {
        switch (type) {
            case 'shield':
                // Shield is now hold-to-use, handled in game.js
                break;
            case 'weapon':
                player.weaponBoost = false;
                player.fireRate = 0.15;  // Back to new base rate
                break;
            case 'speed':
                player.speedBoost = false;
                player.maxSpeed = 40;  // Back to new base speed
                player.accelerationForce = 75;  // Back to new base acceleration
                break;
        }
    }

    activateShield(player) {
        // Shield is now hold-to-use, handled in game.js update loop
        return false;
    }

    getActivePowerUps() {
        return this.activePowerUps.map(p => ({
            type: p.type,
            timeLeft: Math.ceil(p.timeLeft)
        }));
    }

    reset() {
        // Clear all power-ups
        this.powerUps.forEach(p => p.destroy());
        this.powerUps = [];
        this.activePowerUps = [];
        this.spawnTimer = 0;
    }
}