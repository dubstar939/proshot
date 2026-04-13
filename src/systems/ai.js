import * as THREE from 'three';

/**
 * AI State Machine States
 * @enum {string}
 */
const AI_STATE = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    SEARCH: 'search',
    DEAD: 'dead'
};

/**
 * Individual Enemy AI Controller
 * Handles state machine, movement, and combat behaviors for a single enemy
 */
class EnemyAI {
    /**
     * Creates an instance of EnemyAI
     * @param {THREE.Scene} scene - The game scene
     * @param {PlayerMovement} player - Player reference
     * @param {number} difficulty - Difficulty multiplier (default: 1)
     */
    constructor(scene, player, difficulty = 1) {
        this.scene = scene;
        this.player = player;
        this.difficulty = difficulty;
        
        // AI Components
        this.mesh = null;
        this.state = AI_STATE.IDLE;
        this.weapons = null;
        this.gameFlow = null;
        
        // Stats
        this.health = 100 * difficulty;
        this.maxHealth = this.health;
        this.speed = 3.0;
        
        // Behavior parameters
        this.detectionRange = 20;
        this.attackRange = 15;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.waitTime = 0;
        this.lastAttackTime = 0;
        this.attackCooldown = 1.0;
        this.searchTarget = null;
        
        this.createEnemyMesh();
    }
    
    /**
     * Set weapons system reference for AI interactions
     * @param {WeaponSystem} weapons
     */
    setWeapons(weapons) {
        this.weapons = weapons;
    }
    
    /**
     * Set game flow reference for scoring/events
     * @param {GameFlow} gameFlow
     */
    setGameFlow(gameFlow) {
        this.gameFlow = gameFlow;
    }

    createEnemyMesh() {
        const geo = new THREE.BoxGeometry(1, 2, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(Math.random()*20-10, 1, Math.random()*20-10);
        this.scene.add(this.mesh);
        
        // Setup simple patrol points around spawn
        for(let i=0; i<4; i++) {
            this.patrolPoints.push(
                new THREE.Vector3(
                    this.mesh.position.x + (Math.random()-0.5)*10,
                    1,
                    this.mesh.position.z + (Math.random()-0.5)*10
                )
            );
        }
    }

    update(delta, time) {
        if (this.state === AI_STATE.DEAD) return;
        
        const distToPlayer = this.mesh.position.distanceTo(this.player.position);
        const hasLOS = this.checkLineOfSight();

        // State Transitions
        if (this.state === AI_STATE.IDLE || this.state === AI_STATE.PATROL) {
            if (distToPlayer < this.detectionRange && hasLOS) {
                this.state = AI_STATE.CHASE;
            } else if (this.state === AI_STATE.PATROL) {
                this.patrol(delta);
            } else {
                // Randomly start patrolling
                if (Math.random() < 0.01) this.state = AI_STATE.PATROL;
            }
        } else if (this.state === AI_STATE.CHASE) {
            if (distToPlayer > this.detectionRange * 1.5 || !hasLOS) {
                this.state = AI_STATE.SEARCH;
                this.searchTarget = this.player.position.clone();
            } else {
                this.chase(delta);
                if (distToPlayer < this.attackRange) {
                    this.state = AI_STATE.ATTACK;
                }
            }
        } else if (this.state === AI_STATE.ATTACK) {
            if (distToPlayer > this.attackRange) {
                this.state = AI_STATE.CHASE;
            } else {
                this.attack(time);
            }
        } else if (this.state === AI_STATE.SEARCH) {
            if (this.mesh.position.distanceTo(this.searchTarget) < 1) {
                this.state = AI_STATE.PATROL;
            } else {
                this.moveTo(this.searchTarget, delta);
            }
        }
    }

    patrol(delta) {
        const target = this.patrolPoints[this.currentPatrolIndex];
        if (this.mesh.position.distanceTo(target) < 1) {
            this.waitTime -= delta;
            if (this.waitTime <= 0) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
                this.waitTime = 2.0;
            }
        } else {
            this.moveTo(target, delta);
        }
    }

    chase(delta) {
        this.moveTo(this.player.position, delta);
    }

    moveTo(target, delta) {
        const dir = new THREE.Vector3().subVectors(target, this.mesh.position).normalize();
        dir.y = 0;
        this.mesh.position.addScaledVector(dir, this.speed * delta);
        this.mesh.lookAt(target.x, this.mesh.position.y, target.z);
    }

    attack(time) {
        if (time - this.lastAttackTime > this.attackCooldown) {
            this.lastAttackTime = time;
            // Fire projectile or hitscan at player
            window.dispatchEvent(new CustomEvent('enemyAttack', { 
                detail: { damage: 10 * this.difficulty, source: this } 
            }));
        }
    }

    checkLineOfSight() {
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.mesh.position, new THREE.Vector3().subVectors(this.player.position, this.mesh.position).normalize());
        const intersects = raycaster.intersectObjects(this.scene.children);
        // If first hit is player (or child of player group), LOS exists
        if (intersects.length > 0) {
            return intersects[0].distance > this.mesh.position.distanceTo(this.player.position) - 1;
        }
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.state = AI_STATE.DEAD;
        this.mesh.material.color.set(0x555555);
        // Drop loot logic here
        setTimeout(() => {
            this.scene.remove(this.mesh);
            window.dispatchEvent(new CustomEvent('enemyKilled', { detail: { enemy: this } }));
        }, 2000);
    }
}

/**
 * AI Spawner & Wave Manager
 * Manages enemy spawning, wave progression, and difficulty scaling
 */
class AISystem {
    /**
     * Creates an instance of AISystem
     * @param {THREE.Scene} scene - The game scene
     * @param {PlayerMovement} player - Player reference
     */
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // References to other systems (set via setters)
        this.weapons = null;
        this.gameFlow = null;
        
        // Wave management
        this.enemies = [];
        this.currentWave = 1;
        this.baseEnemiesPerWave = 5;
        this.spawnTimer = 0;
        this.spawnDelay = 2.0;
        this.isActive = true;
        this.isWaveActive = false;
        
        // Configuration
        this.difficultyMultiplier = 1.0;
        this.maxWaves = 10;
    }
    
    /**
     * Set weapons system reference for AI interactions
     * @param {WeaponSystem} weapons
     */
    setWeapons(weapons) {
        this.weapons = weapons;
        // Also update existing enemies
        this.enemies.forEach(enemy => enemy.setWeapons(weapons));
    }
    
    /**
     * Set game flow reference for scoring/events
     * @param {GameFlow} gameFlow
     */
    setGameFlow(gameFlow) {
        this.gameFlow = gameFlow;
        // Also update existing enemies
        this.enemies.forEach(enemy => enemy.setGameFlow(gameFlow));
    }

    /**
     * Start a new wave of enemies
     * @param {number} waveNumber - Optional wave number (defaults to next)
     */
    startWave(waveNumber = null) {
        if (waveNumber) {
            this.currentWave = waveNumber;
        }
        
        this.isWaveActive = true;
        this.spawnTimer = 0;
        
        const enemyCount = this.getEnemiesForWave(this.currentWave);
        console.log(`[AISystem] Starting Wave ${this.currentWave} with ${enemyCount} enemies`);
        
        window.dispatchEvent(new CustomEvent('waveStart', { 
            detail: { wave: this.currentWave, enemyCount } 
        }));
    }

    /**
     * Calculate number of enemies for a given wave
     * @param {number} wave - Wave number
     * @returns {number} Number of enemies
     */
    getEnemiesForWave(wave) {
        return Math.floor(this.baseEnemiesPerWave * (1 + wave * 0.2));
    }

    /**
     * Get difficulty multiplier for current wave
     * @returns {number}
     */
    getCurrentDifficulty() {
        return 1 + (this.currentWave * 0.1);
    }

    /**
     * Spawn a single enemy
     * @private
     */
    _spawnEnemy() {
        const difficulty = this.getCurrentDifficulty();
        const enemy = new EnemyAI(this.scene, this.player, difficulty);
        
        // Wire system references
        if (this.weapons) enemy.setWeapons(this.weapons);
        if (this.gameFlow) enemy.setGameFlow(this.gameFlow);
        
        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * Update all AI systems
     * @param {number} deltaTime - Time since last frame
     * @param {number} elapsedTime - Total elapsed time
     */
    update(deltaTime, elapsedTime) {
        if (!this.isActive) return;
        
        // Spawn enemies for current wave
        if (this.isWaveActive) {
            this._updateSpawning(deltaTime);
        }

        // Update all active enemies
        this._updateEnemies(deltaTime, elapsedTime);
        
        // Cleanup dead enemies
        this._cleanupDeadEnemies();

        // Check wave completion
        this._checkWaveCompletion();
    }
    
    /**
     * Update spawning logic
     * @private
     * @param {number} deltaTime
     */
    _updateSpawning(deltaTime) {
        const maxEnemies = this.getEnemiesForWave(this.currentWave);
        
        if (this.enemies.length < maxEnemies && this.spawnTimer <= 0) {
            this._spawnEnemy();
            this.spawnTimer = this.spawnDelay;
        }
        
        this.spawnTimer -= deltaTime;
    }
    
    /**
     * Update all active enemies
     * @private
     * @param {number} deltaTime
     * @param {number} elapsedTime
     */
    _updateEnemies(deltaTime, elapsedTime) {
        this.enemies.forEach(enemy => {
            if (enemy.state !== AI_STATE.DEAD) {
                enemy.update(deltaTime, elapsedTime);
            }
        });
    }
    
    /**
     * Remove dead enemies from the scene
     * @private
     */
    _cleanupDeadEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            return enemy.state !== AI_STATE.DEAD || enemy.mesh?.parent !== null;
        });
    }
    
    /**
     * Check if current wave is complete
     * @private
     */
    _checkWaveCompletion() {
        if (this.enemies.length === 0 && this.spawnTimer <= 0 && this.isWaveActive) {
            this.isWaveActive = false;
            
            window.dispatchEvent(new CustomEvent('waveComplete', { 
                detail: { wave: this.currentWave } 
            }));
            
            // Auto-start next wave if not at max
            if (this.currentWave < this.maxWaves) {
                this.currentWave++;
                setTimeout(() => this.startWave(), 3000); // 3 second delay between waves
            } else {
                console.log('[AISystem] All waves completed!');
                // Victory condition could be triggered here
            }
        }
    }
    
    /**
     * Get count of active enemies
     * @returns {number}
     */
    getActiveEnemyCount() {
        return this.enemies.filter(e => e.state !== AI_STATE.DEAD).length;
    }
    
    /**
     * Get current wave information
     * @returns {Object} Wave info
     */
    getWaveInfo() {
        return {
            current: this.currentWave,
            isActive: this.isWaveActive,
            enemyCount: this.getActiveEnemyCount(),
            maxEnemies: this.getEnemiesForWave(this.currentWave)
        };
    }
    
    /**
     * Pause AI updates
     */
    pause() {
        this.isActive = false;
    }
    
    /**
     * Resume AI updates
     */
    resume() {
        this.isActive = true;
    }
    
    /**
     * Clear all enemies
     */
    clearAll() {
        this.enemies.forEach(enemy => {
            if (enemy.mesh?.parent) {
                this.scene.remove(enemy.mesh);
            }
        });
        this.enemies = [];
        this.isWaveActive = false;
    }
}

// Export as named exports
export { AISystem, EnemyAI, AI_STATE };
