/**
 * In-App Purchase Product Configuration
 * Replace these IDs with your actual App Store and Google Play product IDs
 */

export const IAP_CONFIG = {
  // iOS Product IDs (configured in App Store Connect)
  ios: {
    monthly: 'com.sleepsync.premium.monthly.ios',
    // Add annual or other tiers here if needed
    // annual: 'com.sleepsync.premium.annual.ios',
  },

  // Android Product IDs (configured in Google Play Console)
  android: {
    monthly: 'com.sleepsync.premium.monthly.android',
    // annual: 'com.sleepsync.premium.annual.android',
  },

  // Shared Secret for iOS receipt validation (stored securely)
  // In production, this should be fetched from your server
  sharedSecret: process.env.IOS_SHARED_SECRET || '',

  // Mock mode for development/testing
  // Set to false in production builds
  useMockPurchases: __DEV__,
};

export const SUBSCRIPTION_FEATURES = {
  free: [
    'Basic sleep tracking',
    'Limited soundscapes (3 types)',
    'Basic sleep insights',
    'Standard alarm',
  ],
  premium: [
    'Advanced sleep tracking with stages',
    'Unlimited custom soundscapes',
    'AI-powered sleep optimization',
    'Smart alarm with light sleep detection',
    'Detailed sleep debt analysis',
    'Temperature recommendations',
    'Export sleep data',
    'Priority support',
  ],
};

export const PRICING = {
  monthly: {
    price: '$4.99',
    displayPrice: '4.99',
    currency: 'USD',
    period: 'month',
  },
};

