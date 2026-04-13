// ============================================
// UI / HUD SYSTEM MODULE
// Crosshair, dynamic hit markers
// Ammo counter, weapon icon
// Health bar
// Pause menu, settings menu
// Start screen + game over screen
// ============================================

import * as THREE from "three";

class UIManager {
  constructor() {
    this.elements = {};
    this.isVisible = true;
    this.isPaused = false;
    
    this.createHUD();
    this.createMenus();
    this.bindEvents();
  }
  
  createHUD() {
    // Main HUD container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
    `;
    document.body.appendChild(hudContainer);
    this.elements.hud = hudContainer;
    
    // Crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
    `;
    crosshair.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2px; height: 20px; background: rgba(255,255,255,0.9);"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 2px; background: rgba(255,255,255,0.9);"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.9);"></div>
    `;
    hudContainer.appendChild(crosshair);
    this.elements.crosshair = crosshair;
    
    // Hit marker
    const hitMarker = document.createElement('div');
    hitMarker.id = 'hit-marker';
    hitMarker.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 30px;
      height: 30px;
      opacity: 0;
      transition: opacity 0.1s ease;
    `;
    hitMarker.innerHTML = `
      <svg viewBox="0 0 30 30" style="width: 100%; height: 100%;">
        <line x1="5" y1="5" x2="12" y2="12" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <line x1="18" y1="18" x2="25" y2="25" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <line x1="25" y1="5" x2="18" y2="12" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
        <line x1="12" y1="18" x2="5" y2="25" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
      </svg>
    `;
    hudContainer.appendChild(hitMarker);
    this.elements.hitMarker = hitMarker;
    
    // Health bar container (bottom left)
    const healthContainer = document.createElement('div');
    healthContainer.id = 'health-container';
    healthContainer.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 30px;
      width: 250px;
    `;
    healthContainer.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <svg width="24" height="24" viewBox="0 0 24 24" style="margin-right: 10px;">
          <path fill="#ff4444" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span id="health-text" style="color: #fff; font-size: 18px; font-weight: bold; font-family: Poppins, sans-serif;">100</span>
      </div>
      <div style="width: 100%; height: 12px; background: rgba(0,0,0,0.5); border-radius: 6px; overflow: hidden;">
        <div id="health-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff4444, #ff6666); transition: width 0.3s ease;"></div>
      </div>
    `;
    hudContainer.appendChild(healthContainer);
    this.elements.healthBar = healthContainer.querySelector('#health-bar');
    this.elements.healthText = healthContainer.querySelector('#health-text');
    
    // Armor bar
    const armorContainer = document.createElement('div');
    armorContainer.id = 'armor-container';
    armorContainer.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 30px;
      width: 250px;
      margin-top: 15px;
    `;
    armorContainer.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 5px;">
        <svg width="24" height="24" viewBox="0 0 24 24" style="margin-right: 10px;">
          <path fill="#4488ff" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <span id="armor-text" style="color: #fff; font-size: 18px; font-weight: bold; font-family: Poppins, sans-serif;">0</span>
      </div>
      <div style="width: 100%; height: 12px; background: rgba(0,0,0,0.5); border-radius: 6px; overflow: hidden;">
        <div id="armor-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4488ff, #66aaff); transition: width 0.3s ease;"></div>
      </div>
    `;
    hudContainer.appendChild(armorContainer);
    this.elements.armorBar = armorContainer.querySelector('#armor-bar');
    this.elements.armorText = armorContainer.querySelector('#armor-text');
    
    // Ammo counter (bottom right)
    const ammoContainer = document.createElement('div');
    ammoContainer.id = 'ammo-container';
    ammoContainer.style.cssText = `
      position: absolute;
      bottom: 30px;
      right: 30px;
      text-align: right;
    `;
    ammoContainer.innerHTML = `
      <div style="display: flex; align-items: baseline; justify-content: flex-end;">
        <span id="ammo-current" style="color: #fff; font-size: 48px; font-weight: bold; font-family: Poppins, sans-serif;">12</span>
        <span style="color: rgba(255,255,255,0.5); font-size: 24px; margin: 0 10px;">/</span>
        <span id="ammo-reserve" style="color: rgba(255,255,255,0.7); font-size: 24px; font-family: Poppins, sans-serif;">120</span>
      </div>
      <div id="weapon-name" style="color: rgba(255,255,255,0.6); font-size: 14px; font-family: Poppins, sans-serif; margin-top: 5px;">PISTOL</div>
    `;
    hudContainer.appendChild(ammoContainer);
    this.elements.ammoCurrent = ammoContainer.querySelector('#ammo-current');
    this.elements.ammoReserve = ammoContainer.querySelector('#ammo-reserve');
    this.elements.weaponName = ammoContainer.querySelector('#weapon-name');
    
    // Kill counter (top center)
    const killCounter = document.createElement('div');
    killCounter.id = 'kill-counter';
    killCounter.style.cssText = `
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    `;
    killCounter.innerHTML = `
      <div style="color: rgba(255,255,255,0.6); font-size: 14px; font-family: Poppins, sans-serif;">ENEMIES ELIMINATED</div>
      <div id="kill-count" style="color: #ff4444; font-size: 36px; font-weight: bold; font-family: Poppins, sans-serif;">0</div>
    `;
    hudContainer.appendChild(killCounter);
    this.elements.killCount = killCounter.querySelector('#kill-count');
    
    // Wave indicator (top left)
    const waveIndicator = document.createElement('div');
    waveIndicator.id = 'wave-indicator';
    waveIndicator.style.cssText = `
      position: absolute;
      top: 30px;
      left: 30px;
    `;
    waveIndicator.innerHTML = `
      <div style="color: rgba(255,255,255,0.6); font-size: 14px; font-family: Poppins, sans-serif;">WAVE</div>
      <div id="wave-number" style="color: #ffaa00; font-size: 36px; font-weight: bold; font-family: Poppins, sans-serif;">1</div>
    `;
    hudContainer.appendChild(waveIndicator);
    this.elements.waveNumber = waveIndicator.querySelector('#wave-number');
    
    // Enemy count (top right)
    const enemyCount = document.createElement('div');
    enemyCount.id = 'enemy-count';
    enemyCount.style.cssText = `
      position: absolute;
      top: 30px;
      right: 30px;
      text-align: right;
    `;
    enemyCount.innerHTML = `
      <div style="color: rgba(255,255,255,0.6); font-size: 14px; font-family: Poppins, sans-serif;">ENEMIES REMAINING</div>
      <div id="enemies-left" style="color: #ff4444; font-size: 36px; font-weight: bold; font-family: Poppins, sans-serif;">0</div>
    `;
    hudContainer.appendChild(enemyCount);
    this.elements.enemiesLeft = enemyCount.querySelector('#enemies-left');
    
    // Reload indicator
    const reloadIndicator = document.createElement('div');
    reloadIndicator.id = 'reload-indicator';
    reloadIndicator.style.cssText = `
      position: absolute;
      top: 60%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ffaa00;
      font-size: 16px;
      font-family: Poppins, sans-serif;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    reloadIndicator.textContent = 'RELOADING...';
    hudContainer.appendChild(reloadIndicator);
    this.elements.reloadIndicator = reloadIndicator;
  }
  
  createMenus() {
    // Start Screen
    const startScreen = document.createElement('div');
    startScreen.id = 'start-screen';
    startScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      pointer-events: auto;
    `;
    startScreen.innerHTML = `
      <h1 style="color: #fff; font-size: 5rem; margin-bottom: 10px; font-family: Poppins, sans-serif; text-shadow: 0 0 20px rgba(255,68,68,0.5);">FPS COMBAT</h1>
      <p style="color: rgba(255,255,255,0.6); font-size: 1.2rem; margin-bottom: 40px; font-family: Poppins, sans-serif;">Survive the waves. Eliminate all enemies.</p>
      <button id="start-button" style="padding: 15px 50px; font-size: 1.5rem; background: linear-gradient(90deg, #ff4444, #ff6666); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Poppins, sans-serif; font-weight: bold; transition: transform 0.2s ease, box-shadow 0.2s ease;">PLAY GAME</button>
      <div style="margin-top: 40px; color: rgba(255,255,255,0.4); font-size: 0.9rem; font-family: Poppins, sans-serif;">
        <p>WASD - Move | SHIFT - Sprint | CTRL - Crouch</p>
        <p>SPACE - Jump | R - Reload | 1-4 - Weapons</p>
        <p>MOUSE - Look | CLICK - Shoot | RIGHT CLICK - ADS</p>
        <p>ESC - Pause</p>
      </div>
    `;
    document.body.appendChild(startScreen);
    this.elements.startScreen = startScreen;
    
    // Pause Menu
    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pause-menu';
    pauseMenu.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 999;
      pointer-events: auto;
    `;
    pauseMenu.innerHTML = `
      <h2 style="color: #fff; font-size: 3rem; margin-bottom: 40px; font-family: Poppins, sans-serif;">PAUSED</h2>
      <button id="resume-button" style="padding: 15px 50px; font-size: 1.2rem; background: linear-gradient(90deg, #4488ff, #66aaff); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Poppins, sans-serif; font-weight: bold; margin-bottom: 15px; min-width: 200px;">RESUME</button>
      <button id="settings-button" style="padding: 15px 50px; font-size: 1.2rem; background: rgba(255,255,255,0.1); color: #fff; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; cursor: pointer; font-family: Poppins, sans-serif; font-weight: bold; margin-bottom: 15px; min-width: 200px;">SETTINGS</button>
      <button id="quit-button" style="padding: 15px 50px; font-size: 1.2rem; background: linear-gradient(90deg, #ff4444, #ff6666); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Poppins, sans-serif; font-weight: bold; min-width: 200px;">QUIT TO MENU</button>
    `;
    document.body.appendChild(pauseMenu);
    this.elements.pauseMenu = pauseMenu;
    
    // Settings Panel
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settings-panel';
    settingsPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(20, 20, 40, 0.95);
      padding: 40px;
      border-radius: 16px;
      display: none;
      z-index: 1000;
      pointer-events: auto;
      min-width: 400px;
    `;
    settingsPanel.innerHTML = `
      <h3 style="color: #fff; font-size: 1.8rem; margin-bottom: 30px; font-family: Poppins, sans-serif;">SETTINGS</h3>
      <div style="margin-bottom: 20px;">
        <label style="color: rgba(255,255,255,0.8); font-family: Poppins, sans-serif; display: block; margin-bottom: 8px;">Sensitivity</label>
        <input type="range" id="sensitivity-slider" min="1" max="10" value="5" style="width: 100%;">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="color: rgba(255,255,255,0.8); font-family: Poppins, sans-serif; display: block; margin-bottom: 8px;">Volume</label>
        <input type="range" id="volume-slider" min="0" max="100" value="70" style="width: 100%;">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="color: rgba(255,255,255,0.8); font-family: Poppins, sans-serif; display: block; margin-bottom: 8px;">
          <input type="checkbox" id="vsync-toggle" checked> V-Sync
        </label>
      </div>
      <button id="close-settings" style="padding: 10px 30px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Poppins, sans-serif;">CLOSE</button>
    `;
    document.body.appendChild(settingsPanel);
    this.elements.settingsPanel = settingsPanel;
    
    // Game Over Screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      pointer-events: auto;
    `;
    gameOverScreen.innerHTML = `
      <h2 id="game-over-title" style="color: #ff4444; font-size: 4rem; margin-bottom: 20px; font-family: Poppins, sans-serif;">GAME OVER</h2>
      <div id="final-stats" style="color: rgba(255,255,255,0.7); font-size: 1.2rem; margin-bottom: 30px; font-family: Poppins, sans-serif; text-align: center;"></div>
      <button id="restart-button" style="padding: 15px 50px; font-size: 1.5rem; background: linear-gradient(90deg, #4488ff, #66aaff); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Poppins, sans-serif; font-weight: bold;">PLAY AGAIN</button>
    `;
    document.body.appendChild(gameOverScreen);
    this.elements.gameOverScreen = gameOverScreen;
  }
  
  bindEvents() {
    // Start button
    document.getElementById('start-button')?.addEventListener('click', () => {
      if (this.onGameStart) this.onGameStart();
    });
    
    // Resume button
    document.getElementById('resume-button')?.addEventListener('click', () => {
      this.resumeGame();
    });
    
    // Settings button
    document.getElementById('settings-button')?.addEventListener('click', () => {
      this.elements.settingsPanel.style.display = 'block';
    });
    
    // Close settings
    document.getElementById('close-settings')?.addEventListener('click', () => {
      this.elements.settingsPanel.style.display = 'none';
    });
    
    // Quit button
    document.getElementById('quit-button')?.addEventListener('click', () => {
      if (this.onQuitToMenu) this.onQuitToMenu();
    });
    
    // Restart button
    document.getElementById('restart-button')?.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
    
    // Save settings on change
    document.getElementById('sensitivity-slider')?.addEventListener('change', (e) => {
      localStorage.setItem('fps_sensitivity', e.target.value);
    });
    
    document.getElementById('volume-slider')?.addEventListener('change', (e) => {
      localStorage.setItem('fps_volume', e.target.value);
    });
    
    document.getElementById('vsync-toggle')?.addEventListener('change', (e) => {
      localStorage.setItem('fps_vsync', e.target.checked);
    });
    
    // Load saved settings
    const savedSensitivity = localStorage.getItem('fps_sensitivity');
    if (savedSensitivity) {
      document.getElementById('sensitivity-slider').value = savedSensitivity;
    }
    
    const savedVolume = localStorage.getItem('fps_volume');
    if (savedVolume) {
      document.getElementById('volume-slider').value = savedVolume;
    }
    
    const savedVsync = localStorage.getItem('fps_vsync');
    if (savedVsync !== null) {
      document.getElementById('vsync-toggle').checked = savedVsync === 'true';
    }
    
    // ESC to pause
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.elements.startScreen.style.display) {
        this.togglePause();
      }
    });
  }
  
  setCallbacks(onGameStart, onQuitToMenu, onRestart) {
    this.onGameStart = onGameStart;
    this.onQuitToMenu = onQuitToMenu;
    this.onRestart = onRestart;
  }
  
  togglePause() {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }
  
  pauseGame() {
    this.isPaused = true;
    this.elements.pauseMenu.style.display = 'flex';
    document.body.requestPointerLock = document.body.requestPointerLock || (() => {});
  }
  
  resumeGame() {
    this.isPaused = false;
    this.elements.pauseMenu.style.display = 'none';
    this.elements.settingsPanel.style.display = 'none';
    document.body.requestPointerLock();
  }
  
  showStartScreen() {
    this.elements.startScreen.style.display = 'flex';
    this.elements.hud.style.display = 'none';
  }
  
  hideStartScreen() {
    this.elements.startScreen.style.display = 'none';
    this.elements.hud.style.display = 'block';
  }
  
  showGameOver(isVictory = false, stats = {}) {
    const title = document.getElementById('game-over-title');
    title.textContent = isVictory ? 'VICTORY!' : 'GAME OVER';
    title.style.color = isVictory ? '#44ff44' : '#ff4444';
    
    const finalStats = document.getElementById('final-stats');
    finalStats.innerHTML = `
      <p>Enemies Killed: ${stats.kills || 0}</p>
      <p>Wave Reached: ${stats.wave || 1}</p>
      <p>Time Survived: ${this.formatTime(stats.time || 0)}</p>
      <p>Accuracy: ${stats.accuracy || 0}%</p>
    `;
    
    this.elements.gameOverScreen.style.display = 'flex';
  }
  
  hideGameOver() {
    this.elements.gameOverScreen.style.display = 'none';
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // HUD Update Methods
  updateHealth(health, maxHealth) {
    const percent = (health / maxHealth) * 100;
    this.elements.healthBar.style.width = `${Math.max(0, percent)}%`;
    this.elements.healthText.textContent = Math.ceil(health);
    
    // Color change based on health
    if (percent > 50) {
      this.elements.healthBar.style.background = 'linear-gradient(90deg, #44ff44, #66ff66)';
    } else if (percent > 25) {
      this.elements.healthBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
    } else {
      this.elements.healthBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
    }
  }
  
  updateArmor(armor, maxArmor) {
    const percent = (armor / maxArmor) * 100;
    this.elements.armorBar.style.width = `${Math.max(0, percent)}%`;
    this.elements.armorText.textContent = Math.ceil(armor);
  }
  
  updateAmmo(current, reserve, weaponName) {
    this.elements.ammoCurrent.textContent = current;
    this.elements.ammoReserve.textContent = reserve;
    this.elements.weaponName.textContent = weaponName.toUpperCase();
    
    // Low ammo warning
    if (current <= 3) {
      this.elements.ammoCurrent.style.color = '#ff4444';
    } else {
      this.elements.ammoCurrent.style.color = '#ffffff';
    }
  }
  
  updateKills(count) {
    this.elements.killCount.textContent = count;
  }
  
  updateWave(wave) {
    this.elements.waveNumber.textContent = wave;
  }
  
  updateEnemyCount(count) {
    this.elements.enemiesLeft.textContent = count;
  }
  
  showHitMarker() {
    this.elements.hitMarker.style.opacity = '1';
    setTimeout(() => {
      this.elements.hitMarker.style.opacity = '0';
    }, 100);
  }
  
  showReloadIndicator(showing) {
    this.elements.reloadIndicator.style.opacity = showing ? '1' : '0';
  }
  
  setCrosshairSize(size) {
    this.elements.crosshair.style.width = `${size}px`;
    this.elements.crosshair.style.height = `${size}px`;
  }
  
  hideHUD() {
    this.elements.hud.style.display = 'none';
  }
  
  showHUD() {
    this.elements.hud.style.display = 'block';
  }
  
  dispose() {
    // Clean up all created elements
    const ids = [
      'hud-container', 'start-screen', 'pause-menu', 
      'settings-panel', 'game-over-screen'
    ];
    
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  }
}

export { UIManager };
