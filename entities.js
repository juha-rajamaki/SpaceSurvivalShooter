// Game entities: Player, Asteroids, Enemies, etc.

class PlayerShuttle {
    constructor(scene) {
        this.scene = scene;
        this.health = 100;
        this.maxHealth = 100;
        this.radius = 1;
        this.mass = 1;
        this.maxSpeed = 40;  // Increased from 30
        this.accelerationForce = 75;  // Increased from 50 - more responsive!
        this.rotationSpeed = 2;

        // Create shuttle geometry
        const group = new THREE.Group();

        // Main body (cone shape)
        const bodyGeometry = new THREE.ConeGeometry(0.5, 2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            emissive: 0x004488,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        // Wings
        const wingGeometry = new THREE.BoxGeometry(3, 0.1, 1);
        const wingMaterial = new THREE.MeshPhongMaterial({
            color: 0x00aaff,
            emissive: 0x005588
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.z = -0.5;
        group.add(wings);

        // Engine
        const engineGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.5);
        const engineMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4400,
            emissive: 0xff2200,
            emissiveIntensity: 2
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.rotation.x = Math.PI / 2;
        engine.position.z = -1;
        group.add(engine);
        this.engine = engine;

        this.mesh = group;
        scene.add(this.mesh);

        // Physics
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);

        // Weapons
        this.canFire = true;
        this.fireRate = 0.15; // Faster shooting! (was 0.2)
        this.lastFireTime = 0;
        this.weaponLevel = 1;

        // Power-ups
        this.shields = false;
        this.speedBoost = false;
        this.weaponBoost = false;
        this.scoreMultiplier = 1;
    }

    update(deltaTime, input, currentTime) {
        // Handle input
        const acc = new THREE.Vector3(0, 0, 0);

        if (input.left) {
            acc.x -= this.accelerationForce;
            this.mesh.rotation.z = 0.2;
        } else if (input.right) {
            acc.x += this.accelerationForce;
            this.mesh.rotation.z = -0.2;
        } else {
            this.mesh.rotation.z *= 0.9;
        }

        if (input.up) {
            acc.y += this.accelerationForce;
            this.mesh.rotation.x = -0.2;
        } else if (input.down) {
            acc.y -= this.accelerationForce;
            this.mesh.rotation.x = 0.2;
        } else {
            this.mesh.rotation.x *= 0.9;
        }

        if (input.boost && this.speedBoost) {
            acc.multiplyScalar(2);
        }

        // Store acceleration for physics update
        this.acceleration.copy(acc);

        // Don't apply acceleration here - physics system handles it
        // this.velocity.add(acc.multiplyScalar(deltaTime));

        // Engine glow effect
        if (acc.length() > 0) {
            this.engine.material.emissiveIntensity = 2 + Math.sin(currentTime * 10) * 0.5;
        } else {
            this.engine.material.emissiveIntensity = 0.5;
        }

        // Handle firing
        if (input.fire && currentTime - this.lastFireTime > this.fireRate) {
            this.lastFireTime = currentTime;
            return this.createLaser();
        }

        return null;
    }

    createLaser() {
        const lasers = [];
        const basePosition = this.mesh.position.clone();
        const direction = new THREE.Vector3(0, 1, 0);  // Shoot upward in the game plane

        if (this.weaponBoost || this.weaponLevel > 1) {
            // Triple shot
            for (let i = -1; i <= 1; i++) {
                const laser = new Laser(
                    basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)),
                    direction.clone(),
                    this.scene
                );
                lasers.push(laser);
            }
        } else {
            // Single shot
            lasers.push(new Laser(basePosition, direction, this.scene));
        }

        return lasers;
    }

    takeDamage(amount) {
        if (this.shields) return false;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            return true; // Player destroyed
        }
        return false;
    }

    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
}

class Laser {
    constructor(position, direction, scene) {
        this.scene = scene;
        this.radius = 0.2;
        this.speed = 80;
        this.damage = 35;  // Increased from 25 - more effective!
        this.lifetime = 2;
        this.age = 0;

        // Create laser mesh
        const geometry = new THREE.CapsuleGeometry(0.15, 1.5, 4, 8); // Slightly larger than before
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffff,  // Cyan color
            emissive: 0x00ffff,
            emissiveIntensity: 2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.rotation.x = Math.PI / 2;
        scene.add(this.mesh);

        // Add glow
        const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glow);

        this.velocity = direction.multiplyScalar(this.speed);
    }

    update(deltaTime) {
        this.age += deltaTime;

        this.mesh.position.add(
            this.velocity.clone().multiplyScalar(deltaTime)
        );

        // Pulsing effect
        this.glow.scale.setScalar(1 + Math.sin(this.age * 20) * 0.2);

        return this.age > this.lifetime;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class Asteroid {
    constructor(position, size, scene) {
        this.scene = scene;
        this.size = size; // 'large', 'medium', 'small'
        this.health = size === 'large' ? 100 : size === 'medium' ? 50 : 25;

        // Set radius based on size
        this.radius = size === 'large' ? 3 : size === 'medium' ? 2 : 1;
        this.mass = this.radius;

        // Create asteroid mesh
        const geometry = new THREE.IcosahedronGeometry(this.radius, 0);
        const material = new THREE.MeshPhongMaterial({
            color: 0x8b7355,
            emissive: 0x4a3929,
            shininess: 10,
            flatShading: true
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        // Randomize vertices for natural look
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += (Math.random() - 0.5) * 0.3;
            positions[i + 1] += (Math.random() - 0.5) * 0.3;
            positions[i + 2] += (Math.random() - 0.5) * 0.3;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        scene.add(this.mesh);

        // Random rotation
        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );

        // Random velocity - faster asteroids!
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 15,  // Increased from 10
            (Math.random() - 0.5) * 15,  // Increased from 10
            0
        );
    }

    update(deltaTime) {
        // Rotate
        this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;

        // Move
        this.mesh.position.add(
            this.velocity.clone().multiplyScalar(deltaTime)
        );
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }

    break() {
        const fragments = [];
        if (this.size === 'large') {
            // Create 2-3 medium asteroids
            const count = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const offset = new THREE.Vector3(
                    Math.cos(angle) * 2,
                    Math.sin(angle) * 2,
                    0
                );
                const newPos = this.mesh.position.clone().add(offset);
                fragments.push(new Asteroid(newPos, 'medium', this.scene));

                // Inherit some velocity
                fragments[fragments.length - 1].velocity = this.velocity.clone()
                    .add(offset.normalize().multiplyScalar(5));
            }
        } else if (this.size === 'medium') {
            // Create 2-3 small asteroids
            const count = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const offset = new THREE.Vector3(
                    Math.cos(angle) * 1.5,
                    Math.sin(angle) * 1.5,
                    0
                );
                const newPos = this.mesh.position.clone().add(offset);
                fragments.push(new Asteroid(newPos, 'small', this.scene));

                fragments[fragments.length - 1].velocity = this.velocity.clone()
                    .add(offset.normalize().multiplyScalar(7));
            }
        }

        this.destroy();
        return fragments;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class EnemyShip {
    constructor(position, scene, target) {
        this.scene = scene;
        this.target = target;
        this.health = 50;
        this.radius = 1.5;
        this.mass = 1.5;
        this.maxSpeed = 30;  // Increased from 20 - now as fast as player!
        this.damage = 20;
        this.currentWave = 1;  // Default to wave 1 (no shooting)

        // Create enemy ship
        const group = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.OctahedronGeometry(0.8, 0);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0x880000,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);

        // Weapons
        const weaponGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
        const weaponMaterial = new THREE.MeshPhongMaterial({
            color: 0xffaa00,
            emissive: 0xff5500
        });
        const weapon1 = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon1.position.set(0.5, 0, 0.5);
        weapon1.rotation.x = Math.PI / 2;
        group.add(weapon1);

        const weapon2 = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon2.position.set(-0.5, 0, 0.5);
        weapon2.rotation.x = Math.PI / 2;
        group.add(weapon2);

        this.mesh = group;
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.lastFireTime = 0;
        this.fireRate = 0.8;  // Shoots more often! (was 1.5s)
    }

    update(deltaTime, currentTime) {
        // AI: Move towards player
        if (this.target && this.target.mesh) {
            const direction = new THREE.Vector3()
                .subVectors(this.target.mesh.position, this.mesh.position)
                .normalize();

            const distance = this.mesh.position.distanceTo(this.target.mesh.position);

            // More aggressive - get closer!
            if (distance > 5) {
                this.velocity.add(direction.multiplyScalar(20 * deltaTime));  // Faster acceleration
            } else if (distance > 3) {
                // Maintain distance but keep moving (circle strafe behavior)
                this.velocity.add(direction.multiplyScalar(5 * deltaTime));
            } else if (distance < 2) {  // Only back off if very close
                this.velocity.sub(direction.multiplyScalar(10 * deltaTime));
            }

            // Limit speed
            if (this.velocity.length() > this.maxSpeed) {
                this.velocity.normalize().multiplyScalar(this.maxSpeed);
            }

            // Look at player
            this.mesh.lookAt(this.target.mesh.position);

            // Fire at player from further away (but not in wave 1)
            if (this.currentWave > 1 &&  // Don't shoot in wave 1
                currentTime - this.lastFireTime > this.fireRate &&
                distance < 40) {  // Increased from 30

                this.lastFireTime = currentTime;
                return this.createLaser(direction);
            }
        }

        // Apply velocity
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Slight friction
        this.velocity.multiplyScalar(0.98);

        return null;
    }

    createLaser(direction) {
        const laser = new Laser(
            this.mesh.position.clone(),
            direction,
            this.scene
        );
        laser.mesh.material.color.setHex(0xff0000);
        laser.damage = this.damage;
        return laser;
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class SpaceMine {
    constructor(position, scene) {
        this.scene = scene;
        this.radius = 1;
        this.damage = 50;
        this.triggerRadius = 5;
        this.triggered = false;
        this.countdown = 1.5;

        // Create mine
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: 0x444444,
            emissive: 0xff0000,
            emissiveIntensity: 0.2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        // Add spikes
        const spikeGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
        const spikeMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });

        for (let i = 0; i < 8; i++) {
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            const angle = (Math.PI * 2 * i) / 8;
            spike.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
            spike.lookAt(spike.position.clone().multiplyScalar(2));
            this.mesh.add(spike);
        }

        scene.add(this.mesh);

        // Warning light
        this.warningLight = new THREE.PointLight(0xff0000, 0, 10);
        this.mesh.add(this.warningLight);
    }

    update(deltaTime, playerPosition) {
        const distance = this.mesh.position.distanceTo(playerPosition);

        if (!this.triggered && distance < this.triggerRadius) {
            this.triggered = true;
        }

        if (this.triggered) {
            this.countdown -= deltaTime;

            // Blink faster as countdown approaches
            const blinkSpeed = Math.max(0.1, this.countdown);
            this.warningLight.intensity = Math.sin(Date.now() * 0.01 / blinkSpeed) * 2;
            this.mesh.material.emissiveIntensity = 0.2 + (1 - this.countdown / 1.5) * 0.8;

            if (this.countdown <= 0) {
                return true; // Explode
            }
        }

        // Rotate slowly
        this.mesh.rotation.y += deltaTime * 0.5;

        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class BlackHole {
    constructor(position, scene) {
        this.scene = scene;
        this.radius = 5;
        this.pullRadius = 30;
        this.strength = 200;

        // Create black hole
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        // Event horizon effect
        const horizonGeometry = new THREE.RingGeometry(this.radius, this.radius * 1.5, 64);
        const horizonMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
        this.mesh.add(this.horizon);

        // Accretion disk
        const diskGeometry = new THREE.RingGeometry(this.radius * 1.5, this.radius * 3, 64);
        const diskMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        this.disk = new THREE.Mesh(diskGeometry, diskMaterial);
        this.mesh.add(this.disk);
    }

    update(deltaTime) {
        // Rotate accretion disk
        this.horizon.rotation.z += deltaTime * 2;
        this.disk.rotation.z -= deltaTime;

        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.002) * 0.1 + 1;
        this.horizon.scale.setScalar(pulse);
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}