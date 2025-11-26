# SleepSync Architecture

This document provides an overview of the SleepSync application architecture, data flow, and design patterns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (React Native Screens, Components, Navigation)          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   State Management                       │
│             (Zustand Stores - Global State)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Services Layer                         │
│  (Business Logic, API calls, Native Modules)             │
│  - sleepService    - soundService   - alarmService       │
│  - subscriptionService  - storageService  - etc.         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Data Persistence                        │
│        (SQLite, SecureStore, Local Storage)              │
└──────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Presentation Layer

**Location**: `src/screens/`, `src/components/`

**Responsibilities**:
- Render UI components
- Handle user interactions
- Display data from state
- Navigate between screens
- No business logic

**Key Files**:
- `src/screens/HomeDashboard.tsx` - Main dashboard
- `src/screens/SleepSessionScreen.tsx` - Sleep tracking
- `src/components/Button.tsx`, `Card.tsx`, etc. - Reusable UI

### 2. State Management Layer

**Location**: `src/store/`

**Technology**: Zustand (lightweight React state management)

**Stores**:
- `userStore.ts` - User profile and authentication
- `sleepStore.ts` - Sleep sessions and tracking
- `soundStore.ts` - Soundscape profiles and playback
- `alarmStore.ts` - Alarm configurations
- `subscriptionStore.ts` - IAP and subscription status

**Pattern**:
```typescript
export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,
  
  loadProfile: async (userId) => {
    set({ isLoading: true });
    const profile = await storageService.getUserProfile(userId);
    set({ profile, isLoading: false });
  },
}));
```

### 3. Services Layer

**Location**: `src/services/`

**Responsibilities**:
- Implement business logic
- Interact with native modules
- Manage data persistence
- Handle external APIs (if any)

**Services**:

#### `sleepService.ts`
- Start/end sleep sessions
- Calculate sleep scores
- Evaluate sleep quality
- Generate insights

#### `soundService.ts`
- Generate personalized soundscapes
- Play/pause audio
- Fade in/out
- Background audio management

#### `alarmService.ts`
- Schedule smart alarms
- Compute optimal wake times
- Handle notification permissions
- Manage alarm configs

#### `subscriptionService.ts`
- Initialize IAP
- Fetch products
- Handle purchases
- Verify receipts (local stub)
- Restore purchases

#### `storageService.ts`
- Database setup and migrations
- CRUD operations for all entities
- SQLite query management

#### `temperatureService.ts`
- Analyze temperature inputs
- Generate recommendations
- Convert units

### 4. Data Persistence Layer

**Technologies**:
- **SQLite** (`expo-sqlite`) - Primary database
- **SecureStore** (`expo-secure-store`) - Sensitive data
- **AsyncStorage** - Simple key-value storage (if needed)

**Schema**:
```sql
user_profile
  - id, age_range, gender, sleep_goal_hours, etc.

sleep_session
  - id, user_id, start_at, end_at, duration_min, stages, score, etc.

sound_profile
  - id, user_id, name, base_type, blend, volume, etc.

alarm_config
  - id, user_id, enabled, target_window_start, target_window_end, etc.

subscription_status
  - id, active, platform, expiry_date, product_id, etc.

sleep_debt_record
  - date, ideal_hours, actual_hours, debt_hours
```

## Data Flow

### Example: Starting a Sleep Session

```
1. User taps "Start Sleep Session" button
   └─> HomeDashboard.tsx

2. Calls onStartSession() handler
   └─> useSleepStore.startSession(userId)

3. Store calls service
   └─> sleepService.startSession(userId)

4. Service creates session entity
   └─> storageService.createSleepSession(session)

5. Database persists data
   └─> SQLite INSERT

6. Store updates state
   └─> set({ currentSession: session })

7. UI re-renders with new state
   └─> Shows active session UI
```

### Example: Purchasing Subscription

```
1. User taps "Start Free Trial"
   └─> SubscriptionPaywall.tsx

2. Calls purchase handler
   └─> useSubscriptionStore.purchase(productId)

3. Store calls subscription service
   └─> subscriptionService.purchase(productId)

4. Service initiates IAP
   └─> IAPModule.purchaseItemAsync(productId)

5. Platform shows purchase UI
   └─> App Store / Google Play dialog

6. Purchase listener receives result
   └─> subscriptionService.handlePurchaseUpdate()

7. Verify receipt (stub in dev)
   └─> subscriptionService.verifyReceipt()

8. Update local status
   └─> storageService.updateSubscriptionStatus()

9. Store updates state
   └─> set({ status: { active: true, ... } })

10. UI re-renders
    └─> Shows premium features unlocked
```

## Design Patterns

### 1. Service Pattern

Services encapsulate business logic and are stateless.

```typescript
class SleepService {
  async startSession(userId: UUID): Promise<SleepSession> {
    const session = { /* ... */ };
    await storageService.createSleepSession(session);
    return session;
  }
}

export const sleepService = new SleepService();
```

### 2. Repository Pattern (Storage Service)

Abstracts data access logic.

```typescript
class StorageService {
  async getUserProfile(userId: UUID): Promise<UserProfile | null> {
    const result = await this.db.getFirstAsync(/* query */);
    return this.parseUserProfile(result);
  }
}
```

### 3. Observer Pattern (Zustand)

Components subscribe to state changes.

```typescript
const { profile, loadProfile } = useUserStore();

useEffect(() => {
  loadProfile(userId);
}, [userId]);
```

### 4. Strategy Pattern (Soundscape Generation)

Different strategies based on user preferences.

```typescript
if (noiseSensitivity === 'high') {
  return whiteNoiseStrategy();
} else if (sleepScore < 60) {
  return calmingSoundsStrategy();
}
```

## Navigation Structure

```
App
├── Onboarding Flow (if not completed)
│   ├── Welcome
│   ├── BasicInfo
│   ├── SleepGoals
│   ├── Preferences
│   └── Complete
│
└── Main App (if onboarding completed)
    ├── Home (Dashboard)
    ├── SleepSession
    ├── SleepInsights
    ├── Soundscapes
    ├── Alarms
    ├── Subscription
    └── Settings
```

## Background Tasks

### Audio Playback
- Uses `expo-av` with background audio mode
- Continues playing when app is backgrounded
- Handles audio interruptions

### Alarm Scheduling
- Uses `expo-notifications` for local notifications
- Schedules alarms at computed optimal times
- Handles rescheduling on app restart

### Data Sync (Future)
- `expo-task-manager` and `expo-background-fetch`
- Periodic background sync
- Updates subscription status
- Recalculates sleep debt

## Security Considerations

### Local Data
- SQLite database encrypted at rest (OS-level)
- Sensitive data in SecureStore
- No plaintext passwords

### Subscriptions
- Receipt validation (server-side recommended)
- Secure storage of purchase tokens
- Verify expiry dates locally

### Privacy
- All data stored locally by default
- No analytics without consent
- User can export/delete data

## Performance Optimizations

### 1. Lazy Loading
- Components loaded on demand
- Large lists virtualized

### 2. Memoization
- Expensive calculations cached
- React.memo for pure components

### 3. Database Indexing
```sql
CREATE INDEX idx_sleep_session_user ON sleep_session(user_id);
CREATE INDEX idx_sleep_session_date ON sleep_session(start_at);
```

### 4. Image Optimization
- Use optimized assets
- Lazy load images
- Cache network images

## Testing Strategy

### Unit Tests
- Services layer (business logic)
- Utility functions
- Algorithm correctness

### Integration Tests
- Store + Service interactions
- Database operations
- Mock IAP flows

### E2E Tests (Optional)
- Critical user flows
- Onboarding process
- Purchase flow

## Future Enhancements

### Backend Integration

```
┌─────────────┐
│  React App  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   REST API  │ (Future)
│   /graphql  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │
│  (PostgreSQL)│
└─────────────┘
```

**API Endpoints** (when backend is added):
- `POST /api/verify-receipt` - Server-side receipt validation
- `GET /api/user/sleep-data` - Sync sleep data
- `POST /api/ai/insights` - AI-powered insights

### Cloud Sync
- Sync across devices
- Backup sleep data
- Cross-platform compatibility

### Analytics
- Privacy-respecting analytics
- Usage patterns
- Feature adoption metrics

## Development Guidelines

### Adding a New Feature

1. **Define Models** (`src/models/`)
2. **Create Service** (`src/services/`)
3. **Add Store** (`src/store/`)
4. **Build UI** (`src/screens/`, `src/components/`)
5. **Write Tests** (`tests/`)
6. **Update Documentation**

### Code Organization

- One component per file
- Group related files in folders
- Export from index.ts files
- Keep files under 300 lines

### Naming Conventions

- PascalCase: Components, Types, Interfaces
- camelCase: Variables, functions
- UPPER_SNAKE_CASE: Constants
- kebab-case: File names (optional)

## Troubleshooting

### Common Issues

**"Cannot read property of undefined"**
- Check if store data is loaded before accessing
- Add loading states

**"Database locked"**
- Ensure single database connection
- Use transactions for batch operations

**"IAP not working"**
- Check platform-specific setup
- Verify product IDs
- Test on real device

## Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [SQLite Docs](https://www.sqlite.org/docs.html)

## Contact

For architecture questions or suggestions:
- Email: dev@sleepsync.app
- GitHub: [SleepSync Issues](https://github.com/yourusername/sleepsync/issues)

