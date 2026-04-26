import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Service URLs ───
// En Android emulator, usar IP de WSL2 en lugar de localhost
import { Platform } from 'react-native';
const HOST = '172.19.140.145'; // forzado para Android emulator (WSL2)

export const USER_SERVICE_URL = `http://${HOST}:8001`;
export const RESERVATION_SERVICE_URL = `http://${HOST}:8003`;
export const CHAT_SERVICE_URL = `http://${HOST}:8004`;

// ─── Google OAuth Client IDs ───
export const GOOGLE_WEB_CLIENT_ID = '944811553954-16sjnfhk77icgn2mbg9lg8phovdhj31r.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '944811553954-u3h3b7de2mikmodvvr7fa0hmcf77qn2d.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = '944811553954-5jk9mfh9rpogd2dn3cas4q0ai98l8s7b.apps.googleusercontent.com';

const createInstance = (baseURL) => {
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Attach JWT to every request
  instance.interceptors.request.use(
    async config => {
      const token = await AsyncStorage.getItem('@appchef:access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error),
  );

  // Normalize error messages
  instance.interceptors.response.use(
    response => response,
    async error => {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Error inesperado';
      error.userMessage = typeof errorMessage === 'string'
        ? errorMessage
        : 'Error inesperado';
      return Promise.reject(error);
    },
  );

  return instance;
};

// ─── Service instances ───
export const userApi = createInstance(USER_SERVICE_URL);
export const reservationApi = createInstance(RESERVATION_SERVICE_URL);
export const chatApi = createInstance(CHAT_SERVICE_URL);

// Default export apunta al user service
export default userApi;
