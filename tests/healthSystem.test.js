import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

describe('HealthSystem', () => {
  let HealthSystem;
  let healthSystem;
  let mockPlayer;

  beforeEach(async () => {
    // Import the module
    const module = await import('../src/systems/healthSystem.js');
    HealthSystem = module.HealthSystem;
    
    mockPlayer = {
      userData: {
        health: 100,
        maxHealth: 100,
      },
    };
  });

  describe('Initialization', () => {
    it('should create health system with default values', () => {
      healthSystem = new HealthSystem(mockPlayer);
      
      expect(healthSystem).toBeDefined();
      expect(mockPlayer.userData.health).toBe(100);
      expect(mockPlayer.userData.maxHealth).toBe(100);
    });

    it('should accept custom max health', () => {
      healthSystem = new HealthSystem(mockPlayer, 150);
      
      expect(mockPlayer.userData.maxHealth).toBe(150);
      expect(mockPlayer.userData.health).toBe(150);
    });
  });

  describe('Damage Handling', () => {
    beforeEach(() => {
      healthSystem = new HealthSystem(mockPlayer);
    });

    it('should reduce health when damaged', () => {
      const onDamageCallback = vi.fn();
      healthSystem.setCallbacks(null, onDamageCallback, null);
      
      healthSystem.takeDamage(25, 'bullet', null);
      
      expect(mockPlayer.userData.health).toBe(75);
      expect(onDamageCallback).toHaveBeenCalledWith(25, 'bullet', null);
    });

    it('should not reduce health below zero', () => {
      const onDeathCallback = vi.fn();
      healthSystem.setCallbacks(onDeathCallback, null, null);
      
      healthSystem.takeDamage(150, 'explosion', null);
      
      expect(mockPlayer.userData.health).toBe(0);
      expect(onDeathCallback).toHaveBeenCalled();
    });

    it('should handle damage with invulnerability', () => {
      healthSystem.setInvulnerable(true);
      const onDamageCallback = vi.fn();
      healthSystem.setCallbacks(null, onDamageCallback, null);
      
      healthSystem.takeDamage(50, 'bullet', null);
      
      expect(mockPlayer.userData.health).toBe(100);
      expect(onDamageCallback).not.toHaveBeenCalled();
    });
  });

  describe('Healing', () => {
    beforeEach(() => {
      healthSystem = new HealthSystem(mockPlayer);
    });

    it('should increase health when healed', () => {
      healthSystem.takeDamage(30);
      healthSystem.heal(20);
      
      expect(mockPlayer.userData.health).toBe(90);
    });

    it('should not exceed max health when healed', () => {
      healthSystem.heal(50);
      
      expect(mockPlayer.userData.health).toBe(100);
    });
  });

  describe('Health Status', () => {
    beforeEach(() => {
      healthSystem = new HealthSystem(mockPlayer);
    });

    it('should return correct health percentage', () => {
      healthSystem.takeDamage(25);
      
      expect(healthSystem.getHealthPercentage()).toBe(0.75);
    });

    it('should report if player is alive', () => {
      expect(healthSystem.isAlive()).toBe(true);
      
      healthSystem.takeDamage(100);
      
      expect(healthSystem.isAlive()).toBe(false);
    });

    it('should report if player is at full health', () => {
      expect(healthSystem.isAtFullHealth()).toBe(true);
      
      healthSystem.takeDamage(10);
      
      expect(healthSystem.isAtFullHealth()).toBe(false);
    });
  });
});
