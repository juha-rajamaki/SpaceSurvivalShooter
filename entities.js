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
        const damagedGunMat = new THREE.MeshPhongMaterial({ color: 0x553300, emissive: 0x331100, emissiveIntensity: 0.3 });

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

        // Octo weapon guns (6-shot + 2 diagonal barrels)
        this.octoGuns = new THREE.Group();
        const octoMat = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0xaa00aa, emissiveIntensity: 0.5 });
        for (let i = -1; i <= 1; i++) {
            const fwd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), octoMat);
            fwd.rotation.x = Math.PI / 2;
            fwd.position.set(i * 0.5, 0.4, 0);
            this.octoGuns.add(fwd);
            const bwd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), octoMat);
            bwd.rotation.x = Math.PI / 2;
            bwd.position.set(i * 0.5, -0.4, 0);
            this.octoGuns.add(bwd);
        }
        // Diagonal barrels
        const diagRight = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), octoMat);
        diagRight.rotation.z = -Math.PI / 4;
        diagRight.position.set(0.8, 0.3, 0);
        this.octoGuns.add(diagRight);
        const diagLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), octoMat);
        diagLeft.rotation.z = Math.PI / 4;
        diagLeft.position.set(0.8, -0.3, 0);
        this.octoGuns.add(diagLeft);
        this.octoGuns.visible = false;
        group.add(this.octoGuns);

        // Damaged gun overlays (shown over disabled barrels)
        this.damagedOverlay = new THREE.Group();
        // Damaged diagonal barrels (for octo->dual downgrade)
        this.damagedDiagRight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), damagedGunMat);
        this.damagedDiagRight.rotation.z = -Math.PI / 4;
        this.damagedDiagRight.position.set(0.8, 0.3, 0);
        this.damagedOverlay.add(this.damagedDiagRight);
        this.damagedDiagLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), damagedGunMat);
        this.damagedDiagLeft.rotation.z = Math.PI / 4;
        this.damagedDiagLeft.position.set(0.8, -0.3, 0);
        this.damagedOverlay.add(this.damagedDiagLeft);
        // Damaged backward barrels (for dual->triple downgrade)
        for (let i = -1; i <= 1; i++) {
            const bwd = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), damagedGunMat);
            bwd.rotation.x = Math.PI / 2;
            bwd.position.set(i * 0.5, -0.4, 0);
            bwd.userData.isDamagedBack = true;
            this.damagedOverlay.add(bwd);
        }
        // Damaged side barrels (for triple->single downgrade)
        for (let i of [-1, 1]) {
            const side = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), damagedGunMat);
            side.rotation.x = Math.PI / 2;
            side.position.set(i * 0.5, 0.4, 0);
            side.userData.isDamagedSide = true;
            this.damagedOverlay.add(side);
        }
        this.damagedOverlay.visible = false;
        group.add(this.damagedOverlay);

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
        this.octoWeapon = false; // 8-shot (6-shot + 2 diagonal)
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

        // Update weapon visuals — show base tier guns + damaged overlay for degraded parts
        const baseTier = this.octoWeapon ? 4 : this.dualWeapon ? 3 : (this.weaponBoost || this.weaponLevel > 1) ? 2 : 1;
        const effectiveTier = this.getEffectiveWeaponTier();
        const isDegraded = effectiveTier < baseTier;

        this.tripleGuns.visible = false;
        this.dualGuns.visible = false;
        this.octoGuns.visible = false;
        this.damagedOverlay.visible = false;

        // Show the base tier gun model (what the player owns)
        if (baseTier >= 4) {
            this.octoGuns.visible = true;
        } else if (baseTier >= 3) {
            this.dualGuns.visible = true;
        } else if (baseTier >= 2) {
            this.tripleGuns.visible = true;
        }

        // Show damaged overlay on degraded parts
        if (isDegraded && baseTier > 1) {
            this.damagedOverlay.visible = true;
            // Hide all damaged parts first
            this.damagedOverlay.children.forEach(c => c.visible = false);

            if (baseTier === 4 && effectiveTier <= 3) {
                // Octo degraded: show damaged diagonal barrels
                this.damagedDiagRight.visible = true;
                this.damagedDiagLeft.visible = true;
            }
            if ((baseTier >= 3 && effectiveTier <= 2) || (baseTier === 4 && effectiveTier <= 2)) {
                // Dual degraded to triple or less: show damaged back barrels
                this.damagedOverlay.children.forEach(c => {
                    if (c.userData.isDamagedBack) c.visible = true;
                });
            }
            if (effectiveTier <= 1 && baseTier >= 2) {
                // All degraded to single: show damaged side barrels too
                this.damagedOverlay.children.forEach(c => {
                    if (c.userData.isDamagedSide) c.visible = true;
                    if (c.userData.isDamagedBack) c.visible = true;
                });
                this.damagedDiagRight.visible = (baseTier >= 4);
                this.damagedDiagLeft.visible = (baseTier >= 4);
            }
        }

        // Flicker damaged guns to look broken/sparking
        if (this.damagedOverlay.visible) {
            const flicker = Math.sin(currentTime * 15) > 0.3 ? 1 : 0.3;
            this.damagedOverlay.children.forEach(c => {
                if (c.visible && c.material) {
                    c.material.emissiveIntensity = flicker * 0.3;
                }
            });
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

    getEffectiveWeaponTier() {
        // Determine base tier: 4=octo, 3=dual, 2=triple, 1=single
        let tier = 1;
        if (this.octoWeapon) tier = 4;
        else if (this.dualWeapon) tier = 3;
        else if (this.weaponBoost || this.weaponLevel > 1) tier = 2;

        // Degrade based on health
        if (this.health < 40) {
            // Red health: single gun only
            tier = 1;
        } else if (this.health < 80) {
            // Yellow health: drop one tier
            tier = Math.max(1, tier - 1);
        }

        return tier;
    }

    createLaser() {
        const lasers = [];
        const basePosition = this.mesh.position.clone();
        const dirUp = new THREE.Vector3(0, 1, 0);
        const dirDown = new THREE.Vector3(0, -1, 0);

        const tier = this.getEffectiveWeaponTier();

        if (tier >= 4) {
            // 8-shot: triple forward + triple backward + 2 diagonal
            for (let i = -1; i <= 1; i++) {
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirUp.clone(), this.scene));
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirDown.clone(), this.scene));
            }
            // Top-right diagonal
            const dirTopRight = new THREE.Vector3(0.7, 0.7, 0).normalize();
            lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(0.8, 0.3, 0)), dirTopRight, this.scene));
            // Bottom-right diagonal
            const dirBottomRight = new THREE.Vector3(0.7, -0.7, 0).normalize();
            lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(0.8, -0.3, 0)), dirBottomRight, this.scene));
        } else if (tier === 3) {
            // 6-shot: triple forward + triple backward
            for (let i = -1; i <= 1; i++) {
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirUp.clone(), this.scene));
                lasers.push(new Laser(basePosition.clone().add(new THREE.Vector3(i * 0.5, 0, 0)), dirDown.clone(), this.scene));
            }
        } else if (tier === 2) {
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
        } else if (this.size === 'small') {
            // Small rocks shatter into visible rock debris chunks
            const pos = this.mesh.position.clone();
            const rockMat = new THREE.MeshPhongMaterial({ color: 0x8b7355, emissive: 0x4a3929, shininess: 10, flatShading: true });
            const count = Math.floor(Math.random() * 2) + 4;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const offset = new THREE.Vector3(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, (Math.random() - 0.5) * 0.4);
                const size = 0.3 + Math.random() * 0.35;
                const geo = new THREE.IcosahedronGeometry(size, 0);
                // Roughen up the chunk vertices
                const verts = geo.attributes.position.array;
                for (let v = 0; v < verts.length; v += 3) {
                    verts[v] += (Math.random() - 0.5) * 0.15;
                    verts[v+1] += (Math.random() - 0.5) * 0.15;
                    verts[v+2] += (Math.random() - 0.5) * 0.15;
                }
                geo.attributes.position.needsUpdate = true;
                geo.computeVertexNormals();
                const frag = new EnemyDebris(pos.clone().add(offset), geo, rockMat, this.scene);
                frag.velocity.copy(offset.normalize().multiplyScalar(8 + Math.random() * 6));
                frag.velocity.z += (Math.random() - 0.5) * 4;
                frag.lifetime = 2 + Math.random() * 1;
                fragments.push(frag);
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

class EnemyMissile {
    constructor(position, direction, scene, target) {
        this.scene = scene;
        this.target = target;
        this.radius = 0.4;
        this.speed = 35;
        this.damage = 30;
        this.turnRate = 2.5;
        this.lifetime = 4;
        this.age = 0;

        const group = new THREE.Group();

        // Body - darker than player missiles
        const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 6);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x990000, emissive: 0x660000, shininess: 80 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        // Warhead
        const headGeo = new THREE.ConeGeometry(0.15, 0.35, 6);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xaa0000 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.rotation.x = -Math.PI / 2;
        head.position.y = 0.65;
        group.add(head);

        // Engine glow
        const glowGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6 });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.glow.position.y = -0.6;
        group.add(this.glow);

        this.mesh = group;
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.velocity = direction.multiplyScalar(this.speed);
    }

    update(deltaTime) {
        this.age += deltaTime;

        // Home in on player
        if (this.target && this.target.mesh) {
            const desired = new THREE.Vector3()
                .subVectors(this.target.mesh.position, this.mesh.position)
                .normalize()
                .multiplyScalar(this.speed);
            const steer = new THREE.Vector3().subVectors(desired, this.velocity);
            const maxSteer = this.turnRate * this.speed * deltaTime;
            if (steer.length() > maxSteer) {
                steer.normalize().multiplyScalar(maxSteer);
            }
            this.velocity.add(steer);
            this.velocity.normalize().multiplyScalar(this.speed);
        }

        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Point in direction of travel
        const dir = this.velocity.clone().normalize();
        this.mesh.lookAt(this.mesh.position.clone().add(dir));

        // Engine flicker
        this.glow.material.opacity = 0.4 + Math.sin(this.age * 25) * 0.2;

        return this.age > this.lifetime;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class MissileShip {
    constructor(position, scene, target) {
        this.scene = scene;
        this.target = target;
        this.health = 80;
        this.radius = 2;
        this.mass = 2;
        this.maxSpeed = 20;
        this.damage = 10;
        this.currentRound = 8;

        const group = new THREE.Group();

        // Elongated body (green/teal - distinct from red enemies)
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.8, 2.2, 6);
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x008866,
            emissive: 0x004433,
            shininess: 100,
            flatShading: true
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        // Cockpit dome
        const cockpitGeo = new THREE.SphereGeometry(0.45, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMat = new THREE.MeshPhongMaterial({
            color: 0x44ffaa,
            emissive: 0x22aa66,
            shininess: 200,
            transparent: true,
            opacity: 0.7
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.z = 0.7;
        cockpit.rotation.x = -Math.PI / 2;
        group.add(cockpit);

        // Swept-back wings
        for (let side = -1; side <= 1; side += 2) {
            const wingGeo = new THREE.BoxGeometry(1.8, 0.08, 0.6);
            const wingMat = new THREE.MeshPhongMaterial({
                color: 0x006644,
                emissive: 0x003322,
                flatShading: true
            });
            const wing = new THREE.Mesh(wingGeo, wingMat);
            wing.position.set(side * 1.2, 0, -0.3);
            wing.rotation.z = side * 0.15;
            group.add(wing);

            // Missile pod on each wing tip
            const podGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 6);
            const podMat = new THREE.MeshPhongMaterial({ color: 0x555555, emissive: 0x333333 });
            const pod = new THREE.Mesh(podGeo, podMat);
            pod.rotation.x = Math.PI / 2;
            pod.position.set(side * 2.0, 0, -0.2);
            group.add(pod);

            // Missile tip
            const tipGeo = new THREE.ConeGeometry(0.15, 0.35, 4);
            const tipMat = new THREE.MeshPhongMaterial({ color: 0xff4400, emissive: 0xaa2200 });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.rotation.x = -Math.PI / 2;
            tip.position.set(side * 2.0, 0, 0.25);
            group.add(tip);
        }

        // Twin engine glows
        const engineGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const engineMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
        for (let side = -1; side <= 1; side += 2) {
            const engine = new THREE.Mesh(engineGeo, engineMat);
            engine.position.set(side * 0.4, 0, -1.2);
            group.add(engine);
        }
        this.engineMat = engineMat;

        this.mesh = group;
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
        this.lastFireTime = 0;
        this.fireRate = 3; // Fire a missile every 3 seconds
        this.time = 0;
    }

    update(deltaTime, currentTime) {
        this.time += deltaTime;
        this.engineMat.opacity = 0.3 + Math.sin(this.time * 8) * 0.15;

        if (this.target && this.target.mesh) {
            const direction = new THREE.Vector3()
                .subVectors(this.target.mesh.position, this.mesh.position)
                .normalize();
            const distance = this.mesh.position.distanceTo(this.target.mesh.position);

            // Keep medium distance — don't get too close
            if (distance > 30) {
                this.velocity.add(direction.clone().multiplyScalar(15 * deltaTime));
            } else if (distance < 15) {
                this.velocity.sub(direction.clone().multiplyScalar(10 * deltaTime));
            } else {
                // Strafe sideways
                const perp = new THREE.Vector3(-direction.y, direction.x, 0);
                this.velocity.add(perp.multiplyScalar(8 * deltaTime));
            }

            if (this.velocity.length() > this.maxSpeed) {
                this.velocity.normalize().multiplyScalar(this.maxSpeed);
            }

            this.mesh.lookAt(this.target.mesh.position);

            // Fire homing missile
            if (currentTime - this.lastFireTime > this.fireRate && distance < 50) {
                this.lastFireTime = currentTime;
                const missileDir = direction.clone();
                const missile = new EnemyMissile(
                    this.mesh.position.clone().add(missileDir.clone().multiplyScalar(2)),
                    missileDir,
                    this.scene,
                    this.target
                );
                return missile;
            }
        }

        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.velocity.multiplyScalar(0.97);

        return null;
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }

    break() {
        const fragments = [];
        const pos = this.mesh.position.clone();

        // Body fragments (green/teal)
        const bodyGeo = new THREE.TetrahedronGeometry(0.5, 0);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x008866, emissive: 0x004433, shininess: 80 });
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            const offset = new THREE.Vector3(Math.cos(angle) * 1, Math.sin(angle) * 1, 0);
            const frag = new EnemyDebris(pos.clone().add(offset), bodyGeo, bodyMat, this.scene);
            frag.velocity.copy(offset.normalize().multiplyScalar(10 + Math.random() * 6));
            fragments.push(frag);
        }

        // Wing fragments
        const wingGeo = new THREE.BoxGeometry(0.8, 0.06, 0.3);
        const wingMat = new THREE.MeshPhongMaterial({ color: 0x006644, emissive: 0x003322 });
        for (let side = -1; side <= 1; side += 2) {
            const frag = new EnemyDebris(
                pos.clone().add(new THREE.Vector3(side * 1.5, 0, 0)),
                wingGeo, wingMat, this.scene
            );
            frag.velocity.set(side * 14, (Math.random() - 0.5) * 6, 0);
            fragments.push(frag);
        }

        this.destroy();
        return fragments;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

class Missile {
    constructor(position, direction, scene) {
        this.scene = scene;
        this.radius = 0.4;
        this.speed = 45;
        this.damage = 150;
        this.blastRadius = 12;
        this.lifetime = 5;
        this.age = 0;
        this.turnRate = 3.5; // Radians per second for homing
        this.targets = null; // Set by game to array of enemies/asteroids

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

        // Home in on nearest target
        if (this.targets && this.targets.length > 0) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const t of this.targets) {
                if (!t.mesh) continue;
                const d = this.mesh.position.distanceTo(t.mesh.position);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = t;
                }
            }
            if (nearest) {
                const desired = new THREE.Vector3()
                    .subVectors(nearest.mesh.position, this.mesh.position)
                    .normalize()
                    .multiplyScalar(this.speed);
                const steer = new THREE.Vector3()
                    .subVectors(desired, this.velocity);
                const maxSteer = this.turnRate * this.speed * deltaTime;
                if (steer.length() > maxSteer) {
                    steer.normalize().multiplyScalar(maxSteer);
                }
                this.velocity.add(steer);
                this.velocity.normalize().multiplyScalar(this.speed);
            }
        }

        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Point missile in direction of travel
        const dir = this.velocity.clone().normalize();
        this.mesh.lookAt(this.mesh.position.clone().add(dir));

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

        // Spawn hatch (destroyable - spawns missile ships)
        const hatchGroup = new THREE.Group();
        const hatchGeo = new THREE.BoxGeometry(2, 1.2, 0.4);
        const hatchMat = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            emissive: 0x008844,
            shininess: 100
        });
        const hatchPanel = new THREE.Mesh(hatchGeo, hatchMat);
        hatchGroup.add(hatchPanel);

        const hatchFrameGeo = new THREE.BoxGeometry(2.4, 1.6, 0.2);
        const hatchFrameMat = new THREE.MeshPhongMaterial({
            color: 0x444444,
            emissive: 0x222222
        });
        const hatchFrame = new THREE.Mesh(hatchFrameGeo, hatchFrameMat);
        hatchFrame.position.z = -0.15;
        hatchGroup.add(hatchFrame);

        const hatchLightGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const hatchLightMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8
        });
        this.hatchLight = new THREE.Mesh(hatchLightGeo, hatchLightMat);
        this.hatchLight.position.set(0, 0.9, 0);
        hatchGroup.add(this.hatchLight);

        hatchGroup.position.set(0, -3.5, 0);
        group.add(hatchGroup);

        this.hatchGroup = hatchGroup;
        this.hatchMat = hatchMat;
        this.hatchHealth = 200;
        this.hatchMaxHealth = 200;
        this.hatchAlive = true;
        this.hatchSpawnTimer = 0;
        this.hatchSpawnInterval = 12;
        this.pendingSpawns = [];

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

        // Hatch spawning
        if (this.hatchAlive) {
            this.hatchSpawnTimer += deltaTime;
            // Pulse hatch light when about to spawn
            if (this.hatchSpawnTimer > this.hatchSpawnInterval - 3) {
                this.hatchLight.material.opacity = 0.5 + Math.sin(this.time * 12) * 0.5;
                this.hatchMat.emissive.setHex(0x00ff44);
            } else {
                this.hatchLight.material.opacity = 0.4 + Math.sin(this.time * 2) * 0.2;
                this.hatchMat.emissive.setHex(0x008844);
            }
            if (this.hatchSpawnTimer >= this.hatchSpawnInterval) {
                this.hatchSpawnTimer = 0;
                const hatchWorldPos = this.getHatchWorldPosition();
                const missileShip = new MissileShip(hatchWorldPos, this.scene, this.target);
                this.pendingSpawns.push(missileShip);
            }
        }

        return lasers.length > 0 ? lasers : null;
    }

    createLaser(direction) {
        const dir = direction.clone().normalize();
        const laser = new Laser(
            this.mesh.position.clone().add(dir.clone().multiplyScalar(4)),
            dir.clone(),
            this.scene
        );
        laser.mesh.material.color.setHex(0xff00ff);
        laser.damage = this.damage;
        laser.speed = 60;
        laser.velocity = dir.multiplyScalar(60);
        return laser;
    }

    getCoreWorldPosition() {
        const worldPos = new THREE.Vector3();
        this.core.getWorldPosition(worldPos);
        return worldPos;
    }

    getHatchWorldPosition() {
        if (!this.hatchGroup || !this.hatchGroup.parent) {
            return this.mesh.position.clone();
        }
        const worldPos = new THREE.Vector3();
        this.hatchGroup.getWorldPosition(worldPos);
        return worldPos;
    }

    destroyHatch() {
        // Visual: make hatch look destroyed
        this.hatchMat.color.setHex(0x333333);
        this.hatchMat.emissive.setHex(0x111111);
        this.hatchLight.material.opacity = 0;
        this.hatchLight.material.color.setHex(0x000000);
    }

    takeDamage(damage, hitPosition) {
        // Check hatch hit first (hatch is NOT protected by shield)
        if (this.hatchAlive && hitPosition) {
            const hatchPos = this.getHatchWorldPosition();
            const distToHatch = hitPosition.distanceTo(hatchPos);
            if (distToHatch < 3.5) {
                this.hatchHealth = Math.max(0, this.hatchHealth - damage);
                if (this.hatchHealth <= 0) {
                    this.hatchAlive = false;
                    this.destroyHatch();
                }
                return false;
            }
        }
        // Shield on = completely invulnerable (for main body)
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

        // Hatch debris
        if (this.hatchAlive) {
            const hatchGeo = new THREE.BoxGeometry(0.8, 0.5, 0.2);
            const hatchDebrisMat = new THREE.MeshPhongMaterial({ color: 0x00ff88, emissive: 0x008844 });
            const hatchFrag = new EnemyDebris(pos.clone().add(new THREE.Vector3(0, -3, 0)), hatchGeo, hatchDebrisMat, this.scene);
            hatchFrag.velocity.set(0, -10, 3);
            fragments.push(hatchFrag);
        }

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