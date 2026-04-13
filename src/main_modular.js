import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Octree } from 'three-mesh-bvh';

// Import New Systems
import { PlayerMovement } from './systems/playerMovement.js';
import { WeaponSystem } from './systems/weapon.js';
import { HUDSystem } from './systems/hud.js';
import { AISpawner } from './systems/ai.js';
import { GameFlowManager } from './systems/gameFlow.js';

let camera, scene, renderer, clock;
let playerMovement, weaponSystem, hudSystem, gameFlow, aiSpawner;
let worldOctree;

init();
animate();

function init() {
    const container = document.getElementById('container') || document.body;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.Fog(0x111111, 10, 50);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Initialize Systems
    hudSystem = new HUDSystem();
    gameFlow = new GameFlowManager();
    
    // Wait for user input to start (click to lock pointer)
    document.addEventListener('click', () => {
        if (gameFlow.state === 'MENU') {
            document.body.requestPointerLock();
            gameFlow.startGame();
        }
    });

    loadWorld();
    
    window.addEventListener('resize', onWindowResize);
}

function loadWorld() {
    const loader = new GLTFLoader().setPath('models/').setMeshoptDecoder(MeshoptDecoder);
    
    loader.load('collision-world.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
                // Simple material override for demo
                if (!c.material) c.material = new THREE.MeshStandardMaterial({ color: 0x888888 });
            }
        });
        scene.add(model);
        
        // Build Octree for physics
        worldOctree = new Octree().fromGraphNode(model);
        
        // Init Player & Weapons after world load
        playerMovement = new PlayerMovement(camera, renderer.domElement);
        weaponSystem = new WeaponSystem(camera, scene, null); // Audio system placeholder
        
        // Init AI
        aiSpawner = new AISpawner(scene, camera);
        aiSpawner.startWave();
        
    }, undefined, (e) => console.error(e));
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (gameFlow.state === 'PLAYING') {
        if (playerMovement) playerMovement.update(delta, worldOctree);
        if (weaponSystem) weaponSystem.update(delta, time);
        if (aiSpawner) aiSpawner.update(delta, time);
    }

    renderer.render(scene, camera);
}
