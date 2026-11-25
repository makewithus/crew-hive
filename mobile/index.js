import { LogBox } from 'react-native';

// Suppress known non-breaking upstream library warnings in Expo Go
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'SafeAreaView has been deprecated and will be removed in a future release',
]);

// Intercept and silence console.error / warn for Expo Go remote push limitations
const _origConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('expo-notifications: Android Push notifications')
  ) {
    return;
  }
  _origConsoleError(...args);
};

const _origConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('`expo-notifications` functionality is not fully supported') ||
      args[0].includes('SafeAreaView has been deprecated'))
  ) {
    return;
  }
  _origConsoleWarn(...args);
};

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
