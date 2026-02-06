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

        // Weapon visuals (hidden by default, shown when weapon upgrades collected)
        const gunMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x00aa00, emissiveIntensity: 0.5 });

        // Triple shot guns (3 forward barrels)
        this.tripleGuns = new THREE.Group();
        for (let i = -1; i <= 1; i++) {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), gunMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(i * 0.5, 0.4, 0);
            this.tripleGuns.add(barrel);
        }
        this.tripleGuns.visible = false;
        group.add(this.tripleGuns);

        // Dual weapon guns (3 forward + 3 backward barrels)
        this.dualGuns = new THREE.Group();
        const dualMat = new THREE.MeshPhongMaterial({ color: 0xff4400, emissive: 0xaa2200, emissiveIntensity: 0.5 });
        for (let i = -1; i <= 1; i++) {
            // Forward barrels
            const fwd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), dualMat);
            fwd.rotation.x = Math.PI / 2;
            fwd.position.set(i * 0.5, 0.4, 0);
            this.dualGuns.add(fwd);
            // Backward barrels
            const bwd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), dualMat);
            bwd.rotation.x = Math.PI / 2;
            bwd.position.set(i * 0.5, -0.4, 0);
            this.dualGuns.add(bwd);
        }
        this.dualGuns.visible = false;
        group.add(this.dualGuns);

        this.mesh = group;
        scene.add(this.mesh);

        // Physics
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);

        // Weapons
        this.canFire = true;
        this.fireRate = 0.15; // Faster shooting! (was 0.2)
        this.lastFireTime = -999; // Initialize to allow immediate first shot
        this.weaponLevel = 1;
        this.ammo = 150; // Starting ammunition - increased since ammo is scarce
        this.maxAmmo = 999; // Maximum ammunition capacity

        // Power-ups
        this.shields = false;
        this.shieldReserve = 0; // Seconds of shield remaining (max 30)
        this.maxShieldReserve = 30;
        this.speedBoost = false;
        this.weaponBoost = false;
        this.dualWeapon = false; // 6-shot (triple both directions)
        this.hasMissiles = false;
        this.missiles = 0;
        this.maxMissiles = 10;
        this.missileFireRate = 0.6;
        this.lastMissileTime = -999;

        // Shield visual effect
        this.shieldMesh = null;
        this.createShieldVisual();
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

        // Speed boost is always active when you have the powerup
        if (this.speedBoost) {
            acc.multiplyScalar(1.6);
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

        // Update weapon visuals
        if (this.dualWeapon) {
            this.tripleGuns.visible = false;
            this.dualGuns.visible = true;
        } else if (this.weaponBoost || this.weaponLevel > 1) {
            this.tripleGuns.visible = true;
            this.dualGuns.visible = false;
        } else {
            this.tripleGuns.visible = false;
            this.dualGuns.visible = false;
        }

        // Update shield visual
        this.updateShieldVisual(deltaTime, currentTime);

        // Handle firing - Check ammo
        if (input.fire && this.ammo > 0) {
            const timeSinceLastFire = currentTime - this.lastFireTime;
            if (timeSinceLastFire > this.fireRate) {
                this.lastFireTime = currentTime;
                const lasers = this.createLaser();

                // Consume ammo (1 per shot, or 3 for triple shot)
                this.ammo -= lasers.length;

                return lasers;
            }
        }

        return null;
    }

    createLaser() {
        const lasers = [];
        const basePosition = this.mesh.position.clone();
        const dirUp = new THREE.Vector3(0, 1, 0);
        const dirDown = new THREE.Vector3(0, -1, 0);

        if (this.dualWeapon) {
            // 6-shot: triple forward + triple backward
            for (let i = -1; i <= 1; i++) {
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirUp.clone(), this.scene));
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirDown.clone(), this.scene));
            }
        } else if (this.weaponBoost || this.weaponLevel > 1) {
            // Triple shot forward
            for (let i = -1; i <= 1; i++) {
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirUp.clone(), this.scene));
            }
        } else {
            // Single shot
            lasers.push(new Laser(basePosition, dirUp, this.scene));
        }

        return lasers;
    }

    createMissile() {
        if (!this.hasMissiles || this.missiles <= 0) return null;
        this.missiles--;
        const basePosition = this.mesh.position.clone();
        const direction = new THREE.Vector3(0, 1, 0);
        return new Missile(basePosition, direction, this.scene);
    }

    createShieldVisual() {
        // Create a semi-transparent sphere around the player
        const geometry = new THREE.SphereGeometry(2.5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.shieldMesh = new THREE.Mesh(geometry, material);
        this.shieldMesh.visible = false; // Hidden by default
        this.mesh.add(this.shieldMesh);

        // Add hexagonal pattern overlay
        const hexGeometry = new THREE.IcosahedronGeometry(2.6, 1);
        const hexMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        this.shieldHex = new THREE.Mesh(hexGeometry, hexMaterial);
        this.shieldHex.visible = false;
        this.mesh.add(this.shieldHex);
    }

    updateShieldVisual(deltaTime, currentTime) {
        if (this.shields && this.shieldMesh) {
            // Show shield
            this.shieldMesh.visible = true;
            this.shieldHex.visible = true;

            // Animate shield - pulsing and rotating
            const pulse = Math.sin(currentTime * 3) * 0.1 + 0.3;
            this.shieldMesh.material.opacity = pulse;
            this.shieldHex.material.opacity = pulse * 0.7;

            this.shieldMesh.rotation.y += deltaTime * 0.5;
            this.shieldHex.rotation.y -= deltaTime * 0.3;
            this.shieldHex.rotation.x += deltaTime * 0.2;
        } else if (this.shieldMesh) {
            // Hide shield
            this.shieldMesh.visible = false;
            this.shieldHex.visible = false;
        }
    }

    takeDamage(amount) {
        // Shields reduce damage by 70% instead of blocking completely
        if (this.shields) {
            amount *= 0.3; // Only 30% damage gets through
        }

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
        this.lifetime = 2;  // 2 seconds lifetime
        this.age = 0;

        // Create laser mesh (using CylinderGeometry since CapsuleGeometry doesn't exist in Three.js r128)
        const geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 2
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.rotation.x = Math.PI / 2;
        scene.add(this.mesh);

        // Add glow
        const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
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
        this.size = size; // 'huge', 'large', 'medium', 'small'
        this.health = size === 'huge' ? 300 : size === 'large' ? 100 : size === 'medium' ? 50 : 25;

        // Set radius based on size (huge = 4x large)
        this.radius = size === 'huge' ? 12 : size === 'large' ? 3 : size === 'medium' ? 2 : 1;
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

        // Random velocity - huge rocks are slower due to mass
        const speed = size === 'huge' ? 5 : 15;
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed,
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
        if (this.size === 'huge') {
            // Create 3-4 large asteroids
            const count = Math.floor(Math.random() * 2) + 3;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const offset = new THREE.Vector3(
                    Math.cos(angle) * 5,
                    Math.sin(angle) * 5,
                    0
                );
                const newPos = this.mesh.position.clone().add(offset);
                fragments.push(new Asteroid(newPos, 'large', this.scene));

                fragments[fragments.length - 1].velocity = this.velocity.clone()
                    .add(offset.normalize().multiplyScalar(4));
            }
        } else if (this.size === 'large') {
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
        this.damage = 10;
        this.currentRound = 1;  // Default to round 1 (no shooting)

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

            // Fire at player from further away (but not in round 1)
            if (this.currentRound > 1 &&  // Don't shoot in round 1
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

    break() {
        const fragments = [];
        const pos = this.mesh.position.clone();

        // Body fragment (red octahedron piece)
        const bodyGeo = new THREE.TetrahedronGeometry(0.4, 0);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x880000, shininess: 80 });
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3;
            const offset = new THREE.Vector3(Math.cos(angle) * 0.8, Math.sin(angle) * 0.8, 0);
            const frag = new EnemyDebris(pos.clone().add(offset), bodyGeo, bodyMat, this.scene);
            frag.velocity.copy(offset.normalize().multiplyScalar(8 + Math.random() * 6));
            fragments.push(frag);
        }

        // Weapon fragments (orange cylinders)
        const wGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.35);
        const wMat = new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0xff5500 });
        for (let i = 0; i < 2; i++) {
            const side = i === 0 ? 1 : -1;
            const frag = new EnemyDebris(
                pos.clone().add(new THREE.Vector3(side * 0.6, 0, 0)),
                wGeo, wMat, this.scene
            );
            frag.velocity.set(side * 10, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4);
            fragments.push(frag);
        }

        this.destroy();
        return fragments;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class EnemyDebris {
    constructor(position, geometry, material, scene) {
        this.scene = scene;
        this.mesh = new THREE.Mesh(geometry, material.clone());
        this.mesh.position.copy(position);
        this.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8
        );
        this.lifetime = 1.5 + Math.random() * 1;
        this.age = 0;
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;

        // Fade out
        const alpha = 1 - (this.age / this.lifetime);
        this.mesh.material.opacity = alpha;
        this.mesh.material.transparent = true;

        // Slow down
        this.velocity.multiplyScalar(0.98);

        return this.age >= this.lifetime;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class Missile {
    constructor(position, direction, scene) {
        this.scene = scene;
        this.radius = 0.4;
        this.speed = 50;
        this.damage = 150;
        this.blastRadius = 12;
        this.lifetime = 3;
        this.age = 0;

        // Create missile mesh
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff6600, emissive: 0xaa3300, shininess: 80 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        // Warhead
        const headGeo = new THREE.ConeGeometry(0.18, 0.4, 6);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xaa0000 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.rotation.x = -Math.PI / 2;
        head.position.y = 0.8;
        group.add(head);

        // Engine glow
        const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.glow.position.y = -0.7;
        group.add(this.glow);

        this.mesh = group;
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.velocity = direction.multiplyScalar(this.speed);
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Engine flicker
        this.glow.material.opacity = 0.4 + Math.sin(this.age * 30) * 0.2;

        return this.age > this.lifetime;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class Matriarch {
    constructor(position, scene, target) {
        this.scene = scene;
        this.target = target;
        this.health = 800;
        this.maxHealth = 800;
        this.radius = 5;
        this.mass = 5;
        this.maxSpeed = 15;
        this.damage = 10;
        this.currentRound = 10;

        // Attack patterns
        this.attackPhase = 'chase'; // 'chase', 'spread', 'barrage'
        this.phaseTimer = 0;
        this.phaseDuration = 5;
        this.spreadFireTimer = 0;
        this.barrageTimer = 0;

        // Shield cycle: 7s on, 3s off (70% uptime)
        this.shieldCycleTimer = 0;
        this.shieldOnDuration = 7;
        this.shieldOffDuration = 3;
        this.shieldActive = true;

        // Create Matriarch ship
        const group = new THREE.Group();

        // Main hull - large menacing shape
        const hullGeometry = new THREE.DodecahedronGeometry(3, 0);
        const hullMaterial = new THREE.MeshPhongMaterial({
            color: 0x660066,
            emissive: 0x330033,
            shininess: 120,
            flatShading: true
        });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        group.add(hull);
        this.hull = hull;

        // Central eye/core
        const coreGeometry = new THREE.SphereGeometry(1, 16, 16);
        const coreMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0044,
            emissive: 0xff0022,
            emissiveIntensity: 1.5,
            shininess: 200
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.z = 2;
        group.add(core);
        this.core = core;

        // Side weapon pods
        const podGeometry = new THREE.OctahedronGeometry(1, 0);
        const podMaterial = new THREE.MeshPhongMaterial({
            color: 0x880088,
            emissive: 0x440044,
            shininess: 80
        });
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            const pod = new THREE.Mesh(podGeometry, podMaterial);
            pod.position.set(Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0);
            group.add(pod);
        }

        // Spinal cannons
        const cannonGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        const cannonMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4400,
            emissive: 0xaa2200
        });
        for (let i = -1; i <= 1; i++) {
            const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
            cannon.position.set(i * 2, 0, 3);
            cannon.rotation.x = Math.PI / 2;
            group.add(cannon);
        }

        // Shield visual
        const shieldGeometry = new THREE.SphereGeometry(6, 32, 32);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        group.add(this.shieldMesh);

        this.mesh = group;
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.lastFireTime = 0;
        this.fireRate = 0.4;
        this.time = 0;
    }

    update(deltaTime, currentTime) {
        this.time += deltaTime;
        this.phaseTimer += deltaTime;

        // Core orbits visibly around hull (weak spot)
        const coreAngle = this.time * 1.2;
        const coreRadius = 4;
        this.core.position.set(
            Math.cos(coreAngle) * coreRadius,
            Math.sin(coreAngle) * coreRadius,
            2
        );
        this.core.material.emissiveIntensity = 1.0 + Math.sin(this.time * 5) * 0.5;

        // Hull slow rotation
        this.hull.rotation.z += deltaTime * 0.3;

        // Shield cycle: independent of attack phase
        this.shieldCycleTimer += deltaTime;
        const shieldCycleLength = this.shieldOnDuration + this.shieldOffDuration;
        if (this.shieldCycleTimer >= shieldCycleLength) {
            this.shieldCycleTimer -= shieldCycleLength;
        }
        this.shieldActive = this.shieldCycleTimer < this.shieldOnDuration;

        // Shield visual
        if (this.shieldActive) {
            this.shieldMesh.material.opacity = 0.25 + Math.sin(this.time * 6) * 0.1;
            this.shieldMesh.rotation.y += deltaTime * 2;
            // Slow health regen while shielded
            this.health = Math.min(this.health + 10 * deltaTime, this.maxHealth);
        } else {
            // Shield is down - core pulses brightly to signal vulnerability
            this.shieldMesh.material.opacity = 0;
            this.core.material.emissiveIntensity = 1.5 + Math.sin(this.time * 10) * 0.5;
        }

        // Phase transitions (attack patterns only, shield is separate)
        if (this.phaseTimer >= this.phaseDuration) {
            this.phaseTimer = 0;
            const phases = ['chase', 'spread', 'barrage'];
            const currentIndex = phases.indexOf(this.attackPhase);
            this.attackPhase = phases[(currentIndex + 1) % phases.length];

            if (this.attackPhase === 'barrage') {
                this.phaseDuration = 4;
            } else {
                this.phaseDuration = 5;
            }
        }

        const lasers = [];

        if (this.target && this.target.mesh) {
            const direction = new THREE.Vector3()
                .subVectors(this.target.mesh.position, this.mesh.position)
                .normalize();
            const distance = this.mesh.position.distanceTo(this.target.mesh.position);

            // Movement based on phase
            if (this.attackPhase === 'chase') {
                if (distance > 15) {
                    this.velocity.add(direction.clone().multiplyScalar(15 * deltaTime));
                } else if (distance < 8) {
                    this.velocity.sub(direction.clone().multiplyScalar(10 * deltaTime));
                }
                // Single aimed shots while chasing
                if (currentTime - this.lastFireTime > this.fireRate) {
                    this.lastFireTime = currentTime;
                    lasers.push(this.createLaser(direction.clone()));
                }
            } else if (this.attackPhase === 'spread') {
                // Circle strafe
                const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0);
                this.velocity.add(perpendicular.multiplyScalar(12 * deltaTime));
                if (distance > 25) {
                    this.velocity.add(direction.clone().multiplyScalar(8 * deltaTime));
                }
                // Spread shot - 5 lasers in a fan
                this.spreadFireTimer += deltaTime;
                if (this.spreadFireTimer > 0.8) {
                    this.spreadFireTimer = 0;
                    for (let i = -2; i <= 2; i++) {
                        const angle = i * 0.25;
                        const spreadDir = direction.clone();
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        const rotated = new THREE.Vector3(
                            spreadDir.x * cos - spreadDir.y * sin,
                            spreadDir.x * sin + spreadDir.y * cos,
                            0
                        ).normalize();
                        lasers.push(this.createLaser(rotated));
                    }
                }
            } else if (this.attackPhase === 'barrage') {
                // Stay still-ish, rapid fire
                if (distance > 20) {
                    this.velocity.add(direction.clone().multiplyScalar(5 * deltaTime));
                }
                this.barrageTimer += deltaTime;
                if (this.barrageTimer > 0.15) {
                    this.barrageTimer = 0;
                    // Slightly random aimed shots
                    const randomDir = direction.clone();
                    randomDir.x += (Math.random() - 0.5) * 0.3;
                    randomDir.y += (Math.random() - 0.5) * 0.3;
                    randomDir.normalize();
                    lasers.push(this.createLaser(randomDir));
                }
            }

            // Look at player
            this.mesh.lookAt(this.target.mesh.position);
        }

        // Limit speed
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }

        // Apply velocity
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Friction
        this.velocity.multiplyScalar(0.97);

        return lasers.length > 0 ? lasers : null;
    }

    createLaser(direction) {
        const laser = new Laser(
            this.mesh.position.clone().add(direction.clone().multiplyScalar(4)),
            direction,
            this.scene
        );
        laser.mesh.material.color.setHex(0xff00ff);
        laser.damage = this.damage;
        laser.speed = 60;
        laser.velocity = direction.multiplyScalar(60);
        return laser;
    }

    getCoreWorldPosition() {
        const worldPos = new THREE.Vector3();
        this.core.getWorldPosition(worldPos);
        return worldPos;
    }

    takeDamage(damage, hitPosition) {
        // Shield on = completely invulnerable
        if (this.shieldActive) {
            return false;
        }
        // Shield down: only take damage if hit near the core (weak spot)
        if (hitPosition) {
            const corePos = this.getCoreWorldPosition();
            const distToCore = hitPosition.distanceTo(corePos);
            if (distToCore > 4) {
                return false; // Missed the weak spot
            }
        }
        this.health -= damage;
        return this.health <= 0;
    }

    break() {
        const fragments = [];
        const pos = this.mesh.position.clone();

        // Many debris pieces for the big boss
        const hullGeo = new THREE.TetrahedronGeometry(0.6, 0);
        const hullMat = new THREE.MeshPhongMaterial({ color: 0x660066, emissive: 0x330033, shininess: 80 });
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const offset = new THREE.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 2, 0);
            const frag = new EnemyDebris(pos.clone().add(offset), hullGeo, hullMat, this.scene);
            frag.velocity.copy(offset.normalize().multiplyScalar(12 + Math.random() * 8));
            fragments.push(frag);
        }

        // Core fragment
        const coreGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const coreMat = new THREE.MeshPhongMaterial({ color: 0xff0044, emissive: 0xff0022 });
        const coreFrag = new EnemyDebris(pos.clone(), coreGeo, coreMat, this.scene);
        coreFrag.velocity.set(0, 5, 0);
        fragments.push(coreFrag);

        this.destroy();
        return fragments;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class SpaceMine {
    constructor(position, scene) {
        this.scene = scene;
        this.radius = 1;
        this.damage = 25;
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