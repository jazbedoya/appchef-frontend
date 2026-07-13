// TouchableRow.js — Pressable with instant visual feedback + haptic
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { hapticSelection } from '../lib/haptics';

export default function TouchableRow({ children, onPress, style, disabled }) {
  return (
    <Pressable
      onPress={() => { if (!disabled) { hapticSelection(); onPress?.(); } }}
      disabled={disabled}
      style={({ pressed }) => [
        style,
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
});
