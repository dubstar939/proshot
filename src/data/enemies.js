// ============================================
// ENEMY DATA DEFINITIONS
// Enemy types, stats, behaviors, and spawn configs
// ============================================

/**
 * Enemy types
 * @enum {string}
 */
const ENEMY_TYPE = {
  BASIC: 'basic',
  HEAVY: 'heavy',
  SCOUT: 'scout',
  BOSS: 'boss',
};

/**
 * AI Behavior presets
 * @enum {string}
 */
const AI_BEHAVIOR = {
  AGGRESSIVE: 'aggressive',
  DEFENSIVE: 'defensive',
  FLANKER: 'flanker',
  SNIPER: 'sniper',
  BERSERKER: 'berserker',
};

/**
 * Enemy definitions
 * Complete stats and behavior configs for each enemy type
 */
const ENEMIES = {
  // ==================
  // BASIC SOLDIER
  // ==================
  basic: {
    id: 'basic',
    name: 'Soldier',
    type: ENEMY_TYPE.BASIC,
    behavior: AI_BEHAVIOR.AGGRESSIVE,
    
    // Model
    modelPath: '/models/enemies/soldier.glb',
    modelScale: 1,
    
    // Stats
    health: 100,
    armor: 0,
    
    // Movement
    walkSpeed: 3,
    runSpeed: 6,
    turnSpeed: 5, // Radians per second
    
    // Combat
    damage: 10,
    attackRange: 15,
    attackCooldown: 1.0, // Seconds between attacks
    accuracy: 0.7, // 0-1, affects spread
    burstSize: 3,
    burstDelay: 0.15,
    
    // Detection
    sightRange: 30,
    sightAngle: 120, // Degrees
    hearingRange: 20,
    
    // AI Timings
    alertDuration: 3, // Time to investigate sounds
    searchDuration: 5, // Time to search for lost player
    lostPlayerDelay: 2, // Time before switching to search
    
    // Rewards
    scoreValue: 100,
    dropChance: 0.3,
    drops: ['ammo_small', 'health_small'],
    
    // Hitboxes
    hitboxes: {
      head: { multiplier: 2.0, offset: { x: 0, y: 1.7, z: 0 }, radius: 0.15 },
      body: { multiplier: 1.0, offset: { x: 0, y: 1.0, z: 0 }, radius: 0.3 },
      legs: { multiplier: 0.75, offset: { x: 0, y: 0.4, z: 0 }, radius: 0.2 },
    },
    
    // Visual
    color: 0x444444,
    height: 1.8,
  },
  
  // ==================
  // HEAVY UNIT
  // ==================
  heavy: {
    id: 'heavy',
    name: 'Heavy',
    type: ENEMY_TYPE.HEAVY,
    behavior: AI_BEHAVIOR.DEFENSIVE,
    
    modelPath: '/models/enemies/heavy.glb',
    modelScale: 1.2,
    
    health: 300,
    armor: 50,
    
    walkSpeed: 2,
    runSpeed: 3.5,
    turnSpeed: 3,
    
    damage: 15,
    attackRange: 20,
    attackCooldown: 0.5,
    accuracy: 0.5,
    burstSize: 10,
    burstDelay: 0.1,
    suppressionTime: 3, // Continuous fire duration
    
    sightRange: 35,
    sightAngle: 100,
    hearingRange: 25,
    
    alertDuration: 4,
    searchDuration: 8,
    lostPlayerDelay: 3,
    
    scoreValue: 300,
    dropChance: 0.5,
    drops: ['ammo_large', 'health_medium', 'armor_small'],
    
    hitboxes: {
      head: { multiplier: 2.0, offset: { x: 0, y: 2.0, z: 0 }, radius: 0.18 },
      body: { multiplier: 0.8, offset: { x: 0, y: 1.2, z: 0 }, radius: 0.45 },
      legs: { multiplier: 0.6, offset: { x: 0, y: 0.5, z: 0 }, radius: 0.25 },
    },
    
    color: 0x666666,
    height: 2.1,
    
    // Special abilities
    abilities: {
      shield: {
        enabled: true,
        health: 100,
        regenDelay: 5,
        regenRate: 10,
      },
    },
  },
  
  // ==================
  // SCOUT UNIT
  // ==================
  scout: {
    id: 'scout',
    name: 'Scout',
    type: ENEMY_TYPE.SCOUT,
    behavior: AI_BEHAVIOR.FLANKER,
    
    modelPath: '/models/enemies/scout.glb',
    modelScale: 0.9,
    
    health: 60,
    armor: 0,
    
    walkSpeed: 4,
    runSpeed: 9,
    turnSpeed: 8,
    
    damage: 15,
    attackRange: 12,
    attackCooldown: 0.8,
    accuracy: 0.8,
    burstSize: 2,
    burstDelay: 0.1,
    
    sightRange: 40, // Better vision
    sightAngle: 140,
    hearingRange: 30,
    
    alertDuration: 2,
    searchDuration: 4,
    lostPlayerDelay: 1,
    
    // Flanking behavior
    flankDistance: 10, // How far to move to the side
    flankAngle: 60, // Preferred angle to approach from
    repositionCooldown: 3,
    
    scoreValue: 150,
    dropChance: 0.4,
    drops: ['ammo_small', 'health_small'],
    
    hitboxes: {
      head: { multiplier: 2.5, offset: { x: 0, y: 1.5, z: 0 }, radius: 0.12 },
      body: { multiplier: 1.0, offset: { x: 0, y: 0.9, z: 0 }, radius: 0.25 },
      legs: { multiplier: 0.8, offset: { x: 0, y: 0.35, z: 0 }, radius: 0.18 },
    },
    
    color: 0x555555,
    height: 1.6,
    
    abilities: {
      dodge: {
        enabled: true,
        chance: 0.3, // Chance to dodge when shot at
        cooldown: 2,
      },
    },
  },
  
  // ==================
  // BOSS UNIT
  // ==================
  boss: {
    id: 'boss',
    name: 'Commander',
    type: ENEMY_TYPE.BOSS,
    behavior: AI_BEHAVIOR.AGGRESSIVE,
    
    modelPath: '/models/enemies/boss.glb',
    modelScale: 1.5,
    
    health: 1000,
    armor: 100,
    
    walkSpeed: 2.5,
    runSpeed: 5,
    turnSpeed: 4,
    
    damage: 25,
    attackRange: 25,
    attackCooldown: 0.3,
    accuracy: 0.85,
    burstSize: 5,
    burstDelay: 0.08,
    
    sightRange: 50,
    sightAngle: 180,
    hearingRange: 40,
    
    alertDuration: 1,
    searchDuration: 10,
    lostPlayerDelay: 1,
    
    scoreValue: 1000,
    dropChance: 1.0,
    drops: ['ammo_large', 'health_large', 'armor_medium', 'weapon_upgrade'],
    
    hitboxes: {
      head: { multiplier: 1.5, offset: { x: 0, y: 2.5, z: 0 }, radius: 0.25 },
      body: { multiplier: 1.0, offset: { x: 0, y: 1.5, z: 0 }, radius: 0.5 },
      legs: { multiplier: 0.5, offset: { x: 0, y: 0.6, z: 0 }, radius: 0.3 },
    },
    
    color: 0x880000,
    height: 2.5,
    
    // Boss phases
    phases: [
      {
        healthThreshold: 1.0,
        behavior: AI_BEHAVIOR.AGGRESSIVE,
        attackMultiplier: 1.0,
        speedMultiplier: 1.0,
      },
      {
        healthThreshold: 0.6,
        behavior: AI_BEHAVIOR.AGGRESSIVE,
        attackMultiplier: 1.5,
        speedMultiplier: 1.2,
        summonEnemies: { type: 'basic', count: 2 },
      },
      {
        healthThreshold: 0.3,
        behavior: AI_BEHAVIOR.BERSERKER,
        attackMultiplier: 2.0,
        speedMultiplier: 1.5,
        summonEnemies: { type: 'scout', count: 2 },
      },
    ],
    
    abilities: {
      groundSlam: {
        enabled: true,
        damage: 50,
        radius: 5,
        cooldown: 10,
        chargeTime: 1.5,
      },
      summon: {
        enabled: true,
        cooldown: 30,
        types: ['basic', 'scout'],
        count: 3,
      },
    },
  },
};

/**
 * Wave spawn configurations
 * Defines enemy composition for each wave tier
 */
const WAVE_CONFIGS = {
  // Early waves (1-5)
  early: {
    baseCount: 3,
    countPerWave: 1,
    types: {
      basic: 1.0, // 100% chance
    },
    spawnDelay: 2,
    maxConcurrent: 5,
  },
  
  // Mid waves (6-10)
  mid: {
    baseCount: 5,
    countPerWave: 2,
    types: {
      basic: 0.7,
      scout: 0.3,
    },
    spawnDelay: 1.5,
    maxConcurrent: 8,
  },
  
  // Late waves (11-15)
  late: {
    baseCount: 8,
    countPerWave: 2,
    types: {
      basic: 0.5,
      scout: 0.3,
      heavy: 0.2,
    },
    spawnDelay: 1,
    maxConcurrent: 12,
  },
  
  // Endgame waves (16+)
  endgame: {
    baseCount: 10,
    countPerWave: 3,
    types: {
      basic: 0.4,
      scout: 0.3,
      heavy: 0.3,
    },
    spawnDelay: 0.8,
    maxConcurrent: 15,
  },
};

/**
 * Boss wave intervals
 * Bosses spawn on these wave numbers
 */
const BOSS_WAVES = [5, 10, 15, 20, 25];

/**
 * Difficulty multipliers
 */
const DIFFICULTY = {
  easy: {
    healthMultiplier: 0.7,
    damageMultiplier: 0.7,
    accuracyMultiplier: 0.8,
    spawnRateMultiplier: 0.8,
    scoreMultiplier: 0.8,
  },
  normal: {
    healthMultiplier: 1.0,
    damageMultiplier: 1.0,
    accuracyMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    scoreMultiplier: 1.0,
  },
  hard: {
    healthMultiplier: 1.5,
    damageMultiplier: 1.3,
    accuracyMultiplier: 1.2,
    spawnRateMultiplier: 1.2,
    scoreMultiplier: 1.5,
  },
  nightmare: {
    healthMultiplier: 2.0,
    damageMultiplier: 1.5,
    accuracyMultiplier: 1.4,
    spawnRateMultiplier: 1.5,
    scoreMultiplier: 2.0,
  },
};

/**
 * Get enemy definition by ID
 * @param {string} id - Enemy ID
 * @returns {Object|null}
 */
function getEnemy(id) {
  return ENEMIES[id] || null;
}

/**
 * Get all enemies
 * @returns {Object}
 */
function getAllEnemies() {
  return { ...ENEMIES };
}

/**
 * Get enemies by type
 * @param {string} type - Enemy type
 * @returns {Array}
 */
function getEnemiesByType(type) {
  return Object.values(ENEMIES).filter(e => e.type === type);
}

/**
 * Get wave config based on wave number
 * @param {number} wave - Current wave number
 * @returns {Object}
 */
function getWaveConfig(wave) {
  if (wave <= 5) return WAVE_CONFIGS.early;
  if (wave <= 10) return WAVE_CONFIGS.mid;
  if (wave <= 15) return WAVE_CONFIGS.late;
  return WAVE_CONFIGS.endgame;
}

/**
 * Check if wave is a boss wave
 * @param {number} wave - Wave number
 * @returns {boolean}
 */
function isBossWave(wave) {
  return BOSS_WAVES.includes(wave);
}

/**
 * Calculate enemy count for a wave
 * @param {number} wave - Wave number
 * @param {Object} config - Wave config
 * @returns {number}
 */
function getWaveEnemyCount(wave, config) {
  return config.baseCount + Math.floor((wave - 1) * config.countPerWave);
}

/**
 * Select enemy type based on wave config probabilities
 * @param {Object} typeWeights - Object with type: probability
 * @returns {string} - Selected enemy type ID
 */
function selectEnemyType(typeWeights) {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [type, weight] of Object.entries(typeWeights)) {
    cumulative += weight;
    if (random <= cumulative) {
      return type;
    }
  }
  
  // Fallback to basic
  return 'basic';
}

/**
 * Apply difficulty multipliers to enemy stats
 * @param {Object} enemy - Enemy definition
 * @param {string} difficulty - Difficulty level
 * @returns {Object} - Modified enemy stats
 */
function applyDifficulty(enemy, difficulty = 'normal') {
  const mult = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  
  return {
    ...enemy,
    health: Math.round(enemy.health * mult.healthMultiplier),
    damage: Math.round(enemy.damage * mult.damageMultiplier),
    accuracy: Math.min(1, enemy.accuracy * mult.accuracyMultiplier),
    scoreValue: Math.round(enemy.scoreValue * mult.scoreMultiplier),
  };
}

export {
  ENEMIES,
  ENEMY_TYPE,
  AI_BEHAVIOR,
  WAVE_CONFIGS,
  BOSS_WAVES,
  DIFFICULTY,
  getEnemy,
  getAllEnemies,
  getEnemiesByType,
  getWaveConfig,
  isBossWave,
  getWaveEnemyCount,
  selectEnemyType,
  applyDifficulty,
};
