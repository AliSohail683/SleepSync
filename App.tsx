/**
 * SleepSync - Main App Entry Point
 * AI-driven sleep optimization with native subscriptions
 */

import React, { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, AppState, DeviceEventEmitter, View, Text } from 'react-native';
import { alarmService } from './src/services/alarmService';
import { useUserStore } from './src/store/userStore';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LoadingSpinner } from './src/components';
import { useInitializeApp } from './src/hooks/useInitializeApp';

// Screens
import { OnboardingFlow } from './src/screens/Onboarding/OnboardingFlow';
import { HomeDashboard } from './src/screens/HomeDashboard';
import { SleepSessionScreen } from './src/screens/SleepSessionScreen';
import { SubscriptionPaywall } from './src/screens/SubscriptionPaywall';
import { ProtocolScreen } from './src/screens/dashboard/ProtocolScreen';
import { HistoryScreen } from './src/screens/dashboard/HistoryScreen';
import { ManualSleepLogScreen } from './src/screens/dashboard/ManualSleepLogScreen';
import { AlarmSettingsScreen } from './src/screens/settings/AlarmSettingsScreen';
import { AlarmScreen } from './src/screens/AlarmScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  // Temporarily bypass initialization to test
  // const { isReady } = useInitializeApp();
  const isReady = true; // Force ready to bypass initialization
  
  const { isOnboardingComplete } = useUserStore();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { profile } = useUserStore();

  // Temporarily disabled to debug crash
  // Handle alarm events from notification
  // useEffect(() => {
  //   const subscription = DeviceEventEmitter.addListener('alarmTriggered', (alarmId: string) => {
  //     console.log('🔔 Alarm triggered event received in App.tsx:', alarmId);
  //     if (navigationRef.current?.isReady()) {
  //       navigationRef.current.navigate('Alarm', { alarmId });
  //     }
  //   });

  //   return () => {
  //     subscription.remove();
  //   };
  // }, []);

  // // Check for missed alarms when app comes to foreground
  // useEffect(() => {
  //   const subscription = AppState.addEventListener('change', (nextAppState) => {
  //     if (nextAppState === 'active' && profile) {
  //       console.log('📱 App came to foreground, checking for missed alarms...');
  //       alarmService.checkAndFireMissedAlarms(profile.id).catch((error) => {
  //         console.error('❌ Error checking missed alarms:', error);
  //       });
  //     }
  //   });

  //   // Also check immediately when app starts
  //   if (profile) {
  //     alarmService.checkAndFireMissedAlarms(profile.id).catch((error) => {
  //       console.error('❌ Error checking missed alarms on startup:', error);
  //     });
  //   }

  //   return () => {
  //     subscription.remove();
  //   };
  // }, [profile]);

  // // Start foreground alarm checker when app is active
  // useEffect(() => {
  //   if (!profile) return;
    
  //   let cleanup: (() => void) | null = null;
    
  //   const subscription = AppState.addEventListener('change', (nextAppState) => {
  //     if (nextAppState === 'active') {
  //       console.log('📱 App is active, starting foreground alarm checker...');
  //       cleanup = alarmService.startForegroundChecker(profile.id);
  //     } else {
  //       console.log('📱 App went to background, stopping foreground alarm checker...');
  //       if (cleanup) {
  //         cleanup();
  //         cleanup = null;
  //       }
  //     }
  //   });
    
  //   // Start immediately if app is already active
  //   if (AppState.currentState === 'active') {
  //     cleanup = alarmService.startForegroundChecker(profile.id);
  //   }
    
  //   return () => {
  //     subscription.remove();
  //     if (cleanup) {
  //       cleanup();
  //     }
  //   };
  // }, [profile]);

  if (!isReady) {
    return <LoadingSpinner text="Initializing SleepSync..." />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      <View style={{ flex: 1, backgroundColor: '#0A0E27', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 20 }}>No Navigation - Testing</Text>
      </View>
    </GestureHandlerRootView>
  );
}

// Screen Wrappers with navigation props
const OnboardingFlowScreen = ({ navigation }: any) => (
  <OnboardingFlow 
    onComplete={() => {
      // Navigation will be handled by NavigationContainer remount
      // when isOnboardingComplete changes to true
    }} 
  />
);

const HomeDashboardScreen = ({ navigation }: any) => (
  <HomeDashboard
    onStartSession={() => navigation.navigate('SleepSession')}
    onViewInsights={() => {
      // Placeholder for future insights screen
    }}
    onOpenSettings={(alarmId?: string) => {
      navigation.navigate('AlarmSettings', { alarmId });
    }}
    onOpenProtocol={() => navigation.navigate('Protocol')}
    onOpenHistory={() => navigation.navigate('History')}
  />
);

const SleepSessionScreenWrapper = ({ navigation }: any) => (
  <SleepSessionScreen
    onComplete={() => navigation.goBack()}
    onCancel={() => navigation.goBack()}
  />
);

const ProtocolScreenWrapper = ({ navigation }: any) => (
  <ProtocolScreen
    onClose={() => navigation.goBack()}
  />
);

const HistoryScreenWrapper = ({ navigation }: any) => (
  <HistoryScreen
    onClose={() => navigation.goBack()}
    onAddSleep={() => navigation.navigate('ManualSleepLog')}
  />
);

const ManualSleepLogScreenWrapper = ({ navigation }: any) => (
  <ManualSleepLogScreen
    onClose={() => navigation.goBack()}
    onSave={() => {
      navigation.goBack();
      // Refresh history if needed
    }}
  />
);

const AlarmSettingsScreenWrapper = ({ navigation, route }: any) => (
  <AlarmSettingsScreen
    alarmId={route.params?.alarmId}
    onClose={() => navigation.goBack()}
  />
);

const AlarmScreenWrapper = ({ navigation, route }: any) => {
  const alarmId = route.params?.alarmId;
  
  return (
    <AlarmScreen
      alarmId={alarmId}
      onDismiss={() => navigation.navigate('Home')}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

