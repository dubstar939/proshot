// ============================================
// MISSION DATA DEFINITIONS
// Campaign mission configurations, objectives, spawns
// ============================================

/**
 * Objective types for campaign missions
 * @enum {string}
 */
const OBJECTIVE_TYPE = {
  REACH: 'reach',
  ELIMINATE: 'eliminate',
  ELIMINATE_ALL: 'eliminate_all',
  INTERACT: 'interact',
  DEFEND: 'defend',
  SURVIVE: 'survive',
  COLLECT: 'collect',
  ESCORT: 'escort',
};

/**
 * Objective status
 * @enum {string}
 */
const OBJECTIVE_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Mission definitions
 * Each mission has objectives, enemy placements, and checkpoints
 */
const MISSIONS = {
  // ==================
  // MISSION 1: INFILTRATION
  // ==================
  mission_01: {
    id: 'mission_01',
    name: 'Infiltration',
    description: 'Infiltrate the enemy compound and secure the intelligence.',
    briefing: `Intel suggests enemy forces have established a forward operating base in the industrial district. Your mission is to infiltrate the compound, neutralize all hostiles, and recover sensitive documents from their command center.`,
    
    difficulty: 'easy',
    estimatedTime: 10, // minutes
    
    // Starting loadout
    loadout: {
      primary: 'assault_rifle',
      secondary: 'pistol',
      grenades: 2,
    },
    
    // Objectives (completed in order)
    objectives: [
      {
        id: 'obj_01_1',
        type: OBJECTIVE_TYPE.REACH,
        description: 'Reach the compound entrance',
        target: { x: 0, y: 0, z: -30 },
        radius: 5,
        optional: false,
      },
      {
        id: 'obj_01_2',
        type: OBJECTIVE_TYPE.ELIMINATE_ALL,
        description: 'Clear the courtyard',
        area: { center: { x: 0, y: 0, z: -50 }, radius: 20 },
        optional: false,
      },
      {
        id: 'obj_01_3',
        type: OBJECTIVE_TYPE.INTERACT,
        description: 'Download intel from the terminal',
        target: { x: 5, y: 0, z: -70 },
        interactionTime: 5, // seconds
        optional: false,
      },
      {
        id: 'obj_01_4',
        type: OBJECTIVE_TYPE.REACH,
        description: 'Extract to the safe zone',
        target: { x: 20, y: 0, z: -20 },
        radius: 5,
        optional: false,
      },
    ],
    
    // Bonus objectives
    bonusObjectives: [
      {
        id: 'bonus_01_1',
        type: OBJECTIVE_TYPE.COLLECT,
        description: 'Find the hidden cache',
        target: { x: -15, y: 0, z: -45 },
        radius: 2,
        reward: { ammo: 60, score: 500 },
      },
      {
        id: 'bonus_01_2',
        type: OBJECTIVE_TYPE.ELIMINATE,
        description: 'Eliminate the enemy commander',
        targetEnemy: 'commander_01',
        reward: { score: 1000 },
      },
    ],
    
    // Enemy spawns
    enemySpawns: [
      // Entrance guards
      { type: 'basic', position: { x: -5, y: 0, z: -25 }, patrol: true },
      { type: 'basic', position: { x: 5, y: 0, z: -25 }, patrol: true },
      
      // Courtyard
      { type: 'basic', position: { x: -10, y: 0, z: -45 }, patrol: true },
      { type: 'basic', position: { x: 10, y: 0, z: -45 }, patrol: true },
      { type: 'basic', position: { x: 0, y: 0, z: -55 }, patrol: false },
      { type: 'scout', position: { x: -15, y: 0, z: -50 }, patrol: true },
      
      // Command center
      { type: 'heavy', position: { x: 0, y: 0, z: -65 }, patrol: false },
      { type: 'basic', position: { x: 5, y: 0, z: -68 }, patrol: false },
      { id: 'commander_01', type: 'scout', position: { x: 8, y: 0, z: -72 }, patrol: false },
    ],
    
    // Triggered spawns (spawn when player reaches location)
    triggeredSpawns: [
      {
        trigger: { position: { x: 0, y: 0, z: -40 }, radius: 10 },
        spawns: [
          { type: 'basic', position: { x: -20, y: 0, z: -50 } },
          { type: 'basic', position: { x: 20, y: 0, z: -50 } },
        ],
      },
    ],
    
    // Checkpoints
    checkpoints: [
      { id: 'cp_01_1', position: { x: 0, y: 0, z: -30 }, afterObjective: 'obj_01_1' },
      { id: 'cp_01_2', position: { x: 0, y: 0, z: -55 }, afterObjective: 'obj_01_2' },
    ],
    
    // Rewards
    rewards: {
      completion: { score: 5000, xp: 1000 },
      noDeaths: { score: 2000, xp: 500 },
      speedBonus: { time: 300, score: 1000 }, // Under 5 minutes
    },
    
    // Environment settings
    environment: {
      timeOfDay: 'night',
      weather: 'clear',
      ambientSound: 'industrial',
    },
  },
  
  // ==================
  // MISSION 2: HOLDOUT
  // ==================
  mission_02: {
    id: 'mission_02',
    name: 'Holdout',
    description: 'Defend the communication tower until reinforcements arrive.',
    briefing: `Enemy forces are converging on our communication relay. You must hold the position and protect the equipment until extraction arrives. Expect heavy resistance.`,
    
    difficulty: 'normal',
    estimatedTime: 15,
    
    loadout: {
      primary: 'assault_rifle',
      secondary: 'shotgun',
      grenades: 4,
    },
    
    objectives: [
      {
        id: 'obj_02_1',
        type: OBJECTIVE_TYPE.REACH,
        description: 'Reach the communication tower',
        target: { x: 0, y: 0, z: 0 },
        radius: 10,
        optional: false,
      },
      {
        id: 'obj_02_2',
        type: OBJECTIVE_TYPE.DEFEND,
        description: 'Defend the tower (Wave 1)',
        target: { x: 0, y: 0, z: 0 },
        radius: 15,
        duration: 60, // seconds
        waves: 1,
        optional: false,
      },
      {
        id: 'obj_02_3',
        type: OBJECTIVE_TYPE.DEFEND,
        description: 'Defend the tower (Wave 2)',
        target: { x: 0, y: 0, z: 0 },
        radius: 15,
        duration: 90,
        waves: 2,
        optional: false,
      },
      {
        id: 'obj_02_4',
        type: OBJECTIVE_TYPE.DEFEND,
        description: 'Final stand - Hold until extraction',
        target: { x: 0, y: 0, z: 0 },
        radius: 15,
        duration: 120,
        waves: 3,
        optional: false,
      },
    ],
    
    bonusObjectives: [
      {
        id: 'bonus_02_1',
        type: OBJECTIVE_TYPE.SURVIVE,
        description: 'Complete without taking critical damage',
        maxDamagePercent: 50,
        reward: { score: 2000 },
      },
    ],
    
    // Defense waves configuration
    defenseWaves: {
      wave1: {
        spawns: [
          { type: 'basic', count: 5, direction: 'north' },
          { type: 'basic', count: 3, direction: 'east' },
        ],
        spawnInterval: 5,
      },
      wave2: {
        spawns: [
          { type: 'basic', count: 6, direction: 'north' },
          { type: 'scout', count: 3, direction: 'west' },
          { type: 'basic', count: 4, direction: 'east' },
        ],
        spawnInterval: 4,
      },
      wave3: {
        spawns: [
          { type: 'basic', count: 8, direction: 'north' },
          { type: 'scout', count: 4, direction: 'west' },
          { type: 'heavy', count: 2, direction: 'south' },
          { type: 'basic', count: 5, direction: 'east' },
        ],
        spawnInterval: 3,
        boss: { type: 'boss', spawnAt: 60 }, // Boss spawns 60s into wave
      },
    },
    
    // Spawn points for defense
    spawnDirections: {
      north: [
        { x: 0, y: 0, z: -40 },
        { x: -10, y: 0, z: -40 },
        { x: 10, y: 0, z: -40 },
      ],
      south: [
        { x: 0, y: 0, z: 40 },
        { x: -10, y: 0, z: 40 },
      ],
      east: [
        { x: 40, y: 0, z: 0 },
        { x: 40, y: 0, z: -10 },
      ],
      west: [
        { x: -40, y: 0, z: 0 },
        { x: -40, y: 0, z: 10 },
      ],
    },
    
    checkpoints: [
      { id: 'cp_02_1', position: { x: 0, y: 0, z: 0 }, afterObjective: 'obj_02_1' },
      { id: 'cp_02_2', position: { x: 0, y: 0, z: 0 }, afterObjective: 'obj_02_2' },
      { id: 'cp_02_3', position: { x: 0, y: 0, z: 0 }, afterObjective: 'obj_02_3' },
    ],
    
    rewards: {
      completion: { score: 10000, xp: 2000 },
      noDeaths: { score: 3000, xp: 750 },
      towerUndamaged: { score: 2500 },
    },
    
    environment: {
      timeOfDay: 'dusk',
      weather: 'foggy',
      ambientSound: 'combat_distant',
    },
  },
  
  // ==================
  // MISSION 3: EXTRACTION
  // ==================
  mission_03: {
    id: 'mission_03',
    name: 'Extraction',
    description: 'Fight through enemy territory to reach the extraction point.',
    briefing: `Your position has been compromised. Fight your way through enemy territory to reach the extraction helicopter. Time is critical - the extraction window closes in 15 minutes.`,
    
    difficulty: 'hard',
    estimatedTime: 12,
    timeLimit: 900, // 15 minutes hard limit
    
    loadout: {
      primary: 'smg',
      secondary: 'pistol',
      grenades: 3,
    },
    
    objectives: [
      {
        id: 'obj_03_1',
        type: OBJECTIVE_TYPE.REACH,
        description: 'Exit the building',
        target: { x: 0, y: 0, z: -10 },
        radius: 3,
        optional: false,
      },
      {
        id: 'obj_03_2',
        type: OBJECTIVE_TYPE.REACH,
        description: 'Cross the plaza',
        target: { x: 20, y: 0, z: -40 },
        radius: 5,
        optional: false,
      },
      {
        id: 'obj_03_3',
        type: OBJECTIVE_TYPE.ELIMINATE,
        description: 'Neutralize the sniper nest',
        targetCount: 3,
        area: { center: { x: 30, y: 5, z: -60 }, radius: 10 },
        optional: false,
      },
      {
        id: 'obj_03_4',
        type: OBJECTIVE_TYPE.REACH,
        description: 'Reach the extraction point',
        target: { x: 50, y: 0, z: -80 },
        radius: 8,
        optional: false,
      },
      {
        id: 'obj_03_5',
        type: OBJECTIVE_TYPE.SURVIVE,
        description: 'Hold for extraction (30 seconds)',
        duration: 30,
        area: { center: { x: 50, y: 0, z: -80 }, radius: 10 },
        optional: false,
      },
    ],
    
    bonusObjectives: [
      {
        id: 'bonus_03_1',
        type: OBJECTIVE_TYPE.COLLECT,
        description: 'Recover classified documents',
        targets: [
          { x: 10, y: 0, z: -25 },
          { x: 35, y: 0, z: -55 },
        ],
        reward: { score: 1500 },
      },
    ],
    
    enemySpawns: [
      // Building interior
      { type: 'basic', position: { x: 2, y: 0, z: -5 }, patrol: false },
      { type: 'basic', position: { x: -3, y: 0, z: -8 }, patrol: false },
      
      // Plaza
      { type: 'basic', position: { x: 10, y: 0, z: -30 }, patrol: true },
      { type: 'basic', position: { x: 15, y: 0, z: -35 }, patrol: true },
      { type: 'scout', position: { x: 5, y: 0, z: -40 }, patrol: true },
      { type: 'heavy', position: { x: 20, y: 0, z: -40 }, patrol: false },
      
      // Sniper nest
      { type: 'basic', position: { x: 28, y: 5, z: -58 }, patrol: false },
      { type: 'basic', position: { x: 32, y: 5, z: -60 }, patrol: false },
      { type: 'scout', position: { x: 30, y: 5, z: -62 }, patrol: false },
      
      // Approach to extraction
      { type: 'basic', position: { x: 40, y: 0, z: -65 }, patrol: true },
      { type: 'basic', position: { x: 45, y: 0, z: -70 }, patrol: true },
      { type: 'heavy', position: { x: 48, y: 0, z: -75 }, patrol: false },
    ],
    
    triggeredSpawns: [
      {
        trigger: { position: { x: 20, y: 0, z: -40 }, radius: 10 },
        spawns: [
          { type: 'scout', position: { x: 0, y: 0, z: -45 } },
          { type: 'scout', position: { x: 25, y: 0, z: -50 } },
        ],
      },
      {
        trigger: { position: { x: 50, y: 0, z: -80 }, radius: 15 },
        continuous: true,
        interval: 5,
        maxSpawns: 10,
        spawns: [
          { type: 'basic', direction: 'random' },
        ],
      },
    ],
    
    checkpoints: [
      { id: 'cp_03_1', position: { x: 0, y: 0, z: -10 }, afterObjective: 'obj_03_1' },
      { id: 'cp_03_2', position: { x: 20, y: 0, z: -40 }, afterObjective: 'obj_03_2' },
      { id: 'cp_03_3', position: { x: 30, y: 0, z: -60 }, afterObjective: 'obj_03_3' },
    ],
    
    rewards: {
      completion: { score: 15000, xp: 3000 },
      noDeaths: { score: 5000, xp: 1000 },
      speedBonus: { time: 600, score: 3000 }, // Under 10 minutes
    },
    
    environment: {
      timeOfDay: 'day',
      weather: 'rain',
      ambientSound: 'urban_combat',
    },
  },
};

/**
 * Mission order for campaign
 */
const CAMPAIGN_ORDER = ['mission_01', 'mission_02', 'mission_03'];

/**
 * Get mission by ID
 * @param {string} id - Mission ID
 * @returns {Object|null}
 */
function getMission(id) {
  return MISSIONS[id] || null;
}

/**
 * Get all missions
 * @returns {Object}
 */
function getAllMissions() {
  return { ...MISSIONS };
}

/**
 * Get campaign missions in order
 * @returns {Array}
 */
function getCampaignMissions() {
  return CAMPAIGN_ORDER.map(id => MISSIONS[id]);
}

/**
 * Get next mission in campaign
 * @param {string} currentMissionId - Current mission ID
 * @returns {Object|null}
 */
function getNextMission(currentMissionId) {
  const index = CAMPAIGN_ORDER.indexOf(currentMissionId);
  if (index === -1 || index >= CAMPAIGN_ORDER.length - 1) {
    return null;
  }
  return MISSIONS[CAMPAIGN_ORDER[index + 1]];
}

/**
 * Check if player has completed all missions
 * @param {Array} completedMissions - Array of completed mission IDs
 * @returns {boolean}
 */
function isCampaignComplete(completedMissions) {
  return CAMPAIGN_ORDER.every(id => completedMissions.includes(id));
}

export {
  MISSIONS,
  CAMPAIGN_ORDER,
  OBJECTIVE_TYPE,
  OBJECTIVE_STATUS,
  getMission,
  getAllMissions,
  getCampaignMissions,
  getNextMission,
  isCampaignComplete,
};
