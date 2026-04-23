import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Dimensions, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { fetchNearbyEvents, selectNearbyEvents, selectEventsLoading } from '../store/eventsSlice';
import EventCard from '../components/EventCard';
import { colors } from '../theme/colors';
import typography from '../theme/typography';
import { spacing, shadows, borderRadius } from '../theme/spacing';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const BOTTOM_PANEL_HEIGHT = 280;

const PRICE_FILTERS = [
  { id: 'all', label: 'All prices' },
  { id: 'under30', label: 'Under $30', min: 0, max: 30 },
  { id: '30-60', label: '$30–$60', min: 30, max: 60 },
  { id: '60-100', label: '$60–$100', min: 60, max: 100 },
  { id: 'over100', label: '$100+', min: 100, max: 99999 },
];

// Custom map marker for events
const EventMarker = ({ event, isSelected, onPress }) => {
  const price = parseFloat(event.price_per_person || 0).toFixed(0);
  return (
    <TouchableOpacity
      style={[
        styles.marker,
        isSelected && styles.markerSelected,
      ]}
      onPress={() => onPress(event)}
    >
      <Text style={[styles.markerText, isSelected && styles.markerTextSelected]}>
        ${price}
      </Text>
    </TouchableOpacity>
  );
};

const MapScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const nearbyEvents = useSelector(selectNearbyEvents);
  const isLoading = useSelector(selectEventsLoading);

  const mapRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  useEffect(() => {
    dispatch(fetchNearbyEvents({
      lat: region.latitude,
      lng: region.longitude,
      radiusKm: 20,
    }));
  }, [dispatch]);

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

  const filteredEvents = nearbyEvents.filter(event => {
    if (selectedPrice === 'all') return true;
    const filter = PRICE_FILTERS.find(f => f.id === selectedPrice);
    if (!filter) return true;
    const price = parseFloat(event.price_per_person || 0);
    return price >= filter.min && price <= filter.max;
  });

  const handleMarkerPress = useCallback((event) => {
    setSelectedEvent(event);
    Animated.spring(panelAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    if (event.latitude && event.longitude) {
      mapRef.current?.animateToRegion({
        latitude: event.latitude - 0.01,
        longitude: event.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }, 400);
    }
  }, [panelAnim]);

  const handleClosePanel = () => {
    Animated.spring(panelAnim, {
      toValue: BOTTOM_PANEL_HEIGHT,
      useNativeDriver: true,
    }).start(() => setSelectedEvent(null));
  };

  const handleEventDetailPress = (event) => {
    navigation.navigate('EventDetailFromMap', {
      eventId: event.id,
      eventTitle: event.title,
    });
  };

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
  };

  const handleMyLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 500);
    }
  }, [userLocation]);

  const handleRefreshArea = () => {
    dispatch(fetchNearbyEvents({
      lat: region.latitude,
      lng: region.longitude,
      radiusKm: 20,
    }));
  };

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
        {filteredEvents.map(event =>
          event.latitude && event.longitude ? (
            <Marker
              key={event.id}
              coordinate={{
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
              }}
              onPress={() => handleMarkerPress(event)}
            >
              <EventMarker
                event={event}
                isSelected={selectedEvent?.id === event.id}
                onPress={handleMarkerPress}
              />
            </Marker>
          ) : null
        )}
      </MapView>

      {/* Top Controls */}
      <View style={styles.topControls}>
        <View style={styles.topBar}>
          <View style={styles.topBarTitle}>
            <Icon name="restaurant" size={18} color={colors.cafe} />
            <Text style={styles.topBarText}>{filteredEvents.length} dinners nearby</Text>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Icon name="options-outline" size={18} color={colors.cafe} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Price Filter Pills */}
        {showFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {PRICE_FILTERS.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterPill,
                  selectedPrice === filter.id && styles.filterPillActive,
                ]}
                onPress={() => setSelectedPrice(filter.id)}
              >
                <Text style={[
                  styles.filterPillText,
                  selectedPrice === filter.id && styles.filterPillTextActive,
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Re-search button */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshArea}>
        <Icon name="refresh-outline" size={16} color={colors.cafe} />
        <Text style={styles.refreshButtonText}>Search this area</Text>
      </TouchableOpacity>

      {/* My Location Button */}
      <TouchableOpacity style={styles.myLocationButton} onPress={handleMyLocation}>
        <Icon name="locate-outline" size={22} color={colors.cafe} />
      </TouchableOpacity>

      {/* Bottom Event Card Panel */}
      {selectedEvent && (
        <Animated.View
          style={[
            styles.bottomPanel,
            { transform: [{ translateY: panelAnim }] },
          ]}
        >
          <View style={styles.panelHandle} />
          <TouchableOpacity style={styles.closePanel} onPress={handleClosePanel}>
            <Icon name="close" size={20} color={colors.gray500} />
          </TouchableOpacity>
          <EventCard
            event={selectedEvent}
            onPress={handleEventDetailPress}
            style={{ marginBottom: 0 }}
          />
        </Animated.View>
      )}
    </View>
  );
};

// Map style — Elegancia Gastronómica
const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#F5F0E8' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2C3E2D' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FDFAF5' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4A6741' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#C4D4D9' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#C8DCC0' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.beigeLight,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
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
  topBarTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarText: {
    ...typography.labelLarge,
    color: colors.cafe,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.beige,
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  filterButtonText: {
    ...typography.label,
    color: colors.cafe,
    textTransform: 'none',
  },
  filterScroll: {
    marginTop: spacing.sm,
  },
  filterContent: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  filterPill: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    ...shadows.sm,
  },
  filterPillActive: {
    backgroundColor: colors.cafe,
  },
  filterPillText: {
    ...typography.label,
    color: colors.gray700,
    textTransform: 'none',
    letterSpacing: 0,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  marker: {
    backgroundColor: colors.cafe,
    borderRadius: borderRadius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.sm,
  },
  markerSelected: {
    backgroundColor: colors.terracotta,
    transform: [{ scale: 1.1 }],
  },
  markerText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  markerTextSelected: {
    color: colors.white,
  },
  refreshButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 130 : 90,
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
  refreshButtonText: {
    ...typography.label,
    color: colors.cafe,
    textTransform: 'none',
    letterSpacing: 0,
  },
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
  closePanel: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    padding: 4,
  },
});

export default MapScreen;
