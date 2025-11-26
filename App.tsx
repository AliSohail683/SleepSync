/**
 * SleepSync - Main App Entry Point
 * AI-driven sleep optimization with native subscriptions
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { LoadingSpinner } from './src/components';
import { useInitializeApp } from './src/hooks/useInitializeApp';
import { useUserStore } from './src/store/userStore';

// Screens
import { OnboardingFlow } from './src/screens/Onboarding/OnboardingFlow';
import { HomeDashboard } from './src/screens/HomeDashboard';
import { SleepSessionScreen } from './src/screens/SleepSessionScreen';
import { SubscriptionPaywall } from './src/screens/SubscriptionPaywall';

const Stack = createNativeStackNavigator();

export default function App() {
  const { isReady } = useInitializeApp();
  const { isOnboardingComplete } = useUserStore();

  if (!isReady) {
    return <LoadingSpinner text="Initializing SleepSync..." />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0E27' },
            animation: 'fade',
          }}
        >
          {!isOnboardingComplete ? (
            <Stack.Screen name="Onboarding" component={OnboardingFlowScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeDashboardScreen} />
              <Stack.Screen name="SleepSession" component={SleepSessionScreenWrapper} />
              <Stack.Screen name="Subscription" component={SubscriptionPaywall} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

// Screen Wrappers with navigation props
const OnboardingFlowScreen = ({ navigation }: any) => (
  <OnboardingFlow onComplete={() => navigation.replace('Home')} />
);

const HomeDashboardScreen = ({ navigation }: any) => (
  <HomeDashboard
    onStartSession={() => navigation.navigate('SleepSession')}
    onViewInsights={() => {/* Navigate to insights */}}
    onOpenSettings={() => {/* Navigate to settings */}}
  />
);

const SleepSessionScreenWrapper = ({ navigation }: any) => (
  <SleepSessionScreen
    onComplete={() => navigation.goBack()}
    onCancel={() => navigation.goBack()}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

