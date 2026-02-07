// Particle System for realistic effects

class ParticleSystem {
    constructor(scene, maxParticles = 1000) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = maxParticles;

        // Create geometry and material for particle system
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(maxParticles * 3);
        this.colors = new Float32Array(maxParticles * 3);
        this.sizes = new Float32Array(maxParticles);
        this.velocities = [];
        this.lifetimes = [];
        this.ages = [];

        for (let i = 0; i < maxParticles; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = 0;
            this.positions[i * 3 + 2] = 0;
            this.colors[i * 3] = 1;
            this.colors[i * 3 + 1] = 1;
            this.colors[i * 3 + 2] = 1;
            this.sizes[i] = 0;
            this.velocities.push(new THREE.Vector3());
            this.lifetimes.push(0);
            this.ages.push(0);
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        // Particle texture
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const texture = new THREE.CanvasTexture(canvas);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: texture }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                    gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
                    if (gl_FragColor.a < 0.01) discard;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        this.particleSystem = new THREE.Points(this.geometry, this.material);
        scene.add(this.particleSystem);

        this.activeCount = 0;
    }

    emit(position, velocity, color, size, lifetime, count = 1) {
        for (let i = 0; i < count && this.activeCount < this.maxParticles; i++) {
            const index = this.activeCount;

            // Position
            this.positions[index * 3] = position.x;
            this.positions[index * 3 + 1] = position.y;
            this.positions[index * 3 + 2] = position.z;

            // Color
            this.colors[index * 3] = color.r;
            this.colors[index * 3 + 1] = color.g;
            this.colors[index * 3 + 2] = color.b;

            // Size
            this.sizes[index] = size;

            // Velocity with randomness
            const vel = velocity.clone();
            vel.x += (Math.random() - 0.5) * 0.5;
            vel.y += (Math.random() - 0.5) * 0.5;
            vel.z += (Math.random() - 0.5) * 0.5;
            this.velocities[index].copy(vel);

            // Lifetime
            this.lifetimes[index] = lifetime;
            this.ages[index] = 0;

            this.activeCount++;
        }
    }

    createExplosion(position, color = new THREE.Color(1, 0.5, 0), particleCount = 50) {
        for (let i = 0; i < particleCount; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            const size = Math.random() * 3 + 1;
            const lifetime = Math.random() * 0.5 + 0.5;

            // Vary color slightly
            const particleColor = color.clone();
            particleColor.r += (Math.random() - 0.5) * 0.3;
            particleColor.g += (Math.random() - 0.5) * 0.3;

            this.emit(position, velocity, particleColor, size, lifetime);
        }
    }

    createMineExplosion(position) {
        // Bright white flash at center
        for (let i = 0; i < 30; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 3
            );
            this.emit(position, velocity, new THREE.Color(1, 1, 1), Math.random() * 8 + 5, 0.15 + Math.random() * 0.1);
        }

        // Massive orange/red fireball core
        for (let i = 0; i < 250; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 18
            );
            const size = Math.random() * 6 + 2;
            const lifetime = Math.random() * 1.0 + 0.5;
            const color = new THREE.Color();
            const r = Math.random();
            if (r < 0.35) {
                color.setRGB(1, 0.1 + Math.random() * 0.2, 0);       // deep red
            } else if (r < 0.65) {
                color.setRGB(1, 0.4 + Math.random() * 0.3, 0);       // orange
            } else if (r < 0.85) {
                color.setRGB(1, 0.7 + Math.random() * 0.3, 0);       // yellow-orange
            } else {
                color.setRGB(1, 1, 0.5 + Math.random() * 0.5);       // white-yellow
            }
            this.emit(position, velocity, color, size, lifetime);
        }

        // Inner shockwave ring (fast, tight)
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            const speed = 30 + Math.random() * 10;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0
            );
            this.emit(position, velocity, new THREE.Color(1, 0.8, 0.3), Math.random() * 3 + 2, 0.2 + Math.random() * 0.1);
        }

        // Outer shockwave ring (slower, wider)
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 * i) / 80;
            const speed = 15 + Math.random() * 12;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                (Math.random() - 0.5) * 4
            );
            const color = new THREE.Color(1, 0.3 + Math.random() * 0.3, 0);
            this.emit(position, velocity, color, Math.random() * 2 + 1, 0.4 + Math.random() * 0.3);
        }

        // Sparks flying outward
        for (let i = 0; i < 50; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 20
            );
            const color = new THREE.Color(1, 0.8 + Math.random() * 0.2, 0.2 + Math.random() * 0.3);
            this.emit(position, velocity, color, Math.random() * 1.5 + 0.5, 0.5 + Math.random() * 0.4);
        }

        // Lingering smoke/debris
        for (let i = 0; i < 60; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5
            );
            const g = 0.1 + Math.random() * 0.15;
            const color = new THREE.Color(g, g * 0.6, g * 0.2);
            this.emit(position, velocity, color, Math.random() * 4 + 2, 1.0 + Math.random() * 0.8);
        }
    }

    createShuttleFire(position) {
        // Flames rising from the shuttle
        for (let i = 0; i < 3; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 1.5,
                Math.random() * 0.5
            );
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                2 + Math.random() * 3
            );
            const r = Math.random();
            const color = new THREE.Color();
            if (r < 0.4) {
                color.setRGB(1, 0.15 + Math.random() * 0.15, 0);  // red-orange
            } else if (r < 0.75) {
                color.setRGB(1, 0.5 + Math.random() * 0.3, 0);    // orange-yellow
            } else {
                color.setRGB(1, 0.9, 0.3 + Math.random() * 0.3);  // bright yellow
            }
            const size = Math.random() * 2.5 + 1;
            const lifetime = 0.2 + Math.random() * 0.25;
            this.emit(position.clone().add(offset), velocity, color, size, lifetime);
        }
        // Dark smoke wisps
        if (Math.random() < 0.5) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 1.5,
                0.5
            );
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                3 + Math.random() * 2
            );
            const g = 0.15 + Math.random() * 0.1;
            this.emit(position.clone().add(offset), velocity, new THREE.Color(g, g * 0.5, 0), Math.random() * 2 + 1, 0.4 + Math.random() * 0.3);
        }
    }

    createDebris(position, color = new THREE.Color(0.6, 0.4, 0.2), particleCount = 12) {
        for (let i = 0; i < particleCount; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 5
            );
            const size = Math.random() * 0.6 + 0.2;
            const lifetime = Math.random() * 0.3 + 0.15;

            const particleColor = color.clone();
            particleColor.r += (Math.random() - 0.5) * 0.2;
            particleColor.g += (Math.random() - 0.5) * 0.15;
            particleColor.b += (Math.random() - 0.5) * 0.1;

            this.emit(position, velocity, particleColor, size, lifetime);
        }
    }

    createEngineTrail(position, direction, isBoost = false) {
        const count = isBoost ? 5 : 2;
        const baseColor = isBoost ?
            new THREE.Color(0.3, 0.5, 1) :
            new THREE.Color(1, 0.8, 0.3);

        for (let i = 0; i < count; i++) {
            const velocity = direction.clone().multiplyScalar(-5);
            velocity.x += (Math.random() - 0.5) * 2;
            velocity.y += (Math.random() - 0.5) * 2;
            velocity.z += (Math.random() - 0.5) * 2;

            const size = isBoost ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5;
            const lifetime = Math.random() * 0.3 + 0.2;

            this.emit(position, velocity, baseColor, size, lifetime);
        }
    }

    createLaserTrail(position, direction, color = new THREE.Color(0, 1, 0)) {
        const velocity = direction.clone().multiplyScalar(-2);
        this.emit(position, velocity, color, 0.5, 0.1);
    }

    update(deltaTime) {
        let stillActive = 0;

        for (let i = 0; i < this.activeCount; i++) {
            this.ages[i] += deltaTime;

            if (this.ages[i] < this.lifetimes[i]) {
                // Update position
                this.positions[i * 3] += this.velocities[i].x * deltaTime;
                this.positions[i * 3 + 1] += this.velocities[i].y * deltaTime;
                this.positions[i * 3 + 2] += this.velocities[i].z * deltaTime;

                // Fade out
                const lifeRatio = this.ages[i] / this.lifetimes[i];
                const fadedSize = this.sizes[i] * (1 - lifeRatio * 0.8);

                // Move active particle to current position
                if (i !== stillActive) {
                    // Copy to active position
                    this.positions[stillActive * 3] = this.positions[i * 3];
                    this.positions[stillActive * 3 + 1] = this.positions[i * 3 + 1];
                    this.positions[stillActive * 3 + 2] = this.positions[i * 3 + 2];

                    this.colors[stillActive * 3] = this.colors[i * 3];
                    this.colors[stillActive * 3 + 1] = this.colors[i * 3 + 1];
                    this.colors[stillActive * 3 + 2] = this.colors[i * 3 + 2];

                    this.sizes[stillActive] = fadedSize;

                    this.velocities[stillActive].copy(this.velocities[i]);
                    this.lifetimes[stillActive] = this.lifetimes[i];
                    this.ages[stillActive] = this.ages[i];
                } else {
                    this.sizes[stillActive] = fadedSize;
                }

                stillActive++;
            }
        }

        // Hide inactive particles
        for (let i = stillActive; i < this.activeCount; i++) {
            this.sizes[i] = 0;
        }

        this.activeCount = stillActive;

        // Update buffers
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }
}