// MapScreen.js — Mapa con pines bermellón, chef info en bottom sheet, estados vacío/error
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { fetchNearbyEvents, selectNearbyEvents, selectEventsLoading } from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

const BOTTOM_PANEL = 300;
const DEFAULT_REGION = { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.09, longitudeDelta: 0.04 };

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
  const user = useSelector(selectUser);
  const mapRef = useRef(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [userLoc, setUserLoc] = useState(null);
  const [locDenied, setLocDenied] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const panelY = useRef(new Animated.Value(BOTTOM_PANEL)).current;

  // Request location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocDenied(true);
        dispatch(fetchNearbyEvents({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude, radius_km: 20 }));
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.09, longitudeDelta: 0.04 };
        setRegion(coords);
        setUserLoc(coords);
        dispatch(fetchNearbyEvents({ lat: coords.latitude, lng: coords.longitude, radius_km: 20 }));
      } catch {
        setLocDenied(true);
        dispatch(fetchNearbyEvents({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude, radius_km: 20 }));
      }
    })();
  }, [dispatch]);

  const onMarker = useCallback((e) => {
    setSelected(e);
    Animated.spring(panelY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
    if (e.latitude && e.longitude) mapRef.current?.animateToRegion({ latitude: parseFloat(e.latitude) - 0.008, longitude: parseFloat(e.longitude), latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
  }, [panelY]);

  const closePanel = () => {
    Animated.spring(panelY, { toValue: BOTTOM_PANEL, useNativeDriver: true }).start(() => setSelected(null));
  };

  const refreshArea = () => {
    setError(null);
    dispatch(fetchNearbyEvents({ lat: region.latitude, lng: region.longitude, radius_km: 20 }))
      .unwrap()
      .catch(() => setError('No se pudieron cargar las cenas'));
  };

  const goToChef = (event) => {
    closePanel();
    navigation.navigate('ChefProfile', { userId: event.host_id, userName: event.host_name });
  };

  const hostInitial = (selected?.host_name || '?')[0].toUpperCase();

  return (
    <View style={st.container}>
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
              <PricePin price={parseFloat(e.price_per_person || 0).toFixed(0)} dark={selected?.id === e.id} />
            </Marker>
          ) : null
        )}
      </MapView>

      {/* Header */}
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
          <Text style={st.headerTitle}>
            {nearby.length > 0 ? `${nearby.length} cenas cerca de ti` : 'Cenas cerca de ti'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Location denied banner */}
      {locDenied && (
        <View style={st.banner}>
          <Ionicons name="location-outline" size={14} color={colors.accent} />
          <Text style={st.bannerText}>Mostrando cenas en Madrid. Activa la ubicación para ver las tuyas.</Text>
        </View>
      )}

      {/* Loading */}
      {isLoading && nearby.length === 0 && (
        <View style={st.centerOverlay}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      {/* Empty state */}
      {!isLoading && nearby.length === 0 && !error && (
        <View style={st.emptyCard}>
          <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
          <Text style={st.emptyTitle}>Sin cenas cerca</Text>
          <Text style={st.emptyBody}>No hay cenas publicadas en esta zona. Prueba a buscar en otra.</Text>
          <Pressable onPress={refreshArea}>
            <Text style={st.emptyAction}>BUSCAR AQUÍ →</Text>
          </Pressable>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={st.emptyCard}>
          <Text style={st.emptyTitle}>Error de conexión</Text>
          <Text style={st.emptyBody}>{error}</Text>
          <Pressable onPress={refreshArea}>
            <Text style={st.emptyAction}>REINTENTAR →</Text>
          </Pressable>
        </View>
      )}

      {/* Search area */}
      {!selected && nearby.length > 0 && (
        <Pressable style={st.searchArea} onPress={refreshArea}>
          <Text style={st.searchAreaText}>↻ Buscar en esta zona</Text>
        </Pressable>
      )}

      {/* My location */}
      {userLoc && (
        <Pressable style={st.myLocBtn} onPress={() => mapRef.current?.animateToRegion(userLoc, 500)}>
          <Ionicons name="locate-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      )}

      {/* Bottom sheet */}
      {selected && (
        <Animated.View style={[st.sheet, { transform: [{ translateY: panelY }] }]}>
          <View style={st.handle} />
          <Pressable style={st.sheetClose} onPress={closePanel}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>

          {/* Event info */}
          <Pressable onPress={() => { closePanel(); navigation.navigate('EventDetailFromMap', { eventId: selected.id }); }}>
            <Text style={st.sheetOverline}>{getCuisine(selected)} · {selected.city}</Text>
            <Text style={st.sheetTitle}>{selected.title}</Text>
            <Text style={st.sheetMeta} numberOfLines={2}>{selected.description}</Text>
          </Pressable>

          <View style={st.sheetDivider} />

          {/* Chef row */}
          <View style={st.chefRow}>
            <View style={st.chefAvatar}>
              <Text style={st.chefAvatarText}>{hostInitial}</Text>
            </View>
            <View style={st.chefInfo}>
              <Text style={st.chefName}>{selected.host_name || 'Chef'}</Text>
              <Text style={st.chefLabel}>Anfitrión</Text>
            </View>
            <Pressable style={st.chefBtn} onPress={() => goToChef(selected)}>
              <Text style={st.chefBtnText}>Ver perfil</Text>
            </Pressable>
          </View>

          <View style={st.sheetDivider} />

          {/* Footer */}
          <View style={st.sheetFooter}>
            <Text style={st.sheetPrice}>€{parseFloat(selected.price_per_person || 0).toFixed(0)} · {getSpots(selected)} plazas</Text>
            <Pressable onPress={() => { closePanel(); navigation.navigate('EventDetailFromMap', { eventId: selected.id }); }}>
              <Text style={st.sheetLink}>VER MESA →</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
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
  container: { flex: 1, backgroundColor: colors.surfaceAlt },

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
  headerTitle: { ...typography.sectionTitleSm, color: colors.textPrimary, marginTop: spacing.xs },

  // Banner
  banner: {
    position: 'absolute', top: Platform.OS === 'ios' ? 130 : 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.background, borderRadius: radius.xs,
    borderWidth: borders.hairline, borderColor: colors.border,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    maxWidth: '85%',
  },
  bannerText: { ...typography.body, fontSize: 11, color: colors.textMuted, flexShrink: 1 },

  // Overlays
  centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  emptyCard: {
    position: 'absolute', bottom: '30%', alignSelf: 'center',
    backgroundColor: colors.background, borderRadius: radius.sm,
    borderWidth: borders.medium, borderColor: colors.border,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    maxWidth: '80%',
  },
  emptyTitle: { ...typography.dinnerTitle, color: colors.textPrimary, textAlign: 'center' },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptyAction: {
    ...typography.button, color: colors.textPrimary, letterSpacing: 1.2,
    borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: 1, marginTop: spacing.xs,
  },

  // Search area
  searchArea: { position: 'absolute', top: Platform.OS === 'ios' ? 140 : 110, alignSelf: 'center' },
  searchAreaText: {
    ...typography.button, color: colors.textPrimary,
    borderWidth: borders.medium, borderColor: colors.border, borderRadius: radius.xs,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm - 1, paddingHorizontal: spacing.md, overflow: 'hidden',
  },

  // My location
  myLocBtn: {
    position: 'absolute', bottom: spacing.xxxl + spacing.xl, right: spacing.xl,
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.background, borderWidth: borders.hairline, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },

  // Bottom sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background, borderTopWidth: borders.hairline, borderTopColor: colors.border,
    padding: spacing.xl, paddingBottom: spacing.xxxl + spacing.md,
  },
  handle: {
    width: sizes.handleW, height: sizes.handleH, borderRadius: radius.pill,
    backgroundColor: colors.scrim, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetClose: { position: 'absolute', top: spacing.sm, right: spacing.xl, zIndex: 1 },
  sheetOverline: { ...typography.label, color: colors.accent, letterSpacing: 1.8, marginBottom: spacing.xs },
  sheetTitle: { ...typography.dinnerTitle, fontSize: 22, color: colors.textPrimary, marginBottom: spacing.xs },
  sheetMeta: { ...typography.body, color: colors.textMuted },
  sheetDivider: { height: borders.hairline, backgroundColor: colors.borderHairline, marginVertical: spacing.md },

  // Chef row
  chefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chefAvatar: {
    width: sizes.avatar, height: sizes.avatar, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  chefAvatarText: { ...typography.dinnerTitle, color: colors.onAccent },
  chefInfo: { flex: 1 },
  chefName: { ...typography.dinnerTitle, color: colors.textPrimary },
  chefLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  chefBtn: {
    borderWidth: borders.medium, borderColor: colors.border, borderRadius: radius.xs,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
  },
  chefBtnText: { ...typography.button, fontSize: 10, color: colors.textPrimary, letterSpacing: 1 },

  // Footer
  sheetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sheetPrice: { ...typography.price, color: colors.textMuted, letterSpacing: 1 },
  sheetLink: {
    ...typography.price, color: colors.textPrimary,
    borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: spacing.xxs / 2,
  },
});
