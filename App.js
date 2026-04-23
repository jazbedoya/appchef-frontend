import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';

import { store } from './src/store';
import { loadStoredUser, selectIsAuthenticated, selectIsInitializing } from './src/store/authSlice';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';

// ─── Colors ───
const CAFE = '#4A2C2A';
const BEIGE = '#F5E6D3';
const TERRACOTA = '#C4622D';

// ─── Inner App (has access to Redux store) ───

function AppInner() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitializing = useSelector(selectIsInitializing);

  useEffect(() => {
    dispatch(loadStoredUser());
  }, [dispatch]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>App Chef</Text>
        <ActivityIndicator size="large" color={TERRACOTA} style={{ marginTop: 16 }} />
        <Text style={styles.loadingSubtitle}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthScreen />}
    </NavigationContainer>
  );
}

// ─── Root App ───

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: BEIGE,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { height: '100%', minHeight: '100vh' } : {}),
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: CAFE,
    letterSpacing: 1,
  },
  loadingSubtitle: {
    marginTop: 12,
    fontSize: 16,
    color: TERRACOTA,
  },
});
