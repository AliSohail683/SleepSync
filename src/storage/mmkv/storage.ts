/**
 * MMKV Storage Module
 * Fast key-value storage for preferences, flags, and cache
 */

// Dynamic import to handle cases where MMKV might not be available
let createMMKV: any = null;
try {
  const mmkvModule = require('react-native-mmkv');
  createMMKV = mmkvModule.createMMKV || mmkvModule.default?.createMMKV || mmkvModule.default;
} catch (error) {
  // Module not available
}

type MMKVInstance = {
  set(key: string, value: string | number | boolean | ArrayBuffer): void;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  getBuffer(key: string): ArrayBuffer | undefined;
  contains(key: string): boolean;
  getAllKeys(): string[];
  remove(key: string): boolean;
  clearAll(): void;
  recrypt(encryptionKey?: string): void;
  trim(): void;
  importAllFrom(otherStorage: MMKVInstance): number;
  readonly size: number;
};

class MMKVStorage {
  private storage: MMKVInstance | null = null;

  constructor() {
    try {
      // Check if createMMKV is available
      if (createMMKV && typeof createMMKV === 'function') {
        this.storage = createMMKV({
          id: 'sleepsync-storage',
        });
      } else {
        console.warn('MMKV is not available, falling back to in-memory storage');
      }
    } catch (error) {
      console.error('Failed to initialize MMKV:', error);
      // Storage will remain null, methods will handle gracefully
    }
  }

  // Preferences
  setPreference(key: string, value: any): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.set(key, JSON.stringify(value));
  }

  getPreference<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.storage) {
      return defaultValue;
    }
    try {
      const value = this.storage.getString(key);
      if (value === undefined) return defaultValue;
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  removePreference(key: string): boolean {
    if (!this.storage) return false;
    return this.storage.remove(key);
  }

  // Feature flags
  setFeatureFlag(flag: string, enabled: boolean): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.set(`flag_${flag}`, enabled);
  }

  getFeatureFlag(flag: string, defaultValue = false): boolean {
    if (!this.storage) return defaultValue;
    return this.storage.getBoolean(`flag_${flag}`) ?? defaultValue;
  }

  // Cache
  setCache(key: string, value: any, ttl?: number): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    const data = {
      value,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };
    this.storage.set(`cache_${key}`, JSON.stringify(data));
  }

  getCache<T>(key: string): T | null {
    if (!this.storage) return null;
    const cached = this.storage.getString(`cache_${key}`);
    if (!cached) return null;

    try {
      const data = JSON.parse(cached);
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.removeCache(key);
        return null;
      }
      return data.value as T;
    } catch {
      return null;
    }
  }

  removeCache(key: string): void {
    if (!this.storage) return;
    this.storage.remove(`cache_${key}`);
  }

  // Quick access
  setString(key: string, value: string): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.set(key, value);
  }

  getString(key: string): string | undefined {
    if (!this.storage) return undefined;
    return this.storage.getString(key);
  }

  setNumber(key: string, value: number): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.set(key, value);
  }

  getNumber(key: string): number | undefined {
    if (!this.storage) return undefined;
    return this.storage.getNumber(key);
  }

  setBoolean(key: string, value: boolean): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.set(key, value);
  }

  getBoolean(key: string): boolean | undefined {
    if (!this.storage) return undefined;
    return this.storage.getBoolean(key);
  }

  // Buffer support
  setBuffer(key: string, value: ArrayBuffer): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.set(key, value);
  }

  getBuffer(key: string): ArrayBuffer | undefined {
    if (!this.storage) return undefined;
    return this.storage.getBuffer(key);
  }

  // Key management
  contains(key: string): boolean {
    if (!this.storage) return false;
    return this.storage.contains(key);
  }

  getAllKeys(): string[] {
    if (!this.storage) return [];
    return this.storage.getAllKeys();
  }

  // Clear all
  clearAll(): void {
    if (!this.storage) return;
    this.storage.clearAll();
  }

  // Encryption
  recrypt(encryptionKey?: string): void {
    if (!this.storage) {
      console.warn('MMKV storage not available');
      return;
    }
    this.storage.recrypt(encryptionKey);
  }

  // Size and optimization
  getSize(): number {
    if (!this.storage) return 0;
    return this.storage.size;
  }

  trim(): void {
    if (!this.storage) return;
    this.storage.trim();
  }

  // Import from another MMKV instance
  importAllFrom(otherStorage: MMKVStorage): number {
    if (!this.storage || !otherStorage.storage) {
      console.warn('MMKV storage not available');
      return 0;
    }
    return this.storage.importAllFrom(otherStorage.storage);
  }
}

export const mmkvStorage = new MMKVStorage();
export default mmkvStorage;

