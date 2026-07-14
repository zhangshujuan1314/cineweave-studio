/**
 * AI Provider Manager
 *
 * Manages multiple AI providers (OpenAI, Anthropic, etc.)
 * Handles provider selection, configuration, and fallback.
 */

import { BaseAIProvider, AIAnalysisRequest, AIAnalysisResponse, AIStreamCallback } from './base-provider';
import { OpenAIProvider, OpenAIConfig } from './openai-provider';
import { AnthropicProvider, AnthropicConfig } from './anthropic-provider';
import { KeyStorage, getKeyStorage, initializeKeyStorage } from './key-storage';

export type ProviderType = 'openai' | 'anthropic';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  defaultModel?: string;
  timeout?: number;
}

export interface ProviderManagerOptions {
  /** Storage directory for API keys */
  storageDir?: string;
  /** Enable key encryption */
  encryptKeys?: boolean;
}

/**
 * AI Provider Manager
 */
export class ProviderManager {
  private providers: Map<ProviderType, BaseAIProvider> = new Map();
  private keyStorage: KeyStorage;
  private activeProvider: ProviderType | null = null;

  constructor(options?: ProviderManagerOptions) {
    this.keyStorage = getKeyStorage({
      storageDir: options?.storageDir,
      encrypt: options?.encryptKeys,
    });
  }

  /**
   * Initialize provider manager
   */
  async initialize(): Promise<void> {
    await this.keyStorage.initialize();

    // Load saved API keys
    const providers = this.keyStorage.listProviders();
    for (const provider of providers) {
      const apiKey = await this.keyStorage.getKey(provider);
      if (apiKey) {
        this.configureProvider(provider as ProviderType, { apiKey });
      }
    }
  }

  /**
   * Configure a provider
   */
  configureProvider(type: ProviderType, config: Partial<ProviderConfig>): void {
    const existingProvider = this.providers.get(type);
    const existingConfig = existingProvider?.getConfig();

    const fullConfig: ProviderConfig = {
      type,
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || existingConfig?.baseUrl,
      organizationId: config.organizationId || (existingConfig as any)?.organizationId,
      defaultModel: config.defaultModel || existingConfig?.defaultModel,
      timeout: config.timeout || existingConfig?.timeout,
    };

    let provider: BaseAIProvider;

    switch (type) {
      case 'openai':
        provider = new OpenAIProvider(fullConfig as OpenAIConfig);
        break;
      case 'anthropic':
        provider = new AnthropicProvider(fullConfig as AnthropicConfig);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    this.providers.set(type, provider);

    // Set as active if it's the first provider or explicitly configured
    if (!this.activeProvider || config.apiKey) {
      this.activeProvider = type;
    }
  }

  /**
   * Save API key securely
   */
  async saveApiKey(type: ProviderType, apiKey: string): Promise<void> {
    await this.keyStorage.storeKey(type, apiKey);
    this.configureProvider(type, { apiKey });
  }

  /**
   * Remove API key
   */
  async removeApiKey(type: ProviderType): Promise<boolean> {
    const removed = await this.keyStorage.removeKey(type);
    if (removed) {
      this.providers.delete(type);
      if (this.activeProvider === type) {
        this.activeProvider = this.providers.keys().next().value || null;
      }
    }
    return removed;
  }

  /**
   * Get provider
   */
  getProvider(type?: ProviderType): BaseAIProvider | null {
    const providerType = type || this.activeProvider;

    if (!providerType) {
      return null;
    }

    return this.providers.get(providerType) || null;
  }

  /**
   * Get active provider type
   */
  getActiveProviderType(): ProviderType | null {
    return this.activeProvider;
  }

  /**
   * Set active provider
   */
  setActiveProvider(type: ProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider ${type} not configured`);
    }
    this.activeProvider = type;
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(type: ProviderType): boolean {
    const provider = this.providers.get(type);
    return provider?.isConfigured() || false;
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(type?: ProviderType): string[] {
    const provider = this.getProvider(type);
    return provider?.getAvailableModels() || [];
  }

  /**
   * Send analysis request
   */
  async analyze(request: AIAnalysisRequest, providerType?: ProviderType): Promise<AIAnalysisResponse> {
    const provider = this.getProvider(providerType);

    if (!provider) {
      throw new Error('No AI provider configured');
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${provider.getProviderName()} not configured`);
    }

    return provider.analyze(request);
  }

  /**
   * Send analysis request with streaming
   */
  async analyzeStream(
    request: AIAnalysisRequest,
    callback: AIStreamCallback,
    providerType?: ProviderType
  ): Promise<AIAnalysisResponse> {
    const provider = this.getProvider(providerType);

    if (!provider) {
      throw new Error('No AI provider configured');
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${provider.getProviderName()} not configured`);
    }

    return provider.analyzeStream(request, callback);
  }

  /**
   * Cancel ongoing request
   */
  cancel(providerType?: ProviderType): void {
    const provider = this.getProvider(providerType);
    provider?.cancel();
  }

  /**
   * Cancel all ongoing requests
   */
  cancelAll(): void {
    for (const provider of this.providers.values()) {
      provider.cancel();
    }
  }

  /**
   * Get provider status
   */
  getProviderStatus(type: ProviderType): {
    configured: boolean;
    active: boolean;
    models: string[];
  } {
    const provider = this.providers.get(type);

    return {
      configured: provider?.isConfigured() || false,
      active: this.activeProvider === type,
      models: provider?.getAvailableModels() || [],
    };
  }

  /**
   * Get all provider statuses
   */
  getAllProviderStatuses(): Record<ProviderType, {
    configured: boolean;
    active: boolean;
    models: string[];
  }> {
    return {
      openai: this.getProviderStatus('openai'),
      anthropic: this.getProviderStatus('anthropic'),
    };
  }
}

/**
 * Global provider manager instance
 */
let providerManagerInstance: ProviderManager | null = null;

/**
 * Get or create provider manager instance
 */
export function getProviderManager(options?: ProviderManagerOptions): ProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager(options);
  }
  return providerManagerInstance;
}

/**
 * Initialize provider manager
 */
export async function initializeProviderManager(
  options?: ProviderManagerOptions
): Promise<ProviderManager> {
  const manager = getProviderManager(options);
  await manager.initialize();
  return manager;
}
