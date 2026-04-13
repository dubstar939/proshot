// ============================================
// WORLD SYSTEM MODULE
// Level loader
// Spawn points
// Interactables: doors, pickups, ammo, medkits
// Physics objects if supported
// ============================================

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const INTERACTABLE_TYPES = {
  DOOR: 'door',
  HEALTH_PACK: 'health_pack',
  AMMO_PACK: 'ammo_pack',
  ARMOR_PACK: 'armor_pack',
  WEAPON: 'weapon',
  BUTTON: 'button',
  PICKUP: 'pickup',
};

class WorldSystem {
  constructor(scene, worldOctree) {
    this.scene = scene;
    this.worldOctree = worldOctree;
    
    this.spawnPoints = [];
    this.enemySpawnPoints = [];
    this.interactables = [];
    this.physicsObjects = [];
    this.doors = [];
    
    this.currentLevel = null;
    this.loadedLevels = new Map();
  }
  
  // Spawn point management
  addSpawnPoint(position, rotation = 0) {
    this.spawnPoints.push({
      position: position.clone(),
      rotation: rotation,
      used: false,
    });
  }
  
  addEnemySpawnPoint(position, patrolPoints = []) {
    this.enemySpawnPoints.push({
      position: position.clone(),
      patrolPoints: patrolPoints.map(p => p.clone()),
      used: false,
    });
  }
  
  getRandomSpawnPoint() {
    const unused = this.spawnPoints.filter(sp => !sp.used);
    if (unused.length === 0) {
      // Reset all spawn points
      this.spawnPoints.forEach(sp => sp.used = false);
      return this.getRandomSpawnPoint();
    }
    
    const spawnPoint = unused[Math.floor(Math.random() * unused.length)];
    spawnPoint.used = true;
    return spawnPoint;
  }
  
  getRandomEnemySpawnPoint() {
    if (this.enemySpawnPoints.length === 0) {
      // Create a default spawn point at origin
      return {
        position: new THREE.Vector3(0, 0, 0),
        patrolPoints: [],
      };
    }
    
    const spawnPoint = this.enemySpawnPoints[Math.floor(Math.random() * this.enemySpawnPoints.length)];
    return spawnPoint;
  }
  
  // Interactable creation
  createHealthPack(position, amount = 25) {
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x004400,
      roughness: 0.3,
      metalness: 0.5
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add cross symbol
    const crossGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.32);
    const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crossH = new THREE.Mesh(crossGeometry, crossMaterial);
    crossH.position.set(0, 0.16, 0);
    mesh.add(crossH);
    
    const crossV = new THREE.Mesh(crossGeometry, crossMaterial);
    crossV.rotation.y = Math.PI / 2;
    crossV.position.set(0, 0.16, 0);
    mesh.add(crossV);
    
    this.scene.add(mesh);
    
    const interactable = {
      type: INTERACTABLE_TYPES.HEALTH_PACK,
      mesh: mesh,
      amount: amount,
      pickupRange: 2,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      onInteract: (player) => this.onHealthPackPickup(player, interactable),
    };
    
    this.interactables.push(interactable);
    return interactable;
  }
  
  createAmmoPack(position, amount = 30, weaponType = 'pistol') {
    const geometry = new THREE.BoxGeometry(0.3, 0.2, 0.4);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffaa00,
      roughness: 0.4,
      metalness: 0.6
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add bullet details
    const bulletGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8);
    const bulletMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.rotation.x = Math.PI / 2;
        bullet.position.set(-0.1 + i * 0.1, 0.15, -0.1 + j * 0.2);
        mesh.add(bullet);
      }
    }
    
    this.scene.add(mesh);
    
    const interactable = {
      type: INTERACTABLE_TYPES.AMMO_PACK,
      mesh: mesh,
      amount: amount,
      weaponType: weaponType,
      pickupRange: 2,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      onInteract: (player) => this.onAmmoPackPickup(player, interactable),
    };
    
    this.interactables.push(interactable);
    return interactable;
  }
  
  createArmorPack(position, amount = 50) {
    const geometry = new THREE.OctahedronGeometry(0.25);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4488ff,
      emissive: 0x002266,
      roughness: 0.2,
      metalness: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    
    const interactable = {
      type: INTERACTABLE_TYPES.ARMOR_PACK,
      mesh: mesh,
      amount: amount,
      pickupRange: 2,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      rotationSpeed: 2,
      onInteract: (player) => this.onArmorPackPickup(player, interactable),
    };
    
    this.interactables.push(interactable);
    return interactable;
  }
  
  createDoor(position, axis = 'x', openDistance = 2, autoClose = false, keyRequired = false) {
    const doorGeometry = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.6,
      metalness: 0.3
    });
    
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.copy(position);
    door.position.y += 1.5;
    door.castShadow = true;
    door.receiveShadow = true;
    
    this.scene.add(door);
    
    // Add door frame
    const frameGeometry = new THREE.BoxGeometry(2.4, 3.2, 0.3);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.copy(position);
    frame.position.y += 1.6;
    this.scene.add(frame);
    
    const doorObj = {
      mesh: door,
      frame: frame,
      isOpen: false,
      isMoving: false,
      axis: axis,
      openDistance: openDistance,
      autoClose: autoClose,
      closeTimer: 0,
      keyRequired: keyRequired,
      closedPosition: position.clone(),
      openPosition: position.clone(),
    };
    
    // Calculate open position
    if (axis === 'x') {
      doorObj.openPosition.x += openDistance;
    } else if (axis === 'z') {
      doorObj.openPosition.z += openDistance;
    } else if (axis === 'rotate') {
      doorObj.openRotation = Math.PI / 2;
    }
    
    this.doors.push(doorObj);
    
    // Add collision box that can be removed
    door.userData = {
      isDoor: true,
      door: doorObj,
      onInteract: () => this.toggleDoor(doorObj),
    };
    
    return doorObj;
  }
  
  toggleDoor(door) {
    if (door.isMoving) return;
    
    door.isOpen = !door.isOpen;
    door.isMoving = true;
    
    const startPos = door.mesh.position.clone();
    const endPos = door.isOpen ? door.openPosition : door.closedPosition;
    const duration = 1000; // ms
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      door.mesh.position.lerpVectors(startPos, endPos, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        door.isMoving = false;
        
        if (door.autoClose && door.isOpen) {
          door.closeTimer = 3000; // Close after 3 seconds
        }
      }
    };
    
    animate();
  }
  
  createPhysicsObject(position, type = 'box', mass = 1) {
    let geometry;
    
    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.3, 16, 16);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    }
    
    const material = new THREE.MeshStandardMaterial({ 
      color: Math.random() * 0xffffff,
      roughness: 0.5,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    
    const physicsObj = {
      mesh: mesh,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      mass: mass,
      resting: false,
      onGround: false,
    };
    
    this.physicsObjects.push(physicsObj);
    return physicsObj;
  }
  
  // Pickup handlers
  onHealthPackPickup(player, interactable) {
    if (player.healthSystem) {
      player.healthSystem.heal(interactable.amount);
      this.showPickupFeedback(`+${interactable.amount} HP`, 0x00ff00);
    }
    this.collectInteractable(interactable);
  }
  
  onAmmoPackPickup(player, interactable) {
    if (player.weaponManager) {
      const weapon = player.weaponManager.getCurrentWeapon();
      if (weapon) {
        weapon.addAmmo(interactable.amount);
        this.showPickupFeedback(`+${interactable.amount} Ammo`, 0xffaa00);
      }
    }
    this.collectInteractable(interactable);
  }
  
  onArmorPackPickup(player, interactable) {
    if (player.healthSystem) {
      player.healthSystem.addArmor(interactable.amount);
      this.showPickupFeedback(`+${interactable.amount} Armor`, 0x4488ff);
    }
    this.collectInteractable(interactable);
  }
  
  collectInteractable(interactable) {
    interactable.collected = true;
    
    // Animate collection
    const startTime = performance.now();
    const duration = 300;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      interactable.mesh.scale.multiplyScalar(1 - progress * 0.5);
      interactable.mesh.material.opacity = 1 - progress;
      interactable.mesh.material.transparent = true;
      interactable.mesh.position.y += 0.02;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(interactable.mesh);
        interactable.mesh.geometry.dispose();
        interactable.mesh.material.dispose();
        
        // Remove from list
        const index = this.interactables.indexOf(interactable);
        if (index > -1) {
          this.interactables.splice(index, 1);
        }
      }
    };
    
    animate();
  }
  
  showPickupFeedback(text, color) {
    // Simple feedback - could be enhanced with floating text
    console.log(`Picked up: ${text}`);
  }
  
  // Update interactables
  updateInteractables(deltaTime, playerPosition) {
    const time = performance.now() * 0.001;
    
    for (const interactable of this.interactables) {
      if (interactable.collected) continue;
      
      // Bobbing animation
      if (interactable.type === INTERACTABLE_TYPES.HEALTH_PACK ||
          interactable.type === INTERACTABLE_TYPES.AMMO_PACK) {
        interactable.mesh.position.y = 
          interactable.mesh.parent?.position.y || 0.5 + 
          Math.sin(time * 3 + interactable.bobOffset) * 0.1;
        interactable.mesh.rotation.y += deltaTime * 2;
      }
      
      // Rotating armor
      if (interactable.type === INTERACTABLE_TYPES.ARMOR_PACK) {
        interactable.mesh.rotation.y += deltaTime * (interactable.rotationSpeed || 2);
        interactable.mesh.rotation.x = Math.sin(time) * 0.2;
      }
      
      // Check pickup range
      const distance = interactable.mesh.position.distanceTo(playerPosition);
      if (distance < interactable.pickupRange && interactable.onInteract) {
        interactable.onInteract({ position: playerPosition });
      }
    }
    
    // Update doors
    for (const door of this.doors) {
      if (door.autoClose && door.isOpen && !door.isMoving) {
        door.closeTimer -= deltaTime * 1000;
        if (door.closeTimer <= 0) {
          this.toggleDoor(door);
        }
      }
    }
  }
  
  // Update physics objects
  updatePhysicsObjects(deltaTime, worldOctree) {
    const gravity = 30;
    
    for (const obj of this.physicsObjects) {
      if (obj.resting) continue;
      
      // Apply gravity
      obj.velocity.y -= gravity * deltaTime;
      
      // Apply velocity
      obj.mesh.position.addScaledVector(obj.velocity, deltaTime);
      
      // Simple ground collision
      if (obj.mesh.position.y < 0.25) {
        obj.mesh.position.y = 0.25;
        obj.velocity.y *= -0.3; // Bounce
        obj.velocity.x *= 0.95; // Friction
        obj.velocity.z *= 0.95;
        
        if (Math.abs(obj.velocity.y) < 0.5) {
          obj.velocity.y = 0;
          obj.resting = true;
        }
      }
      
      // Apply angular velocity
      obj.mesh.rotation.x += obj.angularVelocity.x * deltaTime;
      obj.mesh.rotation.z += obj.angularVelocity.z * deltaTime;
    }
  }
  
  // Load level from GLTF
  async loadLevel(levelPath, onLoadCallback) {
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(levelPath, (gltf) => {
        this.currentLevel = gltf.scene;
        this.scene.add(gltf.scene);
        
        // Process level for spawn points and interactables
        this.processLevelNode(gltf.scene);
        
        // Update octree
        if (this.worldOctree) {
          this.worldOctree.fromGraphNode(gltf.scene);
        }
        
        if (onLoadCallback) {
          onLoadCallback(gltf.scene);
        }
        
        resolve(gltf.scene);
      }, undefined, reject);
    });
  }
  
  processLevelNode(node) {
    node.traverse((child) => {
      if (!child.isMesh) return;
      
      // Check for spawn point markers
      if (child.name.includes('spawn_player')) {
        this.addSpawnPoint(child.position, child.rotation.y);
      }
      
      if (child.name.includes('spawn_enemy')) {
        this.addEnemySpawnPoint(child.position);
      }
      
      // Check for interactable markers
      if (child.name.includes('health')) {
        this.createHealthPack(child.position.clone());
        child.visible = false;
      }
      
      if (child.name.includes('ammo')) {
        this.createAmmoPack(child.position.clone());
        child.visible = false;
      }
      
      if (child.name.includes('armor')) {
        this.createArmorPack(child.position.clone());
        child.visible = false;
      }
      
      if (child.name.includes('door')) {
        const axis = child.name.includes('x') ? 'x' : child.name.includes('z') ? 'z' : 'rotate';
        this.createDoor(child.position.clone(), axis);
        child.visible = false;
      }
    });
  }
  
  // Clear all world objects
  clearWorld() {
    // Remove interactables
    for (const interactable of this.interactables) {
      if (interactable.mesh && interactable.mesh.parent) {
        this.scene.remove(interactable.mesh);
      }
    }
    this.interactables = [];
    
    // Remove physics objects
    for (const obj of this.physicsObjects) {
      if (obj.mesh && obj.mesh.parent) {
        this.scene.remove(obj.mesh);
      }
    }
    this.physicsObjects = [];
    
    // Remove doors
    for (const door of this.doors) {
      if (door.mesh && door.mesh.parent) {
        this.scene.remove(door.mesh);
      }
      if (door.frame && door.frame.parent) {
        this.scene.remove(door.frame);
      }
    }
    this.doors = [];
    
    // Clear spawn points
    this.spawnPoints = [];
    this.enemySpawnPoints = [];
    
    // Remove current level
    if (this.currentLevel) {
      this.scene.remove(this.currentLevel);
      this.currentLevel = null;
    }
  }
  
  dispose() {
    this.clearWorld();
  }
}

export { WorldSystem, INTERACTABLE_TYPES };
