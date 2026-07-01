// MapScreen.js — Rediseño editorial: mapa con pines bermellón + hoja inferior
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Platform,
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
import { formatDistance, getDistanceKm } from '../utils/geo';

const BOTTOM_PANEL = 260;

const getCuisine = (e) => {
  try { const c = typeof e.cuisine_type === 'string' ? JSON.parse(e.cuisine_type) : e.cuisine_type; return Array.isArray(c) ? c[0] : c; } catch { return ''; }
};
const getSpots = (e) => Math.max(0, (e.max_guests || 0) - (e.confirmed_guests || 0));

// ─── Custom marker ───
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
  const mapRef = useRef(null);
  const [region, setRegion] = useState({ latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.09, longitudeDelta: 0.04 });
  const [userLoc, setUserLoc] = useState(null);
  const [selected, setSelected] = useState(null);
  const panelY = useRef(new Animated.Value(BOTTOM_PANEL)).current;

  useEffect(() => {
    dispatch(fetchNearbyEvents({ lat: region.latitude, lng: region.longitude, radiusKm: 20 }));
  }, [dispatch]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.09, longitudeDelta: 0.04 };
        setRegion(coords);
        setUserLoc(coords);
      }
    })();
  }, []);

  const onMarker = useCallback((e) => {
    setSelected(e);
    Animated.spring(panelY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
    if (e.latitude && e.longitude) mapRef.current?.animateToRegion({ latitude: e.latitude - 0.01, longitude: e.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 400);
  }, [panelY]);

  const closePanel = () => {
    Animated.spring(panelY, { toValue: BOTTOM_PANEL, useNativeDriver: true }).start(() => setSelected(null));
  };

  const refreshArea = () => dispatch(fetchNearbyEvents({ lat: region.latitude, lng: region.longitude, radiusKm: 20 }));

  return (
    <View style={st.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
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

      {/* Header editorial */}
      <SafeAreaView edges={['top']} style={st.headerWrap}>
        <View style={st.header}>
          <View style={st.headerTop}>
            <Text style={st.headerKicker}>Mapa — {nearby.length} cenas</Text>
            <Pressable onPress={refreshArea}>
              <Text style={st.headerAction}>Actualizar</Text>
            </Pressable>
          </View>
          <Text style={st.headerTitle}>{nearby.length} cenas cerca de ti</Text>
        </View>
      </SafeAreaView>

      {/* Buscar en esta zona */}
      <Pressable style={st.searchArea} onPress={refreshArea}>
        <Text style={st.searchAreaText}>↻ Buscar en esta zona</Text>
      </Pressable>

      {/* Mi ubicación */}
      {userLoc && (
        <Pressable style={st.myLocBtn} onPress={() => mapRef.current?.animateToRegion(userLoc, 500)}>
          <Ionicons name="locate-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      )}

      {/* Panel inferior */}
      {selected && (
        <Animated.View style={[st.sheet, { transform: [{ translateY: panelY }] }]}>
          <View style={st.handle} />
          <Pressable style={st.sheetClose} onPress={closePanel}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => { closePanel(); navigation.navigate('EventDetail', { eventId: selected.id }); }}>
            <Text style={st.sheetOverline}>{getCuisine(selected)} · {selected.city}</Text>
            <Text style={st.sheetTitle}>{selected.title}</Text>
            <Text style={st.sheetMeta} numberOfLines={2}>{selected.description}</Text>
            <View style={st.sheetFooter}>
              <Text style={st.sheetPrice}>€{parseFloat(selected.price_per_person || 0).toFixed(0)} · {getSpots(selected)} plazas</Text>
              <Text style={st.sheetLink}>VER MESA →</Text>
            </View>
          </Pressable>
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
    position: 'absolute', bottom: BOTTOM_PANEL + spacing.xl, right: spacing.xl,
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.background, borderWidth: borders.hairline, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },

  // Bottom sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background, borderTopWidth: borders.hairline, borderTopColor: colors.border,
    padding: spacing.xl, paddingBottom: spacing.xxxl,
  },
  handle: {
    width: sizes.handleW, height: sizes.handleH, borderRadius: radius.pill,
    backgroundColor: colors.scrim, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetClose: { position: 'absolute', top: spacing.sm, right: spacing.xl },
  sheetOverline: { ...typography.label, color: colors.accent, letterSpacing: 1.8, marginBottom: spacing.xs },
  sheetTitle: { ...typography.dinnerTitle, fontSize: 22, color: colors.textPrimary, marginBottom: spacing.xs },
  sheetMeta: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  sheetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sheetPrice: { ...typography.price, color: colors.textMuted, letterSpacing: 1 },
  sheetLink: {
    ...typography.price, color: colors.textPrimary,
    borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: spacing.xxs / 2,
  },
});
