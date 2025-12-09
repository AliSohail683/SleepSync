/**
 * Storage Service - SQLite Database Layer
 * Handles all local data persistence for SleepSync
 */

import SQLite from 'react-native-sqlite-storage';
import {
  UserProfile,
  SleepSession,
  SoundProfile,
  AlarmConfig,
  SubscriptionStatus,
  SleepDebtRecord,
  UUID,
} from '../models';
import { mmkvStorage } from '../storage/mmkv/storage';

const DB_NAME = 'sleepsync.db';

// Enable promise-based API
SQLite.DEBUG(true);
SQLite.enablePromise(true);

class StorageService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database and create tables
   */
  async setupDB(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      // Create tables with proper schema
      await this.db.executeSql('PRAGMA journal_mode = WAL');
      
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
          created_at TEXT NOT NULL,
          updated_at TEXT
        )
      `);

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
          device_data TEXT,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES user_profile(id)
        )
      `);

      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS sound_profile (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          base_type TEXT NOT NULL,
          blend TEXT,
          volume REAL DEFAULT 0.5,
          is_active INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES user_profile(id)
        )
      `);

      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS alarm_config (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          target_window_start TEXT NOT NULL,
          target_window_end TEXT NOT NULL,
          gentle_wake INTEGER DEFAULT 1,
          sound_profile_id TEXT,
          vibration_enabled INTEGER DEFAULT 1,
          days_of_week TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES user_profile(id),
          FOREIGN KEY (sound_profile_id) REFERENCES sound_profile(id)
        )
      `);

      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS subscription_status (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          active INTEGER DEFAULT 0,
          platform TEXT,
          expiry_date TEXT,
          product_id TEXT,
          original_purchase_date TEXT,
          auto_renewing INTEGER DEFAULT 1
        )
      `);

      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS sleep_debt_record (
          date TEXT PRIMARY KEY,
          ideal_hours REAL NOT NULL,
          actual_hours REAL NOT NULL,
          debt_hours REAL NOT NULL
        )
      `);

      await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_sleep_session_user ON sleep_session(user_id)');
      await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_sleep_session_date ON sleep_session(start_at)');
      await this.db.executeSql('CREATE INDEX IF NOT EXISTS idx_sleep_debt_date ON sleep_debt_record(date)');

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  private getDB(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call setupDB() first.');
    }
    return this.db;
  }

  /**
   * Execute SQL query and return first result
   */
  private async executeQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.getDB();
    const [results] = await db.executeSql(sql, params);
    const items: T[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      items.push(results.rows.item(i) as T);
    }
    return items;
  }

  /**
   * Execute SQL query and return first row
   */
  private async executeQueryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.executeQuery<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  // ============ USER PROFILE ============

  async createUserProfile(profile: UserProfile): Promise<void> {
    const db = this.getDB();
    await db.executeSql(
      `INSERT INTO user_profile (
        id, age_range, gender, sleep_goal_hours, average_bedtime, average_wake_time,
        caffeine_habits, screen_before_bed, room_temperature_pref_c, noise_sensitivity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.ageRange,
        profile.gender || null,
        profile.sleepGoalHours,
        profile.averageBedtime,
        profile.averageWakeTime,
        profile.caffeineHabits,
        profile.screenBeforeBed ? 1 : 0,
        profile.roomTemperaturePrefC || null,
        profile.noiseSensitivity,
        profile.createdAt,
      ]
    );
  }

  async getUserProfile(userId: UUID): Promise<UserProfile | null> {
    const result = await this.executeQueryFirst<any>(
      'SELECT * FROM user_profile WHERE id = ?',
      [userId]
    );

    if (!result) return null;

    return {
      id: result.id,
      ageRange: result.age_range,
      gender: result.gender,
      sleepGoalHours: result.sleep_goal_hours,
      averageBedtime: result.average_bedtime,
      averageWakeTime: result.average_wake_time,
      caffeineHabits: result.caffeine_habits,
      screenBeforeBed: result.screen_before_bed === 1,
      roomTemperaturePrefC: result.room_temperature_pref_c,
      noiseSensitivity: result.noise_sensitivity,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async updateUserProfile(userId: UUID, updates: Partial<UserProfile>): Promise<void> {
    const db = this.getDB();
    const fields = [];
    const values = [];

    if (updates.ageRange !== undefined) {
      fields.push('age_range = ?');
      values.push(updates.ageRange);
    }
    if (updates.gender !== undefined) {
      fields.push('gender = ?');
      values.push(updates.gender);
    }
    if (updates.sleepGoalHours !== undefined) {
      fields.push('sleep_goal_hours = ?');
      values.push(updates.sleepGoalHours);
    }
    if (updates.averageBedtime !== undefined) {
      fields.push('average_bedtime = ?');
      values.push(updates.averageBedtime);
    }
    if (updates.averageWakeTime !== undefined) {
      fields.push('average_wake_time = ?');
      values.push(updates.averageWakeTime);
    }
    if (updates.caffeineHabits !== undefined) {
      fields.push('caffeine_habits = ?');
      values.push(updates.caffeineHabits);
    }
    if (updates.screenBeforeBed !== undefined) {
      fields.push('screen_before_bed = ?');
      values.push(updates.screenBeforeBed ? 1 : 0);
    }
    if (updates.roomTemperaturePrefC !== undefined) {
      fields.push('room_temperature_pref_c = ?');
      values.push(updates.roomTemperaturePrefC);
    }
    if (updates.noiseSensitivity !== undefined) {
      fields.push('noise_sensitivity = ?');
      values.push(updates.noiseSensitivity);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(userId);

    await db.executeSql(
      `UPDATE user_profile SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ============ SLEEP SESSION ============

  async createSleepSession(session: SleepSession): Promise<void> {
    const db = this.getDB();
    await db.executeSql(
      `INSERT INTO sleep_session (
        id, user_id, start_at, end_at, duration_min, stage_light, stage_deep, stage_rem,
        sleep_score, awake_count, sleep_latency, device_data, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.userId,
        session.startAt,
        session.endAt || null,
        session.durationMin || null,
        session.stages?.light || null,
        session.stages?.deep || null,
        session.stages?.rem || null,
        session.sleepScore || null,
        session.awakeCount || 0,
        session.sleepLatency || null,
        session.deviceData ? JSON.stringify(session.deviceData) : null,
        session.notes || null,
      ]
    );
  }

  async updateSleepSession(sessionId: UUID, updates: Partial<SleepSession>): Promise<void> {
    const db = this.getDB();
    const fields = [];
    const values = [];

    if (updates.endAt !== undefined) {
      fields.push('end_at = ?');
      values.push(updates.endAt);
    }
    if (updates.durationMin !== undefined) {
      fields.push('duration_min = ?');
      values.push(updates.durationMin);
    }
    if (updates.stages !== undefined) {
      fields.push('stage_light = ?');
      values.push(updates.stages.light);
      fields.push('stage_deep = ?');
      values.push(updates.stages.deep);
      fields.push('stage_rem = ?');
      values.push(updates.stages.rem);
    }
    if (updates.sleepScore !== undefined) {
      fields.push('sleep_score = ?');
      values.push(updates.sleepScore);
    }
    if (updates.awakeCount !== undefined) {
      fields.push('awake_count = ?');
      values.push(updates.awakeCount);
    }
    if (updates.sleepLatency !== undefined) {
      fields.push('sleep_latency = ?');
      values.push(updates.sleepLatency);
    }
    if (updates.deviceData !== undefined) {
      fields.push('device_data = ?');
      values.push(JSON.stringify(updates.deviceData));
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    values.push(sessionId);

    await db.executeSql(
      `UPDATE sleep_session SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async getSleepSession(sessionId: UUID): Promise<SleepSession | null> {
    const result = await this.executeQueryFirst<any>(
      'SELECT * FROM sleep_session WHERE id = ?',
      [sessionId]
    );

    if (!result) return null;

    return this.parseSleepSession(result);
  }

  async getRecentSessions(userId: UUID, limit: number = 30): Promise<SleepSession[]> {
    const results = await this.executeQuery<any>(
      'SELECT * FROM sleep_session WHERE user_id = ? ORDER BY start_at DESC LIMIT ?',
      [userId, limit]
    );

    return results.map(this.parseSleepSession);
  }

  async getSessionsInRange(userId: UUID, startDate: string, endDate: string): Promise<SleepSession[]> {
    const results = await this.executeQuery<any>(
      'SELECT * FROM sleep_session WHERE user_id = ? AND start_at >= ? AND start_at <= ? ORDER BY start_at DESC',
      [userId, startDate, endDate]
    );

    return results.map(this.parseSleepSession);
  }

  private parseSleepSession(row: any): SleepSession {
    return {
      id: row.id,
      userId: row.user_id,
      startAt: row.start_at,
      endAt: row.end_at,
      durationMin: row.duration_min,
      stages: row.stage_light
        ? {
            light: row.stage_light,
            deep: row.stage_deep,
            rem: row.stage_rem,
          }
        : undefined,
      sleepScore: row.sleep_score,
      awakeCount: row.awake_count,
      sleepLatency: row.sleep_latency,
      deviceData: row.device_data ? JSON.parse(row.device_data) : undefined,
      notes: row.notes,
    };
  }

  // ============ SOUND PROFILE ============

  async createSoundProfile(profile: SoundProfile): Promise<void> {
    const db = this.getDB();
    await db.executeSql(
      `INSERT INTO sound_profile (id, user_id, name, base_type, blend, volume, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.userId,
        profile.name,
        profile.baseType,
        JSON.stringify(profile.blend),
        profile.volume,
        profile.isActive ? 1 : 0,
        profile.createdAt,
      ]
    );
  }

  async getSoundProfiles(userId: UUID): Promise<SoundProfile[]> {
    const results = await this.executeQuery<any>(
      'SELECT * FROM sound_profile WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return results.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      baseType: row.base_type,
      blend: JSON.parse(row.blend),
      volume: row.volume,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    }));
  }

  async updateSoundProfile(profileId: UUID, updates: Partial<SoundProfile>): Promise<void> {
    const db = this.getDB();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.volume !== undefined) {
      fields.push('volume = ?');
      values.push(updates.volume);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    values.push(profileId);

    await db.executeSql(
      `UPDATE sound_profile SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteSoundProfile(profileId: UUID): Promise<void> {
    const db = this.getDB();
    await db.executeSql('DELETE FROM sound_profile WHERE id = ?', [profileId]);
  }

  // ============ ALARM CONFIG ============

  async createAlarmConfig(config: AlarmConfig): Promise<void> {
    const db = this.getDB();
    await db.executeSql(
      `INSERT INTO alarm_config (
        id, user_id, enabled, target_window_start, target_window_end,
        gentle_wake, sound_profile_id, vibration_enabled, days_of_week
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        config.id,
        config.userId,
        config.enabled ? 1 : 0,
        config.targetWindowStart,
        config.targetWindowEnd,
        config.gentleWake ? 1 : 0,
        config.soundProfileId || null,
        config.vibrationEnabled ? 1 : 0,
        JSON.stringify(config.daysOfWeek),
      ]
    );
  }

  async getAlarmConfigs(userId: UUID): Promise<AlarmConfig[]> {
    const results = await this.executeQuery<any>(
      'SELECT * FROM alarm_config WHERE user_id = ?',
      [userId]
    );

    return results.map((row) => ({
      id: row.id,
      userId: row.user_id,
      enabled: row.enabled === 1,
      targetWindowStart: row.target_window_start,
      targetWindowEnd: row.target_window_end,
      gentleWake: row.gentle_wake === 1,
      soundProfileId: row.sound_profile_id,
      vibrationEnabled: row.vibration_enabled === 1,
      daysOfWeek: JSON.parse(row.days_of_week),
    }));
  }

  async updateAlarmConfig(configId: UUID, updates: Partial<AlarmConfig>): Promise<void> {
    const db = this.getDB();
    const fields = [];
    const values = [];

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.targetWindowStart !== undefined) {
      fields.push('target_window_start = ?');
      values.push(updates.targetWindowStart);
    }
    if (updates.targetWindowEnd !== undefined) {
      fields.push('target_window_end = ?');
      values.push(updates.targetWindowEnd);
    }
    if (updates.gentleWake !== undefined) {
      fields.push('gentle_wake = ?');
      values.push(updates.gentleWake ? 1 : 0);
    }
    if (updates.soundProfileId !== undefined) {
      fields.push('sound_profile_id = ?');
      values.push(updates.soundProfileId);
    }
    if (updates.vibrationEnabled !== undefined) {
      fields.push('vibration_enabled = ?');
      values.push(updates.vibrationEnabled ? 1 : 0);
    }
    if (updates.daysOfWeek !== undefined) {
      fields.push('days_of_week = ?');
      values.push(JSON.stringify(updates.daysOfWeek));
    }

    values.push(configId);

    await db.executeSql(
      `UPDATE alarm_config SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteAlarmConfig(configId: UUID): Promise<void> {
    const db = this.getDB();
    await db.executeSql('DELETE FROM alarm_config WHERE id = ?', [configId]);
  }

  // ============ SUBSCRIPTION STATUS ============

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const result = await this.executeQueryFirst<any>(
      'SELECT * FROM subscription_status WHERE id = 1'
    );

    if (!result) {
      return {
        active: false,
        platform: null,
        expiryDate: null,
        productId: null,
      };
    }

    return {
      active: result.active === 1,
      platform: result.platform,
      expiryDate: result.expiry_date,
      productId: result.product_id,
      originalPurchaseDate: result.original_purchase_date,
      autoRenewing: result.auto_renewing === 1,
    };
  }

  async updateSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    const db = this.getDB();
    await db.executeSql(
      `INSERT OR REPLACE INTO subscription_status (
        id, active, platform, expiry_date, product_id, original_purchase_date, auto_renewing
      ) VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [
        status.active ? 1 : 0,
        status.platform ?? null,
        status.expiryDate ?? null,
        status.productId ?? null,
        status.originalPurchaseDate ?? null,
        status.autoRenewing ? 1 : 0,
      ]
    );
  }

  // ============ SLEEP DEBT RECORD ============

  async saveSleepDebtRecord(record: SleepDebtRecord): Promise<void> {
    const db = this.getDB();
    await db.executeSql(
      `INSERT OR REPLACE INTO sleep_debt_record (date, ideal_hours, actual_hours, debt_hours)
       VALUES (?, ?, ?, ?)`,
      [record.date, record.idealHours, record.actualHours, record.debtHours]
    );
  }

  async getSleepDebtRecords(days: number): Promise<SleepDebtRecord[]> {
    const db = this.getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    const results = await this.executeQuery<any>(
      'SELECT * FROM sleep_debt_record WHERE date >= ? ORDER BY date DESC',
      [cutoff]
    );

    return results.map((row) => ({
      date: row.date,
      idealHours: row.ideal_hours,
      actualHours: row.actual_hours,
      debtHours: row.debt_hours,
    }));
  }

  // ============ UTILITY ============

  async clearAllData(): Promise<void> {
    const db = this.getDB();
    await db.executeSql('DELETE FROM sleep_session');
    await db.executeSql('DELETE FROM sound_profile');
    await db.executeSql('DELETE FROM alarm_config');
    await db.executeSql('DELETE FROM sleep_debt_record');
    await db.executeSql('DELETE FROM user_profile');
    await db.executeSql('DELETE FROM subscription_status');
  }

  /**
   * Get stored user ID from persistent storage
   */
  async getStoredUserId(): Promise<UUID | null> {
    const userId = mmkvStorage.getString('user_id');
    return userId || null;
  }

  /**
   * Store user ID in persistent storage
   */
  async setStoredUserId(userId: UUID): Promise<void> {
    mmkvStorage.setString('user_id', userId);
  }

  /**
   * Clear stored user ID (for logout)
   */
  async clearStoredUserId(): Promise<void> {
    mmkvStorage.removePreference('user_id');
  }

  /**
   * Get onboarding completion status
   */
  async getOnboardingComplete(): Promise<boolean> {
    return mmkvStorage.getBoolean('onboarding_complete') ?? false;
  }

  /**
   * Set onboarding completion status
   */
  async setOnboardingComplete(complete: boolean): Promise<void> {
    mmkvStorage.setBoolean('onboarding_complete', complete);
  }

  /**
   * Clear onboarding completion status (for logout)
   */
  async clearOnboardingComplete(): Promise<void> {
    mmkvStorage.removePreference('onboarding_complete');
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;

