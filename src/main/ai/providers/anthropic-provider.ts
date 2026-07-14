/**
 * Anthropic Provider
 *
 * Implements AI analysis using Anthropic's API (Claude 3.5, Claude 3, etc.)
 */

import {
  BaseAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIStreamChunk,
  AIStreamCallback,
  AIProviderConfig,
  AIProviderError,
  AIProviderTimeoutError,
  AIProviderAuthError,
  AIProviderRateLimitError,
} from './base-provider';

export interface AnthropicConfig extends AIProviderConfig {
  /** Anthropic API version */
  apiVersion?: string;
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseAIProvider {
  private controller: AbortController | null = null;

  constructor(config: AnthropicConfig) {
    super(config);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'anthropic';
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  /**
   * Send analysis request (non-streaming)
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      this.controller = new AbortController();

      const timeout = this.config.timeout || 120000;
      const timeoutId = setTimeout(() => this.controller?.abort(), timeout);

      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.prepareHeaders(),
        body: JSON.stringify(this.prepareBody(request)),
        signal: this.controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleError(response.status, await response.text());
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIProviderTimeoutError(this.config.timeout || 120000);
      }
      throw error;
    } finally {
      this.controller = null;
    }
  }

  /**
   * Send analysis request with streaming
   */
  async analyzeStream(
    request: AIAnalysisRequest,
    callback: AIStreamCallback
  ): Promise<AIAnalysisResponse> {
    try {
      this.controller = new AbortController();

      const timeout = this.config.timeout || 120000;
      const timeoutId = setTimeout(() => this.controller?.abort(), timeout);

      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.prepareHeaders(),
        body: JSON.stringify({
          ...this.prepareBody(request),
          stream: true,
        }),
        signal: this.controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleError(response.status, await response.text());
      }

      // Process stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIProviderError('No response body', 'NO_BODY');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const chunk = this.parseStreamChunk(data);
              if (chunk) {
                if (chunk.type === 'content' && chunk.content) {
                  fullContent += chunk.content;
                }
                if (chunk.usage) {
                  usage = chunk.usage;
                }
                callback(chunk);
              }
            } catch (e) {
              // Skip invalid chunks
            }
          }
        }
      }

      return {
        success: true,
        result: fullContent,
        usage,
        streamed: true,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIProviderTimeoutError(this.config.timeout || 120000);
      }
      throw error;
    } finally {
      this.controller = null;
    }
  }

  /**
   * Cancel ongoing request
   */
  cancel(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  /**
   * Validate API key format
   */
  protected validateApiKey(apiKey: string): boolean {
    // Anthropic API keys start with 'sk-ant-'
    return apiKey.startsWith('sk-ant-') && apiKey.length >= 40;
  }

  /**
   * Get API endpoint
   */
  private getEndpoint(): string {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com';
    return `${baseUrl}/v1/messages`;
  }

  /**
   * Prepare request headers
   */
  protected prepareHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': (this.config as AnthropicConfig).apiVersion || '2023-06-01',
    };
  }

  /**
   * Prepare request body
   */
  protected prepareBody(request: AIAnalysisRequest): unknown {
    const { system, messages } = this.buildMessages(request);

    return {
      model: request.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens || 4096,
      system,
      messages,
      stream: request.stream || false,
    };
  }

  /**
   * Build messages array from request
   */
  private buildMessages(request: AIAnalysisRequest): {
    system: string;
    messages: Array<{ role: string; content: string }>;
  } {
    const system = `You are a professional film analysis AI. You analyze movies and provide structured analysis including:
- Overall summary and structure
- Segment analysis with narrative functions
- Emotional arc and key moments
- Visual and audio techniques

Always respond with valid JSON matching the provided schema. Include confidence scores and evidence references.`;

    const messages: Array<{ role: string; content: string }> = [];

    // User message with analysis package content
    if (request.packageData) {
      const { manifest, schema, prompt, frames, subtitles } = request.packageData;

      let userContent = prompt || '';

      // Add manifest info
      if (manifest) {
        userContent += '\n\n## Manifest\n' + manifest;
      }

      // Add schema
      if (schema) {
        userContent += '\n\n## Output Schema\n' + schema;
      }

      // Add subtitles
      if (subtitles && subtitles.length > 0) {
        userContent += '\n\n## Subtitles\n';
        for (const sub of subtitles) {
          userContent += `[${sub.id}] ${sub.content}\n`;
        }
      }

      // Add frame info
      if (frames && frames.length > 0) {
        userContent += '\n\n## Evidence Frames\n';
        userContent += frames.map(f => `- ${f.id}: ${f.path}`).join('\n');
      }

      messages.push({
        role: 'user',
        content: userContent,
      });
    } else if (request.packagePath) {
      messages.push({
        role: 'user',
        content: `Please analyze the film based on the analysis package at: ${request.packagePath}`,
      });
    }

    return { system, messages };
  }

  /**
   * Parse response
   */
  protected parseResponse(response: unknown): AIAnalysisResponse {
    const data = response as any;

    if (!data.content || data.content.length === 0) {
      return this.createErrorResponse('No response from Anthropic');
    }

    // Extract text content from response
    const textBlocks = data.content.filter((block: any) => block.type === 'text');
    const content = textBlocks.map((block: any) => block.text).join('');

    const usage = data.usage
      ? {
          promptTokens: data.usage.input_tokens || 0,
          completionTokens: data.usage.output_tokens || 0,
          totalTokens:
            (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        }
      : undefined;

    return this.createSuccessResponse(content, usage);
  }

  /**
   * Parse stream chunk
   */
  protected parseStreamChunk(chunk: string): AIStreamChunk | null {
    try {
      const data = JSON.parse(chunk);

      switch (data.type) {
        case 'content_block_delta':
          if (data.delta?.type === 'text_delta' && data.delta?.text) {
            return {
              type: 'content',
              content: data.delta.text,
            };
          }
          break;

        case 'message_delta':
          if (data.usage) {
            return {
              type: 'done',
              usage: {
                promptTokens: 0, // Will be updated in message_start
                completionTokens: data.usage.output_tokens || 0,
                totalTokens: data.usage.output_tokens || 0,
              },
            };
          }
          break;

        case 'message_start':
          if (data.message?.usage) {
            return {
              type: 'content',
              content: '',
              usage: {
                promptTokens: data.message.usage.input_tokens || 0,
                completionTokens: 0,
                totalTokens: data.message.usage.input_tokens || 0,
              },
            };
          }
          break;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(statusCode: number, body: string): AIAnalysisResponse {
    try {
      const error = JSON.parse(body);
      const message = error.error?.message || error.message || 'Unknown error';

      switch (statusCode) {
        case 401:
          throw new AIProviderAuthError();
        case 429:
          const retryAfter = error.error?.headers?.['retry-after'];
          throw new AIProviderRateLimitError(retryAfter ? parseInt(retryAfter) : undefined);
        default:
          throw new AIProviderError(message, 'API_ERROR', statusCode);
      }
    } catch (e) {
      if (e instanceof AIProviderError) {
        throw e;
      }
      throw new AIProviderError(`API error: ${statusCode}`, 'API_ERROR', statusCode);
    }
  }
}
