/**
 * Oura Ring API Client
 * Handles OAuth and API requests to Oura
 */

class OuraClient {
  private accessToken: string | null = null;
  private apiBaseUrl = 'https://api.ouraring.com/v2';

  /**
   * Initialize OAuth flow
   */
  async initializeOAuth(): Promise<string> {
    // OAuth flow will be implemented
    // Returns authorization URL
    const clientId = process.env.OURA_CLIENT_ID || '';
    const redirectUri = process.env.OURA_REDIRECT_URI || '';
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.OURA_CLIENT_ID;
    const clientSecret = process.env.OURA_CLIENT_SECRET;
    const redirectUri = process.env.OURA_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Oura API credentials not configured. Set OURA_CLIENT_ID, OURA_CLIENT_SECRET, and OURA_REDIRECT_URI environment variables.');
    }

    try {
      const response = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      throw error;
    }
  }

  /**
   * Get sleep data from Oura
   */
  async getSleepData(startDate: string, endDate: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call initializeOAuth first.');
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Oura API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch sleep data from Oura:', error);
      throw error;
    }
  }

  /**
   * Get HRV data from Oura
   */
  async getHRVData(startDate: string, endDate: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/usercollection/heartrate?start_date=${startDate}&end_date=${endDate}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Oura API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch HRV data from Oura:', error);
      throw error;
    }
  }

  /**
   * Get readiness score from Oura
   */
  async getReadinessScore(startDate: string, endDate: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Oura API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch readiness score from Oura:', error);
      throw error;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }
}

export const ouraClient = new OuraClient();
export default ouraClient;

