# Crash Debugging Guide - Start Session Button

## Changes Made to Fix Crashes

### 1. **Enhanced Error Handling**
- Added comprehensive try-catch blocks at every level
- Database initialization check before session creation
- Native module error handling with timeouts
- Background service errors are non-fatal

### 2. **Database Safety**
- Added `isInitialized()` check
- Database initialization verification before operations
- Better error messages for database failures

### 3. **Native Module Safety**
- Added null checks for React context
- Service already-running check
- Timeout protection (5 seconds)
- Detailed error logging

### 4. **Background Service Safety**
- Try-catch in `onCreate()` to prevent service crashes
- Graceful degradation if wake lock fails
- Sensor registration error handling

## How to Debug

### Check Logs
```bash
# Android
adb logcat | grep -E "(SleepSync|SleepTracking|ReactNativeJS)"

# iOS
# Check Xcode console
```

### Common Crash Causes

1. **Database Not Initialized**
   - Check: `storageService.isInitialized()` returns true
   - Fix: Ensure `setupDB()` is called in `useInitializeApp`

2. **Native Module Not Available**
   - Check: `SleepTrackingModule` exists in `NativeModules`
   - Fix: Rebuild Android app after adding native modules

3. **Service Permission Issues**
   - Check: Foreground service permission granted
   - Fix: Request `FOREGROUND_SERVICE` permission

4. **Notification Channel Not Created**
   - Check: Android 8.0+ requires notification channels
   - Fix: `createNotificationChannel()` is called in service

## Testing Steps

1. **Clean Build**
   ```bash
   cd android && ./gradlew clean && cd ..
   yarn android
   ```

2. **Check Console Logs**
   - Look for "✅ Sleep session started" message
   - Check for any error messages before crash

3. **Test Without Background Service**
   - Temporarily comment out `backgroundTrackingService.startTracking()`
   - If session starts, issue is with native module

4. **Check Database**
   - Verify database is initialized before session creation
   - Check if `createSleepSession` is throwing errors

## Error Messages to Look For

- `Database not initialized` - Database setup issue
- `START_TRACKING_ERROR` - Native module issue
- `NO_CONTEXT` - React context issue
- `Failed to create sleep session` - Database write issue

## Next Steps if Still Crashing

1. Enable React Native error boundary
2. Add crash reporting (Sentry, etc.)
3. Check device logs for native crashes
4. Test on different Android versions
5. Verify all native modules are properly linked

