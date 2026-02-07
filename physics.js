// Physics system for realistic space movement

class Physics {
    constructor() {
        this.gravity = 0; // No gravity in space
        this.friction = 0.99; // Very slight friction for gameplay
    }

    updateVelocity(entity, acceleration, deltaTime) {
        // Apply acceleration to velocity
        entity.velocity.x += acceleration.x * deltaTime;
        entity.velocity.y += acceleration.y * deltaTime;
        entity.velocity.z += acceleration.z * deltaTime;

        // Apply friction
        entity.velocity.multiplyScalar(this.friction);

        // Limit maximum velocity
        const maxSpeed = entity.maxSpeed || 50;
        if (entity.velocity.length() > maxSpeed) {
            entity.velocity.normalize().multiplyScalar(maxSpeed);
        }
    }

    updatePosition(entity, deltaTime) {
        // Update position based on velocity
        entity.mesh.position.x += entity.velocity.x * deltaTime;
        entity.mesh.position.y += entity.velocity.y * deltaTime;
        entity.mesh.position.z += entity.velocity.z * deltaTime;
    }

    applyGravitationalPull(entity, blackHole, strengthMultiplier = 1) {
        const distance = entity.mesh.position.distanceTo(blackHole.mesh.position);
        const pullRadius = blackHole.pullRadius || blackHole.radius * 3;
        const strength = (blackHole.strength || 100) * strengthMultiplier;

        if (distance < pullRadius && distance > 0.1) {
            const direction = new THREE.Vector3()
                .subVectors(blackHole.mesh.position, entity.mesh.position)
                .normalize();

            const force = strength / (distance * distance);
            const maxForce = 25;
            const clampedForce = Math.min(force, maxForce);

            entity.velocity.add(direction.multiplyScalar(clampedForce * 0.016));
        }
    }

    checkCollision(obj1, obj2) {
        if (!obj1.mesh || !obj2.mesh) return false;

        const distance = obj1.mesh.position.distanceTo(obj2.mesh.position);
        const combinedRadius = (obj1.radius || 1) + (obj2.radius || 1);

        return distance < combinedRadius;
    }

    bounceObjects(obj1, obj2) {
        // Calculate collision normal
        const normal = new THREE.Vector3()
            .subVectors(obj2.mesh.position, obj1.mesh.position)
            .normalize();

        // Calculate relative velocity
        const relativeVelocity = new THREE.Vector3()
            .subVectors(obj1.velocity, obj2.velocity);

        // Calculate velocity along collision normal
        const velocityAlongNormal = relativeVelocity.dot(normal);

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (bounciness)
        const restitution = 0.7;

        // Calculate impulse scalar
        const mass1 = obj1.mass || 1;
        const mass2 = obj2.mass || 1;
        const impulse = 2 * velocityAlongNormal / (mass1 + mass2);

        // Apply impulse to velocities
        const impulseVector = normal.multiplyScalar(impulse);

        obj1.velocity.sub(impulseVector.clone().multiplyScalar(mass2 * restitution));
        obj2.velocity.add(impulseVector.clone().multiplyScalar(mass1 * restitution));

        // Separate objects to prevent overlap
        const overlap = (obj1.radius + obj2.radius) -
            obj1.mesh.position.distanceTo(obj2.mesh.position);

        if (overlap > 0) {
            const separation = normal.clone().multiplyScalar(overlap * 0.5);
            obj1.mesh.position.sub(separation);
            obj2.mesh.position.add(separation);
        }
    }

    keepInBounds(entity, bounds) {
        const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;

        // Check X bounds
        if (entity.mesh.position.x < minX) {
            entity.mesh.position.x = minX;
            entity.velocity.x = Math.abs(entity.velocity.x) * 0.5;
        } else if (entity.mesh.position.x > maxX) {
            entity.mesh.position.x = maxX;
            entity.velocity.x = -Math.abs(entity.velocity.x) * 0.5;
        }

        // Check Y bounds
        if (entity.mesh.position.y < minY) {
            entity.mesh.position.y = minY;
            entity.velocity.y = Math.abs(entity.velocity.y) * 0.5;
        } else if (entity.mesh.position.y > maxY) {
            entity.mesh.position.y = maxY;
            entity.velocity.y = -Math.abs(entity.velocity.y) * 0.5;
        }

        // Check Z bounds
        if (entity.mesh.position.z < minZ) {
            entity.mesh.position.z = minZ;
            entity.velocity.z = Math.abs(entity.velocity.z) * 0.5;
        } else if (entity.mesh.position.z > maxZ) {
            entity.mesh.position.z = maxZ;
            entity.velocity.z = -Math.abs(entity.velocity.z) * 0.5;
        }
    }

    predictTrajectory(position, velocity, time, steps = 10) {
        const points = [];
        const dt = time / steps;
        const pos = position.clone();
        const vel = velocity.clone();

        for (let i = 0; i <= steps; i++) {
            points.push(pos.clone());
            pos.add(vel.clone().multiplyScalar(dt));
            vel.multiplyScalar(this.friction);
        }

        return points;
    }
}