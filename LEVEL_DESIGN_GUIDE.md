# Level Design & Bot System Guide

## Overview

This guide covers the **Level Design System** and **Bot System with Character Skins** for creating Counter-Strike style gameplay with CPU bots on both Counter-Terrorist (CT) and Terrorist (T) teams.

---

## 📍 Level Design System

### Key Features

- **Multi-mode support**: Team Deathmatch, Bomb Defuse, Hostage Rescue, Free-for-All
- **Configurable spawn points**: Multiple spawn locations per team
- **AI patrol routes**: Define waypoints for bot movement patterns
- **Bomb sites**: Configurable plant/defuse zones
- **Dynamic lighting**: Per-level lighting configuration
- **Environment settings**: Fog, skybox, atmospheric effects
- **Prop system**: Easy placement of walls, crates, and obstacles

### Creating a Custom Level

```javascript
import { LevelDesignSystem, GameMode, Team } from './src/systems/levelDesign.js';

// Initialize the system
const levelSystem = new LevelDesignSystem(scene, worldSystem);

// Create a custom level configuration
const myLevel = {
    id: 'my_custom_map',
    name: 'My Custom Map',
    gameMode: GameMode.BOMB_DEFUSE,
    
    // Spawn points
    ctSpawn: new THREE.Vector3(-50, 0, -50),
    tSpawn: new THREE.Vector3(50, 0, 50),
    
    ctSpawnPoints: [
        new THREE.Vector3(-50, 0, -50),
        new THREE.Vector3(-45, 0, -45),
        new THREE.Vector3(-55, 0, -45)
    ],
    
    tSpawnPoints: [
        new THREE.Vector3(50, 0, 50),
        new THREE.Vector3(45, 0, 45),
        new THREE.Vector3(55, 0, 45)
    ],
    
    // AI patrol routes
    patrolRoutes: [
        {
            id: 'ct_main_patrol',
            waypoints: [
                new THREE.Vector3(-30, 0, -30),
                new THREE.Vector3(0, 0, -20),
                new THREE.Vector3(20, 0, 0)
            ],
            waitTime: 2,
            loop: true,
            team: Team.COUNTER_TERRORIST
        },
        {
            id: 't_b_site_patrol',
            waypoints: [
                new THREE.Vector3(40, 0, -30),
                new THREE.Vector3(35, 0, -40),
                new THREE.Vector3(45, 0, -45)
            ],
            waitTime: 3,
            loop: true,
            team: Team.TERRORIST
        }
    ],
    
    // Bomb sites (for Bomb Defuse mode)
    bombSites: [
        {
            id: 'A',
            position: new THREE.Vector3(-40, 0, 30),
            plantZone: new THREE.Box3(
                new THREE.Vector3(-45, 0, 25),
                new THREE.Vector3(-35, 5, 35)
            ),
            defuseSpots: [
                new THREE.Vector3(-42, 0, 28)
            ]
        },
        {
            id: 'B',
            position: new THREE.Vector3(40, 0, -40),
            plantZone: new THREE.Box3(
                new THREE.Vector3(35, 0, -45),
                new THREE.Vector3(45, 5, -35)
            ),
            defuseSpots: [
                new THREE.Vector3(38, 0, -42)
            ]
        }
    ],
    
    // Lighting configuration
    lighting: {
        ambientIntensity: 0.7,
        directionalIntensity: 1.2,
        ambientColor: 0xffffff,
        directionalColor: 0xfff5e6,
        enableShadows: true,
        sunDirection: new THREE.Vector3(-1, -2, -1)
    },
    
    // Environment configuration
    environment: {
        fogDensity: 0.015,
        fogColor: 0xd4c5a3,
        skyColor: 0x87ceeb,
        enableFog: true
    }
};

// Register the level
levelSystem.registerLevel(myLevel);

// Load the level
await levelSystem.loadLevel('my_custom_map');
```

### Adding Props and Obstacles

```javascript
// Create walls
levelSystem.createWall('wall_1', 10, 4, 0.5, new THREE.Vector3(0, 2, 0), Math.PI / 4);

// Create crates (wood, metal, or concrete)
levelSystem.createCrate('crate_1', 2, new THREE.Vector3(5, 1, 5), 'wood');
levelSystem.createCrate('crate_2', 2, new THREE.Vector3(7, 1, 5), 'metal');

// Add custom props
const geometry = new THREE.CylinderGeometry(1, 1, 4, 16);
const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
levelSystem.addProp(
    'pillar_1',
    geometry,
    material,
    new THREE.Vector3(10, 2, 10),
    new THREE.Euler(0, 0, 0),
    new THREE.Vector3(1, 1, 1),
    true // isCollidable
);
```

### Getting Level Information

```javascript
// Get current level config
const currentLevel = levelSystem.getCurrentLevel();

// Get spawn point for a team
const ctSpawn = levelSystem.getSpawnPoint(Team.COUNTER_TERRORIST, true); // random spawn
const tSpawn = levelSystem.getSpawnPoint(Team.TERRORIST, false); // first spawn

// Get patrol routes
const ctRoutes = levelSystem.getPatrolRoutes(Team.COUNTER_TERRORIST);

// Get bomb sites
const bombSites = levelSystem.getBombSites();

// Get all registered levels
const allLevels = levelSystem.getAllLevels();
```

---

## 🤖 Bot System with Character Skins

### Available CT Skins

| Skin Name | Description | Primary Color | Style |
|-----------|-------------|---------------|-------|
| `SAS` | British Special Air Service | Dark Blue | Military |
| `GIGN` | French GIGN | Navy | Tactical |
| `NAVY_SEALS` | US Navy SEALs | Black/Green | Military |
| `SPETSNAS` | Russian Spetsnas | Olive Green | Military |
| `DEFAULT_CT` | Default CT | Blue | Standard |

### Available T Skins

| Skin Name | Description | Primary Color | Style |
|-----------|-------------|---------------|-------|
| `PHOENIX_CONNNECTION` | Phoenix Connexion | Red | Casual |
| `LEET_KREW` | Leet Krew | Green | Casual |
| `ARCTIC_AVENGERS` | Arctic Avengers | Light Blue | Winter |
| `SEPARATIST` | Separatist | Purple | Casual |
| `DEFAULT_T` | Default T | Orange-Brown | Casual |

### Available Loadouts

#### CT Loadouts
- `RIFLER`: M4A1 + USP + Flash + Smoke + Helmet + Defuse Kit
- `AWP`: AWP + Deagle + 2x Flash + Helmet
- `ENTRY_FRAGGER`: AK47 + Glock + HE + Flash + Helmet

#### T Loadouts
- `RIFLER`: AK47 + Deagle + HE + Flash + Helmet
- `AWP`: AWP + USP + Flash + Smoke + Helmet
- `BOMBER`: MP9 + P250 + Flash + Smoke (No helmet, carries bomb)

### Difficulty Levels

```javascript
import { Difficulty } from './src/systems/botSystem.js';

// Difficulty affects: accuracy, reaction time, damage, health, awareness
Difficulty.EASY    // 80 HP, 70% damage, slow reactions
Difficulty.MEDIUM  // 100 HP, 90% damage, medium reactions
Difficulty.HARD    // 100 HP, 100% damage, fast reactions
Difficulty.EXPERT  // 120 HP, 120% damage, very fast reactions
```

### Spawning Bots

```javascript
import { BotManager, Team, Difficulty } from './src/systems/botSystem.js';

// Initialize bot manager
const botManager = new BotManager(scene, player, levelSystem);

// Spawn a single CT bot with specific skin and loadout
const ctBot1 = botManager.spawnCTBot(
    'SAS',              // Skin
    'RIFLER',           // Loadout
    null,               // Position (null = use level spawn)
    Difficulty.MEDIUM   // Difficulty
);

// Spawn a single T bot
const tBot1 = botManager.spawnTBot(
    'PHOENIX_CONNNECTION',
    'BOMBER',
    null,
    Difficulty.HARD
);

// Spawn with custom position
const customPosition = new THREE.Vector3(25, 0, 25);
const ctBot2 = botManager.spawnCTBot(
    'GIGN',
    'AWP',
    customPosition,
    Difficulty.EXPERT
);

// Spawn full teams quickly
botManager.spawnTeams(
    5,  // CT count
    5,  // T count
    ['SAS', 'GIGN', 'NAVY_SEALS'],  // CT skin pool
    ['PHOENIX_CONNNECTION', 'LEET_KREW', 'SEPARATIST']  // T skin pool
);

// Set max bots per team
botManager.setMaxBots(10);
```

### Bot Management

```javascript
// Get alive bots for a team
const aliveCTs = botManager.getAliveBots(Team.COUNTER_TERRORIST);
const aliveTs = botManager.getAliveBots(Team.TERRORIST);

// Get total alive count
const totalAlive = botManager.getAliveCount();

// Respawn a bot after death
botManager.respawnBot(deadBot, respawnPosition);

// Update bots (call in game loop)
botManager.update(deltaTime, worldOctree);

// Clear all bots
botManager.clearAll();

// Get available skins/loadouts
const ctSkins = BotManager.getAvailableSkins(Team.COUNTER_TERRORIST);
const tLoadouts = BotManager.getAvailableLoadouts(Team.TERRORIST);
```

### Accessing Bot Properties

```javascript
// Each bot has these properties:
bot.team           // Team.COUNTER_TERRORIST or Team.TERRORIST
bot.skinName       // e.g., 'SAS'
bot.loadoutName    // e.g., 'RIFLER'
bot.difficulty     // e.g., Difficulty.MEDIUM
bot.health         // Current health
bot.maxHealth      // Maximum health
bot.isAlive        // Boolean
bot.mesh           // THREE.Group (3D model)
bot.position       // THREE.Vector3
bot.aiController   // EnemyAI instance

// Access bot's loadout
const loadout = bot.loadout;
console.log(loadout.primaryWeapon);    // e.g., 'm4a1'
console.log(loadout.hasHelmet);        // true/false
console.log(loadout.hasDefuseKit);     // true/false (CT only)
```

---

## 🎮 Complete Integration Example

```javascript
import * as THREE from 'three';
import { LevelDesignSystem, GameMode, Team } from './src/systems/levelDesign.js';
import { BotManager, Difficulty } from './src/systems/botSystem.js';

// Initialize systems
const scene = new THREE.Scene();
const player = camera; // Your player/camera object

// Create level system
const levelSystem = new LevelDesignSystem(scene);

// Create sample map
const sampleMap = levelSystem.createSampleMap();
levelSystem.registerLevel(sampleMap);

// Load the level
await levelSystem.loadLevel('dust2_sample');

// Add some props to the level
levelSystem.createWall('mid_wall', 8, 3, 0.5, new THREE.Vector3(0, 1.5, 0));
levelSystem.createCrate('box_a', 2, new THREE.Vector3(-35, 1, 25), 'wood');
levelSystem.createCrate('box_b', 2, new THREE.Vector3(35, 1, -35), 'metal');

// Create bot manager
const botManager = new BotManager(scene, player, levelSystem);

// Spawn balanced teams
botManager.spawnTeams(
    5,  // 5 CT bots
    5,  // 5 T bots
    ['SAS', 'GIGN', 'NAVY_SEALS', 'SPETSNAS'],  // CT skins
    ['PHOENIX_CONNNECTION', 'LEET_KREW', 'SEPARATIST', 'ARCTIC_AVENGERS']  // T skins
);

// Game loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // Update bots
    botManager.update(deltaTime, worldOctree);
    
    renderer.render(scene, camera);
}

// Listen for bot deaths
window.addEventListener('proshot:bot_death', (event) => {
    const { bot, team, skinName } = event.detail;
    console.log(`${skinName} (${team}) was eliminated!`);
    
    // Respawn after 5 seconds
    setTimeout(() => {
        const spawnPoint = levelSystem.getSpawnPoint(team);
        botManager.respawnBot(bot, spawnPoint);
    }, 5000);
});

// Listen for level loaded
window.addEventListener('proshot:level_loaded', (event) => {
    const { levelId, config } = event.detail;
    console.log(`Loaded level: ${config.name}`);
});
```

---

## 🎯 Advanced Features

### Team-Specific AI Behaviors

The bot system integrates with the existing EnemyAI but can be extended for team-specific behaviors:

```javascript
// CT bots prioritize:
// - Defending bomb sites
// - Holding angles
// - Saving teammates

// T bots prioritize:
// - Planting the bomb
// - Rushing sites
// - Creating distractions

// Customize AI behavior by extending EnemyAI class
class CTAI extends EnemyAI {
    updateChase(deltaTime, worldOctree) {
        // CT-specific chase logic
        super.updateChase(deltaTime, worldOctree);
        // Add defensive positioning
    }
}

class TAI extends EnemyAI {
    updateAttack(deltaTime, worldOctree) {
        // T-specific attack logic
        super.updateAttack(deltaTime, worldOctree);
        // Add bomb planting behavior
    }
}
```

### Custom Skin Creation

```javascript
// Add your own custom skin
const CUSTOM_SKINS = {
    MY_CUSTOM_CT: {
        primaryColor: 0xff6b6b,      // Custom red
        secondaryColor: 0x4ecdc4,     // Teal accent
        headColor: 0x1a1a1a,          // Black helmet
        modelType: 'custom',
        accessories: ['helmet', 'visor', 'patches']
    }
};

// Merge with existing skins
const extendedCTSkins = { ...CT_SKINS, ...CUSTOM_SKINS };
```

### Dynamic Difficulty Adjustment

```javascript
// Adjust difficulty based on player performance
function adjustBotDifficulty(playerKills, playerDeaths) {
    const kdRatio = playerKills / Math.max(playerDeaths, 1);
    
    if (kdRatio > 2.0) {
        // Player is dominating, increase difficulty
        botManager.defaultDifficulty = Difficulty.HARD;
    } else if (kdRatio < 0.5) {
        // Player is struggling, decrease difficulty
        botManager.defaultDifficulty = Difficulty.EASY;
    } else {
        botManager.defaultDifficulty = Difficulty.MEDIUM;
    }
}
```

---

## 📊 Performance Considerations

1. **Bot Count**: Limit active bots to 10-15 per team for optimal performance
2. **LOD System**: Implement level-of-detail for distant bots
3. **Update Throttling**: Update AI at reduced frequency for distant bots
4. **Frustum Culling**: Only render bots in camera view
5. **Pooling**: Reuse bot meshes instead of creating/destroying

---

## 🔧 Troubleshooting

### Bots not spawning at correct positions
- Ensure level is loaded before spawning bots
- Check that spawn points are defined in level config
- Verify y-coordinate is appropriate (not underground)

### Bots not moving
- Ensure patrol routes are defined with valid waypoints
- Check that AI controller is properly linked to bot
- Verify delta time is being passed to update()

### Wrong team colors showing
- Verify team parameter when creating BotCharacter
- Check that skin config matches team (CT vs T)

---

## 📚 API Reference

See `API_DOCS.md` for complete API documentation of all classes and methods.

---

## 🎨 Best Practices

1. **Balance teams**: Equal number of bots per team for fair matches
2. **Vary difficulty**: Mix difficulty levels for realistic gameplay
3. **Diverse skins**: Use multiple skins for visual variety
4. **Strategic patrols**: Design patrol routes that cover key areas
5. **Performance monitoring**: Watch FPS when adding many bots

---

**Happy Level Designing! 🎮**
