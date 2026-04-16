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

// Additional imports for ProShotGame class
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three-mesh-bvh';
import { PlayerMovement } from './systems/playerMovement.js';
import { WeaponSystem } from './systems/weapons.js';
import { HUDSystem } from './systems/hud.js';
import { AISystem } from './systems/ai.js';
import { GameFlow } from './systems/gameFlow.js';
import { WorldSystem } from './systems/world.js';
import { AudioSystem } from './systems/audioPro.js';
import { OptimizerSystem } from './systems/optimizer.js';

/**
 * Main Game Controller
 * Coordinates all game systems and manages the game loop
 * 
 * @class ProShotGame
 * @description Central orchestrator for all game systems following ECS-inspired architecture
 */
class ProShotGame {
    /**
     * Creates an instance of ProShotGame
     * @param {Object} config - Configuration options
     * @param {number} config.difficulty - Initial difficulty (1-3)
     * @param {boolean} config.debug - Enable debug mode
     */
    constructor(config = {}) {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        
        // Physics & Collision
        this.worldOctree = null;
        
        // Game Systems (initialized in dependency order)
        this.systems = {
            optimizer: null,
            audio: null,
            hud: null,
            world: null,
            player: null,
            weapons: null,
            ai: null,
            gameFlow: null
        };
        
        // State
        this._isInitialized = false;
        this._config = {
            difficulty: 2,
            debug: false,
            ...config
        };
        
        this._initialize();
    }

    /**
     * Initialize all core components and systems
     * @private
     */
    _initialize() {
        try {
            this._createCoreComponents();
            this._initRenderer();
            this._initLighting();
            this._initSystems();
            this._loadWorld();
            this._setupInputs();
            
            this._isInitialized = true;
            this._animate();
            
            // Start Game with configured difficulty
            this.systems.gameFlow.startGame(this._config.difficulty);
            
            if (this._config.debug) {
                console.log('[ProShotGame] Initialized successfully');
            }
        } catch (error) {
            console.error('[ProShotGame] Initialization failed:', error);
            this._handleFatalError(error);
        }
    }

    /**
     * Create core Three.js components
     * @private
     */
    _createCoreComponents() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.clock = new THREE.Clock();
    }

    /**
     * Initialize renderer with optimal settings
     * @private
     */
    _initRenderer() {
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        document.body.appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => this._onWindowResize(), { passive: true });
    }

    /**
     * Handle window resize events
     * @private
     */
    _onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Setup scene lighting
     * @private
     */
    _initLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.bias = -0.0001;
        
        this.scene.add(dirLight);
    }

    /**
     * Initialize all game systems in dependency order
     * @private
     */
    _initSystems() {
        const { scene, camera } = this;
        
        // Layer 1: Infrastructure (no dependencies)
        this.systems.optimizer = new OptimizerSystem(scene);
        this.systems.audio = new AudioSystem(camera, scene);
        this.systems.hud = new HUDSystem();
        
        // Layer 2: World & Player (minimal dependencies)
        this.systems.world = new WorldSystem(scene, camera);
        this.systems.player = new PlayerMovement(camera, document.body);
        
        // Layer 3: Gameplay Systems (depend on Layer 1 & 2)
        this.systems.weapons = new WeaponSystem(camera, scene, this.systems.audio);
        this.systems.ai = new AISystem(scene, this.systems.player);
        
        // Layer 4: Orchestration (depends on all)
        this.systems.gameFlow = new GameFlow();
        
        // Wire cross-system dependencies
        this._wireSystemDependencies();
    }

    /**
     * Wire dependencies between systems
     * @private
     */
    _wireSystemDependencies() {
        this.systems.world.player = this.systems.player;
        this.systems.ai.setWeapons(this.systems.weapons);
        this.systems.ai.setGameFlow(this.systems.gameFlow);
    }

    /**
     * Load the game world from GLTF file
     * @private
     */
    _loadWorld() {
        const loader = new GLTFLoader();
        loader.load(
            'models/collision-world.glb',
            (gltf) => this._onWorldLoaded(gltf),
            (progress) => this._onWorldLoadProgress(progress),
            (error) => this._onWorldLoadError(error)
        );
    }

    /**
     * Handle successful world load
     * @private
     * @param {GLTF} gltf - Loaded GLTF object
     */
    _onWorldLoaded(gltf) {
        const world = gltf.scene;
        
        world.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.name.includes('Floor')) {
                    child.userData.materialId = WorldSystem.MaterialType.CONCRETE;
                }
            }
        });
        
        this.scene.add(world);
        
        // Generate collision octree
        this.worldOctree = new Octree().fromGraphNode(world);
        this.systems.player.setOctree(this.worldOctree);
        
        this._setupDemoInteractables();
        
        console.log('[ProShotGame] World loaded successfully');
    }

    /**
     * Handle world load progress
     * @private
     * @param {ProgressEvent} progress
     */
    _onWorldLoadProgress(progress) {
        if (progress.total > 0) {
            const percent = (progress.loaded / progress.total * 100).toFixed(2);
            console.log(`[ProShotGame] Loading world: ${percent}%`);
        }
    }

    /**
     * Handle world load error with fallback
     * @private
     * @param {Error} error
     */
    _onWorldLoadError(error) {
        console.error('[ProShotGame] Failed to load world:', error);
        this._createFallbackGround();
    }

    /**
     * Create fallback ground plane if world fails to load
     * @private
     */
    _createFallbackGround() {
        const geometry = new THREE.PlaneGeometry(50, 50);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        this.worldOctree = new Octree();
        this.systems.player.setOctree(this.worldOctree);
        
        console.warn('[ProShotGame] Using fallback ground plane');
    }

    /**
     * Setup demo interactables for testing
     * @private
     */
    _setupDemoInteractables() {
        this._createTestDoor();
        this._createTestTrigger();
    }

    /**
     * Create a test door for interaction testing
     * @private
     */
    _createTestDoor() {
        const doorGeo = new THREE.BoxGeometry(2, 3, 0.2);
        const doorMat = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.7
        });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(5, 1.5, 0);
        door.castShadow = true;
        this.scene.add(door);
        
        this.systems.world.registerInteractable(door, 'door', { 
            initialState: 'closed', 
            openRotation: Math.PI / 2,
            axis: 'y'
        });
    }

    /**
     * Create a test trigger zone
     * @private
     */
    _createTestTrigger() {
        const triggerGeo = new THREE.BoxGeometry(4, 4, 4);
        const triggerMat = new THREE.MeshBasicMaterial({ visible: false });
        const trigger = new THREE.Mesh(triggerGeo, triggerMat);
        trigger.position.set(0, 2, -10);
        this.scene.add(trigger);
        
        this.systems.world.registerTrigger(trigger, () => {
            console.log('[ProShotGame] Ambush triggered!');
            this.systems.ai.startWave();
            this.systems.audio.setCombatMode(true);
        });
    }

    /**
     * Setup global input handlers
     * @private
     */
    _setupInputs() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this._togglePause();
            }
        }, { passive: false });
    }

    /**
     * Toggle pause state
     * @private
     */
    _togglePause() {
        const { gameFlow } = this.systems;
        if (gameFlow.state === 'PLAYING') {
            gameFlow.pauseGame();
        } else if (gameFlow.state === 'PAUSED') {
            gameFlow.resumeGame();
        }
    }

    /**
     * Handle fatal initialization errors
     * @private
     * @param {Error} error
     */
    _handleFatalError(error) {
        console.error('[ProShotGame] Fatal error:', error);
        // Display error UI to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: sans-serif;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h2>Initialization Error</h2>
            <p>${error.message}</p>
            <p>Please refresh the page or check console for details.</p>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Main game loop
     * @private
     */
    _animate() {
        requestAnimationFrame(() => this._animate());
        
        if (!this._isInitialized) return;
        
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Update systems in order
        this._updateSystems(deltaTime, elapsedTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update all game systems
     * @private
     * @param {number} deltaTime - Time since last frame
     * @param {number} elapsedTime - Total elapsed time
     */
    _updateSystems(deltaTime, elapsedTime) {
        const { player, weapons, ai, world, optimizer, gameFlow } = this.systems;
        
        player.update(deltaTime, this.worldOctree);
        weapons.update(deltaTime, elapsedTime);
        ai.update(deltaTime, elapsedTime);
        world.update(deltaTime);
        optimizer.update(deltaTime);
        gameFlow.update(deltaTime);
    }

    /**
     * Get a system by name
     * @public
     * @param {string} name - System name
     * @returns {Object|null} The system or null if not found
     */
    getSystem(name) {
        return this.systems[name] || null;
    }

    /**
     * Get game configuration
     * @public
     * @returns {Object} Configuration object
     */
    getConfig() {
        return { ...this._config };
    }

    /**
     * Check if game is initialized
     * @public
     * @returns {boolean}
     */
    isInitialized() {
        return this._isInitialized;
    }

    /**
     * Cleanup and destroy game instance
     * @public
     */
    dispose() {
        this._isInitialized = false;
        
        // Dispose systems
        Object.values(this.systems).forEach(system => {
            if (system && typeof system.dispose === 'function') {
                system.dispose();
            }
        });
        
        // Dispose renderer
        this.renderer.dispose();
        this.renderer.domElement.remove();
        
        console.log('[ProShotGame] Disposed');
    }
}

// Auto-start when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.game = new ProShotGame({
        difficulty: 2,
        debug: true
    });
});

// Export for module usage
export { ProShotGame };
