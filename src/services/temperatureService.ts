/**
 * Temperature Service
 * Analyzes room temperature preferences and provides recommendations
 */

import { UserProfile, SleepSession } from '@/models';

export interface TemperatureSuggestion {
  current?: number;
  recommended: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

class TemperatureService {
  /**
   * Analyze temperature inputs and generate suggestions
   */
  analyzeTempInputs(
    userProfile: UserProfile,
    recentSessions: SleepSession[]
  ): TemperatureSuggestion[] {
    const suggestions: TemperatureSuggestion[] = [];

    // Optimal sleep temperature range: 15-19°C (60-67°F)
    const optimalMin = 15;
    const optimalMax = 19;

    const currentTemp = userProfile.roomTemperaturePrefC;

    // If user hasn't set a temperature preference
    if (!currentTemp) {
      suggestions.push({
        recommended: 17, // Sweet spot
        reason: 'Research shows that 17°C (63°F) is ideal for most sleepers.',
        impact: 'high',
      });
      return suggestions;
    }

    // If temperature is too high
    if (currentTemp > optimalMax) {
      suggestions.push({
        current: currentTemp,
        recommended: optimalMax,
        reason: `Your room may be too warm. Cooler temperatures (${optimalMax}°C) promote deeper sleep.`,
        impact: 'high',
      });
    }

    // If temperature is too low
    if (currentTemp < optimalMin) {
      suggestions.push({
        current: currentTemp,
        recommended: optimalMin,
        reason: `Your room may be too cold. Try raising the temperature to at least ${optimalMin}°C.`,
        impact: 'medium',
      });
    }

    // Analyze sleep quality correlation with temperature
    if (recentSessions.length >= 3) {
      const avgScore = recentSessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / recentSessions.length;

      if (avgScore < 70 && currentTemp >= optimalMin && currentTemp <= optimalMax) {
        // Temperature is in range but sleep is poor - try adjusting
        suggestions.push({
          current: currentTemp,
          recommended: currentTemp - 1,
          reason: 'Your sleep quality could improve with a slightly cooler room.',
          impact: 'medium',
        });
      }
    }

    // Seasonal suggestions
    const month = new Date().getMonth();
    const isSummer = month >= 5 && month <= 8; // Jun-Sep
    const isWinter = month <= 2 || month >= 10; // Nov-Mar

    if (isSummer && currentTemp && currentTemp > 20) {
      suggestions.push({
        current: currentTemp,
        recommended: 18,
        reason: 'Summer temperatures can disrupt sleep. Consider using AC or a fan.',
        impact: 'high',
      });
    }

    if (isWinter && currentTemp && currentTemp < 16) {
      suggestions.push({
        current: currentTemp,
        recommended: 17,
        reason: 'Winter cold can wake you up. A slightly warmer room may help.',
        impact: 'medium',
      });
    }

    // If no suggestions and temperature is optimal
    if (suggestions.length === 0 && currentTemp >= optimalMin && currentTemp <= optimalMax) {
      suggestions.push({
        current: currentTemp,
        recommended: currentTemp,
        reason: 'Your room temperature is in the optimal range for sleep. Great job!',
        impact: 'low',
      });
    }

    return suggestions;
  }

  /**
   * Convert Celsius to Fahrenheit
   */
  celsiusToFahrenheit(celsius: number): number {
    return Math.round((celsius * 9) / 5 + 32);
  }

  /**
   * Convert Fahrenheit to Celsius
   */
  fahrenheitToCelsius(fahrenheit: number): number {
    return Math.round(((fahrenheit - 32) * 5) / 9);
  }

  /**
   * Get temperature display string
   */
  formatTemperature(celsius: number, unit: 'celsius' | 'fahrenheit' = 'celsius'): string {
    if (unit === 'fahrenheit') {
      return `${this.celsiusToFahrenheit(celsius)}°F`;
    }
    return `${celsius}°C`;
  }
}

export const temperatureService = new TemperatureService();
export default temperatureService;

