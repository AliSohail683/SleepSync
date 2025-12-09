package com.sleepsync

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.AudioFormat
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.*

class SensorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), SensorEventListener {
  private val sensorManager: SensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private var lightSensor: Sensor? = null
  private var audioRecord: AudioRecord? = null
  private var isMicrophoneActive = false
  private var isLightSensorActive = false
  private var recordingThread: Thread? = null
  private var lightSensorUpdateInterval: Long = 1000

  override fun getName(): String {
    return "SensorModule"
  }

  // MARK: - Permissions

  @ReactMethod
  fun requestPermissions(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity")
      return
    }

    val permissions = arrayOf(
      Manifest.permission.RECORD_AUDIO,
      Manifest.permission.BODY_SENSORS
    )

    val results = permissions.map { permission ->
      ActivityCompat.checkSelfPermission(reactApplicationContext, permission) == PackageManager.PERMISSION_GRANTED
    }

    val allGranted = results.all { it }
    promise.resolve(allGranted)
  }

  // MARK: - Microphone

  @ReactMethod
  fun startMicrophone(interval: Int, promise: Promise) {
    if (isMicrophoneActive) {
      promise.resolve(null)
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity")
      return
    }

    if (ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("PERMISSION_DENIED", "Microphone permission not granted")
      return
    }

    try {
      val sampleRate = 44100
      val channelConfig = AudioFormat.CHANNEL_IN_MONO
      val audioFormat = AudioFormat.ENCODING_PCM_16BIT
      val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)

      audioRecord = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        sampleRate,
        channelConfig,
        audioFormat,
        bufferSize * 2
      )

      audioRecord?.startRecording()
      isMicrophoneActive = true

      recordingThread = Thread {
        val buffer = ShortArray(bufferSize)
        val samples = FloatArray(bufferSize)

        while (isMicrophoneActive && audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
          val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0

          if (read > 0) {
            // Convert to float and calculate RMS
            var sum = 0.0
            for (i in 0 until read) {
              samples[i] = buffer[i] / 32768.0f
              sum += (samples[i] * samples[i]).toDouble()
            }

            val rms = sqrt(sum / read)
            val decibel = 20 * log10(rms.toDouble() + 1e-10)
            val normalizedDecibel = max(0.0, min(100.0, decibel + 60.0))

            // Simple frequency estimation (FFT would be better)
            var maxAmplitude = 0.0f
            var maxIndex = 0

            for (i in 0 until min(read, 1024)) {
              val amplitude = abs(samples[i])
              if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude
                maxIndex = i
              }
            }

            val frequency = (maxIndex * sampleRate) / bufferSize.toDouble()

            // Detect snoring (200-400 Hz range with sufficient volume)
            val isSnoring = frequency >= 200 && frequency <= 400 && normalizedDecibel > 40

            sendEvent("AudioData", createMap().apply {
              putDouble("decibel", normalizedDecibel)
              putDouble("frequency", frequency)
              putBoolean("isSnoring", isSnoring)
            })
          }

          Thread.sleep(interval.toLong())
        }
      }

      recordingThread?.start()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("MICROPHONE_ERROR", "Failed to start microphone: ${e.message}", e)
    }
  }

  @ReactMethod
  fun stopMicrophone(promise: Promise) {
    if (!isMicrophoneActive) {
      promise.resolve(null)
      return
    }

    isMicrophoneActive = false
    audioRecord?.stop()
    audioRecord?.release()
    audioRecord = null
    recordingThread?.join()
    recordingThread = null

    promise.resolve(null)
  }

  // MARK: - Light Sensor

  @ReactMethod
  fun startLightSensor(interval: Int, promise: Promise) {
    if (isLightSensorActive) {
      promise.resolve(null)
      return
    }

    lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
    if (lightSensor == null) {
      promise.reject("SENSOR_UNAVAILABLE", "Light sensor not available on this device")
      return
    }

    lightSensorUpdateInterval = interval.toLong()
    sensorManager.registerListener(this, lightSensor, SensorManager.SENSOR_DELAY_NORMAL)
    isLightSensorActive = true

    promise.resolve(null)
  }

  @ReactMethod
  fun stopLightSensor(promise: Promise) {
    if (!isLightSensorActive) {
      promise.resolve(null)
      return
    }

    sensorManager.unregisterListener(this)
    isLightSensorActive = false

    promise.resolve(null)
  }

  // MARK: - SensorEventListener

  override fun onSensorChanged(event: SensorEvent?) {
    if (event?.sensor?.type == Sensor.TYPE_LIGHT && isLightSensorActive) {
      val lux = event.values[0].toDouble()

      sendEvent("LightData", createMap().apply {
        putDouble("lux", lux)
      })
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // Not needed for light sensor
  }

  // MARK: - Helper

  private fun sendEvent(eventName: String, params: WritableMap) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }
}

