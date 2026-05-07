import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { reservationApi } from '../services/api';
import { colors } from '../theme/colors';

const STATUS_LABELS = {
  not_started: { title: 'No has conectado tus pagos', tone: 'pending' },
  in_progress: { title: 'Onboarding pendiente', tone: 'pending' },
  ready: { title: 'Pagos activos', tone: 'success' },
  blocked: { title: 'Stripe pidió más información', tone: 'warning' },
};

function deriveTone(s) {
  if (!s.has_account) return 'not_started';
  if (s.charges_enabled && s.payouts_enabled && s.details_submitted) return 'ready';
  if (s.details_submitted && (!s.charges_enabled || !s.payouts_enabled)) return 'blocked';
  return 'in_progress';
}

export default function HostPaymentsSetupScreen() {
  const navigation = useNavigation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await reservationApi.get('/payments/connect/status');
      setStatus(res.data);
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'No se pudo cargar el estado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = useCallback(async () => {
    setOpening(true);
    try {
      const endpoint = status?.has_account
        ? '/payments/connect/refresh-link'
        : '/payments/connect/onboarding-link';
      const res = await reservationApi.post(endpoint);
      const url = res.data?.url;
      if (!url) throw new Error('Stripe no devolvió URL');
      await WebBrowser.openBrowserAsync(url);
      // After the host returns from the WebBrowser, re-pull state.
      // Stripe also fires account.updated → webhook → DB update.
      await fetchStatus();
    } catch (err) {
      Alert.alert('Error', err.userMessage || err.message || 'No se pudo iniciar el onboarding');
    } finally {
      setOpening(false);
    }
  }, [status, fetchStatus]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.cafe || '#4A2C2A'} />
      </View>
    );
  }

  const tone = status ? deriveTone(status) : 'not_started';
  const meta = STATUS_LABELS[tone];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Icon name="arrow-back" size={22} color={colors.cafe || '#4A2C2A'} />
        <Text style={styles.backLabel}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Cobrar como anfitrión</Text>
      <Text style={styles.subtitle}>
        Para recibir el pago de tus cenas necesitas conectar tu cuenta con Stripe. Es gratis,
        toma unos minutos y AppChef sólo cobra una pequeña comisión por reserva.
      </Text>

      <View style={[styles.statusCard, styles[`tone_${meta.tone}`]]}>
        <Icon
          name={meta.tone === 'success' ? 'checkmark-circle' : meta.tone === 'warning' ? 'alert-circle' : 'time-outline'}
          size={24}
          color={meta.tone === 'success' ? '#2E7D32' : meta.tone === 'warning' ? '#C04A1A' : '#7A6F50'}
        />
        <Text style={styles.statusTitle}>{meta.title}</Text>
      </View>

      {status?.has_account && (
        <View style={styles.checkList}>
          <CheckRow label="Datos enviados a Stripe" ok={status.details_submitted} />
          <CheckRow label="Cobros habilitados" ok={status.charges_enabled} />
          <CheckRow label="Transferencias habilitadas" ok={status.payouts_enabled} />
        </View>
      )}

      <TouchableOpacity
        style={[styles.cta, opening && styles.ctaDisabled]}
        onPress={handleConnect}
        disabled={opening}
        activeOpacity={0.85}
      >
        {opening ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>
            {status?.has_account ? 'Continuar onboarding' : 'Conectar con Stripe'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.fineprint}>
        Stripe gestiona la verificación de identidad y los cobros. AppChef no almacena datos
        bancarios.
      </Text>
    </ScrollView>
  );
}

function CheckRow({ label, ok }) {
  return (
    <View style={styles.checkRow}>
      <Icon
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={ok ? '#2E7D32' : '#999'}
      />
      <Text style={[styles.checkLabel, ok && styles.checkLabelDone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, backgroundColor: '#FDFAF5', minHeight: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDFAF5' },
  back: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20, gap: 6 },
  backLabel: { color: colors.cafe || '#4A2C2A', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '700', color: colors.cafe || '#4A2C2A', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#5C4A3A', lineHeight: 20, marginBottom: 24 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 12, marginBottom: 16,
  },
  statusTitle: { fontSize: 15, fontWeight: '600', color: '#2C3E2D', flex: 1 },
  tone_success: { backgroundColor: '#E6F4EA' },
  tone_warning: { backgroundColor: '#FCE9DD' },
  tone_pending: { backgroundColor: '#F2EDE0' },
  checkList: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 24, gap: 10,
    borderWidth: 1, borderColor: '#EDE8DF',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { fontSize: 14, color: '#5C4A3A', flex: 1 },
  checkLabelDone: { color: '#2E7D32', fontWeight: '600' },
  cta: {
    backgroundColor: '#2C3E2D', paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    minHeight: 52,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fineprint: { fontSize: 12, color: '#8A7A66', marginTop: 14, lineHeight: 18, textAlign: 'center' },
});
