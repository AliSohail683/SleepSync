# Auth & Onboarding Flow Fix

## Problem
The app was generating a **new UUID every time it started**, which meant:
- User completes onboarding → profile saved with ID "abc123"
- App restarts → generates new ID "xyz789"
- Tries to load profile with "xyz789" → fails
- Shows onboarding again (even though user already completed it)

## Solution

### 1. Persistent User ID Storage
- Added `getStoredUserId()` and `setStoredUserId()` to `storageService`
- User ID is now stored in MMKV (persistent across app restarts)
- User ID is generated once and reused

### 2. Fixed Initialization Flow
**Before:**
```typescript
const userId = uuidv4(); // NEW ID EVERY TIME ❌
await loadProfile(userId);
```

**After:**
```typescript
let userId = await storageService.getStoredUserId();
if (!userId) {
  userId = uuidv4();
  await storageService.setStoredUserId(userId);
  setOnboardingComplete(false); // New user
} else {
  await loadProfile(userId);
  setOnboardingComplete(true); // Existing user
}
```

### 3. Profile Creation
- `createProfile()` now uses the stored user ID
- Ensures profile is created with the same ID that was stored

### 4. Logout
- `logout()` now clears the stored user ID
- User will see onboarding again after logout

## Flow Now

1. **First Launch:**
   - No stored user ID → Generate new ID → Store it → Show onboarding

2. **After Onboarding:**
   - Profile created with stored ID → `isOnboardingComplete = true` → Show Home

3. **Subsequent Launches:**
   - Stored user ID exists → Load profile → If found, show Home; if not, show onboarding

4. **After Logout:**
   - Clear stored ID → Clear profile → Show onboarding

## ✅ Fixed
- ✅ User ID persists across app restarts
- ✅ Onboarding only shows for new users
- ✅ Existing users go straight to Home
- ✅ Logout properly resets state

