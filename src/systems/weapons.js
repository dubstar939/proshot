import * as THREE from 'three';

// Weapon Definitions
const WEAPON_DB = {
    pistol: {
        id: 'pistol', name: 'Pistol', type: 'hitscan', damage: 25, fireRate: 0.4, spread: 0.02,
        magSize: 12, reserve: 48, reloadTime: 1.5, range: 50, recoil: 0.05, auto: false
    },
    rifle: {
        id: 'rifle', name: 'Assault Rifle', type: 'hitscan', damage: 18, fireRate: 0.1, spread: 0.04,
        magSize: 30, reserve: 90, reloadTime: 2.0, range: 80, recoil: 0.03, auto: true
    },
    shotgun: {
        id: 'shotgun', name: 'Shotgun', type: 'hitscan', damage: 12, fireRate: 0.8, spread: 0.15,
        magSize: 6, reserve: 24, reloadTime: 2.5, range: 20, pellets: 8, recoil: 0.15, auto: false
    },
    sniper: {
        id: 'sniper', name: 'Sniper', type: 'hitscan', damage: 80, fireRate: 1.2, spread: 0.001,
        magSize: 5, reserve: 20, reloadTime: 2.2, range: 200, recoil: 0.2, adsZoom: 0.2, auto: false
    },
    rocket: {
        id: 'rocket', name: 'Rocket Launcher', type: 'projectile', damage: 100, fireRate: 1.0, spread: 0.01,
        magSize: 1, reserve: 10, reloadTime: 3.0, range: 100, projectileSpeed: 40, recoil: 0.3, auto: false
    }
};

export class WeaponSystem {
    constructor(camera, scene, audioSystem) {
        this.camera = camera;
        this.scene = scene;
        this.audio = audioSystem;
        
        this.weapons = {};
        this.currentWeaponId = null;
        this.isFiring = false;
        this.lastFireTime = 0;
        this.isReloading = false;
        this.isADS = false;
        this.baseFOV = 75;
        
        // Object Pools
        this.projectilePool = [];
        this.activeProjectiles = [];
        
        this.initWeapons();
        this.initInput();
    }

    initWeapons() {
        Object.values(WEAPON_DB).forEach(data => {
            this.weapons[data.id] = {
                ...data,
                currentMag: data.magSize,
                currentReserve: data.reserve,
                lastFire: 0,
                recoilKick: 0
            };
        });
        this.switchWeapon('pistol');
    }

    switchWeapon(id) {
        if (this.isReloading || !WEAPON_DB[id]) {return;}
        this.currentWeaponId = id;
        window.dispatchEvent(new CustomEvent('weaponSwitch', { detail: { weapon: WEAPON_DB[id] } }));
    }

    initInput() {
        const onMouseDown = (e) => {
            if (e.button === 0) {this.isFiring = true;}
            if (e.button === 2) {this.toggleADS(true);}
        };
        const onMouseUp = (e) => {
            if (e.button === 0) {this.isFiring = false;}
            if (e.button === 2) {this.toggleADS(false);}
        };
        const onKeyDown = (e) => {
            if (e.key === 'r') {this.reload();}
            if (e.key >= '1' && e.key <= '5') {
                const ids = ['pistol', 'rifle', 'shotgun', 'sniper', 'rocket'];
                this.switchWeapon(ids[parseInt(e.key)-1]);
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', onKeyDown);
    }

    toggleADS(active) {
        this.isADS = active;
        const weapon = this.weapons[this.currentWeaponId];
        const targetFOV = active && weapon.adsZoom ? this.baseFOV * weapon.adsZoom : this.baseFOV;
        
        // Smooth FOV transition handled in update
        this.targetFOV = targetFOV;
    }

    reload() {
        const w = this.weapons[this.currentWeaponId];
        if (this.isReloading || w.currentMag === w.magSize || w.currentReserve <= 0) {return;}
        
        this.isReloading = true;
        window.dispatchEvent(new CustomEvent('reloadStart'));
        
        setTimeout(() => {
            const needed = w.magSize - w.currentMag;
            const take = Math.min(needed, w.currentReserve);
            w.currentMag += take;
            w.currentReserve -= take;
            this.isReloading = false;
            window.dispatchEvent(new CustomEvent('reloadEnd', { detail: { mag: w.currentMag, reserve: w.currentReserve } }));
        }, w.reloadTime * 1000);
    }

    fire(delta, time) {
        const w = this.weapons[this.currentWeaponId];
        if (this.isReloading || this.isADS && w.id === 'rocket') {return;} // No firing while ADS for rocket (optional)
        
        if (time - w.lastFire < w.fireRate) {return;}
        if (w.currentMag <= 0) {
            this.reload();
            return;
        }

        w.currentMag--;
        w.lastFire = time;
        w.recoilKick = w.recoil;
        
        window.dispatchEvent(new CustomEvent('weaponFire', { detail: { weapon: w } }));

        if (w.type === 'hitscan') {
            this.performHitscan(w);
        } else if (w.type === 'projectile') {
            this.spawnProjectile(w);
        }
    }

    performHitscan(weapon) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Add spread
        const spread = weapon.spread * (this.isADS ? 0.5 : 1.0);
        raycaster.ray.direction.x += (Math.random() - 0.5) * spread;
        raycaster.ray.direction.y += (Math.random() - 0.5) * spread;

        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0 && intersects[0].distance <= weapon.range) {
            const hit = intersects[0];
            window.dispatchEvent(new CustomEvent('enemyHit', { 
                detail: { damage: weapon.damage, point: hit.point, object: hit.object } 
            }));
            
            // Spawn impact FX
            this.spawnImpactFX(hit.point, hit.face.normal);
        }
    }

    spawnProjectile(weapon) {
        // Simple sphere projectile
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(this.camera.position);
        // Offset slightly to right/down
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this.camera.quaternion);
        mesh.position.addScaledVector(right, 0.5);
        mesh.position.addScaledVector(down, 0.3);
        
        const velocity = this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(weapon.projectileSpeed);
        
        this.scene.add(mesh);
        this.activeProjectiles.push({ mesh, velocity, life: 5.0, damage: weapon.damage });
    }

    spawnImpactFX(point, normal) {
        // Placeholder for particle system
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(point);
        this.scene.add(mesh);
        setTimeout(() => this.scene.remove(mesh), 500);
    }

    update(delta, time) {
        const w = this.weapons[this.currentWeaponId];
        
        // Auto fire
        if (this.isFiring && w.auto) {
            this.fire(delta, time);
        } else if (this.isFiring && !w.auto) {
            // Semi-auto trigger reset logic could go here
             this.fire(delta, time);
             this.isFiring = false; // Require click per shot
        }

        // Recoil Recovery
        if (w.recoilKick > 0) {
            w.recoilKick = Math.max(0, w.recoilKick - delta * 2);
            // Apply visual kick to camera
            this.camera.rotation.x += w.recoilKick * delta * 0.5;
        }

        // ADS FOV Lerp
        if (this.targetFOV) {
            this.camera.fov += (this.targetFOV - this.camera.fov) * 10 * delta;
            this.camera.updateProjectionMatrix();
        }

        // Projectiles
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeProjectiles[i];
            p.life -= delta;
            p.mesh.position.addScaledVector(p.velocity, delta);
            
            // Simple gravity
            p.velocity.y -= 9.8 * delta;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.activeProjectiles.splice(i, 1);
                continue;
            }
            
            // Collision check (simplified)
            // In production, use octree or raycast from prev pos
        }
        
        // Update UI
        window.dispatchEvent(new CustomEvent('ammoUpdate', { 
            detail: { mag: w.currentMag, reserve: w.currentReserve, total: w.magSize } 
        }));
    }
}
