package com.sleepsync

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteStatement
import android.util.Log
import java.text.SimpleDateFormat
import java.util.*

/**
 * Database helper for native service to write raw sensor data
 * Only manages sensor_data_raw table - other tables managed by React Native
 */
data class SensorReading(val timestamp: Long, val x: Float, val y: Float, val z: Float)

class SleepTrackingDatabaseHelper(context: Context) : SQLiteOpenHelper(
    context,
    "sleepsync.db",
    null,
    1
) {
    companion object {
        private const val TAG = "SleepTrackingDB"
        private const val TABLE_SENSOR_RAW = "sensor_data_raw"
        private const val TABLE_SLEEP_SESSION = "sleep_session"
    }

    override fun onCreate(db: SQLiteDatabase) {
        try {
            // Only create raw sensor data table - other tables managed by React Native
            db.execSQL("""
                CREATE TABLE IF NOT EXISTS $TABLE_SENSOR_RAW (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    x REAL NOT NULL,
                    y REAL NOT NULL,
                    z REAL NOT NULL,
                    sensor_type TEXT DEFAULT 'accelerometer',
                    processed INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            """.trimIndent())
            
            db.execSQL("""
                CREATE INDEX IF NOT EXISTS idx_sensor_raw_session_timestamp 
                ON $TABLE_SENSOR_RAW(session_id, timestamp)
            """.trimIndent())
            
            db.execSQL("""
                CREATE INDEX IF NOT EXISTS idx_sensor_raw_processed 
                ON $TABLE_SENSOR_RAW(session_id, processed)
            """.trimIndent())
            
            Log.d(TAG, "Raw sensor data table created successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create raw sensor data table", e)
            throw e
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Ensure table exists on upgrade
        try {
            onCreate(db)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upgrade database", e)
        }
    }

    /**
     * Get active session ID from database
     */
    fun getActiveSessionId(): String? {
        return try {
            val db = readableDatabase
            val cursor = db.rawQuery(
                "SELECT id FROM $TABLE_SLEEP_SESSION WHERE end_at IS NULL ORDER BY start_at DESC LIMIT 1",
                null
            )
            
            val sessionId = if (cursor.moveToFirst()) {
                cursor.getString(0)
            } else {
                null
            }
            
            cursor.close()
            sessionId
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get active session", e)
            null
        }
    }

    /**
     * Batch insert raw sensor data points with transaction
     * Returns number of successfully inserted rows
     */
    fun batchInsertRawSensorData(sessionId: String, dataPoints: List<SensorReading>): Int {
        if (dataPoints.isEmpty()) {
            return 0
        }

        return try {
            val db = writableDatabase
            db.beginTransaction()
            
            try {
                val sql = """
                    INSERT INTO $TABLE_SENSOR_RAW 
                    (session_id, timestamp, x, y, z, sensor_type, processed, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """.trimIndent()
                
                val statement: SQLiteStatement = db.compileStatement(sql)
                val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                var count = 0
                
                for (reading in dataPoints) {
                    try {
                        statement.clearBindings()
                        statement.bindString(1, sessionId)
                        statement.bindLong(2, reading.timestamp)
                        statement.bindDouble(3, reading.x.toDouble())
                        statement.bindDouble(4, reading.y.toDouble())
                        statement.bindDouble(5, reading.z.toDouble())
                        statement.bindString(6, "accelerometer")
                        statement.bindLong(7, 0) // Not processed yet
                        statement.bindString(8, dateFormat.format(Date(reading.timestamp)))
                        
                        statement.executeInsert()
                        count++
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to insert single reading: ${e.message}")
                        // Continue with next reading
                    }
                }
                
                statement.close()
                db.setTransactionSuccessful()
                
                if (count > 0) {
                    Log.d(TAG, "Batch inserted $count raw sensor data points for session $sessionId")
                }
                
                count
            } finally {
                db.endTransaction()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to batch insert raw sensor data", e)
            0
        }
    }

    /**
     * Get count of unprocessed raw data points for a session
     */
    fun getUnprocessedCount(sessionId: String): Int {
        return try {
            val db = readableDatabase
            val cursor = db.rawQuery(
                "SELECT COUNT(*) as count FROM $TABLE_SENSOR_RAW WHERE session_id = ? AND processed = 0",
                arrayOf(sessionId)
            )
            
            val count = if (cursor.moveToFirst()) {
                cursor.getInt(0)
            } else {
                0
            }
            
            cursor.close()
            count
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get unprocessed count", e)
            0
        }
    }

    override fun close() {
        try {
            super.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error closing database", e)
        }
    }
}

