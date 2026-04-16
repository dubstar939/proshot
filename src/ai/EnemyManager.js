// ============================================
// ENEMY MANAGER
// Spawns, tracks, and manages all enemies
// Wave-based spawning system
// Performance optimization with pooling
// ============================================

import * as THREE from 'three';
import { Enemy } from './Enemy.js';

class EnemyManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    
    this.enemies = [];
    this.activeEnemies = [];
    this.spawnPoints = [];
    this.enemyPool = [];
    
    // Stats
    this.enemiesKilled = 0;
    this.totalEnemiesSpawned = 0;
    this.currentWave = 0;
    
    // Configuration
    this.maxActiveEnemies = 20;
    this.poolSize = 30;
    
    // Initialize pool
    this.initializePool();
  }
  
  initializePool() {
    // Pre-create enemy objects for pooling
    for (let i = 0; i < this.poolSize; i++) {
      const dummyPosition = new THREE.Vector3(0, -100, 0);
      const enemy = new Enemy(this.scene, this.player, dummyPosition);
      enemy.mesh.visible = false;
      this.enemyPool.push({
        enemy: enemy,
        active: false,
      });
    }
  }
  
  addSpawnPoint(position, patrolPoints = []) {
    this.spawnPoints.push({
      position: position.clone(),
      patrolPoints: patrolPoints.map(p => p.clone()),
      used: false,
    });
  }
  
  spawnEnemy(position, patrolPoints = [], config = {}) {
    // Find inactive enemy from pool
    const pooled = this.enemyPool.find(p => !p.active);
    
    if (!pooled) {
      console.warn('Enemy pool exhausted!');
      return null;
    }
    
    const enemy = pooled.enemy;
    
    // Reset enemy state
    enemy.health = enemy.maxHealth;
    enemy.isDead = false;
    enemy.position.copy(position);
    enemy.mesh.position.copy(position);
    enemy.mesh.visible = true;
    enemy.mesh.rotation.set(0, 0, 0);
    enemy.mesh.material.color.setHex(0xff4444);
    enemy.patrolPoints = patrolPoints.map(p => p.clone());
    
    // Update health bar
    enemy.updateHealthBar();
    
    // Set callbacks
    enemy.setCallbacks(
      (e) => this.onEnemyDeath(e),
      (e, damage) => this.onEnemyHit(e, damage),
      (e) => this.onEnemyAlert(e),
      (e) => this.onEnemyDamageDealt(e)
    );
    
    pooled.active = true;
    this.activeEnemies.push(enemy);
    this.enemies.push(enemy);
    this.totalEnemiesSpawned++;
    
    return enemy;
  }
  
  spawnFromPoint(spawnPointIndex) {
    if (spawnPointIndex >= this.spawnPoints.length) return null;
    
    const spawnPoint = this.spawnPoints[spawnPointIndex];
    return this.spawnEnemy(spawnPoint.position, spawnPoint.patrolPoints);
  }
  
  spawnRandom() {
    if (this.spawnPoints.length === 0) return null;
    
    const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    return this.spawnEnemy(spawnPoint.position, spawnPoint.patrolPoints);
  }
  
  spawnWave(count, staggerDelay = 500) {
    const spawned = [];
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const enemy = this.spawnRandom();
        if (enemy) spawned.push(enemy);
      }, i * staggerDelay);
    }
    
    return spawned;
  }
  
  onEnemyDeath(enemy) {
    this.enemiesKilled++;
    
    // Remove from active list
    const index = this.activeEnemies.indexOf(enemy);
    if (index > -1) {
      this.activeEnemies.splice(index, 1);
    }
    
    // Return to pool after delay
    setTimeout(() => {
      enemy.mesh.visible = false;
      enemy.mesh.position.set(0, -100, 0);
      
      const pooled = this.enemyPool.find(p => p.enemy === enemy);
      if (pooled) {
        pooled.active = false;
      }
    }, 10000);
  }
  
  onEnemyHit(enemy, damage) {
    // Alert nearby enemies
    this.alertNearbyEnemies(enemy.position, 20);
  }
  
  onEnemyAlert(enemy) {
    this.alertNearbyEnemies(enemy.position, 20);
  }
  
  onEnemyDamageDealt(enemy) {
    // Track damage dealt to player
  }
  
  alertNearbyEnemies(position, radius) {
    for (const enemy of this.activeEnemies) {
      if (enemy.position.distanceTo(position) < radius && !enemy.isDead) {
        enemy.alert(position);
      }
    }
  }
  
  update(deltaTime, worldOctree) {
    for (const enemy of this.activeEnemies) {
      enemy.update(deltaTime, worldOctree);
    }
    
    // Clean up dead enemies that are ready to be removed
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDead && enemy.mesh.parent === null) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
          this.enemies.splice(index, 1);
        }
      }
    }
  }
  
  getActiveEnemyCount() {
    return this.activeEnemies.length;
  }
  
  getTotalEnemyCount() {
    return this.enemies.length;
  }
  
  getAllEnemies() {
    return this.enemies;
  }
  
  getActiveEnemies() {
    return this.activeEnemies;
  }
  
  getEnemiesByState(state) {
    return this.activeEnemies.filter(e => e.stateMachine.getCurrentState() === state);
  }
  
  clearAll() {
    for (const enemy of this.activeEnemies) {
      enemy.mesh.visible = false;
      enemy.mesh.position.set(0, -100, 0);
      
      const pooled = this.enemyPool.find(p => p.enemy === enemy);
      if (pooled) {
        pooled.active = false;
      }
    }
    
    this.activeEnemies = [];
    this.enemies = [];
  }
  
  dispose() {
    this.clearAll();
    
    for (const pooled of this.enemyPool) {
      pooled.enemy.dispose();
    }
    
    this.enemyPool = [];
    this.spawnPoints = [];
  }
}

export { EnemyManager };
