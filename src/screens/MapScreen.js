// MapScreen.js — Mapa + lista inferior siempre visible + perfil del chef
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, FlatList, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { fetchNearbyEvents, selectNearbyEvents, selectEventsLoading } from '../store/eventsSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

const DEFAULT_REGION = { latitude: 36.7213, longitude: -4.4214, latitudeDelta: 0.09, longitudeDelta: 0.04 };

const getCuisine = (e) => {
  try { const c = typeof e.cuisine_type === 'string' ? JSON.parse(e.cuisine_type) : e.cuisine_type; return Array.isArray(c) ? c[0] : c; } catch { return ''; }
};
const getSpots = (e) => Math.max(0, (e.max_guests || 0) - (e.confirmed_guests || 0));

function PricePin({ price, dark }) {
  return (
    <View style={st.pin}>
      <View style={[st.pinLabel, dark && st.pinLabelDark]}>
        <Text style={st.pinText}>€{price}</Text>
      </View>
      <View style={[st.pinStem, dark && st.pinStemDark]} />
    </View>
  );
}

const MapScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const nearby = useSelector(selectNearbyEvents);
  const isLoading = useSelector(selectEventsLoading);
  const mapRef = useRef(null);
  const listRef = useRef(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [userLoc, setUserLoc] = useState(null);
  const [locDenied, setLocDenied] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [cityQuery, setCityQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const searchCity = async () => {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const coords = { latitude: parseFloat(lat), longitude: parseFloat(lon), latitudeDelta: 0.09, longitudeDelta: 0.04 };
        setRegion(coords);
        mapRef.current?.animateToRegion(coords, 500);
        dispatch(fetchNearbyEvents({ lat: parseFloat(lat), lng: parseFloat(lon), radius_km: 50 }));
      }
    } catch {}
    setSearching(false);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocDenied(true);
        dispatch(fetchNearbyEvents({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude, radius_km: 50 }));
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.09, longitudeDelta: 0.04 };
        setRegion(coords);
        setUserLoc(coords);
        dispatch(fetchNearbyEvents({ lat: coords.latitude, lng: coords.longitude, radius_km: 50 }));
      } catch {
        setLocDenied(true);
        dispatch(fetchNearbyEvents({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude, radius_km: 50 }));
      }
    })();
  }, [dispatch]);

  const onMarker = useCallback((e) => {
    setSelectedId(e.id);
    if (e.latitude && e.longitude) mapRef.current?.animateToRegion({ latitude: parseFloat(e.latitude) - 0.005, longitude: parseFloat(e.longitude), latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
    // Scroll list to this event
    const idx = nearby.findIndex((n) => n.id === e.id);
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  }, [nearby]);

  const onListPress = useCallback((e) => {
    setSelectedId(e.id);
    if (e.latitude && e.longitude) mapRef.current?.animateToRegion({ latitude: parseFloat(e.latitude) - 0.005, longitude: parseFloat(e.longitude), latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
  }, []);

  const refreshArea = () => {
    setError(null);
    dispatch(fetchNearbyEvents({ lat: region.latitude, lng: region.longitude, radius_km: 50 }))
      .unwrap()
      .catch(() => setError('No se pudieron cargar las cenas'));
  };

  const formatDistance = (km) => {
    if (km == null) return '';
    if (km < 1) return `a ${km.toFixed(1)} km`;
    return `a ${Math.round(km)} km`;
  };

  const renderItem = ({ item }) => {
    const isSelected = item.id === selectedId;
    const hostInitial = (item.host_name || 'C')[0].toUpperCase();
    const dist = formatDistance(item.distance_km);
    return (
      <Pressable
        style={[st.listRow, isSelected && st.listRowSelected]}
        onPress={() => onListPress(item)}
      >
        <View style={st.listLeft}>
          <Text style={[st.listPrice, isSelected && st.listPriceSelected]}>€{parseFloat(item.price_per_person || 0).toFixed(0)}</Text>
        </View>
        <View style={st.listBody}>
          <Text style={st.listTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={st.listMeta}>
            {getCuisine(item)} · {item.city} · {getSpots(item)} plazas{dist ? ` · ${dist}` : ''}
          </Text>
        </View>
        <View style={st.listActions}>
          <Pressable style={st.listChefBtn} onPress={() => navigation.navigate('ChefProfile', { userId: item.host_id, userName: item.host_name })}>
            <View style={st.listChefAvatar}>
              <Text style={st.listChefInitial}>{hostInitial}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('EventDetailFromMap', { eventId: item.id })}>
            <Text style={st.listLink}>VER →</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={st.container}>
      {/* Mapa — mitad superior */}
      <View style={st.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={!locDenied}
          showsMyLocationButton={false}
          customMapStyle={MAP_STYLE}
        >
          {nearby.map((e) =>
            e.latitude && e.longitude ? (
              <Marker key={e.id} coordinate={{ latitude: parseFloat(e.latitude), longitude: parseFloat(e.longitude) }} onPress={() => onMarker(e)}>
                <PricePin price={parseFloat(e.price_per_person || 0).toFixed(0)} dark={selectedId === e.id} />
              </Marker>
            ) : null
          )}
        </MapView>

        {/* Header + search */}
        <SafeAreaView edges={['top']} style={st.headerWrap}>
          <View style={st.header}>
            <View style={st.headerTop}>
              <Text style={st.headerKicker}>
                {locDenied ? 'Ubicación no disponible' : `Mapa — ${nearby.length} cenas`}
              </Text>
              <Pressable onPress={refreshArea}>
                <Text style={st.headerAction}>Actualizar</Text>
              </Pressable>
            </View>
            <View style={st.searchRow}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={st.searchInput}
                value={cityQuery}
                onChangeText={setCityQuery}
                placeholder="Buscar ciudad..."
                placeholderTextColor={colors.placeholder}
                returnKeyType="search"
                onSubmitEditing={searchCity}
              />
              {searching ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : cityQuery.length > 0 ? (
                <Pressable onPress={searchCity}>
                  <Text style={st.searchGo}>IR</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </SafeAreaView>

        {/* Buscar en esta zona */}
        <Pressable style={st.searchArea} onPress={refreshArea}>
          <Text style={st.searchAreaText}>↻ Buscar en esta zona</Text>
        </Pressable>

        {/* Mi ubicación */}
        {userLoc && (
          <Pressable style={st.myLocBtn} onPress={() => mapRef.current?.animateToRegion(userLoc, 500)}>
            <Ionicons name="locate-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {/* Lista inferior — siempre visible */}
      <View style={st.listWrap}>
        <View style={st.listHeader}>
          <Text style={st.listHeaderTitle}>Cerca de ti</Text>
          <Text style={st.listHeaderCount}>{nearby.length} cenas</Text>
        </View>

        {isLoading && nearby.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : nearby.length === 0 ? (
          <View style={st.emptyList}>
            <Ionicons name="restaurant-outline" size={24} color={colors.textMuted} />
            <Text style={st.emptyText}>Sin cenas cerca. Mueve el mapa y pulsa "Buscar en esta zona".</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={nearby}
            keyExtractor={(e) => e.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.listContent}
            onScrollToIndexFailed={() => {}}
          />
        )}
      </View>
    </View>
  );
};

export default MapScreen;

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EBE3D3' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#1A1613' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F1EADD' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#F1EADD' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DDD4C0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E3DBC8' }] },
];

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Map
  mapWrap: { flex: 1 },

  // Pins
  pin: { alignItems: 'center' },
  pinLabel: { backgroundColor: colors.accent, borderRadius: radius.xs, paddingVertical: spacing.xxs + 1, paddingHorizontal: spacing.xs },
  pinLabelDark: { backgroundColor: colors.textPrimary },
  pinText: { ...typography.labelSm, fontSize: 9, color: colors.onAccent, letterSpacing: 0.6 },
  pinStem: { width: borders.medium, height: sizes.pinStem, backgroundColor: colors.accent },
  pinStemDark: { backgroundColor: colors.textPrimary },

  // Header
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.background, borderBottomWidth: borders.hairline, borderBottomColor: colors.border },
  header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerKicker: { ...typography.label, color: colors.textMuted },
  headerAction: {
    ...typography.label, fontSize: 10, color: colors.textPrimary, letterSpacing: 1.2,
    borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: spacing.xxs / 2,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.border,
    marginTop: spacing.xs, paddingVertical: spacing.xxs,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.textPrimary, paddingVertical: spacing.xxs },
  searchGo: { ...typography.button, fontSize: 10, color: colors.accent, letterSpacing: 1 },

  // Search
  searchArea: { position: 'absolute', bottom: spacing.md, alignSelf: 'center' },
  searchAreaText: {
    ...typography.button, color: colors.textPrimary,
    borderWidth: borders.medium, borderColor: colors.border, borderRadius: radius.xs,
    backgroundColor: colors.background,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md, overflow: 'hidden',
  },

  // My location
  myLocBtn: {
    position: 'absolute', bottom: spacing.md, right: spacing.xl,
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.background, borderWidth: borders.hairline, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },

  // List
  listWrap: {
    backgroundColor: colors.background,
    borderTopWidth: borders.medium, borderTopColor: colors.border,
    maxHeight: '45%',
  },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xs,
  },
  listHeaderTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  listHeaderCount: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  listContent: { paddingBottom: spacing.tabBarBottom },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  listRowSelected: { backgroundColor: colors.surface },

  listLeft: { width: 44, alignItems: 'center' },
  listPrice: { ...typography.price, fontSize: 13, color: colors.accent, letterSpacing: 0 },
  listPriceSelected: { color: colors.textPrimary },

  listBody: { flex: 1, minWidth: 0 },
  listTitle: { ...typography.dinnerTitle, fontSize: 16, color: colors.textPrimary },
  listMeta: { ...typography.body, fontSize: 11, color: colors.textMuted, marginTop: 1 },

  listActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listChefBtn: {},
  listChefAvatar: {
    width: 30, height: 30, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  listChefInitial: { ...typography.labelSm, fontSize: 11, color: colors.onAccent, letterSpacing: 0 },
  listLink: {
    ...typography.label, fontSize: 9, color: colors.textPrimary, letterSpacing: 1,
    borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: 1,
  },

  emptyList: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
