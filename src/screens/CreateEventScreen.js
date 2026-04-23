import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, selectIsHost } from '../store/authSlice';
import { fetchEvents } from '../store/eventsSlice';
import { reservationApi } from '../services/api';

// ─── Design tokens ───
const C = {
  primary: '#2C3E2D',
  accent:  '#D4A853',
  surface: '#FDFAF5',
  text:    '#1C1C1C',
  muted:   '#7A7A6E',
  border:  '#F0EBE0',
  white:   '#FFFFFF',
  error:   '#C0392B',
};
const SERIF = Platform.OS === 'web' ? "'Cormorant Garamond', serif" : 'serif';
const SANS  = Platform.OS === 'web' ? "'DM Sans', sans-serif"        : undefined;

const CUISINE_OPTIONS  = ['Italiana', 'Japonesa', 'Vegana', 'Española', 'Mediterránea', 'Otra'];
const ALLERGEN_OPTIONS = ['Gluten', 'Lácteos', 'Frutos secos', 'Mariscos'];

// ─── Helpers ───
function showAlert(msg) {
  if (Platform.OS === 'web') { window.alert(msg); }
  else { Alert.alert('Atención', msg); }
}

// ─── Sub-components ───

const ProgressBar = ({ step }) => (
  <View style={s.progressRow}>
    {[1, 2, 3].map(n => (
      <React.Fragment key={n}>
        <View style={[s.progressDot, n <= step && s.progressDotActive]}>
          {n < step
            ? <Icon name="checkmark" size={12} color={C.white} />
            : <Text style={[s.progressDotText, n <= step && s.progressDotTextActive]}>{n}</Text>}
        </View>
        {n < 3 && <View style={[s.progressLine, n < step && s.progressLineActive]} />}
      </React.Fragment>
    ))}
  </View>
);

const StepLabel = ({ step }) => {
  const labels = ['Info básica', 'Detalles', 'Ubicación y publicar'];
  return (
    <Text style={s.stepLabel}>
      Paso {step} de 3 — <Text style={{ fontWeight: '600' }}>{labels[step - 1]}</Text>
    </Text>
  );
};

const Field = ({ label, children, optional }) => (
  <View style={s.field}>
    <Text style={s.fieldLabel}>
      {label}{optional && <Text style={s.optional}> (opcional)</Text>}
    </Text>
    {children}
  </View>
);

const Input = ({ value, onChangeText, onBlur, placeholder, multiline, keyboardType, style: sx }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    onBlur={onBlur}
    placeholder={placeholder}
    placeholderTextColor={C.muted}
    multiline={multiline}
    keyboardType={keyboardType}
    style={[s.input, multiline && s.inputMulti, sx]}
  />
);

const PillSelector = ({ options, selected, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
    <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[s.pill, selected === opt && s.pillActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[s.pillText, selected === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
);

const CheckboxGroup = ({ options, selected, onToggle }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
    {options.map(opt => {
      const checked = selected.includes(opt);
      return (
        <TouchableOpacity
          key={opt}
          style={[s.pill, checked && s.pillActive]}
          onPress={() => onToggle(opt)}
        >
          <Text style={[s.pillText, checked && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const Stepper = ({ value, onChange, min = 2, max = 20 }) => (
  <View style={s.stepperRow}>
    <TouchableOpacity
      style={[s.stepperBtn, value <= min && s.stepperBtnOff]}
      onPress={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
    >
      <Text style={s.stepperBtnText}>−</Text>
    </TouchableOpacity>
    <Text style={s.stepperValue}>{value}</Text>
    <TouchableOpacity
      style={[s.stepperBtn, value >= max && s.stepperBtnOff]}
      onPress={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
    >
      <Text style={s.stepperBtnText}>+</Text>
    </TouchableOpacity>
  </View>
);

// ─── Event preview card ───
const PreviewCard = ({ title, cuisineType, city, date, time, capacity, price }) => (
  <View style={s.preview}>
    <Text style={s.previewLabel}>VISTA PREVIA</Text>
    <View style={s.previewCard}>
      <View style={s.previewBadge}>
        <Text style={s.previewBadgeText}>{cuisineType || 'Sin tipo'}</Text>
      </View>
      <Text style={s.previewTitle}>{title || 'Nombre de tu cena'}</Text>
      <Text style={s.previewMeta}>
        📍 {city || '–'}   ·   🗓 {date || '–'}   ·   🕗 {time || '–'}
      </Text>
      <Text style={s.previewMeta}>
        👥 {capacity} plazas máx.   ·   💶 €{price || '0'}/persona
      </Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════
const CreateEventScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user    = useSelector(selectUser);
  const isHost  = useSelector(selectIsHost);

  // ── Step state ──
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Step 1 ──
  const [title,       setTitle]       = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [description, setDescription] = useState('');

  // ── Step 2 ──
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [capacity, setCapacity] = useState(6);
  const [price,    setPrice]    = useState('');
  const [menu,     setMenu]     = useState('');
  const [allergens, setAllergens] = useState([]);

  // ── Step 3 ──
  const [city,       setCity]       = useState('');
  const [address,    setAddress]    = useState('');
  const [latitude,   setLatitude]   = useState(null);
  const [longitude,  setLongitude]  = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [geocoding,  setGeocoding]  = useState(false);

  // ── Validation ──
  const validate = () => {
    if (!title.trim())           return 'El nombre es obligatorio';
    if (!cuisineType)            return 'Selecciona un tipo de cocina';
    if (!description.trim())     return 'La descripción es obligatoria';
    if (!date)                   return 'La fecha es obligatoria';
    if (new Date(`${date}T00:00:00`) < new Date()) return 'La fecha debe ser futura';
    if (!time)                   return 'La hora es obligatoria';
    if (capacity < 2)            return 'Mínimo 2 plazas';
    if (!price || parseFloat(price) <= 0) return 'El precio debe ser mayor a 0';
    if (!city.trim())            return 'La ciudad es obligatoria';
    return null;
  };

  const validateStep = (n) => {
    if (n === 1) {
      if (!title.trim())       { showAlert('El nombre es obligatorio'); return false; }
      if (!cuisineType)        { showAlert('Selecciona un tipo de cocina'); return false; }
      if (!description.trim()) { showAlert('La descripción es obligatoria'); return false; }
    }
    if (n === 2) {
      if (!date)               { showAlert('La fecha es obligatoria'); return false; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showAlert('Formato de fecha: YYYY-MM-DD (ej: 2026-05-20)'); return false; }
      if (new Date(`${date}T00:00:00`) < new Date(Date.now() - 86400000)) { showAlert('La fecha debe ser futura'); return false; }
      if (!time)               { showAlert('La hora es obligatoria'); return false; }
      if (!/^\d{2}:\d{2}$/.test(time)) { showAlert('Formato de hora: HH:MM (ej: 20:00)'); return false; }
      if (!price || parseFloat(price) <= 0) { showAlert('El precio debe ser mayor a 0'); return false; }
    }
    return true;
  };

  // ── Geocoding via Nominatim (OpenStreetMap, free) ──
  const geocodeCityOrAddress = async (cityVal, addressVal) => {
    const query = [addressVal, cityVal].filter(Boolean).join(', ').trim();
    if (!query) return;
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AppChef/1.0' } });
      const data = await res.json();
      if (data.length > 0) {
        setLatitude(parseFloat(data[0].lat));
        setLongitude(parseFloat(data[0].lon));
      }
    } catch (_) {}
    finally { setGeocoding(false); }
  };

  // ── Geolocation ──
  const useMyLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        () => geocodeCityOrAddress(city, address)
      );
    } else {
      geocodeCityOrAddress(city, address);
    }
  };

  // ── Toggle allergen ──
  const toggleAllergen = (a) =>
    setAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  // ── Publish ──
  const publishEvent = async () => {
    const error = validate();
    if (error) { showAlert(error); return; }

    setLoading(true);
    try {
      // Build host display name from Redux user
      const profile = user?.profile || {};
      const hostName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
        || user?.username
        || 'Chef';

      // 1. Create event (draft)
      const createRes = await reservationApi.post('/events', {
        host_name: hostName,
        title:            title.trim(),
        description:      description.trim(),
        cuisine_type:     [cuisineType],
        dining_style:     'dinner',
        event_date:       `${date}T${time}:00`,
        address_line1:    address.trim() || city.trim(),
        city:             city.trim(),
        country:          'ES',
        max_guests:       capacity,
        min_guests:       2,
        price_per_person: parseFloat(price),
        currency:         'EUR',
        dietary_options:  allergens,
        waitlist_enabled: true,
        menu:             menu.trim() ? { courses: [], notes: menu.trim() } : null,
        latitude:         latitude  || null,
        longitude:        longitude || null,
        show_exact_address: false,
        beverage_included:  false,
        byob_allowed:       true,
      });
      const event = createRes.data;

      // 3. Publish event
      await reservationApi.post(`/events/${event.id}/publish`);

      // 4. Refresh events list in Redux
      dispatch(fetchEvents());

      // 5. Close modal and go to Profile to see the new event
      showAlert('¡Tu cena está publicada! 🎉');
      navigation.goBack();

    } catch (err) {
      // Show specific field errors from the 422 response
      const errData = err.response?.data;
      if (errData?.errors?.length) {
        const msgs = errData.errors.map(e => `• ${e.field}: ${e.message}`).join('\n');
        showAlert(`Error de validación:\n${msgs}`);
      } else {
        showAlert(err.userMessage || err.message || 'Error al publicar. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  //   RENDER STEPS
  // ─────────────────────────────────────────
  const renderStep1 = () => (
    <View style={s.stepContent}>
      <Field label="Nombre de la cena *">
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: Noche de Pasta Clandestina"
        />
      </Field>

      <Field label="Tipo de cocina *">
        <PillSelector
          options={CUISINE_OPTIONS}
          selected={cuisineType}
          onSelect={setCuisineType}
        />
      </Field>

      <Field label="Descripción *">
        <Input
          value={description}
          onChangeText={t => t.length <= 300 && setDescription(t)}
          placeholder="Describe la experiencia que vivirán tus invitados..."
          multiline
        />
        <Text style={s.charCount}>{description.length}/300</Text>
      </Field>
    </View>
  );

  const renderStep2 = () => (
    <View style={s.stepContent}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Fecha *">
          <Input
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
            style={{ flex: 1 }}
          />
        </Field>
        <Field label="Hora *">
          <Input
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            keyboardType="numeric"
            style={{ flex: 1 }}
          />
        </Field>
      </View>

      <Field label="Número de plazas *">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Stepper value={capacity} onChange={setCapacity} min={2} max={20} />
          <Text style={s.capacityNote}>{capacity} invitados máximo</Text>
        </View>
      </Field>

      <Field label="Precio por persona (€) *">
        <View style={s.priceRow}>
          <Text style={s.pricePrefix}>€</Text>
          <Input
            value={price}
            onChangeText={setPrice}
            placeholder="45"
            keyboardType="decimal-pad"
            style={{ flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          />
        </View>
      </Field>

      <Field label="Menú" optional>
        <Input
          value={menu}
          onChangeText={setMenu}
          placeholder="Describe los platos que servirás..."
          multiline
        />
      </Field>

      <Field label="Alérgenos a declarar" optional>
        <CheckboxGroup
          options={ALLERGEN_OPTIONS}
          selected={allergens}
          onToggle={toggleAllergen}
        />
        <TouchableOpacity
          style={[s.pill, allergens.length === 0 && s.pillActive, { marginTop: 8, alignSelf: 'flex-start' }]}
          onPress={() => setAllergens([])}
        >
          <Text style={[s.pillText, allergens.length === 0 && s.pillTextActive]}>Sin restricciones</Text>
        </TouchableOpacity>
      </Field>
    </View>
  );

  const renderStep3 = () => (
    <View style={s.stepContent}>
      <Field label="Ciudad *">
        <Input
          value={city}
          onChangeText={setCity}
          onBlur={() => geocodeCityOrAddress(city, address)}
          placeholder="Ej: Madrid"
        />
      </Field>

      <Field label="Dirección exacta" optional>
        <Input
          value={address}
          onChangeText={setAddress}
          onBlur={() => geocodeCityOrAddress(city, address)}
          placeholder="Solo visible para reservas confirmadas"
        />
      </Field>

      <Field label="Ubicación GPS" optional>
        <TouchableOpacity style={s.locationBtn} onPress={useMyLocation} disabled={geocoding}>
          <Icon name="location-outline" size={18} color={C.primary} />
          <Text style={s.locationBtnText}>
            {geocoding
              ? 'Buscando coordenadas...'
              : latitude
              ? `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              : 'Usar mi ubicación actual'}
          </Text>
        </TouchableOpacity>
      </Field>

      <Field label="Visibilidad">
        <View style={{ gap: 10, marginTop: 8 }}>
          {[
            { value: 'public', label: 'Pública', sub: 'Aparece en Home y Mapa para todos' },
            { value: 'invite', label: 'Solo por invitación', sub: 'No aparece en búsquedas públicas' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.visibilityOption, visibility === opt.value && s.visibilityOptionActive]}
              onPress={() => setVisibility(opt.value)}
            >
              <View style={[s.radio, visibility === opt.value && s.radioActive]}>
                {visibility === opt.value && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.visibilityLabel}>{opt.label}</Text>
                <Text style={s.visibilitySub}>{opt.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      {/* Preview card */}
      <PreviewCard
        title={title}
        cuisineType={cuisineType}
        city={city}
        date={date}
        time={time}
        capacity={capacity}
        price={price}
      />
    </View>
  );

  // ─────────────────────────────────────────
  //   FULL RENDER
  // ─────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Crear cena</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={s.progressContainer}>
        <ProgressBar step={step} />
        <StepLabel step={step} />
      </View>

      {/* Step content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Footer buttons */}
      <View style={s.footer}>
        {step < 3 ? (
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => {
              if (validateStep(step)) setStep(step + 1);
            }}
          >
            <Text style={s.nextBtnText}>Siguiente →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              s.publishBtn,
              loading && s.publishBtnOff,
              Platform.OS === 'web' && { background: 'linear-gradient(135deg, #2C3E2D, #4A6741)' },
            ]}
            onPress={publishEvent}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.publishBtnText}>Publicar mi cena 🎉</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────
//   STYLES
// ─────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '600',
    color: C.white,
    fontStyle: 'italic',
  },

  // ── Progress ──
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: C.primary },
  progressDotText: { fontSize: 12, fontWeight: '600', color: C.muted },
  progressDotTextActive: { color: C.white },
  progressLine: { flex: 1, height: 2, backgroundColor: C.border },
  progressLineActive: { backgroundColor: C.primary },
  stepLabel: { fontFamily: SANS, fontSize: 13, color: C.muted },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  stepContent: { padding: 20, gap: 20 },

  // ── Fields ──
  field: { gap: 6 },
  fieldLabel: { fontFamily: SANS, fontSize: 13, fontWeight: '600', color: C.text },
  optional: { fontWeight: '400', color: C.muted },
  input: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: SANS,
    fontSize: 14,
    color: C.text,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { fontFamily: SANS, fontSize: 11, color: C.muted, textAlign: 'right' },

  // ── Pills ──
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white,
  },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontFamily: SANS, fontSize: 13, color: C.muted },
  pillTextActive: { color: C.white, fontWeight: '600' },

  // ── Stepper ──
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnOff: { backgroundColor: C.border },
  stepperBtnText: { fontSize: 20, color: C.white, fontWeight: '300' },
  stepperValue: { fontFamily: SANS, fontSize: 22, fontWeight: '700', color: C.text, minWidth: 32, textAlign: 'center' },
  capacityNote: { fontFamily: SANS, fontSize: 13, color: C.muted },

  // ── Price ──
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  pricePrefix: {
    backgroundColor: C.primary, color: C.accent,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
    fontSize: 16, fontWeight: '700',
  },

  // ── Location btn ──
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.primary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  locationBtnText: { fontFamily: SANS, fontSize: 14, color: C.primary, fontWeight: '600' },

  // ── Visibility ──
  visibilityOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, padding: 14,
  },
  visibilityOptionActive: { borderColor: C.primary, backgroundColor: '#F5F9F5' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  visibilityLabel: { fontFamily: SANS, fontSize: 14, fontWeight: '600', color: C.text },
  visibilitySub: { fontFamily: SANS, fontSize: 12, color: C.muted, marginTop: 2 },

  // ── Preview ──
  preview: { marginTop: 4 },
  previewLabel: {
    fontFamily: SANS, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: C.muted, marginBottom: 8,
  },
  previewCard: {
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 16, padding: 16, gap: 8,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F0E8',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  previewBadgeText: { fontFamily: SANS, fontSize: 11, fontWeight: '700', color: C.primary },
  previewTitle: { fontFamily: SERIF, fontSize: 20, fontWeight: '600', color: C.text },
  previewMeta: { fontFamily: SANS, fontSize: 12, color: C.muted },

  // ── Footer ──
  footer: {
    padding: 16,
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  nextBtn: {
    backgroundColor: C.primary,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { fontFamily: SANS, fontSize: 16, fontWeight: '700', color: C.accent },
  publishBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: C.primary,
  },
  publishBtnOff: { opacity: 0.6 },
  publishBtnText: { fontFamily: SANS, fontSize: 16, fontWeight: '700', color: C.white },
});

export default CreateEventScreen;
