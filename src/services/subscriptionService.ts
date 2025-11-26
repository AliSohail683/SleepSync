/**
 * Subscription Service
 * Manages in-app purchases and subscription state
 * Uses expo-in-app-purchases wrapper (or mock in dev mode)
 */

import { Platform } from 'react-native';
import { SubscriptionStatus } from '@/models';
import { storageService } from './storageService';
import { IAP_CONFIG } from '@/config/products';

// Import mock or real IAP based on configuration
let IAPModule: any;

if (IAP_CONFIG.useMockPurchases) {
  // Use mock IAP for development
  IAPModule = require('../mocks/iapMock').default;
  console.log('🧪 Using mock IAP for development');
} else {
  // In production, you would import real expo-in-app-purchases
  // IAPModule = require('expo-in-app-purchases');
  // For now, fall back to mock
  IAPModule = require('../mocks/iapMock').default;
  console.warn('⚠️ Real IAP not implemented, using mock');
}

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  type: 'subscription';
}

export interface IAPPurchase {
  productId: string;
  transactionId: string;
  transactionReceipt?: string;
  purchaseTime: number;
  acknowledged: boolean;
}

class SubscriptionService {
  private isInitialized = false;
  private purchaseListener: ((result: any) => void) | null = null;

  /**
   * Initialize IAP and setup purchase listener
   */
  async initializeIAP(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ IAP already initialized');
      return;
    }

    try {
      await IAPModule.connectAsync();

      // Set up purchase listener
      this.purchaseListener = IAPModule.setPurchaseListener(
        this.handlePurchaseUpdate.bind(this)
      );

      this.isInitialized = true;
      console.log('✅ IAP initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      throw error;
    }
  }

  /**
   * Get available subscription products
   */
  async getProducts(): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      await this.initializeIAP();
    }

    try {
      const productIds = Platform.select({
        ios: [IAP_CONFIG.ios.monthly],
        android: [IAP_CONFIG.android.monthly],
        default: [IAP_CONFIG.ios.monthly],
      }) as string[];

      const { results, responseCode } = await IAPModule.getProductsAsync(productIds);

      if (responseCode === IAPModule.IAPResponseCode.OK) {
        console.log('✅ Fetched products:', results.length);
        return results;
      } else {
        throw new Error(`Failed to fetch products: ${responseCode}`);
      }
    } catch (error) {
      console.error('❌ Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Purchase a subscription product
   */
  async purchase(productId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeIAP();
    }

    try {
      console.log('🛒 Initiating purchase for:', productId);
      await IAPModule.purchaseItemAsync(productId);
      // Purchase result will be handled by purchase listener
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      if (error.code === 'E_USER_CANCELLED') {
        throw new Error('Purchase cancelled by user');
      } else if (error.code === 'E_ITEM_UNAVAILABLE') {
        throw new Error('Product not available');
      } else {
        throw new Error('Purchase failed: ' + error.message);
      }
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeIAP();
    }

    try {
      console.log('🔄 Restoring purchases...');
      
      const { results, responseCode } = await IAPModule.getPurchaseHistoryAsync();

      if (responseCode === IAPModule.IAPResponseCode.OK) {
        if (results && results.length > 0) {
          // Process the most recent purchase
          const latestPurchase = results[0];
          await this.processPurchase(latestPurchase);
          console.log('✅ Purchases restored successfully');
        } else {
          console.log('ℹ️ No previous purchases found');
          // Clear subscription status
          await this.updateLocalSubscriptionStatus({
            active: false,
            platform: null,
            expiryDate: null,
            productId: null,
          });
        }
      } else {
        throw new Error(`Failed to restore purchases: ${responseCode}`);
      }
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      throw error;
    }
  }

  /**
   * Handle purchase updates from listener
   */
  private async handlePurchaseUpdate(result: any): Promise<void> {
    const { responseCode, results } = result;

    if (responseCode === IAPModule.IAPResponseCode.OK) {
      for (const purchase of results) {
        await this.processPurchase(purchase);
      }
    } else if (responseCode === IAPModule.IAPResponseCode.USER_CANCELED) {
      console.log('ℹ️ User cancelled purchase');
    } else if (responseCode === IAPModule.IAPResponseCode.DEFERRED) {
      console.log('ℹ️ Purchase deferred (pending approval)');
    } else {
      console.error('❌ Purchase error:', responseCode);
    }
  }

  /**
   * Process a completed purchase
   */
  private async processPurchase(purchase: IAPPurchase): Promise<void> {
    console.log('📦 Processing purchase:', purchase.productId);

    // Verify receipt (in production, do this server-side)
    const verificationResult = await this.verifyReceipt(
      purchase.transactionReceipt || purchase.transactionId
    );

    if (verificationResult.valid) {
      // Update local subscription status
      await this.updateLocalSubscriptionStatus({
        active: true,
        platform: Platform.OS as 'ios' | 'android',
        expiryDate: verificationResult.expiryDate,
        productId: purchase.productId,
        originalPurchaseDate: new Date(purchase.purchaseTime).toISOString(),
        autoRenewing: true,
      });

      // Acknowledge/consume purchase if needed
      if (!purchase.acknowledged) {
        await IAPModule.finishTransactionAsync(purchase, true);
      }

      console.log('✅ Purchase processed successfully');
    } else {
      console.error('❌ Receipt verification failed');
      throw new Error('Receipt verification failed');
    }
  }

  /**
   * Verify receipt (local stub - REPLACE WITH SERVER-SIDE VERIFICATION IN PRODUCTION)
   * 
   * IMPORTANT: In production, send the receipt to your backend server
   * which will validate it with Apple/Google servers and return the result.
   * 
   * See docs/RECEIPT_VALIDATION.md for implementation details.
   */
  async verifyReceipt(_receipt: string): Promise<{ valid: boolean; expiryDate: string | null }> {
    console.log('🔍 Verifying receipt (LOCAL STUB - USE SERVER IN PRODUCTION)');

    // MOCK VERIFICATION - ALWAYS SUCCEEDS IN DEV
    if (IAP_CONFIG.useMockPurchases) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

      return {
        valid: true,
        expiryDate: expiryDate.toISOString(),
      };
    }

    // PRODUCTION: Send receipt to your backend for verification
    /*
    try {
      const response = await fetch('https://your-api.com/verify-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt,
          platform: Platform.OS,
        }),
      });

      const data = await response.json();
      return {
        valid: data.valid,
        expiryDate: data.expiryDate,
      };
    } catch (error) {
      console.error('Receipt verification failed:', error);
      return { valid: false, expiryDate: null };
    }
    */

    return { valid: false, expiryDate: null };
  }

  /**
   * Get local subscription status
   */
  async getLocalSubscriptionStatus(): Promise<SubscriptionStatus> {
    const status = await storageService.getSubscriptionStatus();

    // Check if subscription has expired
    if (status.active && status.expiryDate) {
      const expiry = new Date(status.expiryDate);
      const now = new Date();

      if (now > expiry) {
        // Subscription expired
        status.active = false;
        await this.updateLocalSubscriptionStatus(status);
      }
    }

    return status;
  }

  /**
   * Update local subscription status
   */
  private async updateLocalSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    await storageService.updateSubscriptionStatus(status);
    console.log('✅ Subscription status updated:', status.active);
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    const status = await this.getLocalSubscriptionStatus();
    return status.active;
  }

  /**
   * Get subscription details for display
   */
  async getSubscriptionDetails(): Promise<{
    isActive: boolean;
    productName: string | null;
    expiryDate: string | null;
    autoRenewing: boolean;
  }> {
    const status = await this.getLocalSubscriptionStatus();
    const products = await this.getProducts();
    const product = products.find((p) => p.productId === status.productId);

    return {
      isActive: status.active,
      productName: product?.title ?? null,
      expiryDate: status.expiryDate ?? null,
      autoRenewing: status.autoRenewing ?? false,
    };
  }

  /**
   * Disconnect IAP
   */
  async disconnect(): Promise<void> {
    if (this.purchaseListener) {
      this.purchaseListener = null;
    }

    if (this.isInitialized) {
      await IAPModule.disconnectAsync();
      this.isInitialized = false;
      console.log('✅ IAP disconnected');
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;

