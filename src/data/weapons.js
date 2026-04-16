// ============================================
// WEAPON DATA DEFINITIONS
// Data-driven weapon configurations
// All weapon stats, sounds, and model paths
// ============================================

/**
 * Weapon types
 * @enum {string}
 */
const WEAPON_TYPE = {
  PISTOL: 'pistol',
  RIFLE: 'rifle',
  SHOTGUN: 'shotgun',
  SMG: 'smg',
  SNIPER: 'sniper',
  MELEE: 'melee',
};

/**
 * Fire modes
 * @enum {string}
 */
const FIRE_MODE = {
  SEMI: 'semi',
  AUTO: 'auto',
  BURST: 'burst',
  PUMP: 'pump',
  BOLT: 'bolt',
};

/**
 * Weapon definitions
 * Each weapon has complete stats for gameplay balance
 */
const WEAPONS = {
  // ==================
  // PISTOLS
  // ==================
  pistol: {
    id: 'pistol',
    name: 'M9 Beretta',
    type: WEAPON_TYPE.PISTOL,
    fireMode: FIRE_MODE.SEMI,
    
    // Model
    modelPath: '/models/weapons/pistol.glb',
    modelScale: 1,
    modelOffset: { x: 0.1, y: -0.1, z: -0.3 },
    adsOffset: { x: 0, y: -0.05, z: -0.2 },
    
    // Stats
    damage: 25,
    headshotMultiplier: 2.0,
    fireRate: 400, // RPM (rounds per minute)
    range: 50,
    bulletSpeed: 300,
    
    // Ammo
    magazineSize: 15,
    reserveAmmo: 60,
    reloadTime: 1.5,
    
    // Accuracy
    spread: {
      hip: 0.04,
      ads: 0.01,
      moving: 0.06,
      airborne: 0.12,
    },
    spreadRecovery: 0.15, // Time to recover from shot spread
    
    // Recoil
    recoil: {
      vertical: 0.015,
      horizontal: 0.005,
      recovery: 0.08, // Recovery speed
      pattern: [
        { x: 0, y: 1 },
        { x: 0.2, y: 0.8 },
        { x: -0.1, y: 0.9 },
        { x: 0.15, y: 0.85 },
      ],
    },
    
    // ADS (Aim Down Sights)
    adsTime: 0.15, // Time to ADS
    adsFovMultiplier: 0.9, // FOV zoom when ADS
    
    // Movement
    moveSpeedMultiplier: 1.0,
    adsSpeedMultiplier: 0.8,
    
    // Sounds
    sounds: {
      fire: 'pistol_fire',
      reload: 'pistol_reload',
      empty: 'weapon_empty',
      equip: 'weapon_equip',
      ads: 'weapon_ads',
    },
    
    // Visuals
    muzzleFlash: {
      size: 0.3,
      duration: 0.05,
      color: 0xffaa00,
    },
    tracerColor: 0xffff00,
    shellEject: true,
    
    // Slot
    slot: 1,
    weight: 1,
  },
  
  // ==================
  // ASSAULT RIFLES
  // ==================
  assault_rifle: {
    id: 'assault_rifle',
    name: 'M4A1',
    type: WEAPON_TYPE.RIFLE,
    fireMode: FIRE_MODE.AUTO,
    
    modelPath: '/models/weapons/m4a1.glb',
    modelScale: 1,
    modelOffset: { x: 0.15, y: -0.12, z: -0.4 },
    adsOffset: { x: 0, y: -0.06, z: -0.25 },
    
    damage: 28,
    headshotMultiplier: 1.8,
    fireRate: 700,
    range: 80,
    bulletSpeed: 400,
    
    magazineSize: 30,
    reserveAmmo: 120,
    reloadTime: 2.2,
    
    spread: {
      hip: 0.06,
      ads: 0.015,
      moving: 0.08,
      airborne: 0.15,
    },
    spreadRecovery: 0.12,
    
    recoil: {
      vertical: 0.02,
      horizontal: 0.008,
      recovery: 0.06,
      pattern: [
        { x: 0, y: 1 },
        { x: 0.1, y: 0.95 },
        { x: -0.15, y: 0.9 },
        { x: 0.2, y: 0.85 },
        { x: -0.1, y: 0.8 },
        { x: 0.05, y: 0.9 },
      ],
    },
    
    adsTime: 0.2,
    adsFovMultiplier: 0.85,
    
    moveSpeedMultiplier: 0.95,
    adsSpeedMultiplier: 0.7,
    
    sounds: {
      fire: 'rifle_fire',
      reload: 'rifle_reload',
      empty: 'weapon_empty',
      equip: 'weapon_equip',
      ads: 'weapon_ads',
    },
    
    muzzleFlash: {
      size: 0.5,
      duration: 0.04,
      color: 0xffcc00,
    },
    tracerColor: 0xffff44,
    shellEject: true,
    
    slot: 0,
    weight: 3,
  },
  
  // ==================
  // SHOTGUNS
  // ==================
  shotgun: {
    id: 'shotgun',
    name: 'M870 Pump',
    type: WEAPON_TYPE.SHOTGUN,
    fireMode: FIRE_MODE.PUMP,
    
    modelPath: '/models/weapons/shotgun.glb',
    modelScale: 1,
    modelOffset: { x: 0.15, y: -0.15, z: -0.45 },
    adsOffset: { x: 0, y: -0.08, z: -0.3 },
    
    damage: 15, // Per pellet
    pelletCount: 8,
    headshotMultiplier: 1.5,
    fireRate: 60, // Pump action
    range: 25,
    bulletSpeed: 250,
    
    magazineSize: 6,
    reserveAmmo: 24,
    reloadTime: 0.5, // Per shell
    reloadType: 'shell', // Shell by shell reload
    
    spread: {
      hip: 0.15,
      ads: 0.1,
      moving: 0.18,
      airborne: 0.25,
    },
    spreadRecovery: 0.3,
    
    recoil: {
      vertical: 0.08,
      horizontal: 0.02,
      recovery: 0.15,
      pattern: [
        { x: 0, y: 1 },
      ],
    },
    
    adsTime: 0.25,
    adsFovMultiplier: 0.9,
    
    moveSpeedMultiplier: 0.9,
    adsSpeedMultiplier: 0.6,
    
    pumpTime: 0.6, // Time between shots for pump action
    
    sounds: {
      fire: 'shotgun_fire',
      reload: 'shotgun_reload',
      empty: 'weapon_empty',
      equip: 'weapon_equip',
      ads: 'weapon_ads',
      pump: 'shotgun_pump',
    },
    
    muzzleFlash: {
      size: 0.8,
      duration: 0.06,
      color: 0xff8800,
    },
    tracerColor: null, // No tracers for shotgun
    shellEject: true,
    
    slot: 0,
    weight: 4,
  },
  
  // ==================
  // SMG
  // ==================
  smg: {
    id: 'smg',
    name: 'MP5',
    type: WEAPON_TYPE.SMG,
    fireMode: FIRE_MODE.AUTO,
    
    modelPath: '/models/weapons/mp5.glb',
    modelScale: 1,
    modelOffset: { x: 0.12, y: -0.1, z: -0.35 },
    adsOffset: { x: 0, y: -0.05, z: -0.22 },
    
    damage: 20,
    headshotMultiplier: 1.6,
    fireRate: 800,
    range: 40,
    bulletSpeed: 350,
    
    magazineSize: 25,
    reserveAmmo: 100,
    reloadTime: 1.8,
    
    spread: {
      hip: 0.05,
      ads: 0.02,
      moving: 0.06,
      airborne: 0.12,
    },
    spreadRecovery: 0.1,
    
    recoil: {
      vertical: 0.012,
      horizontal: 0.01,
      recovery: 0.05,
      pattern: [
        { x: 0, y: 1 },
        { x: 0.15, y: 0.9 },
        { x: -0.2, y: 0.85 },
        { x: 0.1, y: 0.9 },
      ],
    },
    
    adsTime: 0.15,
    adsFovMultiplier: 0.9,
    
    moveSpeedMultiplier: 1.0,
    adsSpeedMultiplier: 0.85,
    
    sounds: {
      fire: 'smg_fire',
      reload: 'smg_reload',
      empty: 'weapon_empty',
      equip: 'weapon_equip',
      ads: 'weapon_ads',
    },
    
    muzzleFlash: {
      size: 0.35,
      duration: 0.03,
      color: 0xffbb00,
    },
    tracerColor: 0xffff22,
    shellEject: true,
    
    slot: 0,
    weight: 2,
  },
  
  // ==================
  // SNIPER
  // ==================
  sniper: {
    id: 'sniper',
    name: 'AWP',
    type: WEAPON_TYPE.SNIPER,
    fireMode: FIRE_MODE.BOLT,
    
    modelPath: '/models/weapons/awp.glb',
    modelScale: 1,
    modelOffset: { x: 0.18, y: -0.15, z: -0.5 },
    adsOffset: { x: 0, y: -0.02, z: -0.2 },
    
    damage: 100,
    headshotMultiplier: 2.5,
    fireRate: 40,
    range: 200,
    bulletSpeed: 600,
    
    magazineSize: 5,
    reserveAmmo: 20,
    reloadTime: 3.0,
    
    spread: {
      hip: 0.2,
      ads: 0.001, // Very accurate when scoped
      moving: 0.25,
      airborne: 0.4,
    },
    spreadRecovery: 0.5,
    
    recoil: {
      vertical: 0.1,
      horizontal: 0.01,
      recovery: 0.2,
      pattern: [
        { x: 0, y: 1 },
      ],
    },
    
    adsTime: 0.3,
    adsFovMultiplier: 0.3, // Strong zoom
    hasScope: true,
    scopeZoom: 4,
    
    moveSpeedMultiplier: 0.85,
    adsSpeedMultiplier: 0.4,
    
    boltTime: 1.2, // Time between shots for bolt action
    
    sounds: {
      fire: 'sniper_fire',
      reload: 'sniper_reload',
      empty: 'weapon_empty',
      equip: 'weapon_equip',
      ads: 'sniper_ads',
      bolt: 'sniper_bolt',
    },
    
    muzzleFlash: {
      size: 0.6,
      duration: 0.05,
      color: 0xffaa00,
    },
    tracerColor: 0xffffff,
    shellEject: true,
    
    slot: 0,
    weight: 5,
  },
};

/**
 * Get weapon by ID
 * @param {string} id - Weapon ID
 * @returns {Object|null} - Weapon data or null
 */
function getWeapon(id) {
  return WEAPONS[id] || null;
}

/**
 * Get all weapons
 * @returns {Object} - All weapon definitions
 */
function getAllWeapons() {
  return { ...WEAPONS };
}

/**
 * Get weapons by type
 * @param {string} type - Weapon type
 * @returns {Array} - Array of weapons of that type
 */
function getWeaponsByType(type) {
  return Object.values(WEAPONS).filter(w => w.type === type);
}

/**
 * Calculate actual fire rate delay in ms
 * @param {number} rpm - Rounds per minute
 * @returns {number} - Delay in milliseconds
 */
function getFireDelay(rpm) {
  return 60000 / rpm;
}

/**
 * Calculate damage with falloff
 * @param {Object} weapon - Weapon data
 * @param {number} distance - Distance to target
 * @returns {number} - Calculated damage
 */
function calculateDamage(weapon, distance) {
  const baseDamage = weapon.damage;
  const range = weapon.range;
  
  // No falloff within half range
  if (distance <= range * 0.5) {
    return baseDamage;
  }
  
  // Linear falloff from 50% to 100% range
  // At max range, damage is 50%
  if (distance >= range) {
    return baseDamage * 0.5;
  }
  
  const falloffStart = range * 0.5;
  const falloffDistance = distance - falloffStart;
  const falloffRange = range - falloffStart;
  const falloffPercent = falloffDistance / falloffRange;
  
  return baseDamage * (1 - falloffPercent * 0.5);
}

export {
  WEAPONS,
  WEAPON_TYPE,
  FIRE_MODE,
  getWeapon,
  getAllWeapons,
  getWeaponsByType,
  getFireDelay,
  calculateDamage,
};
