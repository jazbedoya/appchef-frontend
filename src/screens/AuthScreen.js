import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import {
  loginUser, registerUser, resendVerificationEmail, completeOAuthLogin,
  selectAuthLoading, selectAuthError, selectPendingVerificationEmail,
  clearError, clearPendingVerification,
} from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { USER_SERVICE_URL } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

// Where the OAuth callback redirects us when it's done. expo-linking's createURL
// resolves to the right thing per runtime:
//   - Web:        http://localhost:8081/auth
//   - Expo Go:    exp://172.19.140.145:8081/--/auth
//   - Dev/prod:   appchef://auth   (scheme from app.json)
const OAUTH_RETURN_URL = Linking.createURL('auth');

const GOOGLE_OAUTH_START_URL =
  `${USER_SERVICE_URL}/auth/google/start?return_to=${encodeURIComponent(OAUTH_RETURN_URL)}`;

const parseQueryParams = (url) => {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return {};
  const out = {};
  url.slice(queryStart + 1).split('&').forEach(part => {
    const [k, v = ''] = part.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return out;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── InputField fuera del componente principal para evitar pérdida de foco ───
const InputField = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, error, icon, rightElement }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      {icon && <Icon name={icon} size={18} color={colors.accent} style={styles.inputIcon} />}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B0A898"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
      />
      {rightElement}
    </View>
    {error && (
      <Text style={styles.errorText}>{error}</Text>
    )}
  </View>
);

// ─── AuthScreen ───
const AuthScreen = () => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const pendingVerificationEmail = useSelector(selectPendingVerificationEmail);

  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [resendFeedback, setResendFeedback] = useState(null);
  const [googleError, setGoogleError] = useState(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  // On web: when the OAuth callback redirects us back to this origin with tokens
  // in the URL query, capture them and clean the address bar.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const params = parseQueryParams(window.location.href);
    if (params.access_token && params.refresh_token) {
      dispatch(completeOAuthLogin({
        accessToken: params.access_token,
        refreshToken: params.refresh_token,
      }));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.error) {
      setGoogleError(`Google: ${params.error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [dispatch]);

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Same-window redirect; we'll pick up tokens on return via the useEffect above.
      window.location.href = GOOGLE_OAUTH_START_URL;
      return;
    }

    setGoogleBusy(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        GOOGLE_OAUTH_START_URL,
        OAUTH_RETURN_URL,
      );
      if (result.type !== 'success' || !result.url) {
        if (result.type === 'cancel' || result.type === 'dismiss') return;
        setGoogleError('No se pudo completar el inicio de sesión.');
        return;
      }

      const queryParams = parseQueryParams(result.url);
      if (queryParams.error) {
        setGoogleError(`Google: ${queryParams.error}`);
        return;
      }
      const accessToken = queryParams.access_token;
      const refreshToken = queryParams.refresh_token;
      if (!accessToken || !refreshToken) {
        setGoogleError('Faltaron tokens en la respuesta del servidor.');
        return;
      }
      dispatch(completeOAuthLogin({ accessToken, refreshToken }));
    } catch (err) {
      setGoogleError(err?.message || 'Error inesperado con Google');
    } finally {
      setGoogleBusy(false);
    }
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});

  const switchMode = (newMode) => {
    dispatch(clearError());
    setFieldErrors({});
    setMode(newMode);
  };

  const handleLogin = async () => {
    const errors = {};
    if (!email.trim()) errors.email = 'Email requerido';
    if (!password) errors.password = 'Contraseña requerida';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    dispatch(loginUser({ email: email.trim(), password }));
  };

  const handleRegister = async () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = 'Requerido';
    if (!lastName.trim()) errors.lastName = 'Requerido';
    if (!username.trim()) errors.username = 'Username requerido';
    if (!regEmail.trim()) errors.email = 'Email requerido';
    if (!regPassword) errors.password = 'Contraseña requerida';
    else if (regPassword.length < 8) errors.password = 'Mínimo 8 caracteres';
    else if (!/[A-Z]/.test(regPassword)) errors.password = 'Debe incluir al menos una mayúscula';
    else if (!/[0-9]/.test(regPassword)) errors.password = 'Debe incluir al menos un número';
    if (regPassword !== confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    dispatch(registerUser({
      email: regEmail.trim(),
      username: username.trim().toLowerCase(),
      password: regPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }));
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    setResendFeedback(null);
    const result = await dispatch(resendVerificationEmail(pendingVerificationEmail));
    if (result.meta.requestStatus === 'fulfilled') {
      setResendFeedback('Te enviamos un nuevo correo. Revisa tu bandeja.');
    } else {
      setResendFeedback('No se pudo reenviar. Inténtalo de nuevo.');
    }
  };

  const handleBackToLogin = () => {
    dispatch(clearPendingVerification());
    setResendFeedback(null);
    setMode('login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B2B1C', '#2C3E2D', '#C9963A']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name="restaurant" size={48} color="white" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>App Chef</Text>
        <Text style={styles.heroSubtitle}>Private Dinners, New Friendships</Text>
      </LinearGradient>

      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.cardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {pendingVerificationEmail ? (
            <View style={styles.verifyContainer}>
              <View style={styles.verifyIconCircle}>
                <Icon name="mail-unread-outline" size={36} color={colors.accent} />
              </View>
              <Text style={styles.verifyTitle}>Confirma tu correo</Text>
              <Text style={styles.verifyBody}>
                Te enviamos un email a{'\n'}
                <Text style={styles.verifyEmail}>{pendingVerificationEmail}</Text>
                {'\n\n'}
                Haz clic en el enlace y luego vuelve aquí para iniciar sesión.
              </Text>

              {resendFeedback && (
                <Text style={styles.verifyFeedback}>{resendFeedback}</Text>
              )}

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleResendVerification}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.submitButtonText}>Reenviar correo</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={handleBackToLogin} style={styles.verifyBackBtn}>
                <Text style={styles.verifyBackText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <>
          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => switchMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => switchMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Join</Text>
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {authError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{authError}</Text>
            </View>
          )}

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, (googleBusy || isLoading) && styles.submitButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleBusy || isLoading}
          >
            {googleBusy
              ? <ActivityIndicator size="small" color="#2C3E2D" />
              : (
                <>
                  <Icon name="logo-google" size={18} color="#2C3E2D" style={{ marginRight: spacing.sm }} />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )
            }
          </TouchableOpacity>
          {googleError && (
            <Text style={styles.errorText}>{googleError}</Text>
          )}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login */}
          {mode === 'login' && (
            <View>
              <InputField label="Email" value={email} onChangeText={setEmail}
                placeholder="tu@email.com" keyboardType="email-address"
                icon="mail-outline" error={fieldErrors.email} />
              <InputField label="Contraseña" value={password} onChangeText={setPassword}
                placeholder="Tu contraseña" secureTextEntry={!showPassword}
                icon="lock-closed-outline" error={fieldErrors.password}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordBtn}>
                    <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.accent} />
                  </TouchableOpacity>
                }
              />
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleLogin} disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.submitButtonText}>Entrar</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Register */}
          {mode === 'register' && (
            <View>
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <InputField label="Nombre" value={firstName} onChangeText={setFirstName}
                    placeholder="Ana" autoCapitalize="words" error={fieldErrors.firstName} />
                </View>
                <View style={styles.nameField}>
                  <InputField label="Apellido" value={lastName} onChangeText={setLastName}
                    placeholder="García" autoCapitalize="words" error={fieldErrors.lastName} />
                </View>
              </View>
              <InputField label="Username" value={username} onChangeText={setUsername}
                placeholder="chef_ana" icon="at-outline" error={fieldErrors.username} />
              <InputField label="Email" value={regEmail} onChangeText={setRegEmail}
                placeholder="tu@email.com" keyboardType="email-address"
                icon="mail-outline" error={fieldErrors.email} />
              <InputField label="Contraseña (mín. 8 chars, 1 mayúscula, 1 número)" value={regPassword} onChangeText={setRegPassword}
                placeholder="Ej: MiChef123" secureTextEntry={!showPassword}
                icon="lock-closed-outline" error={fieldErrors.password}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordBtn}>
                    <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.accent} />
                  </TouchableOpacity>
                }
              />
              <InputField label="Confirmar Contraseña" value={confirmPassword} onChangeText={setConfirmPassword}
                placeholder="Repite la contraseña" secureTextEntry={!showPassword}
                icon="lock-closed-outline" error={fieldErrors.confirmPassword} />

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleRegister} disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.submitButtonText}>Crear Cuenta</Text>
                }
              </TouchableOpacity>
            </View>
          )}
          </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8DF',
    ...Platform.select({
      web: { backgroundImage: 'radial-gradient(ellipse at top, #EDE8DF, #F8F4EE)' },
    }),
  },

  // ─── Hero / Header ───
  hero: {
    height: SCREEN_HEIGHT * 0.28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  heroIcon: {
    ...Platform.select({
      web: { filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' },
    }),
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    fontFamily: Platform.select({ web: '"Cormorant Garamond", Georgia, serif', ios: 'Georgia-Bold', android: 'serif' }),
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },

  // ─── Card / Scroll ───
  cardScroll: { flex: 1 },
  cardContent: { flexGrow: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.72,
    ...Platform.select({
      web: { boxShadow: '0 -8px 40px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },

  // ─── Toggle tabs ───
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EDE8DF',
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.xl,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2C3E2D',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A7A6E',
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },
  tabTextActive: { color: '#FFFFFF' },

  // ─── Error banner ───
  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.base,
  },
  errorBannerText: { color: colors.error, fontSize: 14 },

  // ─── Campos ───
  fieldContainer: { marginBottom: spacing.base },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C3E2D',
    marginBottom: 6,
    letterSpacing: 0.3,
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFAF5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2D9C8',
    paddingHorizontal: spacing.base,
    height: 52,
    ...Platform.select({
      web: { transition: 'border-color 0.2s, box-shadow 0.2s' },
    }),
  },
  inputError: { borderColor: colors.error },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1C',
    paddingVertical: 0,
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  showPasswordBtn: { padding: 4 },
  errorText: { fontSize: 11, color: colors.error, marginTop: 4 },

  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameField: { flex: 1 },

  // ─── Google sign-in ───
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2D9C8',
    marginBottom: spacing.base,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E2D',
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2D9C8' },
  dividerText: {
    marginHorizontal: spacing.sm,
    fontSize: 12,
    color: '#7A7A6E',
    letterSpacing: 1,
  },

  // ─── Verify view ───
  verifyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  verifyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF1DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E2D',
    marginBottom: spacing.sm,
    fontFamily: Platform.select({ web: '"Cormorant Garamond", Georgia, serif', ios: 'Georgia-Bold', android: 'serif' }),
  },
  verifyBody: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.base,
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },
  verifyEmail: {
    fontWeight: '600',
    color: '#2C3E2D',
  },
  verifyFeedback: {
    fontSize: 13,
    color: colors.accent,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  verifyBackBtn: {
    marginTop: spacing.base,
    padding: spacing.sm,
  },
  verifyBackText: {
    fontSize: 14,
    color: '#2C3E2D',
    textDecorationLine: 'underline',
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },

  // ─── Botón principal ───
  submitButton: {
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#2C3E2D',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #2C3E2D, #4A6741)',
        boxShadow: '0 4px 16px rgba(44,62,45,0.3)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#2C3E2D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#C8BFB0',
    ...Platform.select({ web: { backgroundImage: 'none', backgroundColor: '#C8BFB0', boxShadow: 'none' } }),
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: Platform.select({ web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  },
});

export default AuthScreen;
