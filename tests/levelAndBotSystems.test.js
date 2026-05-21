/**
 * Tests for Level Design and Bot Systems
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { LevelDesignSystem, GameMode, Team } from '../src/systems/levelDesign.js';
import { 
    BotManager, 
    Difficulty, 
    CT_SKINS, 
    T_SKINS, 
    CT_LOADOUTS, 
    T_LOADOUTS,
    DIFFICULTY_MODIFIERS 
} from '../src/systems/botSystem.js';

// Mock Three.js scene
const createMockScene = () => {
    const scene = new THREE.Scene();
    return scene;
};

describe('LevelDesignSystem', () => {
    let scene;
    let levelSystem;
    
    beforeEach(() => {
        scene = createMockScene();
        levelSystem = new LevelDesignSystem(scene);
    });
    
    it('should create instance', () => {
        expect(levelSystem).toBeDefined();
        expect(levelSystem.levels).toBeInstanceOf(Map);
    });
    
    it('should register a level configuration', () => {
        const testLevel = {
            id: 'test_level',
            name: 'Test Level',
            gameMode: 'team_deathmatch',
            ctSpawn: new THREE.Vector3(0, 0, 0),
            tSpawn: new THREE.Vector3(10, 0, 10)
        };
        
        levelSystem.registerLevel(testLevel);
        
        expect(levelSystem.levels.has('test_level')).toBe(true);
        expect(levelSystem.getAllLevels().length).toBe(1);
    });
    
    it('should create sample map', () => {
        const sampleMap = levelSystem.createSampleMap();
        
        expect(sampleMap).toBeDefined();
        expect(sampleMap.id).toBe('dust2_sample');
        expect(sampleMap.gameMode).toBe('bomb_defuse');
        expect(sampleMap.ctSpawnPoints).toHaveLength(3);
        expect(sampleMap.tSpawnPoints).toHaveLength(3);
        expect(sampleMap.bombSites).toHaveLength(2);
        expect(sampleMap.patrolRoutes).toHaveLength(2);
    });
    
    it('should get spawn points for teams', async () => {
        const sampleMap = levelSystem.createSampleMap();
        levelSystem.registerLevel(sampleMap);
        await levelSystem.loadLevel('dust2_sample');
        
        const ctSpawn = levelSystem.getSpawnPoint(Team.COUNTER_TERRORIST, false);
        const tSpawn = levelSystem.getSpawnPoint(Team.TERRORIST, false);
        
        expect(ctSpawn).toBeInstanceOf(THREE.Vector3);
        expect(tSpawn).toBeInstanceOf(THREE.Vector3);
        expect(ctSpawn.x).toBe(-50);
        expect(tSpawn.x).toBe(50);
    });
    
    it('should get patrol routes for team', async () => {
        const sampleMap = levelSystem.createSampleMap();
        levelSystem.registerLevel(sampleMap);
        await levelSystem.loadLevel('dust2_sample');
        
        const ctRoutes = levelSystem.getPatrolRoutes(Team.COUNTER_TERRORIST);
        const tRoutes = levelSystem.getPatrolRoutes(Team.TERRORIST);
        
        expect(ctRoutes).toHaveLength(1);
        expect(tRoutes).toHaveLength(1);
        expect(ctRoutes[0].waypoints).toHaveLength(3);
    });
    
    it('should create walls and crates', () => {
        const wall = levelSystem.createWall('test_wall', 10, 4, 0.5, new THREE.Vector3(0, 2, 0));
        const crate = levelSystem.createCrate('test_crate', 2, new THREE.Vector3(5, 1, 5), 'wood');
        
        expect(wall).toBeDefined();
        expect(crate).toBeDefined();
        expect(wall.geometry).toBeDefined();
        expect(crate.geometry).toBeDefined();
    });
});

describe('BotManager', () => {
    let scene;
    let botManager;
    let mockPlayer;
    let levelSystem;
    
    beforeEach(() => {
        scene = createMockScene();
        mockPlayer = { position: new THREE.Vector3(0, 1.6, 0) };
        levelSystem = new LevelDesignSystem(scene);
        botManager = new BotManager(scene, mockPlayer, levelSystem);
    });
    
    it('should create instance', () => {
        expect(botManager).toBeDefined();
        expect(botManager.ctBots).toEqual([]);
        expect(botManager.tBots).toEqual([]);
    });
    
    it('should spawn CT bot', () => {
        const bot = botManager.spawnCTBot('SAS', 'RIFLER');
        
        expect(bot).toBeDefined();
        expect(bot.team).toBe('ct');
        expect(bot.skinName).toBe('SAS');
        expect(bot.loadoutName).toBe('RIFLER');
        expect(bot.isAlive).toBe(true);
        expect(bot.mesh).toBeDefined();
    });
    
    it('should spawn T bot', () => {
        const bot = botManager.spawnTBot('PHOENIX_CONNNECTION', 'BOMBER');
        
        expect(bot).toBeDefined();
        expect(bot.team).toBe('t');
        expect(bot.skinName).toBe('PHOENIX_CONNNECTION');
        expect(bot.loadoutName).toBe('BOMBER');
        expect(bot.isAlive).toBe(true);
    });
    
    it('should spawn teams', () => {
        botManager.spawnTeams(3, 3);
        
        expect(botManager.ctBots.length).toBeLessThanOrEqual(3);
        expect(botManager.tBots.length).toBeLessThanOrEqual(3);
        expect(botManager.getAliveCount()).toBeGreaterThan(0);
    });
    
    it('should respect max bots per team', () => {
        botManager.setMaxBots(2);
        
        botManager.spawnCTBot();
        botManager.spawnCTBot();
        botManager.spawnCTBot(); // Should not spawn
        
        expect(botManager.ctBots.length).toBe(2);
    });
    
    it('should get alive bots by team', () => {
        botManager.spawnCTBot('SAS', 'RIFLER');
        botManager.spawnCTBot('GIGN', 'AWP');
        botManager.spawnTBot('LEET_KREW', 'RIFLER');
        
        const aliveCTs = botManager.getAliveBots(Team.COUNTER_TERRORIST);
        const aliveTs = botManager.getAliveBots(Team.TERRORIST);
        
        expect(aliveCTs).toHaveLength(2);
        expect(aliveTs).toHaveLength(1);
    });
    
    it('should handle bot damage and death', () => {
        const bot = botManager.spawnCTBot('SAS', 'RIFLER');
        
        expect(bot.health).toBeGreaterThan(0);
        expect(bot.isAlive).toBe(true);
        
        // Deal lethal damage
        bot.takeDamage(1000);
        
        expect(bot.isAlive).toBe(false);
        expect(bot.health).toBeLessThanOrEqual(0);
    });
    
    it('should clear all bots', () => {
        botManager.spawnTeams(2, 2);
        expect(botManager.getAliveCount()).toBeGreaterThan(0);
        
        botManager.clearAll();
        
        expect(botManager.ctBots).toHaveLength(0);
        expect(botManager.tBots).toHaveLength(0);
        expect(botManager.getAliveCount()).toBe(0);
    });
    
    it('should get available skins', () => {
        const ctSkins = BotManager.getAvailableSkins(Team.COUNTER_TERRORIST);
        const tSkins = BotManager.getAvailableSkins(Team.TERRORIST);
        
        expect(ctSkins).toEqual(CT_SKINS);
        expect(tSkins).toEqual(T_SKINS);
        expect(Object.keys(ctSkins).length).toBeGreaterThan(0);
        expect(Object.keys(tSkins).length).toBeGreaterThan(0);
    });
    
    it('should get available loadouts', () => {
        const ctLoadouts = BotManager.getAvailableLoadouts(Team.COUNTER_TERRORIST);
        const tLoadouts = BotManager.getAvailableLoadouts(Team.TERRORIST);
        
        expect(ctLoadouts).toEqual(CT_LOADOUTS);
        expect(tLoadouts).toEqual(T_LOADOUTS);
    });
});

describe('Difficulty Modifiers', () => {
    it('should have all difficulty levels', () => {
        expect(DIFFICULTY_MODIFIERS[Difficulty.EASY]).toBeDefined();
        expect(DIFFICULTY_MODIFIERS[Difficulty.MEDIUM]).toBeDefined();
        expect(DIFFICULTY_MODIFIERS[Difficulty.HARD]).toBeDefined();
        expect(DIFFICULTY_MODIFIERS[Difficulty.EXPERT]).toBeDefined();
    });
    
    it('should scale difficulty appropriately', () => {
        const easy = DIFFICULTY_MODIFIERS[Difficulty.EASY];
        const expert = DIFFICULTY_MODIFIERS[Difficulty.EXPERT];
        
        expect(expert.accuracy).toBeGreaterThan(easy.accuracy);
        expect(expert.damageMultiplier).toBeGreaterThan(easy.damageMultiplier);
        expect(expert.health).toBeGreaterThanOrEqual(easy.health);
        expect(expert.awarenessRange).toBeGreaterThan(easy.awarenessRange);
    });
});

describe('Skin Configurations', () => {
    it('should have CT skins defined', () => {
        expect(CT_SKINS.SAS).toBeDefined();
        expect(CT_SKINS.GIGN).toBeDefined();
        expect(CT_SKINS.DEFAULT_CT).toBeDefined();
    });
    
    it('should have T skins defined', () => {
        expect(T_SKINS.PHOENIX_CONNNECTION).toBeDefined();
        expect(T_SKINS.LEET_KREW).toBeDefined();
        expect(T_SKINS.DEFAULT_T).toBeDefined();
    });
    
    it('should have valid skin properties', () => {
        const sas = CT_SKINS.SAS;
        
        expect(sas.primaryColor).toBeDefined();
        expect(sas.secondaryColor).toBeDefined();
        expect(sas.headColor).toBeDefined();
        expect(sas.modelType).toBeDefined();
        expect(sas.accessories).toBeInstanceOf(Array);
    });
});

describe('Loadout Configurations', () => {
    it('should have CT loadouts defined', () => {
        expect(CT_LOADOUTS.RIFLER).toBeDefined();
        expect(CT_LOADOUTS.AWP).toBeDefined();
        expect(CT_LOADOUTS.ENTRY_FRAGGER).toBeDefined();
    });
    
    it('should have T loadouts defined', () => {
        expect(T_LOADOUTS.RIFLER).toBeDefined();
        expect(T_LOADOUTS.AWP).toBeDefined();
        expect(T_LOADOUTS.BOMBER).toBeDefined();
    });
    
    it('should have valid loadout properties', () => {
        const rifler = CT_LOADOUTS.RIFLER;
        
        expect(rifler.primaryWeapon).toBeDefined();
        expect(rifler.secondaryWeapon).toBeDefined();
        expect(rifler.melee).toBeDefined();
        expect(rifler.grenade1).toBeDefined();
        expect(rifler.hasHelmet).toBeDefined();
    });
    
    it('should have defuse kit only for CT', () => {
        expect(CT_LOADOUTS.RIFLER.hasDefuseKit).toBe(true);
        expect(T_LOADOUTS.RIFLER.hasDefuseKit).toBe(false);
    });
});
