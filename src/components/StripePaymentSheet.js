// StripePaymentSheet.js — Stripe Payment Element via WebView (Expo Go compatible)
// PCI SAQ-A: card data never touches our code, only Stripe.js handles it.
import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

function buildHTML(clientSecret, amount, currency) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<script src="https://js.stripe.com/v3/"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #F1EADD; padding: 20px; }
  h2 { font-size: 18px; color: #1A1613; margin-bottom: 16px; text-align: center; }
  #payment-element { margin-bottom: 20px; }
  #submit { width: 100%; background: #BF4726; color: #F1EADD; border: none;
    padding: 14px; font-size: 14px; font-weight: 600; letter-spacing: 1px;
    text-transform: uppercase; cursor: pointer; }
  #submit:disabled { opacity: 0.5; }
  #error { color: #D32F2F; font-size: 13px; margin-top: 12px; text-align: center; }
  .spinner { text-align: center; padding: 40px; color: #8B8072; }
</style>
</head><body>
<h2>Pago seguro</h2>
<div id="payment-element"><div class="spinner">Cargando...</div></div>
<button id="submit" disabled>PAGAR €${(amount/100).toFixed(0)}</button>
<div id="error"></div>
<script>
  const stripe = Stripe('${STRIPE_PK}');
  const elements = stripe.elements({
    clientSecret: '${clientSecret}',
    appearance: {
      theme: 'flat',
      variables: { colorPrimary: '#BF4726', fontFamily: 'system-ui' }
    },
    locale: 'es'
  });
  const pe = elements.create('payment');
  pe.mount('#payment-element');
  pe.on('ready', () => { document.getElementById('submit').disabled = false; });

  document.getElementById('submit').addEventListener('click', async () => {
    document.getElementById('submit').disabled = true;
    document.getElementById('error').textContent = '';
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: 'https://appchef.com/payment-done' },
      redirect: 'if_required'
    });
    if (error) {
      document.getElementById('error').textContent = error.message;
      document.getElementById('submit').disabled = false;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: error.message }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success' }));
    }
  });
</script>
</body></html>`;
}

export default function StripePaymentSheet({ clientSecret, amount, currency, onSuccess, onCancel, onError }) {
  const webRef = useRef(null);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') onSuccess?.();
      else if (data.type === 'error') onError?.(data.message);
    } catch {}
  };

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Pressable onPress={onCancel} hitSlop={16} style={st.closeBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={st.headerTitle}>Pago</Text>
        <View style={{ width: 24 }} />
      </View>
      <WebView
        ref={webRef}
        source={{ html: buildHTML(clientSecret, amount, currency) }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}
        style={st.webview}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.dinnerTitle, fontSize: 18, color: colors.textPrimary },
  closeBtn: { padding: spacing.xs },
  webview: { flex: 1 },
});
