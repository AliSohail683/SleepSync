# SleepSync

> AI-driven sleep optimization app with personalized soundscapes, smart alarms, sleep debt tracking, and native auto-renewable subscriptions (iOS & Android).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-blue)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020)](https://expo.dev/)

## 🌟 Features

- **Smart Sleep Tracking**: Monitor sleep stages, quality, and patterns with AI-powered analysis
- **Personalized Soundscapes**: Custom AI-generated audio for deeper, restful sleep
- **Smart Alarms**: Wake up during light sleep phases for better mornings
- **Sleep Debt Analysis**: Track and manage your cumulative sleep debt
- **Temperature Recommendations**: Get personalized room temperature suggestions
- **Native Subscriptions**: Auto-renewable monthly subscriptions via App Store & Google Play
- **Offline-First**: Works without internet connection, data synced locally

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Xcode (for iOS builds) or Android Studio (for Android builds)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Development Mode

By default, the app runs in **mock IAP mode** for testing subscriptions without real purchases.

To switch between mock and real IAP:

1. Edit `src/config/products.ts`
2. Set `useMockPurchases: false` for production builds
3. Configure your product IDs (see below)

## 📱 App Structure

```
/sleepsync
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # App screens
│   ├── services/         # Business logic services
│   ├── store/            # Zustand state management
│   ├── models/           # TypeScript interfaces
│   ├── utils/            # Helper functions
│   ├── config/           # Configuration files
│   ├── mocks/            # Mock implementations
│   └── hooks/            # Custom React hooks
├── docs/                 # Documentation
├── tests/                # Test files
├── assets/               # Images, sounds, icons
├── App.tsx               # Main app entry point
└── package.json          # Dependencies
```

## 🔧 Configuration

### In-App Purchase Setup

#### iOS (App Store)

1. Create subscription products in [App Store Connect](https://appstoreconnect.apple.com/)
2. Copy your product IDs
3. Update `src/config/products.ts`:

```typescript
ios: {
  monthly: 'com.sleepsync.premium.monthly.ios', // Your product ID
}
```

4. Add IAP capability in `app.json`:
   - Ensure bundle ID matches App Store Connect
   - Add In-App Purchase capability

#### Android (Google Play)

1. Create subscription products in [Google Play Console](https://play.google.com/console/)
2. Copy your product IDs
3. Update `src/config/products.ts`:

```typescript
android: {
  monthly: 'com.sleepsync.premium.monthly.android', // Your product ID
}
```

### Environment Variables

Create a `.env` file (not included in repo):

```env
IOS_SHARED_SECRET=your_ios_shared_secret
ANDROID_SERVICE_ACCOUNT_KEY=path/to/key.json
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Subscriptions

#### Sandbox Testing (iOS)

1. Create sandbox test accounts in App Store Connect
2. Sign out of your Apple ID on device
3. Use sandbox account when prompted during purchase
4. Test subscription flows

See `docs/APPSTORE_TESTING.md` for detailed instructions.

#### Test Purchases (Android)

1. Add test accounts in Google Play Console
2. Create a closed testing track
3. Add test users
4. Install app via testing track

See `docs/PLAYSTORE_TESTING.md` for detailed instructions.

#### Mock IAP (Development)

The app includes a complete mock IAP system:

```typescript
// Simulate successful purchase
import mockIAP from '@/mocks/iapMock';
mockIAP.simulateSuccessfulPurchase('product_id');
```

## 📦 Building for Production

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Builds

```bash
# iOS (requires macOS)
npm run build:ios

# Android
npm run build:android
```

## 📊 App Architecture

SleepSync uses a clean, scalable architecture:

- **Services Layer**: Business logic (sleep tracking, audio, alarms, subscriptions)
- **State Management**: Zustand for global state
- **Local Storage**: expo-sqlite for persistence
- **UI Components**: Reusable, accessible components with consistent design
- **Navigation**: React Navigation with type-safe routing

For detailed architecture documentation, see `docs/ARCHITECTURE.md`.

## 🎨 Design System

SleepSync features a peaceful, minimalistic design:

- **Color Palette**: Deep blues and purples for tranquility
- **Typography**: Clear, readable fonts
- **Animations**: Smooth, calming transitions
- **Accessibility**: WCAG 2.1 AA compliant

See `src/config/theme.ts` for the complete design system.

## 🧠 Sleep Algorithms

### Sleep Score Calculation

```typescript
Base Score = (actual_hours / goal_hours) * 100
+ Bonuses: Quick sleep onset (+3), good stage distribution (+10)
- Penalties: Wake events (-5 each), high caffeine (-10)
Normalized to 0-100
```

### Smart Alarm

Wakes you during light sleep within your target window using predicted sleep stage transitions.

### Sleep Debt

```typescript
daily_debt = max(0, ideal_hours - actual_hours)
cumulative_debt = sum(daily_debt over period)
```

See `docs/ALGORITHMS.md` for complete algorithm documentation.

## 🔐 Privacy & Security

- All sleep data stored locally on device
- No data sent to servers (unless user enables sync)
- Subscription receipts validated securely
- GDPR & CCPA compliant

Privacy policy: `https://sleepsync.app/privacy`

## 🐛 Troubleshooting

### Common Issues

**"Database not initialized"**
- Solution: Ensure `storageService.setupDB()` is called on app start

**"IAP not available"**
- Solution: Check platform-specific setup, ensure running on real device (not simulator for production IAP)

**"Notifications not working"**
- Solution: Check permissions in Settings, ensure notification capability is enabled

See `docs/TROUBLESHOOTING.md` for more solutions.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please read `CONTRIBUTING.md` first.

## 📞 Support

- Email: support@sleepsync.app
- Issues: [GitHub Issues](https://github.com/yourusername/sleepsync/issues)
- Docs: [Documentation](./docs/)

## 🗺️ Roadmap

- [ ] Apple Health / Google Fit integration
- [ ] Social features (sleep challenges)
- [ ] Advanced AI insights
- [ ] Wearable device support
- [ ] Sleep meditation library
- [ ] Multi-device sync

## ✨ Credits

Built with ❤️ using React Native, Expo, and TypeScript.

Special thanks to the open-source community for amazing libraries and tools.

---

**Happy sleeping! 🌙✨**

