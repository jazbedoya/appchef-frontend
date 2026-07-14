// CreateEventScreen.js — Wizard 2 pasos: "Tu cena" + "Cuándo y cuánto"
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Image, Modal, FlatList,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format, setHours, setMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';

import { selectUser } from '../store/authSlice';
import { reservationApi } from '../services/api';
import { hapticSuccess, hapticSelection } from '../lib/haptics';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography, fonts } from '../theme/typography';
import StepHeader from '../components/StepHeader';
import Field from '../components/Field';
import Chip from '../components/Chip';
import Stepper from '../components/Stepper';
import PrimaryButton from '../components/PrimaryButton';
import BackButton from '../components/BackButton';
import { CUISINES, CUISINE_IMAGES } from '../constants/cuisines';

const ALERGENOS = ['Gluten', 'Lácteos', 'Frutos secos', 'Mariscos', 'Sin restricciones'];
const TODAY = format(new Date(), 'yyyy-MM-dd');

const CAL_THEME = {
  calendarBackground: colors.background,
  dayTextColor: colors.textPrimary,
  textDisabledColor: colors.placeholder,
  monthTextColor: colors.textPrimary,
  textMonthFontFamily: fonts.serifMedium,
  textMonthFontSize: 20,
  textDayHeaderFontFamily: fonts.mono,
  textDayHeaderFontSize: 10,
  textDayFontFamily: fonts.sans,
  textDayFontSize: 15,
  todayTextColor: colors.accent,
  selectedDayBackgroundColor: colors.accent,
  selectedDayTextColor: colors.onAccent,
  arrowColor: colors.textPrimary,
};

// ─── Nominatim geocoding (free, no API key) ───
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
let _searchTimer = null;

export default function CreateEventScreen({ navigation }) {
  const user = useSelector(selectUser);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  // Step 1 — Tu cena
  const [title, setTitle] = useState('');
  const [cocinas, setCocinas] = useState([]);  // multi-select
  const [coverImage, setCoverImage] = useState(null);
  const [description, setDescription] = useState('');
  const [showDesc, setShowDesc] = useState(false);

  // Location
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null); // { display, lat, lng, city, road }
  const [addressLine2, setAddressLine2] = useState(''); // piso, puerta
  const [locationHint, setLocationHint] = useState(''); // indicaciones

  // Step 2 — Cuándo y cuánto
  const [selectedDate, setSelectedDate] = useState(format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const [timeInput, setTimeInput] = useState('21:00');
  const [plazas, setPlazas] = useState(6);
  const [price, setPrice] = useState('');
  const [alergeno, setAlergeno] = useState('Sin restricciones');

  // Validation state
  const [touched, setTouched] = useState({});

  // Computed
  const eventDate = setMinutes(setHours(parse(selectedDate, 'yyyy-MM-dd', new Date()), hour), minute);
  const formattedDate = format(
    parse(selectedDate, 'yyyy-MM-dd', new Date()),
    "EEEE, d 'de' MMMM",
    { locale: es }
  );

  const MIN_PRICE = 5;
  const priceNum = parseFloat(price) || 0;
  const serviceFee = Math.max(priceNum * 0.10, 2);
  const guestTotal = priceNum + serviceFee;

  const step1Valid = title.trim().length > 0 && cocinas.length > 0 && selectedAddress;
  const step2Valid = priceNum >= MIN_PRICE;

  // ─── Cuisine toggle (multi-select) ───
  const toggleCocina = (c) => {
    hapticSelection();
    setCocinas(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  // ─── Address search (Nominatim) ───
  const searchAddress = useCallback((text) => {
    setAddressQuery(text);
    setSelectedAddress(null);
    clearTimeout(_searchTimer);
    if (text.trim().length < 3) { setAddressSuggestions([]); return; }
    _searchTimer = setTimeout(async () => {
      setSearchingAddress(true);
      try {
        const q = encodeURIComponent(text);
        const res = await fetch(
          `${NOMINATIM_URL}/search?q=${q}&format=json&addressdetails=1&limit=5&countrycodes=es`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data = await res.json();
        setAddressSuggestions(data.map(r => ({
          display: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          city: r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || '',
          road: r.address?.road ? `${r.address.road}${r.address.house_number ? ` ${r.address.house_number}` : ''}` : r.display_name.split(',')[0],
          postcode: r.address?.postcode || '',
          state: r.address?.state || '',
        })));
      } catch { setAddressSuggestions([]); }
      setSearchingAddress(false);
    }, 400); // debounce
  }, []);

  const selectAddress = (suggestion) => {
    setSelectedAddress(suggestion);
    setAddressQuery(suggestion.road);
    setAddressSuggestions([]);
  };

  // Time sync
  const syncTimeFromInput = (text) => {
    setTimeInput(text);
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) { setHour(h); setMinute(m); }
    }
  };

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCoverImage(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
    }
  };

  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep(1);
  };

  const goNext = () => {
    setTouched({ title: true, cocina: true, address: true });
    if (!step1Valid) return;
    setStep(2);
  };

  const publish = async () => {
    setTouched((p) => ({ ...p, price: true }));
    if (!step2Valid) {
      Alert.alert('Revisa el formulario', priceNum < MIN_PRICE ? `El precio mínimo es €${MIN_PRICE} por persona.` : 'Completa todos los campos obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || title.trim(),
        cuisine_type: cocinas,
        dining_style: 'dinner',
        event_date: eventDate.toISOString(),
        max_guests: plazas,
        price_per_person: parseFloat(price),
        menu: { courses: [], notes: null },
        dietary_options: [alergeno],
        city: selectedAddress.city,
        address_line1: selectedAddress.road,
        address_line2: addressLine2.trim() || null,
        country: 'ES',
        latitude: selectedAddress.lat,
        longitude: selectedAddress.lng,
        location_hint: locationHint.trim() || null,
        host_name: user?.profile?.first_name
          ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
          : user?.username || 'Chef',
        cover_image_url: coverImage || null,
      };
      const res = await reservationApi.post('/events', body);
      await reservationApi.post(`/events/${res.data.id}/publish`);
      hapticSuccess();
      Alert.alert('¡Publicada!', 'Tu cena ya está en cartelera.', [
        { text: 'Ver inicio', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.userMessage || 'No se pudo publicar');
    }
    setSaving(false);
  };

  const previewImage = coverImage || CUISINE_IMAGES[cocinas[0]] || CUISINE_IMAGES.Española;
  const hostName = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
    : user?.username || 'Chef';

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <StepHeader step={step} total={2} stepLabel={step === 1 ? 'Tu cena' : 'Cuándo y cuánto'} onBack={goBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">

          {/* ── PASO 1: Tu cena ── */}
          {step === 1 && (
            <>
              {/* Foto */}
              <Pressable style={st.photoPicker} onPress={pickImage}>
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={st.photoImg} resizeMode="cover" />
                ) : (
                  <View style={st.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                    <Text style={st.photoHint}>AÑADIR FOTO</Text>
                    <Text style={st.photoSub}>Un plato, tu mesa puesta o tu cocina</Text>
                  </View>
                )}
                <View style={st.photoOverlay}>
                  <Ionicons name="camera" size={14} color={colors.onAccent} />
                </View>
              </Pressable>

              <Field
                label="Nombre de la cena *"
                placeholder="Ej: Noche de Pasta Clandestina"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
                error={touched.title && !title.trim() ? 'Obligatorio' : null}
              />

              {/* Cocinas — multi-select, scroll horizontal */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Tipo de cocina * {cocinas.length > 0 && `(${cocinas.length})`}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipsScroll}>
                  {CUISINES.map((c) => (
                    <Chip key={c} label={c} selected={cocinas.includes(c)} onPress={() => toggleCocina(c)} />
                  ))}
                </ScrollView>
                {touched.cocina && cocinas.length === 0 && (
                  <Text style={st.errorText}>Elige al menos un tipo</Text>
                )}
              </View>

              {/* Dirección con autocompletado */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Dirección *</Text>
                <View style={st.addressInputRow}>
                  <Ionicons name="search" size={16} color={colors.textMuted} />
                  <TextInput
                    style={st.addressInput}
                    placeholder="Busca tu dirección..."
                    placeholderTextColor={colors.placeholder}
                    value={addressQuery}
                    onChangeText={searchAddress}
                    autoCapitalize="sentences"
                  />
                  {searchingAddress && <ActivityIndicator size="small" color={colors.accent} />}
                </View>
                {touched.address && !selectedAddress && (
                  <Text style={st.errorText}>Selecciona una dirección de la lista</Text>
                )}

                {/* Suggestions dropdown */}
                {addressSuggestions.length > 0 && (
                  <View style={st.suggestionsBox}>
                    {addressSuggestions.map((s, i) => (
                      <Pressable key={i} style={st.suggestionRow} onPress={() => selectAddress(s)}>
                        <Ionicons name="location-outline" size={16} color={colors.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={st.suggestionMain} numberOfLines={1}>{s.road}</Text>
                          <Text style={st.suggestionSub} numberOfLines={1}>{s.city}{s.state ? `, ${s.state}` : ''}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Selected address confirmation */}
                {selectedAddress && (
                  <View style={st.selectedAddr}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.selectedAddrText}>{selectedAddress.road}</Text>
                      <Text style={st.selectedAddrCity}>{selectedAddress.city}{selectedAddress.postcode ? ` · ${selectedAddress.postcode}` : ''}</Text>
                    </View>
                    <Pressable onPress={() => { setSelectedAddress(null); setAddressQuery(''); }} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Piso / Puerta */}
              <Field
                label="Piso, puerta, escalera"
                placeholder="Ej: 3º izq, Portal B"
                value={addressLine2}
                onChangeText={setAddressLine2}
                autoCapitalize="sentences"
              />

              {/* Indicaciones */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Indicaciones para llegar</Text>
                <TextInput
                  style={st.textarea}
                  placeholder="Ej: Portal azul, el timbre no va, llamadme al llegar"
                  placeholderTextColor={colors.placeholder}
                  value={locationHint}
                  onChangeText={setLocationHint}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={st.hintNote}>Solo visible para comensales confirmados</Text>
              </View>

              {/* Descripción */}
              {!showDesc ? (
                <Pressable style={st.addDescBtn} onPress={() => setShowDesc(true)}>
                  <Ionicons name="add" size={16} color={colors.accent} />
                  <Text style={st.addDescText}>Añadir descripción</Text>
                  <Text style={st.addDescHint}>Cuenta qué hace especial tu cena</Text>
                </Pressable>
              ) : (
                <View style={st.block}>
                  <Text style={st.sectionLabel}>Descripción · vende tu cena</Text>
                  <TextInput
                    style={st.textarea}
                    placeholder="Una velada íntima con los mejores platos de temporada..."
                    placeholderTextColor={colors.placeholder}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </>
          )}

          {/* ── PASO 2: Cuándo y cuánto ── */}
          {step === 2 && (
            <>
              {/* Fecha */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Fecha *</Text>
                <Pressable style={st.dateBtn} onPress={() => setShowCalendar(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                  <Text style={st.dateBtnText}>{formattedDate}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Hora */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Hora *</Text>
                <View style={st.timeRow}>
                  <Ionicons name="time-outline" size={18} color={colors.accent} />
                  <TextInput
                    style={st.timeInput}
                    value={timeInput}
                    onChangeText={syncTimeFromInput}
                    placeholder="21:00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text style={st.timeHint}>formato 24h</Text>
                </View>
              </View>

              {/* Plazas */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Plazas *</Text>
                <Stepper value={plazas} min={2} max={20} onChange={setPlazas} note={`${plazas} comensales`} />
              </View>

              {/* Precio */}
              <Field
                label="Precio por persona * (mín. €5)"
                placeholder="25"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                error={touched.price && priceNum < MIN_PRICE ? `Mínimo €${MIN_PRICE} por persona` : null}
              />
              {priceNum >= MIN_PRICE && (
                <View style={st.feeBreakdown}>
                  <Text style={st.feeRow}>Tú pones: €{priceNum.toFixed(0)} → recibes €{priceNum.toFixed(0)} íntegros</Text>
                  <Text style={st.feeRow}>El comensal paga: €{guestTotal.toFixed(2)} (con gastos de servicio)</Text>
                </View>
              )}

              {/* Alérgenos */}
              <View style={st.block}>
                <Text style={st.sectionLabel}>Alérgenos · opcional</Text>
                <View style={st.chips}>
                  {ALERGENOS.map((a) => <Chip key={a} label={a} selected={alergeno === a} onPress={() => setAlergeno(a)} />)}
                </View>
              </View>

              {/* Preview en vivo */}
              <View style={st.previewSection}>
                <Text style={st.kicker}>Así la verán tus invitados</Text>
                <View style={st.previewCard}>
                  <Image source={{ uri: previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={st.previewScrim} />
                  <View style={st.previewBody}>
                    <Text style={st.previewHost}>POR {hostName.toUpperCase()}</Text>
                    <Text style={st.previewCat}>{cocinas.join(' · ') || 'Cocina'}{selectedAddress?.city ? ` · ${selectedAddress.city}` : ''}</Text>
                    <Text style={st.previewTitle} numberOfLines={2}>{title || 'Tu cena'}</Text>
                    <View style={st.previewFooter}>
                      <Text style={st.previewMeta}>
                        €{priceNum > 0 ? guestTotal.toFixed(0) : '0'} · {plazas} plazas · {formattedDate}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={st.bottomBar}>
        {step > 1 && <BackButton onPress={goBack} />}
        {step === 1 ? (
          <PrimaryButton label="Siguiente →" onPress={goNext} style={!step1Valid ? { opacity: 0.5 } : undefined} />
        ) : (
          <PrimaryButton
            label={saving ? '' : 'Publicar cena'}
            variant="dark"
            onPress={publish}
            style={(saving || !step2Valid) ? { opacity: 0.5 } : undefined}
          />
        )}
        {saving && <ActivityIndicator color={colors.onAccent} style={st.savingSpinner} />}
      </View>

      {/* Calendar modal */}
      <Modal visible={showCalendar} animationType="fade" transparent onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={st.calOverlay} onPress={() => setShowCalendar(false)}>
          <Pressable style={st.calCard} onPress={() => {}}>
            <Calendar
              theme={CAL_THEME}
              minDate={TODAY}
              markedDates={{ [selectedDate]: { selected: true } }}
              onDayPress={(day) => { setSelectedDate(day.dateString); setShowCalendar(false); }}
              firstDay={1}
              enableSwipeMonths
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  block: { marginBottom: spacing.lg },
  sectionLabel: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1.6, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chipsScroll: { gap: spacing.xs, paddingRight: spacing.md },
  kicker: { ...typography.label, fontSize: 10, color: colors.accent, letterSpacing: 1.6, marginBottom: spacing.sm },
  errorText: { ...typography.body, color: colors.accent, fontSize: 11, marginTop: spacing.xxs },

  // Photo picker
  photoPicker: {
    height: 180, borderRadius: radius.xs, overflow: 'hidden',
    marginBottom: spacing.lg, position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: colors.imagePlaceholder,
    alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
  },
  photoHint: { ...typography.label, color: colors.textMuted, letterSpacing: 1.2, fontSize: 9 },
  photoSub: { ...typography.body, color: colors.textMuted, fontSize: 11, marginTop: 2 },
  photoOverlay: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    width: 30, height: 30, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },

  // Address search
  addressInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderBottomWidth: borders.medium, borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
  },
  addressInput: {
    ...typography.body, color: colors.textPrimary, flex: 1, fontSize: 14,
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : 0,
  },
  suggestionsBox: {
    backgroundColor: colors.surface, borderWidth: borders.hairline, borderColor: colors.borderHairline,
    marginTop: spacing.xxs,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  suggestionMain: { ...typography.body, color: colors.textPrimary, fontSize: 13 },
  suggestionSub: { ...typography.label, color: colors.textMuted, fontSize: 10, letterSpacing: 0 },
  selectedAddr: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.sm, padding: spacing.sm,
    backgroundColor: 'rgba(76,175,80,0.08)',
  },
  selectedAddrText: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 14 },
  selectedAddrCity: { ...typography.label, color: colors.textMuted, fontSize: 10, letterSpacing: 0 },
  hintNote: { ...typography.label, color: colors.textMuted, fontSize: 9, letterSpacing: 0, marginTop: spacing.xxs, fontStyle: 'italic' },

  // Add description
  addDescBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap',
    marginBottom: spacing.lg, paddingVertical: spacing.sm,
  },
  addDescText: { ...typography.label, color: colors.accent, letterSpacing: 1.2, fontSize: 10 },
  addDescHint: { ...typography.body, color: colors.textMuted, fontSize: 11, width: '100%', marginTop: 2 },

  // Textarea
  textarea: {
    ...typography.body, color: colors.textPrimary,
    borderWidth: borders.hairline, borderColor: colors.borderHairline,
    padding: spacing.sm, minHeight: 80, fontSize: 14,
  },

  // Fee breakdown
  feeBreakdown: { marginTop: -spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.xxs },
  feeRow: { ...typography.body, color: colors.textMuted, fontSize: 11, lineHeight: 18 },

  // Date button
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderBottomWidth: borders.medium, borderBottomColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xxs,
  },
  dateBtnText: { ...typography.input, color: colors.textPrimary, flex: 1 },

  // Time input
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeInput: {
    ...typography.numeral, color: colors.textPrimary,
    borderBottomWidth: borders.medium, borderBottomColor: colors.border,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs,
    minWidth: 80, textAlign: 'center',
  },
  timeHint: { ...typography.label, color: colors.placeholder, letterSpacing: 1 },

  // Calendar modal
  calOverlay: {
    flex: 1, backgroundColor: 'rgba(26,22,19,0.4)',
    justifyContent: 'center', paddingHorizontal: spacing.xl,
  },
  calCard: {
    backgroundColor: colors.background, borderRadius: radius.sm,
    overflow: 'hidden', borderWidth: borders.medium, borderColor: colors.border,
  },

  // Preview card
  previewSection: { marginTop: spacing.md },
  previewCard: {
    height: sizes.featuredCardH, borderRadius: radius.xs,
    overflow: 'hidden', backgroundColor: colors.imagePlaceholder,
    justifyContent: 'flex-end',
  },
  previewScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%',
    backgroundColor: colors.cardScrim,
  },
  previewBody: { padding: spacing.md },
  previewHost: { ...typography.label, fontSize: 10, color: colors.accent, letterSpacing: 2.5, marginBottom: spacing.xs },
  previewCat: { ...typography.labelSm, fontSize: 9, color: colors.onDarkMuted, letterSpacing: 1.6, marginBottom: spacing.xs },
  previewTitle: { ...typography.coverTitle, fontSize: 26, lineHeight: 28, color: colors.onDark, marginBottom: spacing.sm },
  previewFooter: {
    borderTopWidth: borders.hairline, borderTopColor: colors.onDarkHairline,
    paddingTop: spacing.sm,
  },
  previewMeta: { ...typography.price, color: colors.onDarkMuted, letterSpacing: 0.8 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.tabBarBottom,
    borderTopWidth: borders.hairline, borderTopColor: colors.border, backgroundColor: colors.background,
  },
  savingSpinner: { position: 'absolute', right: spacing.xl + 40, bottom: spacing.tabBarBottom + spacing.md + 4 },
});
