export class GameFlowManager {
    constructor() {
        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, VICTORY
        this.score = 0;
        this.wave = 1;
        this.startTime = 0;
        this.difficulty = 1; // 1=Easy, 2=Normal, 3=Hard
        this.stats = { kills: 0, deaths: 0, shotsFired: 0, hits: 0 };
        
        this.bindEvents();
    }

    startGame(difficulty = 2) {
        this.difficulty = difficulty;
        this.state = 'PLAYING';
        this.startTime = Date.now();
        this.score = 0;
        this.wave = 1;
        this.stats = { kills: 0, deaths: 0, shotsFired: 0, hits: 0 };
        
        document.exitPointerLock();
        window.dispatchEvent(new CustomEvent('gameStart', { detail: { difficulty } }));
        
        // Hide menus, show HUD
        const menu = document.getElementById('pause-menu');
        if(menu) menu.style.display = 'none';
    }

    pauseGame() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        document.exitPointerLock();
        window.dispatchEvent(new CustomEvent('gamePause'));
    }

    resumeGame() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        document.body.requestPointerLock();
        window.dispatchEvent(new CustomEvent('gameResume'));
    }

    gameOver() {
        this.state = 'GAMEOVER';
        document.exitPointerLock();
        window.dispatchEvent(new CustomEvent('gameOver', { detail: { score: this.score, stats: this.stats } }));
    }

    victory() {
        this.state = 'VICTORY';
        document.exitPointerLock();
        window.dispatchEvent(new CustomEvent('gameVictory', { detail: { score: this.score, stats: this.stats } }));
    }

    addScore(points) {
        this.score += points;
        window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: { score: this.score } }));
    }

    bindEvents() {
        window.addEventListener('playerDeath', () => {
            this.stats.deaths++;
            this.gameOver();
        });

        window.addEventListener('enemyKilled', (e) => {
            this.stats.kills++;
            this.addScore(100);
            // Check win condition (e.g., survival or specific count)
        });
        
        window.addEventListener('waveComplete', (e) => {
            this.wave = e.detail.wave;
            if (this.wave > 10) {
                this.victory();
            }
        });

        window.addEventListener('playerDamage', () => {
            // Logic for hit tracking if needed
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.state === 'PLAYING') this.pauseGame();
                else if (this.state === 'PAUSED') this.resumeGame();
            }
        });
    }
}
