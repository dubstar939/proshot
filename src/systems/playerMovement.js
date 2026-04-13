import * as THREE from 'three';

export class PlayerMovement {
    constructor(camera, domElement, config = {}) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Configuration
        this.config = {
            walkSpeed: 5.0,
            sprintSpeed: 8.0,
            crouchSpeed: 2.5,
            slideSpeed: 12.0,
            jumpForce: 6.0,
            gravity: 20.0,
            staminaMax: 100,
            staminaDrain: 20,
            staminaRegen: 10,
            fallDamageThreshold: 10,
            fallDamageMultiplier: 5,
            headBobFrequency: 10,
            headBobAmplitude: 0.05,
            cameraSwayAmount: 0.002,
            ...config
        };

        // State
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isGrounded = false;
        this.isSprinting = false;
        this.isCrouching = false;
        this.isSliding = false;
        this.stamina = this.config.staminaMax;
        this.verticalVelocity = 0;
        this.lastGroundY = 0;
        
        // Head Bob & Sway
        this.headBobTimer = 0;
        this.cameraSwayOffset = new THREE.Vector3();
        this.originalCameraOffset = new THREE.Vector3(0, 1.6, 0); // Eye height
        
        // Input State
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        
        this.initInput();
    }

    initInput() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.moveForward = true; break;
                case 'ArrowLeft': case 'KeyA': this.moveLeft = true; break;
                case 'ArrowDown': case 'KeyS': this.moveBackward = true; break;
                case 'ArrowRight': case 'KeyD': this.moveRight = true; break;
                case 'Space': 
                    if (this.canJump && this.isGrounded) {
                        this.verticalVelocity = this.config.jumpForce;
                        this.isGrounded = false;
                        this.canJump = false;
                    }
                    break;
                case 'ShiftLeft': this.isSprinting = true; break;
                case 'ControlLeft': 
                    if (!this.isCrouching && !this.isSliding && this.isGrounded) {
                        this.startCrouch();
                    }
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.moveForward = false; break;
                case 'ArrowLeft': case 'KeyA': this.moveLeft = false; break;
                case 'ArrowDown': case 'KeyS': this.moveBackward = false; break;
                case 'ArrowRight': case 'KeyD': this.moveRight = false; break;
                case 'ShiftLeft': this.isSprinting = false; break;
                case 'ControlLeft': this.stopCrouch(); break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }

    startCrouch() {
        this.isCrouching = true;
        // Slide logic if moving fast
        const currentSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();
        if (currentSpeed > this.config.walkSpeed * 0.8) {
            this.isSliding = true;
            setTimeout(() => { this.isSliding = false; }, 0.5); // Slide duration
        }
    }

    stopCrouch() {
        this.isCrouching = false;
        this.isSliding = false;
    }

    update(delta, octree) {
        // Stamina Management
        if (this.isSprinting && !this.isCrouching && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
            this.stamina = Math.max(0, this.stamina - this.config.staminaDrain * delta);
            if (this.stamina <= 0) this.isSprinting = false;
        } else if (!this.isSprinting) {
            this.stamina = Math.min(this.config.staminaMax, this.stamina + this.config.staminaRegen * delta);
        }

        // Determine Speed
        let speed = this.config.walkSpeed;
        if (this.isSliding) speed = this.config.slideSpeed;
        else if (this.isSprinting) speed = this.config.sprintSpeed;
        else if (this.isCrouching) speed = this.config.crouchSpeed;

        // Calculate Movement Direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Apply Velocity (Horizontal)
        const actualSpeed = this.isSliding ? this.config.slideSpeed : speed;
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * actualSpeed * delta * 10; // Acceleration
        } else {
            this.velocity.z *= 0.9; // Friction
        }
        
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * actualSpeed * delta * 10;
        } else {
            this.velocity.x *= 0.9;
        }

        // Apply Gravity
        this.verticalVelocity -= this.config.gravity * delta;
        
        // Move Camera (Simple integration, real physics needs octree raycasts)
        // Note: In a full implementation, we use octree.getSurfaceNormal for sliding/collision
        const oldY = this.camera.position.y;
        
        // Apply horizontal movement relative to camera look direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0; forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0; right.normalize();

        const moveVec = new THREE.Vector3();
        moveVec.addScaledVector(forward, -this.velocity.z * delta);
        moveVec.addScaledVector(right, -this.velocity.x * delta);
        
        this.camera.position.add(moveVec);
        this.camera.position.y += this.verticalVelocity * delta;

        // Simple Floor Collision (Replace with Octree logic for complex maps)
        if (this.camera.position.y < this.originalCameraOffset.y) {
            this.camera.position.y = this.originalCameraOffset.y;
            this.verticalVelocity = 0;
            
            // Fall Damage Check
            if (!this.isGrounded && (oldY - this.camera.position.y) > this.config.fallDamageThreshold) {
                const damage = (oldY - this.camera.position.y - this.config.fallDamageThreshold) * this.config.fallDamageMultiplier;
                this.triggerFallDamage(damage);
            }
            
            this.isGrounded = true;
            this.canJump = true;
            this.lastGroundY = this.camera.position.y;
        } else {
            this.isGrounded = false;
        }

        // Head Bob
        if (this.isGrounded && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) && !this.isCrouching) {
            this.headBobTimer += delta * (this.isSprinting ? this.config.headBobFrequency * 1.5 : this.config.headBobFrequency);
            const bobOffset = Math.sin(this.headBobTimer) * this.config.headBobAmplitude;
            this.camera.position.y += bobOffset * delta; // Subtle vertical bob
        }

        // Camera Sway (Idle/Movement)
        const swayX = Math.sin(Date.now() * 0.001) * this.config.cameraSwayAmount;
        const swayY = Math.cos(Date.now() * 0.0015) * this.config.cameraSwayAmount;
        this.cameraSwayOffset.set(swayX, swayY, 0);
        // Apply sway subtly to rotation or position if needed
    }

    triggerFallDamage(amount) {
        console.log(`Fall damage taken: ${amount}`);
        // Dispatch event for HUD/GameFlow to handle
        window.dispatchEvent(new CustomEvent('playerDamage', { detail: { amount, type: 'fall' } }));
    }

    getStamina() {
        return this.stamina;
    }

    isMoving() {
        return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    }
}
