// ============================================
// GAME MANAGER MODULE
// Complete game loop: Start → Play → Win/Lose → Restart
// Wave system and enemy spawner
// Game state management
// Score tracking and statistics
// ============================================

import * as THREE from "three";

const GAME_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  WAVE_TRANSITION: 'wave_transition',
};

const GAME_CONFIG = {
  startingWave: 1,
  initialEnemies: 3,
  enemiesPerWaveIncrease: 2,
  waveTimeLimit: 120, // seconds per wave
  bonusTimePerKill: 5,
  maxWaves: 10,
};

class GameManager {
  constructor(scene, uiManager) {
    this.scene = scene;
    this.uiManager = uiManager;
    
    this.state = GAME_STATE.MENU;
    this.currentWave = GAME_CONFIG.startingWave;
    this.enemiesRemaining = 0;
    this.enemiesKilled = 0;
    this.totalKills = 0;
    this.score = 0;
    this.timeElapsed = 0;
    this.waveTimeRemaining = GAME_CONFIG.waveTimeLimit;
    
    // Statistics
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      damageTaken: 0,
      healthPacksUsed: 0,
      ammoPacksUsed: 0,
      deaths: 0,
      wavesCompleted: 0,
      startTime: 0,
      endTime: 0,
    };
    
    // Callbacks
    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.onGameComplete = null;
    this.onGameOver = null;
    
    // References (set externally)
    this.playerController = null;
    this.weaponManager = null;
    this.healthSystem = null;
    this.enemyManager = null;
    this.worldSystem = null;
  }
  
  setReferences(refs) {
    this.playerController = refs.playerController;
    this.weaponManager = refs.weaponManager;
    this.healthSystem = refs.healthSystem;
    this.enemyManager = refs.enemyManager;
    this.worldSystem = refs.worldSystem;
  }
  
  setCallbacks(callbacks) {
    this.onWaveStart = callbacks.onWaveStart;
    this.onWaveComplete = callbacks.onWaveComplete;
    this.onGameComplete = callbacks.onGameComplete;
    this.onGameOver = callbacks.onGameOver;
  }
  
  startGame() {
    this.resetGame();
    this.state = GAME_STATE.PLAYING;
    this.stats.startTime = performance.now();
    
    this.uiManager.hideStartScreen();
    this.uiManager.showHUD();
    this.uiManager.resumeGame();
    
    // Start first wave
    this.startWave(this.currentWave);
    
    console.log('Game started!');
  }
  
  resetGame() {
    this.state = GAME_STATE.MENU;
    this.currentWave = GAME_CONFIG.startingWave;
    this.enemiesRemaining = 0;
    this.enemiesKilled = 0;
    this.totalKills = 0;
    this.score = 0;
    this.timeElapsed = 0;
    this.waveTimeRemaining = GAME_CONFIG.waveTimeLimit;
    
    this.stats = {
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      damageTaken: 0,
      healthPacksUsed: 0,
      ammoPacksUsed: 0,
      deaths: 0,
      wavesCompleted: 0,
      startTime: 0,
      endTime: 0,
    };
    
    // Clear enemies
    if (this.enemyManager) {
      this.enemyManager.clearAll();
    }
    
    // Reset player
    if (this.healthSystem) {
      this.healthSystem.reset();
    }
    
    // Clear world
    if (this.worldSystem) {
      this.worldSystem.clearWorld();
    }
  }
  
  startWave(waveNumber) {
    this.currentWave = waveNumber;
    this.waveTimeRemaining = GAME_CONFIG.waveTimeLimit + 
      (this.stats.wavesCompleted * GAME_CONFIG.bonusTimePerKill);
    
    // Calculate enemy count for this wave
    const enemyCount = GAME_CONFIG.initialEnemies + 
      (waveNumber - 1) * GAME_CONFIG.enemiesPerWaveIncrease;
    
    this.enemiesRemaining = enemyCount;
    
    // Spawn enemies
    this.spawnWaveEnemies(enemyCount);
    
    // Update UI
    this.uiManager.updateWave(waveNumber);
    this.uiManager.updateEnemyCount(this.enemiesRemaining);
    
    // Callback
    if (this.onWaveStart) {
      this.onWaveStart(waveNumber, enemyCount);
    }
    
    console.log(`Wave ${waveNumber} started! ${enemyCount} enemies.`);
  }
  
  spawnWaveEnemies(count) {
    if (!this.enemyManager) return;
    
    for (let i = 0; i < count; i++) {
      // Stagger spawning slightly
      setTimeout(() => {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        const spawnPoint = this.enemyManager.getRandomEnemySpawnPoint();
        const patrolPoints = spawnPoint.patrolPoints || [];
        
        this.enemyManager.spawnEnemy(spawnPoint.position, patrolPoints);
      }, i * 500);
    }
  }
  
  update(deltaTime) {
    if (this.state !== GAME_STATE.PLAYING) return;
    
    // Update time
    this.timeElapsed += deltaTime;
    this.waveTimeRemaining -= deltaTime;
    
    // Check wave time limit
    if (this.waveTimeRemaining <= 0) {
      this.onWaveFailed();
      return;
    }
    
    // Update enemy count display
    if (this.enemyManager) {
      const activeEnemies = this.enemyManager.getActiveEnemyCount();
      this.uiManager.updateEnemyCount(activeEnemies);
      
      // Check if wave is complete
      if (activeEnemies === 0 && this.enemiesRemaining > 0) {
        // All spawned enemies are dead, but we may need to spawn more
        this.enemiesRemaining = 0;
      }
      
      if (activeEnemies === 0 && this.enemiesRemaining === 0) {
        this.onWaveComplete();
      }
    }
    
    // Update HUD with current stats
    this.updateHUD();
  }
  
  updateHUD() {
    if (!this.uiManager) return;
    
    // Update health
    if (this.healthSystem) {
      this.uiManager.updateHealth(
        this.healthSystem.health,
        this.healthSystem.maxHealth
      );
      this.uiManager.updateArmor(
        this.healthSystem.armor,
        this.healthSystem.maxArmor
      );
    }
    
    // Update ammo
    if (this.weaponManager) {
      const ammoInfo = this.weaponManager.getAmmoInfo();
      if (ammoInfo) {
        this.uiManager.updateAmmo(
          ammoInfo.magazine,
          ammoInfo.reserved,
          this.weaponManager.getCurrentWeaponName()
        );
      }
    }
    
    // Update kills
    this.uiManager.updateKills(this.totalKills);
  }
  
  onEnemyKilled(enemy) {
    this.enemiesKilled++;
    this.totalKills++;
    this.score += 100 * this.currentWave; // More points for later waves
    
    // Track accuracy
    if (this.stats.shotsFired > 0) {
      const accuracy = Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100);
      this.score += Math.floor(accuracy / 10); // Bonus for accuracy
    }
    
    // Bonus time
    this.waveTimeRemaining += GAME_CONFIG.bonusTimePerKill;
    
    // Update UI
    this.uiManager.updateKills(this.totalKills);
    this.uiManager.showHitMarker();
    
    console.log(`Enemy killed! Total: ${this.totalKills}, Score: ${this.score}`);
  }
  
  onPlayerDamaged(amount, damageType, source) {
    this.stats.damageTaken += amount;
    
    if (this.healthSystem) {
      this.uiManager.updateHealth(
        this.healthSystem.health,
        this.healthSystem.maxHealth
      );
    }
  }
  
  onPlayerDeath(killer, damageType) {
    this.stats.deaths++;
    this.stats.endTime = performance.now();
    
    this.state = GAME_STATE.GAME_OVER;
    
    // Show game over screen
    const finalStats = this.calculateFinalStats();
    this.uiManager.showGameOver(false, finalStats);
    
    if (this.onGameOver) {
      this.onGameOver(finalStats);
    }
    
    console.log('Game Over!');
  }
  
  onWaveComplete() {
    this.stats.wavesCompleted++;
    this.score += 500 * this.currentWave; // Wave completion bonus
    
    if (this.onWaveComplete) {
      this.onWaveComplete(this.currentWave);
    }
    
    // Check for victory
    if (this.currentWave >= GAME_CONFIG.maxWaves) {
      this.onVictory();
      return;
    }
    
    // Start next wave after delay
    this.state = GAME_STATE.WAVE_TRANSITION;
    
    setTimeout(() => {
      if (this.state === GAME_STATE.WAVE_TRANSITION) {
        this.state = GAME_STATE.PLAYING;
        this.startWave(this.currentWave + 1);
      }
    }, 3000);
    
    console.log(`Wave ${this.currentWave} complete!`);
  }
  
  onWaveFailed() {
    this.state = GAME_STATE.GAME_OVER;
    
    const finalStats = this.calculateFinalStats();
    this.uiManager.showGameOver(false, finalStats);
    
    if (this.onGameOver) {
      this.onGameOver(finalStats);
    }
    
    console.log('Wave failed - time ran out!');
  }
  
  onVictory() {
    this.state = GAME_STATE.VICTORY;
    this.stats.endTime = performance.now();
    
    const finalStats = this.calculateFinalStats();
    this.uiManager.showGameOver(true, finalStats);
    
    if (this.onGameComplete) {
      this.onGameComplete(finalStats);
    }
    
    console.log('Victory! All waves completed!');
  }
  
  calculateFinalStats() {
    const totalTime = (this.stats.endTime - this.stats.startTime) / 1000;
    const accuracy = this.stats.shotsFired > 0 
      ? Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100) 
      : 0;
    
    return {
      kills: this.totalKills,
      wave: this.currentWave,
      score: this.score,
      time: totalTime,
      accuracy: accuracy,
      deaths: this.stats.deaths,
      wavesCompleted: this.stats.wavesCompleted,
      damageDealt: this.stats.damageDealt,
      damageTaken: this.stats.damageTaken,
    };
  }
  
  recordShot(hit) {
    this.stats.shotsFired++;
    if (hit) {
      this.stats.shotsHit++;
    }
  }
  
  recordDamage(amount) {
    this.stats.damageDealt += amount;
  }
  
  pauseGame() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      this.uiManager.pauseGame();
    }
  }
  
  resumeGame() {
    if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
      this.uiManager.resumeGame();
    }
  }
  
  restartGame() {
    this.uiManager.hideGameOver();
    this.startGame();
  }
  
  quitToMenu() {
    this.resetGame();
    this.state = GAME_STATE.MENU;
    this.uiManager.showStartScreen();
    this.uiManager.hideHUD();
  }
  
  getCurrentState() {
    return this.state;
  }
  
  getStats() {
    return { ...this.stats };
  }
  
  getScore() {
    return this.score;
  }
  
  getCurrentWave() {
    return this.currentWave;
  }
}

export { GameManager, GAME_STATE, GAME_CONFIG };
