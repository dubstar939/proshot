// ============================================
// AI STATE MACHINE
// Generic finite state machine for enemy behaviors
// Supports hierarchical states and transitions
// ============================================

const STATE_TYPE = {
  IDLE: 'idle',
  PATROL: 'patrol',
  CHASE: 'chase',
  ATTACK: 'attack',
  SEARCH: 'search',
  ALERT: 'alert',
  FLEE: 'flee',
  DEAD: 'dead',
};

class StateMachine {
  constructor(initialState = null) {
    this.currentState = null;
    this.states = new Map();
    this.transitions = [];
    this.data = {};
    
    if (initialState) {
      this.setState(initialState);
    }
  }
  
  addState(name, config = {}) {
    const state = {
      name,
      onEnter: config.onEnter || (() => {}),
      onExit: config.onExit || (() => {}),
      onUpdate: config.onUpdate || (() => {}),
      canTransition: config.canTransition || (() => true),
      data: config.data || {},
    };
    
    this.states.set(name, state);
    return this;
  }
  
  addTransition(from, to, condition) {
    this.transitions.push({
      from,
      to,
      condition: condition || (() => true),
    });
    return this;
  }
  
  setState(stateName, params = {}) {
    if (!this.states.has(stateName)) {
      console.warn(`State "${stateName}" does not exist`);
      return false;
    }
    
    // Exit current state
    if (this.currentState) {
      const currentState = this.states.get(this.currentState);
      currentState.onExit(this.data, params);
    }
    
    // Enter new state
    const newState = this.states.get(stateName);
    this.currentState = stateName;
    this.data.state = stateName;
    newState.onEnter(this.data, params);
    
    return true;
  }
  
  update(deltaTime, context = {}) {
    if (!this.currentState) return;
    
    const state = this.states.get(this.currentState);
    
    // Update state
    state.onUpdate(deltaTime, this.data, context);
    
    // Check transitions
    for (const transition of this.transitions) {
      if (transition.from === this.currentState) {
        if (transition.condition(deltaTime, this.data, context)) {
          this.setState(transition.to);
          break;
        }
      }
    }
  }
  
  getCurrentState() {
    return this.currentState;
  }
  
  isInState(stateName) {
    return this.currentState === stateName;
  }
  
  getData(key) {
    return this.data[key];
  }
  
  setData(key, value) {
    this.data[key] = value;
  }
  
  reset() {
    if (this.currentState) {
      const state = this.states.get(this.currentState);
      state.onExit(this.data, {});
    }
    this.currentState = null;
    this.data = {};
  }
}

// Pre-built common state behaviors
const CommonBehaviors = {
  // Patrol behavior with waypoints
  createPatrolState(waypoints = [], waitTime = 2, speed = 2) {
    let currentWaypointIndex = 0;
    let waitTimer = 0;
    
    return {
      onEnter: (data) => {
        currentWaypointIndex = 0;
        waitTimer = 0;
        data.patrolActive = true;
      },
      onExit: (data) => {
        data.patrolActive = false;
      },
      onUpdate: (deltaTime, data, context) => {
        if (!data.targetEntity) return;
        
        const entity = data.targetEntity;
        const currentWaypoint = waypoints[currentWaypointIndex];
        
        if (!currentWaypoint) return;
        
        // Wait at waypoint
        if (waitTimer > 0) {
          waitTimer -= deltaTime;
          return;
        }
        
        // Move to waypoint
        const distance = entity.position.distanceTo(currentWaypoint);
        
        if (distance < 0.5) {
          // Reached waypoint, wait
          waitTimer = waitTime;
          currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.length;
        } else {
          // Move towards waypoint
          const direction = new THREE.Vector3().subVectors(currentWaypoint, entity.position).normalize();
          if (context.moveTo) {
            context.moveTo(direction, speed);
          }
          if (context.lookAtDirection) {
            context.lookAtDirection(direction);
          }
        }
      },
    };
  },
  
  // Chase behavior targeting a position
  createChaseState(targetKey = 'targetPosition', speed = 5) {
    return {
      onEnter: (data, params) => {
        data.chaseSpeed = params.speed || speed;
        data.chaseTarget = targetKey;
      },
      onUpdate: (deltaTime, data, context) => {
        if (!data.targetEntity || !data[data.chaseTarget]) return;
        
        const entity = data.targetEntity;
        const targetPos = data[data.chaseTarget];
        const distance = entity.position.distanceTo(targetPos);
        
        if (distance < 0.5) return;
        
        const direction = new THREE.Vector3().subVectors(targetPos, entity.position).normalize();
        if (context.moveTo) {
          context.moveTo(direction, data.chaseSpeed);
        }
        if (context.lookAtPosition) {
          context.lookAtPosition(targetPos);
        }
      },
    };
  },
  
  // Attack behavior with cooldown
  createAttackState(attackRange = 10, attackCooldown = 1, attackCallback = null) {
    let attackTimer = 0;
    
    return {
      onEnter: (data) => {
        attackTimer = 0;
      },
      onUpdate: (deltaTime, data, context) => {
        if (!data.targetEntity) return;
        
        attackTimer -= deltaTime;
        
        if (attackTimer <= 0 && attackCallback) {
          attackCallback(data, context);
          attackTimer = attackCooldown;
        }
        
        // Face target
        if (data[data.targetPositionKey] && context.lookAtPosition) {
          context.lookAtPosition(data[data.targetPositionKey]);
        }
      },
    };
  },
  
  // Search behavior for last known position
  createSearchState(duration = 5, speed = 3) {
    let searchTimer = 0;
    
    return {
      onEnter: (data) => {
        searchTimer = duration;
      },
      onUpdate: (deltaTime, data, context) => {
        searchTimer -= deltaTime;
        
        if (!data.lastKnownPosition || !data.targetEntity) return;
        
        const entity = data.targetEntity;
        const distance = entity.position.distanceTo(data.lastKnownPosition);
        
        if (distance < 0.5) {
          // Look around at last known position
          if (context.lookAround) {
            context.lookAround(deltaTime);
          }
        } else {
          // Move to last known position
          const direction = new THREE.Vector3().subVectors(data.lastKnownPosition, entity.position).normalize();
          if (context.moveTo) {
            context.moveTo(direction, speed);
          }
        }
      },
      canTransition: () => searchTimer <= 0,
    };
  },
};

export { StateMachine, STATE_TYPE, CommonBehaviors };
