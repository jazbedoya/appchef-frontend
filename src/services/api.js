import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Service URLs ───
// En Android emulator, usar IP de WSL2 en lugar de localhost
import { Platform } from 'react-native';
const HOST = Platform.OS === 'android' ? '172.19.140.145' : 'localhost';

export const USER_SERVICE_URL = `http://${HOST}:8001`;
export const RESERVATION_SERVICE_URL = `http://${HOST}:8003`;
export const CHAT_SERVICE_URL = `http://${HOST}:8004`;

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
