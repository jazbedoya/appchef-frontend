// CreateEventScreen.js — Wizard 3 pasos editorial conectado al backend
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { format, addDays, setHours, setMinutes } from 'date-fns';

import { selectUser } from '../store/authSlice';
import { reservationApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';
import StepHeader from '../components/StepHeader';
import Field from '../components/Field';
import Chip from '../components/Chip';
import Textarea from '../components/Textarea';
import Stepper from '../components/Stepper';
import PrimaryButton from '../components/PrimaryButton';
import BackButton from '../components/BackButton';

const COCINAS = ['Italiana', 'Japonesa', 'Vegana', 'Española', 'Peruana', 'Mediterránea'];
const ALERGENOS = ['Gluten', 'Lácteos', 'Frutos secos', 'Mariscos', 'Sin restricciones'];

export default function CreateEventScreen({ navigation }) {
  const user = useSelector(selectUser);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [title, setTitle] = useState('');
  const [cocina, setCocina] = useState('Italiana');
  const [description, setDescription] = useState('');

  // Step 2
  const [selectedDay, setSelectedDay] = useState(3); // index into next 14 days
  const [selectedHour, setSelectedHour] = useState(21);
  const [selectedMin, setSelectedMin] = useState(0);
  const NEXT_DAYS = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));
  const HOURS = [12, 13, 14, 18, 19, 20, 21, 22];
  const MINS = [0, 15, 30, 45];
  const eventDate = setMinutes(setHours(NEXT_DAYS[selectedDay], selectedHour), selectedMin);
  const [plazas, setPlazas] = useState(6);
  const [price, setPrice] = useState('');
  const [menu, setMenu] = useState('');
  const [alergeno, setAlergeno] = useState('Sin restricciones');

  // Step 3
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

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
      const eventDateISO = eventDate.toISOString();
      const body = {
        title: title.trim(),
        description: description.trim(),
        cuisine_type: JSON.stringify([cocina]),
        dining_style: 'dinner',
        event_date: eventDateISO,
        max_guests: plazas,
        price_per_person: parseFloat(price),
        menu: JSON.stringify({ descripcion: menu.trim() }),
        dietary_options: JSON.stringify([alergeno]),
        city: city.trim(),
        address_line1: address.trim(),
        country: 'ES',
        host_name: user?.username || 'Chef',
      };
      const res = await reservationApi.post('/events', body);
      const eventId = res.data.id;
      await reservationApi.post(`/events/${eventId}/publish`);
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

        {step === 2 && (
          <>
            <View style={st.block}>
              <Text style={st.sectionLabel}>Fecha *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.dayScroll}>
                {NEXT_DAYS.map((d, i) => (
                  <Pressable key={i} onPress={() => setSelectedDay(i)} style={[st.dayChip, selectedDay === i && st.dayChipActive]}>
                    <Text style={[st.dayChipDay, selectedDay === i && st.dayChipTextActive]}>{format(d, 'EEE').toUpperCase()}</Text>
                    <Text style={[st.dayChipNum, selectedDay === i && st.dayChipTextActive]}>{format(d, 'd')}</Text>
                    <Text style={[st.dayChipMonth, selectedDay === i && st.dayChipTextActive]}>{format(d, 'MMM').toUpperCase()}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={st.block}>
              <Text style={st.sectionLabel}>Hora *</Text>
              <View style={st.chips}>
                {HOURS.map((h) => (
                  <Chip key={h} label={`${h}:${String(selectedMin).padStart(2, '0')}`} selected={selectedHour === h} onPress={() => setSelectedHour(h)} />
                ))}
              </View>
              <View style={[st.chips, { marginTop: spacing.xs }]}>
                {MINS.map((m) => (
                  <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={selectedMin === m} onPress={() => setSelectedMin(m)} />
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
                { k: 'Fecha', v: format(eventDate, 'dd MMM yyyy · HH:mm') },
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

      <View style={st.bottomBar}>
        {step > 1 && <BackButton onPress={goBack} />}
        {step < 3 ? (
          <PrimaryButton label="Siguiente →" onPress={goNext} />
        ) : (
          <PrimaryButton
            label={saving ? '' : 'Publicar cena'}
            variant="dark"
            onPress={publish}
            style={saving ? { opacity: 0.6 } : undefined}
          />
        )}
        {saving && <ActivityIndicator color={colors.onAccent} style={st.savingSpinner} />}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  block: { marginBottom: spacing.xl },
  sectionLabel: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1.6, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rowFields: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  half: { flex: 1 },
  kicker: { ...typography.label, fontSize: 10, color: colors.accent, letterSpacing: 1.6, marginBottom: spacing.sm },

  card: {
    minHeight: sizes.coverImg,
    borderRadius: radius.xs,
    backgroundColor: colors.imagePlaceholder,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: spacing.xl,
  },
  cardBody: { padding: spacing.md },
  cardOverline: { ...typography.labelSm, fontSize: 9, color: colors.accent, letterSpacing: 1.4, marginBottom: spacing.xxs + 1 },
  cardTitle: { ...typography.sectionTitleSm, fontSize: 24, color: colors.onAccent },

  summary: { borderTopWidth: borders.hairline, borderTopColor: colors.border, marginTop: spacing.md },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 1, borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  summaryKey: { ...typography.label, color: colors.textMuted, letterSpacing: 1.4 },
  summaryVal: { ...typography.bodyLg, color: colors.textPrimary },

  bottomBar: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.tabBarBottom,
    borderTopWidth: borders.hairline, borderTopColor: colors.border, backgroundColor: colors.background,
  },
  savingSpinner: { position: 'absolute', right: spacing.xl + 40, bottom: spacing.tabBarBottom + spacing.md + 4 },
  dayScroll: { gap: spacing.xs, paddingRight: spacing.xl },
  dayChip: {
    alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderWidth: borders.medium, borderColor: colors.border, borderRadius: radius.xs,
    minWidth: 52,
  },
  dayChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipDay: { ...typography.labelSm, color: colors.textMuted, letterSpacing: 0.5 },
  dayChipNum: { ...typography.numeral, color: colors.textPrimary, marginVertical: 1 },
  dayChipMonth: { ...typography.labelSm, fontSize: 8, color: colors.textMuted, letterSpacing: 0.5 },
  dayChipTextActive: { color: colors.onAccent },
});
