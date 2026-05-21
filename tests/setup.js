/**
 * Test Setup File
 * Initializes test environment and global mocks
 */

import { vi } from 'vitest';

// Mock Three.js modules
vi.mock('three', () => {
  const mockVector3 = vi.fn((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    set: vi.fn(function(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; return this; }),
    copy: vi.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }),
    add: vi.fn(function(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }),
    addScaledVector: vi.fn(function(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }),
    multiplyScalar: vi.fn(function(s) { this.x *= s; this.y *= s; this.z *= s; return this; }),
    normalize: vi.fn(function() { return this; }),
    clone: vi.fn(function() { return mockVector3(this.x, this.y, this.z); }),
    subVectors: vi.fn(function(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }),
    length: vi.fn(function() { return Math.sqrt(this.x**2 + this.y**2 + this.z**2); }),
    distanceTo: vi.fn(function(v) { return Math.sqrt((this.x-v.x)**2 + (this.y-v.y)**2 + (this.z-v.z)**2); }),
    dot: vi.fn(function(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }),
    applyAxisAngle: vi.fn(function() { return this; }),
    toArray: vi.fn(function() { return [this.x, this.y, this.z]; }),
    fromArray: vi.fn(function(arr) { this.x = arr[0]; this.y = arr[1]; this.z = arr[2]; return this; }),
  }));

  const mockEuler = vi.fn((x = 0, y = 0, z = 0) => ({
    x, y, z,
  }));

  const mockBox3 = vi.fn((min, max) => ({
    min: min || mockVector3(),
    max: max || mockVector3(),
  }));

  const mockColor = vi.fn((hex) => ({
    setHex: vi.fn(),
    getHex: vi.fn(() => hex || 0xffffff),
  }));

  return {
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      traverse: vi.fn(),
      children: [],
      fog: null,
      background: null,
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      rotation: { order: 'YXZ' },
      position: mockVector3(),
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
    Vector3: mockVector3,
    Euler: mockEuler,
    Box3: mockBox3,
    Color: mockColor,
    Object3D: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      position: mockVector3(),
      rotation: mockEuler(),
      scale: mockVector3(1, 1, 1),
      updateMatrixWorld: vi.fn(),
      userData: {},
      traverse: vi.fn(),
    })),
    Group: vi.fn().mockImplementation(() => {
      const mockPos = {
        x: 0, y: 0, z: 0,
        set: vi.fn(function(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; return this; }),
        copy: vi.fn(function(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }),
        clone: vi.fn(function() { return { x: this.x, y: this.y, z: this.z }; }),
        add: vi.fn(function(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }),
        multiplyScalar: vi.fn(function(s) { this.x *= s; this.y *= s; this.z *= s; return this; }),
        normalize: vi.fn(function() { return this; }),
        length: vi.fn(function() { return Math.sqrt(this.x**2 + this.y**2 + this.z**2); }),
        distanceTo: vi.fn(function(v) { return Math.sqrt((this.x-v.x)**2 + (this.y-v.y)**2 + (this.z-v.z)**2); }),
      };
      return {
        add: vi.fn(),
        remove: vi.fn(),
        position: mockPos,
        rotation: { x: 0, y: 0, z: 0, order: 'YXZ' },
        scale: { x: 1, y: 1, z: 1 },
        userData: {},
        children: [],
        traverse: vi.fn((cb) => {}),
        uuid: Math.random().toString(36).substring(7),
      };
    }),
    Mesh: vi.fn().mockImplementation(() => ({
      castShadow: false,
      receiveShadow: false,
      userData: {},
      geometry: {},
      material: { color: mockColor(), dispose: vi.fn() },
      position: mockVector3(),
      rotation: mockEuler(),
      scale: mockVector3(1, 1, 1),
    })),
    AnimationMixer: vi.fn().mockImplementation(() => ({
      update: vi.fn(),
      clipAction: vi.fn(() => ({
        play: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
      })),
    })),
    AmbientLight: vi.fn().mockImplementation(() => ({
      intensity: 1,
      color: mockColor(),
    })),
    DirectionalLight: vi.fn().mockImplementation(() => ({
      position: mockVector3(),
      castShadow: false,
      shadow: {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 },
      },
      intensity: 1,
      color: mockColor(),
    })),
    PointLight: vi.fn().mockImplementation(() => ({
      position: mockVector3(),
    })),
    MeshStandardMaterial: vi.fn().mockImplementation(() => ({
      color: mockColor(),
      roughness: 0.5,
      metalness: 0.5,
      emissive: mockColor(0),
      emissiveIntensity: 0,
      transparent: false,
      opacity: 1,
      side: 0,
      dispose: vi.fn(),
    })),
    MeshBasicMaterial: vi.fn().mockImplementation(() => ({
      color: mockColor(),
      transparent: false,
      opacity: 1,
      side: 0,
      dispose: vi.fn(),
    })),
    BoxGeometry: vi.fn().mockImplementation(() => ({})),
    SphereGeometry: vi.fn().mockImplementation(() => ({})),
    CylinderGeometry: vi.fn().mockImplementation(() => ({})),
    CapsuleGeometry: vi.fn().mockImplementation(() => ({})),
    RingGeometry: vi.fn().mockImplementation(() => ({})),
    PlaneGeometry: vi.fn().mockImplementation(() => ({})),
    Raycaster: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      setFromCamera: vi.fn(),
      intersectObject: vi.fn(() => []),
      intersectObjects: vi.fn(() => []),
    })),
    FogExp2: vi.fn().mockImplementation(() => ({})),
    CubeTextureLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn(() => null),
    })),
    TextureLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn(() => null),
    })),
    DoubleSide: 2,
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
