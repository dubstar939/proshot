/**
 * PROSHOT AUDIO SYSTEM (G1-G4)
 * Spatial audio, surface detection, dynamic music layers
 */

import * as THREE from 'three';

export class AudioSystem {
    constructor(camera, scene) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        
        this.scene = scene;
        
        // G1: Surface Sounds
        this.surfaceMaterials = {
            0: 'concrete', // Default
            1: 'metal',
            2: 'wood',
            3: 'grass',
            4: 'water'
        };
        
        this.footstepSounds = {
            concrete: [this.createBuffer('foot_concrete_1'), this.createBuffer('foot_concrete_2')],
            metal: [this.createBuffer('foot_metal_1')],
            wood: [this.createBuffer('foot_wood_1')],
            grass: [this.createBuffer('foot_grass_1')],
            water: [this.createBuffer('foot_water_1')]
        };
        
        // G4: Dynamic Music
        this.ambientMusic = null;
        this.combatMusic = null;
        this.musicVolume = 0.5;
        this.isCombat = false;
        
        this.initMusicLayers();
    }

    createBuffer(name) {
        // Placeholder: In real implementation, load from loader
        // Returns a dummy buffer for structure
        return null; 
    }

    initMusicLayers() {
        // Create ambient layer
        this.ambientMusic = new THREE.Audio(this.listener);
        this.ambientMusic.setLoop(true);
        this.ambientMusic.setVolume(0.6);
        // this.ambientMusic.setBuffer(ambientBuffer);

        // Create combat layer
        this.combatMusic = new THREE.Audio(this.listener);
        this.combatMusic.setLoop(true);
        this.combatMusic.setVolume(0.0); // Start muted
        // this.combatMusic.setBuffer(combatBuffer);

        this.scene.add(this.ambientMusic.getSource());
        this.scene.add(this.combatMusic.getSource());
        
        if(this.ambientMusic.context) {this.ambientMusic.play();}
        if(this.combatMusic.context) {this.combatMusic.play();}
    }

    /**
     * G1: Play Footstep based on surface material
     */
    playFootstep(surfaceMaterialId, isRunning) {
        const surfaceName = this.surfaceMaterials[surfaceMaterialId] || 'concrete';
        const sounds = this.footstepSounds[surfaceName];
        
        if (!sounds || sounds.length === 0) {return;}

        const soundIdx = Math.floor(Math.random() * sounds.length);
        const buffer = sounds[soundIdx];
        
        if (!buffer) {return;}

        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(buffer);
        sound.setVolume(isRunning ? 1.0 : 0.6);
        sound.setPlaybackRate(isRunning ? 1.2 : 1.0);
        sound.play();
        
        // Cleanup after play
        sound.onEnded = () => {
            sound.disconnect();
        };
    }

    /**
     * G2: Play Spatial Weapon Sound
     */
    playWeaponSound(position, type) {
        const sound = new THREE.PositionalAudio(this.listener);
        // Set buffer based on type (shoot, reload, empty)
        // sound.setBuffer(this.weaponBuffers[type]);
        sound.setRefDistance(5);
        sound.setRolloffFactor(1);
        sound.setMaxDistance(50);
        
        sound.setPosition(position.x, position.y, position.z);
        this.scene.add(sound);
        
        sound.play();
        sound.onEnded = () => {
            this.scene.remove(sound);
        };
    }

    /**
     * G3: Play Enemy Vocalization
     */
    playEnemySound(position, state) {
        // state: 'alert', 'attack', 'pain', 'death'
        const sound = new THREE.PositionalAudio(this.listener);
        // sound.setBuffer(this.enemyBuffers[state]);
        sound.setRefDistance(10);
        sound.setPosition(position.x, position.y, position.z);
        this.scene.add(sound);
        sound.play();
        sound.onEnded = () => this.scene.remove(sound);
    }

    /**
     * G4: Toggle Combat Music Layer
     */
    setCombatMode(active) {
        if (this.isCombat === active) {return;}
        this.isCombat = active;

        const targetAmbientVol = active ? 0.2 : 0.6;
        const targetCombatVol = active ? 0.8 : 0.0;

        // Simple fade simulation
        this.fadeAudio(this.ambientMusic, targetAmbientVol, 2.0);
        this.fadeAudio(this.combatMusic, targetCombatVol, 2.0);
    }

    fadeAudio(audioObj, targetVol, duration) {
        const startVol = audioObj.getVolume();
        const startTime = performance.now();
        
        const animate = () => {
            const now = performance.now();
            const progress = Math.min((now - startTime) / (duration * 1000), 1);
            const currentVol = startVol + (targetVol - startVol) * progress;
            
            audioObj.setVolume(currentVol);
            
            if (progress < 1) {requestAnimationFrame(animate);}
        };
        animate();
    }
    
    update(deltaTime) {
        // Update audio system if needed (for future spatial audio updates)
    }
}
