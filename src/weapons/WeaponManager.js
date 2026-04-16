// ============================================
// WEAPON MANAGER
// Handles weapon switching, inventory, and coordination
// Supports multiple weapons with quick switching
// ============================================

import * as THREE from 'three';
import { WeaponBase } from './WeaponBase.js';
import { WEAPON_DATA } from './WeaponData.js';

class WeaponManager {
  constructor(gunHolder, scene, camera, onFireCallback) {
    this.gunHolder = gunHolder;
    this.scene = scene;
    this.camera = camera;
    this.onFireCallback = onFireCallback;
    
    this.weapons = {};
    this.weaponSlots = {}; // Slot-based weapon system
    this.currentWeaponId = null;
    this.currentSlot = 0;
    this.switchingWeapon = false;
    this.switchTimer = 0;
    
    // Initialize default weapons
    this.addWeapon('pistol', 0); // Slot 0: Pistol
  }
  
  addWeapon(weaponId, slot = -1) {
    if (this.weapons[weaponId]) return false;
    
    const weapon = new WeaponBase(
      weaponId,
      this.gunHolder,
      this.scene,
      this.camera,
      this.onFireCallback
    );
    
    if (!weapon) return false;
    
    this.weapons[weaponId] = weapon;
    
    // Assign to slot
    if (slot >= 0) {
      this.weaponSlots[slot] = weaponId;
    }
    
    return true;
  }
  
  removeWeapon(weaponId) {
    if (!this.weapons[weaponId]) return false;
    
    // Can't remove current weapon
    if (weaponId === this.currentWeaponId) return false;
    
    this.weapons[weaponId].dispose();
    delete this.weapons[weaponId];
    
    // Remove from slots
    for (const [slot, id] of Object.entries(this.weaponSlots)) {
      if (id === weaponId) {
        delete this.weaponSlots[slot];
      }
    }
    
    return true;
  }
  
  switchToWeapon(weaponId) {
    if (this.switchingWeapon) return false;
    if (!this.weapons[weaponId]) return false;
    if (weaponId === this.currentWeaponId) return false;
    
    this.switchingWeapon = true;
    this.switchTimer = 0.3; // Switch duration
    
    // Hide current weapon
    if (this.currentWeaponId && this.weapons[this.currentWeaponId]) {
      this.weapons[this.currentWeaponId].gunHolder.visible = false;
      this.weapons[this.currentWeaponId].setADS(false);
    }
    
    // Show new weapon after delay
    setTimeout(() => {
      this.currentWeaponId = weaponId;
      this.weapons[weaponId].gunHolder.visible = true;
      this.switchingWeapon = false;
      
      // Find slot for this weapon
      for (const [slot, id] of Object.entries(this.weaponSlots)) {
        if (id === weaponId) {
          this.currentSlot = parseInt(slot);
          break;
        }
      }
    }, 300);
    
    return true;
  }
  
  switchToSlot(slot) {
    const weaponId = this.weaponSlots[slot];
    if (weaponId) {
      return this.switchToWeapon(weaponId);
    }
    return false;
  }
  
  getNextWeapon() {
    const slots = Object.keys(this.weaponSlots).sort((a, b) => a - b);
    if (slots.length === 0) return null;
    
    const currentIndex = slots.indexOf(String(this.currentSlot));
    const nextIndex = (currentIndex + 1) % slots.length;
    return this.weaponSlots[slots[nextIndex]];
  }
  
  getPreviousWeapon() {
    const slots = Object.keys(this.weaponSlots).sort((a, b) => a - b);
    if (slots.length === 0) return null;
    
    const currentIndex = slots.indexOf(String(this.currentSlot));
    const prevIndex = (currentIndex - 1 + slots.length) % slots.length;
    return this.weaponSlots[slots[prevIndex]];
  }
  
  cycleWeapon(direction) {
    if (direction > 0) {
      const nextWeapon = this.getNextWeapon();
      if (nextWeapon) this.switchToWeapon(nextWeapon);
    } else {
      const prevWeapon = this.getPreviousWeapon();
      if (prevWeapon) this.switchToWeapon(prevWeapon);
    }
  }
  
  getCurrentWeapon() {
    return this.weapons[this.currentWeaponId];
  }
  
  fire(currentTime, isHolding = false) {
    if (!this.currentWeaponId || this.switchingWeapon) return false;
    return this.weapons[this.currentWeaponId].fire(currentTime, isHolding);
  }
  
  reload() {
    if (!this.currentWeaponId) return false;
    return this.weapons[this.currentWeaponId].startReload();
  }
  
  toggleADS() {
    if (!this.currentWeaponId) return false;
    return this.weapons[this.currentWeaponId].toggleADS();
  }
  
  setADS(active) {
    if (!this.currentWeaponId) return;
    this.weapons[this.currentWeaponId].setADS(active);
  }
  
  update(deltaTime, currentTime) {
    // Update switch timer
    if (this.switchingWeapon) {
      this.switchTimer -= deltaTime;
      if (this.switchTimer <= 0) {
        this.switchingWeapon = false;
      }
    }
    
    // Update all weapons
    for (const weapon of Object.values(this.weapons)) {
      weapon.update(deltaTime, currentTime);
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
  
  getCurrentWeaponSpread() {
    if (!this.currentWeaponId) return 0;
    return this.weapons[this.currentWeaponId].getSpread();
  }
  
  isADSActive() {
    if (!this.currentWeaponId) return false;
    return this.weapons[this.currentWeaponId].isADSActive();
  }
  
  getADSTransition() {
    if (!this.currentWeaponId) return 0;
    return this.weapons[this.currentWeaponId].getADSTransition();
  }
  
  getWeaponList() {
    return Object.keys(this.weapons).map(id => ({
      id,
      name: this.weapons[id].getName(),
      inSlot: Object.entries(this.weaponSlots)
        .filter(([_, weaponId]) => weaponId === id)
        .map(([slot, _]) => parseInt(slot))[0],
    }));
  }
  
  hasWeapon(weaponId) {
    return !!this.weapons[weaponId];
  }
  
  giveWeapon(weaponId, slot = -1) {
    if (this.hasWeapon(weaponId)) return false;
    return this.addWeapon(weaponId, slot);
  }
  
  addAmmo(weaponId, amount) {
    if (this.weapons[weaponId]) {
      this.weapons[weaponId].addAmmo(amount);
      return true;
    }
    return false;
  }
  
  dispose() {
    for (const weapon of Object.values(this.weapons)) {
      weapon.dispose();
    }
    this.weapons = {};
    this.weaponSlots = {};
    this.currentWeaponId = null;
  }
}

export { WeaponManager };
