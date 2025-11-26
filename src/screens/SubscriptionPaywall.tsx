/**
 * Subscription Paywall Screen
 * Premium features and subscription purchase
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground, Button, Card, LoadingSpinner } from '@/components';
import { colors, typography, spacing } from '@/config/theme';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { SUBSCRIPTION_FEATURES, PRICING } from '@/config/products';

interface SubscriptionPaywallProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  onClose,
  onSuccess,
}) => {
  const { products, isLoading, isPurchasing, loadProducts, purchase, restorePurchases } = useSubscriptionStore();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0].productId);
    }
  }, [products]);

  const handlePurchase = async () => {
    if (!selectedProduct) return;

    try {
      await purchase(selectedProduct);
      Alert.alert(
        '🎉 Success!',
        'Welcome to SleepSync Premium!',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error: any) {
      if (error.message.includes('cancelled')) {
        Alert.alert('Purchase Cancelled', 'You can upgrade to Premium anytime.');
      } else {
        Alert.alert('Purchase Failed', error.message || 'Please try again.');
      }
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert(
        'Purchases Restored',
        'Your subscription has been restored successfully!',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      Alert.alert('Restore Failed', 'No previous purchases found.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading subscription options..." />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>⭐</Text>
            <Text style={styles.title}>Unlock Premium</Text>
            <Text style={styles.subtitle}>
              Get the most out of your sleep with all premium features
            </Text>
          </View>

          {/* Premium Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            {SUBSCRIPTION_FEATURES.premium.map((feature, index) => (
              <FeatureItem key={index} text={feature} />
            ))}
          </View>

          {/* Pricing Card */}
          <Card gradient style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Monthly Subscription</Text>
              <Text style={styles.pricingPrice}>{PRICING.monthly.price}/month</Text>
            </View>
            <Text style={styles.pricingDescription}>
              • Cancel anytime{'\n'}
              • 7-day free trial{'\n'}
              • Premium support
            </Text>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={isPurchasing ? "Processing..." : "Start Free Trial"}
              onPress={handlePurchase}
              size="large"
              fullWidth
              loading={isPurchasing}
              disabled={!selectedProduct}
            />
            
            <Button
              title="Restore Purchases"
              onPress={handleRestore}
              variant="ghost"
              size="medium"
              fullWidth
            />

            {onClose && (
              <Button
                title="Maybe Later"
                onPress={onClose}
                variant="ghost"
                size="small"
                fullWidth
              />
            )}
          </View>

          {/* Legal */}
          <Text style={styles.legal}>
            Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            Payment will be charged to your App Store or Google Play account.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

interface FeatureItemProps {
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>✓</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.relaxed * typography.sizes.base,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.overlay.light,
    padding: spacing.md,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 20,
    color: colors.success,
    marginRight: spacing.md,
    fontWeight: typography.weights.bold,
  },
  featureText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  pricingCard: {
    marginBottom: spacing.xl,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pricingTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  pricingPrice: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.primary.light,
  },
  pricingDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.sm,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  legal: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.normal * typography.sizes.xs,
  },
});

