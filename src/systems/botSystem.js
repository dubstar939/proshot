/**
 * Bot System with Character Skins
 * Manages CPU bots for Counter-Terrorist and Terrorist teams
 * Supports custom skins, equipment, and team-based AI behaviors
 */

import * as THREE from 'three';
import { EnemyAI, EnemyManager, ENEMY_CONFIG } from './enemyAI.js';
import { Team } from './levelDesign.js';

/**
 * Bot difficulty levels
 * @enum {string}
 */
const Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
    EXPERT: 'expert'
};

/**
 * Character skin configuration
 * @typedef {Object} SkinConfig
 * @property {number} primaryColor - Main uniform color (hex)
 * @property {number} secondaryColor - Secondary/accent color (hex)
 * @property {number} headColor - Head/helmet color (hex)
 * @property {string} modelType - Model type identifier
 * @property {Array<string>} accessories - Accessory identifiers
 */

/**
 * Bot equipment loadout
 * @typedef {Object} Loadout
 * @property {string} primaryWeapon - Primary weapon ID
 * @property {string} secondaryWeapon - Secondary weapon ID
 * @property {string} melee - Melee weapon ID
 * @property {string} grenade1 - First grenade type
 * @property {string} grenade2 - Second grenade type
 * @property {boolean} hasHelmet - Has helmet/vest
 * @property {boolean} hasDefuseKit - Has defuse kit (CT only)
 */

// Pre-defined CT skins
const CT_SKINS = {
    SAS: {
        primaryColor: 0x1a3d5c,      // Dark blue
        secondaryColor: 0x2d5a7d,     // Medium blue
        headColor: 0x1a1a1a,          // Black helmet
        modelType: 'military',
        accessories: ['helmet', 'vest', 'gloves']
    },
    GIGN: {
        primaryColor: 0x2c3e50,       // Navy
        secondaryColor: 0x34495e,     // Slate
        headColor: 0x1a1a1a,          // Black balaclava
        modelType: 'tactical',
        accessories: ['balaclava', 'vest', 'goggles']
    },
    NAVY_SEALS: {
        primaryColor: 0x0d1117,       // Very dark
        secondaryColor: 0x238636,     // Green accent
        headColor: 0x1a1a1a,          // Black helmet
        modelType: 'military',
        accessories: ['helmet', 'nightvision', 'vest']
    },
    SPETSNAS: {
        primaryColor: 0x2d4a22,       // Olive green
        secondaryColor: 0x3d5a2f,     // Lighter green
        headColor: 0x1a1a1a,          // Black helmet
        modelType: 'military',
        accessories: ['helmet', 'vest', 'patches']
    },
    DEFAULT_CT: {
        primaryColor: 0x3498db,       // Blue
        secondaryColor: 0x2980b9,     // Darker blue
        headColor: 0x2c3e50,          // Navy cap
        modelType: 'standard',
        accessories: ['cap', 'vest']
    }
};

// Pre-defined Terrorist skins
const T_SKINS = {
    PHOENIX_CONNNECTION: {
        primaryColor: 0xc0392b,       // Red
        secondaryColor: 0xe74c3c,     // Bright red
        headColor: 0x1a1a1a,          // Black mask
        modelType: 'casual',
        accessories: ['mask', 'jacket']
    },
    LEET_KREW: {
        primaryColor: 0x27ae60,       // Green
        secondaryColor: 0x2ecc71,     // Bright green
        headColor: 0x1a1a1a,          // Black bandana
        modelType: 'casual',
        accessories: ['bandana', 'hoodie']
    },
    ARCTIC_AVENGERS: {
        primaryColor: 0x5dade2,       // Light blue
        secondaryColor: 0x85c1e9,     // Very light blue
        headColor: 0xffffff,          // White fur hood
        modelType: 'winter',
        accessories: ['furhood', 'gloves', 'goggles']
    },
    SEPARATIST: {
        primaryColor: 0x8e44ad,       // Purple
        secondaryColor: 0x9b59b6,     // Light purple
        headColor: 0x1a1a1a,          // Black balaclava
        modelType: 'casual',
        accessories: ['balaclava', 'vest']
    },
    DEFAULT_T: {
        primaryColor: 0xd35400,       // Orange-brown
        secondaryColor: 0xe67e22,     // Orange
        headColor: 0x1a1a1a,          // Black mask
        modelType: 'casual',
        accessories: ['mask']
    }
};

// Default loadouts by team
const CT_LOADOUTS = {
    RIFLER: {
        primaryWeapon: 'm4a1',
        secondaryWeapon: 'usp',
        melee: 'knife',
        grenade1: 'flashbang',
        grenade2: 'smoke',
        hasHelmet: true,
        hasDefuseKit: true
    },
    AWP: {
        primaryWeapon: 'awp',
        secondaryWeapon: 'deagle',
        melee: 'knife',
        grenade1: 'flashbang',
        grenade2: 'flashbang',
        hasHelmet: true,
        hasDefuseKit: false
    },
    ENTRY_FRAGGER: {
        primaryWeapon: 'ak47',
        secondaryWeapon: 'glock',
        melee: 'knife',
        grenade1: 'he_grenade',
        grenade2: 'flashbang',
        hasHelmet: true,
        hasDefuseKit: false
    }
};

const T_LOADOUTS = {
    RIFLER: {
        primaryWeapon: 'ak47',
        secondaryWeapon: 'deagle',
        melee: 'knife',
        grenade1: 'he_grenade',
        grenade2: 'flashbang',
        hasHelmet: true,
        hasDefuseKit: false
    },
    AWP: {
        primaryWeapon: 'awp',
        secondaryWeapon: 'usp',
        melee: 'knife',
        grenade1: 'flashbang',
        grenade2: 'smoke',
        hasHelmet: true,
        hasDefuseKit: false
    },
    BOMBER: {
        primaryWeapon: 'mp9',
        secondaryWeapon: 'p250',
        melee: 'knife',
        grenade1: 'flashbang',
        grenade2: 'smoke',
        hasHelmet: false,
        hasDefuseKit: false
    }
};

// Difficulty modifiers
const DIFFICULTY_MODIFIERS = {
    [Difficulty.EASY]: {
        accuracy: 0.3,
        reactionTime: 0.8,
        damageMultiplier: 0.7,
        health: 80,
        awarenessRange: 20
    },
    [Difficulty.MEDIUM]: {
        accuracy: 0.5,
        reactionTime: 0.5,
        damageMultiplier: 0.9,
        health: 100,
        awarenessRange: 30
    },
    [Difficulty.HARD]: {
        accuracy: 0.7,
        reactionTime: 0.3,
        damageMultiplier: 1.0,
        health: 100,
        awarenessRange: 40
    },
    [Difficulty.EXPERT]: {
        accuracy: 0.85,
        reactionTime: 0.15,
        damageMultiplier: 1.2,
        health: 120,
        awarenessRange: 50
    }
};

class BotCharacter {
    /**
     * Creates a bot character instance
     * @param {THREE.Scene} scene - Game scene
     * @param {Team} team - Bot's team
     * @param {string} skinName - Skin identifier
     * @param {string} loadoutName - Loadout identifier
     * @param {Difficulty} difficulty - Difficulty level
     */
    constructor(scene, team, skinName, loadoutName, difficulty = Difficulty.MEDIUM) {
        this.scene = scene;
        this.team = team;
        this.skinName = skinName;
        this.loadoutName = loadoutName;
        this.difficulty = difficulty;
        
        // Get skin and loadout configs
        const skinCatalog = team === Team.COUNTER_TERRORIST ? CT_SKINS : T_SKINS;
        const loadoutCatalog = team === Team.COUNTER_TERRORIST ? CT_LOADOUTS : T_LOADOUTS;
        
        this.skinConfig = skinCatalog[skinName] || skinCatalog[`DEFAULT_${team.toUpperCase()}`];
        this.loadout = loadoutCatalog[loadoutName] || loadoutCatalog.RIFLER;
        this.difficultyMods = DIFFICULTY_MODIFIERS[difficulty];
        
        // Bot state
        this.mesh = null;
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.isAlive = true;
        this.health = this.difficultyMods.health;
        this.maxHealth = this.difficultyMods.health;
        
        // AI reference
        this.aiController = null;
        
        // Visual components
        this.bodyMesh = null;
        this.headMesh = null;
        this.weaponMesh = null;
        this.accessories = [];
    }
    
    /**
     * Create the bot's 3D mesh with skin
     * @param {THREE.Vector3} position - Starting position
     * @returns {THREE.Group} Bot mesh group
     */
    createMesh(position) {
        const group = new THREE.Group();
        group.position.copy(position);
        this.position = position.clone();
        
        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.35, 1.2, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.skinConfig.primaryColor,
            roughness: 0.7,
            metalness: 0.2
        });
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.position.y = 0.9;
        this.bodyMesh.castShadow = true;
        group.add(this.bodyMesh);
        
        // Vest/secondary color
        const vestGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.3);
        const vestMaterial = new THREE.MeshStandardMaterial({
            color: this.skinConfig.secondaryColor,
            roughness: 0.6,
            metalness: 0.3
        });
        const vest = new THREE.Mesh(vestGeometry, vestMaterial);
        vest.position.set(0, 1.0, 0);
        vest.castShadow = true;
        group.add(vest);
        this.accessories.push(vest);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: this.skinConfig.headColor,
            roughness: 0.5,
            metalness: 0.1
        });
        this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
        this.headMesh.position.y = 1.7;
        this.headMesh.castShadow = true;
        group.add(this.headMesh);
        
        // Add accessories based on skin
        this._addAccessories(group);
        
        // Weapon placeholder
        this._addWeapon(group);
        
        // Team indicator (colored glow)
        this._addTeamIndicator(group);
        
        // User data for identification
        group.userData = {
            isBot: true,
            team: this.team,
            botCharacter: this,
            skinName: this.skinName,
            loadoutName: this.loadoutName,
            difficulty: this.difficulty
        };
        
        this.mesh = group;
        this.scene.add(group);
        
        return group;
    }
    
    /**
     * Add accessories based on skin config
     * @private
     */
    _addAccessories(group) {
        const accessories = this.skinConfig.accessories || [];
        
        if (accessories.includes('helmet')) {
            const helmetGeo = new THREE.SphereGeometry(0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const helmetMat = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.4,
                metalness: 0.5
            });
            const helmet = new THREE.Mesh(helmetGeo, helmetMat);
            helmet.position.y = 1.72;
            helmet.castShadow = true;
            group.add(helmet);
            this.accessories.push(helmet);
        }
        
        if (accessories.includes('goggles')) {
            const goggleGeo = new THREE.BoxGeometry(0.3, 0.08, 0.15);
            const goggleMat = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0x001133,
                emissiveIntensity: 0.3
            });
            const goggles = new THREE.Mesh(goggleGeo, goggleMat);
            goggles.position.set(0, 1.68, 0.2);
            group.add(goggles);
            this.accessories.push(goggles);
        }
        
        if (accessories.includes('nightvision')) {
            const nvGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8);
            const nvMat = new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.5,
                metalness: 0.6
            });
            const nv = new THREE.Mesh(nvGeo, nvMat);
            nv.rotation.x = Math.PI / 2;
            nv.position.set(0.15, 1.75, 0.2);
            group.add(nv);
            this.accessories.push(nv);
        }
    }
    
    /**
     * Add weapon to bot
     * @private
     */
    _addWeapon(group) {
        // Simple weapon representation
        const weaponLength = this.loadout.primaryWeapon === 'awp' ? 1.2 : 0.6;
        const weaponGeo = new THREE.CylinderGeometry(0.03, 0.04, weaponLength, 8);
        const weaponMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.7
        });
        this.weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
        this.weaponMesh.rotation.x = Math.PI / 2;
        this.weaponMesh.position.set(0.3, 1.1, 0.2);
        group.add(this.weaponMesh);
    }
    
    /**
     * Add team indicator
     * @private
     */
    _addTeamIndicator(group) {
        const color = this.team === Team.COUNTER_TERRORIST ? 0x0066ff : 0xff6600;
        const indicatorGeo = new THREE.RingGeometry(0.4, 0.45, 16);
        const indicatorMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = 2.3;
        group.add(indicator);
        
        // Add point light for team color
        const light = new THREE.PointLight(color, 0.5, 3);
        light.position.y = 2;
        group.add(light);
    }
    
    /**
     * Update bot appearance
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        if (!this.isAlive || !this.mesh) return;
        
        // Breathing animation
        if (this.bodyMesh) {
            this.bodyMesh.scale.y = 1 + Math.sin(Date.now() * 0.003) * 0.02;
        }
        
        // Weapon sway
        if (this.weaponMesh) {
            this.weaponMesh.position.y = 1.1 + Math.sin(Date.now() * 0.005) * 0.01;
        }
    }
    
    /**
     * Set bot position
     * @param {THREE.Vector3} position - New position
     */
    setPosition(position) {
        if (this.mesh) {
            this.mesh.position.copy(position);
            this.position = position.clone();
        }
    }
    
    /**
     * Set bot rotation
     * @param {number} yaw - Yaw angle in radians
     */
    setRotation(yaw) {
        if (this.mesh) {
            this.mesh.rotation.y = yaw;
        }
    }
    
    /**
     * Take damage
     * @param {number} damage - Damage amount
     * @returns {boolean} Whether bot died
     */
    takeDamage(damage) {
        if (!this.isAlive) return false;
        
        const actualDamage = damage * this.difficultyMods.damageMultiplier;
        this.health -= actualDamage;
        
        // Flash white on hit
        if (this.bodyMesh) {
            const originalColor = this.bodyMesh.material.color.getHex();
            this.bodyMesh.material.color.setHex(0xffffff);
            setTimeout(() => {
                if (this.bodyMesh && this.isAlive) {
                    this.bodyMesh.material.color.setHex(originalColor);
                }
            }, 100);
        }
        
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        return false;
    }
    
    /**
     * Kill the bot
     */
    die() {
        this.isAlive = false;
        
        if (this.mesh) {
            // Fall over
            this.mesh.rotation.z = Math.PI / 2;
            this.mesh.rotation.x = -Math.PI / 4;
            this.mesh.position.y = 0.4;
            
            // Dim team indicator
            const indicators = this.mesh.children.filter(c => c.geometry?.type === 'RingGeometry');
            indicators.forEach(ind => {
                ind.material.opacity = 0.2;
            });
        }
        
        // Dispatch death event
        window.dispatchEvent(new CustomEvent('proshot:bot_death', {
            detail: {
                bot: this,
                team: this.team,
                skinName: this.skinName
            }
        }));
    }
    
    /**
     * Remove bot from scene
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            
            // Dispose geometries and materials
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            this.mesh = null;
        }
    }
}

class BotManager extends EnemyManager {
    /**
     * Creates a BotManager instance
     * @param {THREE.Scene} scene - Game scene
     * @param {THREE.Object3D} player - Player object
     * @param {LevelDesignSystem} levelSystem - Level design system
     */
    constructor(scene, player, levelSystem = null) {
        super(scene, player);
        this.levelSystem = levelSystem;
        
        /** @type {Map<string, BotCharacter>} */
        this.botCharacters = new Map();
        
        /** @type {Array<BotCharacter>} */
        this.ctBots = [];
        
        /** @type {Array<BotCharacter>} */
        this.tBots = [];
        
        /** @type {number} */
        this.maxBotsPerTeam = 5;
        
        /** @type {string} */
        this.defaultDifficulty = Difficulty.MEDIUM;
    }
    
    /**
     * Spawn a CT bot
     * @param {string} skinName - Skin identifier
     * @param {string} loadoutName - Loadout identifier
     * @param {THREE.Vector3} position - Spawn position
     * @param {Difficulty} difficulty - Difficulty level
     * @returns {BotCharacter} Created bot
     */
    spawnCTBot(skinName = 'DEFAULT_CT', loadoutName = 'RIFLER', position = null, difficulty = this.defaultDifficulty) {
        if (this.ctBots.length >= this.maxBotsPerTeam) {
            console.warn('[BotManager] Max CT bots reached');
            return null;
        }
        
        const spawnPos = position || (this.levelSystem ? 
            this.levelSystem.getSpawnPoint(Team.COUNTER_TERRORIST) : 
            new THREE.Vector3(-50, 0, -50));
        
        const bot = new BotCharacter(this.scene, Team.COUNTER_TERRORIST, skinName, loadoutName, difficulty);
        bot.createMesh(spawnPos);
        
        this.ctBots.push(bot);
        this.botCharacters.set(bot.mesh.uuid, bot);
        
        // Create AI controller for this bot
        this._createBotAI(bot);
        
        console.log(`[BotManager] Spawned CT bot: ${skinName} (${loadoutName})`);
        
        return bot;
    }
    
    /**
     * Spawn a Terrorist bot
     * @param {string} skinName - Skin identifier
     * @param {string} loadoutName - Loadout identifier
     * @param {THREE.Vector3} position - Spawn position
     * @param {Difficulty} difficulty - Difficulty level
     * @returns {BotCharacter} Created bot
     */
    spawnTBot(skinName = 'DEFAULT_T', loadoutName = 'RIFLER', position = null, difficulty = this.defaultDifficulty) {
        if (this.tBots.length >= this.maxBotsPerTeam) {
            console.warn('[BotManager] Max T bots reached');
            return null;
        }
        
        const spawnPos = position || (this.levelSystem ? 
            this.levelSystem.getSpawnPoint(Team.TERRORIST) : 
            new THREE.Vector3(50, 0, 50));
        
        const bot = new BotCharacter(this.scene, Team.TERRORIST, skinName, loadoutName, difficulty);
        bot.createMesh(spawnPos);
        
        this.tBots.push(bot);
        this.botCharacters.set(bot.mesh.uuid, bot);
        
        // Create AI controller for this bot
        this._createBotAI(bot);
        
        console.log(`[BotManager] Spawned T bot: ${skinName} (${loadoutName})`);
        
        return bot;
    }
    
    /**
     * Create AI controller for a bot
     * @private
     */
    _createBotAI(bot) {
        // Get patrol routes from level system
        let patrolPoints = [];
        if (this.levelSystem) {
            const routes = this.levelSystem.getPatrolRoutes(bot.team);
            if (routes.length > 0) {
                const route = routes[Math.floor(Math.random() * routes.length)];
                patrolPoints = route.waypoints.map(wp => wp.clone());
            }
        }
        
        // Create basic enemy AI (can be extended with team-specific behaviors)
        const ai = new EnemyAI(this.scene, this.player, bot.position.clone(), patrolPoints);
        
        // Replace the default mesh with our bot mesh
        if (ai.mesh) {
            this.scene.remove(ai.mesh);
        }
        ai.mesh = bot.mesh;
        ai.position = bot.position;
        
        // Apply difficulty modifiers
        const mods = DIFFICULTY_MODIFIERS[bot.difficulty];
        ai.health = mods.health;
        ai.maxHealth = mods.health;
        
        // Override takeDamage to use bot's method
        const originalTakeDamage = ai.takeDamage.bind(ai);
        ai.takeDamage = (damage, point, normal) => {
            const died = bot.takeDamage(damage);
            if (died) {
                ai.die();
            }
            return died;
        };
        
        bot.aiController = ai;
        this.enemies.push(ai);
        this.activeEnemies.push(ai);
        this.totalEnemiesSpawned++;
    }
    
    /**
     * Spawn multiple bots for a match
     * @param {number} ctCount - Number of CT bots
     * @param {number} tCount - Number of T bots
     * @param {Array<string>} ctSkins - CT skin pool
     * @param {Array<string>} tSkins - T skin pool
     */
    spawnTeams(ctCount = 5, tCount = 5, ctSkins = null, tSkins = null) {
        const ctSkinPool = ctSkins || Object.keys(CT_SKINS);
        const tSkinPool = tSkins || Object.keys(T_SKINS);
        
        const loadouts = ['RIFLER', 'AWP', 'ENTRY_FRAGGER'];
        const tLoadouts = ['RIFLER', 'AWP', 'BOMBER'];
        
        // Spawn CT bots
        for (let i = 0; i < ctCount; i++) {
            const skin = ctSkinPool[Math.floor(Math.random() * ctSkinPool.length)];
            const loadout = loadouts[Math.floor(Math.random() * loadouts.length)];
            this.spawnCTBot(skin, loadout);
        }
        
        // Spawn T bots
        for (let i = 0; i < tCount; i++) {
            const skin = tSkinPool[Math.floor(Math.random() * tSkinPool.length)];
            const loadout = tLoadouts[Math.floor(Math.random() * tLoadouts.length)];
            this.spawnTBot(skin, loadout);
        }
        
        console.log(`[BotManager] Spawned teams: ${ctCount} CT, ${tCount} T`);
    }
    
    /**
     * Update all bots
     * @param {number} deltaTime - Delta time
     * @param {*} worldOctree - Physics octree
     */
    update(deltaTime, worldOctree) {
        // Update bot visuals
        for (const bot of [...this.ctBots, ...this.tBots]) {
            if (bot.isAlive) {
                bot.update(deltaTime);
            }
        }
        
        // Update AI
        super.update(deltaTime, worldOctree);
    }
    
    /**
     * Get all alive bots for a team
     * @param {Team} team - Team identifier
     * @returns {Array<BotCharacter>} Alive bots
     */
    getAliveBots(team) {
        const bots = team === Team.COUNTER_TERRORIST ? this.ctBots : this.tBots;
        return bots.filter(bot => bot.isAlive);
    }
    
    /**
     * Get total alive bot count
     * @returns {number} Alive count
     */
    getAliveCount() {
        return this.ctBots.filter(b => b.isAlive).length + 
               this.tBots.filter(b => b.isAlive).length;
    }
    
    /**
     * Respawn a bot after death
     * @param {BotCharacter} bot - Bot to respawn
     * @param {THREE.Vector3} position - Respawn position
     */
    respawnBot(bot, position = null) {
        if (!bot) return;
        
        // Remove old bot
        bot.dispose();
        this.ctBots = this.ctBots.filter(b => b !== bot);
        this.tBots = this.tBots.filter(b => b !== bot);
        this.botCharacters.delete(bot.mesh?.uuid);
        
        // Spawn new bot
        if (bot.team === Team.COUNTER_TERRORIST) {
            this.spawnCTBot(bot.skinName, bot.loadoutName, position, bot.difficulty);
        } else {
            this.spawnTBot(bot.skinName, bot.loadoutName, position, bot.difficulty);
        }
    }
    
    /**
     * Clear all bots
     */
    clearAll() {
        for (const bot of [...this.ctBots, ...this.tBots]) {
            bot.dispose();
        }
        this.ctBots = [];
        this.tBots = [];
        this.botCharacters.clear();
        super.clearAll();
    }
    
    /**
     * Set max bots per team
     * @param {number} max - Maximum number
     */
    setMaxBots(max) {
        this.maxBotsPerTeam = max;
    }
    
    /**
     * Get available skins for a team
     * @param {Team} team - Team identifier
     * @returns {Object} Skin catalog
     */
    static getAvailableSkins(team) {
        return team === Team.COUNTER_TERRORIST ? CT_SKINS : T_SKINS;
    }
    
    /**
     * Get available loadouts for a team
     * @param {Team} team - Team identifier
     * @returns {Object} Loadout catalog
     */
    static getAvailableLoadouts(team) {
        return team === Team.COUNTER_TERRORIST ? CT_LOADOUTS : T_LOADOUTS;
    }
}

// Export constants and classes
export { 
    BotManager, 
    BotCharacter, 
    Difficulty, 
    CT_SKINS, 
    T_SKINS, 
    CT_LOADOUTS, 
    T_LOADOUTS,
    DIFFICULTY_MODIFIERS
};
