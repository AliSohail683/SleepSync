# Receipt Validation Guide

This document explains how to implement server-side receipt validation for iOS and Android subscriptions.

## Overview

**⚠️ IMPORTANT**: The SleepSync app currently uses LOCAL receipt validation (a stub). For production, you MUST implement server-side validation to prevent fraud.

## Why Server-Side Validation?

- **Security**: Client-side validation can be bypassed
- **Fraud Prevention**: Validate with Apple/Google servers
- **Subscription Management**: Track cancellations, renewals, refunds
- **Analytics**: Monitor subscription metrics

## Architecture

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Mobile App │───────>│  Your Server │───────>│ Apple/Google │
│              │ receipt│              │validate│   Servers    │
│              │<───────│              │<───────│              │
└──────────────┘  valid?└──────────────┘ status └──────────────┘
```

## iOS Receipt Validation

### App-Side Implementation

Current code in `src/services/subscriptionService.ts`:

```typescript
async verifyReceipt(receipt: string): Promise<{ valid: boolean; expiryDate: string | null }> {
  // PRODUCTION: Send to your backend
  const response = await fetch('https://your-api.com/verify-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receipt,
      platform: 'ios',
    }),
  });

  const data = await response.json();
  return {
    valid: data.valid,
    expiryDate: data.expiryDate,
  };
}
```

### Server-Side Implementation (Node.js Example)

```javascript
// backend/routes/iap.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

router.post('/verify-receipt', async (req, res) => {
  const { receipt, platform } = req.body;

  if (platform !== 'ios') {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  try {
    // Try production first
    let result = await validateWithApple(receipt, APPLE_PRODUCTION_URL);

    // If sandbox receipt, try sandbox
    if (result.status === 21007) {
      result = await validateWithApple(receipt, APPLE_SANDBOX_URL);
    }

    if (result.status === 0) {
      // Success - extract subscription info
      const latestReceipt = result.latest_receipt_info[0];
      const expiryDate = new Date(parseInt(latestReceipt.expires_date_ms));
      const isActive = expiryDate > new Date();

      res.json({
        valid: true,
        isActive,
        expiryDate: expiryDate.toISOString(),
        productId: latestReceipt.product_id,
        originalPurchaseDate: latestReceipt.original_purchase_date_ms,
        autoRenewing: result.pending_renewal_info[0]?.auto_renew_status === '1',
      });
    } else {
      res.status(400).json({
        valid: false,
        error: `Apple returned status ${result.status}`,
      });
    }
  } catch (error) {
    console.error('Receipt validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

async function validateWithApple(receipt, url) {
  const response = await axios.post(url, {
    'receipt-data': receipt,
    'password': process.env.APPLE_SHARED_SECRET, // From App Store Connect
    'exclude-old-transactions': true,
  });

  return response.data;
}

module.exports = router;
```

### iOS Receipt Format

Apple returns a complex JSON structure:

```json
{
  "status": 0,
  "latest_receipt_info": [
    {
      "product_id": "com.sleepsync.premium.monthly.ios",
      "original_transaction_id": "1000000012345678",
      "expires_date_ms": "1640995200000",
      "auto_renew_status": "1"
    }
  ],
  "pending_renewal_info": [
    {
      "auto_renew_status": "1",
      "product_id": "com.sleepsync.premium.monthly.ios"
    }
  ]
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 0 | Valid receipt |
| 21000 | Malformed request |
| 21002 | Receipt data is malformed |
| 21003 | Receipt not authenticated |
| 21005 | Server unavailable |
| 21007 | Receipt is sandbox (use sandbox URL) |
| 21008 | Receipt is production (use production URL) |

## Android Receipt Validation

### App-Side Implementation

Same as iOS, send receipt to your server.

### Server-Side Implementation (Node.js Example)

```javascript
// backend/routes/android-iap.js
const { google } = require('googleapis');

const androidpublisher = google.androidpublisher('v3');

router.post('/verify-receipt-android', async (req, res) => {
  const { purchaseToken, productId, packageName } = req.body;

  try {
    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();

    // Verify subscription
    const result = await androidpublisher.purchases.subscriptions.get({
      auth: authClient,
      packageName: packageName || 'com.sleepsync.app',
      subscriptionId: productId,
      token: purchaseToken,
    });

    const subscription = result.data;
    const expiryDate = new Date(parseInt(subscription.expiryTimeMillis));
    const isActive = expiryDate > new Date() && subscription.paymentState === 1;

    res.json({
      valid: true,
      isActive,
      expiryDate: expiryDate.toISOString(),
      productId: subscription.productId,
      autoRenewing: subscription.autoRenewing,
      cancelReason: subscription.cancelReason,
    });
  } catch (error) {
    console.error('Android receipt validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});
```

### Google Play Response Format

```json
{
  "kind": "androidpublisher#subscriptionPurchase",
  "startTimeMillis": "1640908800000",
  "expiryTimeMillis": "1643587200000",
  "autoRenewing": true,
  "priceCurrencyCode": "USD",
  "priceAmountMicros": "4990000",
  "paymentState": 1,
  "cancelReason": 0
}
```

### Payment States

| State | Meaning |
|-------|---------|
| 0 | Payment pending |
| 1 | Payment received |
| 2 | Free trial |
| 3 | Pending deferred upgrade/downgrade |

### Cancel Reasons

| Reason | Meaning |
|--------|---------|
| 0 | User cancelled |
| 1 | System cancelled |
| 2 | Replaced with new subscription |
| 3 | Developer cancelled |

## Security Best Practices

### 1. Never Trust Client-Side Validation

```typescript
// ❌ BAD
if (user.isPremium) {
  showPremiumFeature();
}

// ✅ GOOD
if (await serverValidatedSubscription()) {
  showPremiumFeature();
}
```

### 2. Store Shared Secrets Securely

```bash
# .env file (never commit!)
APPLE_SHARED_SECRET=abc123...
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/key.json
```

### 3. Validate on Every Request

```typescript
// Middleware example
app.use(async (req, res, next) => {
  if (req.path.startsWith('/premium/')) {
    const hasValidSub = await validateSubscription(req.user);
    if (!hasValidSub) {
      return res.status(403).json({ error: 'Premium subscription required' });
    }
  }
  next();
});
```

### 4. Handle Edge Cases

- **Grace Period**: Subscription expired but in grace period
- **Billing Retry**: Payment failed, retrying
- **Refunds**: User got refunded, revoke access
- **Cancellations**: Subscription cancelled but still active until expiry

## Webhook Notifications

### iOS Server-to-Server Notifications

Apple can send real-time updates:

```javascript
router.post('/apple-webhook', async (req, res) => {
  const notification = req.body;

  switch (notification.notification_type) {
    case 'DID_RENEW':
      // Subscription renewed
      await extendSubscription(notification.unified_receipt);
      break;
    
    case 'CANCEL':
      // User cancelled
      await cancelSubscription(notification.unified_receipt);
      break;
    
    case 'DID_FAIL_TO_RENEW':
      // Payment failed
      await handlePaymentFailure(notification.unified_receipt);
      break;
  }

  res.sendStatus(200);
});
```

### Android Real-Time Developer Notifications

Google Play also sends webhooks via Pub/Sub:

```javascript
router.post('/google-webhook', async (req, res) => {
  const message = JSON.parse(
    Buffer.from(req.body.message.data, 'base64').toString()
  );

  const notification = message.subscriptionNotification;

  switch (notification.notificationType) {
    case 2: // SUBSCRIPTION_RECOVERED
      await extendSubscription(notification.purchaseToken);
      break;
    
    case 3: // SUBSCRIPTION_RENEWED
      await extendSubscription(notification.purchaseToken);
      break;
    
    case 4: // SUBSCRIPTION_CANCELED
      await cancelSubscription(notification.purchaseToken);
      break;
  }

  res.sendStatus(200);
});
```

## Database Schema (Server-Side)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  platform VARCHAR(10) NOT NULL, -- 'ios' or 'android'
  product_id VARCHAR(255) NOT NULL,
  transaction_id VARCHAR(255) UNIQUE,
  purchase_token TEXT,
  status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'cancelled'
  start_date TIMESTAMP NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  auto_renewing BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expiry_date);
```

## Testing

### iOS Sandbox Testing

1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Run app and make purchase
4. Use sandbox account when prompted
5. Purchase will succeed instantly

### Android Testing

1. Create internal testing track
2. Add test Gmail accounts
3. Upload APK to internal track
4. Install from Play Store
5. Test purchases with test accounts

## Monitoring & Analytics

Track key metrics:

- **Active Subscriptions**: Current count
- **Churn Rate**: Cancellations / Total subscriptions
- **MRR**: Monthly Recurring Revenue
- **Trial Conversions**: Free trial → Paid
- **Failed Payments**: Billing issues

## Error Handling

```typescript
try {
  const result = await verifyReceipt(receipt);
  if (result.valid) {
    // Success
  }
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Retry with exponential backoff
  } else if (error.code === 'INVALID_RECEIPT') {
    // Log fraud attempt
  }
}
```

## Resources

### Official Documentation

- [Apple StoreKit](https://developer.apple.com/documentation/storekit)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [Google Play Developer API](https://developers.google.com/android-publisher)

### Libraries

- iOS: `expo-in-app-purchases`, `react-native-iap`
- Server: `googleapis` (Node.js), `google-auth-library`

## Checklist

Before going to production:

- [ ] Implement server-side receipt validation
- [ ] Store shared secrets securely
- [ ] Set up webhook endpoints
- [ ] Create database schema
- [ ] Add monitoring/analytics
- [ ] Test with sandbox accounts
- [ ] Handle edge cases (refunds, cancellations)
- [ ] Document API endpoints
- [ ] Set up error logging
- [ ] Plan for scaling

## Support

For implementation help:
- Email: dev@sleepsync.app
- Slack: #iap-support

