// ============================================
// ENEMY AI CLASS
// Individual enemy with state machine, health, combat
// Uses BVH raycasts for line-of-sight
// Navmesh-style movement
// ============================================

import * as THREE from 'three';
import { StateMachine, STATE_TYPE, CommonBehaviors } from './StateMachine.js';

const ENEMY_CONFIG = {
  // Movement
  patrolSpeed: 2,
  chaseSpeed: 5,
  attackSpeed: 1.5,
  
  // Detection
  detectRange: 30,
  attackRange: 15,
  loseSightRange: 50,
  fieldOfView: Math.PI * 1.5,
  
  // Behavior
  patrolWaitTime: 2,
  searchDuration: 5,
  attackCooldown: 1,
  reactionTime: 0.3,
  
  // Health
  baseHealth: 100,
};

class Enemy {
  constructor(scene, player, startPosition, patrolPoints = [], config = {}) {
    this.scene = scene;
    this.player = player;
    this.config = { ...ENEMY_CONFIG, ...config };
    
    // Create state machine
    this.stateMachine = new StateMachine(STATE_TYPE.PATROL);
    this.setupStates(patrolPoints);
    
    // Position and movement
    this.position = startPosition.clone();
    this.velocity = new THREE.Vector3();
    this.targetPosition = null;
    
    // Patrol
    this.patrolPoints = patrolPoints;
    
    // Detection
    this.lastKnownPlayerPosition = null;
    this.playerVisible = false;
    this.reactionTimer = 0;
    
    // Combat
    this.canAttack = true;
    this.attackTimer = 0;
    
    // Health
    this.health = this.config.baseHealth;
    this.maxHealth = this.config.baseHealth;
    this.isDead = false;
    
    // Line of sight
    this.raycaster = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector3();
    this.rayDirection = new THREE.Vector3();
    
    // Visual mesh
    this.createMesh(startPosition);
    
    // Callbacks
    this.onDeathCallback = null;
    this.onHitCallback = null;
    this.onAlertCallback = null;
    this.onDamageDealtCallback = null;
  }
  
  setupStates(patrolPoints) {
    const sm = this.stateMachine;
    
    // IDLE state
    sm.addState(STATE_TYPE.IDLE, {
      onEnter: () => {
        this.velocity.set(0, 0, 0);
      },
      onUpdate: (deltaTime) => {
        if (this.canSeePlayer()) {
          sm.setState(STATE_TYPE.CHASE);
        } else if (Math.random() < 0.01) {
          // Random look around
          this.mesh.rotation.y += (Math.random() - 0.5) * 0.5;
        }
      },
    });
    
    // PATROL state
    sm.addState(STATE_TYPE.PATROL, CommonBehaviors.createPatrolState(
      patrolPoints,
      this.config.patrolWaitTime,
      this.config.patrolSpeed
    ));
    sm.states.get(STATE_TYPE.PATROL).onUpdate = (deltaTime, data, context) => {
      // Check for player while patrolling
      if (this.canSeePlayer()) {
        this.stateMachine.setState(STATE_TYPE.CHASE);
        return;
      }
      
      // Original patrol behavior
      if (!this.targetEntity) return;
      
      const entity = this.targetEntity;
      const currentWaypoint = patrolPoints[this.currentPatrolIndex || 0];
      
      if (!currentWaypoint) return;
      
      if ((this.waitTimer || 0) > 0) {
        this.waitTimer -= deltaTime;
        return;
      }
      
      const distance = entity.position.distanceTo(currentWaypoint);
      
      if (distance < 0.5) {
        this.waitTimer = this.config.patrolWaitTime;
        this.currentPatrolIndex = ((this.currentPatrolIndex || 0) + 1) % patrolPoints.length;
      } else {
        const direction = new THREE.Vector3().subVectors(currentWaypoint, entity.position).normalize();
        this.moveTo(direction, this.config.patrolSpeed);
        this.lookAtDirection(direction);
      }
    };
    
    // CHASE state
    sm.addState(STATE_TYPE.CHASE, {
      onEnter: () => {
        this.lastKnownPlayerPosition = this.getPlayerPosition();
      },
      onUpdate: (deltaTime) => {
        const playerPos = this.getPlayerPosition();
        const distanceToPlayer = this.position.distanceTo(playerPos);
        
        // Lost player?
        if (!this.canSeePlayer() && distanceToPlayer > this.config.loseSightRange) {
          this.stateMachine.setState(STATE_TYPE.SEARCH);
          return;
        }
        
        // In attack range and visible?
        if (distanceToPlayer < this.config.attackRange && this.canSeePlayer()) {
          this.stateMachine.setState(STATE_TYPE.ATTACK);
          return;
        }
        
        // Move towards player
        this.targetPosition = playerPos;
        const direction = new THREE.Vector3().subVectors(playerPos, this.position).normalize();
        this.moveTo(direction, this.config.chaseSpeed);
        this.lookAtPosition(playerPos);
      },
    });
    
    // SEARCH state
    sm.addState(STATE_TYPE.SEARCH, CommonBehaviors.createSearchState(
      this.config.searchDuration,
      this.config.chaseSpeed
    ));
    sm.states.get(STATE_TYPE.SEARCH).onUpdate = (deltaTime, data, context) => {
      // Check for player while searching
      if (this.canSeePlayer()) {
        this.stateMachine.setState(STATE_TYPE.CHASE);
        return;
      }
      
      const searchTimer = this.stateMachine.getData('searchTimer') || this.config.searchDuration;
      this.stateMachine.setData('searchTimer', searchTimer - deltaTime);
      
      if (searchTimer <= 0) {
        this.stateMachine.setState(STATE_TYPE.PATROL);
        return;
      }
      
      if (this.lastKnownPlayerPosition) {
        const distance = this.position.distanceTo(this.lastKnownPlayerPosition);
        
        if (distance < 0.5) {
          this.mesh.rotation.y += deltaTime * 0.5;
        } else {
          const direction = new THREE.Vector3().subVectors(this.lastKnownPlayerPosition, this.position).normalize();
          this.moveTo(direction, this.config.chaseSpeed);
        }
      }
    };
    
    // ATTACK state
    sm.addState(STATE_TYPE.ATTACK, {
      onEnter: () => {
        this.attackTimer = 0;
      },
      onUpdate: (deltaTime) => {
        const playerPos = this.getPlayerPosition();
        const distanceToPlayer = this.position.distanceTo(playerPos);
        
        // Player out of range or not visible?
        if (distanceToPlayer > this.config.attackRange * 1.5 || !this.canSeePlayer()) {
          this.stateMachine.setState(STATE_TYPE.CHASE);
          return;
        }
        
        // Face player
        this.lookAtPosition(playerPos);
        
        // Attack cooldown
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0 && this.canAttack) {
          this.performAttack();
          this.attackTimer = this.config.attackCooldown;
        }
      },
    });
    
    // ALERT state
    sm.addState(STATE_TYPE.ALERT, {
      onEnter: () => {
        this.reactionTimer = this.config.reactionTime;
      },
      onUpdate: (deltaTime) => {
        this.reactionTimer -= deltaTime;
        
        if (this.reactionTimer <= 0) {
          if (this.canSeePlayer()) {
            this.stateMachine.setState(STATE_TYPE.CHASE);
          } else {
            this.stateMachine.setState(STATE_TYPE.PATROL);
          }
        }
        
        // Look towards threat
        if (this.lastKnownPlayerPosition) {
          this.lookAtPosition(this.lastKnownPlayerPosition);
        }
      },
    });
    
    // DEAD state
    sm.addState(STATE_TYPE.DEAD, {
      onEnter: () => {
        this.isDead = true;
        this.velocity.set(0, 0, 0);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.material.color.setHex(0x660000);
        if (this.healthBar) this.healthBar.visible = false;
      },
      onUpdate: () => {},
    });
    
    // Transitions
    sm.addTransition(STATE_TYPE.PATROL, STATE_TYPE.CHASE, () => this.canSeePlayer());
    sm.addTransition(STATE_TYPE.IDLE, STATE_TYPE.CHASE, () => this.canSeePlayer());
    sm.addTransition(STATE_TYPE.CHASE, STATE_TYPE.ATTACK, () => {
      const playerPos = this.getPlayerPosition();
      return this.position.distanceTo(playerPos) < this.config.attackRange && this.canSeePlayer();
    });
    sm.addTransition(STATE_TYPE.CHASE, STATE_TYPE.SEARCH, () => {
      const playerPos = this.getPlayerPosition();
      return !this.canSeePlayer() && this.position.distanceTo(playerPos) > this.config.loseSightRange;
    });
    sm.addTransition(STATE_TYPE.SEARCH, STATE_TYPE.CHASE, () => this.canSeePlayer());
    sm.addTransition(STATE_TYPE.SEARCH, STATE_TYPE.PATROL, () => {
      const timer = this.stateMachine.getData('searchTimer');
      return timer !== undefined && timer <= 0;
    });
    sm.addTransition(STATE_TYPE.ATTACK, STATE_TYPE.CHASE, () => {
      const playerPos = this.getPlayerPosition();
      return this.position.distanceTo(playerPos) > this.config.attackRange * 1.5 || !this.canSeePlayer();
    });
  }
  
  createMesh(position) {
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
    
    // Hit detection
    this.mesh.userData = {
      enemy: this,
      onHit: (damage, point, normal) => this.takeDamage(damage, point, normal)
    };
    
    this.scene.add(this.mesh);
    
    // Health bar
    this.createHealthBar();
  }
  
  createHealthBar() {
    const barGeometry = new THREE.BoxGeometry(1, 0.1, 0.05);
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.healthBar = new THREE.Mesh(barGeometry, barMaterial);
    this.healthBar.position.set(0, 1.2, 0);
    this.mesh.add(this.healthBar);
    
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
    
    if (healthPercent > 0.5) {
      this.healthBar.material.color.setHex(0x00ff00);
    } else if (healthPercent > 0.25) {
      this.healthBar.material.color.setHex(0xffff00);
    } else {
      this.healthBar.material.color.setHex(0xff0000);
    }
  }
  
  setCallbacks(onDeath, onHit, onAlert, onDamageDealt) {
    this.onDeathCallback = onDeath;
    this.onHitCallback = onHit;
    this.onAlertCallback = onAlert;
    this.onDamageDealtCallback = onDamageDealt;
  }
  
  takeDamage(damage, point, normal) {
    if (this.isDead) return;
    
    this.health -= damage;
    this.updateHealthBar();
    this.flashOnHit();
    
    // Alert enemy
    if (![STATE_TYPE.CHASE, STATE_TYPE.ATTACK].includes(this.stateMachine.getCurrentState())) {
      this.stateMachine.setState(STATE_TYPE.ALERT);
      if (this.onAlertCallback) this.onAlertCallback(this);
    }
    
    if (this.onHitCallback) this.onHitCallback(this, damage);
    
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
    this.stateMachine.setState(STATE_TYPE.DEAD);
    
    if (this.onDeathCallback) {
      this.onDeathCallback(this);
    }
    
    // Remove after delay
    setTimeout(() => {
      this.dispose();
    }, 10000);
  }
  
  canSeePlayer() {
    const playerPos = this.getPlayerPosition();
    const direction = new THREE.Vector3().subVectors(playerPos, this.position);
    const distance = direction.length();
    
    // Too far?
    if (distance > this.config.detectRange) return false;
    
    direction.normalize();
    
    // Behind enemy?
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), 
      this.mesh.rotation.y
    );
    const dotProduct = forward.dot(direction);
    
    if (dotProduct < Math.cos(this.config.fieldOfView / 2)) return false;
    
    // Raycast for line of sight using BVH
    this.rayOrigin.copy(this.position).add(new THREE.Vector3(0, 0.8, 0));
    this.raycaster.set(this.rayOrigin, direction);
    
    // Get player mesh for intersection check
    const playerMesh = this.player;
    const intersects = this.raycaster.intersectObject(playerMesh, true);
    
    return intersects.length > 0 && intersects[0].distance < distance * 1.1;
  }
  
  getPlayerPosition() {
    if (this.player?.position) {
      return this.player.position.clone();
    }
    return new THREE.Vector3();
  }
  
  moveTo(direction, speed) {
    this.velocity.addScaledVector(direction, speed * 0.1);
  }
  
  lookAtDirection(direction) {
    this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }
  
  lookAtPosition(pos) {
    const direction = new THREE.Vector3().subVectors(pos, this.position);
    this.lookAtDirection(direction);
  }
  
  performAttack() {
    // Placeholder for attack logic
    console.log('Enemy attacks!');
    
    if (this.onDamageDealtCallback) {
      this.onDamageDealtCallback(this);
    }
  }
  
  alert(sourcePosition) {
    if (this.isDead) return;
    
    const distance = this.position.distanceTo(sourcePosition);
    if (distance < this.config.detectRange) {
      this.stateMachine.setState(STATE_TYPE.ALERT);
      this.lastKnownPlayerPosition = sourcePosition.clone();
      
      if (this.onAlertCallback) {
        this.onAlertCallback(this);
      }
    }
  }
  
  update(deltaTime, worldOctree) {
    if (this.isDead) return;
    
    // Update state machine
    this.stateMachine.update(deltaTime, {
      targetEntity: this,
      moveTo: (dir, speed) => this.moveTo(dir, speed),
      lookAtDirection: (dir) => this.lookAtDirection(dir),
      lookAtPosition: (pos) => this.lookAtPosition(pos),
      lookAround: (dt) => { this.mesh.rotation.y += dt * 0.5; },
    });
    
    // Apply velocity with damping
    this.position.addScaledVector(this.velocity, deltaTime);
    this.mesh.position.copy(this.position);
    this.velocity.multiplyScalar(0.9);
    
    // Keep enemy on ground
    this.mesh.position.y = Math.max(0, this.mesh.position.y);
  }
  
  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}

export { Enemy, ENEMY_CONFIG };
