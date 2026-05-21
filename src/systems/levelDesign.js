/**
 * Level Design System
 * Manages level layouts, stage configurations, and environmental assets
 * Supports multiple game modes and map rotation
 */

import * as THREE from 'three';

/**
 * Game modes supported by the level system
 * @enum {string}
 */
const GameMode = {
    TEAM_DEATHMATCH: 'team_deathmatch',
    BOMB_DEFUSE: 'bomb_defuse',
    HOSTAGE_RESCUE: 'hostage_rescue',
    FREE_FOR_ALL: 'free_for_all'
};

/**
 * Team identifiers
 * @enum {string}
 */
const Team = {
    COUNTER_TERRORIST: 'ct',
    TERRORIST: 't',
    SPECTATOR: 'spectator'
};

/**
 * Level configuration structure
 * @typedef {Object} LevelConfig
 * @property {string} id - Unique level identifier
 * @property {string} name - Display name
 * @property {GameMode} gameMode - Game mode for this level
 * @property {THREE.Vector3} ctSpawn - Counter-Terrorist spawn point
 * @property {THREE.Vector3} tSpawn - Terrorist spawn point
 * @property {Array<THREE.Vector3>} ctSpawnPoints - Multiple CT spawn points
 * @property {Array<THREE.Vector3>} tSpawnPoints - Multiple T spawn points
 * @property {Array<PatrolRoute>} patrolRoutes - AI patrol routes
 * @property {Array<BombSite>} bombSites - Bomb plant locations (for bomb defuse mode)
 * @property {Array<THREE.Vector3>} hostagePositions - Hostage locations (for hostage rescue)
 * @property {LightingConfig} lighting - Lighting configuration
 * @property {EnvironmentConfig} environment - Environment settings
 */

/**
 * Patrol route for AI bots
 * @typedef {Object} PatrolRoute
 * @property {string} id - Route identifier
 * @property {Array<THREE.Vector3>} waypoints - Waypoints in order
 * @property {number} waitTime - Time to wait at each waypoint (seconds)
 * @property {boolean} loop - Whether to loop the route
 * @property {Team} team - Which team uses this route
 */

/**
 * Bomb site configuration
 * @typedef {Object} BombSite
 * @property {string} id - Site identifier (e.g., 'A', 'B')
 * @property {THREE.Vector3} position - Plant location
 * @property {THREE.Box3} plantZone - Valid plant area
 * @property {Array<THREE.Vector3>} defuseSpots - Recommended defuse positions
 */

/**
 * Lighting configuration
 * @typedef {Object} LightingConfig
 * @property {number} ambientIntensity - Ambient light intensity
 * @property {number} directionalIntensity - Directional light intensity
 * @property {number} ambientColor - Ambient light color (hex)
 * @property {number} directionalColor - Directional light color (hex)
 * @property {boolean} enableShadows - Enable shadow casting
 * @property {THREE.Vector3} sunDirection - Sun direction vector
 */

/**
 * Environment configuration
 * @typedef {Object} EnvironmentConfig
 * @property {number} fogDensity - Fog density (0 = none)
 * @property {number} fogColor - Fog color (hex)
 * @property {number} skyColor - Sky/skybox color (hex)
 * @property {string} skyboxPath - Path to skybox textures
 * @property {boolean} enableFog - Enable fog effect
 */

class LevelDesignSystem {
    /**
     * Creates an instance of LevelDesignSystem
     * @param {THREE.Scene} scene - The game scene
     * @param {WorldSystem} worldSystem - World system reference
     */
    constructor(scene, worldSystem = null) {
        this.scene = scene;
        this.worldSystem = worldSystem;
        
        /** @type {Map<string, LevelConfig>} */
        this.levels = new Map();
        
        /** @type {LevelConfig|null} */
        this.currentLevel = null;
        
        /** @type {Map<string, THREE.Object3D>} */
        this.levelObjects = new Map();
        
        /** @type {Map<string, THREE.Mesh>} */
        this.propMeshes = new Map();
        
        // Default lighting config
        this.defaultLighting = {
            ambientIntensity: 0.6,
            directionalIntensity: 1.0,
            ambientColor: 0xffffff,
            directionalColor: 0xfff5e6,
            enableShadows: true,
            sunDirection: new THREE.Vector3(-1, -2, -1)
        };
        
        // Default environment config
        this.defaultEnvironment = {
            fogDensity: 0.02,
            fogColor: 0x87ceeb,
            skyColor: 0x87ceeb,
            skyboxPath: '/assets/skyboxes/',
            enableFog: true
        };
    }
    
    /**
     * Register a new level configuration
     * @param {LevelConfig} config - Level configuration object
     */
    registerLevel(config) {
        if (!config.id) {
            throw new Error('Level config must have an id');
        }
        
        // Apply defaults
        const fullConfig = {
            ...config,
            lighting: { ...this.defaultLighting, ...(config.lighting || {}) },
            environment: { ...this.defaultEnvironment, ...(config.environment || {}) }
        };
        
        this.levels.set(config.id, fullConfig);
        console.log(`[LevelDesign] Registered level: ${config.name} (${config.id})`);
    }
    
    /**
     * Load a level by ID
     * @param {string} levelId - Level identifier
     * @returns {Promise<boolean>} Success status
     */
    async loadLevel(levelId) {
        const config = this.levels.get(levelId);
        if (!config) {
            console.error(`[LevelDesign] Level not found: ${levelId}`);
            return false;
        }
        
        console.log(`[LevelDesign] Loading level: ${config.name}`);
        
        // Clear current level objects
        this.unloadCurrentLevel();
        
        // Set current level
        this.currentLevel = config;
        
        // Apply lighting
        this.applyLighting(config.lighting);
        
        // Apply environment
        this.applyEnvironment(config.environment);
        
        // Update world system if available
        if (this.worldSystem) {
            this.worldSystem.loadLevelConfig({
                id: config.id,
                name: config.name,
                spawnPoint: config.ctSpawn,
                difficulty: 'normal'
            });
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('proshot:level_loaded', { 
            detail: { levelId, config } 
        }));
        
        return true;
    }
    
    /**
     * Unload current level
     */
    unloadCurrentLevel() {
        if (!this.currentLevel) return;
        
        // Remove level-specific objects
        for (const [id, object] of this.levelObjects) {
            this.scene.remove(object);
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
        
        this.levelObjects.clear();
        this.currentLevel = null;
    }
    
    /**
     * Apply lighting configuration
     * @param {LightingConfig} config - Lighting configuration
     */
    applyLighting(config) {
        // Find existing lights or create new ones
        let ambientLight = this.scene.children.find(c => c.isAmbientLight);
        let directionalLight = this.scene.children.find(c => c.isDirectionalLight);
        
        if (!ambientLight) {
            ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
            this.scene.add(ambientLight);
            this.levelObjects.set('ambient_light', ambientLight);
        } else {
            ambientLight.intensity = config.ambientIntensity;
            ambientLight.color.setHex(config.ambientColor);
        }
        
        if (!directionalLight) {
            directionalLight = new THREE.DirectionalLight(
                config.directionalColor, 
                config.directionalIntensity
            );
            directionalLight.position.copy(config.sunDirection);
            
            if (config.enableShadows) {
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                directionalLight.shadow.camera.near = 0.5;
                directionalLight.shadow.camera.far = 500;
                directionalLight.shadow.camera.left = -50;
                directionalLight.shadow.camera.right = 50;
                directionalLight.shadow.camera.top = 50;
                directionalLight.shadow.camera.bottom = -50;
            }
            
            this.scene.add(directionalLight);
            this.levelObjects.set('directional_light', directionalLight);
        } else {
            directionalLight.intensity = config.directionalIntensity;
            directionalLight.color.setHex(config.directionalColor);
            directionalLight.position.copy(config.sunDirection);
            directionalLight.castShadow = config.enableShadows;
        }
    }
    
    /**
     * Apply environment configuration
     * @param {EnvironmentConfig} config - Environment configuration
     */
    applyEnvironment(config) {
        if (config.enableFog) {
            this.scene.fog = new THREE.FogExp2(
                config.fogColor,
                config.fogDensity
            );
        } else {
            this.scene.fog = null;
        }
        
        // Sky color (background)
        this.scene.background = new THREE.Color(config.skyColor);
        
        // TODO: Load skybox if path provided
        if (config.skyboxPath) {
            this.loadSkybox(config.skyboxPath);
        }
    }
    
    /**
     * Load skybox textures
     * @param {string} basePath - Base path to skybox textures
     */
    async loadSkybox(basePath) {
        const textureLoader = new THREE.TextureLoader();
        const urls = [
            `${basePath}px.jpg`, `${basePath}nx.jpg`,
            `${basePath}py.jpg`, `${basePath}ny.jpg`,
            `${basePath}pz.jpg`, `${basePath}nz.jpg`
        ];
        
        try {
            const textureCube = new THREE.CubeTextureLoader().load(urls);
            this.scene.background = textureCube;
            console.log('[LevelDesign] Skybox loaded successfully');
        } catch (error) {
            console.warn('[LevelDesign] Could not load skybox:', error);
        }
    }
    
    /**
     * Add a static prop/obstacle to the level
     * @param {string} id - Unique identifier
     * @param {THREE.Geometry} geometry - Prop geometry
     * @param {THREE.Material} material - Prop material
     * @param {THREE.Vector3} position - Position
     * @param {THREE.Euler} rotation - Rotation
     * @param {THREE.Vector3} scale - Scale
     * @param {boolean} isCollidable - Whether it blocks movement
     */
    addProp(id, geometry, material, position, rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1), isCollidable = true) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        mesh.scale.copy(scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { 
            isProp: true, 
            isCollidable,
            propId: id 
        };
        
        this.scene.add(mesh);
        this.levelObjects.set(id, mesh);
        this.propMeshes.set(id, mesh);
        
        return mesh;
    }
    
    /**
     * Create a wall obstacle
     * @param {string} id - Identifier
     * @param {number} width - Wall width
     * @param {number} height - Wall height
     * @param {number} depth - Wall depth
     * @param {THREE.Vector3} position - Position
     * @param {number} rotationY - Y-axis rotation
     */
    createWall(id, width, height, depth, position, rotationY = 0) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8b8b8b,
            roughness: 0.8,
            metalness: 0.2
        });
        
        return this.addProp(id, geometry, material, position, new THREE.Euler(0, rotationY, 0));
    }
    
    /**
     * Create a crate/box obstacle
     * @param {string} id - Identifier
     * @param {number} size - Box size
     * @param {THREE.Vector3} position - Position
     * @param {string} type - Box type ('wood', 'metal', 'concrete')
     */
    createCrate(id, size, position, type = 'wood') {
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        let color;
        let roughness;
        switch (type) {
            case 'metal':
                color = 0x666666;
                roughness = 0.4;
                break;
            case 'concrete':
                color = 0x999999;
                roughness = 0.9;
                break;
            default: // wood
                color = 0x8b4513;
                roughness = 0.7;
        }
        
        const material = new THREE.MeshStandardMaterial({ 
            color,
            roughness,
            metalness: type === 'metal' ? 0.6 : 0.1
        });
        
        return this.addProp(id, geometry, material, position);
    }
    
    /**
     * Get spawn point for a team
     * @param {Team} team - Team identifier
     * @param {boolean} random - Choose random spawn from available points
     * @returns {THREE.Vector3} Spawn position
     */
    getSpawnPoint(team, random = true) {
        if (!this.currentLevel) {
            return new THREE.Vector3(0, 0, 0);
        }
        
        const spawnPoints = team === Team.COUNTER_TERRORIST 
            ? this.currentLevel.ctSpawnPoints 
            : this.currentLevel.tSpawnPoints;
        
        if (!spawnPoints || spawnPoints.length === 0) {
            return team === Team.COUNTER_TERRORIST 
                ? this.currentLevel.ctSpawn 
                : this.currentLevel.tSpawn;
        }
        
        if (random) {
            const index = Math.floor(Math.random() * spawnPoints.length);
            return spawnPoints[index].clone();
        }
        
        return spawnPoints[0].clone();
    }
    
    /**
     * Get patrol routes for a team
     * @param {Team} team - Team identifier
     * @returns {Array<PatrolRoute>} Patrol routes
     */
    getPatrolRoutes(team) {
        if (!this.currentLevel || !this.currentLevel.patrolRoutes) {
            return [];
        }
        
        return this.currentLevel.patrolRoutes.filter(route => 
            !route.team || route.team === team
        );
    }
    
    /**
     * Get all bomb sites
     * @returns {Array<BombSite>} Bomb sites
     */
    getBombSites() {
        return this.currentLevel?.bombSites || [];
    }
    
    /**
     * Get hostage positions
     * @returns {Array<THREE.Vector3>} Hostage positions
     */
    getHostagePositions() {
        return this.currentLevel?.hostagePositions || [];
    }
    
    /**
     * Get current level config
     * @returns {LevelConfig|null} Current level configuration
     */
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    /**
     * Get all registered levels
     * @returns {Array<LevelConfig>} All levels
     */
    getAllLevels() {
        return Array.from(this.levels.values());
    }
    
    /**
     * Create a sample map (Dust2-style layout)
     * @returns {LevelConfig} Sample level configuration
     */
    createSampleMap() {
        const levelConfig = {
            id: 'dust2_sample',
            name: 'Dust II Sample',
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
            
            // Patrol routes
            patrolRoutes: [
                {
                    id: 'ct_mid_patrol',
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
                    id: 't_long_patrol',
                    waypoints: [
                        new THREE.Vector3(40, 0, 30),
                        new THREE.Vector3(30, 0, 10),
                        new THREE.Vector3(20, 0, -10)
                    ],
                    waitTime: 3,
                    loop: true,
                    team: Team.TERRORIST
                }
            ],
            
            // Bomb sites
            bombSites: [
                {
                    id: 'A',
                    position: new THREE.Vector3(-40, 0, 30),
                    plantZone: new THREE.Box3(
                        new THREE.Vector3(-45, 0, 25),
                        new THREE.Vector3(-35, 5, 35)
                    ),
                    defuseSpots: [
                        new THREE.Vector3(-42, 0, 28),
                        new THREE.Vector3(-38, 0, 32)
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
                        new THREE.Vector3(38, 0, -42),
                        new THREE.Vector3(42, 0, -38)
                    ]
                }
            ],
            
            // Lighting
            lighting: {
                ambientIntensity: 0.7,
                directionalIntensity: 1.2,
                ambientColor: 0xffffff,
                directionalColor: 0xfff5e6,
                enableShadows: true,
                sunDirection: new THREE.Vector3(-1, -2, -1)
            },
            
            // Environment
            environment: {
                fogDensity: 0.015,
                fogColor: 0xd4c5a3,
                skyColor: 0x87ceeb,
                enableFog: true
            }
        };
        
        return levelConfig;
    }
}

// Export constants and class
export { LevelDesignSystem, GameMode, Team };
