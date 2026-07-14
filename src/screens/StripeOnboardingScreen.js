// StripeOnboardingScreen.js — Gate: configurar pagos antes de crear cena
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/core';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { selectUser } from '../store/authSlice';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function StripeOnboardingScreen({ navigation }) {
  const user = useSelector(selectUser);
  const [status, setStatus] = useState(null); // none, pending, complete, restricted
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await userApi.get(`/users/${user.id}/stripe-status`);
      setStatus(res.data.status);
      if (res.data.status === 'complete') {
        // Already complete — go to create event
        navigation.replace('CreateEvent');
      }
    } catch {}
    setLoading(false);
  }, [user?.id, navigation]);

  // Re-check when screen comes back into focus (after returning from Stripe)
  useFocusEffect(useCallback(() => { checkStatus(); }, [checkStatus]));

  const startOnboarding = async () => {
    setStarting(true);
    try {
      const res = await userApi.post(`/users/${user.id}/stripe-onboarding`);
      const url = res.data.url;
      if (url) {
        // Open in-app browser — when dismissed, useFocusEffect triggers checkStatus()
        await WebBrowser.openBrowserAsync(url, {
          dismissButtonStyle: 'done',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        // User returned from browser — re-check status
        checkStatus();
      }
    } catch (e) {
      Alert.alert('Error', e.userMessage || 'No se pudo iniciar la configuración.');
    }
    setStarting(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={st.content}>
        <Ionicons name="card-outline" size={48} color={colors.accent} />
        <Text style={st.title}>Configura tus pagos</Text>
        <Text style={st.body}>
          Para cobrar tus cenas necesitas configurar tus pagos con Stripe. Es r\u00E1pido, seguro y solo lo haces una vez.
        </Text>
        <Text style={st.body}>
          Stripe gestiona los datos bancarios y fiscales. App Chef nunca ve tu informaci\u00F3n financiera.
        </Text>

        {status === 'restricted' && (
          <View style={st.warning}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={st.warningText}>Tu cuenta de Stripe tiene restricciones. Resu\u00E9lvelas en Stripe para poder publicar.</Text>
          </View>
        )}

        {status === 'pending' && (
          <View style={st.info}>
            <Ionicons name="time-outline" size={18} color={colors.accent} />
            <Text style={st.infoText}>Tu configuraci\u00F3n est\u00E1 pendiente. Completa los pasos en Stripe.</Text>
          </View>
        )}

        <Pressable style={st.btn} onPress={startOnboarding} disabled={starting}>
          {starting ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={st.btnText}>
              {status === 'pending' ? 'RETOMAR CONFIGURACI\u00D3N' : 'CONFIGURAR PAGOS'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => checkStatus()} style={st.retryBtn}>
          <Text style={st.retryText}>Ya lo complet\u00E9, verificar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.md,
  },
  title: { ...typography.coverTitle, fontSize: 28, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  warning: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.errorLight, padding: spacing.sm, borderRadius: radius.xs,
  },
  warningText: { ...typography.body, color: colors.error, flex: 1 },
  info: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(191,71,38,0.08)', padding: spacing.sm, borderRadius: radius.xs,
  },
  infoText: { ...typography.body, color: colors.accent, flex: 1 },
  btn: {
    backgroundColor: colors.accent, paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xxl, borderRadius: radius.xs, marginTop: spacing.md,
  },
  btnText: { ...typography.button, color: colors.onAccent, fontSize: 12, letterSpacing: 1.5 },
  retryBtn: { marginTop: spacing.md, padding: spacing.sm },
  retryText: { ...typography.label, color: colors.accent, letterSpacing: 1.2, fontSize: 10 },
});
