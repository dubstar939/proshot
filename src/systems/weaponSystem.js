// ============================================
// WEAPON SYSTEM MODULE
// Base weapon class + modular weapon data
// Hitscan + projectile support
// Recoil, spread, ADS, reload, ammo pools
// Muzzle flash, impact effects, shell ejection
// Weapon switching
// ============================================

import * as THREE from "three";

// Weapon definitions with modular data
const WEAPON_DATA = {
  pistol: {
    id: 'pistol',
    name: 'Pistol',
    type: 'hitscan',
    damage: 25,
    fireRate: 0.15, // seconds between shots
    magazineSize: 12,
    maxAmmo: 120,
    reloadTime: 1.5,
    spread: 0.02,
    recoil: { x: 0.02, y: 0.03 },
    range: 100,
    fireSound: '/sounds/laser.mp3',
    reloadSound: '/sounds/reload.mp3',
    emptySound: null,
    muzzleFlashDuration: 0.05,
    shellEjection: true,
  },
  rifle: {
    id: 'rifle',
    name: 'Assault Rifle',
    type: 'hitscan',
    damage: 18,
    fireRate: 0.08,
    magazineSize: 30,
    maxAmmo: 240,
    reloadTime: 2.0,
    spread: 0.035,
    recoil: { x: 0.025, y: 0.04 },
    range: 150,
    fireSound: '/sounds/laser.mp3',
    reloadSound: '/sounds/reload.mp3',
    emptySound: null,
    muzzleFlashDuration: 0.05,
    shellEjection: true,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    type: 'hitscan',
    damage: 12,
    pellets: 8,
    fireRate: 0.8,
    magazineSize: 6,
    maxAmmo: 48,
    reloadTime: 2.5,
    spread: 0.15,
    recoil: { x: 0.05, y: 0.08 },
    range: 40,
    fireSound: '/sounds/laser.mp3',
    reloadSound: '/sounds/reload.mp3',
    emptySound: null,
    muzzleFlashDuration: 0.08,
    shellEjection: true,
  },
  launcher: {
    id: 'launcher',
    name: 'Grenade Launcher',
    type: 'projectile',
    damage: 100,
    explosionRadius: 8,
    fireRate: 1.0,
    magazineSize: 4,
    maxAmmo: 20,
    reloadTime: 3.0,
    spread: 0.01,
    recoil: { x: 0.08, y: 0.12 },
    range: 80,
    projectileSpeed: 40,
    projectileGravity: 15,
    fireSound: '/sounds/laser.mp3',
    reloadSound: '/sounds/reload.mp3',
    emptySound: null,
    muzzleFlashDuration: 0.1,
    shellEjection: false,
  },
};

class Weapon {
  constructor(weaponId, gunHolder, scene, camera, onFireCallback) {
    const data = WEAPON_DATA[weaponId];
    if (!data) {
      console.error(`Unknown weapon: ${weaponId}`);
      return;
    }
    
    this.data = { ...data };
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
    
    // Recoil accumulation
    this.recoilOffset = new THREE.Vector3();
    this.recoilRotation = new THREE.Vector3();
    
    // Spread
    this.currentSpread = this.data.spread;
  }
  
  createMuzzleFlash() {
    // Create a point light for muzzle flash
    this.muzzleFlashLight = new THREE.PointLight(0xffaa00, 0, 5);
    this.muzzleFlashLight.position.set(0, 0.1, -1);
    this.gunHolder.add(this.muzzleFlashLight);
    
    // Create a simple mesh for visual flash
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
    this.recoilOffset.lerp(new THREE.Vector3(), deltaTime * 10);
    this.recoilRotation.lerp(new THREE.Vector3(), deltaTime * 8);
    
    // Recover spread
    this.currentSpread = THREE.MathUtils.lerp(
      this.currentSpread,
      this.data.spread,
      deltaTime * 5
    );
    
    // Apply recoil to camera/gun
    this.applyRecoil();
  }
  
  updateShells(deltaTime) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const shell = this.shells[i];
      
      // Update position
      shell.velocity.y -= 20 * deltaTime; // Gravity
      shell.position.addScaledVector(shell.velocity, deltaTime);
      
      // Update rotation
      shell.rotation.x += shell.rotVelocity.x * deltaTime;
      shell.rotation.z += shell.rotVelocity.z * deltaTime;
      
      // Check if shell hit ground
      if (shell.position.y < 0) {
        shell.position.y = 0;
        shell.velocity.multiplyScalar(0.3); // Dampen
        shell.rotVelocity.multiplyScalar(0.5);
        
        // Remove if almost stopped
        if (shell.velocity.length() < 0.5) {
          this.gunHolder.remove(shell.mesh);
          this.shells.splice(i, 1);
          
          // Clean up geometry and material
          shell.geometry.dispose();
          shell.material.dispose();
        }
      }
      
      // Limit shell lifetime
      shell.life -= deltaTime;
      if (shell.life <= 0) {
        this.gunHolder.remove(shell.mesh);
        this.shells.splice(i, 1);
      }
    }
    
    // Limit total shells
    while (this.shells.length > 20) {
      const oldShell = this.shells.shift();
      this.gunHolder.remove(oldShell.mesh);
    }
  }
  
  applyRecoil() {
    if (this.gunHolder) {
      this.gunHolder.position.add(this.recoilOffset);
      this.gunHolder.rotation.x += this.recoilRotation.x;
      this.gunHolder.rotation.y += this.recoilRotation.y;
    }
  }
  
  fire(currentTime) {
    if (this.isReloading) return false;
    if (this.currentMagazine <= 0) {
      this.playEmptySound();
      return false;
    }
    if (currentTime - this.lastFireTime < this.data.fireRate) {
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
      this.onFireCallback(this);
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
    
    // Increase spread slightly when firing
    this.currentSpread = Math.min(this.currentSpread * 1.3, this.data.spread * 3);
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
      position: shellMesh.position,
      velocity: velocity,
      rotation: shellMesh.rotation,
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
    
    // Check for hits
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0 && intersects[0].distance <= this.data.range) {
      const hit = intersects[0];
      this.onHit(hit.object, hit.point, hit.face?.normal, this.data.damage);
      this.createImpactEffect(hit.point, hit.face?.normal);
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
    };
    
    // Emit event for projectile handling
    if (this.onFireCallback) {
      this.onFireCallback(this, projectile);
    }
  }
  
  onHit(target, point, normal, damage) {
    // Handle hit logic - can be extended for enemy hits
    if (target.userData && target.userData.onHit) {
      target.userData.onHit(damage, point, normal);
    }
  }
  
  createImpactEffect(point, normal) {
    // Simple particle effect at impact point
    const particleCount = 5;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.BoxGeometry(0.03, 0.03, 0.03);
      const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const particle = new THREE.Mesh(geometry, material);
      
      particle.position.copy(point);
      particle.position.x += (Math.random() - 0.5) * 0.1;
      particle.position.y += (Math.random() - 0.5) * 0.1;
      particle.position.z += (Math.random() - 0.5) * 0.1;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      );
      
      this.scene.add(particle);
      particles.push({ mesh: particle, velocity, life: 0.5 });
    }
    
    // Animate and cleanup particles
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
  
  playFireSound() {
    if (this.data.fireSound) {
      const audio = new Audio(this.data.fireSound);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }
  
  playReloadSound() {
    if (this.data.reloadSound) {
      const audio = new Audio(this.data.reloadSound);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }
  
  playEmptySound() {
    if (this.data.emptySound) {
      const audio = new Audio(this.data.emptySound);
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
  }
}

class WeaponManager {
  constructor(gunHolder, scene, camera, onFireCallback) {
    this.gunHolder = gunHolder;
    this.scene = scene;
    this.camera = camera;
    this.onFireCallback = onFireCallback;
    
    this.weapons = {};
    this.currentWeaponId = null;
    this.switchingWeapon = false;
    
    // Initialize default weapons
    this.addWeapon('pistol');
    this.switchToWeapon('pistol');
  }
  
  addWeapon(weaponId) {
    if (this.weapons[weaponId]) return;
    
    const weapon = new Weapon(
      weaponId,
      this.gunHolder,
      this.scene,
      this.camera,
      this.onFireCallback
    );
    this.weapons[weaponId] = weapon;
  }
  
  switchToWeapon(weaponId) {
    if (this.switchingWeapon) return false;
    if (!this.weapons[weaponId]) return false;
    if (weaponId === this.currentWeaponId) return false;
    
    this.switchingWeapon = true;
    
    // Hide current weapon
    if (this.currentWeaponId && this.weapons[this.currentWeaponId]) {
      this.weapons[this.currentWeaponId].gunHolder.visible = false;
    }
    
    // Show new weapon after delay
    setTimeout(() => {
      this.currentWeaponId = weaponId;
      this.weapons[weaponId].gunHolder.visible = true;
      this.switchingWeapon = false;
    }, 300);
    
    return true;
  }
  
  getCurrentWeapon() {
    return this.weapons[this.currentWeaponId];
  }
  
  fire(currentTime) {
    if (!this.currentWeaponId || this.switchingWeapon) return false;
    return this.weapons[this.currentWeaponId].fire(currentTime);
  }
  
  reload() {
    if (!this.currentWeaponId) return false;
    return this.weapons[this.currentWeaponId].startReload();
  }
  
  toggleADS() {
    if (!this.currentWeaponId) return false;
    return this.weapons[this.currentWeaponId].toggleADS();
  }
  
  update(deltaTime, currentTime) {
    for (const weapon of Object.values(this.weapons)) {
      weapon.update(deltaTime, currentTime);
    }
  }
  
  getNextWeapon() {
    const ids = Object.keys(this.weapons);
    const currentIndex = ids.indexOf(this.currentWeaponId);
    const nextIndex = (currentIndex + 1) % ids.length;
    return ids[nextIndex];
  }
  
  getPreviousWeapon() {
    const ids = Object.keys(this.weapons);
    const currentIndex = ids.indexOf(this.currentWeaponId);
    const prevIndex = (currentIndex - 1 + ids.length) % ids.length;
    return ids[prevIndex];
  }
  
  cycleWeapon(direction) {
    if (direction > 0) {
      this.switchToWeapon(this.getNextWeapon());
    } else {
      this.switchToWeapon(this.getPreviousWeapon());
    }
  }
  
  getAmmoInfo() {
    if (!this.currentWeaponId) return null;
    return this.weapons[this.currentWeaponId].getAmmoInfo();
  }
  
  getCurrentWeaponName() {
    if (!this.currentWeaponId) return '';
    return this.weapons[this.currentWeaponId].getName();
  }
  
  dispose() {
    for (const weapon of Object.values(this.weapons)) {
      weapon.dispose();
    }
    this.weapons = {};
  }
}

export { Weapon, WeaponManager, WEAPON_DATA };
