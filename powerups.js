// Power-up system

class PowerUp {
    constructor(position, type, scene) {
        this.scene = scene;
        this.type = type; // 'shield', 'weapon', 'speed', 'multiplier'
        this.radius = 0.8;
        this.collected = false;

        // Set properties based on type
        const config = {
            shield: { color: 0x00aaff, icon: '🛡️', duration: 10 },
            weapon: { color: 0xff0000, icon: '🔫', duration: 15 },
            speed: { color: 0xffff00, icon: '⚡', duration: 10 },
            multiplier: { color: 0x00ff00, icon: '2x', duration: 20 }
        };

        this.config = config[type];

        // Create power-up mesh
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

        // Inner core
        const coreGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });
        this.core = new THREE.Mesh(coreGeometry, coreMaterial);
        this.mesh.add(this.core);

        scene.add(this.mesh);

        this.rotationSpeed = 2;
        this.bobSpeed = 2;
        this.bobAmount = 0.5;
        this.initialY = position.y;
        this.time = 0;
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Rotation
        this.mesh.rotation.y += this.rotationSpeed * deltaTime;
        this.mesh.rotation.x += this.rotationSpeed * 0.5 * deltaTime;

        // Bobbing motion
        this.mesh.position.y = this.initialY + Math.sin(this.time * this.bobSpeed) * this.bobAmount;

        // Pulsing glow
        const pulse = Math.sin(this.time * 3) * 0.2 + 1;
        this.glow.scale.setScalar(pulse);
        this.mesh.material.emissiveIntensity = 0.5 + Math.sin(this.time * 4) * 0.3;

        // Sparkle effect on core
        this.core.material.emissiveIntensity = Math.abs(Math.sin(this.time * 10));
    }

    apply(player) {
        switch (this.type) {
            case 'shield':
                player.shields = true;
                return {
                    message: 'SHIELDS ACTIVATED',
                    duration: this.config.duration,
                    type: 'shield'
                };

            case 'weapon':
                player.weaponBoost = true;
                player.fireRate = 0.08; // Even faster firing!
                return {
                    message: 'TRIPLE SHOT',
                    duration: this.config.duration,
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

            case 'multiplier':
                player.scoreMultiplier = 2;
                return {
                    message: 'SCORE x2',
                    duration: this.config.duration,
                    type: 'multiplier'
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
        this.spawnInterval = 5; // Spawn every 5 seconds - more action!
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
                    this.activePowerUps.push({
                        type: effect.type,
                        duration: effect.duration,
                        timeLeft: effect.duration,
                        message: effect.message
                    });

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
        const types = ['shield', 'weapon', 'speed', 'multiplier'];
        const type = types[Math.floor(Math.random() * types.length)];

        const position = new THREE.Vector3(
            (Math.random() - 0.5) * bounds.width * 0.8,
            (Math.random() - 0.5) * bounds.height * 0.8,
            0
        );

        const powerUp = new PowerUp(position, type, this.scene);
        this.powerUps.push(powerUp);
    }

    deactivatePowerUp(type, player) {
        switch (type) {
            case 'shield':
                player.shields = false;
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
            case 'multiplier':
                player.scoreMultiplier = 1;
                break;
        }
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