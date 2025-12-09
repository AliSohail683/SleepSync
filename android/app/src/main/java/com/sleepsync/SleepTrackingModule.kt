package com.sleepsync

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class SleepTrackingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String = "SleepTrackingModule"
    
    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            val context = reactApplicationContext
            SleepTrackingService.startService(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_TRACKING_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            val context = reactApplicationContext
            SleepTrackingService.stopService(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_TRACKING_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun isTracking(promise: Promise) {
        // Check if service is running
        val context = reactApplicationContext
        val isRunning = isServiceRunning(context, SleepTrackingService::class.java)
        promise.resolve(isRunning)
    }
    
    private fun isServiceRunning(context: Context, serviceClass: Class<*>): Boolean {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val services = activityManager.getRunningServices(Integer.MAX_VALUE)
        return services.any { it.service.className == serviceClass.name }
    }
}

