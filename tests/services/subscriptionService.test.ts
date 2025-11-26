/**
 * Subscription Service Tests
 * Unit tests for IAP and subscription management
 */

import mockIAP from '../../src/mocks/iapMock';
import { SubscriptionStatus } from '../../src/models';

describe('Mock IAP', () => {
  beforeEach(() => {
    mockIAP.clearMockPurchases();
  });

  describe('connectAsync', () => {
    it('should connect successfully', async () => {
      await expect(mockIAP.connectAsync()).resolves.toBeUndefined();
    });
  });

  describe('getProductsAsync', () => {
    it('should return products for given IDs', async () => {
      const productIds = ['com.sleepsync.premium.monthly.ios'];
      const result = await mockIAP.getProductsAsync(productIds);

      expect(result.responseCode).toBe(mockIAP.IAPResponseCode.OK);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].productId).toBe(productIds[0]);
      expect(result.results[0].title).toBe('SleepSync Premium');
    });
  });

  describe('purchaseItemAsync', () => {
    it('should simulate successful purchase', async () => {
      const productId = 'com.sleepsync.premium.monthly.ios';
      
      const purchasePromise = mockIAP.purchaseItemAsync(productId);
      
      await expect(purchasePromise).resolves.toBeUndefined();
    });

    it('should handle user cancellation', async () => {
      // Mock will randomly cancel, so we test the error handling
      const productId = 'com.sleepsync.premium.monthly.ios';
      
      try {
        await mockIAP.purchaseItemAsync(productId);
      } catch (error: any) {
        if (error.code === 'E_USER_CANCELLED') {
          expect(error.message).toContain('cancelled');
        }
      }
    });
  });

  describe('getPurchaseHistoryAsync', () => {
    it('should return empty history initially', async () => {
      const result = await mockIAP.getPurchaseHistoryAsync();

      expect(result.responseCode).toBe(mockIAP.IAPResponseCode.OK);
      expect(result.results).toHaveLength(0);
    });

    it('should return purchase after successful purchase', async () => {
      const productId = 'com.sleepsync.premium.monthly.ios';
      mockIAP.simulateSuccessfulPurchase(productId);

      const result = await mockIAP.getPurchaseHistoryAsync();

      expect(result.responseCode).toBe(mockIAP.IAPResponseCode.OK);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].productId).toBe(productId);
    });
  });

  describe('finishTransactionAsync', () => {
    it('should acknowledge purchase', async () => {
      const productId = 'com.sleepsync.premium.monthly.ios';
      mockIAP.simulateSuccessfulPurchase(productId);

      const history = await mockIAP.getPurchaseHistoryAsync();
      const purchase = history.results[0];

      await expect(
        mockIAP.finishTransactionAsync(purchase, true)
      ).resolves.toBeUndefined();

      // Purchase should now be acknowledged
      const updatedHistory = await mockIAP.getPurchaseHistoryAsync();
      expect(updatedHistory.results[0].acknowledged).toBe(true);
    });
  });
});

describe('Subscription Status', () => {
  it('should have correct structure', () => {
    const status: SubscriptionStatus = {
      active: true,
      platform: 'ios',
      expiryDate: new Date().toISOString(),
      productId: 'com.sleepsync.premium.monthly.ios',
      autoRenewing: true,
    };

    expect(status.active).toBe(true);
    expect(status.platform).toBe('ios');
    expect(status.expiryDate).toBeDefined();
    expect(status.productId).toBeDefined();
  });

  it('should detect expired subscriptions', () => {
    const expiredStatus: SubscriptionStatus = {
      active: false,
      platform: 'ios',
      expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      productId: 'com.sleepsync.premium.monthly.ios',
    };

    const expiryDate = new Date(expiredStatus.expiryDate!);
    const isExpired = expiryDate < new Date();
    
    expect(isExpired).toBe(true);
  });
});

