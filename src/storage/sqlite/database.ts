/**
 * SQLite Database Module
 * Enhanced database with migrations and proper schema management
 */

import SQLite from 'react-native-sqlite-storage';
import { SensorDataChunk, BaselineMetrics, SleepSessionEnhanced } from '../../types';

const DB_NAME = 'sleepsync.db';
const DB_VERSION = 2; // Increment on schema changes

SQLite.DEBUG(false);
SQLite.enablePromise(true);

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  /**
   * Initialize database with migrations
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    try {
      this.db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      await this.db.executeSql('PRAGMA journal_mode = WAL');
      await this.db.executeSql('PRAGMA foreign_keys = ON');

      // Create version table
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL
        )
      `);

      // Get current version
      const [versionResult] = await this.db.executeSql(
        'SELECT MAX(version) as version FROM schema_version'
      );
      const currentVersion = versionResult.rows.item(0)?.version || 0;

      // Run migrations
      await this.runMigrations(currentVersion);

      this.initialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(currentVersion: number): Promise<void> {
    if (currentVersion >= DB_VERSION) {
      return;
    }

    // Migration 1: Base schema
    if (currentVersion < 1) {
      await this.migration1();
      await this.recordMigration(1);
    }

    // Migration 2: Enhanced schema with sensor data
    if (currentVersion < 2) {
      await this.migration2();
      await this.recordMigration(2);
    }
  }

  /**
   * Migration 1: Base tables
   */
  private async migration1(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // User profile
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        age_range TEXT,
        gender TEXT,
        sleep_goal_hours REAL DEFAULT 8,
        average_bedtime TEXT,
        average_wake_time TEXT,
        caffeine_habits TEXT DEFAULT 'moderate',
        screen_before_bed INTEGER DEFAULT 0,
        room_temperature_pref_c REAL,
        noise_sensitivity TEXT DEFAULT 'medium',
        chronotype TEXT,
        light_sensitivity TEXT,
        snoring_detection_enabled INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `);

    // Sleep session (enhanced)
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sleep_session (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT,
        duration_min REAL,
        stage_light REAL,
        stage_deep REAL,
        stage_rem REAL,
        sleep_score REAL,
        awake_count INTEGER DEFAULT 0,
        sleep_latency REAL,
        wake_after_sleep_onset REAL,
        sleep_efficiency REAL,
        device_data TEXT,
        stage_segments TEXT,
        disturbances TEXT,
        baseline_calibrated INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES user_profile(id)
      )
    `);

    // Indexes for performance
    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sleep_session_user_start 
      ON sleep_session(user_id, start_at DESC)
    `);
  }

  /**
   * Migration 2: Sensor data and baseline tables
   */
  private async migration2(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Sensor data chunks
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sensor_data_chunk (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        accelerometer TEXT,
        gyroscope TEXT,
        audio TEXT,
        light TEXT,
        FOREIGN KEY (session_id) REFERENCES sleep_session(id) ON DELETE CASCADE
      )
    `);

    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_sensor_chunk_session_timestamp 
      ON sensor_data_chunk(session_id, timestamp)
    `);

    // Baseline metrics
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS baseline_metrics (
        user_id TEXT PRIMARY KEY,
        average_bedtime TEXT NOT NULL,
        average_wake_time TEXT NOT NULL,
        average_duration REAL NOT NULL,
        average_latency REAL NOT NULL,
        average_efficiency REAL NOT NULL,
        disturbance_frequency REAL NOT NULL,
        movement_threshold REAL NOT NULL,
        sound_threshold REAL NOT NULL,
        light_threshold REAL NOT NULL,
        days_collected INTEGER NOT NULL,
        completed_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profile(id)
      )
    `);

    // Sleep score history
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sleep_score_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        total_score REAL NOT NULL,
        duration_score REAL NOT NULL,
        efficiency_score REAL NOT NULL,
        latency_score REAL NOT NULL,
        stages_score REAL NOT NULL,
        disturbances_score REAL NOT NULL,
        circadian_score REAL NOT NULL,
        factors TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sleep_session(id),
        FOREIGN KEY (user_id) REFERENCES user_profile(id)
      )
    `);

    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_score_history_user_date 
      ON sleep_score_history(user_id, date DESC)
    `);

    // Health sync log
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS health_sync_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        sync_type TEXT NOT NULL,
        last_sync_at TEXT NOT NULL,
        records_synced INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        FOREIGN KEY (user_id) REFERENCES user_profile(id)
      )
    `);

    // Oura sync log
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS oura_sync_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        last_sync_at TEXT NOT NULL,
        records_synced INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        FOREIGN KEY (user_id) REFERENCES user_profile(id)
      )
    `);
  }

  /**
   * Record migration version
   */
  private async recordMigration(version: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.executeSql(
      'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
      [version, new Date().toISOString()]
    );
  }

  /**
   * Get database instance
   */
  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

export const database = new Database();
export default database;

