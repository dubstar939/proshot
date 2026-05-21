import * as THREE from "three";
import { Capsule , Octree } from "three/examples/jsm/Addons.js";

const GRAVITY = 30;
const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;
const STEPS_PER_FRAME = 5;

const spheres = [];
let sphereIdx = 0;

// Animation Variables
let lastShotTime = 0;
const isGunLoaded = false;
const clock = new THREE.Clock();

function createPhysics(scene, camera, gunHolder) {
  const worldOctree = new Octree();

  const playerCollider = new Capsule(
    new THREE.Vector3(0, 0.35, 0),
    new THREE.Vector3(0, 1, 0),
    0.35
  );

  const playerVelocity = new THREE.Vector3();
  const playerDirection = new THREE.Vector3();
  let playerOnFloor = false;

  // Create shooting spheres
  const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
  const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xadfe03 });

  for (let i = 0; i < NUM_SPHERES; i++) {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);

    spheres.push({
      mesh: sphere,
      collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
      velocity: new THREE.Vector3(),
    });
  }

  // ⚙️💡SHOOTER CONTROLS & SOUNDS
  const sounds = {
    shoot: new Audio("/sounds/laser.mp3"),
    reload: new Audio("/sounds/reload.mp3"),
  };

  let isReloading = false;
  let isAnimationPlaying = false;

  function playAction(animationName, soundKey, autoIdle = true, idleDelay = 300) {
    if (isAnimationPlaying) {return;}

    isAnimationPlaying = true;

    // Play the sound
    if (soundKey && sounds[soundKey]) {
      sounds[soundKey].pause();
      sounds[soundKey].currentTime = 0;
      sounds[soundKey].play().catch(() => {});
    }

    // Return to idle after action
    if (autoIdle) {
      setTimeout(() => {
        isAnimationPlaying = false;
      }, idleDelay);
    }

    // Handle reload animation completion
    if (animationName === "Armature|Reload") {
      setTimeout(() => {
        isReloading = false;
        isAnimationPlaying = false;
      }, 3000);
    }
  }

  let shotCount = 0;

  function throwBall(camera, playerDirection) {
    if (isReloading || isAnimationPlaying) {return;}

    const sphere = spheres[sphereIdx];

    const shootDirection = new THREE.Vector3();
    camera.getWorldDirection(shootDirection);
    shootDirection.normalize();

    sphere.collider.center
      .copy(playerCollider.end)
      .addScaledVector(shootDirection, playerCollider.radius * 1.5);

    const impulse = 15 + 30 * (1 - Math.exp(-0.001 * performance.now()));
    sphere.velocity.copy(shootDirection).multiplyScalar(impulse);

    playAction("Armature|Shoot", "shoot");

    shotCount++;
    lastShotTime = performance.now();

    sphereIdx = (sphereIdx + 1) % spheres.length;

    if (shotCount >= 10) {
      reloadGun();
      shotCount = 0;
    }
  }

  function reloadGun() {
    if (isReloading || isAnimationPlaying) {return;}

    isReloading = true;
    playAction("Armature|Reload", "reload", true, 3000);
    isAnimationPlaying = true;
  }

  function updatePlayer(deltaTime, worldOctree, camera) {
    if (!playerCollider || !playerCollider.end) {return;}

    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!playerOnFloor) {
      playerVelocity.y -= GRAVITY * deltaTime;
      damping *= 0.1;
    }

    playerVelocity.addScaledVector(playerVelocity, damping);
    playerCollider.translate(playerVelocity.clone().multiplyScalar(deltaTime));

    const result = worldOctree.capsuleIntersect(playerCollider);
    playerOnFloor = result ? result.normal.y > 0 : false;

    if (result) {
      playerVelocity.addScaledVector(
        result.normal,
        -result.normal.dot(playerVelocity)
      );
      playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }

    spheres.forEach((sphere) => {
      playerSphereCollision(sphere);
    });

    if (playerCollider && playerCollider.end) {
      camera.position.copy(playerCollider.end);
    }
  }

  function spheresCollisions() {
    for (let i = 0; i < spheres.length; i++) {
      const s1 = spheres[i];

      for (let j = i + 1; j < spheres.length; j++) {
        const s2 = spheres[j];

        const distanceSquared = s1.collider.center.distanceToSquared(
          s2.collider.center
        );
        const radiusSum = s1.collider.radius + s2.collider.radius;
        const radiusSumSquared = radiusSum * radiusSum;

        if (distanceSquared < radiusSumSquared) {
          const normal = new THREE.Vector3()
            .subVectors(s1.collider.center, s2.collider.center)
            .normalize();

          const v1 = normal.clone().multiplyScalar(normal.dot(s1.velocity));
          const v2 = normal.clone().multiplyScalar(normal.dot(s2.velocity));

          s1.velocity.add(v2).sub(v1);
          s2.velocity.add(v1).sub(v2);

          const distance = (radiusSum - Math.sqrt(distanceSquared)) / 2;
          s1.collider.center.addScaledVector(normal, distance);
          s2.collider.center.addScaledVector(normal, -distance);
        }
      }
    }
  }

  function playerSphereCollision(sphere) {
    if (!playerCollider) {return;}

    const center = new THREE.Vector3()
      .addVectors(playerCollider.start, playerCollider.end)
      .multiplyScalar(0.5);

    const sphereCenter = sphere.collider.center;
    const r = playerCollider.radius + sphere.collider.radius;
    const r2 = r * r;

    for (const point of [playerCollider.start, playerCollider.end, center]) {
      const d2 = point.distanceToSquared(sphereCenter);

      if (d2 < r2) {
        const normal = new THREE.Vector3()
          .subVectors(point, sphereCenter)
          .normalize();

        const v1 = normal.clone().multiplyScalar(normal.dot(sphere.velocity));
        const v2 = normal.clone().multiplyScalar(normal.dot(playerVelocity));

        const dampingFactor = 0.5;
        sphere.velocity.add(v1).sub(v2).multiplyScalar(dampingFactor);

        const rollingFriction = 0.98;
        sphere.velocity.multiplyScalar(rollingFriction);

        const d = (r - Math.sqrt(d2)) / 2;
        sphereCenter.addScaledVector(normal, -d);
      }
    }
  }

  function updateSpheres(deltaTime, worldOctree) {
    spheres.forEach((sphere) => {
      sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

      const result = worldOctree.sphereIntersect(sphere.collider);

      if (result) {
        if (sphere.velocity.length() < 0.2) {
          sphere.velocity.set(0, 0, 0);
        } else {
          sphere.velocity.addScaledVector(
            result.normal,
            -result.normal.dot(sphere.velocity) * 1.8
          );

          sphere.collider.center.add(
            result.normal.multiplyScalar(result.depth)
          );
        }
      } else {
        sphere.velocity.y -= GRAVITY * deltaTime;
      }

      const damping = Math.exp(-1.5 * deltaTime) - 1;
      sphere.velocity.addScaledVector(sphere.velocity, damping);

      sphere.mesh.position.copy(sphere.collider.center);
    });

    spheresCollisions();
  }

  return {
    playerCollider,
    playerVelocity,
    playerDirection,
    updatePlayer,
    updateSpheres,
    throwBall,
    worldOctree,
  };
}

export { createPhysics, STEPS_PER_FRAME };
