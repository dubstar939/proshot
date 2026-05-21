/**
 * Game Flow Controller
 * Manages game state, scoring, and progression
 */
class GameFlow {
    /**
     * Game states enumeration
     * @enum {string}
     */
    static STATE = {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAMEOVER: 'gameover',
        VICTORY: 'victory'
    };

    /**
     * Creates an instance of GameFlow
     */
    constructor() {
        // State
        this.state = GameFlow.STATE.MENU;
        this.score = 0;
        this.currentWave = 1;
        this.startTime = 0;
        this.elapsedTime = 0;
        
        // Configuration
        this.difficulty = 1;
        this.maxWaves = 10;
        
        // Statistics
        this.stats = {
            kills: 0,
            deaths: 0,
            shotsFired: 0,
            hits: 0,
            accuracy: 0,
            playTime: 0
        };
        
        this.onStateChange = null;
        
        this._bindEvents();
    }

    startGame(difficulty = 2) {
        this.difficulty = Math.max(1, Math.min(3, difficulty));
        this.state = GameFlow.STATE.PLAYING;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.score = 0;
        this.currentWave = 1;
        
        this.stats = { kills: 0, deaths: 0, shotsFired: 0, hits: 0, accuracy: 0, playTime: 0 };
        
        document.body.requestPointerLock();
        this._dispatchEvent('gameStart', { difficulty: this.difficulty });
        this._onStateChange();
        
        console.log(`[GameFlow] Game started - Difficulty: ${this.difficulty}`);
    }

    pauseGame() {
        if (this.state !== GameFlow.STATE.PLAYING) {return;}
        
        this.state = GameFlow.STATE.PAUSED;
        document.exitPointerLock();
        this._dispatchEvent('gamePause');
        this._onStateChange();
    }

    resumeGame() {
        if (this.state !== GameFlow.STATE.PAUSED) {return;}
        
        this.state = GameFlow.STATE.PLAYING;
        document.body.requestPointerLock();
        this._dispatchEvent('gameResume');
        this._onStateChange();
    }

    gameOver() {
        this.state = GameFlow.STATE.GAMEOVER;
        this.stats.playTime = this.elapsedTime;
        document.exitPointerLock();
        this._dispatchEvent('gameOver', { score: this.score, stats: { ...this.stats }, reason: 'death' });
        this._onStateChange();
    }

    victory() {
        this.state = GameFlow.STATE.VICTORY;
        this.stats.playTime = this.elapsedTime;
        document.exitPointerLock();
        this._dispatchEvent('gameVictory', { score: this.score, stats: { ...this.stats }, wave: this.currentWave });
        this._onStateChange();
    }

    addScore(points, reason = '') {
        this.score += points;
        this._dispatchEvent('scoreUpdate', { score: this.score, points, reason });
    }

    recordKill(data = {}) {
        this.stats.kills++;
        this.addScore(100, data.reason || 'kill');
        this._dispatchEvent('enemyKilled', data);
    }

    recordShot() {
        this.stats.shotsFired++;
        this._updateAccuracy();
    }

    recordHit() {
        this.stats.hits++;
        this._updateAccuracy();
    }

    _updateAccuracy() {
        if (this.stats.shotsFired > 0) {
            this.stats.accuracy = (this.stats.hits / this.stats.shotsFired * 100).toFixed(2);
        }
    }

    setWave(wave) {
        this.currentWave = wave;
        this._dispatchEvent('waveUpdate', { wave });
    }

    getStats() { return { ...this.stats }; }
    getState() { return this.state; }
    isPlaying() { return this.state === GameFlow.STATE.PLAYING; }

    update(deltaTime) {
        if (this.isPlaying()) {
            this.elapsedTime += deltaTime;
        }
    }

    _onStateChange() {
        if (typeof this.onStateChange === 'function') {
            this.onStateChange(this.state);
        }
    }

    _bindEvents() {
        window.addEventListener('playerDeath', () => {
            this.stats.deaths++;
            this.gameOver();
        });

        window.addEventListener('enemyKilled', (e) => {
            this.recordKill(e.detail);
        });
        
        window.addEventListener('waveComplete', (e) => {
            this.setWave(e.detail.wave);
            this.addScore(500, 'wave_complete');
            
            if (this.currentWave >= this.maxWaves) {
                setTimeout(() => this.victory(), 2000);
            }
        });

        window.addEventListener('weaponFire', () => {
            this.recordShot();
        });

        window.addEventListener('enemyHit', () => {
            this.recordHit();
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.state !== GameFlow.STATE.MENU) {
                e.preventDefault();
                if (this.state === GameFlow.STATE.PLAYING) {
                    this.pauseGame();
                } else if (this.state === GameFlow.STATE.PAUSED) {
                    this.resumeGame();
                }
            }
        });
    }

    _dispatchEvent(name, detail = {}) {
        window.dispatchEvent(new CustomEvent(name, { detail }));
    }

    reset() {
        this.state = GameFlow.STATE.MENU;
        this.score = 0;
        this.currentWave = 1;
        this.startTime = 0;
        this.elapsedTime = 0;
        this._onStateChange();
    }

    saveGame() {
        if (!this.isPlaying()) {return null;}
        
        const saveData = {
            state: this.state,
            score: this.score,
            wave: this.currentWave,
            elapsedTime: this.elapsedTime,
            stats: this.stats,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('proshot_save', JSON.stringify(saveData));
            console.log('[GameFlow] Game saved');
            return saveData;
        } catch (error) {
            console.error('[GameFlow] Failed to save:', error);
            return null;
        }
    }

    loadGame() {
        try {
            const saved = localStorage.getItem('proshot_save');
            if (!saved) {return null;}
            
            const data = JSON.parse(saved);
            
            this.score = data.score || 0;
            this.currentWave = data.wave || 1;
            this.elapsedTime = data.elapsedTime || 0;
            this.stats = data.stats || this.stats;
            
            console.log('[GameFlow] Game loaded');
            return data;
        } catch (error) {
            console.error('[GameFlow] Failed to load:', error);
            return null;
        }
    }

    deleteSave() {
        localStorage.removeItem('proshot_save');
        console.log('[GameFlow] Save deleted');
    }
}

export { GameFlow };
