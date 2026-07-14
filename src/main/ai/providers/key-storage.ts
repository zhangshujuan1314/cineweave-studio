/**
 * API Key Secure Storage
 *
 * Stores API keys securely using Electron's safeStorage
 * or OS-level keychain/credential manager.
 */

import { safeStorage } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';

export interface StoredKey {
  provider: string;
  key: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KeyStorageOptions {
  /** Storage directory (default: app userData) */
  storageDir?: string;
  /** Enable encryption (default: true if safeStorage available) */
  encrypt?: boolean;
}

/**
 * Secure API key storage
 */
export class KeyStorage {
  private storagePath: string;
  private keys: Map<string, StoredKey> = new Map();
  private encrypt: boolean;

  constructor(options?: KeyStorageOptions) {
    const storageDir = options?.storageDir || path.join(app.getPath('userData'), 'api-keys');
    this.storagePath = path.join(storageDir, 'keys.enc');
    this.encrypt = options?.encrypt ?? safeStorage.isEncryptionAvailable();
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });

      // Load existing keys
      await this.loadKeys();
    } catch (error) {
      // If file doesn't exist, that's okay
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Store API key
   */
  async storeKey(provider: string, apiKey: string): Promise<void> {
    const now = new Date().toISOString();

    const storedKey: StoredKey = {
      provider,
      key: this.encrypt ? this.encryptKey(apiKey) : apiKey,
      encrypted: this.encrypt,
      createdAt: this.keys.has(provider) ? this.keys.get(provider)!.createdAt : now,
      updatedAt: now,
    };

    this.keys.set(provider, storedKey);
    await this.saveKeys();
  }

  /**
   * Get API key
   */
  async getKey(provider: string): Promise<string | null> {
    const storedKey = this.keys.get(provider);

    if (!storedKey) {
      return null;
    }

    return storedKey.encrypted ? this.decryptKey(storedKey.key) : storedKey.key;
  }

  /**
   * Check if key exists
   */
  hasKey(provider: string): boolean {
    return this.keys.has(provider);
  }

  /**
   * Remove API key
   */
  async removeKey(provider: string): Promise<boolean> {
    if (!this.keys.has(provider)) {
      return false;
    }

    this.keys.delete(provider);
    await this.saveKeys();
    return true;
  }

  /**
   * List all stored providers
   */
  listProviders(): string[] {
    return Array.from(this.keys.keys());
  }

  /**
   * Get key metadata (without the actual key)
   */
  getKeyMetadata(provider: string): Omit<StoredKey, 'key'> | null {
    const storedKey = this.keys.get(provider);

    if (!storedKey) {
      return null;
    }

    const { key, ...metadata } = storedKey;
    return metadata;
  }

  /**
   * Clear all keys
   */
  async clearAll(): Promise<void> {
    this.keys.clear();
    await this.saveKeys();
  }

  /**
   * Encrypt API key
   */
  private encryptKey(apiKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      return apiKey;
    }

    const encrypted = safeStorage.encryptString(apiKey);
    return encrypted.toString('base64');
  }

  /**
   * Decrypt API key
   */
  private decryptKey(encryptedKey: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      return encryptedKey;
    }

    const buffer = Buffer.from(encryptedKey, 'base64');
    return safeStorage.decryptString(buffer);
  }

  /**
   * Load keys from file
   */
  private async loadKeys(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Validate and restore keys
      for (const [provider, storedKey] of Object.entries(parsed)) {
        if (this.isValidStoredKey(storedKey)) {
          this.keys.set(provider, storedKey as StoredKey);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Save keys to file
   */
  private async saveKeys(): Promise<void> {
    const data: Record<string, StoredKey> = {};

    for (const [provider, storedKey] of this.keys) {
      data[provider] = storedKey;
    }

    await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Validate stored key structure
   */
  private isValidStoredKey(key: unknown): boolean {
    if (typeof key !== 'object' || key === null) {
      return false;
    }

    const k = key as any;

    return (
      typeof k.provider === 'string' &&
      typeof k.key === 'string' &&
      typeof k.encrypted === 'boolean' &&
      typeof k.createdAt === 'string' &&
      typeof k.updatedAt === 'string'
    );
  }
}

/**
 * Global key storage instance
 */
let keyStorageInstance: KeyStorage | null = null;

/**
 * Get or create key storage instance
 */
export function getKeyStorage(options?: KeyStorageOptions): KeyStorage {
  if (!keyStorageInstance) {
    keyStorageInstance = new KeyStorage(options);
  }
  return keyStorageInstance;
}

/**
 * Initialize key storage
 */
export async function initializeKeyStorage(options?: KeyStorageOptions): Promise<KeyStorage> {
  const storage = getKeyStorage(options);
  await storage.initialize();
  return storage;
}
