/**
 * Permissions Screen
 * Requests all necessary permissions for sleep tracking
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { permissionService, AllPermissionsStatus } from '../../services/permissionService';
import { healthSyncService } from '../../integrations/health/HealthSyncService';

interface PermissionsProps {
  onNext: () => void;
  onBack: () => void;
}

export const Permissions: React.FC<PermissionsProps> = ({ onNext, onBack }) => {
  const [permissions, setPermissions] = useState<AllPermissionsStatus | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isGoogleFitInstalled, setIsGoogleFitInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions();
    checkGoogleFitInstallation();
  }, []);

  const checkPermissions = async () => {
    const status = await permissionService.checkAllPermissions();
    setPermissions(status);
  };

  const checkGoogleFitInstallation = async () => {
    if (Platform.OS === 'android') {
      try {
        const installed = await healthSyncService.isGoogleFitInstalled();
        setIsGoogleFitInstalled(installed);
      } catch (error) {
        console.error('Failed to check Google Fit installation:', error);
        setIsGoogleFitInstalled(false);
      }
    } else {
      setIsGoogleFitInstalled(true); // iOS doesn't need Google Fit
    }
  };

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    try {
      // For Android, check Google Fit installation first
      if (Platform.OS === 'android') {
        const installed = await healthSyncService.isGoogleFitInstalled();
        if (!installed) {
          Alert.alert(
            'Google Fit Required',
            'Google Fit app is not installed. Would you like to install it from the Play Store?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Install',
                onPress: async () => {
                  try {
                    const { googleFitManager } = require('../../integrations/health/GoogleFitManager');
                    await googleFitManager.openPlayStore();
                    // Recheck after user returns
                    setTimeout(() => {
                      checkGoogleFitInstallation();
                      checkPermissions();
                    }, 2000);
                  } catch (error) {
                    console.error('Failed to open Play Store:', error);
                    Alert.alert('Error', 'Failed to open Play Store. Please install Google Fit manually.');
                  }
                },
              },
            ]
          );
          setIsRequesting(false);
          return;
        }
      }

      const results = await permissionService.requestAllPermissions();
      setPermissions(results);
      
      // Recheck Google Fit installation status
      await checkGoogleFitInstallation();
    } catch (error) {
      console.error('Failed to request permissions:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleInstallGoogleFit = async () => {
    try {
      const { googleFitManager } = require('../../integrations/health/GoogleFitManager');
      await googleFitManager.openPlayStore();
      // Recheck after user returns
      setTimeout(() => {
        checkGoogleFitInstallation();
        checkPermissions();
      }, 2000);
    } catch (error) {
      console.error('Failed to open Play Store:', error);
      Alert.alert('Error', 'Failed to open Play Store. Please install Google Fit manually.');
    }
  };

  const getPermissionStatus = (status: { granted: boolean; denied: boolean; blocked: boolean }) => {
    if (status.granted) return '✅ Granted';
    if (status.blocked) return '❌ Blocked (Enable in Settings)';
    if (status.denied) return '⚠️ Denied';
    return '⏳ Not Requested';
  };

  const allCriticalGranted = permissions
    ? permissions.microphone.granted &&
      permissions.sensors.granted &&
      permissions.notifications.granted
    : false;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.emoji}>🔐</Text>
            <Text style={styles.title}>Permissions</Text>
            <Text style={styles.subtitle}>
              SleepSync needs a few permissions to track your sleep accurately
            </Text>

            <Card style={styles.permissionsCard}>
              <Text style={styles.sectionTitle}>Required Permissions</Text>

              <View style={styles.permissionItem}>
                <Text style={styles.permissionName}>🎤 Microphone</Text>
                <Text style={styles.permissionDesc}>
                  Detect snoring and sleep disturbances
                </Text>
                <Text style={styles.permissionStatus}>
                  {permissions ? getPermissionStatus(permissions.microphone) : 'Checking...'}
                </Text>
              </View>

              <View style={styles.permissionItem}>
                <Text style={styles.permissionName}>📱 Motion Sensors</Text>
                <Text style={styles.permissionDesc}>
                  Track sleep stages and movement patterns
                </Text>
                <Text style={styles.permissionStatus}>
                  {permissions ? getPermissionStatus(permissions.sensors) : 'Checking...'}
                </Text>
              </View>

              <View style={styles.permissionItem}>
                <Text style={styles.permissionName}>🔔 Notifications</Text>
                <Text style={styles.permissionDesc}>
                  Sleep insights and smart alarm reminders
                </Text>
                <Text style={styles.permissionStatus}>
                  {permissions ? getPermissionStatus(permissions.notifications) : 'Checking...'}
                </Text>
              </View>

              <View style={styles.permissionItem}>
                <Text style={styles.permissionName}>❤️ Health Data</Text>
                <Text style={styles.permissionDesc}>
                  {Platform.OS === 'android' 
                    ? 'Sync with Google Fit to track your sleep data'
                    : 'Sync with Apple Health to track your sleep data'}
                </Text>
                <Text style={styles.permissionStatus}>
                  {permissions ? getPermissionStatus(permissions.health) : 'Checking...'}
                </Text>
                {Platform.OS === 'android' && isGoogleFitInstalled === false && (
                  <Button
                    title="Install Google Fit"
                    onPress={handleInstallGoogleFit}
                    size="small"
                    variant="outline"
                    style={styles.permissionButton}
                  />
                )}
                {Platform.OS === 'android' && 
                 permissions && 
                 !permissions.health.granted && 
                 !permissions.health.blocked && 
                 isGoogleFitInstalled === true && (
                  <Button
                    title="Connect Google Fit"
                    onPress={async () => {
                      setIsRequesting(true);
                      try {
                        const result = await healthSyncService.requestPermissionsWithCheck();
                        if (result.needsInstallation) {
                          Alert.alert('Google Fit Required', result.message);
                        }
                        await checkPermissions();
                      } catch (error) {
                        console.error('Failed to connect Google Fit:', error);
                      } finally {
                        setIsRequesting(false);
                      }
                    }}
                    size="small"
                    variant="outline"
                    style={styles.permissionButton}
                    disabled={isRequesting}
                  />
                )}
              </View>

              <View style={styles.permissionItem}>
                <Text style={styles.permissionName}>🔋 Battery Optimization</Text>
                <Text style={styles.permissionDesc}>
                  Allow background tracking during sleep
                </Text>
                <Text style={styles.permissionStatus}>
                  {permissions ? getPermissionStatus(permissions.batteryOptimization) : 'Checking...'}
                </Text>
                {permissions && !permissions.batteryOptimization.granted && (
                  <Button
                    title="Enable Battery Optimization Exemption"
                    onPress={async () => {
                      const result = await permissionService.requestBatteryOptimization();
                      await checkPermissions();
                    }}
                    size="small"
                    variant="outline"
                    style={styles.permissionButton}
                  />
                )}
              </View>
            </Card>

            <Text style={styles.infoText}>
              💡 You can change these permissions anytime in your device settings
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isRequesting ? 'Requesting...' : 'Grant Permissions'}
            onPress={handleRequestPermissions}
            size="large"
            fullWidth
            disabled={isRequesting}
            loading={isRequesting}
          />
          <Button
            title="Continue"
            onPress={onNext}
            variant={allCriticalGranted ? 'primary' : 'ghost'}
            size="medium"
            fullWidth
            disabled={isRequesting}
          />
          <Button
            title="Back"
            onPress={onBack}
            variant="ghost"
            size="small"
            fullWidth
            disabled={isRequesting}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  emoji: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionsCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  permissionItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  permissionName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  permissionDesc: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  permissionStatus: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  permissionButton: {
    marginTop: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});

