export class HUDSystem {
    constructor() {
        this.health = 100;
        this.armor = 0;
        this.container = null;
        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        // Create Overlay
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.color = 'white';
        this.container.style.textShadow = '1px 1px 2px black';
        document.body.appendChild(this.container);

        // Crosshair
        const crosshair = document.createElement('div');
        crosshair.style.position = 'absolute';
        crosshair.style.top = '50%';
        crosshair.style.left = '50%';
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.innerHTML = `
            <div style="position:absolute; top:9px; left:0; width:20px; height:2px; background:white;"></div>
            <div style="position:absolute; top:0; left:9px; width:2px; height:20px; background:white;"></div>
        `;
        this.container.appendChild(crosshair);
        this.crosshair = crosshair;

        // Health Bar
        const healthContainer = document.createElement('div');
        healthContainer.style.position = 'absolute';
        healthContainer.style.bottom = '20px';
        healthContainer.style.left = '20px';
        healthContainer.style.width = '200px';
        healthContainer.style.height = '20px';
        healthContainer.style.background = 'rgba(0,0,0,0.5)';
        healthContainer.style.border = '2px solid #333';
        
        this.healthBar = document.createElement('div');
        this.healthBar.style.width = '100%';
        this.healthBar.style.height = '100%';
        this.healthBar.style.background = '#00ff00';
        this.healthBar.style.transition = 'width 0.2s, background 0.2s';
        healthContainer.appendChild(this.healthBar);
        
        const healthText = document.createElement('span');
        healthText.innerText = 'HEALTH';
        healthText.style.position = 'absolute';
        healthText.style.top = '-20px';
        healthText.style.left = '0';
        healthContainer.appendChild(healthText);
        
        this.container.appendChild(healthContainer);

        // Ammo Counter
        const ammoContainer = document.createElement('div');
        ammoContainer.style.position = 'absolute';
        ammoContainer.style.bottom = '20px';
        ammoContainer.style.right = '20px';
        ammoContainer.style.textAlign = 'right';
        ammoContainer.innerHTML = `<div style="font-size: 24px;" id="ammo-display">30 / 90</div><div style="font-size: 12px; color:#aaa;">AMMO</div>`;
        this.container.appendChild(ammoContainer);
        this.ammoDisplay = ammoContainer.querySelector('#ammo-display');

        // Hit Marker (Hidden by default)
        this.hitMarker = document.createElement('div');
        this.hitMarker.style.position = 'absolute';
        this.hitMarker.style.top = '50%';
        this.hitMarker.style.left = '50%';
        this.hitMarker.style.width = '30px';
        this.hitMarker.style.height = '30px';
        this.hitMarker.style.transform = 'translate(-50%, -50%) rotate(45deg)';
        this.hitMarker.style.opacity = '0';
        this.hitMarker.style.transition = 'opacity 0.1s';
        this.hitMarker.innerHTML = `
            <div style="position:absolute; top:14px; left:0; width:30px; height:2px; background:red;"></div>
            <div style="position:absolute; top:0; left:14px; width:2px; height:30px; background:red;"></div>
        `;
        this.container.appendChild(this.hitMarker);
        
        // Low Health Overlay
        this.lowHealthOverlay = document.createElement('div');
        this.lowHealthOverlay.style.position = 'absolute';
        this.lowHealthOverlay.style.top = '0';
        this.lowHealthOverlay.style.left = '0';
        this.lowHealthOverlay.style.width = '100%';
        this.lowHealthOverlay.style.height = '100%';
        this.lowHealthOverlay.style.boxShadow = 'inset 0 0 50px red';
        this.lowHealthOverlay.style.opacity = '0';
        this.lowHealthOverlay.style.transition = 'opacity 0.5s';
        this.lowHealthOverlay.style.pointerEvents = 'none';
        this.container.appendChild(this.lowHealthOverlay);
    }

    bindEvents() {
        window.addEventListener('playerDamage', (e) => {
            this.takeDamage(e.detail.amount);
        });
        
        window.addEventListener('enemyHit', () => {
            this.showHitMarker();
        });

        window.addEventListener('ammoUpdate', (e) => {
            const { mag, reserve } = e.detail;
            this.ammoDisplay.innerText = `${mag} / ${reserve}`;
        });
        
        window.addEventListener('reloadStart', () => {
            this.ammoDisplay.style.color = '#ffff00';
            this.ammoDisplay.innerText = 'RELOADING...';
        });
        
        window.addEventListener('reloadEnd', (e) => {
            this.ammoDisplay.style.color = 'white';
        });
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthUI();
        
        // Screen flash red
        this.lowHealthOverlay.style.opacity = this.health < 30 ? '0.6' : '0.2';
        setTimeout(() => {
            if (this.health > 30) {this.lowHealthOverlay.style.opacity = '0';}
        }, 500);

        if (this.health <= 0) {
            window.dispatchEvent(new CustomEvent('playerDeath'));
        }
    }

    updateHealthUI() {
        this.healthBar.style.width = `${this.health}%`;
        if (this.health > 60) {this.healthBar.style.background = '#00ff00';}
        else if (this.health > 30) {this.healthBar.style.background = '#ffff00';}
        else {this.healthBar.style.background = '#ff0000';}
    }

    showHitMarker() {
        this.hitMarker.style.opacity = '1';
        setTimeout(() => {
            this.hitMarker.style.opacity = '0';
        }, 100);
    }
    
    setCrosshairSpread(spread) {
        // Scale crosshair based on spread
        const scale = 1 + spread * 10;
        this.crosshair.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
}
