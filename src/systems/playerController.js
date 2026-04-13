// ============================================
// PLAYER CONTROLLER MODULE
// Enhanced movement with sprint, crouch, jump buffer, coyote time
// Camera sway, head bob, landing impact, FOV kick
// ============================================

import * as THREE from "three";

const PLAYER_CONFIG = {
  // Movement
  walkSpeed: 5,
  sprintSpeed: 9,
  crouchSpeed: 2.5,
  airControl: 0.3,
  
  // Jump
  jumpForce: 12,
  jumpBufferTime: 0.15, // seconds to buffer jump input
  coyoteTime: 0.12, // seconds after leaving edge where jump is allowed
  
  // Crouch
  standHeight: 1.6,
  crouchHeight: 0.9,
  crouchTransitionSpeed: 8,
  
  // Camera
  baseFOV: 70,
  sprintFOV: 85,
  fovTransitionSpeed: 8,
  
  // Head Bob
  headBobFrequency: 8,
  headBobAmplitude: 0.04,
  headBobSprintMultiplier: 1.8,
  
  // Camera Sway
  cameraSwayAmount: 0.0008,
  cameraSwaySmoothness: 6,
  
  // Landing Impact
  landingImpactThreshold: 8,
  landingFOVKick: 5,
  landingRecoverySpeed: 3,
};

class PlayerController {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    
    // State
    this.isSprinting = false;
    this.isCrouching = false;
    this.isOnGround = false;
    this.isInAir = false;
    
    // Timers
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;
    this.landingTimer = 0;
    
    // Current values
    this.currentHeight = PLAYER_CONFIG.standHeight;
    this.currentFOV = PLAYER_CONFIG.baseFOV;
    this.targetFOV = PLAYER_CONFIG.baseFOV;
    
    // Head bob phase
    this.headBobPhase = 0;
    
    // Camera sway
    this.swayOffset = new THREE.Vector3();
    this.targetSwayOffset = new THREE.Vector3();
    
    // Input state
    this.moveInput = new THREE.Vector2();
    this.lookInput = new THREE.Vector2();
    
    // Velocity tracking for landing impact
    this.lastYVelocity = 0;
    
    // Mouse movement accumulator for sway
    this.mouseAccumulator = new THREE.Vector2();
  }
  
  update(deltaTime, playerCollider, playerVelocity, worldOctree) {
    // Update timers
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= deltaTime;
    if (this.coyoteTimer > 0) this.coyoteTimer -= deltaTime;
    if (this.landingTimer > 0) this.landingTimer -= deltaTime;
    
    // Update ground state
    const wasOnGround = this.isOnGround;
    this.isOnGround = this.checkOnGround(playerCollider, worldOctree);
    this.isInAir = !this.isOnGround;
    
    // Coyote time - start when leaving ground
    if (wasOnGround && !this.isOnGround) {
      this.coyoteTimer = PLAYER_CONFIG.coyoteTime;
    }
    
    // Check for landing impact
    if (!wasOnGround && this.isOnGround && this.lastYVelocity < -PLAYER_CONFIG.landingImpactThreshold) {
      this.onLanding();
    }
    
    this.lastYVelocity = playerVelocity.y;
    
    // Handle jump buffer
    if (this.jumpBufferTimer > 0 && (this.isOnGround || this.coyoteTimer > 0)) {
      this.performJump(playerVelocity);
      this.jumpBufferTimer = 0;
    }
    
    // Apply gravity
    if (!this.isOnGround) {
      playerVelocity.y -= 30 * deltaTime;
    }
    
    // Calculate current speed based on state
    let currentSpeed = PLAYER_CONFIG.walkSpeed;
    if (this.isSprinting && !this.isCrouching) currentSpeed = PLAYER_CONFIG.sprintSpeed;
    if (this.isCrouching) currentSpeed = PLAYER_CONFIG.crouchSpeed;
    
    // Apply movement input
    this.applyMovement(deltaTime, playerVelocity, currentSpeed);
    
    // Apply damping
    const damping = Math.exp(-4 * deltaTime) - 1;
    const airDamping = this.isInAir ? PLAYER_CONFIG.airControl : 1;
    playerVelocity.addScaledVector(playerVelocity, damping * airDamping);
    
    // Update collider position
    playerCollider.translate(playerVelocity.clone().multiplyScalar(deltaTime));
    
    // Handle collisions
    this.handleCollisions(playerCollider, playerVelocity, worldOctree);
    
    // Update camera position to match collider
    if (playerCollider && playerCollider.end) {
      this.camera.position.copy(playerCollider.end);
      
      // Apply height transition for crouching
      const targetCameraY = this.isCrouching ? 
        PLAYER_CONFIG.crouchHeight - 0.2 : 
        PLAYER_CONFIG.standHeight - 0.2;
      
      this.currentHeight = THREE.MathUtils.lerp(
        this.currentHeight, 
        targetCameraY, 
        PLAYER_CONFIG.crouchTransitionSpeed * deltaTime
      );
      
      this.camera.position.y = playerCollider.end.y + (this.currentHeight - PLAYER_CONFIG.standHeight + 0.2);
    }
    
    // Update FOV
    this.updateFOV(deltaTime);
    
    // Update head bob
    this.updateHeadBob(deltaTime, currentSpeed);
    
    // Update camera sway
    this.updateCameraSway(deltaTime);
    
    // Apply sway offset to camera
    this.camera.position.add(this.swayOffset);
  }
  
  checkOnGround(playerCollider, worldOctree) {
    if (!playerCollider || !worldOctree) return false;
    
    // Cast a short ray downward to check for ground
    const rayStart = playerCollider.end.clone();
    rayStart.y += 0.1;
    const rayEnd = playerCollider.end.clone();
    rayEnd.y -= 0.2;
    
    const result = worldOctree.capsuleIntersect(playerCollider);
    return result ? result.normal.y > 0 : false;
  }
  
  handleCollisions(playerCollider, playerVelocity, worldOctree) {
    const result = worldOctree.capsuleIntersect(playerCollider);
    
    if (result) {
      this.isOnGround = result.normal.y > 0;
      
      // Reflect velocity off collision normal
      playerVelocity.addScaledVector(
        result.normal,
        -result.normal.dot(playerVelocity)
      );
      
      // Push player out of collision
      playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
  
  applyMovement(deltaTime, playerVelocity, speed) {
    if (this.moveInput.lengthSq() < 0.01) return;
    
    // Get camera forward and right vectors (ignoring Y for movement)
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    // Calculate movement direction
    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(forward, -this.moveInput.y);
    moveDirection.addScaledVector(right, this.moveInput.x);
    moveDirection.normalize();
    
    // Apply movement force
    const acceleration = speed * 50 * deltaTime;
    playerVelocity.add(moveDirection.multiplyScalar(acceleration));
    
    // Clamp horizontal velocity
    const horizontalVel = new THREE.Vector3(playerVelocity.x, 0, playerVelocity.z);
    const maxSpeed = speed;
    if (horizontalVel.length() > maxSpeed) {
      horizontalVel.normalize().multiplyScalar(maxSpeed);
      playerVelocity.x = horizontalVel.x;
      playerVelocity.z = horizontalVel.z;
    }
  }
  
  performJump(playerVelocity) {
    playerVelocity.y = PLAYER_CONFIG.jumpForce;
    this.coyoteTimer = 0;
  }
  
  onLanding() {
    this.landingTimer = 0.3;
    // Apply FOV kick on landing
    this.targetFOV = PLAYER_CONFIG.baseFOV + PLAYER_CONFIG.landingFOVKick;
  }
  
  updateFOV(deltaTime) {
    // Determine target FOV
    if (this.isSprinting && !this.isCrouching) {
      this.targetFOV = PLAYER_CONFIG.sprintFOV;
    } else {
      this.targetFOV = PLAYER_CONFIG.baseFOV;
    }
    
    // Smoothly interpolate FOV
    this.currentFOV = THREE.MathUtils.lerp(
      this.currentFOV,
      this.targetFOV,
      PLAYER_CONFIG.fovTransitionSpeed * deltaTime
    );
    
    // Apply to camera
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();
  }
  
  updateHeadBob(deltaTime, speed) {
    if (!this.isOnGround || this.moveInput.lengthSq() < 0.01) {
      // Return to neutral position
      this.headBobPhase = THREE.MathUtils.lerp(this.headBobPhase, 0, 5 * deltaTime);
      return;
    }
    
    // Calculate bob frequency based on speed
    const bobSpeed = PLAYER_CONFIG.headBobFrequency * (speed / PLAYER_CONFIG.walkSpeed);
    const amplitude = PLAYER_CONFIG.headBobAmplitude * 
      (this.isSprinting ? PLAYER_CONFIG.headBobSprintMultiplier : 1);
    
    // Update phase
    this.headBobPhase += bobSpeed * deltaTime;
    
    // Calculate bob offset
    const bobX = Math.sin(this.headBobPhase * 2) * amplitude * 0.5;
    const bobY = Math.abs(Math.sin(this.headBobPhase)) * amplitude;
    
    // Apply subtle bob to camera (we'll add this in render)
    this.camera.position.x += bobX;
    this.camera.position.y += bobY;
  }
  
  updateCameraSway(deltaTime) {
    // Smoothly return sway to zero
    this.swayOffset.lerp(new THREE.Vector3(), PLAYER_CONFIG.cameraSwaySmoothness * deltaTime);
    
    // Reset mouse accumulator gradually
    this.mouseAccumulator.multiplyScalar(0.9);
  }
  
  // Input handlers
  setMoveInput(x, y) {
    this.moveInput.set(x, y);
  }
  
  setSprinting(isSprinting) {
    this.isSprinting = isSprinting;
  }
  
  setCrouching(isCrouching) {
    this.isCrouching = isCrouching;
  }
  
  requestJump() {
    this.jumpBufferTimer = PLAYER_CONFIG.jumpBufferTime;
  }
  
  onMouseMove(deltaX, deltaY) {
    // Accumulate mouse movement for sway effect
    this.mouseAccumulator.x += deltaX;
    this.mouseAccumulator.y += deltaY;
    
    // Apply sway based on mouse movement
    this.targetSwayOffset.x = -this.mouseAccumulator.y * PLAYER_CONFIG.cameraSwayAmount;
    this.targetSwayOffset.y = this.mouseAccumulator.x * PLAYER_CONFIG.cameraSwayAmount;
    
    this.swayOffset.lerp(this.targetSwayOffset, 0.1);
  }
  
  getIsCrouching() {
    return this.isCrouching;
  }
  
  getIsSprinting() {
    return this.isSprinting;
  }
}

export { PlayerController, PLAYER_CONFIG };
