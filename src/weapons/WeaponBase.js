// ============================================
// WEAPON BASE CLASS
// Core weapon functionality with modular effects
// Hitscan + projectile support
// Recoil, spread, ADS, reload, ammo management
// Muzzle flash, impact effects, shell ejection
// ============================================

import * as THREE from 'three';
import { WEAPON_DATA } from './WeaponData.js';

class WeaponBase {
  constructor(weaponId, gunHolder, scene, camera, onFireCallback) {
    const data = WEAPON_DATA[weaponId];
    if (!data) {
      console.error(`Unknown weapon: ${weaponId}`);
      return null;
    }
    
    this.data = JSON.parse(JSON.stringify(data)); // Deep copy
    this.weaponId = weaponId;
    this.gunHolder = gunHolder;
    this.scene = scene;
    this.camera = camera;
    this.onFireCallback = onFireCallback;
    
    // Ammo state
    this.currentMagazine = this.data.magazineSize;
    this.reservedAmmo = this.data.maxAmmo - this.data.magazineSize;
    
    // State
    this.isReloading = false;
    this.lastFireTime = 0;
    this.isFiring = false;
    this.adsActive = false;
    this.adsTransition = 0;
    
    // Fire mode state
    this.burstCounter = 0;
    this.inBurst = false;
    this.burstTimer = 0;
    
    // Visual effects
    this.muzzleFlashLight = null;
    this.muzzleFlashMesh = null;
    this.createMuzzleFlash();
    
    // Shell ejection
    this.shells = [];
    this.shellGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8);
    this.shellMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.3
    });
    
    // Recoil system
    this.recoilOffset = new THREE.Vector3();
    this.recoilRotation = new THREE.Vector3();
    this.targetRecoilOffset = new THREE.Vector3();
    this.targetRecoilRotation = new THREE.Vector3();
    
    // Spread system
    this.currentSpread = this.data.spread;
    this.spreadX = 0;
    this.spreadY = 0;
    
    // Current FOV for ADS
    this.baseFOV = camera.fov;
    this.targetFOV = camera.fov;
    
    // Impact decals pool
    this.decals = [];
    this.maxDecals = 50;
  }
  
  createMuzzleFlash() {
    // Point light for dynamic lighting
    this.muzzleFlashLight = new THREE.PointLight(0xffaa00, 0, 5);
    this.muzzleFlashLight.position.set(0, 0.1, -1);
    this.gunHolder.add(this.muzzleFlashLight);
    
    // Mesh for visual flash
    const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00,
      transparent: true,
      opacity: 0
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
    this.muzzleFlashMesh.position.set(0, 0.1, -1.2);
    this.gunHolder.add(this.muzzleFlashMesh);
  }
  
  update(deltaTime, currentTime) {
    // Update ADS transition
    if (this.adsActive) {
      this.adsTransition = Math.min(1, this.adsTransition + deltaTime * (1 / this.data.adsSpeed));
      this.targetFOV = this.data.adsFOV;
    } else {
      this.adsTransition = Math.max(0, this.adsTransition - deltaTime * (1 / this.data.adsSpeed));
      this.targetFOV = this.baseFOV;
    }
    
    // Smooth FOV transition
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFOV, deltaTime * 10);
    this.camera.updateProjectionMatrix();
    
    // Update muzzle flash
    if (this.muzzleFlashLight && this.muzzleFlashLight.intensity > 0) {
      this.muzzleFlashLight.intensity = THREE.MathUtils.lerp(
        this.muzzleFlashLight.intensity,
        0,
        deltaTime * 20
      );
    }
    
    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.material.opacity = THREE.MathUtils.lerp(
        this.muzzleFlashMesh.material.opacity,
        0,
        deltaTime * 20
      );
    }
    
    // Update shells
    this.updateShells(deltaTime);
    
    // Recover from recoil
    this.recoilOffset.lerp(new THREE.Vector3(), deltaTime * this.data.recoilRecovery);
    this.recoilRotation.lerp(new THREE.Vector3(), deltaTime * this.data.recoilRecovery * 0.8);
    
    // Recover spread
    const targetSpread = this.data.spread;
    this.currentSpread = THREE.MathUtils.lerp(
      this.currentSpread,
      targetSpread,
      deltaTime * this.data.spreadRecovery
    );
    
    // Handle burst fire
    if (this.inBurst) {
      this.burstTimer -= deltaTime;
      if (this.burstTimer <= 0) {
        this.inBurst = false;
        this.burstCounter = 0;
      }
    }
    
    // Apply recoil to gun holder
    this.applyRecoil();
  }
  
  updateShells(deltaTime) {
    const gravity = 20;
    
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const shell = this.shells[i];
      
      // Update position
      shell.velocity.y -= gravity * deltaTime;
      shell.position.addScaledVector(shell.velocity, deltaTime);
      
      // Update rotation
      shell.rotation.x += shell.rotVelocity.x * deltaTime;
      shell.rotation.z += shell.rotVelocity.z * deltaTime;
      
      // Ground collision
      if (shell.position.y < 0) {
        shell.position.y = 0;
        shell.velocity.multiplyScalar(0.3);
        shell.rotVelocity.multiplyScalar(0.5);
        
        if (shell.velocity.length() < 0.5) {
          this.gunHolder.remove(shell.mesh);
          this.shells.splice(i, 1);
          shell.geometry.dispose();
          shell.material.dispose();
        }
      }
      
      // Lifetime
      shell.life -= deltaTime;
      if (shell.life <= 0) {
        this.gunHolder.remove(shell.mesh);
        this.shells.splice(i, 1);
      }
    }
    
    // Limit shells
    while (this.shells.length > 20) {
      const oldShell = this.shells.shift();
      this.gunHolder.remove(oldShell.mesh);
    }
  }
  
  applyRecoil() {
    if (this.gunHolder) {
      this.gunHolder.position.copy(this.recoilOffset);
      this.gunHolder.rotation.x = this.recoilRotation.x;
      this.gunHolder.rotation.y = this.recoilRotation.y;
    }
  }
  
  fire(currentTime, isHolding = false) {
    if (this.isReloading) return false;
    if (this.currentMagazine <= 0) {
      this.playEmptySound();
      return false;
    }
    
    // Check fire rate
    if (currentTime - this.lastFireTime < this.data.fireRate) {
      return false;
    }
    
    // Handle burst mode
    if (this.data.fireMode === 'burst') {
      if (!this.inBurst) {
        this.inBurst = true;
        this.burstCounter = 0;
        this.burstTimer = this.data.burstCount * (this.data.fireRate + this.data.burstDelay);
      }
      
      if (this.burstCounter >= this.data.burstCount) {
        return false;
      }
      this.burstCounter++;
    }
    
    // Semi-auto: only fire once per click
    if (this.data.fireMode === 'semi' && !isHolding) {
      // Allow fire
    } else if (this.data.fireMode === 'semi' && isHolding) {
      return false;
    }
    
    this.lastFireTime = currentTime;
    this.currentMagazine--;
    
    // Apply recoil
    this.applyFireRecoil();
    
    // Show muzzle flash
    this.showMuzzleFlash();
    
    // Eject shell
    if (this.data.shellEjection) {
      this.ejectShell();
    }
    
    // Play fire sound
    this.playFireSound();
    
    // Fire based on weapon type
    if (this.data.type === 'hitscan') {
      this.fireHitscan();
    } else if (this.data.type === 'projectile') {
      this.fireProjectile();
    }
    
    // Callback for game logic
    if (this.onFireCallback) {
      this.onFireCallback(this, true);
    }
    
    return true;
  }
  
  applyFireRecoil() {
    const recoilX = (Math.random() - 0.5) * this.data.recoil.x;
    const recoilY = this.data.recoil.y * (0.8 + Math.random() * 0.4);
    
    this.recoilOffset.x += recoilX * 0.1;
    this.recoilOffset.y += recoilY * 0.05;
    this.recoilRotation.x += recoilY * 0.5;
    this.recoilRotation.y += recoilX * 0.3;
    
    // Increase spread when firing
    this.currentSpread = Math.min(
      this.currentSpread + this.data.spreadIncrease,
      this.data.spread * 3
    );
  }
  
  showMuzzleFlash() {
    if (this.muzzleFlashLight) {
      this.muzzleFlashLight.intensity = 2;
    }
    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.material.opacity = 1;
    }
  }
  
  ejectShell() {
    const shellMesh = new THREE.Mesh(this.shellGeometry, this.shellMaterial.clone());
    shellMesh.position.set(0.15, 0.05, -0.3);
    shellMesh.rotation.z = Math.PI / 2;
    this.gunHolder.add(shellMesh);
    
    const velocity = new THREE.Vector3(
      2 + Math.random() * 2,
      3 + Math.random() * 2,
      -1 + Math.random() * 2
    );
    
    const rotVelocity = new THREE.Vector3(
      5 + Math.random() * 5,
      0,
      10 + Math.random() * 10
    );
    
    this.shells.push({
      mesh: shellMesh,
      position: shellMesh.position.clone(),
      velocity: velocity,
      rotation: shellMesh.rotation.clone(),
      rotVelocity: rotVelocity,
      life: 5,
      geometry: this.shellGeometry,
      material: shellMesh.material,
    });
  }
  
  fireHitscan() {
    const raycaster = new THREE.Raycaster();
    
    // Calculate spread
    const spreadX = (Math.random() - 0.5) * this.currentSpread;
    const spreadY = (Math.random() - 0.5) * this.currentSpread;
    
    // Get shooting direction with spread
    const shootDirection = new THREE.Vector3();
    this.camera.getWorldDirection(shootDirection);
    
    // Apply spread
    shootDirection.x += spreadX;
    shootDirection.y += spreadY;
    shootDirection.normalize();
    
    raycaster.set(this.camera.position, shootDirection);
    
    // Check for hits using BVH for performance
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0 && intersects[0].distance <= this.data.range) {
      const hit = intersects[0];
      const damage = this.calculateDamage(hit.distance);
      this.onHit(hit.object, hit.point, hit.face?.normal, damage);
      this.createImpactEffect(hit.point, hit.face?.normal);
      this.createBulletHole(hit.point, hit.face?.normal);
    }
  }
  
  fireProjectile() {
    const shootDirection = new THREE.Vector3();
    this.camera.getWorldDirection(shootDirection);
    
    // Apply slight spread
    shootDirection.x += (Math.random() - 0.5) * this.currentSpread;
    shootDirection.y += (Math.random() - 0.5) * this.currentSpread;
    shootDirection.normalize();
    
    // Create projectile
    const projectile = {
      position: this.camera.position.clone().add(
        shootDirection.clone().multiplyScalar(0.5)
      ),
      velocity: shootDirection.multiplyScalar(this.data.projectileSpeed),
      damage: this.data.damage,
      explosionRadius: this.data.explosionRadius,
      gravity: this.data.projectileGravity,
      life: 5,
      weaponId: this.weaponId,
    };
    
    // Emit event for projectile handling
    if (this.onFireCallback) {
      this.onFireCallback(this, projectile);
    }
  }
  
  calculateDamage(distance) {
    // Damage falloff over distance
    const falloffStart = this.data.range * 0.5;
    const falloffEnd = this.data.range;
    
    if (distance <= falloffStart) {
      return this.data.damage;
    } else if (distance >= falloffEnd) {
      return this.data.damage * 0.5;
    } else {
      const t = (distance - falloffStart) / (falloffEnd - falloffStart);
      return this.data.damage * (1 - t * 0.5);
    }
  }
  
  onHit(target, point, normal, damage) {
    // Handle hit logic
    if (target.userData && target.userData.onHit) {
      target.userData.onHit(damage, point, normal);
    }
    
    // Callback for scoring
    if (this.onFireCallback) {
      this.onFireCallback(this, { hit: true, target, point, damage });
    }
  }
  
  createImpactEffect(point, normal) {
    const particleCount = 8;
    const particles = [];
    const particleLife = 0.5;
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.BoxGeometry(0.03, 0.03, 0.03);
      const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const particle = new THREE.Mesh(geometry, material);
      
      particle.position.copy(point);
      particle.position.x += (Math.random() - 0.5) * 0.1;
      particle.position.y += (Math.random() - 0.5) * 0.1;
      particle.position.z += (Math.random() - 0.5) * 0.1;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      );
      
      this.scene.add(particle);
      particles.push({ mesh: particle, velocity, life: particleLife });
    }
    
    // Animate particles
    const animateParticles = () => {
      let alive = false;
      for (const p of particles) {
        if (p.life > 0) {
          alive = true;
          p.life -= 0.016;
          p.mesh.position.addScaledVector(p.velocity, 0.016);
          p.mesh.scale.multiplyScalar(0.95);
        }
      }
      
      if (alive) {
        requestAnimationFrame(animateParticles);
      } else {
        for (const p of particles) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        }
      }
    };
    
    animateParticles();
  }
  
  createBulletHole(point, normal, size = 0.08) {
    // Limit decals
    if (this.decals.length >= this.maxDecals) {
      const oldDecal = this.decals.shift();
      this.scene.remove(oldDecal);
    }
    
    // Create decal
    const decalGeometry = new THREE.CircleGeometry(size, 16);
    const decalMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    
    const decal = new THREE.Mesh(decalGeometry, decalMaterial);
    decal.position.copy(point);
    decal.position.addScaledVector(normal, 0.001);
    decal.lookAt(point.clone().add(normal));
    
    this.scene.add(decal);
    this.decals.push(decal);
    
    // Fade out over time
    setTimeout(() => {
      this.scene.remove(decal);
      decal.geometry.dispose();
      decal.material.dispose();
      const index = this.decals.indexOf(decal);
      if (index > -1) this.decals.splice(index, 1);
    }, 30000);
  }
  
  startReload() {
    if (this.isReloading) return false;
    if (this.currentMagazine >= this.data.magazineSize) return false;
    if (this.reservedAmmo <= 0) return false;
    
    this.isReloading = true;
    this.playReloadSound();
    
    setTimeout(() => {
      this.completeReload();
    }, this.data.reloadTime * 1000);
    
    return true;
  }
  
  completeReload() {
    const needed = this.data.magazineSize - this.currentMagazine;
    const available = Math.min(needed, this.reservedAmmo);
    
    this.currentMagazine += available;
    this.reservedAmmo -= available;
    this.isReloading = false;
  }
  
  toggleADS() {
    this.adsActive = !this.adsActive;
    return this.adsActive;
  }
  
  setADS(active) {
    this.adsActive = active;
  }
  
  playFireSound() {
    if (this.data.sounds?.fire) {
      const audio = new Audio(this.data.sounds.fire);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }
  
  playReloadSound() {
    if (this.data.sounds?.reload) {
      const audio = new Audio(this.data.sounds.reload);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }
  
  playEmptySound() {
    if (this.data.sounds?.empty) {
      const audio = new Audio(this.data.sounds.empty);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }
  
  addAmmo(amount) {
    this.reservedAmmo = Math.min(this.reservedAmmo + amount, this.data.maxAmmo);
  }
  
  getAmmoInfo() {
    return {
      magazine: this.currentMagazine,
      reserved: this.reservedAmmo,
      maxMagazine: this.data.magazineSize,
      maxReserved: this.data.maxAmmo,
    };
  }
  
  getName() {
    return this.data.name;
  }
  
  getSpread() {
    return this.currentSpread;
  }
  
  isADSActive() {
    return this.adsActive;
  }
  
  getADSTransition() {
    return this.adsTransition;
  }
  
  dispose() {
    if (this.muzzleFlashLight) {
      this.gunHolder.remove(this.muzzleFlashLight);
    }
    if (this.muzzleFlashMesh) {
      this.gunHolder.remove(this.muzzleFlashMesh);
      this.muzzleFlashMesh.geometry.dispose();
      this.muzzleFlashMesh.material.dispose();
    }
    for (const shell of this.shells) {
      this.gunHolder.remove(shell.mesh);
    }
    this.shells = [];
    for (const decal of this.decals) {
      this.scene.remove(decal);
    }
    this.decals = [];
  }
}

export { WeaponBase };
