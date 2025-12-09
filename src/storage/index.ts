/**
 * Unified Storage Interface
 * Exports all storage modules
 */

export { database } from './sqlite/database';
export { sensorDataRepository } from './sqlite/repositories/SensorDataRepository';
export { baselineRepository } from './sqlite/repositories/BaselineRepository';
export { sleepScoreRepository } from './sqlite/repositories/SleepScoreRepository';
export { mmkvStorage } from './mmkv/storage';

// Re-export existing storage service for backward compatibility
export { storageService } from '../services/storageService';

