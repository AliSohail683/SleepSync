/**
 * Sensor Data Processor
 * Converts raw sensor data to SensorDataChunk format
 * Processes data in atomic transactions to ensure data integrity
 */

import { v4 as uuidv4 } from 'uuid';
import { rawSensorDataRepository, RawSensorData } from '../storage/sqlite/repositories/RawSensorDataRepository';
import { sensorDataRepository } from '../storage/sqlite/repositories/SensorDataRepository';
import { SensorDataChunk, AccelerometerData } from '../types/sensors';
import { UUID } from '../models';
import { database } from '../storage/sqlite/database';

const CHUNK_SIZE = 30; // 30 readings = ~3 seconds at 10Hz
const BATCH_SIZE = 1000; // Process 1000 raw records at a time

class SensorDataProcessor {
  /**
   * Process raw sensor data for a session
   * Converts raw data points to SensorDataChunk format
   * All operations are atomic - either all succeed or all fail
   * 
   * @param sessionId - Session ID to process data for
   * @returns Number of raw data points processed
   */
  async processSessionData(sessionId: UUID): Promise<number> {
    let totalProcessed = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        const processed = await this.processBatch(sessionId);
        totalProcessed += processed;
        
        // If we processed less than batch size, we're done
        hasMoreData = processed >= BATCH_SIZE;
      } catch (error) {
        console.error('Failed to process batch:', error);
        // Continue processing next batch even if one fails
        hasMoreData = false;
      }
    }

    if (totalProcessed > 0) {
      console.log(`✅ Processed ${totalProcessed} raw sensor data points for session ${sessionId}`);
    }

    return totalProcessed;
  }

  /**
   * Process a single batch of raw sensor data
   * Uses transaction to ensure atomicity
   */
  private async processBatch(sessionId: UUID): Promise<number> {
    const db = database.getDatabase();
    let processedCount = 0;

    try {
      await db.transaction(async (tx) => {
        // Get unprocessed data in batches
        const [results] = await tx.executeSql(
          `SELECT * FROM sensor_data_raw 
           WHERE session_id = ? AND processed = 0 
           ORDER BY timestamp ASC 
           LIMIT ?`,
          [sessionId, BATCH_SIZE]
        );

        if (results.rows.length === 0) {
          return; // No data to process
        }

        // Parse results
        const unprocessed: RawSensorData[] = [];
        for (let i = 0; i < results.rows.length; i++) {
          const row = results.rows.item(i);
          unprocessed.push({
            id: row.id,
            sessionId: row.session_id,
            timestamp: row.timestamp,
            x: row.x,
            y: row.y,
            z: row.z,
            sensorType: row.sensor_type,
            processed: row.processed === 1,
            createdAt: row.created_at,
          });
        }

        // Group into chunks and process
        let batch: RawSensorData[] = [];
        const chunksToSave: SensorDataChunk[] = [];
        const idsToMark: number[] = [];

        for (const reading of unprocessed) {
          batch.push(reading);

          // When batch reaches chunk size, create chunk
          if (batch.length >= CHUNK_SIZE) {
            try {
              const chunk = this.createChunkFromBatch(sessionId, batch);
              chunksToSave.push(chunk);
              idsToMark.push(...batch.map(r => r.id));
              processedCount += batch.length;
              batch = [];
            } catch (error) {
              console.error('Failed to create chunk from batch:', error);
              // Skip this batch but continue
              batch = [];
            }
          }
        }

        // Process remaining batch if any
        if (batch.length > 0) {
          try {
            const chunk = this.createChunkFromBatch(sessionId, batch);
            chunksToSave.push(chunk);
            idsToMark.push(...batch.map(r => r.id));
            processedCount += batch.length;
          } catch (error) {
            console.error('Failed to create chunk from final batch:', error);
          }
        }

        // Save all chunks in transaction
        for (const chunk of chunksToSave) {
          await tx.executeSql(
            `INSERT INTO sensor_data_chunk (id, session_id, timestamp, accelerometer, gyroscope, audio, light)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

        // Mark as processed in same transaction
        if (idsToMark.length > 0) {
          const placeholders = idsToMark.map(() => '?').join(',');
          await tx.executeSql(
            `UPDATE sensor_data_raw SET processed = 1 WHERE id IN (${placeholders})`,
            idsToMark
          );
        }
      });
    } catch (error) {
      console.error('Transaction failed while processing batch:', error);
      throw error;
    }

    return processedCount;
  }

  /**
   * Create SensorDataChunk from batch of raw readings
   * Calculates average values for the chunk
   */
  private createChunkFromBatch(
    sessionId: UUID,
    batch: RawSensorData[]
  ): SensorDataChunk {
    if (batch.length === 0) {
      throw new Error('Cannot create chunk from empty batch');
    }

    // Calculate average values for the chunk
    const avgX = batch.reduce((sum, r) => sum + r.x, 0) / batch.length;
    const avgY = batch.reduce((sum, r) => sum + r.y, 0) / batch.length;
    const avgZ = batch.reduce((sum, r) => sum + r.z, 0) / batch.length;
    
    // Use timestamp of first reading in chunk
    const timestamp = batch[0].timestamp;

    const accelerometerData: AccelerometerData = {
      x: avgX,
      y: avgY,
      z: avgZ,
      timestamp,
    };

    return {
      id: uuidv4(),
      sessionId,
      timestamp,
      accelerometer: accelerometerData,
    };
  }

  /**
   * Check if processing is needed for a session
   * @param sessionId - Session ID to check
   * @returns True if there is unprocessed data
   */
  async needsProcessing(sessionId: UUID): Promise<boolean> {
    try {
      const count = await rawSensorDataRepository.getUnprocessedCount(sessionId);
      return count > 0;
    } catch (error) {
      console.error('Failed to check if processing needed:', error);
      return false;
    }
  }

  /**
   * Get processing statistics for a session
   * @param sessionId - Session ID to get stats for
   * @returns Object with processing statistics
   */
  async getProcessingStats(sessionId: UUID): Promise<{
    total: number;
    processed: number;
    unprocessed: number;
    percentageProcessed: number;
  }> {
    try {
      const total = await rawSensorDataRepository.getTotalCount(sessionId);
      const unprocessed = await rawSensorDataRepository.getUnprocessedCount(sessionId);
      const processed = total - unprocessed;
      const percentageProcessed = total > 0 ? (processed / total) * 100 : 0;

      return {
        total,
        processed,
        unprocessed,
        percentageProcessed: Math.round(percentageProcessed * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        total: 0,
        processed: 0,
        unprocessed: 0,
        percentageProcessed: 0,
      };
    }
  }
}

export const sensorDataProcessor = new SensorDataProcessor();
export default sensorDataProcessor;

