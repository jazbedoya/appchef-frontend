import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator as createStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';

import { selectIsAuthenticated, selectIsInitializing } from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
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
import NotificationsScreen from '../screens/NotificationsScreen';
import MisCenasScreen from '../screens/MisCenasScreen';
import FollowListScreen from '../screens/FollowListScreen';
import StripeOnboardingScreen from '../screens/StripeOnboardingScreen';
import HostGuestListScreen from '../screens/HostGuestListScreen';
import { hapticSelection } from '../lib/haptics';

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
      <HomeStackNav.Screen
        name="HostGuestList"
        component={HostGuestListScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <HomeStackNav.Screen
        name="FollowList"
        component={FollowListScreen}
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
    <Stack.Screen
      name="FollowList"
      component={FollowListScreen}
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
    <Stack.Screen
      name="MisCenas"
      component={MisCenasScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="FollowList"
      component={FollowListScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ChefProfile"
      component={ChefProfileScreen}
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
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ChefProfile"
      component={ChefProfileScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="FollowList"
      component={FollowListScreen}
      options={{ headerShown: false }}
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
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.onTabFloating,
      tabBarStyle: {
        position: 'absolute',
        bottom: spacing.floatingTabBottom,
        left: spacing.floatingTabInset,
        right: spacing.floatingTabInset,
        height: 56,
        borderRadius: radius.pill,
        backgroundColor: colors.tabFloating,
        borderTopWidth: 0,
        paddingBottom: 0,
        paddingTop: 0,
        shadowColor: colors.textPrimary,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
      },
      tabBarShowLabel: false,
      headerShown: false,
    })}
  >
    <Tab.Screen name="Inicio" component={HomeStackScreen}
      options={{ tabBarIcon: ({ focused }) => <Icon name={focused ? 'restaurant' : 'restaurant-outline'} size={sizes.tabFloatingIcon} color={focused ? colors.accent : colors.onTabFloating} /> }}
    />
    <Tab.Screen name="Map" component={MapStack}
      options={{ tabBarIcon: ({ focused }) => <Icon name={focused ? 'map' : 'map-outline'} size={sizes.tabFloatingIcon} color={focused ? colors.accent : colors.onTabFloating} /> }}
    />
    <Tab.Screen name="Create" component={HomeStackScreen}
      options={{
        tabBarIcon: () => (
          <View style={{
            width: sizes.fabFloating, height: sizes.fabFloating, borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="add" size={sizes.tabFloatingIcon} color={colors.onAccent} />
          </View>
        ),
      }}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          hapticSelection();
          navigation.navigate('StripeOnboarding');
        },
      })}
    />
    <Tab.Screen name="Chat" component={ChatStack}
      options={{ tabBarIcon: ({ focused }) => <Icon name={focused ? 'chatbubble' : 'chatbubble-outline'} size={sizes.tabFloatingIcon} color={focused ? colors.accent : colors.onTabFloating} /> }}
    />
    <Tab.Screen name="Profile" component={ProfileStack}
      options={{ tabBarIcon: ({ focused }) => <Icon name={focused ? 'person' : 'person-outline'} size={sizes.tabFloatingIcon} color={focused ? colors.accent : colors.onTabFloating} /> }}
    />
  </Tab.Navigator>
);

// ─── Root Navigator ───

const AuthenticatedStack = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
    <RootStack.Screen
      name="StripeOnboarding"
      component={StripeOnboardingScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
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
