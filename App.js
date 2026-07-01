import React, { useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Newsreader_400Regular, Newsreader_500Medium, Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader';
import { HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import { store } from './src/store';
import { loadStoredUser, selectIsAuthenticated, selectIsInitializing } from './src/store/authSlice';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import { colors } from './src/theme/colors';
import { typography } from './src/theme/typography';
import { spacing } from './src/theme/spacing';

SplashScreen.preventAutoHideAsync();

function AppInner() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitializing = useSelector(selectIsInitializing);

  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_400Regular_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => { dispatch(loadStoredUser()); }, [dispatch]);

  const onReady = useCallback(async () => {
    if (fontsLoaded && !isInitializing) await SplashScreen.hideAsync();
  }, [fontsLoaded, isInitializing]);

  if (!fontsLoaded || isInitializing) {
    return (
      <View style={styles.loading} onLayout={onReady}>
        <Text style={styles.wordmark}>APP CHEF</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onReady}>
      <StatusBar style="dark" />
      <NavigationContainer>
        {isAuthenticated ? <AppNavigator /> : <AuthScreen />}
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppInner />
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    ...typography.masthead,
    color: colors.textPrimary,
  },
});
