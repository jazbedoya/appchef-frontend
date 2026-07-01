// CreateEventScreen.js — Wizard 3 pasos editorial conectado al backend
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { format, setHours, setMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import { selectUser } from '../store/authSlice';
import { reservationApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography, fonts } from '../theme/typography';
import StepHeader from '../components/StepHeader';
import Field from '../components/Field';
import Chip from '../components/Chip';
import Textarea from '../components/Textarea';
import Stepper from '../components/Stepper';
import PrimaryButton from '../components/PrimaryButton';
import BackButton from '../components/BackButton';

const COCINAS = ['Italiana', 'Japonesa', 'Vegana', 'Española', 'Peruana', 'Mediterránea'];
const ALERGENOS = ['Gluten', 'Lácteos', 'Frutos secos', 'Mariscos', 'Sin restricciones'];
const QUICK_HOURS = [13, 14, 19, 20, 21, 22];

const TODAY = format(new Date(), 'yyyy-MM-dd');

// Calendar theme using project tokens
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
  'stylesheet.calendar.header': {
    dayTextAtIndex0: { color: colors.textMuted },
    dayTextAtIndex6: { color: colors.textMuted },
  },
};

export default function CreateEventScreen({ navigation }) {
  const user = useSelector(selectUser);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [cocina, setCocina] = useState('Italiana');
  const [description, setDescription] = useState('');

  // Step 2
  const [selectedDate, setSelectedDate] = useState(format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const [timeInput, setTimeInput] = useState('21:00');
  const [plazas, setPlazas] = useState(6);
  const [price, setPrice] = useState('');
  const [menu, setMenu] = useState('');
  const [alergeno, setAlergeno] = useState('Sin restricciones');

  // Step 3
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Computed
  const eventDate = setMinutes(setHours(parse(selectedDate, 'yyyy-MM-dd', new Date()), hour), minute);
  const formattedDate = format(parse(selectedDate, 'yyyy-MM-dd', new Date()), "EEEE, d 'de' MMMM", { locale: es });

  // Time sync
  const syncTimeFromInput = (text) => {
    setTimeInput(text);
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        setHour(h);
        setMinute(m);
      }
    }
  };

  const selectQuickHour = (h) => {
    setHour(h);
    setTimeInput(`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const selectQuickMin = (m) => {
    setMinute(m);
    setTimeInput(`${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const goBack = () => {
    if (step === 1) navigation.goBack();
    else setStep(step - 1);
  };

  const goNext = () => {
    if (step === 1) {
      if (!title.trim()) return Alert.alert('Error', 'Añade un nombre');
      if (!description.trim()) return Alert.alert('Error', 'Añade una descripción');
    }
    if (step === 2) {
      if (!price.trim()) return Alert.alert('Error', 'Añade el precio');
    }
    setStep(step + 1);
  };

  const publish = async () => {
    if (!city.trim() || !address.trim()) return Alert.alert('Error', 'Añade ciudad y dirección');
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        cuisine_type: [cocina],
        dining_style: 'dinner',
        event_date: eventDate.toISOString(),
        max_guests: plazas,
        price_per_person: parseFloat(price),
        menu: { courses: [], notes: menu.trim() || null },
        dietary_options: [alergeno],
        city: city.trim(),
        address_line1: address.trim(),
        country: 'ES',
        host_name: user?.username || 'Chef',
      };
      const res = await reservationApi.post('/events', body);
      await reservationApi.post(`/events/${res.data.id}/publish`);
      Alert.alert('¡Publicada!', 'Tu cena ya está en cartelera.', [
        { text: 'Ver inicio', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.userMessage || 'No se pudo publicar');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <StepHeader step={step} stepLabel={['Info básica', 'Detalles', 'Revisar'][step - 1]} onBack={goBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {/* ── PASO 1 ── */}
        {step === 1 && (
          <>
            <Field label="Nombre de la cena *" placeholder="Ej: Noche de Pasta Clandestina" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
            <View style={st.block}>
              <Text style={st.sectionLabel}>Tipo de cocina *</Text>
              <View style={st.chips}>
                {COCINAS.map((c) => <Chip key={c} label={c} selected={cocina === c} onPress={() => setCocina(c)} />)}
              </View>
            </View>
            <Textarea label="Descripción *" placeholder="Describe la experiencia que vivirán tus invitados…" maxLength={300} value={description} onChangeText={setDescription} />
          </>
        )}

        {/* ── PASO 2 ── */}
        {step === 2 && (
          <>
            {/* Fecha — botón que abre calendario modal */}
            <View style={st.block}>
              <Text style={st.sectionLabel}>Fecha *</Text>
              <Pressable style={st.dateBtn} onPress={() => setShowCalendar(true)}>
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                <Text style={st.dateBtnText}>{formattedDate}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Hora — input + chips rápidos */}
            <View style={st.block}>
              <Text style={st.sectionLabel}>Hora *</Text>
              <View style={st.timeRow}>
                <TextInput
                  style={st.timeInput}
                  value={timeInput}
                  onChangeText={syncTimeFromInput}
                  placeholder="21:00"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Text style={st.timeHint}>HH:MM</Text>
              </View>
              <View style={[st.chips, { marginTop: spacing.sm }]}>
                {QUICK_HOURS.map((h) => (
                  <Chip key={h} label={`${h}:00`} selected={hour === h && minute === 0} onPress={() => { selectQuickHour(h); selectQuickMin(0); }} />
                ))}
              </View>
              <View style={[st.chips, { marginTop: spacing.xs }]}>
                {[0, 15, 30, 45].map((m) => (
                  <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={minute === m} onPress={() => selectQuickMin(m)} />
                ))}
              </View>
            </View>

            <View style={st.block}>
              <Text style={st.sectionLabel}>Número de plazas *</Text>
              <Stepper value={plazas} min={2} max={20} onChange={setPlazas} note={`${plazas} comensales`} />
            </View>
            <Field label="Precio por persona *" placeholder="45" value={price} onChangeText={setPrice} keyboardType="numeric" />
            <Textarea label="Menú" hint="opcional" placeholder="Describe los platos que servirás…" value={menu} onChangeText={setMenu} />
            <View style={st.block}>
              <Text style={st.sectionLabel}>Alérgenos · opcional</Text>
              <View style={st.chips}>
                {ALERGENOS.map((a) => <Chip key={a} label={a} selected={alergeno === a} onPress={() => setAlergeno(a)} />)}
              </View>
            </View>
          </>
        )}

        {/* ── PASO 3 ── */}
        {step === 3 && (
          <>
            <Text style={st.kicker}>Así la verán tus invitados</Text>
            <View style={st.card}>
              <View style={st.cardBody}>
                <Text style={st.cardOverline}>{cocina} · {city || '...'}</Text>
                <Text style={st.cardTitle}>{title || 'Tu cena'}</Text>
              </View>
            </View>
            <Field label="Ciudad *" placeholder="Madrid" value={city} onChangeText={setCity} autoCapitalize="words" />
            <Field label="Dirección *" placeholder="Calle Mayor 15" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
            <View style={st.summary}>
              {[
                { k: 'Fecha', v: `${formattedDate} · ${timeInput}` },
                { k: 'Plazas', v: `${plazas} comensales` },
                { k: 'Precio', v: `€${price || '0'} / persona` },
                { k: 'Alérgenos', v: alergeno },
              ].map((r) => (
                <View key={r.k} style={st.summaryRow}>
                  <Text style={st.summaryKey}>{r.k}</Text>
                  <Text style={st.summaryVal}>{r.v}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={st.bottomBar}>
        {step > 1 && <BackButton onPress={goBack} />}
        {step < 3 ? (
          <PrimaryButton label="Siguiente →" onPress={goNext} />
        ) : (
          <PrimaryButton label={saving ? '' : 'Publicar cena'} variant="dark" onPress={publish} style={saving ? { opacity: 0.6 } : undefined} />
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
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  block: { marginBottom: spacing.xl },
  sectionLabel: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1.6, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  kicker: { ...typography.label, fontSize: 10, color: colors.accent, letterSpacing: 1.6, marginBottom: spacing.sm },

  // Date button
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderBottomWidth: borders.medium, borderBottomColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xxs,
  },
  dateBtnText: { ...typography.input, color: colors.textPrimary, flex: 1, textTransform: 'capitalize' },

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
  card: {
    minHeight: sizes.coverImg, borderRadius: radius.xs,
    backgroundColor: colors.imagePlaceholder, overflow: 'hidden', justifyContent: 'flex-end',
    marginBottom: spacing.xl,
  },
  cardBody: { padding: spacing.md },
  cardOverline: { ...typography.labelSm, fontSize: 9, color: colors.accent, letterSpacing: 1.4, marginBottom: spacing.xxs + 1 },
  cardTitle: { ...typography.sectionTitleSm, fontSize: 24, color: colors.onAccent },

  // Summary
  summary: { borderTopWidth: borders.hairline, borderTopColor: colors.border, marginTop: spacing.md },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 1, borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  summaryKey: { ...typography.label, color: colors.textMuted, letterSpacing: 1.4 },
  summaryVal: { ...typography.bodyLg, color: colors.textPrimary },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.tabBarBottom,
    borderTopWidth: borders.hairline, borderTopColor: colors.border, backgroundColor: colors.background,
  },
  savingSpinner: { position: 'absolute', right: spacing.xl + 40, bottom: spacing.tabBarBottom + spacing.md + 4 },
});
