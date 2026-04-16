// ============================================
// AUDIO MANAGER SYSTEM
// Web Audio API-based spatial audio system
// Sound pooling, categories, 3D positional audio
// Placeholder sound generation
// ============================================

import * as THREE from 'three';

/**
 * Audio categories for volume control
 * @enum {string}
 */
const AUDIO_CATEGORY = {
  MASTER: 'master',
  WEAPONS: 'weapons',
  FOOTSTEPS: 'footsteps',
  AMBIENT: 'ambient',
  UI: 'ui',
  ENEMY: 'enemy',
  MUSIC: 'music',
  VOICE: 'voice',
};

/**
 * Sound definition
 * @typedef {Object} SoundDefinition
 * @property {string} id - Unique identifier
 * @property {string} path - Path to audio file (optional if using placeholder)
 * @property {string} category - Audio category
 * @property {number} volume - Base volume (0-1)
 * @property {boolean} loop - Whether to loop
 * @property {boolean} spatial - Whether to use 3D positioning
 * @property {Object} placeholder - Placeholder config for generated sounds
 */

/**
 * Audio Manager - Handles all game audio with Web Audio API
 * Supports spatial 3D audio, sound pooling, and categories
 * 
 * @class AudioManager
 */
class AudioManager {
  /**
   * Create AudioManager
   * @param {THREE.Camera} camera - Camera for listener positioning
   */
  constructor(camera) {
    this.camera = camera;
    
    // Audio context
    this._context = null;
    this._listener = null;
    this._isInitialized = false;
    this._isSuspended = true;
    
    // Category gain nodes
    this._categoryGains = {};
    this._masterGain = null;
    
    // Sound pools for frequently used sounds
    this._soundPools = new Map();
    this._poolSize = 8;
    
    // Active sounds
    this._activeSounds = new Map();
    this._activeLoops = new Map();
    
    // Sound definitions
    this._definitions = new Map();
    
    // Loaded buffers
    this._buffers = new Map();
    
    // Volume settings
    this._volumes = {
      [AUDIO_CATEGORY.MASTER]: 1.0,
      [AUDIO_CATEGORY.WEAPONS]: 0.8,
      [AUDIO_CATEGORY.FOOTSTEPS]: 0.6,
      [AUDIO_CATEGORY.AMBIENT]: 0.5,
      [AUDIO_CATEGORY.UI]: 0.7,
      [AUDIO_CATEGORY.ENEMY]: 0.7,
      [AUDIO_CATEGORY.MUSIC]: 0.4,
      [AUDIO_CATEGORY.VOICE]: 0.9,
    };
    
    // Spatial audio settings
    this._spatialSettings = {
      refDistance: 1,
      maxDistance: 50,
      rolloffFactor: 1,
      distanceModel: 'inverse',
    };
    
    // Setup user interaction listener for audio context
    this._setupAutoResume();
  }
  
  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize() {
    if (this._isInitialized) return;
    
    try {
      // Create audio context
      this._context = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain
      this._masterGain = this._context.createGain();
      this._masterGain.connect(this._context.destination);
      this._masterGain.gain.value = this._volumes[AUDIO_CATEGORY.MASTER];
      
      // Create category gain nodes
      for (const category of Object.values(AUDIO_CATEGORY)) {
        if (category === AUDIO_CATEGORY.MASTER) continue;
        
        const gain = this._context.createGain();
        gain.connect(this._masterGain);
        gain.gain.value = this._volumes[category];
        this._categoryGains[category] = gain;
      }
      
      // Create listener
      this._listener = this._context.listener;
      
      this._isInitialized = true;
      this._isSuspended = this._context.state === 'suspended';
      
      console.log('[AudioManager] Initialized successfully');
      
    } catch (error) {
      console.error('[AudioManager] Failed to initialize:', error);
    }
  }
  
  /**
   * Setup auto-resume on user interaction
   * @private
   */
  _setupAutoResume() {
    const resume = async () => {
      if (!this._isInitialized) {
        await this.initialize();
      }
      
      if (this._context && this._context.state === 'suspended') {
        await this._context.resume();
        this._isSuspended = false;
      }
    };
    
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, resume, { once: false });
    });
  }
  
  /**
   * Register a sound definition
   * @param {string} id - Sound identifier
   * @param {SoundDefinition} definition - Sound configuration
   */
  registerSound(id, definition) {
    this._definitions.set(id, {
      id,
      path: definition.path || null,
      category: definition.category || AUDIO_CATEGORY.UI,
      volume: definition.volume !== undefined ? definition.volume : 1,
      loop: definition.loop || false,
      spatial: definition.spatial || false,
      placeholder: definition.placeholder || null,
      pooled: definition.pooled || false,
      pitch: definition.pitch || 1,
      pitchVariation: definition.pitchVariation || 0,
    });
  }
  
  /**
   * Register multiple sounds
   * @param {Object} sounds - Map of sound definitions
   */
  registerSounds(sounds) {
    for (const [id, definition] of Object.entries(sounds)) {
      this.registerSound(id, definition);
    }
  }
  
  /**
   * Load a sound buffer
   * @param {string} id - Sound identifier
   * @returns {Promise<AudioBuffer>}
   */
  async loadSound(id) {
    const definition = this._definitions.get(id);
    if (!definition) {
      console.warn(`[AudioManager] Sound "${id}" not registered`);
      return null;
    }
    
    if (this._buffers.has(id)) {
      return this._buffers.get(id);
    }
    
    // If no path, generate placeholder
    if (!definition.path && definition.placeholder) {
      const buffer = this._generatePlaceholderSound(definition.placeholder);
      this._buffers.set(id, buffer);
      return buffer;
    }
    
    // Load from file
    if (definition.path) {
      try {
        const response = await fetch(definition.path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this._context.decodeAudioData(arrayBuffer);
        this._buffers.set(id, audioBuffer);
        return audioBuffer;
      } catch (error) {
        console.error(`[AudioManager] Failed to load sound "${id}":`, error);
        // Generate fallback placeholder
        const buffer = this._generatePlaceholderSound({ type: 'noise', duration: 0.1 });
        this._buffers.set(id, buffer);
        return buffer;
      }
    }
    
    return null;
  }
  
  /**
   * Preload multiple sounds
   * @param {Array<string>} ids - Sound identifiers to preload
   * @returns {Promise}
   */
  async preloadSounds(ids) {
    await Promise.all(ids.map(id => this.loadSound(id)));
  }
  
  /**
   * Play a sound
   * @param {string} id - Sound identifier
   * @param {Object} options - Playback options
   * @returns {string} - Instance ID for controlling the sound
   */
  play(id, options = {}) {
    if (!this._isInitialized || this._isSuspended) {
      return null;
    }
    
    const definition = this._definitions.get(id);
    if (!definition) {
      console.warn(`[AudioManager] Sound "${id}" not registered`);
      return null;
    }
    
    const buffer = this._buffers.get(id);
    if (!buffer) {
      // Try to load on demand
      this.loadSound(id).then(() => this.play(id, options));
      return null;
    }
    
    // Create source
    const source = this._context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop !== undefined ? options.loop : definition.loop;
    
    // Apply pitch with variation
    const pitchVariation = definition.pitchVariation * (Math.random() * 2 - 1);
    source.playbackRate.value = (options.pitch || definition.pitch) + pitchVariation;
    
    // Create gain node for this instance
    const gainNode = this._context.createGain();
    const volume = (options.volume !== undefined ? options.volume : definition.volume);
    gainNode.gain.value = volume;
    
    // Connect to category
    const categoryGain = this._categoryGains[definition.category];
    
    // Spatial audio setup
    if (definition.spatial && options.position) {
      const panner = this._context.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = this._spatialSettings.distanceModel;
      panner.refDistance = this._spatialSettings.refDistance;
      panner.maxDistance = this._spatialSettings.maxDistance;
      panner.rolloffFactor = this._spatialSettings.rolloffFactor;
      
      panner.positionX.value = options.position.x;
      panner.positionY.value = options.position.y;
      panner.positionZ.value = options.position.z;
      
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(categoryGain);
      
    } else {
      source.connect(gainNode);
      gainNode.connect(categoryGain);
    }
    
    // Generate instance ID
    const instanceId = `${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Track active sound
    const soundInstance = {
      id,
      instanceId,
      source,
      gainNode,
      startTime: this._context.currentTime,
      duration: buffer.duration,
    };
    
    this._activeSounds.set(instanceId, soundInstance);
    
    // Cleanup on end
    source.onended = () => {
      this._activeSounds.delete(instanceId);
    };
    
    // Start playback
    source.start(0, options.offset || 0);
    
    return instanceId;
  }
  
  /**
   * Play a 3D positional sound
   * @param {string} id - Sound identifier
   * @param {THREE.Vector3} position - World position
   * @param {Object} options - Additional options
   * @returns {string} - Instance ID
   */
  play3D(id, position, options = {}) {
    return this.play(id, {
      ...options,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
    });
  }
  
  /**
   * Stop a sound
   * @param {string} instanceId - Sound instance ID
   * @param {number} fadeTime - Fade out duration in seconds
   */
  stop(instanceId, fadeTime = 0) {
    const sound = this._activeSounds.get(instanceId);
    if (!sound) return;
    
    if (fadeTime > 0) {
      sound.gainNode.gain.linearRampToValueAtTime(0, this._context.currentTime + fadeTime);
      setTimeout(() => {
        try {
          sound.source.stop();
        } catch (e) {}
        this._activeSounds.delete(instanceId);
      }, fadeTime * 1000);
    } else {
      try {
        sound.source.stop();
      } catch (e) {}
      this._activeSounds.delete(instanceId);
    }
  }
  
  /**
   * Stop all sounds
   * @param {number} fadeTime - Fade out duration
   */
  stopAll(fadeTime = 0) {
    for (const instanceId of this._activeSounds.keys()) {
      this.stop(instanceId, fadeTime);
    }
  }
  
  /**
   * Stop all sounds in a category
   * @param {string} category - Audio category
   * @param {number} fadeTime - Fade out duration
   */
  stopCategory(category, fadeTime = 0) {
    for (const [instanceId, sound] of this._activeSounds.entries()) {
      const definition = this._definitions.get(sound.id);
      if (definition && definition.category === category) {
        this.stop(instanceId, fadeTime);
      }
    }
  }
  
  /**
   * Set volume for a category
   * @param {string} category - Audio category
   * @param {number} volume - Volume (0-1)
   */
  setVolume(category, volume) {
    this._volumes[category] = Math.max(0, Math.min(1, volume));
    
    if (category === AUDIO_CATEGORY.MASTER) {
      if (this._masterGain) {
        this._masterGain.gain.value = volume;
      }
    } else if (this._categoryGains[category]) {
      this._categoryGains[category].gain.value = volume;
    }
  }
  
  /**
   * Get volume for a category
   * @param {string} category - Audio category
   * @returns {number}
   */
  getVolume(category) {
    return this._volumes[category];
  }
  
  /**
   * Update listener position from camera
   */
  updateListener() {
    if (!this._isInitialized || !this._listener || !this.camera) return;
    
    const position = this.camera.position;
    const forward = new THREE.Vector3();
    const up = new THREE.Vector3();
    
    this.camera.getWorldDirection(forward);
    up.copy(this.camera.up);
    
    // Set listener position
    if (this._listener.positionX) {
      this._listener.positionX.value = position.x;
      this._listener.positionY.value = position.y;
      this._listener.positionZ.value = position.z;
    } else {
      this._listener.setPosition(position.x, position.y, position.z);
    }
    
    // Set listener orientation
    if (this._listener.forwardX) {
      this._listener.forwardX.value = forward.x;
      this._listener.forwardY.value = forward.y;
      this._listener.forwardZ.value = forward.z;
      this._listener.upX.value = up.x;
      this._listener.upY.value = up.y;
      this._listener.upZ.value = up.z;
    } else {
      this._listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }
  
  /**
   * Generate a placeholder sound using oscillators
   * @private
   * @param {Object} config - Placeholder configuration
   * @returns {AudioBuffer}
   */
  _generatePlaceholderSound(config) {
    const duration = config.duration || 0.2;
    const sampleRate = this._context.sampleRate;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = this._context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    switch (config.type) {
      case 'gunshot':
        this._generateGunshot(data, numSamples, sampleRate, config);
        break;
        
      case 'explosion':
        this._generateExplosion(data, numSamples, sampleRate, config);
        break;
        
      case 'footstep':
        this._generateFootstep(data, numSamples, sampleRate, config);
        break;
        
      case 'reload':
        this._generateReload(data, numSamples, sampleRate, config);
        break;
        
      case 'hit':
        this._generateHit(data, numSamples, sampleRate, config);
        break;
        
      case 'beep':
        this._generateBeep(data, numSamples, sampleRate, config);
        break;
        
      case 'noise':
      default:
        this._generateNoise(data, numSamples, config);
        break;
    }
    
    return buffer;
  }
  
  /**
   * Generate gunshot sound
   * @private
   */
  _generateGunshot(data, numSamples, sampleRate, config) {
    const attack = 0.002;
    const decay = config.duration || 0.15;
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Envelope
      let envelope = 1;
      if (t < attack) {
        envelope = t / attack;
      } else {
        envelope = Math.exp(-(t - attack) / (decay * 0.2));
      }
      
      // Noise + low frequency thump
      const noise = (Math.random() * 2 - 1) * envelope;
      const thump = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t / 0.05) * 0.5;
      
      data[i] = (noise * 0.7 + thump) * 0.8;
    }
  }
  
  /**
   * Generate explosion sound
   * @private
   */
  _generateExplosion(data, numSamples, sampleRate, config) {
    const duration = config.duration || 0.5;
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Envelope with longer decay
      const envelope = Math.exp(-t / (duration * 0.5));
      
      // Low rumble + noise
      const rumble = Math.sin(2 * Math.PI * 40 * t) * Math.exp(-t / 0.1);
      const noise = (Math.random() * 2 - 1) * envelope;
      
      data[i] = (noise * 0.5 + rumble * 0.5) * 0.9;
    }
  }
  
  /**
   * Generate footstep sound
   * @private
   */
  _generateFootstep(data, numSamples, sampleRate, config) {
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Short burst of filtered noise
      const envelope = Math.exp(-t / 0.03);
      const noise = (Math.random() * 2 - 1);
      
      // Low pass effect
      const freq = 200 + 100 * Math.random();
      const lowPass = Math.sin(2 * Math.PI * freq * t);
      
      data[i] = noise * envelope * 0.4 * (0.5 + 0.5 * lowPass);
    }
  }
  
  /**
   * Generate reload sound
   * @private
   */
  _generateReload(data, numSamples, sampleRate, config) {
    const duration = config.duration || 0.3;
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const normalizedT = t / duration;
      
      // Multiple clicks/clacks
      let sample = 0;
      
      // Initial click
      if (normalizedT < 0.1) {
        sample += Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t / 0.01);
      }
      
      // Magazine insert
      if (normalizedT > 0.4 && normalizedT < 0.6) {
        const localT = (normalizedT - 0.4) * 5;
        sample += (Math.random() * 2 - 1) * Math.exp(-localT / 0.1) * 0.5;
      }
      
      // Chamber close
      if (normalizedT > 0.8) {
        const localT = (normalizedT - 0.8) * 5;
        sample += Math.sin(2 * Math.PI * 800 * localT) * Math.exp(-localT / 0.02);
      }
      
      data[i] = sample * 0.6;
    }
  }
  
  /**
   * Generate hit marker sound
   * @private
   */
  _generateHit(data, numSamples, sampleRate, config) {
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      
      // Sharp ping
      const envelope = Math.exp(-t / 0.05);
      const freq = config.frequency || 1000;
      
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
    }
  }
  
  /**
   * Generate beep/UI sound
   * @private
   */
  _generateBeep(data, numSamples, sampleRate, config) {
    const freq = config.frequency || 440;
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const duration = numSamples / sampleRate;
      
      // Smooth envelope
      let envelope = 1;
      if (t < 0.01) envelope = t / 0.01;
      if (t > duration - 0.01) envelope = (duration - t) / 0.01;
      
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }
  }
  
  /**
   * Generate white noise
   * @private
   */
  _generateNoise(data, numSamples, config) {
    for (let i = 0; i < numSamples; i++) {
      const envelope = 1 - (i / numSamples); // Linear fade
      data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
    }
  }
  
  /**
   * Suspend the audio context
   */
  async suspend() {
    if (this._context && this._context.state === 'running') {
      await this._context.suspend();
      this._isSuspended = true;
    }
  }
  
  /**
   * Resume the audio context
   */
  async resume() {
    if (this._context && this._context.state === 'suspended') {
      await this._context.resume();
      this._isSuspended = false;
    }
  }
  
  /**
   * Check if audio is ready
   * @returns {boolean}
   */
  isReady() {
    return this._isInitialized && !this._isSuspended;
  }
  
  /**
   * Dispose of the audio manager
   */
  dispose() {
    this.stopAll();
    
    if (this._context) {
      this._context.close();
    }
    
    this._buffers.clear();
    this._definitions.clear();
    this._activeSounds.clear();
  }
}

// Create singleton instance
let audioManager = null;

/**
 * Get or create the audio manager singleton
 * @param {THREE.Camera} camera
 * @returns {AudioManager}
 */
function getAudioManager(camera) {
  if (!audioManager) {
    audioManager = new AudioManager(camera);
  }
  return audioManager;
}

export {
  AudioManager,
  getAudioManager,
  AUDIO_CATEGORY,
};
