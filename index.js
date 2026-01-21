/**
 * @format
 */

// Import polyfill for crypto.getRandomValues() before any other imports
// This is required for uuid library to work in React Native
import 'react-native-get-random-values';

// Global error handler to catch unhandled promise rejections
if (typeof global.Promise !== 'undefined') {
  const originalPromiseRejectionHandler = global.onunhandledrejection;
  global.onunhandledrejection = (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    if (originalPromiseRejectionHandler) {
      originalPromiseRejectionHandler(event);
    }
  };
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
