/**
 * OpenAI Provider Tests
 *
 * Tests for the OpenAI provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../../src/main/ai/providers/openai-provider';

describe('OpenAI Provider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({
      apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      defaultModel: 'gpt-4o',
    });
  });

  describe('Provider Configuration', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('openai');
    });

    it('should return available models', () => {
      const models = provider.getAvailableModels();
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4-turbo');
      expect(models).toContain('gpt-3.5-turbo');
    });

    it('should be configured with valid API key', () => {
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not be configured without API key', () => {
      const unconfigured = new OpenAIProvider({ apiKey: '' });
      expect(unconfigured.isConfigured()).toBe(false);
    });

    it('should return config without API key', () => {
      const config = provider.getConfig();
      expect(config).not.toHaveProperty('apiKey');
      expect(config.defaultModel).toBe('gpt-4o');
    });

    it('should update config', () => {
      provider.updateConfig({ defaultModel: 'gpt-4-turbo' });
      const config = provider.getConfig();
      expect(config.defaultModel).toBe('gpt-4-turbo');
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', () => {
      // Access protected method for testing
      const validateApiKey = (provider as any).validateApiKey.bind(provider);
      expect(validateApiKey('sk-test1234567890abcdefghijklmnopqrstuvwxyz')).toBe(true);
    });

    it('should reject invalid API key format', () => {
      const validateApiKey = (provider as any).validateApiKey.bind(provider);
      expect(validateApiKey('invalid-key')).toBe(false);
      expect(validateApiKey('sk-short')).toBe(false);
    });
  });

  describe('Request Preparation', () => {
    it('should prepare headers correctly', () => {
      const prepareHeaders = (provider as any).prepareHeaders.bind(provider);
      const headers = prepareHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz');
    });

    it('should include organization ID if provided', () => {
      const providerWithOrg = new OpenAIProvider({
        apiKey: 'sk-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
        organizationId: 'org-123',
      });

      const prepareHeaders = (providerWithOrg as any).prepareHeaders.bind(providerWithOrg);
      const headers = prepareHeaders();

      expect(headers['OpenAI-Organization']).toBe('org-123');
    });

    it('should prepare body correctly', () => {
      const prepareBody = (provider as any).prepareBody.bind(provider);
      const body = prepareBody({
        model: 'gpt-4o',
        packageData: {
          manifest: '{}',
          schema: '{}',
          prompt: 'Analyze this film',
          frames: [],
          subtitles: [],
        },
      });

      expect(body).toHaveProperty('model', 'gpt-4o');
      expect(body).toHaveProperty('messages');
      expect(body).toHaveProperty('temperature', 0.7);
      expect(body).toHaveProperty('max_tokens', 4096);
    });
  });

  describe('Response Parsing', () => {
    it('should parse successful response', () => {
      const parseResponse = (provider as any).parseResponse.bind(provider);
      const response = parseResponse({
        choices: [
          {
            message: {
              content: '{"summary": "Test analysis"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      });

      expect(response.success).toBe(true);
      expect(response.result).toBe('{"summary": "Test analysis"}');
      expect(response.usage).toEqual({
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      });
    });

    it('should handle empty response', () => {
      const parseResponse = (provider as any).parseResponse.bind(provider);
      const response = parseResponse({
        choices: [],
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('No response from OpenAI');
    });
  });

  describe('Stream Chunk Parsing', () => {
    it('should parse content chunk', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        choices: [
          {
            delta: {
              content: 'Hello',
            },
          },
        ],
      }));

      expect(chunk).toEqual({
        type: 'content',
        content: 'Hello',
      });
    });

    it('should parse done chunk', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      }));

      expect(chunk).toEqual({
        type: 'done',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      });
    });

    it('should return null for empty delta', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        choices: [
          {
            delta: {},
          },
        ],
      }));

      expect(chunk).toBeNull();
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for English text', () => {
      const estimateTokens = (provider as any).estimateTokens.bind(provider);
      const tokens = estimateTokens('Hello, how are you?');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should estimate tokens for Chinese text', () => {
      const estimateTokens = (provider as any).estimateTokens.bind(provider);
      const tokens = estimateTokens('你好，世界！');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });
  });

  describe('Error Handling', () => {
    it('should create error response', () => {
      const createErrorResponse = (provider as any).createErrorResponse.bind(provider);
      const response = createErrorResponse('Test error');

      expect(response).toEqual({
        success: false,
        error: 'Test error',
      });
    });

    it('should create success response', () => {
      const createSuccessResponse = (provider as any).createSuccessResponse.bind(provider);
      const response = createSuccessResponse('Test result', {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      });

      expect(response).toEqual({
        success: true,
        result: 'Test result',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
      });
    });
  });
});
