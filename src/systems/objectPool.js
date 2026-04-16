// ============================================
// OBJECT POOL SYSTEM
// Efficient object reuse for bullets, particles, enemies
// Reduces garbage collection and memory allocation
// ============================================

import * as THREE from 'three';

/**
 * Generic Object Pool
 * Manages reusable object instances to minimize allocations
 * 
 * @class ObjectPool
 * @template T
 */
class ObjectPool {
  /**
   * Create an object pool
   * @param {Function} factory - Function that creates new instances
   * @param {Function} reset - Function that resets an instance for reuse
   * @param {number} initialSize - Initial pool size
   * @param {number} maxSize - Maximum pool size (0 = unlimited)
   */
  constructor(factory, reset, initialSize = 10, maxSize = 100) {
    this._factory = factory;
    this._reset = reset;
    this._maxSize = maxSize;
    
    this._available = [];
    this._active = new Set();
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this._available.push(this._factory());
    }
    
    // Stats
    this._stats = {
      created: initialSize,
      acquired: 0,
      released: 0,
      peakActive: 0,
    };
  }
  
  /**
   * Acquire an object from the pool
   * @returns {T} - Pool object
   */
  acquire() {
    let obj;
    
    if (this._available.length > 0) {
      obj = this._available.pop();
    } else if (this._maxSize === 0 || this._stats.created < this._maxSize) {
      obj = this._factory();
      this._stats.created++;
    } else {
      console.warn('[ObjectPool] Pool exhausted, reusing active object');
      // Steal the oldest active object
      const iterator = this._active.values();
      obj = iterator.next().value;
      this._active.delete(obj);
      this._reset(obj);
    }
    
    this._active.add(obj);
    this._stats.acquired++;
    this._stats.peakActive = Math.max(this._stats.peakActive, this._active.size);
    
    return obj;
  }
  
  /**
   * Release an object back to the pool
   * @param {T} obj - Object to release
   */
  release(obj) {
    if (!this._active.has(obj)) {
      console.warn('[ObjectPool] Attempted to release object not in active set');
      return;
    }
    
    this._active.delete(obj);
    this._reset(obj);
    this._available.push(obj);
    this._stats.released++;
  }
  
  /**
   * Release all active objects
   */
  releaseAll() {
    for (const obj of this._active) {
      this._reset(obj);
      this._available.push(obj);
    }
    this._active.clear();
  }
  
  /**
   * Get number of available objects
   * @returns {number}
   */
  getAvailableCount() {
    return this._available.length;
  }
  
  /**
   * Get number of active objects
   * @returns {number}
   */
  getActiveCount() {
    return this._active.size;
  }
  
  /**
   * Get pool statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this._stats };
  }
  
  /**
   * Iterate over active objects
   * @param {Function} callback - Called with each active object
   */
  forEachActive(callback) {
    for (const obj of this._active) {
      callback(obj);
    }
  }
  
  /**
   * Dispose of the pool
   * @param {Function} dispose - Optional disposal function for objects
   */
  dispose(dispose) {
    if (dispose) {
      for (const obj of this._available) {
        dispose(obj);
      }
      for (const obj of this._active) {
        dispose(obj);
      }
    }
    
    this._available = [];
    this._active.clear();
  }
}

/**
 * Projectile Pool - Specialized pool for bullets/projectiles
 * 
 * @class ProjectilePool
 */
class ProjectilePool extends ObjectPool {
  /**
   * Create a projectile pool
   * @param {THREE.Scene} scene - Scene to add projectiles to
   * @param {Object} config - Projectile configuration
   */
  constructor(scene, config = {}) {
    const geometry = config.geometry || new THREE.SphereGeometry(0.02, 8, 8);
    const material = config.material || new THREE.MeshBasicMaterial({
      color: config.color || 0xffff00,
    });
    
    const factory = () => {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.userData.velocity = new THREE.Vector3();
      mesh.userData.damage = 0;
      mesh.userData.owner = null;
      mesh.userData.lifetime = 0;
      mesh.userData.maxLifetime = config.maxLifetime || 3;
      mesh.userData.active = false;
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    };
    
    const reset = (mesh) => {
      mesh.position.set(0, -1000, 0);
      mesh.userData.velocity.set(0, 0, 0);
      mesh.userData.damage = 0;
      mesh.userData.owner = null;
      mesh.userData.lifetime = 0;
      mesh.userData.active = false;
      mesh.visible = false;
    };
    
    super(factory, reset, config.initialSize || 50, config.maxSize || 200);
    
    this._scene = scene;
    this._geometry = geometry;
    this._material = material;
  }
  
  /**
   * Spawn a projectile
   * @param {THREE.Vector3} position - Start position
   * @param {THREE.Vector3} direction - Direction (will be normalized)
   * @param {number} speed - Projectile speed
   * @param {number} damage - Damage amount
   * @param {*} owner - Owner entity
   * @returns {THREE.Mesh} - Projectile mesh
   */
  spawn(position, direction, speed, damage, owner = null) {
    const projectile = this.acquire();
    
    projectile.position.copy(position);
    projectile.userData.velocity.copy(direction).normalize().multiplyScalar(speed);
    projectile.userData.damage = damage;
    projectile.userData.owner = owner;
    projectile.userData.lifetime = 0;
    projectile.userData.active = true;
    projectile.visible = true;
    
    return projectile;
  }
  
  /**
   * Update all active projectiles
   * @param {number} deltaTime - Time since last update
   * @param {Function} hitCallback - Called when projectile hits something
   */
  update(deltaTime, hitCallback) {
    const toRelease = [];
    
    this.forEachActive((projectile) => {
      if (!projectile.userData.active) return;
      
      // Update position
      projectile.position.addScaledVector(projectile.userData.velocity, deltaTime);
      
      // Update lifetime
      projectile.userData.lifetime += deltaTime;
      
      // Check expiration
      if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
        toRelease.push(projectile);
        return;
      }
      
      // Hit callback should return true if projectile should be removed
      if (hitCallback && hitCallback(projectile)) {
        toRelease.push(projectile);
      }
    });
    
    // Release expired/hit projectiles
    for (const projectile of toRelease) {
      this.release(projectile);
    }
  }
  
  /**
   * Dispose of the projectile pool
   */
  dispose() {
    super.dispose((mesh) => {
      this._scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    
    this._geometry.dispose();
    this._material.dispose();
  }
}

/**
 * Particle Pool - For visual effects particles
 * 
 * @class ParticlePool
 */
class ParticlePool {
  /**
   * Create a particle pool
   * @param {THREE.Scene} scene - Scene to add particles to
   * @param {Object} config - Particle configuration
   */
  constructor(scene, config = {}) {
    this._scene = scene;
    this._maxParticles = config.maxParticles || 1000;
    
    // Use instanced mesh for performance
    const geometry = config.geometry || new THREE.PlaneGeometry(0.1, 0.1);
    const material = config.material || new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    this._instancedMesh = new THREE.InstancedMesh(geometry, material, this._maxParticles);
    this._instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._instancedMesh.frustumCulled = false;
    scene.add(this._instancedMesh);
    
    // Particle data
    this._particles = [];
    this._activeCount = 0;
    
    // Pre-allocate particle data
    for (let i = 0; i < this._maxParticles; i++) {
      this._particles.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        acceleration: new THREE.Vector3(0, -9.8, 0),
        color: new THREE.Color(1, 1, 1),
        size: 0.1,
        lifetime: 0,
        maxLifetime: 1,
        alpha: 1,
        alphaDecay: 1,
        rotation: 0,
        rotationSpeed: 0,
      });
    }
    
    // Temporary matrix for updates
    this._tempMatrix = new THREE.Matrix4();
    this._tempQuaternion = new THREE.Quaternion();
    this._tempScale = new THREE.Vector3();
  }
  
  /**
   * Emit particles
   * @param {THREE.Vector3} position - Emission position
   * @param {Object} config - Particle configuration
   * @param {number} count - Number of particles to emit
   */
  emit(position, config = {}, count = 1) {
    for (let i = 0; i < count; i++) {
      // Find inactive particle
      let particle = null;
      for (let j = 0; j < this._maxParticles; j++) {
        if (!this._particles[j].active) {
          particle = this._particles[j];
          break;
        }
      }
      
      if (!particle) return; // Pool full
      
      // Initialize particle
      particle.active = true;
      particle.position.copy(position);
      
      // Add random offset
      if (config.spread) {
        particle.position.x += (Math.random() - 0.5) * config.spread;
        particle.position.y += (Math.random() - 0.5) * config.spread;
        particle.position.z += (Math.random() - 0.5) * config.spread;
      }
      
      // Velocity
      if (config.velocity) {
        particle.velocity.copy(config.velocity);
      } else {
        particle.velocity.set(
          (Math.random() - 0.5) * (config.velocitySpread || 2),
          Math.random() * (config.velocityUp || 2),
          (Math.random() - 0.5) * (config.velocitySpread || 2)
        );
      }
      
      // Add velocity variation
      if (config.velocityVariation) {
        particle.velocity.x += (Math.random() - 0.5) * config.velocityVariation;
        particle.velocity.y += (Math.random() - 0.5) * config.velocityVariation;
        particle.velocity.z += (Math.random() - 0.5) * config.velocityVariation;
      }
      
      // Acceleration
      particle.acceleration.set(0, config.gravity !== undefined ? config.gravity : -9.8, 0);
      
      // Visual properties
      particle.color.set(config.color || 0xffffff);
      particle.size = config.size || 0.1;
      particle.lifetime = 0;
      particle.maxLifetime = config.lifetime || 1;
      particle.alpha = 1;
      particle.alphaDecay = config.alphaDecay !== undefined ? config.alphaDecay : 1;
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = (Math.random() - 0.5) * (config.rotationSpeed || 2);
      
      this._activeCount++;
    }
  }
  
  /**
   * Update all particles
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Camera} camera - Camera for billboarding
   */
  update(deltaTime, camera) {
    this._activeCount = 0;
    
    for (let i = 0; i < this._maxParticles; i++) {
      const particle = this._particles[i];
      
      if (!particle.active) {
        // Hide inactive particles
        this._tempMatrix.makeScale(0, 0, 0);
        this._instancedMesh.setMatrixAt(i, this._tempMatrix);
        continue;
      }
      
      // Update lifetime
      particle.lifetime += deltaTime;
      
      if (particle.lifetime >= particle.maxLifetime) {
        particle.active = false;
        this._tempMatrix.makeScale(0, 0, 0);
        this._instancedMesh.setMatrixAt(i, this._tempMatrix);
        continue;
      }
      
      // Update physics
      particle.velocity.addScaledVector(particle.acceleration, deltaTime);
      particle.position.addScaledVector(particle.velocity, deltaTime);
      
      // Update visuals
      const lifeRatio = particle.lifetime / particle.maxLifetime;
      particle.alpha = 1 - (lifeRatio * particle.alphaDecay);
      particle.rotation += particle.rotationSpeed * deltaTime;
      
      // Size can shrink over lifetime
      const currentSize = particle.size * (1 - lifeRatio * 0.5);
      
      // Billboard towards camera
      if (camera) {
        this._tempQuaternion.copy(camera.quaternion);
      }
      
      // Build matrix
      this._tempMatrix.compose(
        particle.position,
        this._tempQuaternion,
        this._tempScale.set(currentSize, currentSize, currentSize)
      );
      
      this._instancedMesh.setMatrixAt(i, this._tempMatrix);
      this._activeCount++;
    }
    
    this._instancedMesh.instanceMatrix.needsUpdate = true;
    this._instancedMesh.count = this._maxParticles;
  }
  
  /**
   * Get active particle count
   * @returns {number}
   */
  getActiveCount() {
    return this._activeCount;
  }
  
  /**
   * Clear all particles
   */
  clear() {
    for (const particle of this._particles) {
      particle.active = false;
    }
    this._activeCount = 0;
  }
  
  /**
   * Dispose of the particle pool
   */
  dispose() {
    this._scene.remove(this._instancedMesh);
    this._instancedMesh.geometry.dispose();
    this._instancedMesh.material.dispose();
  }
}

/**
 * Enemy Pool - For managing enemy instances
 * 
 * @class EnemyPool
 */
class EnemyPool extends ObjectPool {
  /**
   * Create an enemy pool
   * @param {THREE.Scene} scene - Scene to add enemies to
   * @param {Function} createEnemy - Factory function for creating enemies
   * @param {Function} resetEnemy - Reset function for recycling enemies
   * @param {number} initialSize - Initial pool size
   */
  constructor(scene, createEnemy, resetEnemy, initialSize = 10) {
    super(createEnemy, resetEnemy, initialSize, 50);
    this._scene = scene;
  }
  
  /**
   * Spawn an enemy
   * @param {THREE.Vector3} position - Spawn position
   * @param {Object} config - Enemy configuration
   * @returns {Object} - Enemy instance
   */
  spawn(position, config = {}) {
    const enemy = this.acquire();
    
    if (enemy.mesh) {
      enemy.mesh.position.copy(position);
      enemy.mesh.visible = true;
      this._scene.add(enemy.mesh);
    }
    
    // Apply config
    if (config.health !== undefined) enemy.health = config.health;
    if (config.maxHealth !== undefined) enemy.maxHealth = config.maxHealth;
    if (config.damage !== undefined) enemy.damage = config.damage;
    if (config.speed !== undefined) enemy.speed = config.speed;
    if (config.type !== undefined) enemy.type = config.type;
    
    enemy.isActive = true;
    
    return enemy;
  }
  
  /**
   * Despawn an enemy
   * @param {Object} enemy - Enemy to despawn
   */
  despawn(enemy) {
    if (enemy.mesh) {
      enemy.mesh.visible = false;
      this._scene.remove(enemy.mesh);
    }
    
    enemy.isActive = false;
    this.release(enemy);
  }
}

export {
  ObjectPool,
  ProjectilePool,
  ParticlePool,
  EnemyPool,
};
