# Native Modules Setup Guide

## ⚠️ REQUIRED: Native Module Implementation

The following native modules **MUST be implemented** for the app to work with real sensor data:

### 1. Sensor Module (iOS & Android)

**Location:**
- iOS: `ios/SleepSync/SensorModule.swift`
- Android: `android/app/src/main/java/com/sleepsync/SensorModule.kt`

**Required Functionality:**
- Accelerometer data streaming
- Gyroscope data streaming  
- Microphone audio level and frequency analysis
- Ambient light sensor data

**iOS Implementation:**
```swift
// Use CoreMotion for accelerometer/gyroscope
// Use AVFoundation for microphone
// Use AVCaptureDevice for light sensor (if available)
```

**Android Implementation:**
```kotlin
// Use SensorManager for all sensors
// Use AudioRecord for microphone
// Use Sensor.TYPE_LIGHT for ambient light
```

### 2. HealthKit Module (iOS Only)

**Location:** `ios/SleepSync/HealthKitModule.swift`

**Required:**
- Request HealthKit permissions
- Save sleep analysis data
- Read sleep data from HealthKit
- Save heart rate, respiration rate, audio exposure

**Setup:**
1. Add HealthKit capability in Xcode
2. Add `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` to Info.plist
3. Import HealthKit framework

### 3. Google Fit Module (Android Only)

**Location:** `android/app/src/main/java/com/sleepsync/GoogleFitModule.kt`

**Required:**
- Request Google Fit permissions
- Save sleep data
- Read sleep data from Google Fit

**Setup:**
1. Add Google Fit API dependency
2. Configure OAuth 2.0 credentials
3. Request necessary scopes

## 🔧 What You Need To Do

### Step 1: Implement Native Sensor Module

**iOS:**
1. Create `ios/SleepSync/SensorModule.swift`
2. Implement CoreMotion for accelerometer/gyroscope
3. Implement AVFoundation for microphone
4. Export to React Native using RCTBridgeModule

**Android:**
1. Create `android/app/src/main/java/com/sleepsync/SensorModule.kt`
2. Implement SensorManager for all sensors
3. Implement AudioRecord for microphone
4. Export to React Native using ReactContextBaseJavaModule

### Step 2: Implement HealthKit Module (iOS)

1. Create `ios/SleepSync/HealthKitModule.swift`
2. Implement HealthKit read/write operations
3. Handle permissions properly
4. Export to React Native

### Step 3: Configure Oura API

1. Get Oura API credentials from https://cloud.ouraring.com/personal-access-tokens
2. Set environment variables:
   - `OURA_CLIENT_ID`
   - `OURA_CLIENT_SECRET`
   - `OURA_REDIRECT_URI`

### Step 4: Test Real Sensor Data

Once native modules are implemented, sensors will provide real data instead of simulated data.

## 📝 Current Status

- ✅ **JavaScript/TypeScript layer**: Complete and ready
- ⚠️ **Native modules**: Need implementation
- ✅ **API clients**: Ready (Oura needs credentials)
- ✅ **Business logic**: Complete and tested

## 🚨 Important Notes

1. **Microphone and Light sensors** currently use simulated data - they will throw errors until native modules are implemented
2. **HealthKit** will fail until native module is implemented
3. **Oura API** needs real credentials to work
4. **Accelerometer and Gyroscope** use `react-native-sensors` which should work, but may need native permission setup

## ✅ What's Already Working

- Sleep detection algorithms (use real accelerometer/gyroscope data from react-native-sensors)
- Sleep scoring engine
- Insights and recommendations
- Baseline analyzer
- Smart alarm logic
- All database operations
- Session recording (once sensors provide real data)

