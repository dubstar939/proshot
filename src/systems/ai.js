import * as THREE from 'three';

const AI_STATE = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    SEARCH: 'search',
    DEAD: 'dead'
};

export class EnemyAI {
    constructor(scene, player, difficulty = 1) {
        this.scene = scene;
        this.player = player;
        this.difficulty = difficulty;
        
        this.mesh = null;
        this.state = AI_STATE.IDLE;
        this.health = 100 * difficulty;
        this.speed = 3.0;
        this.detectionRange = 20;
        this.attackRange = 15;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.waitTime = 0;
        this.lastAttackTime = 0;
        this.attackCooldown = 1.0;
        
        this.createEnemyMesh();
    }

    createEnemyMesh() {
        const geo = new THREE.BoxGeometry(1, 2, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(Math.random()*20-10, 1, Math.random()*20-10);
        this.scene.add(this.mesh);
        
        // Setup simple patrol points around spawn
        for(let i=0; i<4; i++) {
            this.patrolPoints.push(
                new THREE.Vector3(
                    this.mesh.position.x + (Math.random()-0.5)*10,
                    1,
                    this.mesh.position.z + (Math.random()-0.5)*10
                )
            );
        }
    }

    update(delta, time) {
        if (this.state === AI_STATE.DEAD) return;
        
        const distToPlayer = this.mesh.position.distanceTo(this.player.position);
        const hasLOS = this.checkLineOfSight();

        // State Transitions
        if (this.state === AI_STATE.IDLE || this.state === AI_STATE.PATROL) {
            if (distToPlayer < this.detectionRange && hasLOS) {
                this.state = AI_STATE.CHASE;
            } else if (this.state === AI_STATE.PATROL) {
                this.patrol(delta);
            } else {
                // Randomly start patrolling
                if (Math.random() < 0.01) this.state = AI_STATE.PATROL;
            }
        } else if (this.state === AI_STATE.CHASE) {
            if (distToPlayer > this.detectionRange * 1.5 || !hasLOS) {
                this.state = AI_STATE.SEARCH;
                this.searchTarget = this.player.position.clone();
            } else {
                this.chase(delta);
                if (distToPlayer < this.attackRange) {
                    this.state = AI_STATE.ATTACK;
                }
            }
        } else if (this.state === AI_STATE.ATTACK) {
            if (distToPlayer > this.attackRange) {
                this.state = AI_STATE.CHASE;
            } else {
                this.attack(time);
            }
        } else if (this.state === AI_STATE.SEARCH) {
            if (this.mesh.position.distanceTo(this.searchTarget) < 1) {
                this.state = AI_STATE.PATROL;
            } else {
                this.moveTo(this.searchTarget, delta);
            }
        }
    }

    patrol(delta) {
        const target = this.patrolPoints[this.currentPatrolIndex];
        if (this.mesh.position.distanceTo(target) < 1) {
            this.waitTime -= delta;
            if (this.waitTime <= 0) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
                this.waitTime = 2.0;
            }
        } else {
            this.moveTo(target, delta);
        }
    }

    chase(delta) {
        this.moveTo(this.player.position, delta);
    }

    moveTo(target, delta) {
        const dir = new THREE.Vector3().subVectors(target, this.mesh.position).normalize();
        dir.y = 0;
        this.mesh.position.addScaledVector(dir, this.speed * delta);
        this.mesh.lookAt(target.x, this.mesh.position.y, target.z);
    }

    attack(time) {
        if (time - this.lastAttackTime > this.attackCooldown) {
            this.lastAttackTime = time;
            // Fire projectile or hitscan at player
            window.dispatchEvent(new CustomEvent('enemyAttack', { 
                detail: { damage: 10 * this.difficulty, source: this } 
            }));
        }
    }

    checkLineOfSight() {
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.mesh.position, new THREE.Vector3().subVectors(this.player.position, this.mesh.position).normalize());
        const intersects = raycaster.intersectObjects(this.scene.children);
        // If first hit is player (or child of player group), LOS exists
        if (intersects.length > 0) {
            return intersects[0].distance > this.mesh.position.distanceTo(this.player.position) - 1;
        }
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.state = AI_STATE.DEAD;
        this.mesh.material.color.set(0x555555);
        // Drop loot logic here
        setTimeout(() => {
            this.scene.remove(this.mesh);
            window.dispatchEvent(new CustomEvent('enemyKilled', { detail: { enemy: this } }));
        }, 2000);
    }
}

export class AISpawner {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.enemies = [];
        this.wave = 1;
        this.enemiesPerWave = 5;
        this.spawnTimer = 0;
        this.active = true;
    }

    startWave() {
        console.log(`Starting Wave ${this.wave}`);
        this.spawnTimer = 0;
    }

    update(delta, time) {
        if (!this.active) return;
        
        // Spawn logic
        if (this.enemies.length < this.enemiesPerWave * this.wave && this.spawnTimer <= 0) {
            const enemy = new EnemyAI(this.scene, this.player, 1 + (this.wave * 0.1));
            this.enemies.push(enemy);
            this.spawnTimer = 2.0; // Delay between spawns
        }
        this.spawnTimer -= delta;

        // Update enemies
        this.enemies.forEach(e => e.update(delta, time));
        
        // Cleanup dead
        this.enemies = this.enemies.filter(e => e.state !== AI_STATE.DEAD || e.mesh.parent !== null);

        // Wave complete check
        if (this.enemies.length === 0 && this.spawnTimer <= 0) {
            this.wave++;
            this.startWave();
            window.dispatchEvent(new CustomEvent('waveComplete', { detail: { wave: this.wave - 1 } }));
        }
    }
}
