/**
 * Mock In-App Purchase Module
 * Simulates expo-in-app-purchases for development and testing
 */

import { PRICING } from '../config/products';

export enum IAPResponseCode {
  OK = 0,
  USER_CANCELED = 1,
  ERROR = 2,
  DEFERRED = 3,
}

interface MockProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  type: 'subscription';
}

interface MockPurchase {
  productId: string;
  transactionId: string;
  transactionReceipt: string;
  purchaseTime: number;
  acknowledged: boolean;
}

class MockIAP {
  private purchaseListener: ((result: any) => void) | null = null;
  private purchases: MockPurchase[] = [];

  /**
   * Simulate connection to store
   */
  async connectAsync(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('🧪 Mock IAP: Connected');
        resolve();
      }, 500);
    });
  }

  /**
   * Simulate disconnection
   */
  async disconnectAsync(): Promise<void> {
    this.purchaseListener = null;
    console.log('🧪 Mock IAP: Disconnected');
  }

  /**
   * Set purchase update listener
   */
  setPurchaseListener(listener: (result: any) => void): () => void {
    this.purchaseListener = listener;
    console.log('🧪 Mock IAP: Purchase listener set');

    // Return cleanup function
    return () => {
      this.purchaseListener = null;
    };
  }

  /**
   * Get available products
   */
  async getProductsAsync(productIds: string[]): Promise<{
    responseCode: IAPResponseCode;
    results: MockProduct[];
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products: MockProduct[] = productIds.map((id) => ({
          productId: id,
          title: 'SleepSync Premium',
          description: 'Unlock all premium features for better sleep',
          price: PRICING.monthly.price,
          type: 'subscription' as const,
        }));

        console.log('🧪 Mock IAP: Fetched products:', products.length);

        resolve({
          responseCode: IAPResponseCode.OK,
          results: products,
        });
      }, 500);
    });
  }

  /**
   * Simulate purchase flow
   */
  async purchaseItemAsync(productId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🧪 Mock IAP: Simulating purchase for:', productId);

      // Simulate user interaction delay
      setTimeout(() => {
        // Simulate 80% success rate (20% user cancellation)
        if (Math.random() < 0.8) {
          const purchase: MockPurchase = {
            productId,
            transactionId: `mock_txn_${Date.now()}`,
            transactionReceipt: `mock_receipt_${Date.now()}_${productId}`,
            purchaseTime: Date.now(),
            acknowledged: false,
          };

          this.purchases.push(purchase);

          // Notify listener
          if (this.purchaseListener) {
            this.purchaseListener({
              responseCode: IAPResponseCode.OK,
              results: [purchase],
            });
          }

          console.log('🧪 Mock IAP: Purchase successful');
          resolve();
        } else {
          // Simulate user cancellation
          if (this.purchaseListener) {
            this.purchaseListener({
              responseCode: IAPResponseCode.USER_CANCELED,
              results: [],
            });
          }

          console.log('🧪 Mock IAP: Purchase cancelled');
          const error: any = new Error('User cancelled');
          error.code = 'E_USER_CANCELLED';
          reject(error);
        }
      }, 1500); // Simulate purchase flow delay
    });
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistoryAsync(): Promise<{
    responseCode: IAPResponseCode;
    results: MockPurchase[];
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('🧪 Mock IAP: Fetched purchase history:', this.purchases.length);

        resolve({
          responseCode: IAPResponseCode.OK,
          results: this.purchases,
        });
      }, 500);
    });
  }

  /**
   * Finish transaction (acknowledge purchase)
   */
  async finishTransactionAsync(purchase: MockPurchase): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.purchases.findIndex(
          (p) => p.transactionId === purchase.transactionId
        );

        if (index !== -1) {
          this.purchases[index].acknowledged = true;
        }

        console.log('🧪 Mock IAP: Transaction finished');
        resolve();
      }, 300);
    });
  }

  /**
   * Clear all mock purchases (for testing)
   */
  clearMockPurchases(): void {
    this.purchases = [];
    console.log('🧪 Mock IAP: Cleared all mock purchases');
  }

  /**
   * Simulate a successful purchase (for testing)
   */
  simulateSuccessfulPurchase(productId: string): void {
    const purchase: MockPurchase = {
      productId,
      transactionId: `mock_txn_${Date.now()}`,
      transactionReceipt: `mock_receipt_${Date.now()}_${productId}`,
      purchaseTime: Date.now(),
      acknowledged: false,
    };

    this.purchases.push(purchase);

    if (this.purchaseListener) {
      this.purchaseListener({
        responseCode: IAPResponseCode.OK,
        results: [purchase],
      });
    }

    console.log('🧪 Mock IAP: Simulated successful purchase');
  }

  // Expose response codes
  IAPResponseCode = IAPResponseCode;
}

// Export singleton instance
const mockIAP = new MockIAP();
export default mockIAP;

