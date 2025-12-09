/**
 * Background Execution Manager
 * Coordinates background tasks for iOS and Android
 */

import { Platform } from 'react-native';

class BackgroundManager {
  private isRunning = false;
  private tasks: Map<string, () => Promise<void>> = new Map();

  /**
   * Initialize background execution
   */
  async initialize(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.initializeIOS();
    } else {
      await this.initializeAndroid();
    }
  }

  /**
   * Initialize iOS background tasks
   */
  private async initializeIOS(): Promise<void> {
    // iOS background tasks will be implemented in BackgroundTasks.ts
    console.log('iOS background tasks initialized');
  }

  /**
   * Initialize Android foreground service
   */
  private async initializeAndroid(): Promise<void> {
    // Android foreground service will be implemented in ForegroundService.ts
    console.log('Android foreground service initialized');
  }

  /**
   * Register a background task
   */
  registerTask(taskId: string, task: () => Promise<void>): void {
    this.tasks.set(taskId, task);
  }

  /**
   * Start background execution
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Background manager already running');
      return;
    }

    this.isRunning = true;
    console.log('Background manager started');
  }

  /**
   * Stop background execution
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('Background manager stopped');
  }

  /**
   * Execute a registered task
   */
  async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    try {
      await task();
    } catch (error) {
      console.error(`Task ${taskId} failed:`, error);
      throw error;
    }
  }

  /**
   * Check if background execution is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export const backgroundManager = new BackgroundManager();
export default backgroundManager;

