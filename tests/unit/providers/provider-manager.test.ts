/**
 * Provider Manager Tests
 *
 * Tests for the provider manager implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test'),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((str) => Buffer.from(str)),
    decryptString: vi.fn((buf) => buf.toString()),
  },
}));

import { ProviderManager } from '../../../src/main/ai/providers/provider-manager';

describe('Provider Manager', () => {
  let manager: ProviderManager;

  beforeEach(() => {
    manager = new ProviderManager();
  });

  describe('Provider Configuration', () => {
    it('should configure OpenAI provider', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      expect(manager.isProviderConfigured('openai')).toBe(true);
      expect(manager.getConfiguredProviders()).toContain('openai');
    });

    it('should configure Anthropic provider', () => {
      manager.configureProvider('anthropic', {
        apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      expect(manager.isProviderConfigured('anthropic')).toBe(true);
      expect(manager.getConfiguredProviders()).toContain('anthropic');
    });

    it('should configure multiple providers', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      manager.configureProvider('anthropic', {
        apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      expect(manager.getConfiguredProviders()).toHaveLength(2);
      expect(manager.getConfiguredProviders()).toContain('openai');
      expect(manager.getConfiguredProviders()).toContain('anthropic');
    });

    it('should update provider configuration', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
        defaultModel: 'gpt-4o',
      });

      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
        defaultModel: 'gpt-4-turbo',
      });

      const provider = manager.getProvider('openai');
      expect(provider?.getConfig().defaultModel).toBe('gpt-4-turbo');
    });
  });

  describe('Active Provider', () => {
    it('should set first configured provider as active', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      expect(manager.getActiveProviderType()).toBe('openai');
    });

    it('should set active provider explicitly', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      manager.configureProvider('anthropic', {
        apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      manager.setActiveProvider('anthropic');
      expect(manager.getActiveProviderType()).toBe('anthropic');
    });

    it('should throw error when setting unconfigured provider as active', () => {
      expect(() => manager.setActiveProvider('openai')).toThrow('Provider openai not configured');
    });

    it('should get active provider', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      const provider = manager.getProvider();
      expect(provider).toBeDefined();
      expect(provider?.getProviderName()).toBe('openai');
    });

    it('should get provider by type', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      manager.configureProvider('anthropic', {
        apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      const openai = manager.getProvider('openai');
      const anthropic = manager.getProvider('anthropic');

      expect(openai?.getProviderName()).toBe('openai');
      expect(anthropic?.getProviderName()).toBe('anthropic');
    });

    it('should return null for unconfigured provider', () => {
      const provider = manager.getProvider('openai');
      expect(provider).toBeNull();
    });

    it('should return null when no active provider', () => {
      const provider = manager.getProvider();
      expect(provider).toBeNull();
    });
  });

  describe('Provider Status', () => {
    it('should get provider status', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      const status = manager.getProviderStatus('openai');

      expect(status.configured).toBe(true);
      expect(status.active).toBe(true);
      expect(status.models).toContain('gpt-4o');
    });

    it('should get unconfigured provider status', () => {
      const status = manager.getProviderStatus('openai');

      expect(status.configured).toBe(false);
      expect(status.active).toBe(false);
      expect(status.models).toHaveLength(0);
    });

    it('should get all provider statuses', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      const statuses = manager.getAllProviderStatuses();

      expect(statuses.openai.configured).toBe(true);
      expect(statuses.anthropic.configured).toBe(false);
    });
  });

  describe('Available Models', () => {
    it('should get models for configured provider', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      const models = manager.getAvailableModels('openai');
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4-turbo');
      expect(models).toContain('gpt-3.5-turbo');
    });

    it('should get models for active provider', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      const models = manager.getAvailableModels();
      expect(models).toContain('gpt-4o');
    });

    it('should return empty array for unconfigured provider', () => {
      const models = manager.getAvailableModels('openai');
      expect(models).toHaveLength(0);
    });
  });

  describe('Provider Operations', () => {
    it('should throw error when no provider configured for analyze', async () => {
      await expect(manager.analyze({ model: 'gpt-4o' })).rejects.toThrow(
        'No AI provider configured'
      );
    });

    it('should throw error when provider not configured for analyze', async () => {
      manager.configureProvider('openai', {
        apiKey: '',
      });

      await expect(
        manager.analyze({
          model: 'gpt-4o',
          packageData: {
            manifest: '{}',
            schema: '{}',
            prompt: 'test',
            frames: [],
            subtitles: [],
          },
        })
      ).rejects.toThrow('Provider openai not configured');
    });

    it('should cancel request', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      // Should not throw
      manager.cancel('openai');
    });

    it('should cancel all requests', () => {
      manager.configureProvider('openai', {
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      manager.configureProvider('anthropic', {
        apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      });

      // Should not throw
      manager.cancelAll();
    });
  });
});
