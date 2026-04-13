import * as THREE from "three";

// Components
import { createScene } from "./components/scene";
import { createCamera, gunMixer } from "./components/camera";
import { createLights } from "./components/lights";
import { loadWorld } from "./components/world";
import { addBgMusic } from "./components/music";

// Systems
import { createRenderer } from "./systems/renderer";
import { createStats } from "./systems/stats";
import { Resizer } from "./systems/resizer";
import { createPhysics, STEPS_PER_FRAME } from "./systems/physics";
import { setupControls } from "./systems/controls";

// New Game Systems
import { PlayerController, PLAYER_CONFIG } from "./systems/playerController";
import { WeaponManager } from "./systems/weaponSystem";
import { EnemyManager } from "./systems/enemyAI";
import { HealthSystem, DamageManager } from "./systems/healthSystem";
import { WorldSystem } from "./systems/worldSystem";
import { UIManager } from "./systems/uiManager";
import { GameManager, GAME_STATE } from "./systems/gameManager";

const clock = new THREE.Clock();
const scene = createScene();
const { camera, player, gunHolder } = createCamera(scene);
const { fillLight1, directionalLight } = createLights();
scene.add(fillLight1, directionalLight);

const container = document.getElementById("container");
const renderer = createRenderer(animate);
container.appendChild(renderer.domElement);
const stats = createStats();
container.appendChild(stats.domElement);

// Initialize UI Manager first
const uiManager = new UIManager();

// Initialize Game Manager
const gameManager = new GameManager(scene, uiManager);

// Initialize Physics & Controls
const {
  playerCollider,
  playerVelocity,
  playerDirection,
  updatePlayer,
  updateSpheres,
  throwBall,
  worldOctree,
} = createPhysics(scene, camera, gunHolder);

// Initialize Player Controller
const playerController = new PlayerController(camera, scene);

// Initialize Weapon System
const weaponManager = new WeaponManager(
  gunHolder,
  scene,
  camera,
  (weapon, projectile) => {
    // Handle projectile spawning if needed
    gameManager.recordShot(true);
  }
);

// Initialize Health System
const healthSystem = new HealthSystem(player);
healthSystem.setCallbacks(
  (killer, damageType) => gameManager.onPlayerDeath(killer, damageType),
  (amount, type, source) => gameManager.onPlayerDamaged(amount, type, source),
  (amount) => {}
);

// Initialize Enemy Manager
const enemyManager = new EnemyManager(scene, player);
enemyManager.addSpawnPoint(new THREE.Vector3(-10, 0, -10));
enemyManager.addSpawnPoint(new THREE.Vector3(10, 0, -10));
enemyManager.addSpawnPoint(new THREE.Vector3(0, 0, -20));

// Initialize World System
const worldSystem = new WorldSystem(scene, worldOctree);

// Set up game manager references
gameManager.setReferences({
  playerController,
  weaponManager,
  healthSystem,
  enemyManager,
  worldSystem,
});

// Set up game manager callbacks
gameManager.setCallbacks({
  onWaveStart: (wave, count) => {
    console.log(`Wave ${wave} started with ${count} enemies`);
  },
  onWaveComplete: (wave) => {
    console.log(`Wave ${wave} complete!`);
  },
  onGameComplete: (stats) => {
    console.log('Victory!', stats);
  },
  onGameOver: (stats) => {
    console.log('Game Over', stats);
  },
});

// Set up UI callbacks
uiManager.setCallbacks(
  () => gameManager.startGame(),
  () => gameManager.quitToMenu(),
  () => gameManager.restartGame()
);

// Setup input controls with new system
const applyControls = setupControls(
  camera,
  playerVelocity,
  playerCollider,
  playerController,
  weaponManager,
  gameManager
);

// Load World
loadWorld(scene, worldOctree);

// Add Background Sound Effects
addBgMusic();

// Show start screen initially
uiManager.showStartScreen();
uiManager.hideHUD();

// Animation Loop
let lastTime = 0;

function animate() {
  const currentTime = performance.now() / 1000;
  const deltaTime = Math.min(0.05, clock.getDelta());
  
  // Update game state
  if (gameManager.getCurrentState() === GAME_STATE.PLAYING) {
    gameManager.update(deltaTime);
    
    // Update player controller
    playerController.update(deltaTime, playerCollider, playerVelocity, worldOctree);
    
    // Update weapon system
    weaponManager.update(deltaTime, currentTime);
    
    // Update health system
    healthSystem.update(deltaTime);
    
    // Update enemy AI
    enemyManager.update(deltaTime, worldOctree);
    
    // Update world interactables
    worldSystem.updateInteractables(deltaTime, playerCollider.end);
  }
  
  // Update spheres (projectiles)
  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    updateSpheres(deltaTime / STEPS_PER_FRAME, worldOctree);
  }
  
  // Update gun animations
  if (gunMixer) gunMixer.update(deltaTime);
  
  // Render
  renderer.render(scene, camera);
  stats.update();
  
  lastTime = currentTime;
}

// Resizer
Resizer(camera, renderer);

// Handle window focus for pause
window.addEventListener('blur', () => {
  if (gameManager.getCurrentState() === GAME_STATE.PLAYING) {
    gameManager.pauseGame();
  }
});
