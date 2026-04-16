// ============================================
// ASSET LOADER SYSTEM
// Centralized asset management for .glb/.gltf models
// Implements loading queue, caching, and progress tracking
// ============================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Asset types supported by the loader
 * @enum {string}
 */
const ASSET_TYPE = {
  MODEL: 'model',
  TEXTURE: 'texture',
  AUDIO: 'audio',
  JSON: 'json',
};

/**
 * Loading states for assets
 * @enum {string}
 */
const LOAD_STATE = {
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

/**
 * Centralized Asset Loading System
 * Handles all game assets with caching, progress tracking, and batch loading
 * 
 * @class AssetLoader
 */
class AssetLoader {
  constructor() {
    // Loaders
    this._gltfLoader = new GLTFLoader();
    this._textureLoader = new THREE.TextureLoader();
    this._audioLoader = new THREE.AudioLoader();
    
    // Setup DRACO decoder for compressed models
    this._dracoLoader = new DRACOLoader();
    this._dracoLoader.setDecoderPath('/draco/');
    this._gltfLoader.setDRACOLoader(this._dracoLoader);
    
    // Asset cache - prevents duplicate loading
    this._cache = new Map();
    
    // Loading queue for batch operations
    this._queue = [];
    this._isProcessingQueue = false;
    
    // Progress tracking
    this._totalToLoad = 0;
    this._totalLoaded = 0;
    this._onProgressCallback = null;
    this._onCompleteCallback = null;
    
    // Asset manifests by category
    this._manifests = {
      weapons: new Map(),
      enemies: new Map(),
      environment: new Map(),
      effects: new Map(),
    };
  }
  
  /**
   * Set progress callback for loading operations
   * @param {Function} callback - Called with (loaded, total, currentAsset)
   */
  setProgressCallback(callback) {
    this._onProgressCallback = callback;
  }
  
  /**
   * Set completion callback for batch loading
   * @param {Function} callback - Called when all queued assets are loaded
   */
  setCompleteCallback(callback) {
    this._onCompleteCallback = callback;
  }
  
  /**
   * Register an asset in the manifest for later loading
   * @param {string} category - Asset category (weapons, enemies, etc.)
   * @param {string} id - Unique asset identifier
   * @param {Object} config - Asset configuration
   */
  registerAsset(category, id, config) {
    if (!this._manifests[category]) {
      this._manifests[category] = new Map();
    }
    
    this._manifests[category].set(id, {
      id,
      path: config.path,
      type: config.type || ASSET_TYPE.MODEL,
      scale: config.scale || 1,
      offset: config.offset || { x: 0, y: 0, z: 0 },
      animations: config.animations || [],
      state: LOAD_STATE.PENDING,
      asset: null,
    });
  }
  
  /**
   * Load a single GLTF/GLB model
   * @param {string} path - Path to the model file
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} - Loaded model with scene, animations, etc.
   */
  async loadModel(path, options = {}) {
    // Check cache first
    if (this._cache.has(path)) {
      const cached = this._cache.get(path);
      // Clone for independent instances
      return this._cloneGLTF(cached);
    }
    
    return new Promise((resolve, reject) => {
      this._gltfLoader.load(
        path,
        (gltf) => {
          // Process the model
          const processed = this._processModel(gltf, options);
          
          // Cache the original
          this._cache.set(path, gltf);
          
          resolve(processed);
        },
        (progress) => {
          if (this._onProgressCallback && progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            this._onProgressCallback(progress.loaded, progress.total, path);
          }
        },
        (error) => {
          console.error(`[AssetLoader] Failed to load model: ${path}`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Load a texture
   * @param {string} path - Path to texture file
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(path) {
    if (this._cache.has(path)) {
      return this._cache.get(path);
    }
    
    return new Promise((resolve, reject) => {
      this._textureLoader.load(
        path,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this._cache.set(path, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`[AssetLoader] Failed to load texture: ${path}`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Load an audio buffer
   * @param {string} path - Path to audio file
   * @returns {Promise<AudioBuffer>}
   */
  async loadAudio(path) {
    if (this._cache.has(path)) {
      return this._cache.get(path);
    }
    
    return new Promise((resolve, reject) => {
      this._audioLoader.load(
        path,
        (buffer) => {
          this._cache.set(path, buffer);
          resolve(buffer);
        },
        undefined,
        (error) => {
          console.error(`[AssetLoader] Failed to load audio: ${path}`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Load JSON data
   * @param {string} path - Path to JSON file
   * @returns {Promise<Object>}
   */
  async loadJSON(path) {
    if (this._cache.has(path)) {
      return this._cache.get(path);
    }
    
    try {
      const response = await fetch(path);
      const data = await response.json();
      this._cache.set(path, data);
      return data;
    } catch (error) {
      console.error(`[AssetLoader] Failed to load JSON: ${path}`, error);
      throw error;
    }
  }
  
  /**
   * Queue multiple assets for batch loading
   * @param {Array<Object>} assets - Array of { path, type, options }
   */
  queueAssets(assets) {
    this._queue.push(...assets);
    this._totalToLoad += assets.length;
  }
  
  /**
   * Load all registered assets in a category
   * @param {string} category - Category name
   * @returns {Promise<Map>} - Map of loaded assets by ID
   */
  async loadCategory(category) {
    const manifest = this._manifests[category];
    if (!manifest) {
      console.warn(`[AssetLoader] Unknown category: ${category}`);
      return new Map();
    }
    
    const results = new Map();
    const entries = Array.from(manifest.entries());
    
    for (const [id, config] of entries) {
      try {
        config.state = LOAD_STATE.LOADING;
        
        let asset;
        switch (config.type) {
          case ASSET_TYPE.MODEL:
            asset = await this.loadModel(config.path, config);
            break;
          case ASSET_TYPE.TEXTURE:
            asset = await this.loadTexture(config.path);
            break;
          case ASSET_TYPE.AUDIO:
            asset = await this.loadAudio(config.path);
            break;
          case ASSET_TYPE.JSON:
            asset = await this.loadJSON(config.path);
            break;
        }
        
        config.asset = asset;
        config.state = LOAD_STATE.LOADED;
        results.set(id, asset);
        
      } catch (error) {
        config.state = LOAD_STATE.ERROR;
        console.error(`[AssetLoader] Failed to load ${id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Process the loading queue
   * @returns {Promise<Array>} - Array of loaded assets
   */
  async processQueue() {
    if (this._isProcessingQueue) return;
    this._isProcessingQueue = true;
    
    const results = [];
    
    while (this._queue.length > 0) {
      const item = this._queue.shift();
      
      try {
        let asset;
        switch (item.type) {
          case ASSET_TYPE.MODEL:
            asset = await this.loadModel(item.path, item.options);
            break;
          case ASSET_TYPE.TEXTURE:
            asset = await this.loadTexture(item.path);
            break;
          case ASSET_TYPE.AUDIO:
            asset = await this.loadAudio(item.path);
            break;
          default:
            asset = await this.loadModel(item.path, item.options);
        }
        
        results.push({ path: item.path, asset, success: true });
        
      } catch (error) {
        results.push({ path: item.path, error, success: false });
      }
      
      this._totalLoaded++;
      
      if (this._onProgressCallback) {
        this._onProgressCallback(this._totalLoaded, this._totalToLoad, item.path);
      }
    }
    
    this._isProcessingQueue = false;
    
    if (this._onCompleteCallback) {
      this._onCompleteCallback(results);
    }
    
    // Reset counters
    this._totalToLoad = 0;
    this._totalLoaded = 0;
    
    return results;
  }
  
  /**
   * Get a cached asset
   * @param {string} path - Asset path
   * @returns {*} - Cached asset or null
   */
  getCached(path) {
    return this._cache.get(path) || null;
  }
  
  /**
   * Get asset from manifest by category and ID
   * @param {string} category - Asset category
   * @param {string} id - Asset ID
   * @returns {*} - Asset or null
   */
  getAsset(category, id) {
    const manifest = this._manifests[category];
    if (!manifest) return null;
    
    const config = manifest.get(id);
    return config ? config.asset : null;
  }
  
  /**
   * Check if an asset is loaded
   * @param {string} path - Asset path
   * @returns {boolean}
   */
  isLoaded(path) {
    return this._cache.has(path);
  }
  
  /**
   * Process a loaded model with options
   * @private
   * @param {Object} gltf - Loaded GLTF object
   * @param {Object} options - Processing options
   * @returns {Object} - Processed model
   */
  _processModel(gltf, options = {}) {
    const model = gltf.scene;
    
    // Apply scale
    if (options.scale) {
      model.scale.setScalar(options.scale);
    }
    
    // Apply offset
    if (options.offset) {
      model.position.set(
        options.offset.x || 0,
        options.offset.y || 0,
        options.offset.z || 0
      );
    }
    
    // Setup shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Optimize materials
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
    
    // Setup animation mixer if animations exist
    let mixer = null;
    const animations = {};
    
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        animations[clip.name] = action;
      });
    }
    
    return {
      scene: model,
      animations,
      mixer,
      originalGltf: gltf,
    };
  }
  
  /**
   * Clone a GLTF for independent instances
   * @private
   * @param {Object} gltf - Original GLTF
   * @returns {Object} - Cloned and processed model
   */
  _cloneGLTF(gltf) {
    const clonedScene = gltf.scene.clone(true);
    
    // Clone materials to allow independent modifications
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });
    
    // Setup new animation mixer
    let mixer = null;
    const animations = {};
    
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(clonedScene);
      
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        animations[clip.name] = action;
      });
    }
    
    return {
      scene: clonedScene,
      animations,
      mixer,
      originalGltf: gltf,
    };
  }
  
  /**
   * Preload essential game assets
   * @param {Object} config - Preload configuration
   * @returns {Promise<Object>} - Loaded assets by category
   */
  async preloadEssentials(config) {
    const results = {
      weapons: new Map(),
      enemies: new Map(),
      environment: new Map(),
    };
    
    // Register weapon assets
    if (config.weapons) {
      for (const [id, weaponConfig] of Object.entries(config.weapons)) {
        this.registerAsset('weapons', id, {
          path: weaponConfig.modelPath,
          type: ASSET_TYPE.MODEL,
          scale: weaponConfig.modelScale || 1,
        });
      }
      results.weapons = await this.loadCategory('weapons');
    }
    
    // Register enemy assets
    if (config.enemies) {
      for (const [id, enemyConfig] of Object.entries(config.enemies)) {
        this.registerAsset('enemies', id, {
          path: enemyConfig.modelPath,
          type: ASSET_TYPE.MODEL,
          scale: enemyConfig.modelScale || 1,
        });
      }
      results.enemies = await this.loadCategory('enemies');
    }
    
    return results;
  }
  
  /**
   * Clear all cached assets
   */
  clearCache() {
    // Dispose of Three.js objects
    this._cache.forEach((asset, path) => {
      if (asset.dispose) {
        asset.dispose();
      } else if (asset.scene) {
        asset.scene.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    });
    
    this._cache.clear();
    
    // Reset manifests
    Object.values(this._manifests).forEach(manifest => {
      manifest.forEach(config => {
        config.state = LOAD_STATE.PENDING;
        config.asset = null;
      });
    });
  }
  
  /**
   * Dispose of the asset loader
   */
  dispose() {
    this.clearCache();
    this._dracoLoader.dispose();
    this._queue = [];
  }
}

// Create singleton instance
const assetLoader = new AssetLoader();

export {
  AssetLoader,
  assetLoader,
  ASSET_TYPE,
  LOAD_STATE,
};
