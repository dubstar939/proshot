/**
 * Performance Monitor for Production Deployment
 * Tracks FPS, memory, draw calls, and provides real-time diagnostics
 * Optimized for Vercel with minimal overhead
 */

import * as THREE from 'three';

export class PerformanceMonitor {
  constructor() {
    this.enabled = true;
    this.showOverlay = false;
    
    // Metrics storage
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      minFPS: 60,
      maxFPS: 60,
      avgFPS: 60,
      memoryUsed: 0,
      memoryLimit: 0,
      drawCalls: 0,
      triangles: 0,
      textures: 0,
      geometries: 0
    };
    
    // History for trend analysis
    this._fpsHistory = [];
    this._historySize = 120; // 2 seconds at 60fps
    
    // Counters
    this._frameCount = 0;
    this._lastTime = performance.now();
    this._updateInterval = 500; // Update every 500ms
    
    // Thresholds for warnings
    this.thresholds = {
      fpsWarning: 30,
      fpsCritical: 20,
      memoryWarning: 0.8,
      memoryCritical: 0.9
    };
    
    // Callbacks
    this.onLowFPS = null;
    this.onHighMemory = null;
    
    // DOM elements (lazy created)
    this._overlay = null;
    this._fpsElement = null;
    this._memoryElement = null;
    this._warningElement = null;
    
    // Renderer reference
    this._renderer = null;
    this._scene = null;
  }
  
  /**
   * Initialize monitor with renderer and scene references
   */
  init(renderer, scene) {
    this._renderer = renderer;
    this._scene = scene;
    
    if (this.showOverlay) {
      this._createOverlay();
    }
  }
  
  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this._overlay) {
      this._overlay.style.display = 'none';
    } else if (enabled && this._overlay) {
      this._overlay.style.display = 'block';
    }
  }
  
  /**
   * Toggle overlay visibility
   */
  toggleOverlay() {
    this.showOverlay = !this.showOverlay;
    
    if (this.showOverlay && !this._overlay) {
      this._createOverlay();
    }
    
    if (this._overlay) {
      this._overlay.style.display = this.showOverlay ? 'block' : 'none';
    }
  }
  
  /**
   * Create performance overlay DOM
   */
  _createOverlay() {
    if (this._overlay) return;
    
    this._overlay = document.createElement('div');
    this._overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 4px;
      z-index: 9999;
      pointer-events: none;
      user-select: none;
    `;
    
    this._fpsElement = document.createElement('div');
    this._fpsElement.textContent = 'FPS: 60';
    
    this._memoryElement = document.createElement('div');
    this._memoryElement.textContent = 'Memory: --';
    
    this._warningElement = document.createElement('div');
    this._warningElement.style.color = '#ff0';
    this._warningElement.textContent = '';
    
    this._overlay.appendChild(this._fpsElement);
    this._overlay.appendChild(this._memoryElement);
    this._overlay.appendChild(this._warningElement);
    
    document.body.appendChild(this._overlay);
  }
  
  /**
   * Update metrics - call every frame
   */
  update(deltaTime) {
    if (!this.enabled) return;
    
    this._frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this._lastTime;
    
    // Update FPS every updateInterval ms
    if (elapsed >= this._updateInterval) {
      const fps = Math.round(this._frameCount * (1000 / elapsed));
      
      // Track history
      this._fpsHistory.push(fps);
      if (this._fpsHistory.length > this._historySize) {
        this._fpsHistory.shift();
      }
      
      // Calculate stats
      this.metrics.fps = fps;
      this.metrics.frameTime = (elapsed / this._frameCount).toFixed(2);
      this.metrics.minFPS = Math.min(...this._fpsHistory);
      this.metrics.maxFPS = Math.max(...this._fpsHistory);
      this.metrics.avgFPS = Math.round(
        this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length
      );
      
      // Memory tracking
      if (performance.memory) {
        this.metrics.memoryUsed = performance.memory.usedJSHeapSize;
        this.metrics.memoryLimit = performance.memory.jsHeapSizeLimit;
      }
      
      // Renderer stats (if available)
      if (this._renderer) {
        this.metrics.drawCalls = this._renderer.info.render.calls;
        this.metrics.triangles = this._renderer.info.render.triangles;
        this.metrics.textures = this._renderer.info.memory.textures;
        this.metrics.geometries = this._renderer.info.memory.geometries;
      }
      
      // Check thresholds
      this._checkThresholds();
      
      // Update overlay
      if (this.showOverlay && this._overlay) {
        this._updateOverlay();
      }
      
      // Reset counters
      this._frameCount = 0;
      this._lastTime = currentTime;
    }
  }
  
  /**
   * Check performance thresholds and trigger callbacks
   */
  _checkThresholds() {
    // FPS warnings
    if (this.metrics.fps < this.thresholds.fpsCritical) {
      this._triggerWarning('critical', `FPS Critical: ${this.metrics.fps}`);
    } else if (this.metrics.fps < this.thresholds.fpsWarning) {
      this._triggerWarning('warning', `Low FPS: ${this.metrics.fps}`);
    }
    
    // Memory warnings
    if (performance.memory) {
      const usage = this.metrics.memoryUsed / this.metrics.memoryLimit;
      
      if (usage > this.thresholds.memoryCritical) {
        this._triggerWarning('critical', `Memory Critical: ${(usage * 100).toFixed(1)}%`);
      } else if (usage > this.thresholds.memoryWarning) {
        this._triggerWarning('warning', `High Memory: ${(usage * 100).toFixed(1)}%`);
      }
    }
  }
  
  /**
   * Trigger warning callback
   */
  _triggerWarning(level, message) {
    if (this._warningElement) {
      this._warningElement.textContent = message;
      this._warningElement.style.color = level === 'critical' ? '#f00' : '#ff0';
    }
    
    if (level === 'critical' && this.onLowFPS) {
      this.onLowFPS({ level, message, ...this.metrics });
    }
  }
  
  /**
   * Update overlay display
   */
  _updateOverlay() {
    if (!this._overlay) return;
    
    const fpsColor = this.metrics.fps >= 50 ? '#0f0' : 
                     this.metrics.fps >= 30 ? '#ff0' : '#f00';
    
    this._fpsElement.innerHTML = `
      FPS: <span style="color:${fpsColor}">${this.metrics.fps}</span> | 
      Min: ${this.metrics.minFPS} | 
      Avg: ${this.metrics.avgFPS} | 
      Max: ${this.metrics.maxFPS}
    `;
    
    if (performance.memory) {
      const memMB = (this.metrics.memoryUsed / 1048576).toFixed(1);
      const memPercent = ((this.metrics.memoryUsed / this.metrics.memoryLimit) * 100).toFixed(1);
      this._memoryElement.textContent = `Memory: ${memMB} MB (${memPercent}%)`;
    }
    
    if (this._renderer) {
      const extraInfo = document.createElement('div');
      extraInfo.style.fontSize = '10px';
      extraInfo.style.color = '#aaa';
      extraInfo.textContent = `Draw: ${this.metrics.drawCalls} | Tris: ${(this.metrics.triangles/1000).toFixed(1)}k`;
      
      // Remove old extra info if exists
      const oldExtra = this._overlay.querySelector('.extra-info');
      if (oldExtra) oldExtra.remove();
      
      extraInfo.className = 'extra-info';
      this._overlay.appendChild(extraInfo);
    }
  }
  
  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    return { ...this.metrics };
  }
  
  /**
   * Get FPS history for graphing
   */
  getFPSHistory() {
    return [...this._fpsHistory];
  }
  
  /**
   * Reset all metrics
   */
  reset() {
    this._fpsHistory = [];
    this._frameCount = 0;
    this._lastTime = performance.now();
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      minFPS: 60,
      maxFPS: 60,
      avgFPS: 60,
      memoryUsed: 0,
      memoryLimit: 0,
      drawCalls: 0,
      triangles: 0,
      textures: 0,
      geometries: 0
    };
    
    if (this._warningElement) {
      this._warningElement.textContent = '';
    }
  }
  
  /**
   * Cleanup and remove overlay
   */
  dispose() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
      this._fpsElement = null;
      this._memoryElement = null;
      this._warningElement = null;
    }
    
    this._fpsHistory = [];
    this._renderer = null;
    this._scene = null;
  }
}

// Singleton instance for global access
let _instance = null;

export function getPerformanceMonitor() {
  if (!_instance) {
    _instance = new PerformanceMonitor();
  }
  return _instance;
}
