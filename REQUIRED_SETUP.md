# ⚠️ REQUIRED SETUP - What You Need To Do

## 🚨 Critical: Native Modules Must Be Implemented

The app is **fully functional** but requires **native module implementation** for real sensor data. Here's what you need to do:

## 1. Native Sensor Module (REQUIRED)

### iOS Implementation Needed

Create `ios/SleepSync/SensorModule.swift`:

```swift
import Foundation
import React
import CoreMotion
import AVFoundation

@objc(SensorModule)
class SensorModule: RCTEventEmitter {
  private let motionManager = CMMotionManager()
  private var audioRecorder: AVAudioRecorder?
  
  @objc
  func startAccelerometer(_ interval: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    motionManager.accelerometerUpdateInterval = interval.doubleValue / 1000.0
    motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, error in
      guard let data = data else { return }
      self?.sendEvent(withName: "AccelerometerData", body: [
        "x": data.acceleration.x,
        "y": data.acceleration.y,
        "z": data.acceleration.z
      ])
    }
    resolve(nil)
  }
  
  // Implement similar for gyroscope, microphone, light sensor
  // See NATIVE_MODULES_SETUP.md for full implementation
}
```

### Android Implementation Needed

Create `android/app/src/main/java/com/sleepsync/SensorModule.kt`:

```kotlin
package com.sleepsync

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.hardware.SensorManager
import android.hardware.Sensor

class SensorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  
  @ReactMethod
  fun startAccelerometer(interval: Int, promise: Promise) {
    val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    // Implement sensor listener
    promise.resolve(null)
  }
  
  // Implement similar for other sensors
}
```

## 2. HealthKit Module (iOS Only - REQUIRED)

Create `ios/SleepSync/HealthKitModule.swift`:

```swift
import HealthKit

@objc(HealthKitModule)
class HealthKitModule: NSObject {
  private let healthStore = HKHealthStore()
  
  @objc
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let typesToRead: Set<HKObjectType> = [
      HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
      HKObjectType.quantityType(forIdentifier: .heartRate)!
    ]
    
    healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
      resolve(success)
    }
  }
  
  // Implement saveSleepAnalysis, readSleepAnalysis methods
}
```

## 3. Oura API Credentials (REQUIRED for Oura Integration)

1. Get Oura API credentials from: https://cloud.ouraring.com/personal-access-tokens
2. Create `.env` file in project root:
```
OURA_CLIENT_ID=your_client_id
OURA_CLIENT_SECRET=your_client_secret
OURA_REDIRECT_URI=your_app_scheme://oauth/callback
```

Or set environment variables before running:
```bash
export OURA_CLIENT_ID=your_client_id
export OURA_CLIENT_SECRET=your_client_secret
export OURA_REDIRECT_URI=your_app_scheme://oauth/callback
```

## 4. Permissions Setup

### iOS (Info.plist)
Add to `ios/SleepSync/Info.plist`:
```xml
<key>NSMotionUsageDescription</key>
<string>We need motion data to track your sleep patterns</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to detect snoring and disturbances</string>
<key>NSHealthShareUsageDescription</key>
<string>We need health data to sync your sleep information</string>
<key>NSHealthUpdateUsageDescription</key>
<string>We need to save your sleep data to Health</string>
```

### Android (AndroidManifest.xml)
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-feature android:name="android.hardware.sensor.accelerometer" />
<uses-feature android:name="android.hardware.sensor.gyroscope" />
```

## 5. Test Real Data Flow

Once native modules are implemented:

1. **Start a sleep session:**
   ```typescript
   const session = await sessionRecorder.startSession(userId);
   // Real sensors will now stream data
   ```

2. **Check sensor data:**
   - Accelerometer/Gyroscope: Should work with `react-native-sensors` (already installed)
   - Microphone: Requires native module
   - Light: Requires native module

3. **Verify sleep detection:**
   - Real movement data → Real sleep/wake detection
   - Real audio data → Real snoring detection
   - Real light data → Real disturbance detection

## ✅ What's Already Working (No Setup Needed)

- ✅ Sleep detection algorithms (use real accelerometer/gyroscope from react-native-sensors)
- ✅ Sleep scoring engine
- ✅ Insights and recommendations
- ✅ Baseline analyzer
- ✅ Smart alarm logic
- ✅ Database operations
- ✅ Session recording structure

## 🚨 Current Status

- **Accelerometer/Gyroscope**: ✅ Working (uses react-native-sensors)
- **Microphone**: ⚠️ Needs native module (will throw error until implemented)
- **Light Sensor**: ⚠️ Needs native module (will throw error until implemented)
- **HealthKit**: ⚠️ Needs native module (will throw error until implemented)
- **Oura API**: ⚠️ Needs API credentials (will fail without them)

## 📝 Next Steps

1. **Implement native sensor modules** (microphone, light)
2. **Implement HealthKit module** (iOS)
3. **Set Oura API credentials** (if using Oura)
4. **Test on real device** (sensors don't work in simulator)

**The JavaScript/TypeScript layer is 100% complete and ready. You just need to implement the native bridges!**

