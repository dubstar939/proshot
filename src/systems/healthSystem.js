// ============================================
// HEALTH AND DAMAGE SYSTEM MODULE
// Player health, damage indicators, optional regen
// Enemy health, hit reactions, death logic
// Damage types (bullet, explosion, melee)
// ============================================

import * as THREE from "three";

const DAMAGE_TYPES = {
  BULLET: 'bullet',
  EXPLOSION: 'explosion',
  MELEE: 'melee',
  FALL: 'fall',
  ENVIRONMENT: 'environment',
};

const PLAYER_CONFIG_HEALTH = {
  maxHealth: 100,
  maxArmor: 100,
  regenRate: 5, // health per second
  regenDelay: 3, // seconds before regen starts
  fallDamageThreshold: 10,
  fallDamageMultiplier: 2,
};

class HealthSystem {
  constructor(player) {
    this.player = player;
    
    // Player stats
    this.health = PLAYER_CONFIG_HEALTH.maxHealth;
    this.armor = 0;
    this.maxHealth = PLAYER_CONFIG_HEALTH.maxHealth;
    this.maxArmor = PLAYER_CONFIG_HEALTH.maxArmor;
    
    // Regen
    this.regenTimer = 0;
    this.canRegen = true;
    
    // Damage tracking
    this.lastDamageTime = 0;
    this.totalDamageTaken = 0;
    this.damageSources = [];
    
    // Visual feedback
    this.damageOverlay = null;
    this.hitIndicator = null;
    this.setupDamageVisuals();
    
    // Callbacks
    this.onDeathCallback = null;
    this.onDamageCallback = null;
    this.onHealCallback = null;
  }
  
  setupDamageVisuals() {
    // Create damage overlay element
    this.damageOverlay = document.createElement('div');
    this.damageOverlay.id = 'damage-overlay';
    this.damageOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      background: radial-gradient(circle, transparent 50%, rgba(255,0,0,0.4) 100%);
      z-index: 100;
    `;
    document.body.appendChild(this.damageOverlay);
    
    // Create hit direction indicator
    this.hitIndicator = document.createElement('div');
    this.hitIndicator.id = 'hit-indicator';
    this.hitIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0;
      z-index: 101;
    `;
    document.body.appendChild(this.hitIndicator);
  }
  
  setCallbacks(onDeath, onDamage, onHeal) {
    this.onDeathCallback = onDeath;
    this.onDamageCallback = onDamage;
    this.onHealCallback = onHeal;
  }
  
  takeDamage(amount, damageType = DAMAGE_TYPES.BULLET, source = null, hitDirection = null) {
    if (this.health <= 0) {return false;}
    
    const now = performance.now();
    this.lastDamageTime = now;
    this.regenTimer = PLAYER_CONFIG_HEALTH.regenDelay;
    
    // Calculate actual damage after armor
    let actualDamage = amount;
    let armorUsed = 0;
    
    if (this.armor > 0) {
      // Armor absorbs percentage of damage
      const armorAbsorption = Math.min(this.armor / this.maxArmor, 0.75); // Max 75% absorption
      armorUsed = amount * armorAbsorption;
      actualDamage = amount - armorUsed;
      this.armor = Math.max(0, this.armor - armorUsed);
    }
    
    // Apply damage
    this.health = Math.max(0, this.health - actualDamage);
    this.totalDamageTaken += actualDamage;
    
    // Track damage source
    if (source) {
      this.damageSources.push({ source, amount: actualDamage, time: now });
      // Clean old sources
      this.damageSources = this.damageSources.filter(ds => now - ds.time < 5000);
    }
    
    // Visual feedback
    this.showDamageFeedback(hitDirection);
    
    // Callbacks
    if (this.onDamageCallback) {
      this.onDamageCallback(actualDamage, damageType, source);
    }
    
    // Check for death
    if (this.health <= 0) {
      this.die(source, damageType);
      return true;
    }
    
    return false;
  }
  
  heal(amount) {
    if (this.health <= 0) {return false;}
    
    const oldHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    const actualHeal = this.health - oldHealth;
    
    if (actualHeal > 0 && this.onHealCallback) {
      this.onHealCallback(actualHeal);
    }
    
    return actualHeal > 0;
  }
  
  addArmor(amount) {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }
  
  die(killer, damageType) {
    if (this.onDeathCallback) {
      this.onDeathCallback(killer, damageType);
    }
    
    // Show death screen
    this.showDeathScreen();
  }
  
  showDamageFeedback(direction) {
    // Flash red overlay
    this.damageOverlay.style.opacity = '0.6';
    setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
    }, 300);
    
    // Show hit direction indicator
    if (direction) {
      this.showHitIndicator(direction);
    }
  }
  
  showHitIndicator(direction) {
    // Convert world direction to screen position
    const indicator = this.hitIndicator;
    
    // Simple directional indicator
    const angle = Math.atan2(direction.x, direction.z);
    const radius = 100;
    const x = Math.sin(angle) * radius;
    const y = -Math.cos(angle) * radius;
    
    indicator.style.background = 'radial-gradient(circle, #ff0000 0%, transparent 70%)';
    indicator.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    indicator.style.opacity = '1';
    
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 500);
  }
  
  showDeathScreen() {
    const deathScreen = document.createElement('div');
    deathScreen.id = 'death-screen';
    deathScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #ff0000;
      font-family: 'Poppins', sans-serif;
      z-index: 1000;
    `;
    
    deathScreen.innerHTML = `
      <h1 style="font-size: 4rem; margin-bottom: 20px;">YOU DIED</h1>
      <p style="font-size: 1.5rem; color: #fff;">Press R to Restart</p>
    `;
    
    document.body.appendChild(deathScreen);
    
    // Auto-remove after restart
    window.deathScreenElement = deathScreen;
  }
  
  update(deltaTime) {
    if (this.health <= 0) {return;}
    
    // Handle regeneration
    if (this.canRegen && this.health < this.maxHealth) {
      if (this.regenTimer > 0) {
        this.regenTimer -= deltaTime;
      } else {
        this.health = Math.min(
          this.maxHealth,
          this.health + PLAYER_CONFIG_HEALTH.regenRate * deltaTime
        );
      }
    }
  }
  
  getHealthPercent() {
    return this.health / this.maxHealth;
  }
  
  getArmorPercent() {
    return this.armor / this.maxArmor;
  }
  
  isDead() {
    return this.health <= 0;
  }
  
  reset() {
    this.health = this.maxHealth;
    this.armor = 0;
    this.regenTimer = 0;
    this.lastDamageTime = 0;
    this.totalDamageTaken = 0;
    this.damageSources = [];
  }
  
  dispose() {
    if (this.damageOverlay && this.damageOverlay.parentNode) {
      this.damageOverlay.parentNode.removeChild(this.damageOverlay);
    }
    if (this.hitIndicator && this.hitIndicator.parentNode) {
      this.hitIndicator.parentNode.removeChild(this.hitIndicator);
    }
    if (window.deathScreenElement && window.deathScreenElement.parentNode) {
      window.deathScreenElement.parentNode.removeChild(window.deathScreenElement);
    }
  }
}

class DamageManager {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.explosions = [];
  }
  
  createExplosion(position, radius, damage, force = 10) {
    // Visual effect
    this.createExplosionVisual(position, radius);
    
    // Damage all entities in radius
    const affected = [];
    
    // Check all objects with health component
    this.scene.traverse((object) => {
      if (object.userData && object.userData.enemy) {
        const enemy = object.userData.enemy;
        const distance = enemy.position.distanceTo(position);
        
        if (distance <= radius) {
          const falloff = 1 - (distance / radius);
          const actualDamage = damage * falloff;
          
          // Apply knockback
          const direction = new THREE.Vector3().subVectors(
            enemy.position, position
          ).normalize();
          
          affected.push({
            entity: enemy,
            damage: actualDamage,
            direction: direction,
            force: force * falloff,
          });
        }
      }
    });
    
    return affected;
  }
  
  createExplosionVisual(position, radius) {
    // Create expanding sphere
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
    });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    this.scene.add(sphere);
    
    // Animate expansion
    const targetScale = radius * 2;
    const duration = 0.5;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      
      const scale = 1 + (targetScale - 1) * progress;
      sphere.scale.set(scale, scale, scale);
      material.opacity = 0.8 * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(sphere);
        geometry.dispose();
        material.dispose();
      }
    };
    
    animate();
  }
  
  applyFallDamage(velocity, healthSystem) {
    const impactVelocity = Math.abs(Math.min(0, velocity.y));
    
    if (impactVelocity > PLAYER_CONFIG_HEALTH.fallDamageThreshold) {
      const damage = (impactVelocity - PLAYER_CONFIG_HEALTH.fallDamageThreshold) * 
                     PLAYER_CONFIG_HEALTH.fallDamageMultiplier;
      
      healthSystem.takeDamage(damage, DAMAGE_TYPES.FALL, null, new THREE.Vector3(0, 1, 0));
      return damage;
    }
    
    return 0;
  }
}

// Damage number display
class DamageNumbers {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.numbers = [];
  }
  
  showDamage(position, amount, isCritical = false) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Draw damage number
    context.font = `${isCritical ? 'bold 48px' : '32px'} Poppins, sans-serif`;
    context.fillStyle = isCritical ? '#ff0000' : '#ffffff';
    context.strokeStyle = '#000000';
    context.lineWidth = 3;
    context.textAlign = 'center';
    context.fillText(Math.round(amount), 64, 48);
    context.strokeText(Math.round(amount), 64, 48);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 1;
    sprite.scale.set(2, 1, 1);
    
    this.scene.add(sprite);
    
    this.numbers.push({
      sprite,
      material,
      texture,
      canvas,
      life: 1.5,
      velocity: new THREE.Vector3(0, 2, 0),
    });
  }
  
  update(deltaTime) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      num.life -= deltaTime;
      
      // Move upward
      num.sprite.position.addScaledVector(num.velocity, deltaTime);
      num.velocity.y *= 0.95;
      
      // Fade out
      num.material.opacity = num.life / 1.5;
      
      if (num.life <= 0) {
        this.scene.remove(num.sprite);
        num.texture.dispose();
        num.material.dispose();
        this.numbers.splice(i, 1);
      }
    }
  }
  
  clear() {
    for (const num of this.numbers) {
      this.scene.remove(num.sprite);
      num.texture.dispose();
      num.material.dispose();
    }
    this.numbers = [];
  }
}

export { 
  HealthSystem, 
  DamageManager, 
  DamageNumbers,
  DAMAGE_TYPES,
  PLAYER_CONFIG_HEALTH 
};
