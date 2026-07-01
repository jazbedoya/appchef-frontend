// AuthScreen.js — Login/Register editorial con Redux real
import React, { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { loginUser, registerUser, selectAuthLoading, selectAuthError } from '../store/authSlice';
import Field from '../components/Field';
import AuthToggle from '../components/AuthToggle';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function AuthScreen() {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  const handleSignIn = () => {
    if (!email.trim() || !password.trim()) return Alert.alert('Error', 'Completa todos los campos');
    dispatch(loginUser({ email: email.trim(), password }));
  };

  const handleJoin = () => {
    if (!firstName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Completa todos los campos');
    }
    if (password.length < 8) return Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
    if (password !== confirmPw) return Alert.alert('Error', 'Las contraseñas no coinciden');
    dispatch(registerUser({
      email: email.trim(),
      username: username.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }));
  };

  const isSignIn = mode === 'signin';

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Masthead */}
          <View style={st.masthead}>
            {isSignIn && <View style={st.accentRule} />}
            <Text style={isSignIn ? st.wordmark : st.wordmarkSm}>App Chef</Text>
            <Text style={st.kicker}>Private dinners, new friendships</Text>
          </View>

          <AuthToggle active={mode} onChange={setMode} />

          {/* Error */}
          {authError ? (
            <Text style={st.errorText}>{authError}</Text>
          ) : null}

          <View style={st.form}>
            {isSignIn ? (
              <>
                <Field label="Email" icon="mail-outline" placeholder="tu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Field label="Contraseña" icon="lock-closed-outline" placeholder="Tu contraseña" secure showEyeToggle value={password} onChangeText={setPassword} containerStyle={st.tightField} />
                <Pressable style={st.forgotWrap}>
                  <Text style={st.forgot}>¿Olvidaste tu contraseña?</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={st.rowFields}>
                  <Field label="Nombre" placeholder="Ana" value={firstName} onChangeText={setFirstName} autoCapitalize="words" containerStyle={st.half} />
                  <Field label="Apellido" placeholder="García" value={lastName} onChangeText={setLastName} autoCapitalize="words" containerStyle={st.half} />
                </View>
                <Field label="Username" atSign placeholder="chef_ana" value={username} onChangeText={setUsername} />
                <Field label="Email" icon="mail-outline" placeholder="tu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Field label="Contraseña" hint="mín. 8, 1 mayúscula, 1 número" icon="lock-closed-outline" placeholder="Ej: MiChef123" secure showEyeToggle value={password} onChangeText={setPassword} />
                <Field label="Confirmar contraseña" icon="lock-closed-outline" placeholder="Repite la contraseña" secure value={confirmPw} onChangeText={setConfirmPw} containerStyle={st.lastField} />
              </>
            )}

            <Pressable
              style={[st.cta, isLoading && st.ctaDisabled]}
              onPress={isSignIn ? handleSignIn : handleJoin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={st.ctaText}>{isSignIn ? 'Entrar →' : 'Crear cuenta →'}</Text>
              )}
            </Pressable>

            {!isSignIn && (
              <Text style={st.terms}>
                Al crear una cuenta aceptas los Términos y la Política de Privacidad.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxl, flexGrow: 1 },

  masthead: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl - spacing.xxs },
  accentRule: { width: spacing.xxxl - spacing.xxs, height: 2, backgroundColor: colors.accent, marginBottom: spacing.xl },
  wordmark: { ...typography.wordmark, color: colors.textPrimary, marginBottom: spacing.sm },
  wordmarkSm: { ...typography.wordmarkSm, color: colors.textPrimary, marginBottom: spacing.xs },
  kicker: { ...typography.label, color: colors.textMuted, letterSpacing: 2.4 },

  errorText: { ...typography.body, color: colors.error, textAlign: 'center', marginTop: spacing.md },

  form: { marginTop: spacing.xxl },
  tightField: { marginBottom: spacing.sm },
  rowFields: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  lastField: { marginBottom: spacing.xxl },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: spacing.xxl },
  forgot: {
    ...typography.label, fontSize: 10, color: colors.textPrimary, letterSpacing: 0.8,
    borderBottomWidth: 1.5, borderBottomColor: colors.accent, paddingBottom: spacing.xxs / 2,
  },

  cta: { backgroundColor: colors.accent, borderRadius: radius.xs, paddingVertical: spacing.md + 2, alignItems: 'center' },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...typography.button, fontSize: 12, color: colors.onAccent, letterSpacing: 1.8 },

  terms: { ...typography.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
