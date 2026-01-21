package com.sleepsync

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.sleepsync.MainApplication
import java.util.*

class SleepTrackingService : Service(), SensorEventListener {
    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var dbHelper: SleepTrackingDatabaseHelper? = null
    private var currentSessionId: String? = null
    
    // Buffer for batch inserts
    private val sensorDataBuffer: MutableList<SensorReading> = Collections.synchronizedList(mutableListOf())
    private val BUFFER_SIZE = 50 // Save every 50 readings (~5 seconds at 10Hz)
    private val BUFFER_FLUSH_INTERVAL = 30000L // Or every 30 seconds
    private val handler = Handler(Looper.getMainLooper())
    private var flushRunnable: Runnable? = null
    
    companion object {
        private const val TAG = "SleepTrackingService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "sleep_tracking_channel"
        private const val WAKE_LOCK_TAG = "SleepSync::WakeLock"
        
        fun startService(context: Context) {
            val intent = Intent(context, SleepTrackingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, SleepTrackingService::class.java)
            context.stopService(intent)
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        try {
            createNotificationChannel()
            startForeground(NOTIFICATION_ID, createNotification())
            
            // Initialize database helper
            dbHelper = SleepTrackingDatabaseHelper(applicationContext)
            
            // Get active session ID
            currentSessionId = dbHelper?.getActiveSessionId()
            if (currentSessionId == null) {
                android.util.Log.w(TAG, "No active session found, sensor data will not be saved")
            } else {
                android.util.Log.d(TAG, "Tracking session: $currentSessionId")
            }
            
            sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
            accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            
            if (accelerometer == null) {
                android.util.Log.e(TAG, "Accelerometer sensor not available")
            }
            
            // Acquire wake lock to keep service running
            try {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    WAKE_LOCK_TAG
                )
                wakeLock?.acquire(10 * 60 * 60 * 1000L) // 10 hours max
                android.util.Log.d(TAG, "Wake lock acquired")
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Failed to acquire wake lock", e)
                // Continue without wake lock - service will still work but may be killed by system
            }
            
            // Start periodic flush timer
            startPeriodicFlush()
            
            android.util.Log.d(TAG, "SleepTrackingService created successfully")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to create service", e)
            // Don't crash - try to continue
        }
    }
    
    private fun startPeriodicFlush() {
        flushRunnable = object : Runnable {
            override fun run() {
                flushSensorDataBuffer()
                handler.postDelayed(this, BUFFER_FLUSH_INTERVAL)
            }
        }
        handler.postDelayed(flushRunnable!!, BUFFER_FLUSH_INTERVAL)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            // Refresh session ID in case it changed
            currentSessionId = dbHelper?.getActiveSessionId()
            if (currentSessionId != null) {
                android.util.Log.d(TAG, "Refreshed session ID: $currentSessionId")
            }
            
            // Start sensor monitoring
            accelerometer?.let {
                sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
                android.util.Log.d(TAG, "Sensor listener registered")
            } ?: run {
                android.util.Log.e(TAG, "Cannot register sensor listener - accelerometer is null")
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Failed to start sensor monitoring", e)
            // Continue without sensors - service will still run
        }
        
        return START_STICKY // Restart if killed
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        android.util.Log.d(TAG, "Service destroying, flushing remaining data")
        
        // Stop periodic flush
        flushRunnable?.let { handler.removeCallbacks(it) }
        
        // Flush any remaining data
        flushSensorDataBuffer()
        
        // Cleanup
        sensorManager?.unregisterListener(this)
        wakeLock?.release()
        dbHelper?.close()
        
        android.util.Log.d(TAG, "Service destroyed")
    }
    
    override fun onSensorChanged(event: SensorEvent?) {
        event?.let {
            if (it.sensor.type == Sensor.TYPE_ACCELEROMETER) {
                val x = it.values[0]
                val y = it.values[1]
                val z = it.values[2]
                val timestamp = System.currentTimeMillis()
                
                // Add to buffer
                sensorDataBuffer.add(SensorReading(timestamp, x, y, z))
                
                // Flush if buffer is full
                if (sensorDataBuffer.size >= BUFFER_SIZE) {
                    flushSensorDataBuffer()
                }
                
                // Also try to send to React Native if app is running (optional, for real-time updates)
                sendSensorDataToReactNative(x, y, z, timestamp)
            }
        }
    }
    
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Handle accuracy changes if needed
        if (accuracy < SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM) {
            android.util.Log.w(TAG, "Sensor accuracy degraded: $accuracy")
        }
    }
    
    private fun flushSensorDataBuffer() {
        if (sensorDataBuffer.isEmpty()) {
            return
        }
        
        // Refresh session ID
        val sessionId = currentSessionId ?: dbHelper?.getActiveSessionId()
        if (sessionId == null) {
            android.util.Log.w(TAG, "No active session, clearing buffer (${sensorDataBuffer.size} readings)")
            sensorDataBuffer.clear()
            return
        }
        
        // Update current session ID
        currentSessionId = sessionId
        
        // Copy buffer contents and clear
        val dataToSave = synchronized(sensorDataBuffer) {
            val copy = sensorDataBuffer.toList()
            sensorDataBuffer.clear()
            copy
        }
        
        if (dataToSave.isEmpty()) {
            return
        }
        
        // Batch insert to database
        val saved = dbHelper?.batchInsertRawSensorData(sessionId, dataToSave) ?: 0
        if (saved > 0) {
            android.util.Log.d(TAG, "Saved $saved raw sensor data points to database")
        } else if (saved == 0 && dataToSave.isNotEmpty()) {
            android.util.Log.w(TAG, "Failed to save ${dataToSave.size} sensor data points")
        }
    }
    
    private fun sendSensorDataToReactNative(x: Float, y: Float, z: Float, timestamp: Long) {
        try {
            val application = applicationContext as? MainApplication
            val reactContext = application?.reactNativeHost?.reactInstanceManager?.currentReactContext
            
            reactContext?.let { context ->
                val params = WritableNativeMap().apply {
                    putDouble("x", x.toDouble())
                    putDouble("y", y.toDouble())
                    putDouble("z", z.toDouble())
                    putDouble("timestamp", timestamp.toDouble())
                }
                
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("BackgroundSensorData", params)
            }
        } catch (e: Exception) {
            // Service might be running without React context - this is expected when app is killed
            // Data is still saved to database, so this is not critical
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Sleep Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Tracking your sleep session"
                setShowBadge(false)
                enableVibration(false)
                enableLights(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            flags
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SleepSync")
            .setContentText("Tracking your sleep...")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setSilent(true)
            .build()
    }
}
