# API Documentation - Three.js FPS Game

## Overview

This document provides comprehensive API documentation for the Three.js FPS Game's modular systems. The game follows an ECS-inspired (Entity-Component-System) architecture with clear separation of concerns.

---

## Table of Contents

1. [Core Systems](#core-systems)
2. [Game Managers](#game-managers)
3. [Player Systems](#player-systems)
4. [Combat Systems](#combat-systems)
5. [AI Systems](#ai-systems)
6. [UI Systems](#ui-systems)
7. [Utilities](#utilities)

---

## Core Systems

### GameManager

**File:** `src/systems/gameManager.js`

Central orchestrator that manages game state, waves, and coordinates all other systems.

#### Constructor
```javascript
const gameManager = new GameManager(scene, uiManager);
```

#### Methods

##### `setReferences(refs)`
Sets references to all game systems.
```javascript
gameManager.setReferences({
  playerController,
  weaponManager,
  healthSystem,
  enemyManager,
  worldSystem,
});
```

##### `setCallbacks(callbacks)`
Configures callback functions for game events.
```javascript
gameManager.setCallbacks({
  onWaveStart: (wave, count) => { /* ... */ },
  onWaveComplete: (wave) => { /* ... */ },
  onGameComplete: (stats) => { /* ... */ },
  onGameOver: (stats) => { /* ... */ },
});
```

##### `startGame()`
Initializes and starts a new game session.

##### `pauseGame()`
Pauses the current game.

##### `resumeGame()`
Resumes a paused game.

##### `restartGame()`
Restarts the game from the beginning.

##### `quitToMenu()`
Returns to the main menu.

##### `update(deltaTime)`
Updates all game systems. Called every frame during gameplay.
```javascript
gameManager.update(deltaTime);
```

##### `getCurrentState()`
Returns the current game state.
```javascript
const state = gameManager.getCurrentState();
// Returns: 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY'
```

##### `onPlayerDeath(killer, damageType)`
Handles player death events.

##### `onPlayerDamaged(amount, type, source)`
Handles player damage events.

##### `recordShot(hitEnemy)`
Records shot statistics for scoring.

---

### HealthSystem

**File:** `src/systems/healthSystem.js`

Manages health, damage, and death for entities.

#### Constructor
```javascript
const healthSystem = new HealthSystem(player, maxHealth = 100);
```

#### Methods

##### `setCallbacks(onDeath, onDamage, onHeal)`
Sets callback functions for health events.
```javascript
healthSystem.setCallbacks(
  (killer, damageType) => { /* handle death */ },
  (amount, type, source) => { /* handle damage */ },
  (amount) => { /* handle healing */ }
);
```

##### `takeDamage(amount, type = 'bullet', source = null)`
Applies damage to the entity.
```javascript
healthSystem.takeDamage(25, 'explosion', enemy);
```

##### `heal(amount)`
Restores health to the entity.
```javascript
healthSystem.heal(15);
```

##### `getHealthPercentage()`
Returns health as a percentage (0.0 - 1.0).
```javascript
const healthPercent = healthSystem.getHealthPercentage(); // 0.75
```

##### `isAlive()`
Checks if the entity is still alive.
```javascript
if (healthSystem.isAlive()) { /* ... */ }
```

##### `isAtFullHealth()`
Checks if entity has maximum health.

##### `setInvulnerable(state)`
Sets invulnerability state.
```javascript
healthSystem.setInvulnerable(true);
```

##### `update(deltaTime)`
Updates health system (handles regeneration, etc.).

---

## Player Systems

### PlayerController

**File:** `src/systems/playerController.js`

Handles player movement, collision detection, and physics.

#### Constructor
```javascript
const playerController = new PlayerController(camera, scene);
```

#### Configuration Constants
```javascript
PLAYER_CONFIG = {
  HEIGHT: 1.6,
  RADIUS: 0.5,
  SPEED: 10,
  JUMP_FORCE: 15,
  GRAVITY: 30,
};
```

#### Methods

##### `update(deltaTime, playerCollider, playerVelocity, worldOctree)`
Updates player position and handles collisions.
```javascript
playerController.update(deltaTime, collider, velocity, octree);
```

##### `getPosition()`
Returns the player's current position as Vector3.

##### `getVelocity()`
Returns the player's current velocity as Vector3.

##### `isOnFloor()`
Checks if player is grounded.

---

### PlayerMovement

**File:** `src/systems/playerMovement.js`

Alternative movement system with advanced features.

#### Constructor
```javascript
const playerMovement = new PlayerMovement(camera, domElement);
```

#### Methods

##### `setOctree(octree)`
Sets the collision octree for physics.

##### `move(direction, deltaTime)`
Moves the player in the specified direction.

##### `jump()`
Makes the player jump.

##### `sprint(enable)`
Enables/disables sprinting mode.

---

## Combat Systems

### WeaponManager

**File:** `src/systems/weaponSystem.js`

Manages weapons, ammunition, and firing mechanics.

#### Constructor
```javascript
const weaponManager = new WeaponManager(
  gunHolder,
  scene,
  camera,
  onProjectileSpawn
);
```

#### Methods

##### `addWeapon(config)`
Adds a new weapon to the manager.
```javascript
weaponManager.addWeapon({
  name: 'assault_rifle',
  fireRate: 0.1, // seconds between shots
  damage: 25,
  magazineSize: 30,
  reloadTime: 2.0,
  projectileSpeed: 50,
});
```

##### `setCurrentWeapon(weaponName)`
Switches to the specified weapon.

##### `fire()`
Attempts to fire the current weapon.

##### `reload()`
Reloads the current weapon.

##### `update(deltaTime, currentTime)`
Updates weapon cooldowns and animations.

##### `getAmmoCount()`
Returns current ammunition count.

##### `getMagazineCount()`
Returns rounds in current magazine.

---

### WeaponSystem

**File:** `src/systems/weapons.js`

Advanced weapon system with multiple weapon types.

#### Constructor
```javascript
const weaponSystem = new WeaponSystem(camera, scene, audioSystem);
```

#### Supported Weapon Types
- **Hitscan**: Instant hit detection (rifles, pistols)
- **Projectile**: Physical projectiles (rockets, grenades)
- **Beam**: Continuous damage beams (lasers)
- **Melee**: Close-range attacks

#### Methods

##### `equip(weaponId)`
Equips the specified weapon.

##### `attack(targetVector)`
Performs an attack in the specified direction.

##### `getWeaponStats(weaponId)`
Returns detailed weapon statistics.

---

## AI Systems

### EnemyManager

**File:** `src/systems/enemyAI.js`

Manages enemy spawning, behavior, and lifecycle.

#### Constructor
```javascript
const enemyManager = new EnemyManager(scene, player);
```

#### Methods

##### `addSpawnPoint(position)`
Adds a spawn point for enemies.
```javascript
enemyManager.addSpawnPoint(new THREE.Vector3(10, 0, -10));
```

##### `spawnEnemy(type, difficulty)`
Spawns an enemy at a random spawn point.
```javascript
enemyManager.spawnEnemy('soldier', 2);
```

##### `update(deltaTime, worldOctree)`
Updates all active enemies.

##### `getActiveEnemyCount()`
Returns number of active enemies.

##### `clearAllEnemies()`
Removes all enemies from the scene.

---

### AISystem

**File:** `src/systems/ai.js`

Advanced AI with behavior trees and pathfinding.

#### Constructor
```javascript
const aiSystem = new AISystem(scene, playerMovement);
```

#### Methods

##### `setWeapons(weaponSystem)`
Provides reference to weapon system for AI use.

##### `setGameFlow(gameFlow)`
Provides reference to game flow controller.

##### `startWave(count, difficulty)`
Initiates an enemy wave.

##### `stopAllAI()`
Stops all AI processing.

---

## UI Systems

### UIManager

**File:** `src/systems/uiManager.js`

Manages all user interface elements and screens.

#### Constructor
```javascript
const uiManager = new UIManager();
```

#### Methods

##### `setCallbacks(onStart, onQuit, onRestart)`
Sets button click handlers.
```javascript
uiManager.setCallbacks(
  () => gameManager.startGame(),
  () => gameManager.quitToMenu(),
  () => gameManager.restartGame()
);
```

##### `showStartScreen()`
Displays the main menu.

##### `showPauseMenu()`
Displays the pause menu.

##### `showGameOver(stats)`
Displays game over screen with statistics.

##### `showVictory(stats)`
Displays victory screen with statistics.

##### `showHUD()`
Displays the in-game HUD.

##### `hideHUD()`
Hides the in-game HUD.

##### `updateHealth(percent)`
Updates health bar display.

##### `updateAmmo(current, total)`
Updates ammunition display.

##### `updateScore(score)`
Updates score display.

##### `showDamageIndicator(direction)`
Shows directional damage indicator.

##### `showHitMarker()`
Displays hit confirmation marker.

---

### HUDSystem

**File:** `src/systems/hud.js`

Modern HUD implementation with reactive updates.

#### Constructor
```javascript
const hudSystem = new HUDSystem();
```

#### Methods

##### `initialize()`
Creates and initializes HUD elements.

##### `update(data)`
Updates HUD with new game data.
```javascript
hudSystem.update({
  health: 75,
  ammo: 24,
  score: 1500,
  wave: 3,
});
```

##### `setVisible(visible)`
Shows or hides the entire HUD.

##### `showNotification(message, type)`
Displays a temporary notification.
```javascript
hudSystem.showNotification('Wave Complete!', 'success');
```

---

## World Systems

### WorldSystem

**File:** `src/systems/worldSystem.js`

Manages world geometry, interactables, and triggers.

#### Constructor
```javascript
const worldSystem = new WorldSystem(scene, octree);
```

#### Methods

##### `registerInteractable(object, type, config)`
Registers an interactable object.
```javascript
worldSystem.registerInteractable(door, 'door', {
  initialState: 'closed',
  openRotation: Math.PI / 2,
  axis: 'y',
});
```

##### `registerTrigger(volume, onEnter)`
Registers a trigger volume.
```javascript
worldSystem.registerTrigger(triggerBox, () => {
  console.log('Player entered trigger zone!');
});
```

##### `updateInteractables(deltaTime, playerPosition)`
Updates all interactable objects.

##### `loadWorld(worldData)`
Loads world configuration from data.

---

## Audio Systems

### AudioSystem

**File:** `src/systems/audioPro.js`

Advanced audio management with spatial sound.

#### Constructor
```javascript
const audioSystem = new AudioSystem(camera, scene);
```

#### Methods

##### `playSound(soundId, options)`
Plays a sound effect.
```javascript
audioSystem.playSound('gunshot', {
  volume: 0.8,
  pitch: 1.0,
  spatial: true,
  position: new THREE.Vector3(5, 0, -10),
});
```

##### `playMusic(trackId)`
Plays background music.

##### `stopMusic()`
Stops background music.

##### `setVolume(category, level)`
Sets volume for audio category.
```javascript
audioSystem.setVolume('sfx', 0.7);
audioSystem.setVolume('music', 0.5);
```

##### `setCombatMode(active)`
Switches to combat music when true.

---

## Utilities

### OptimizerSystem

**File:** `src/systems/optimizer.js`

Performance monitoring and optimization.

#### Constructor
```javascript
const optimizer = new OptimizerSystem(scene);
```

#### Methods

##### `enableLOD(distance)`
Enables Level of Detail based on distance.

##### `cullOffscreenObjects()`
Removes off-screen objects from render list.

##### `getPerformanceMetrics()`
Returns current performance statistics.

##### `adjustQuality(level)`
Dynamically adjusts quality settings.
```javascript
optimizer.adjustQuality('low'); // 'low' | 'medium' | 'high' | 'ultra'
```

---

## Game Flow

### GameFlow

**File:** `src/systems/gameFlow.js`

Manages game progression and state transitions.

#### Constructor
```javascript
const gameFlow = new GameFlow();
```

#### Properties
```javascript
gameFlow.state; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'
gameFlow.currentWave;
gameFlow.difficulty;
```

#### Methods

##### `startGame(difficulty)`
Starts a new game with specified difficulty (1-3).

##### `pauseGame()`
Pauses the game.

##### `resumeGame()`
Resumes from pause.

##### `endGame(victory)`
Ends the current game session.

##### `nextWave()`
Progresses to the next wave.

---

## Events System

The game uses a custom event system for decoupled communication:

### Emitting Events
```javascript
import { EventEmitter } from './utils/eventEmitter.js';

const events = new EventEmitter();
events.emit('player:damaged', { amount: 25, type: 'bullet' });
```

### Listening to Events
```javascript
events.on('player:damaged', (data) => {
  console.log(`Player took ${data.amount} damage`);
});

// Remove listener
events.off('player:damaged', callback);
```

### Built-in Events
- `player:spawned` - Player spawned into world
- `player:damaged` - Player took damage
- `player:died` - Player died
- `enemy:spawned` - Enemy spawned
- `enemy:defeated` - Enemy defeated
- `weapon:fired` - Weapon fired
- `wave:start` - New wave started
- `wave:complete` - Wave completed
- `game:over` - Game ended
- `game:victory` - Victory achieved

---

## Error Handling

All systems implement consistent error handling:

```javascript
try {
  // Operation
} catch (error) {
  console.error('[SystemName] Operation failed:', error);
  // Fallback behavior
}
```

For critical failures, systems emit error events:
```javascript
events.emit('error', {
  system: 'WeaponSystem',
  message: 'Failed to load weapon model',
  severity: 'warning' // 'info' | 'warning' | 'critical'
});
```

---

## Best Practices

### 1. System Initialization Order
Initialize systems in dependency order:
1. Infrastructure (Audio, Optimizer)
2. World & Player
3. Gameplay (Weapons, AI)
4. Orchestration (GameManager)

### 2. Memory Management
Always dispose of Three.js objects:
```javascript
geometry.dispose();
material.dispose();
texture.dispose();
```

### 3. Performance
- Use object pooling for frequently created/destroyed objects
- Batch similar operations
- Avoid allocations in update loops

### 4. Code Organization
- Keep systems focused on single responsibilities
- Use composition over inheritance
- Document public APIs with JSDoc

---

*Last updated: January 2025*
