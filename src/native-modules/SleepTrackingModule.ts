/**
 * Codegen spec for SleepTrackingModule TurboModule
 * This enables type-safe native module access with New Architecture
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  startTracking(): Promise<boolean>;
  stopTracking(): Promise<boolean>;
  isTracking(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SleepTrackingModule');

