/**
 * Sensor Data Repository
 * Handles sensor data chunk storage and retrieval
 */

import { database } from '../database';
import { SensorDataChunk } from '../../../types/sensors';
import { UUID } from '../../../models';

class SensorDataRepository {
  /**
   * Save sensor data chunk
   */
  async saveChunk(chunk: SensorDataChunk): Promise<void> {
    const db = database.getDatabase();
    await db.executeSql(
      `INSERT INTO sensor_data_chunk (
        id, session_id, timestamp, accelerometer, gyroscope, audio, light
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        chunk.id,
        chunk.sessionId,
        chunk.timestamp,
        chunk.accelerometer ? JSON.stringify(chunk.accelerometer) : null,
        chunk.gyroscope ? JSON.stringify(chunk.gyroscope) : null,
        chunk.audio ? JSON.stringify(chunk.audio) : null,
        chunk.light ? JSON.stringify(chunk.light) : null,
      ]
    );
  }

  /**
   * Save multiple chunks in batch
   */
  async saveChunks(chunks: SensorDataChunk[]): Promise<void> {
    const db = database.getDatabase();
    await db.transaction((tx) => {
      chunks.forEach((chunk) => {
        tx.executeSql(
          `INSERT INTO sensor_data_chunk (
            id, session_id, timestamp, accelerometer, gyroscope, audio, light
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            chunk.id,
            chunk.sessionId,
            chunk.timestamp,
            chunk.accelerometer ? JSON.stringify(chunk.accelerometer) : null,
            chunk.gyroscope ? JSON.stringify(chunk.gyroscope) : null,
            chunk.audio ? JSON.stringify(chunk.audio) : null,
            chunk.light ? JSON.stringify(chunk.light) : null,
          ]
        );
      });
    });
  }

  /**
   * Get chunks for a session
   */
  async getChunksForSession(sessionId: UUID): Promise<SensorDataChunk[]> {
    const db = database.getDatabase();
    const [results] = await db.executeSql(
      'SELECT * FROM sensor_data_chunk WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );

    const chunks: SensorDataChunk[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      chunks.push({
        id: row.id,
        sessionId: row.session_id,
        timestamp: row.timestamp,
        accelerometer: row.accelerometer ? JSON.parse(row.accelerometer) : undefined,
        gyroscope: row.gyroscope ? JSON.parse(row.gyroscope) : undefined,
        audio: row.audio ? JSON.parse(row.audio) : undefined,
        light: row.light ? JSON.parse(row.light) : undefined,
      });
    }
    return chunks;
  }

  /**
   * Get chunks in time range for a session
   */
  async getChunksInRange(
    sessionId: UUID,
    startTime: number,
    endTime: number
  ): Promise<SensorDataChunk[]> {
    const db = database.getDatabase();
    const [results] = await db.executeSql(
      'SELECT * FROM sensor_data_chunk WHERE session_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
      [sessionId, startTime, endTime]
    );

    const chunks: SensorDataChunk[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      chunks.push({
        id: row.id,
        sessionId: row.session_id,
        timestamp: row.timestamp,
        accelerometer: row.accelerometer ? JSON.parse(row.accelerometer) : undefined,
        gyroscope: row.gyroscope ? JSON.parse(row.gyroscope) : undefined,
        audio: row.audio ? JSON.parse(row.audio) : undefined,
        light: row.light ? JSON.parse(row.light) : undefined,
      });
    }
    return chunks;
  }

  /**
   * Delete chunks for a session
   */
  async deleteChunksForSession(sessionId: UUID): Promise<void> {
    const db = database.getDatabase();
    await db.executeSql('DELETE FROM sensor_data_chunk WHERE session_id = ?', [sessionId]);
  }
}

export const sensorDataRepository = new SensorDataRepository();
export default sensorDataRepository;

