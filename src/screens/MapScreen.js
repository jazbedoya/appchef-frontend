import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Dimensions, Platform, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { fetchNearbyEvents, selectNearbyEvents, selectEventsLoading } from '../store/eventsSlice';
import { userApi } from '../services/api';
import { selectUser } from '../store/authSlice';
import EventCard from '../components/EventCard';
import UserAvatar from '../components/UserAvatar';
import { colors } from '../theme/colors';
import typography from '../theme/typography';
import { spacing, shadows, borderRadius } from '../theme/spacing';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const BOTTOM_PANEL_HEIGHT = 280;

const PRICE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'under30', label: 'Menos €30', min: 0, max: 30 },
  { id: '30-60', label: '€30–€60', min: 30, max: 60 },
  { id: '60-100', label: '€60–€100', min: 60, max: 100 },
  { id: 'over100', label: '€100+', min: 100, max: 99999 },
];

// ─── Markers ───

const EventMarker = ({ event, isSelected, onPress }) => {
  const price = parseFloat(event.price_per_person || 0).toFixed(0);
  return (
    <TouchableOpacity
      style={[styles.marker, isSelected && styles.markerSelected]}
      onPress={() => onPress(event)}
    >
      <Text style={[styles.markerText, isSelected && styles.markerTextSelected]}>
        €{price}
      </Text>
    </TouchableOpacity>
  );
};

const UserMarker = ({ user, isSelected, onPress }) => {
  const p = user.profile || {};
  const name = p.first_name || user.username || '?';
  return (
    <TouchableOpacity
      style={[styles.userMarker, isSelected && styles.userMarkerSelected]}
      onPress={() => onPress(user)}
    >
      <Icon name="person" size={14} color={isSelected ? colors.white : colors.cafe} />
      <Text style={[styles.userMarkerText, isSelected && styles.userMarkerTextSelected]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
};

// ─── User card in bottom panel ───

const UserPanelCard = ({ user, isFollowing, followLoading, onFollow, onViewProfile }) => {
  const p = user.profile || {};
  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || user.username;
  return (
    <View style={styles.userCard}>
      <View style={styles.userCardLeft}>
        <UserAvatar name={fullName} size={56} />
        <View style={styles.userCardInfo}>
          <View style={styles.userCardNameRow}>
            <Text style={styles.userCardName} numberOfLines={1}>{fullName}</Text>
            {p.is_host && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>Host</Text>
              </View>
            )}
          </View>
          <Text style={styles.userCardUsername}>@{user.username}</Text>
          {p.city ? (
            <View style={styles.userCardLocation}>
              <Icon name="location-outline" size={12} color={colors.gray500} />
              <Text style={styles.userCardLocationText}>{p.city}</Text>
            </View>
          ) : null}
          {p.specialties?.length > 0 && (
            <Text style={styles.userCardSpecialty} numberOfLines={1}>
              🍳 {p.specialties.slice(0, 2).join(' · ')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.userCardStats}>
        <Text style={styles.userCardStatValue}>{user.followers_count || 0}</Text>
        <Text style={styles.userCardStatLabel}>seguidores</Text>
      </View>

      <View style={styles.userCardActions}>
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={onFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.cafe : colors.white} />
          ) : (
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileBtn} onPress={onViewProfile}>
          <Text style={styles.profileBtnText}>Ver perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ───

const MapScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const nearbyEvents = useSelector(selectNearbyEvents);
  const isLoading = useSelector(selectEventsLoading);
  const currentUser = useSelector(selectUser);

  const mapRef = useRef(null);
  const [mode, setMode] = useState('events'); // 'events' | 'users'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [followStates, setFollowStates] = useState({}); // { userId: bool }
  const [followLoading, setFollowLoading] = useState({}); // { userId: bool }
  const [region, setRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const panelAnim = useRef(new Animated.Value(BOTTOM_PANEL_HEIGHT)).current;

  // ─── Load nearby events ───
  useEffect(() => {
    dispatch(fetchNearbyEvents({ lat: region.latitude, lng: region.longitude, radiusKm: 20 }));
  }, [dispatch]);

  // ─── Geolocation ───
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setRegion(coords);
        setUserLocation(coords);
      }
    })();
  }, []);

  // ─── Load nearby users when mode changes ───
  useEffect(() => {
    if (mode === 'users') loadNearbyUsers();
  }, [mode]);

  const loadNearbyUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await userApi.get('/users/nearby', {
        params: { lat: region.latitude, lng: region.longitude, radius_km: 20 },
      });
      const users = res.data.users || [];
      setNearbyUsers(users);
      // Initialize follow states from API response
      const states = {};
      users.forEach(u => { states[u.id] = u.is_following || false; });
      setFollowStates(states);
    } catch {
      setNearbyUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // ─── Panel animation ───
  const openPanel = useCallback(() => {
    Animated.spring(panelAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [panelAnim]);

  const closePanel = useCallback(() => {
    Animated.spring(panelAnim, {
      toValue: BOTTOM_PANEL_HEIGHT,
      useNativeDriver: true,
    }).start(() => {
      setSelectedEvent(null);
      setSelectedUser(null);
    });
  }, [panelAnim]);

  // ─── Event marker press ───
  const handleEventMarkerPress = useCallback((event) => {
    setSelectedEvent(event);
    setSelectedUser(null);
    openPanel();
    if (event.latitude && event.longitude) {
      mapRef.current?.animateToRegion({
        latitude: parseFloat(event.latitude) - 0.01,
        longitude: parseFloat(event.longitude),
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 400);
    }
  }, [openPanel]);

  // ─── User marker press ───
  const handleUserMarkerPress = useCallback((user) => {
    setSelectedUser(user);
    setSelectedEvent(null);
    openPanel();
    const p = user.profile || {};
    if (p.latitude && p.longitude) {
      mapRef.current?.animateToRegion({
        latitude: parseFloat(p.latitude) - 0.01,
        longitude: parseFloat(p.longitude),
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 400);
    }
  }, [openPanel]);

  // ─── Follow / Unfollow ───
  const handleFollow = useCallback(async (userId) => {
    const following = followStates[userId];
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      if (following) {
        await userApi.delete(`/users/${userId}/follow`);
      } else {
        await userApi.post(`/users/${userId}/follow`);
      }
      setFollowStates(prev => ({ ...prev, [userId]: !following }));
      // Update count in nearbyUsers
      setNearbyUsers(prev =>
        prev.map(u => u.id === userId
          ? { ...u, followers_count: (u.followers_count || 0) + (following ? -1 : 1) }
          : u
        )
      );
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? {
          ...prev,
          followers_count: (prev.followers_count || 0) + (following ? -1 : 1),
        } : prev);
      }
    } catch (err) {
      // silent fail
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  }, [followStates, selectedUser]);

  // ─── Mode toggle ───
  const handleModeToggle = (newMode) => {
    setMode(newMode);
    closePanel();
    setSelectedEvent(null);
    setSelectedUser(null);
  };

  // ─── Region change / refresh ───
  const handleRegionChange = (newRegion) => setRegion(newRegion);

  const handleRefreshArea = () => {
    if (mode === 'events') {
      dispatch(fetchNearbyEvents({ lat: region.latitude, lng: region.longitude, radiusKm: 20 }));
    } else {
      loadNearbyUsers();
    }
  };

  const handleMyLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 500);
    }
  }, [userLocation]);

  // ─── Filtered events ───
  const filteredEvents = nearbyEvents.filter(event => {
    if (selectedPrice === 'all') return true;
    const filter = PRICE_FILTERS.find(f => f.id === selectedPrice);
    if (!filter) return true;
    const price = parseFloat(event.price_per_person || 0);
    return price >= filter.min && price <= filter.max;
  });

  const markerCount = mode === 'events' ? filteredEvents.length : nearbyUsers.length;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        region={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        customMapStyle={mapStyle}
      >
        {/* Event markers */}
        {mode === 'events' && filteredEvents.map(event =>
          event.latitude && event.longitude ? (
            <Marker
              key={`ev-${event.id}`}
              coordinate={{
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
              }}
              onPress={() => handleEventMarkerPress(event)}
            >
              <EventMarker
                event={event}
                isSelected={selectedEvent?.id === event.id}
                onPress={handleEventMarkerPress}
              />
            </Marker>
          ) : null
        )}

        {/* User markers */}
        {mode === 'users' && nearbyUsers.map(user => {
          const p = user.profile || {};
          if (!p.latitude || !p.longitude) return null;
          return (
            <Marker
              key={`usr-${user.id}`}
              coordinate={{
                latitude: parseFloat(p.latitude),
                longitude: parseFloat(p.longitude),
              }}
              onPress={() => handleUserMarkerPress(user)}
            >
              <UserMarker
                user={user}
                isSelected={selectedUser?.id === user.id}
                onPress={handleUserMarkerPress}
              />
            </Marker>
          );
        })}
      </MapView>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'events' && styles.modeBtnActive]}
            onPress={() => handleModeToggle('events')}
          >
            <Icon name="restaurant" size={14} color={mode === 'events' ? colors.white : colors.cafe} />
            <Text style={[styles.modeBtnText, mode === 'events' && styles.modeBtnTextActive]}>Cenas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'users' && styles.modeBtnActive]}
            onPress={() => handleModeToggle('users')}
          >
            <Icon name="people" size={14} color={mode === 'users' ? colors.white : colors.cafe} />
            <Text style={[styles.modeBtnText, mode === 'users' && styles.modeBtnTextActive]}>Personas</Text>
          </TouchableOpacity>
        </View>

        {/* Counter + filter row */}
        <View style={styles.topBar}>
          <View style={styles.topBarTitle}>
            <Icon
              name={mode === 'events' ? 'restaurant' : 'people'}
              size={16}
              color={colors.cafe}
            />
            <Text style={styles.topBarText}>
              {usersLoading && mode === 'users'
                ? 'Buscando...'
                : `${markerCount} ${mode === 'events' ? 'cenas cercanas' : 'personas cercanas'}`}
            </Text>
          </View>
          {mode === 'events' && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Icon name="options-outline" size={16} color={colors.cafe} />
              <Text style={styles.filterButtonText}>Filtro</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Price filters */}
        {showFilters && mode === 'events' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {PRICE_FILTERS.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterPill, selectedPrice === filter.id && styles.filterPillActive]}
                onPress={() => setSelectedPrice(filter.id)}
              >
                <Text style={[styles.filterPillText, selectedPrice === filter.id && styles.filterPillTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Search this area */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshArea}>
        <Icon name="refresh-outline" size={16} color={colors.cafe} />
        <Text style={styles.refreshButtonText}>Buscar en esta zona</Text>
      </TouchableOpacity>

      {/* My location */}
      <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
        <Icon name="locate-outline" size={22} color={colors.cafe} />
      </TouchableOpacity>

      {/* Bottom panel */}
      {(selectedEvent || selectedUser) && (
        <Animated.View
          style={[styles.bottomPanel, { transform: [{ translateY: panelAnim }] }]}
        >
          <View style={styles.panelHandle} />
          <TouchableOpacity style={styles.closePanel} onPress={closePanel}>
            <Icon name="close" size={20} color={colors.gray500} />
          </TouchableOpacity>

          {selectedEvent && (
            <EventCard
              event={selectedEvent}
              onPress={() => navigation.navigate('EventDetailFromMap', {
                eventId: selectedEvent.id,
                eventTitle: selectedEvent.title,
              })}
              style={{ marginBottom: 0 }}
            />
          )}

          {selectedUser && (
            <UserPanelCard
              user={selectedUser}
              isFollowing={followStates[selectedUser.id] || false}
              followLoading={followLoading[selectedUser.id] || false}
              onFollow={() => handleFollow(selectedUser.id)}
              onViewProfile={() => {
                closePanel();
                navigation.navigate('UserProfile', { userId: selectedUser.id });
              }}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
};

// ─── Map style ───
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#F5F0E8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#2C3E2D' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FDFAF5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#4A6741' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C4D4D9' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#C8DCC0' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.beigeLight },
  map: { ...StyleSheet.absoluteFillObject },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: 3,
    marginBottom: spacing.sm,
    ...shadows.md,
    alignSelf: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: borderRadius.full,
  },
  modeBtnActive: {
    backgroundColor: colors.cafe,
  },
  modeBtnText: {
    ...typography.label,
    color: colors.cafe,
    textTransform: 'none',
    letterSpacing: 0,
  },
  modeBtnTextActive: {
    color: colors.white,
  },

  // Top controls
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: spacing.base,
    right: spacing.base,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    ...shadows.md,
  },
  topBarTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarText: { ...typography.labelLarge, color: colors.cafe },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.beige,
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  filterButtonText: { ...typography.label, color: colors.cafe, textTransform: 'none' },
  filterScroll: { marginTop: spacing.sm },
  filterContent: { gap: spacing.sm, paddingVertical: 4 },
  filterPill: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    ...shadows.sm,
  },
  filterPillActive: { backgroundColor: colors.cafe },
  filterPillText: { ...typography.label, color: colors.gray700, textTransform: 'none', letterSpacing: 0 },
  filterPillTextActive: { color: colors.white },

  // Event marker
  marker: {
    backgroundColor: colors.cafe,
    borderRadius: borderRadius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.sm,
  },
  markerSelected: { backgroundColor: colors.terracotta, transform: [{ scale: 1.1 }] },
  markerText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  markerTextSelected: { color: colors.white },

  // User marker
  userMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.cafe,
    ...shadows.sm,
    maxWidth: 120,
  },
  userMarkerSelected: { backgroundColor: colors.cafe, borderColor: colors.white },
  userMarkerText: { color: colors.cafe, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  userMarkerTextSelected: { color: colors.white },

  // Buttons
  refreshButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 160 : 120,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
  },
  refreshButtonText: { ...typography.label, color: colors.cafe, textTransform: 'none', letterSpacing: 0 },
  myLocationButton: {
    position: 'absolute',
    bottom: BOTTOM_PANEL_HEIGHT + spacing.xl,
    right: spacing.base,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.beigeLight,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    ...shadows.xl,
  },
  panelHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  closePanel: { position: 'absolute', top: spacing.base, right: spacing.base, padding: 4 },

  // User card
  userCard: { paddingHorizontal: 4 },
  userCardLeft: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  userCardInfo: { flex: 1, justifyContent: 'center' },
  userCardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userCardName: { ...typography.h4, color: colors.cafe, flex: 1 },
  hostBadge: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hostBadgeText: { ...typography.caption, color: colors.white, fontSize: 10 },
  userCardUsername: { ...typography.bodySmall, color: colors.gray500, marginTop: 1 },
  userCardLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  userCardLocationText: { ...typography.caption, color: colors.gray500 },
  userCardSpecialty: { ...typography.caption, color: colors.cafeLight, marginTop: 3 },
  userCardStats: { alignItems: 'center', marginBottom: spacing.sm },
  userCardStatValue: { ...typography.h3, color: colors.cafe },
  userCardStatLabel: { ...typography.caption, color: colors.gray500 },
  userCardActions: { flexDirection: 'row', gap: spacing.sm },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.cafe,
    borderRadius: borderRadius.full,
    paddingVertical: 10,
    ...shadows.sm,
  },
  followingBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.cafe,
  },
  followBtnText: { ...typography.label, color: colors.white },
  followingBtnText: { color: colors.cafe },
  profileBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.beige,
    borderRadius: borderRadius.full,
    paddingVertical: 10,
  },
  profileBtnText: { ...typography.label, color: colors.cafe, textTransform: 'none', letterSpacing: 0 },
});

export default MapScreen;
