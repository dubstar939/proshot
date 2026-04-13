import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Octree } from 'three-mesh-bvh';

// Import New Systems
import { PlayerMovement } from './systems/playerMovement.js';
import { WeaponSystem } from './systems/weapon.js';
import { HUDSystem } from './systems/hud.js';
import { AISystem } from './systems/ai.js';
import { GameFlow } from './systems/gameFlow.js';
import { WorldSystem } from './systems/world.js';
import { AudioSystem } from './systems/audioPro.js';
import { OptimizerSystem } from './systems/optimizer.js';

class ProShotGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        this.initRenderer();
        this.initLighting();
        this.loadWorld();
        
        // Initialize Systems
        this.optimizer = new OptimizerSystem(this.scene);
        this.audio = new AudioSystem(this.camera, this.scene);
        this.world = new WorldSystem(this.scene, this.camera, null); // Player ref added later
        this.player = new PlayerMovement(this.scene, this.camera, this.world);
        this.weapons = new WeaponSystem(this.scene, this.camera, this.player, this.optimizer);
        this.hud = new HUDSystem();
        this.ai = new AISystem(this.scene, this.player, this.weapons, this.optimizer);
        this.gameFlow = new GameFlow(this.scene, this.player, this.weapons, this.ai, this.hud);
        
        // Wire Player to World for checkpoints
        this.world.player = this.player;

        this.setupInputs();
        this.animate();
        
        // Start Game Loop
        this.gameFlow.startGame('wave');
    }

    initRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    loadWorld() {
        const loader = new GLTFLoader();
        loader.load('models/collision-world.glb', (gltf) => {
            const world = gltf.scene;
            world.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Example: Tag floor for footstep audio
                    if (child.name.includes('Floor')) {
                        child.userData.materialId = 0; // Concrete
                    }
                }
            });
            this.scene.add(world);
            
            // Generate Octree for physics
            this.worldOctree = new Octree().fromGraphNode(world);
            this.player.setOctree(this.worldOctree);
            
            // Setup Demo Interactables
            this.setupDemoInteractables();
        });
    }

    setupDemoInteractables() {
        // Create a simple door for testing D1
        const geo = new THREE.BoxGeometry(2, 3, 0.2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const door = new THREE.Mesh(geo, mat);
        door.position.set(5, 1.5, 0);
        door.castShadow = true;
        this.scene.add(door);
        
        this.world.registerInteractable(door, 'door', { 
            initialState: 'closed', 
            openRotation: Math.PI / 2,
            axis: 'y'
        });
        
        // Create a trigger zone
        const triggerGeo = new THREE.BoxGeometry(4, 4, 4);
        const triggerMat = new THREE.MeshBasicMaterial({ visible: false });
        const trigger = new THREE.Mesh(triggerGeo, triggerMat);
        trigger.position.set(0, 2, -10);
        this.scene.add(trigger);
        
        this.world.registerTrigger(trigger, (worldSys) => {
            console.log("Ambush Triggered!");
            this.gameFlow.triggerWave(1); // Force wave start
            this.audio.setCombatMode(true);
        });
    }

    setupInputs() {
        // Handled internally by systems, but global listeners can go here
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const dt = this.clock.getDelta();
        
        // Update Systems
        this.player.update(dt);
        this.weapons.update(dt);
        this.ai.update(dt);
        this.world.update(dt);
        this.optimizer.update(dt);
        this.gameFlow.update(dt);
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    new ProShotGame();
});
