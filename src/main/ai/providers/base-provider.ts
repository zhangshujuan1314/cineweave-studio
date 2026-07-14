/**
 * Base AI Provider
 *
 * Abstract base class for AI providers (OpenAI, Anthropic, etc.)
 * Defines the interface for AI analysis requests.
 */

export interface AIAnalysisRequest {
  /** Analysis package path or data */
  packagePath?: string;
  packageData?: {
    manifest: string;
    schema: string;
    prompt: string;
    frames: Array<{ id: string; path: string }>;
    subtitles: Array<{ id: string; content: string }>;
  };
  /** Model to use */
  model: string;
  /** Temperature for generation */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Stream response */
  stream?: boolean;
}

export interface AIAnalysisResponse {
  /** Whether the request was successful */
  success: boolean;
  /** The generated analysis result */
  result?: string;
  /** Error message if failed */
  error?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Whether the response was streamed */
  streamed?: boolean;
}

export interface AIStreamChunk {
  /** Chunk type */
  type: 'content' | 'error' | 'done';
  /** Content chunk */
  content?: string;
  /** Error message */
  error?: string;
  /** Usage info (only in done chunk) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AIStreamCallback = (chunk: AIStreamChunk) => void;

export interface AIProviderConfig {
  /** API Key */
  apiKey: string;
  /** API Base URL (optional, for custom endpoints) */
  baseUrl?: string;
  /** Organization ID (optional) */
  organizationId?: string;
  /** Default model */
  defaultModel?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Get available models
   */
  abstract getAvailableModels(): string[];

  /**
   * Send analysis request (non-streaming)
   */
  abstract analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;

  /**
   * Send analysis request with streaming
   */
  abstract analyzeStream(
    request: AIAnalysisRequest,
    callback: AIStreamCallback
  ): Promise<AIAnalysisResponse>;

  /**
   * Cancel ongoing request
   */
  abstract cancel(): void;

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Get configuration (without sensitive data)
   */
  getConfig(): Omit<AIProviderConfig, 'apiKey'> {
    const { apiKey, ...rest } = this.config;
    return rest;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validate API key format
   */
  protected abstract validateApiKey(apiKey: string): boolean;

  /**
   * Prepare request headers
   */
  protected abstract prepareHeaders(): Record<string, string>;

  /**
   * Prepare request body
   */
  protected abstract prepareBody(request: AIAnalysisRequest): unknown;

  /**
   * Parse response
   */
  protected abstract parseResponse(response: unknown): AIAnalysisResponse;

  /**
   * Parse stream chunk
   */
  protected abstract parseStreamChunk(chunk: string): AIStreamChunk | null;

  /**
   * Calculate token usage estimate
   */
  protected estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English, 2 characters for Chinese
    const englishChars = (text.match(/[a-zA-Z0-9]/g) || []).length;
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const otherChars = text.length - englishChars - chineseChars;

    return Math.ceil(englishChars / 4 + chineseChars / 2 + otherChars / 4);
  }

  /**
   * Create error response
   */
  protected createErrorResponse(error: string): AIAnalysisResponse {
    return {
      success: false,
      error,
    };
  }

  /**
   * Create success response
   */
  protected createSuccessResponse(
    result: string,
    usage?: AIAnalysisResponse['usage']
  ): AIAnalysisResponse {
    return {
      success: true,
      result,
      usage,
    };
  }
}

/**
 * Provider error types
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIProviderTimeoutError extends AIProviderError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT');
    this.name = 'AIProviderTimeoutError';
  }
}

export class AIProviderAuthError extends AIProviderError {
  constructor() {
    super('Invalid API key', 'AUTH_ERROR', 401);
    this.name = 'AIProviderAuthError';
  }
}

export class AIProviderRateLimitError extends AIProviderError {
  constructor(retryAfter?: number) {
    super(
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      429
    );
    this.name = 'AIProviderRateLimitError';
  }
}
