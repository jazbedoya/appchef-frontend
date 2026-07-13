// src/components/FloatingTabBar.js
// Opción C — tab bar en píldora oscura FLOTANTE (despegada de los bordes), con un
// FAB central de acento para "Crear cena". Mantiene los 4 destinos
// (Inicio · Map · Chat · Profile); el botón central es una acción, no un destino.
//
// Estructura visual: [Inicio] [Map] ( + ) [Chat] [Profile]
// El activo se pinta en acento; el resto en crema sobre la píldora oscura.
// Se posiciona en absolute; deja que la pantalla reserve espacio inferior con
// contentContainerStyle (ver InicioScreen).
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { sizes } from '../theme/sizes';
import { radius } from '../theme/radius';

const DESTS = [
  { key: 'inicio', icon: 'restaurant', iconIdle: 'restaurant-outline' },
  { key: 'map', icon: 'map', iconIdle: 'map-outline' },
  { key: 'chat', icon: 'chatbubble', iconIdle: 'chatbubble-outline' },
  { key: 'profile', icon: 'person', iconIdle: 'person-outline' },
];

export default function FloatingTabBar({
  active = 'inicio',
  onChange = () => {},
  onCreate = () => {},
}) {
  // Insertamos el FAB en el centro (entre map y chat).
  const left = DESTS.slice(0, 2);
  const right = DESTS.slice(2);

  const renderTab = (t) => {
    const isActive = t.key === active;
    return (
      <Pressable key={t.key} style={styles.tab} onPress={() => onChange(t.key)} hitSlop={spacing.xs}>
        <Ionicons
          name={isActive ? t.icon : t.iconIdle}
          size={sizes.tabFloatingIcon}
          color={isActive ? colors.accent : colors.onTabFloating}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        {left.map(renderTab)}
        <Pressable style={styles.fab} onPress={onCreate} hitSlop={spacing.xs}>
          <Ionicons name="add" size={sizes.tabFloatingIcon} color={colors.onAccent} />
        </Pressable>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.floatingTabInset,
    right: spacing.floatingTabInset,
    bottom: spacing.floatingTabBottom,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tabFloating,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    // sombra de elevación
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center' },
  fab: {
    width: sizes.fabFloating,
    height: sizes.fabFloating,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
});
