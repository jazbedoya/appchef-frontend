import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';

import { store } from './src/store';
import { loadStoredUser, selectIsAuthenticated, selectIsInitializing } from './src/store/authSlice';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import { colors } from './src/theme/colors';
import { spacing } from './src/theme/spacing';

function AppInner() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitializing = useSelector(selectIsInitializing);
  const [fontsReady, setFontsReady] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(null); // null = loading, true/false

  useEffect(() => {
    dispatch(loadStoredUser());
    AsyncStorage.getItem('@appchef:onboarding_seen').then(v => setOnboardingSeen(v === 'true'));

    Font.loadAsync({
      Newsreader_400Regular: require('@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf'),
      Newsreader_500Medium: require('@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf'),
      Newsreader_400Regular_Italic: require('@expo-google-fonts/newsreader/400Regular_Italic/Newsreader_400Regular_Italic.ttf'),
      HankenGrotesk_400Regular: require('@expo-google-fonts/hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf'),
      HankenGrotesk_500Medium: require('@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf'),
      HankenGrotesk_600SemiBold: require('@expo-google-fonts/hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf'),
      SpaceMono_400Regular: require('@expo-google-fonts/space-mono/400Regular/SpaceMono_400Regular.ttf'),
      SpaceMono_700Bold: require('@expo-google-fonts/space-mono/700Bold/SpaceMono_700Bold.ttf'),
    })
      .then(() => setFontsReady(true))
      .catch((err) => {
        console.warn('Font load failed, continuing with system fonts:', err);
        setFontsReady(true);
      });
  }, [dispatch]);

  if (!fontsReady || isInitializing || onboardingSeen === null) {
    return (
      <View style={styles.loading}>
        <Text style={styles.wordmark}>APP CHEF</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      </View>
    );
  }

  if (!onboardingSeen) {
    return <OnboardingScreen onDone={() => setOnboardingSeen(true)} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        {isAuthenticated ? <AppNavigator /> : <AuthScreen />}
      </NavigationContainer>
    </>
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
    fontSize: 27,
    fontWeight: '500',
    letterSpacing: 10,
    color: colors.textPrimary,
  },
});
