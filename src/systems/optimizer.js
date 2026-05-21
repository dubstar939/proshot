/**
 * PRODUCTION-READY OPTIMIZATION SYSTEM
 * Performance monitoring, object pooling, frustum culling, memory management
 * Optimized for Vercel deployment with minimal GC pressure and efficient rendering
 */

import * as THREE from 'three';

/**
 * Object Pool for efficient reuse of game objects
 * Reduces garbage collection pressure and allocation overhead
 */
export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.available = [];
    this.active = new Set();
    
    // Pre-allocate to avoid runtime allocations
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }
  
  acquire() {
    let obj;
    if (this.available.length > 0) {
      obj = this.available.pop();
    } else {
      obj = this.createFn();
    }
    this.active.add(obj);
    return obj;
  }
  
  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      this.resetFn(obj);
      this.available.push(obj);
    }
  }
  
  releaseAll() {
    this.active.forEach(obj => {
      this.resetFn(obj);
      this.available.push(obj);
    });
    this.active.clear();
  }
  
  get activeCount() { return this.active.size; }
  get availableCount() { return this.available.length; }
}

/**
 * Main Optimizer System for production FPS
 * Handles FPS monitoring, object pooling, LOD, frustum culling, memory management
 */
export class OptimizerSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Performance metrics - cached for efficiency
    this._frameCount = 0;
    this._lastTime = performance.now();
    this.fps = 60;
    this.frameTime = 16.67;
    this._fpsHistory = [];
    this._historySize = 60;
    
    // Object pools using Map for better performance
    this._pools = new Map();
    
    // LOD management with throttling
    this._lodGroups = [];
    this._lodUpdateInterval = 0.1;
    this._lodAccumulator = 0;
    
    // Frustum culling - pre-allocated matrices to avoid GC
    this._frustum = new THREE.Frustum();
    this._projectionMatrix = new THREE.Matrix4();
    this._cameraMatrix = new THREE.Matrix4();
    this._cullableObjects = [];
    
    // Conservative budgets for web deployment
    this.budgets = {
      maxDrawCalls: 150,
      maxTriangles: 75000,
      maxActiveEnemies: 20,
      maxActiveProjectiles: 50,
      targetFPS: 60,
      minFPS: 30
    };
    
    // Memory management
    this._memoryCheckInterval = 5000;
    this._lastMemoryCheck = 0;
    this._memoryWarningThreshold = 0.8;
    
    // Auto quality adjustment
    this._autoAdjustQuality = true;
    this._qualityLevel = 1.0;
    this._adjustmentCooldown = 0;
    
    // UI visibility cache to reduce DOM operations
    this._visibilityCache = new Map();
    
    this._initPools();
  }
  
  /**
   * Initialize object pools with factory functions
   */
  _initPools() {
    // Projectile pool
    this.registerPool('projectile', 
      () => ({ active: false, mesh: null, velocity: new THREE.Vector3() }),
      (obj) => { obj.active = false; obj.velocity.set(0, 0, 0); },
      30
    );
    
    // Effect pool
    this.registerPool('effect',
      () => ({ active: false, mesh: null, lifetime: 0, age: 0 }),
      (obj) => { obj.active = false; obj.age = 0; },
      40
    );
    
    // Enemy pool
    this.registerPool('enemy',
      () => ({ active: false, mesh: null, ai: null }),
      (obj) => { obj.active = false; },
      15
    );
    
    // Shell casing pool
    this.registerPool('shell',
      () => ({ active: false, mesh: null, velocity: new THREE.Vector3(), rotation: new THREE.Vector3() }),
      (obj) => { obj.active = false; obj.velocity.set(0, 0, 0); obj.rotation.set(0, 0, 0); },
      100
    );
  }
  
  /**
   * Register a new object pool
   */
  registerPool(name, createFn, resetFn, initialSize = 10) {
    this._pools.set(name, new ObjectPool(createFn, resetFn, initialSize));
  }
  
  /**
   * Get object from pool
   */
  getObjectFromPool(type) {
    const pool = this._pools.get(type);
    if (!pool) {
      console.warn(`Pool "${type}" not found`);
      return null;
    }
    return pool.acquire();
  }
  
  /**
   * Return object to pool
   */
  returnObjectToPool(type, object) {
    const pool = this._pools.get(type);
    if (!pool) return;
    pool.release(object);
  }
  
  /**
   * Main update loop
   */
  update(deltaTime) {
    this._updateFPS();
    this._updateLODs(deltaTime);
    this._updateFrustumCulling();
    this._checkMemory();
    this._autoAdjustQuality(deltaTime);
  }
  
  /**
   * Update FPS counter with smoothing
   */
  _updateFPS() {
    this._frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this._lastTime;
    
    if (elapsed >= 1000) {
      this.fps = Math.round(this._frameCount * (1000 / elapsed));
      this.frameTime = elapsed / this._frameCount;
      
      this._fpsHistory.push(this.fps);
      if (this._fpsHistory.length > this._historySize) {
        this._fpsHistory.shift();
      }
      
      this._frameCount = 0;
      this._lastTime = currentTime;
      
      if (this._autoAdjustQuality && this.fps < this.budgets.minFPS) {
        this._onLowFPS();
      }
    }
  }
  
  /**
   * Update LOD systems with throttling to reduce CPU load
   */
  _updateLODs(deltaTime) {
    this._lodAccumulator += deltaTime;
    
    if (this._lodAccumulator >= this._lodUpdateInterval) {
      this._lodAccumulator = 0;
      for (const lodGroup of this._lodGroups) {
        if (lodGroup.update) lodGroup.update();
      }
    }
  }
  
  /**
   * Update frustum culling matrices
   */
  _updateFrustumCulling() {
    if (!this.camera) return;
    
    this._projectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this._cameraMatrix.copy(this.camera.matrixWorld).invert()
    );
    
    this._frustum.setFromProjectionMatrix(this._projectionMatrix);
  }
  
  /**
   * Check if object is within camera view
   */
  isVisible(object) {
    if (!object.geometry || !object.geometry.boundingSphere) {
      return true;
    }
    
    const sphere = object.geometry.boundingSphere.clone();
    sphere.applyMatrix4(object.matrixWorld);
    
    return this._frustum.intersectsSphere(sphere);
  }
  
  /**
   * Register object for frustum culling
   */
  registerCullable(object) {
    this._cullableObjects.push(object);
    if (object.geometry && !object.geometry.boundingSphere) {
      object.geometry.computeBoundingSphere();
    }
  }
  
  /**
   * Perform frustum culling - hides objects outside camera view
   */
  cullObjects() {
    let culled = 0;
    
    for (const object of this._cullableObjects) {
      const visible = this.isVisible(object);
      if (object.visible !== visible) {
        object.visible = visible;
        culled++;
      }
    }
    
    return culled;
  }
  
  /**
   * Check memory usage periodically
   */
  _checkMemory() {
    const now = performance.now();
    if (now - this._lastMemoryCheck < this._memoryCheckInterval) return;
    
    this._lastMemoryCheck = now;
    
    if (performance.memory) {
      const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      if (usage > this._memoryWarningThreshold) {
        console.warn(`[Optimizer] High memory: ${(usage * 100).toFixed(1)}%`);
        this._triggerGarbageCollection();
      }
    }
  }
  
  /**
   * Free unused pooled objects to reduce memory pressure
   */
  _triggerGarbageCollection() {
    this._pools.forEach(pool => {
      const keepCount = Math.max(5, Math.floor(pool.availableCount / 2));
      while (pool.availableCount > keepCount) {
        pool.available.pop();
      }
    });
  }
  
  /**
   * Auto-adjust quality based on FPS performance
   */
  _autoAdjustQuality(deltaTime) {
    if (!this._autoAdjustQuality) return;
    
    this._adjustmentCooldown -= deltaTime;
    if (this._adjustmentCooldown > 0) return;
    
    const avgFPS = this._getAverageFPS();
    
    if (avgFPS < this.budgets.minFPS && this._qualityLevel > 0.5) {
      this._qualityLevel -= 0.1;
      this._adjustmentCooldown = 3;
      this._applyQualityLevel();
    } else if (avgFPS > this.budgets.targetFPS && this._qualityLevel < 1.0) {
      this._qualityLevel += 0.1;
      this._adjustmentCooldown = 3;
      this._applyQualityLevel();
    }
  }
  
  /**
   * Handle low FPS event
   */
  _onLowFPS() {
    window.dispatchEvent(new CustomEvent('lowFPS', { 
      detail: { fps: this.fps, frameTime: this.frameTime } 
    }));
  }
  
  /**
   * Apply quality settings (pixel ratio, shadows)
   */
  _applyQualityLevel() {
    if (this.camera && this.camera.userData.renderer) {
      const pixelRatio = Math.min(window.devicePixelRatio * this._qualityLevel, 2);
      this.camera.userData.renderer.setPixelRatio(pixelRatio);
    }
    
    const lights = this.scene.children.filter(c => c.isDirectionalLight);
    lights.forEach(light => {
      if (light.shadow) {
        const size = Math.floor(2048 * this._qualityLevel);
        light.shadow.mapSize.width = size;
        light.shadow.mapSize.height = size;
        light.shadow.needsUpdate = true;
      }
    });
  }
  
  /**
   * Get average FPS over history
   */
  _getAverageFPS() {
    if (this._fpsHistory.length === 0) return this.fps;
    return this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length;
  }
  
  /**
   * Add LOD group
   */
  addLODGroup(lodGroup) {
    this._lodGroups.push(lodGroup);
  }
  
  /**
   * Cache UI visibility to prevent redundant DOM operations
   */
  setUIVisibility(elementId, visible) {
    const cached = this._visibilityCache.get(elementId);
    if (cached === visible) return;
    
    this._visibilityCache.set(elementId, visible);
    const el = document.getElementById(elementId);
    if (el) el.style.display = visible ? 'block' : 'none';
  }
  
  /**
   * Batch multiple UI updates to minimize reflows
   */
  batchUpdateUI(updates) {
    const changes = [];
    
    for (const update of updates) {
      const cached = this._visibilityCache.get(update.id);
      if (cached !== update.visible) {
        changes.push(update);
        this._visibilityCache.set(update.id, update.visible);
      }
    }
    
    if (changes.length > 0) {
      requestAnimationFrame(() => {
        for (const change of changes) {
          const el = document.getElementById(change.id);
          if (el) el.style.display = change.visible ? 'block' : 'none';
        }
      });
    }
  }
  
  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {
      fps: this.fps,
      frameTime: this.frameTime.toFixed(2),
      avgFPS: this._getAverageFPS().toFixed(1),
      qualityLevel: this._qualityLevel.toFixed(1),
      pools: {},
      lodGroups: this._lodGroups.length,
      cullableObjects: this._cullableObjects.length
    };
    
    this._pools.forEach((pool, name) => {
      metrics.pools[name] = {
        active: pool.activeCount,
        available: pool.availableCount
      };
    });
    
    if (performance.memory) {
      metrics.memory = {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB',
        usage: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1) + '%'
      };
    }
    
    return metrics;
  }
  
  /**
   * Log metrics to console
   */
  logMetrics() {
    console.table(this.getPerformanceMetrics());
  }
  
  /**
   * Cleanup and dispose resources
   */
  dispose() {
    this._pools.forEach(pool => pool.releaseAll());
    this._pools.clear();
    this._lodGroups = [];
    this._cullableObjects = [];
    this._visibilityCache.clear();
    this._fpsHistory = [];
  }
}
