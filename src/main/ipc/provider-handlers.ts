/**
 * Provider IPC Handlers
 *
 * Handles IPC calls for AI provider management.
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import {
  initializeProviderManager,
  ProviderType,
  AIAnalysisRequest,
  AIStreamCallback,
} from '../ai/providers';

// Schema for IPC calls
const ConfigureProviderSchema = z.object({
  type: z.enum(['openai', 'anthropic']),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  organizationId: z.string().optional(),
  defaultModel: z.string().optional(),
  timeout: z.number().optional(),
});

const SaveApiKeySchema = z.object({
  type: z.enum(['openai', 'anthropic']),
  apiKey: z.string(),
});

const RemoveApiKeySchema = z.object({
  type: z.enum(['openai', 'anthropic']),
});

const SetActiveProviderSchema = z.object({
  type: z.enum(['openai', 'anthropic']),
});

const AnalyzeSchema = z.object({
  request: z.object({
    packagePath: z.string().optional(),
    packageData: z.object({
      manifest: z.string(),
      schema: z.string(),
      prompt: z.string(),
      frames: z.array(z.object({
        id: z.string(),
        path: z.string(),
      })),
      subtitles: z.array(z.object({
        id: z.string(),
        content: z.string(),
      })),
    }).optional(),
    model: z.string(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    stream: z.boolean().optional(),
  }),
  providerType: z.enum(['openai', 'anthropic']).optional(),
});

// Provider manager instance
let providerManager: Awaited<ReturnType<typeof initializeProviderManager>> | null = null;

/**
 * Get or initialize provider manager
 */
async function getProviderManager() {
  if (!providerManager) {
    providerManager = await initializeProviderManager();
  }
  return providerManager;
}

/**
 * Register provider IPC handlers
 */
export function registerProviderHandlers(): void {
  // Initialize provider manager
  ipcMain.handle('provider:initialize', async () => {
    try {
      const manager = await getProviderManager();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Configure provider
  ipcMain.handle('provider:configure', async (_event, args) => {
    try {
      const validated = ConfigureProviderSchema.parse(args);
      const manager = await getProviderManager();
      manager.configureProvider(validated.type, validated);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Save API key
  ipcMain.handle('provider:saveApiKey', async (_event, args) => {
    try {
      const validated = SaveApiKeySchema.parse(args);
      const manager = await getProviderManager();
      await manager.saveApiKey(validated.type, validated.apiKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Remove API key
  ipcMain.handle('provider:removeApiKey', async (_event, args) => {
    try {
      const validated = RemoveApiKeySchema.parse(args);
      const manager = await getProviderManager();
      const removed = await manager.removeApiKey(validated.type);
      return { success: true, removed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get configured providers
  ipcMain.handle('provider:getConfigured', async () => {
    try {
      const manager = await getProviderManager();
      const providers = manager.getConfiguredProviders();
      return { success: true, providers };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get active provider
  ipcMain.handle('provider:getActive', async () => {
    try {
      const manager = await getProviderManager();
      const active = manager.getActiveProviderType();
      return { success: true, active };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Set active provider
  ipcMain.handle('provider:setActive', async (_event, args) => {
    try {
      const validated = SetActiveProviderSchema.parse(args);
      const manager = await getProviderManager();
      manager.setActiveProvider(validated.type);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get available models
  ipcMain.handle('provider:getModels', async (_event, args) => {
    try {
      const manager = await getProviderManager();
      const type = args?.type as ProviderType | undefined;
      const models = manager.getAvailableModels(type);
      return { success: true, models };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get all provider statuses
  ipcMain.handle('provider:getStatuses', async () => {
    try {
      const manager = await getProviderManager();
      const statuses = manager.getAllProviderStatuses();
      return { success: true, statuses };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Analyze (non-streaming)
  ipcMain.handle('provider:analyze', async (_event, args) => {
    try {
      const validated = AnalyzeSchema.parse(args);
      const manager = await getProviderManager();
      const result = await manager.analyze(validated.request, validated.providerType);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Analyze with streaming
  ipcMain.handle('provider:analyzeStream', async (_event, args) => {
    try {
      const validated = AnalyzeSchema.parse(args);
      const manager = await getProviderManager();

      // Create a callback that sends chunks to the renderer
      const callback: AIStreamCallback = (chunk) => {
        _event.sender.send('provider:streamChunk', chunk);
      };

      const result = await manager.analyzeStream(
        validated.request,
        callback,
        validated.providerType
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Cancel request
  ipcMain.handle('provider:cancel', async (_event, args) => {
    try {
      const manager = await getProviderManager();
      const type = args?.type as ProviderType | undefined;
      manager.cancel(type);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Cancel all requests
  ipcMain.handle('provider:cancelAll', async () => {
    try {
      const manager = await getProviderManager();
      manager.cancelAll();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
