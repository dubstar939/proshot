// ============================================
// FINITE STATE MACHINE SYSTEM
// Generic FSM for AI behavior and game states
// Supports enter/exit/update callbacks, transitions, guards
// ============================================

/**
 * State definition for the FSM
 * @typedef {Object} StateDefinition
 * @property {string} name - State identifier
 * @property {Function} onEnter - Called when entering state
 * @property {Function} onUpdate - Called every frame while in state
 * @property {Function} onExit - Called when leaving state
 * @property {Array<Transition>} transitions - Possible transitions from this state
 */

/**
 * Transition definition
 * @typedef {Object} Transition
 * @property {string} to - Target state name
 * @property {Function} condition - Returns true when transition should occur
 * @property {Function} guard - Optional guard that can prevent transition
 * @property {number} priority - Higher priority transitions are checked first
 */

/**
 * Generic Finite State Machine
 * Used for AI behavior, game flow, and any state-based logic
 * 
 * @class StateMachine
 */
class StateMachine {
  /**
   * Create a new StateMachine
   * @param {Object} owner - The entity that owns this FSM
   * @param {string} initialState - Initial state name
   */
  constructor(owner, initialState = null) {
    this.owner = owner;
    this._states = new Map();
    this._currentState = null;
    this._previousState = null;
    this._stateTime = 0;
    this._globalTransitions = [];
    this._isLocked = false;
    this._lockTimer = 0;
    
    // Debug mode
    this._debug = false;
    this._stateHistory = [];
    this._maxHistoryLength = 10;
    
    // Blackboard for sharing data between states
    this.blackboard = {};
    
    if (initialState) {
      this._pendingInitialState = initialState;
    }
  }
  
  /**
   * Enable debug logging
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this._debug = enabled;
  }
  
  /**
   * Add a state to the FSM
   * @param {string} name - State name
   * @param {Object} config - State configuration
   * @returns {StateMachine} - For chaining
   */
  addState(name, config = {}) {
    const state = {
      name,
      onEnter: config.onEnter || (() => {}),
      onUpdate: config.onUpdate || (() => {}),
      onExit: config.onExit || (() => {}),
      transitions: config.transitions || [],
      data: config.data || {},
    };
    
    this._states.set(name, state);
    
    // If this is the pending initial state, enter it
    if (this._pendingInitialState === name && !this._currentState) {
      this.setState(name);
      this._pendingInitialState = null;
    }
    
    return this;
  }
  
  /**
   * Add a transition between states
   * @param {string} from - Source state name
   * @param {string} to - Target state name
   * @param {Function} condition - Transition condition
   * @param {Object} options - Additional options
   * @returns {StateMachine} - For chaining
   */
  addTransition(from, to, condition, options = {}) {
    const state = this._states.get(from);
    if (!state) {
      console.warn(`[StateMachine] State "${from}" not found`);
      return this;
    }
    
    state.transitions.push({
      to,
      condition,
      guard: options.guard || null,
      priority: options.priority || 0,
      cooldown: options.cooldown || 0,
      lastTransitionTime: 0,
    });
    
    // Sort by priority (higher first)
    state.transitions.sort((a, b) => b.priority - a.priority);
    
    return this;
  }
  
  /**
   * Add a global transition that can occur from any state
   * @param {string} to - Target state name
   * @param {Function} condition - Transition condition
   * @param {Object} options - Additional options
   * @returns {StateMachine} - For chaining
   */
  addGlobalTransition(to, condition, options = {}) {
    this._globalTransitions.push({
      to,
      condition,
      guard: options.guard || null,
      priority: options.priority || 0,
      excludeStates: options.excludeStates || [],
    });
    
    this._globalTransitions.sort((a, b) => b.priority - a.priority);
    
    return this;
  }
  
  /**
   * Force transition to a state
   * @param {string} stateName - Target state name
   * @param {Object} data - Optional data to pass to the new state
   */
  setState(stateName, data = {}) {
    if (this._isLocked) {
      if (this._debug) {
        console.log(`[StateMachine] Transition to "${stateName}" blocked - FSM is locked`);
      }
      return;
    }
    
    const newState = this._states.get(stateName);
    if (!newState) {
      console.warn(`[StateMachine] State "${stateName}" not found`);
      return;
    }
    
    // Exit current state
    if (this._currentState) {
      this._currentState.onExit.call(this.owner, newState.name, this.blackboard);
      this._previousState = this._currentState;
    }
    
    // Record history
    if (this._debug) {
      this._stateHistory.push({
        from: this._currentState ? this._currentState.name : null,
        to: stateName,
        time: performance.now(),
      });
      
      if (this._stateHistory.length > this._maxHistoryLength) {
        this._stateHistory.shift();
      }
      
      console.log(`[StateMachine] ${this._previousState ? this._previousState.name : 'null'} -> ${stateName}`);
    }
    
    // Enter new state
    this._currentState = newState;
    this._stateTime = 0;
    
    // Merge transition data with blackboard
    Object.assign(this.blackboard, data);
    
    this._currentState.onEnter.call(this.owner, this._previousState ? this._previousState.name : null, this.blackboard);
  }
  
  /**
   * Update the state machine
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this._currentState) return;
    
    this._stateTime += deltaTime;
    
    // Handle lock timer
    if (this._isLocked) {
      this._lockTimer -= deltaTime;
      if (this._lockTimer <= 0) {
        this._isLocked = false;
      }
    }
    
    // Check global transitions first
    if (!this._isLocked) {
      for (const transition of this._globalTransitions) {
        if (transition.excludeStates.includes(this._currentState.name)) {
          continue;
        }
        
        if (this._checkTransition(transition, deltaTime)) {
          return; // State changed, skip current state update
        }
      }
      
      // Check state-specific transitions
      for (const transition of this._currentState.transitions) {
        if (this._checkTransition(transition, deltaTime)) {
          return; // State changed, skip current state update
        }
      }
    }
    
    // Update current state
    this._currentState.onUpdate.call(this.owner, deltaTime, this.blackboard);
  }
  
  /**
   * Check if a transition should occur
   * @private
   * @param {Object} transition - Transition definition
   * @param {number} deltaTime - Time since last update
   * @returns {boolean} - True if transition occurred
   */
  _checkTransition(transition, deltaTime) {
    // Check cooldown
    if (transition.cooldown > 0) {
      const now = performance.now();
      if (now - transition.lastTransitionTime < transition.cooldown * 1000) {
        return false;
      }
    }
    
    // Check condition
    if (!transition.condition.call(this.owner, this.blackboard, this._stateTime)) {
      return false;
    }
    
    // Check guard
    if (transition.guard && !transition.guard.call(this.owner, this.blackboard)) {
      return false;
    }
    
    // Perform transition
    transition.lastTransitionTime = performance.now();
    this.setState(transition.to);
    return true;
  }
  
  /**
   * Lock the FSM to prevent state changes
   * @param {number} duration - Lock duration in seconds (0 = indefinite)
   */
  lock(duration = 0) {
    this._isLocked = true;
    this._lockTimer = duration;
  }
  
  /**
   * Unlock the FSM
   */
  unlock() {
    this._isLocked = false;
    this._lockTimer = 0;
  }
  
  /**
   * Get current state name
   * @returns {string|null}
   */
  getCurrentState() {
    return this._currentState ? this._currentState.name : null;
  }
  
  /**
   * Get previous state name
   * @returns {string|null}
   */
  getPreviousState() {
    return this._previousState ? this._previousState.name : null;
  }
  
  /**
   * Get time spent in current state
   * @returns {number}
   */
  getStateTime() {
    return this._stateTime;
  }
  
  /**
   * Check if currently in a specific state
   * @param {string} stateName
   * @returns {boolean}
   */
  isInState(stateName) {
    return this._currentState && this._currentState.name === stateName;
  }
  
  /**
   * Check if in any of the specified states
   * @param {Array<string>} stateNames
   * @returns {boolean}
   */
  isInAnyState(stateNames) {
    return this._currentState && stateNames.includes(this._currentState.name);
  }
  
  /**
   * Get state history (for debugging)
   * @returns {Array}
   */
  getHistory() {
    return [...this._stateHistory];
  }
  
  /**
   * Reset the state machine
   * @param {string} initialState - State to reset to
   */
  reset(initialState = null) {
    if (this._currentState) {
      this._currentState.onExit.call(this.owner, null, this.blackboard);
    }
    
    this._currentState = null;
    this._previousState = null;
    this._stateTime = 0;
    this._isLocked = false;
    this._lockTimer = 0;
    this._stateHistory = [];
    this.blackboard = {};
    
    if (initialState) {
      this.setState(initialState);
    }
  }
  
  /**
   * Dispose of the state machine
   */
  dispose() {
    this.reset();
    this._states.clear();
    this._globalTransitions = [];
  }
}

/**
 * Hierarchical State Machine
 * Extends StateMachine to support nested state machines
 * 
 * @class HierarchicalStateMachine
 * @extends StateMachine
 */
class HierarchicalStateMachine extends StateMachine {
  constructor(owner, initialState = null) {
    super(owner, initialState);
    this._subMachines = new Map();
  }
  
  /**
   * Add a sub-state machine to a state
   * @param {string} parentState - Parent state name
   * @param {StateMachine} subMachine - Sub state machine
   */
  addSubMachine(parentState, subMachine) {
    this._subMachines.set(parentState, subMachine);
  }
  
  /**
   * Get the sub-machine for current state
   * @returns {StateMachine|null}
   */
  getActiveSubMachine() {
    if (!this._currentState) return null;
    return this._subMachines.get(this._currentState.name) || null;
  }
  
  /**
   * Override setState to handle sub-machines
   */
  setState(stateName, data = {}) {
    // Exit sub-machine if leaving a state with one
    const currentSubMachine = this.getActiveSubMachine();
    if (currentSubMachine) {
      currentSubMachine.reset();
    }
    
    super.setState(stateName, data);
    
    // Enter sub-machine if new state has one
    const newSubMachine = this.getActiveSubMachine();
    if (newSubMachine) {
      newSubMachine.reset(newSubMachine._pendingInitialState);
    }
  }
  
  /**
   * Override update to update sub-machines
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    const subMachine = this.getActiveSubMachine();
    if (subMachine) {
      subMachine.update(deltaTime);
    }
  }
}

/**
 * State Builder for fluent state definition
 * 
 * @class StateBuilder
 */
class StateBuilder {
  constructor(fsm, stateName) {
    this._fsm = fsm;
    this._stateName = stateName;
    this._config = {
      onEnter: () => {},
      onUpdate: () => {},
      onExit: () => {},
      transitions: [],
      data: {},
    };
  }
  
  /**
   * Set enter callback
   * @param {Function} callback
   * @returns {StateBuilder}
   */
  onEnter(callback) {
    this._config.onEnter = callback;
    return this;
  }
  
  /**
   * Set update callback
   * @param {Function} callback
   * @returns {StateBuilder}
   */
  onUpdate(callback) {
    this._config.onUpdate = callback;
    return this;
  }
  
  /**
   * Set exit callback
   * @param {Function} callback
   * @returns {StateBuilder}
   */
  onExit(callback) {
    this._config.onExit = callback;
    return this;
  }
  
  /**
   * Add state data
   * @param {Object} data
   * @returns {StateBuilder}
   */
  withData(data) {
    this._config.data = { ...this._config.data, ...data };
    return this;
  }
  
  /**
   * Add transition
   * @param {string} targetState
   * @param {Function} condition
   * @param {Object} options
   * @returns {StateBuilder}
   */
  transitionTo(targetState, condition, options = {}) {
    this._config.transitions.push({
      to: targetState,
      condition,
      guard: options.guard || null,
      priority: options.priority || 0,
      cooldown: options.cooldown || 0,
      lastTransitionTime: 0,
    });
    return this;
  }
  
  /**
   * Build and add the state to the FSM
   * @returns {StateMachine}
   */
  build() {
    this._fsm.addState(this._stateName, this._config);
    return this._fsm;
  }
}

/**
 * Create a state builder for fluent API
 * @param {StateMachine} fsm
 * @param {string} stateName
 * @returns {StateBuilder}
 */
function createState(fsm, stateName) {
  return new StateBuilder(fsm, stateName);
}

export {
  StateMachine,
  HierarchicalStateMachine,
  StateBuilder,
  createState,
};
