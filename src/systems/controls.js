import * as THREE from "three";

function setupControls(camera, playerVelocity, playerCollider, playerController, weaponManager, gameManager) {
  const keyStates = {};
  
  document.addEventListener(
    "keydown",
    (event) => (keyStates[event.code] = true)
  );
  document.addEventListener(
    "keyup",
    (event) => (keyStates[event.code] = false)
  );
  
  // Request pointer lock on click when playing
  document.body.addEventListener("click", () => {
    if (gameManager.getCurrentState() === 'playing') {
      document.body.requestPointerLock();
    }
  });
  
  // Mouse movement for camera look
  document.body.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === document.body) {
      // Apply mouse movement to camera rotation
      const sensitivity = parseFloat(localStorage.getItem('fps_sensitivity')) || 5;
      const sensitivityMultiplier = sensitivity / 5;
      
      camera.rotation.y -= event.movementX * 0.002 * sensitivityMultiplier;
      camera.rotation.x -= event.movementY * 0.002 * sensitivityMultiplier;
      
      // Clamp vertical look
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      
      // Apply to player controller for sway
      if (playerController) {
        playerController.onMouseMove(event.movementX, event.movementY);
      }
    }
  });
  
  // Mouse buttons for shooting and ADS
  document.body.addEventListener("mousedown", (event) => {
    if (document.pointerLockElement !== document.body) return;
    if (gameManager.getCurrentState() !== 'playing') return;
    
    if (event.button === 0) {
      // Left click - fire weapon
      const currentTime = performance.now() / 1000;
      weaponManager.fire(currentTime);
    } else if (event.button === 2) {
      // Right click - toggle ADS
      weaponManager.toggleADS();
    }
  });
  
  // Keyboard controls
  function applyControls(deltaTime) {
    if (!playerController) return;
    
    // Movement input
    let moveX = 0;
    let moveY = 0;
    
    if (keyStates["KeyW"]) moveY = 1;
    if (keyStates["KeyS"]) moveY = -1;
    if (keyStates["KeyA"]) moveX = -1;
    if (keyStates["KeyD"]) moveX = 1;
    
    // Normalize diagonal movement
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
    }
    
    playerController.setMoveInput(moveX, moveY);
    
    // Sprint
    playerController.setSprinting(keyStates["ShiftLeft"] || keyStates["ShiftRight"]);
    
    // Crouch
    playerController.setCrouching(keyStates["ControlLeft"] || keyStates["ControlRight"]);
    
    // Jump
    if (keyStates["Space"]) {
      playerController.requestJump();
      keyStates["Space"] = false; // Prevent holding jump
    }
    
    // Reload
    if (keyStates["KeyR"]) {
      weaponManager.reload();
      keyStates["KeyR"] = false; // Prevent holding reload
    }
    
    // Weapon switching
    if (keyStates["Digit1"]) {
      weaponManager.switchToWeapon('pistol');
      keyStates["Digit1"] = false;
    }
    if (keyStates["Digit2"]) {
      weaponManager.addWeapon('rifle');
      weaponManager.switchToWeapon('rifle');
      keyStates["Digit2"] = false;
    }
    if (keyStates["Digit3"]) {
      weaponManager.addWeapon('shotgun');
      weaponManager.switchToWeapon('shotgun');
      keyStates["Digit3"] = false;
    }
    if (keyStates["Digit4"]) {
      weaponManager.addWeapon('launcher');
      weaponManager.switchToWeapon('launcher');
      keyStates["Digit4"] = false;
    }
    
    // Cycle weapons with scroll
    // (Handled in wheel event below)
  }
  
  // Weapon cycling with scroll wheel
  document.body.addEventListener("wheel", (event) => {
    if (document.pointerLockElement !== document.body) return;
    if (gameManager.getCurrentState() !== 'playing') return;
    
    if (event.deltaY > 0) {
      weaponManager.cycleWeapon(1);
    } else if (event.deltaY < 0) {
      weaponManager.cycleWeapon(-1);
    }
  });
  
  // Interact with objects (E key)
  document.addEventListener("keydown", (event) => {
    if (event.code === "KeyE" && document.pointerLockElement === document.body) {
      // Could add interaction logic here for doors, pickups, etc.
      keyStates["KeyE"] = true;
    }
  });
  
  document.addEventListener("keyup", (event) => {
    if (event.code === "KeyE") {
      keyStates["KeyE"] = false;
    }
  });
  
  return applyControls;
}

export { setupControls };
