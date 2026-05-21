/**
 * Test Setup File
 * Initializes test environment and global mocks
 */

import { vi } from 'vitest';

// Mock Three.js modules
vi.mock('three', () => {
  return {
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      traverse: vi.fn(),
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      rotation: { order: 'YXZ' },
      position: { set: vi.fn() },
      updateMatrixWorld: vi.fn(),
      matrixWorld: null,
      up: { x: 0, y: 1, z: 0 },
    })),
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      domElement: document.createElement('canvas'),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      setAnimationLoop: vi.fn(),
      shadowMap: {},
      outputColorSpace: null,
    })),
    Clock: vi.fn().mockImplementation(() => ({
      getDelta: vi.fn(() => 0.016),
    })),
    Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
      x,
      y,
      z,
      set: vi.fn(),
      copy: vi.fn(),
      add: vi.fn(),
      multiplyScalar: vi.fn(),
      normalize: vi.fn(),
      clone: vi.fn(),
    })),
    Object3D: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      position: { set: vi.fn() },
      rotation: { set: vi.fn() },
      scale: { set: vi.fn() },
      updateMatrixWorld: vi.fn(),
    })),
    AnimationMixer: vi.fn().mockImplementation(() => ({
      update: vi.fn(),
      clipAction: vi.fn(() => ({
        play: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
      })),
    })),
    AmbientLight: vi.fn().mockImplementation(() => ({})),
    DirectionalLight: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      castShadow: false,
      shadow: {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0 },
      },
    })),
    MeshStandardMaterial: vi.fn().mockImplementation(() => ({})),
    BoxGeometry: vi.fn().mockImplementation(() => ({})),
    PlaneGeometry: vi.fn().mockImplementation(() => ({})),
    Mesh: vi.fn().mockImplementation(() => ({
      castShadow: false,
      receiveShadow: false,
      userData: {},
    })),
    SRGBColorSpace: 'srgb',
    PCFSoftShadowMap: 1,
  };
});

// Mock GLTFLoader
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn((url, onLoad) => {
      // Simulate async loading
      setTimeout(() => {
        onLoad({
          scene: { traverse: vi.fn() },
          animations: [],
        });
      }, 0);
    }),
  })),
}));

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  loop: false,
  volume: 1,
  currentTime: 0,
}));

// Mock performance.now
global.performance = {
  now: vi.fn(() => Date.now()),
};

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn();

// Mock Pointer Lock API
document.body.requestPointerLock = vi.fn();

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});
