/**
 * Codegen spec for SensorModule TurboModule
 * This enables type-safe native module access with New Architecture
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  requestPermissions(): Promise<boolean>;
  startMicrophone(interval: number): Promise<void>;
  stopMicrophone(): Promise<void>;
  startLightSensor(interval: number): Promise<void>;
  stopLightSensor(): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SensorModule');

