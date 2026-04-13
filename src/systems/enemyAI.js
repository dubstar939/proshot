// ============================================
// ENEMY AI SYSTEM MODULE
// Patrol, chase, search, attack states
// Line-of-sight detection
// Modular behavior/state machine
// ============================================

import * as THREE from "three";

const ENEMY_CONFIG = {
  // Movement
  patrolSpeed: 2,
  chaseSpeed: 5,
  attackSpeed: 1.5,
  
  // Detection
  detectRange: 30,
  attackRange: 15,
  loseSightRange: 50,
  fieldOfView: Math.PI * 1.5, // 270 degrees
  
  // Behavior
  patrolWaitTime: 2,
  searchDuration: 5,
  attackCooldown: 1,
  
  // Health
  baseHealth: 100,
};

// Enemy states
const ENEMY_STATE = {
  IDLE: 'idle',
  PATROL: 'patrol',
  CHASE: 'chase',
  SEARCH: 'search',
  ATTACK: 'attack',
  ALERTED: 'alerted',
  DEAD: 'dead',
};

class EnemyAI {
  constructor(scene, player, startPosition, patrolPoints = []) {
    this.scene = scene;
    this.player = player;
    this.state = ENEMY_STATE.PATROL;
    
    // Create enemy mesh
    this.createEnemyMesh(startPosition);
    
    // Position and movement
    this.position = startPosition.clone();
    this.velocity = new THREE.Vector3();
    this.targetPosition = null;
    
    // Patrol
    this.patrolPoints = patrolPoints;
    this.currentPatrolIndex = 0;
    this.patrolWaitTimer = 0;
    
    // Detection
    this.lastKnownPlayerPosition = null;
    this.searchTimer = 0;
    this.detectTimer = 0;
    
    // Attack
    this.attackTimer = 0;
    this.canAttack = true;
    
    // Health
    this.health = ENEMY_CONFIG.baseHealth;
    this.maxHealth = ENEMY_CONFIG.baseHealth;
    this.isDead = false;
    
    // Line of sight cache
    this.raycaster = new THREE.Raycaster();
    
    // Callbacks
    this.onDeathCallback = null;
    this.onHitCallback = null;
    this.onAlertCallback = null;
  }
  
  createEnemyMesh(position) {
    // Simple enemy representation - can be replaced with actual model
    const geometry = new THREE.CapsuleGeometry(0.4, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff4444,
      roughness: 0.7,
      metalness: 0.3
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Add user data for hit detection
    this.mesh.userData = {
      enemy: this,
      onHit: (damage, point, normal) => this.takeDamage(damage, point, normal)
    };
    
    this.scene.add(this.mesh);
    
    // Add health bar
    this.createHealthBar();
  }
  
  createHealthBar() {
    const barGeometry = new THREE.BoxGeometry(1, 0.1, 0.05);
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.healthBar = new THREE.Mesh(barGeometry, barMaterial);
    this.healthBar.position.set(0, 1.2, 0);
    this.mesh.add(this.healthBar);
    
    // Background
    const bgGeometry = new THREE.BoxGeometry(1.1, 0.12, 0.06);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    this.healthBarBg.position.set(0, 0, -0.01);
    this.healthBar.add(this.healthBarBg);
  }
  
  updateHealthBar() {
    if (!this.healthBar) return;
    
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.scale.x = healthPercent;
    
    // Change color based on health
    if (healthPercent > 0.5) {
      this.healthBar.material.color.setHex(0x00ff00);
    } else if (healthPercent > 0.25) {
      this.healthBar.material.color.setHex(0xffff00);
    } else {
      this.healthBar.material.color.setHex(0xff0000);
    }
  }
  
  setCallbacks(onDeath, onHit, onAlert) {
    this.onDeathCallback = onDeath;
    this.onHitCallback = onHit;
    this.onAlertCallback = onAlert;
  }
  
  takeDamage(damage, point, normal) {
    if (this.isDead) return;
    
    this.health -= damage;
    this.updateHealthBar();
    
    // Flash red on hit
    this.flashOnHit();
    
    // Alert enemy
    if (this.state !== ENEMY_STATE.CHASE && this.state !== ENEMY_STATE.ATTACK) {
      this.state = ENEMY_STATE.ALERTED;
      if (this.onAlertCallback) {
        this.onAlertCallback(this);
      }
    }
    
    if (this.onHitCallback) {
      this.onHitCallback(this, damage);
    }
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  flashOnHit() {
    const originalColor = this.mesh.material.color.getHex();
    this.mesh.material.color.setHex(0xffffff);
    
    setTimeout(() => {
      this.mesh.material.color.setHex(originalColor);
    }, 100);
  }
  
  die() {
    this.isDead = true;
    this.state = ENEMY_STATE.DEAD;
    
    // Fall over
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y = 0.3;
    
    // Change color to indicate death
    this.mesh.material.color.setHex(0x660000);
    
    // Hide health bar
    if (this.healthBar) {
      this.healthBar.visible = false;
    }
    
    if (this.onDeathCallback) {
      this.onDeathCallback(this);
    }
    
    // Remove after delay
    setTimeout(() => {
      this.dispose();
    }, 10000);
  }
  
  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
    }
  }
  
  update(deltaTime, worldOctree) {
    if (this.isDead) return;
    
    // Update timers
    if (this.patrolWaitTimer > 0) this.patrolWaitTimer -= deltaTime;
    if (this.searchTimer > 0) this.searchTimer -= deltaTime;
    if (this.attackTimer > 0) this.attackTimer -= deltaTime;
    
    // State machine
    switch (this.state) {
      case ENEMY_STATE.IDLE:
        this.updateIdle(deltaTime);
        break;
      case ENEMY_STATE.PATROL:
        this.updatePatrol(deltaTime);
        break;
      case ENEMY_STATE.CHASE:
        this.updateChase(deltaTime, worldOctree);
        break;
      case ENEMY_STATE.SEARCH:
        this.updateSearch(deltaTime);
        break;
      case ENEMY_STATE.ATTACK:
        this.updateAttack(deltaTime, worldOctree);
        break;
      case ENEMY_STATE.ALERTED:
        this.updateAlerted(deltaTime, worldOctree);
        break;
    }
    
    // Apply velocity
    this.position.addScaledVector(this.velocity, deltaTime);
    this.mesh.position.copy(this.position);
    
    // Reset velocity
    this.velocity.multiplyScalar(0.9);
  }
  
  updateIdle(deltaTime) {
    // Check for player
    if (this.canSeePlayer()) {
      this.state = ENEMY_STATE.CHASE;
      return;
    }
    
    // Randomly look around
    this.mesh.rotation.y += (Math.random() - 0.5) * 0.5 * deltaTime;
    
    // Transition to patrol after random time
    if (Math.random() < 0.01) {
      this.state = ENEMY_STATE.PATROL;
    }
  }
  
  updatePatrol(deltaTime) {
    // Check for player
    if (this.canSeePlayer()) {
      this.state = ENEMY_STATE.CHASE;
      return;
    }
    
    // No patrol points? Stay idle
    if (this.patrolPoints.length === 0) {
      this.state = ENEMY_STATE.IDLE;
      return;
    }
    
    // Wait at current point
    if (this.patrolWaitTimer > 0) {
      return;
    }
    
    // Get target patrol point
    if (!this.targetPosition || this.targetPosition.distanceTo(this.position) < 0.5) {
      this.targetPosition = this.patrolPoints[this.currentPatrolIndex].clone();
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      this.patrolWaitTimer = ENEMY_CONFIG.patrolWaitTime;
    }
    
    // Move towards target
    this.moveToTarget(deltaTime, ENEMY_CONFIG.patrolSpeed);
  }
  
  updateChase(deltaTime, worldOctree) {
    const playerPos = this.getPlayerPosition();
    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // Lost player?
    if (!this.canSeePlayer() && distanceToPlayer > ENEMY_CONFIG.loseSightRange) {
      this.state = ENEMY_STATE.SEARCH;
      this.lastKnownPlayerPosition = playerPos.clone();
      this.searchTimer = ENEMY_CONFIG.searchDuration;
      return;
    }
    
    // In attack range?
    if (distanceToPlayer < ENEMY_CONFIG.attackRange && this.canSeePlayer()) {
      this.state = ENEMY_STATE.ATTACK;
      return;
    }
    
    // Move towards player
    this.targetPosition = playerPos;
    this.moveToTarget(deltaTime, ENEMY_CONFIG.chaseSpeed);
  }
  
  updateSearch(deltaTime) {
    // Check for player
    if (this.canSeePlayer()) {
      this.state = ENEMY_STATE.CHASE;
      return;
    }
    
    // Search timer expired?
    if (this.searchTimer <= 0) {
      this.state = ENEMY_STATE.PATROL;
      return;
    }
    
    // Move to last known position
    if (this.lastKnownPlayerPosition) {
      this.targetPosition = this.lastKnownPlayerPosition;
      
      if (this.position.distanceTo(this.targetPosition) < 0.5) {
        // Look around
        this.mesh.rotation.y += deltaTime * 0.5;
      } else {
        this.moveToTarget(deltaTime, ENEMY_CONFIG.chaseSpeed);
      }
    }
  }
  
  updateAttack(deltaTime, worldOctree) {
    const playerPos = this.getPlayerPosition();
    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // Player out of range or not visible?
    if (distanceToPlayer > ENEMY_CONFIG.attackRange * 1.5 || !this.canSeePlayer()) {
      this.state = ENEMY_STATE.CHASE;
      return;
    }
    
    // Face player
    this.lookAtPlayer(playerPos);
    
    // Attack cooldown
    if (this.attackTimer <= 0 && this.canAttack) {
      this.performAttack();
      this.attackTimer = ENEMY_CONFIG.attackCooldown;
    }
  }
  
  updateAlerted(deltaTime, worldOctree) {
    // Check for player
    if (this.canSeePlayer()) {
      this.state = ENEMY_STATE.CHASE;
      return;
    }
    
    // Look towards last sound direction
    if (this.lastKnownPlayerPosition) {
      this.lookAtPosition(this.lastKnownPlayerPosition);
    }
    
    // Return to patrol after timeout
    if (Math.random() < 0.005) {
      this.state = ENEMY_STATE.PATROL;
    }
  }
  
  moveToTarget(deltaTime, speed) {
    if (!this.targetPosition) return;
    
    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    const distance = direction.length();
    
    if (distance < 0.5) return;
    
    direction.normalize();
    
    // Simple collision avoidance
    this.raycaster.set(this.position, direction);
    // Could check against worldOctree here for obstacle avoidance
    
    this.velocity.addScaledVector(direction, speed * deltaTime * 10);
    
    // Face movement direction
    this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }
  
  lookAtPlayer(playerPos) {
    const direction = new THREE.Vector3().subVectors(playerPos, this.position);
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = angle;
  }
  
  lookAtPosition(pos) {
    const direction = new THREE.Vector3().subVectors(pos, this.position);
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = angle;
  }
  
  performAttack() {
    // Placeholder for attack logic
    // Could spawn projectiles or deal damage to player
    console.log('Enemy attacks!');
  }
  
  canSeePlayer() {
    const playerPos = this.getPlayerPosition();
    const direction = new THREE.Vector3().subVectors(playerPos, this.position);
    const distance = direction.length();
    
    // Too far?
    if (distance > ENEMY_CONFIG.detectRange) return false;
    
    // Behind enemy?
    direction.normalize();
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
    const dotProduct = forward.dot(direction);
    
    if (dotProduct < Math.cos(ENEMY_CONFIG.fieldOfView / 2)) return false;
    
    // Raycast for line of sight
    this.raycaster.set(this.position.clone().add(new THREE.Vector3(0, 0.8, 0)), direction);
    
    // Check if ray hits player before obstacles
    // This is simplified - in production you'd check against world geometry
    const intersects = this.raycaster.intersectObject(this.player, true);
    
    return intersects.length > 0 && intersects[0].distance < distance * 1.1;
  }
  
  getPlayerPosition() {
    // Get player position from camera or collider
    if (this.player.position) {
      return this.player.position.clone();
    }
    return new THREE.Vector3();
  }
  
  alert(distance) {
    // Alert enemy due to sound or other stimulus
    if (distance < ENEMY_CONFIG.detectRange) {
      this.state = ENEMY_STATE.ALERTED;
      this.lastKnownPlayerPosition = this.position.clone().add(
        new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(distance)
      );
      
      if (this.onAlertCallback) {
        this.onAlertCallback(this);
      }
    }
  }
}

class EnemyManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enemies = [];
    this.spawnPoints = [];
    this.activeEnemies = [];
    
    // Stats
    this.enemiesKilled = 0;
    this.totalEnemiesSpawned = 0;
  }
  
  addSpawnPoint(position) {
    this.spawnPoints.push(position.clone());
  }
  
  spawnEnemy(position, patrolPoints = []) {
    const enemy = new EnemyAI(this.scene, this.player, position, patrolPoints);
    
    // Set callbacks
    enemy.setCallbacks(
      (e) => this.onEnemyDeath(e),
      (e, damage) => this.onEnemyHit(e, damage),
      (e) => this.onEnemyAlert(e)
    );
    
    this.enemies.push(enemy);
    this.activeEnemies.push(enemy);
    this.totalEnemiesSpawned++;
    
    return enemy;
  }
  
  spawnFromPool() {
    if (this.spawnPoints.length === 0) return null;
    
    const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    
    // Create simple patrol route nearby
    const patrolPoints = [];
    for (let i = 0; i < 3; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        0,
        (Math.random() - 0.5) * 10
      );
      patrolPoints.push(spawnPoint.clone().add(offset));
    }
    
    return this.spawnEnemy(spawnPoint, patrolPoints);
  }
  
  onEnemyDeath(enemy) {
    this.enemiesKilled++;
    
    // Remove from active list
    const index = this.activeEnemies.indexOf(enemy);
    if (index > -1) {
      this.activeEnemies.splice(index, 1);
    }
  }
  
  onEnemyHit(enemy, damage) {
    // Could trigger achievements, sounds, etc.
  }
  
  onEnemyAlert(enemy) {
    // Alert nearby enemies
    for (const other of this.activeEnemies) {
      if (other !== enemy && other.position.distanceTo(enemy.position) < 20) {
        other.alert(other.position.distanceTo(enemy.position));
      }
    }
  }
  
  update(deltaTime, worldOctree) {
    for (const enemy of this.activeEnemies) {
      enemy.update(deltaTime, worldOctree);
    }
    
    // Clean up dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].isDead && this.enemies[i].mesh.parent === null) {
        this.enemies.splice(i, 1);
      }
    }
  }
  
  getActiveEnemyCount() {
    return this.activeEnemies.length;
  }
  
  getAllEnemies() {
    return this.enemies;
  }
  
  clearAll() {
    for (const enemy of this.enemies) {
      enemy.dispose();
    }
    this.enemies = [];
    this.activeEnemies = [];
  }
}

export { EnemyAI, EnemyManager, ENEMY_STATE, ENEMY_CONFIG };
