import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator as createStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';

import { selectIsAuthenticated, selectIsInitializing } from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import typography from '../theme/typography';

// Screens
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import AuthScreen from '../screens/AuthScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import ChefProfileScreen from '../screens/ChefProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const HomeStackNav = createStackNavigator();
const RootStack = createStackNavigator();

// ─── Stack Navigators ───

// HomeStackScreen wraps the Inicio tab so EventDetail can be pushed within it
function HomeStackScreen() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{
          headerShown: true,
          title: 'Detalle',
          headerStyle: { backgroundColor: colors.cafe },
          headerTintColor: colors.beige,
          headerTitleStyle: { color: colors.beige, fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />
      <HomeStackNav.Screen
        name="ChefProfile"
        component={ChefProfileScreen}
        options={{ headerShown: false }}
      />
    </HomeStackNav.Navigator>
  );
}

const MapStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.beigeLight },
      headerTintColor: colors.cafe,
      headerTitleStyle: { ...typography.h2, color: colors.cafe },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="MapMain"
      component={MapScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="EventDetailFromMap"
      component={EventDetailScreen}
      options={{ headerTransparent: true, headerTintColor: colors.white }}
    />
    <Stack.Screen
      name="ChefProfile"
      component={ChefProfileScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.beigeLight },
      headerTintColor: colors.cafe,
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ChatStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.beigeLight },
      headerTintColor: colors.cafe,
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="ChatMain"
      component={ChatScreen}
      options={{ title: 'Messages' }}
    />
  </Stack.Navigator>
);

// ─── Tab Bar Icon ───

const TabBarIcon = ({ name, focused, color }) => {
  const iconMap = {
    Inicio: focused ? 'restaurant' : 'restaurant-outline',
    Discover: focused ? 'restaurant' : 'restaurant-outline',
    Map: focused ? 'map' : 'map-outline',
    Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
    Profile: focused ? 'person' : 'person-outline',
  };
  return <Icon name={iconMap[name] || 'home'} size={24} color={color} />;
};

// ─── Main Tab Navigator ───

const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color }) => (
        <TabBarIcon name={route.name} focused={focused} color={color} />
      ),
      tabBarActiveTintColor: colors.gold,
      tabBarInactiveTintColor: colors.gray400,
      tabBarStyle: {
        backgroundColor: colors.white,
        borderTopWidth: 0,
        height: 62,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        paddingTop: 8,
        shadowColor: '#2C3E2D',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 12,
      },
      tabBarLabelStyle: {
        ...typography.labelSmall,
        textTransform: 'none',
        fontSize: 11,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Inicio" component={HomeStackScreen} />
    <Tab.Screen name="Map" component={MapStack} />
    <Tab.Screen name="Chat" component={ChatStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

// ─── Root Navigator ───

const AuthenticatedStack = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
    <RootStack.Screen
      name="CreateEvent"
      component={CreateEventScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
  </RootStack.Navigator>
);

const RootNavigator = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return isAuthenticated ? <AuthenticatedStack /> : <AuthScreen />;
};

const AppNavigator = () => <RootNavigator />;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.beigeLight,
  },
  loadingTitle: {
    ...typography.displayMedium,
    color: colors.cafe,
    marginBottom: 8,
  },
  loadingSubtitle: {
    ...typography.bodyLarge,
    color: colors.gray500,
  },
});

export default AppNavigator;
