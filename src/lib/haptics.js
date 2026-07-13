// Centralized haptic feedback — safe for Expo Go
import { Platform } from 'react-native';

let Haptics;
try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

export const hapticLight = () => {
  if (Platform.OS === 'web' || !Haptics) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const hapticMedium = () => {
  if (Platform.OS === 'web' || !Haptics) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export const hapticSuccess = () => {
  if (Platform.OS === 'web' || !Haptics) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export const hapticError = () => {
  if (Platform.OS === 'web' || !Haptics) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

export const hapticSelection = () => {
  if (Platform.OS === 'web' || !Haptics) return;
  Haptics.selectionAsync().catch(() => {});
};
