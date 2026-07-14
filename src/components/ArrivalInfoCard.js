// ArrivalInfoCard.js — Reusable arrival info block (address, hint, directions)
// Used in: EventDetailScreen, MisCenasScreen, ChatScreen
import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { typography } from '../theme/typography';

export default function ArrivalInfoCard({
  address,        // "Calle Test 1"
  city,           // "Madrid"
  locationHint,   // "Portal azul, 3º izq"
  eventDate,      // ISO string or Date
  compact = false, // smaller variant for MisCenas cards
}) {
  if (!address) return null;

  const openMaps = () => {
    const q = encodeURIComponent(`${address}, ${city || ''}`);
    Linking.openURL(`https://maps.google.com/?q=${q}`);
  };

  const fmtDate = eventDate
    ? (() => {
        const d = new Date(eventDate);
        const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
      })()
    : null;

  if (compact) {
    return (
      <View style={st.compact}>
        <View style={st.compactRow}>
          <Ionicons name="location" size={14} color={colors.accent} />
          <Text style={st.compactAddr} numberOfLines={2}>
            {address}{city ? `, ${city}` : ''}
          </Text>
        </View>
        {locationHint ? (
          <Text style={st.compactHint} numberOfLines={2}>{locationHint}</Text>
        ) : null}
        <Pressable style={st.compactBtn} onPress={openMaps}>
          <Ionicons name="navigate-outline" size={12} color={colors.accent} />
          <Text style={st.compactBtnText}>CÓMO LLEGAR</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={st.card}>
      <View style={st.addressRow}>
        <Ionicons name="location" size={20} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={st.address}>{address}</Text>
          <Text style={st.city}>{city}</Text>
        </View>
      </View>
      {locationHint ? (
        <View style={st.hintRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={st.hint}>{locationHint}</Text>
        </View>
      ) : null}
      {fmtDate ? (
        <View style={st.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={st.dateText}>{fmtDate}</Text>
        </View>
      ) : null}
      <Pressable style={st.directionsBtn} onPress={openMaps}>
        <Ionicons name="navigate" size={16} color={colors.onAccent} />
        <Text style={st.directionsBtnText}>CÓMO LLEGAR</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  // Full variant (EventDetail, Chat panel)
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  address: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 15 },
  city: { ...typography.body, color: colors.textMuted, fontSize: 13, marginTop: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, paddingLeft: 2 },
  hint: { ...typography.body, color: colors.textMuted, fontSize: 13, fontStyle: 'italic', flex: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: 2 },
  dateText: { ...typography.label, color: colors.textMuted, fontSize: 11, letterSpacing: 0 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xxs,
  },
  directionsBtnText: { ...typography.button, color: colors.onAccent, fontSize: 11 },

  // Compact variant (MisCenas cards)
  compact: { marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: borders.hairline, borderTopColor: colors.borderHairline },
  compactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  compactAddr: { ...typography.body, color: colors.textPrimary, fontSize: 11, flex: 1 },
  compactHint: { ...typography.body, color: colors.textMuted, fontSize: 10, fontStyle: 'italic', marginTop: 2, marginLeft: 18 },
  compactBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  compactBtnText: { ...typography.label, color: colors.accent, fontSize: 9, letterSpacing: 1 },
});
