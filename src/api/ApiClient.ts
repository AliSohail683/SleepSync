/**
 * API Client
 * Handles all backend API communication
 */

import { UUID } from '../models';
import { SleepSessionEnhanced } from '../types/sleep';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.sleepsync.com';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        await this.refreshAccessToken();
        // Retry request
        return this.request<T>(endpoint, options);
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
  }

  /**
   * Upload sleep session
   */
  async uploadSession(session: SleepSessionEnhanced): Promise<void> {
    await this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId: UUID): Promise<{
    lastSyncAt: string;
    pendingUploads: number;
  }> {
    return this.request(`/sync/status/${userId}`);
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(userId: UUID, token: string): Promise<void> {
    await this.request('/devices/register', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

