/**
 * Subscription Store
 * Manages subscription state and in-app purchases
 */

import { create } from 'zustand';
import { SubscriptionStatus } from '@/models';
import { subscriptionService, IAPProduct } from '@/services/subscriptionService';

interface SubscriptionState {
  status: SubscriptionStatus;
  products: IAPProduct[];
  isLoading: boolean;
  isPurchasing: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
  hasActiveSubscription: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  status: {
    active: false,
    platform: null,
    expiryDate: null,
    productId: null,
  },
  products: [],
  isLoading: false,
  isPurchasing: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      await subscriptionService.initializeIAP();
      await get().loadStatus();
      await get().loadProducts();
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to initialize subscriptions:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadStatus: async () => {
    try {
      const status = await subscriptionService.getLocalSubscriptionStatus();
      set({ status });
    } catch (error) {
      console.error('Failed to load subscription status:', error);
      throw error;
    }
  },

  loadProducts: async () => {
    try {
      const products = await subscriptionService.getProducts();
      set({ products });
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  },

  purchase: async (productId: string) => {
    set({ isPurchasing: true });
    try {
      await subscriptionService.purchase(productId);
      // Status will be updated by purchase listener
      await get().loadStatus();
      set({ isPurchasing: false });
    } catch (error) {
      console.error('Purchase failed:', error);
      set({ isPurchasing: false });
      throw error;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true });
    try {
      await subscriptionService.restorePurchases();
      await get().loadStatus();
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  hasActiveSubscription: () => {
    return get().status.active;
  },
}));

