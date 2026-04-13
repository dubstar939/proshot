/**
 * PROSHOT WORLD SYSTEMS (D1-D4)
 * Handles Interactables, Triggers, Checkpoints, and Level Config
 */

import * as THREE from 'three';

export class WorldSystem {
    constructor(scene, camera, player) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        
        // D1: Interactables
        this.interactables = new Map(); // id -> { mesh, type, state, config }
        this.raycaster = new THREE.Raycaster();
        this.interactionDistance = 3.0;
        this.currentInteractable = null;
        
        // D3: Trigger Volumes
        this.triggers = []; // { mesh, callback, active }
        
        // D2: Checkpoints
        this.checkpoints = [];
        this.activeCheckpoint = null;
        
        // D4: Level Config
        this.levelConfig = {
            id: 'default',
            name: 'ProShot Arena',
            spawnPoint: new THREE.Vector3(0, 2, 0),
            lighting: { intensity: 1.0, color: 0xffffff },
            difficulty: 'normal'
        };

        this.initInput();
    }

    initInput() {
        // Bind interaction key (E)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') this.tryInteract();
        });
    }

    /**
     * D1: Register an interactable object (Door, Pickup, Switch)
     */
    registerInteractable(mesh, type, config = {}) {
        const id = mesh.uuid;
        this.interactables.set(id, {
            mesh,
            type, // 'door', 'pickup_health', 'pickup_ammo', 'switch'
            state: config.initialState || 'closed',
            config,
            originalPos: mesh.position.clone()
        });
        
        // Add user data for raycasting identification
        mesh.userData.isInteractable = true;
        mesh.userData.type = type;
    }

    /**
     * D3: Register a trigger volume
     */
    registerTrigger(mesh, callback) {
        mesh.userData.isTrigger = true;
        mesh.visible = false; // Invisible logic volume
        this.triggers.push({
            mesh,
            callback,
            active: true,
            triggered: false
        });
    }

    /**
     * D2: Register a checkpoint
     */
    registerCheckpoint(position, id) {
        this.checkpoints.push({ id, position: position.clone() });
        // Optional: Visual marker here
    }

    /**
     * D4: Load Level Configuration
     */
    loadLevelConfig(configData) {
        this.levelConfig = { ...this.levelConfig, ...configData };
        if (configData.spawnPoint) {
            this.player.setPosition(
                configData.spawnPoint.x,
                configData.spawnPoint.y,
                configData.spawnPoint.z
            );
        }
        console.log(`[World] Loaded level: ${this.levelConfig.name}`);
    }

    update(dt) {
        this.updateInteractions();
        this.updateTriggers();
    }

    updateInteractions() {
        // Raycast from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Get all interactable meshes
        const targets = Array.from(this.interactables.values()).map(i => i.mesh);
        const intersects = this.raycaster.intersectObjects(targets, false);

        if (intersects.length > 0 && intersects[0].distance <= this.interactionDistance) {
            const hit = intersects[0];
            const id = hit.object.uuid;
            const data = this.interactables.get(id);
            
            if (data) {
                this.currentInteractable = { id, data, distance: hit.distance };
                this.emitUIHint(data.type, "Press E");
            }
        } else {
            this.currentInteractable = null;
            this.emitUIHint(null, "");
        }
    }

    updateTriggers() {
        const playerBox = new THREE.Box3().setFromObject(this.player.mesh);
        
        this.triggers.forEach(trigger => {
            if (!trigger.active) return;
            
            const triggerBox = new THREE.Box3().setFromObject(trigger.mesh);
            if (playerBox.intersectsBox(triggerBox)) {
                if (!trigger.triggered) {
                    trigger.triggered = true;
                    trigger.callback(this);
                }
            } else {
                // Reset trigger if player leaves (optional, depends on design)
                // trigger.triggered = false; 
            }
        });
    }

    tryInteract() {
        if (!this.currentInteractable) return;

        const { id, data } = this.currentInteractable;
        
        switch (data.type) {
            case 'door':
                this.toggleDoor(data);
                break;
            case 'pickup_health':
                this.collectPickup(data, 'health');
                break;
            case 'pickup_ammo':
                this.collectPickup(data, 'ammo');
                break;
            case 'switch':
                this.activateSwitch(data);
                break;
        }
    }

    toggleDoor(data) {
        if (data.state === 'closed') {
            data.state = 'opening';
            // Simple animation logic (in prod, use Tween or AnimationMixer)
            const targetRot = data.config.openRotation || Math.PI / 2;
            const axis = data.config.axis || 'y';
            
            // Mock animation step
            const animateDoor = () => {
                if (data.state !== 'opening') return;
                if (axis === 'y') data.mesh.rotation.y += 0.05;
                if (Math.abs(data.mesh.rotation.y - targetRot) < 0.05) {
                    data.mesh.rotation.y = targetRot;
                    data.state = 'open';
                } else {
                    requestAnimationFrame(animateDoor);
                }
            };
            animateDoor();
        } else if (data.state === 'open') {
            data.state = 'closing';
             const animateDoor = () => {
                if (data.state !== 'closing') return;
                if (data.mesh.rotation.y > 0) data.mesh.rotation.y -= 0.05;
                else {
                    data.mesh.rotation.y = 0;
                    data.state = 'closed';
                }
            };
            animateDoor();
        }
    }

    collectPickup(data, type) {
        // Notify Game/HUD system via event or callback
        window.dispatchEvent(new CustomEvent('proshot:pickup', { detail: { type } }));
        
        // Hide mesh
        data.mesh.visible = false;
        data.state = 'collected';
        
        // Remove from interactables list logically
        this.interactables.delete(data.mesh.uuid);
    }

    activateSwitch(data) {
        if (data.state === 'active') return;
        data.state = 'active';
        data.mesh.material.emissive.setHex(0x00ff00);
        window.dispatchEvent(new CustomEvent('proshot:switch', { detail: { id: data.mesh.uuid } }));
    }

    emitUIHint(type, text) {
        // Dispatch event for HUD to render prompt
        window.dispatchEvent(new CustomEvent('proshot:interaction_hint', { 
            detail: { visible: !!type, text, type } 
        }));
    }

    saveGame() {
        const state = {
            checkpoint: this.activeCheckpoint ? this.activeCheckpoint.id : null,
            position: this.player.mesh.position.toArray(),
            rotation: this.player.mesh.rotation.toArray()
        };
        localStorage.setItem('proshot_save', JSON.stringify(state));
        return state;
    }

    loadGame() {
        const saved = localStorage.getItem('proshot_save');
        if (saved) {
            const state = JSON.parse(saved);
            if (state.position) {
                this.player.mesh.position.fromArray(state.position);
            }
            return state;
        }
        return null;
    }
}
