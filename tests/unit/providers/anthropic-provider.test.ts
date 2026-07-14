/**
 * Anthropic Provider Tests
 *
 * Tests for the Anthropic provider implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../src/main/ai/providers/anthropic-provider';

describe('Anthropic Provider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
      defaultModel: 'claude-3-5-sonnet-20241022',
    });
  });

  describe('Provider Configuration', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('anthropic');
    });

    it('should return available models', () => {
      const models = provider.getAvailableModels();
      expect(models).toContain('claude-3-5-sonnet-20241022');
      expect(models).toContain('claude-3-opus-20240229');
      expect(models).toContain('claude-3-haiku-20240307');
    });

    it('should be configured with valid API key', () => {
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not be configured without API key', () => {
      const unconfigured = new AnthropicProvider({ apiKey: '' });
      expect(unconfigured.isConfigured()).toBe(false);
    });

    it('should return config without API key', () => {
      const config = provider.getConfig();
      expect(config).not.toHaveProperty('apiKey');
      expect(config.defaultModel).toBe('claude-3-5-sonnet-20241022');
    });

    it('should update config', () => {
      provider.updateConfig({ defaultModel: 'claude-3-opus-20240229' });
      const config = provider.getConfig();
      expect(config.defaultModel).toBe('claude-3-opus-20240229');
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', () => {
      const validateApiKey = (provider as any).validateApiKey.bind(provider);
      expect(validateApiKey('sk-ant-test1234567890abcdefghijklmnopqrstuvwxyz')).toBe(true);
    });

    it('should reject invalid API key format', () => {
      const validateApiKey = (provider as any).validateApiKey.bind(provider);
      expect(validateApiKey('invalid-key')).toBe(false);
      expect(validateApiKey('sk-short')).toBe(false);
      expect(validateApiKey('sk-test1234567890abcdefghijklmnopqrstuvwxyz')).toBe(false);
    });
  });

  describe('Request Preparation', () => {
    it('should prepare headers correctly', () => {
      const prepareHeaders = (provider as any).prepareHeaders.bind(provider);
      const headers = prepareHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-api-key']).toBe('sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz');
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('should use custom API version', () => {
      const providerWithVersion = new AnthropicProvider({
        apiKey: 'sk-ant-test-key-1234567890abcdefghijklmnopqrstuvwxyz',
        apiVersion: '2024-01-01',
      });

      const prepareHeaders = (providerWithVersion as any).prepareHeaders.bind(providerWithVersion);
      const headers = prepareHeaders();

      expect(headers['anthropic-version']).toBe('2024-01-01');
    });

    it('should prepare body correctly', () => {
      const prepareBody = (provider as any).prepareBody.bind(provider);
      const body = prepareBody({
        model: 'claude-3-5-sonnet-20241022',
        packageData: {
          manifest: '{}',
          schema: '{}',
          prompt: 'Analyze this film',
          frames: [],
          subtitles: [],
        },
      });

      expect(body).toHaveProperty('model', 'claude-3-5-sonnet-20241022');
      expect(body).toHaveProperty('system');
      expect(body).toHaveProperty('messages');
      expect(body).toHaveProperty('max_tokens', 4096);
    });
  });

  describe('Response Parsing', () => {
    it('should parse successful response', () => {
      const parseResponse = (provider as any).parseResponse.bind(provider);
      const response = parseResponse({
        content: [
          {
            type: 'text',
            text: '{"summary": "Test analysis"}',
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 200,
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

    it('should handle multiple text blocks', () => {
      const parseResponse = (provider as any).parseResponse.bind(provider);
      const response = parseResponse({
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: ' Part 2' },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 200,
        },
      });

      expect(response.success).toBe(true);
      expect(response.result).toBe('Part 1 Part 2');
    });

    it('should handle empty content', () => {
      const parseResponse = (provider as any).parseResponse.bind(provider);
      const response = parseResponse({
        content: [],
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('No response from Anthropic');
    });
  });

  describe('Stream Chunk Parsing', () => {
    it('should parse content block delta', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        type: 'content_block_delta',
        delta: {
          type: 'text_delta',
          text: 'Hello',
        },
      }));

      expect(chunk).toEqual({
        type: 'content',
        content: 'Hello',
      });
    });

    it('should parse message delta with usage', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        type: 'message_delta',
        usage: {
          output_tokens: 200,
        },
      }));

      expect(chunk).toEqual({
        type: 'done',
        usage: {
          promptTokens: 0,
          completionTokens: 200,
          totalTokens: 200,
        },
      });
    });

    it('should parse message start with usage', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        type: 'message_start',
        message: {
          usage: {
            input_tokens: 100,
          },
        },
      }));

      expect(chunk).toEqual({
        type: 'content',
        content: '',
        usage: {
          promptTokens: 100,
          completionTokens: 0,
          totalTokens: 100,
        },
      });
    });

    it('should return null for unknown chunk type', () => {
      const parseStreamChunk = (provider as any).parseStreamChunk.bind(provider);
      const chunk = parseStreamChunk(JSON.stringify({
        type: 'unknown',
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
