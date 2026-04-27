import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@appchef:access_token',
  REFRESH_TOKEN: '@appchef:refresh_token',
  USER: '@appchef:user',
};

const authService = {
  async register({ email, username, password, firstName, lastName, phoneNumber }) {
    const response = await userApi.post('/auth/register', {
      email,
      username,
      password,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber || undefined,
    });
    return { pendingVerificationEmail: email, message: response.data?.message };
  },

  async login({ email, password }) {
    try {
      const response = await userApi.post('/auth/login', { email, password });
      const { access_token, refresh_token } = response.data;
      await authService.persistTokens(access_token, refresh_token);
      const user = await authService.getCurrentUser();
      return { user, tokens: response.data };
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.detail === 'email_not_verified') {
        const err = new Error('email_not_verified');
        err.code = 'email_not_verified';
        err.email = email;
        throw err;
      }
      throw error;
    }
  },

  async resendVerification(email) {
    const response = await userApi.post('/auth/resend-verification', { email });
    return response.data;
  },

  async googleSignIn(idToken) {
    const response = await userApi.post('/auth/google', { id_token: idToken });
    const { access_token, refresh_token } = response.data;
    await authService.persistTokens(access_token, refresh_token);
    const user = await authService.getCurrentUser();
    return { user, tokens: response.data };
  },

  async completeOAuthLogin({ accessToken, refreshToken }) {
    await authService.persistTokens(accessToken, refreshToken);
    const user = await authService.getCurrentUser();
    return { user };
  },

  async logout() {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await userApi.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // fail silently
    } finally {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    }
  },

  async getCurrentUser() {
    const response = await userApi.get('/users/me');
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
    return response.data;
  },

  async getStoredUser() {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return userJson ? JSON.parse(userJson) : null;
  },

  async isAuthenticated() {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  },

  async persistTokens(accessToken, refreshToken) {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ]);
  },
};

export default authService;
