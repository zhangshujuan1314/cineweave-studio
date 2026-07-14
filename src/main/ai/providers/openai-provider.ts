/**
 * OpenAI Provider
 *
 * Implements AI analysis using OpenAI's API (GPT-4, GPT-3.5, etc.)
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

export interface OpenAIConfig extends AIProviderConfig {
  /** OpenAI organization ID */
  organizationId?: string;
  /** API version */
  apiVersion?: string;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  private controller: AbortController | null = null;

  constructor(config: OpenAIConfig) {
    super(config);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'openai';
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
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

            if (data === '[DONE]') {
              callback({
                type: 'done',
                usage,
              });
              break;
            }

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
    // OpenAI API keys start with 'sk-' and are 51 characters long
    return apiKey.startsWith('sk-') && apiKey.length >= 40;
  }

  /**
   * Get API endpoint
   */
  private getEndpoint(): string {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    return `${baseUrl}/chat/completions`;
  }

  /**
   * Prepare request headers
   */
  protected prepareHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organizationId) {
      headers['OpenAI-Organization'] = this.config.organizationId;
    }

    return headers;
  }

  /**
   * Prepare request body
   */
  protected prepareBody(request: AIAnalysisRequest): unknown {
    const messages = this.buildMessages(request);

    return {
      model: request.model || this.config.defaultModel || 'gpt-4o',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens || 4096,
      stream: request.stream || false,
    };
  }

  /**
   * Build messages array from request
   */
  private buildMessages(request: AIAnalysisRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // System message
    messages.push({
      role: 'system',
      content: `You are a professional film analysis AI. You analyze movies and provide structured analysis including:
- Overall summary and structure
- Segment analysis with narrative functions
- Emotional arc and key moments
- Visual and audio techniques

Always respond with valid JSON matching the provided schema. Include confidence scores and evidence references.`,
    });

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

    return messages;
  }

  /**
   * Parse response
   */
  protected parseResponse(response: unknown): AIAnalysisResponse {
    const data = response as any;

    if (!data.choices || data.choices.length === 0) {
      return this.createErrorResponse('No response from OpenAI');
    }

    const choice = data.choices[0];
    const content = choice.message?.content || '';

    const usage = data.usage
      ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
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

      if (!data.choices || data.choices.length === 0) {
        return null;
      }

      const choice = data.choices[0];

      if (choice.finish_reason === 'stop') {
        return {
          type: 'done',
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
              }
            : undefined,
        };
      }

      const content = choice.delta?.content;
      if (content) {
        return {
          type: 'content',
          content,
        };
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
