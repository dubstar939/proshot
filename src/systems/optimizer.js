**
 * PROSHOT OPTIMIZATION SYSTEM (H1-H3)
 * Object Pooling, Culling Helpers, Memory Safety
 */

import * as THREE from 'three';

export class OptimizerSystem {
    constructor(scene) {
        this.scene = scene;
        
        // H1: Object Pools
        this.pools = {
            bullets: [],
            enemies: [],
            fx: [],
            shells: []
        };
        
        this.poolConfigs = {
            bullets: { initialSize: 100, expandBy: 50 },
            enemies: { initialSize: 20, expandBy: 10 },
            fx: { initialSize: 50, expandBy: 20 },
            shells: { initialSize: 200, expandBy: 100 }
        };

        this.initializePools();
        
        // Diagnostics
        this.stats = {
            activeObjects: 0,
            pooledObjects: 0
        };
    }

    initializePools() {
        for (const [key, config] of Object.entries(this.poolConfigs)) {
            for (let i = 0; i < config.initialSize; i++) {
                this.expandPool(key);
            }
        }
        console.log('[Optimizer] Pools initialized');
    }

    expandPool(type) {
        // Factory logic would go here based on type
        // For now, we create generic placeholders or specific meshes if factory provided
        let obj;
        
        if (type === 'bullets') {
            // Example: Sphere geometry reused
            const geo = new THREE.SphereGeometry(0.1, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            obj = new THREE.Mesh(geo, mat);
            obj.visible = false;
            obj.userData = { active: false, type: 'bullet' };
        } else if (type === 'shells') {
            const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 5);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8 });
            obj = new THREE.Mesh(geo, mat);
            obj.visible = false;
            obj.userData = { active: false, type: 'shell' };
        } else {
            // Generic container for enemies/FX
            obj = new THREE.Group();
            obj.visible = false;
            obj.userData = { active: false, type };
        }

        this.scene.add(obj);
        this.pools[type].push(obj);
    }

    /**
     * H1: Get Object from Pool
     */
    getFromPool(type, setupCallback) {
        const pool = this.pools[type];
        let obj = pool.find(o => !o.userData.active);

        if (!obj) {
            // Expand pool if empty
            this.expandPool(type);
            obj = pool[pool.length - 1];
        }

        obj.userData.active = true;
        obj.visible = true;
        
        if (setupCallback) setupCallback(obj);
        
        return obj;
    }

    /**
     * H1: Return Object to Pool
     */
    returnToPool(obj) {
        const type = obj.userData.type;
        if (this.pools[type]) {
            obj.userData.active = false;
            obj.visible = false;
            // Reset transforms
            obj.position.set(0, -1000, 0); // Hide far away
            obj.rotation.set(0, 0, 0);
        }
    }

    /**
     * H2: Memory Safety - Null Check & Cleanup
     */
    safeRemove(object) {
        if (!object) return;
        
        // Dispose geometries and materials to prevent leaks
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
        
        if (object.parent) {
            object.parent.remove(object);
        }
        
        // If pooled, return instead of delete
        if (object.userData && object.userData.type && this.pools[object.userData.type]) {
            this.returnToPool(object);
        }
    }

    /**
     * H1: Frustum Culling Helper (Manual check if needed)
     */
    isInFrustum(camera, object) {
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);
        
        const box = new THREE.Box3().setFromObject(object);
        return frustum.intersectsBox(box);
    }

    update(dt) {
        // Update active pooled objects (e.g., bullet movement, shell gravity)
        this.pools.bullets.forEach(b => {
            if (b.userData.active) {
                // Simple gravity/drop for spent shells or bullet travel
                if(b.userData.type === 'shell') {
                    b.position.y -= 9.8 * dt;
                    if(b.position.y < 0) this.returnToPool(b);
                }
            }
        });
        
        this.updateStats();
    }

    updateStats() {
        let active = 0;
        let pooled = 0;
        for (const key in this.pools) {
            this.pools[key].forEach(o => {
                if (o.userData.active) active++;
                else pooled++;
            });
        }
        this.stats.activeObjects = active;
        this.stats.pooledObjects = pooled;
    }
    
    getDiagnostics() {
        return this.stats;
    }
}
