import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../services/authService';

// ─── Async Thunks ───

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const result = await authService.login({ email, password });
      return result;
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Login failed');
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const result = await authService.register(userData);
      return result;
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data?.errors;
      const msg = Array.isArray(detail)
        ? detail.map(e => e.message).join(', ')
        : (typeof detail === 'string' ? detail : error.userMessage || 'Error al registrarse');
      return rejectWithValue(msg);
    }
  },
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const loadStoredUser = createAsyncThunk(
  'auth/loadStoredUser',
  async (_, { rejectWithValue }) => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) return null;

      // Try to get fresh user data; if token is expired/invalid, clear session
      try {
        const user = await authService.getCurrentUser();
        return user;
      } catch (error) {
        if (error.response?.status === 401) {
          await authService.logout();
          return null;
        }
        // Network error or other issue — fall back to cached user
        return await authService.getStoredUser();
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await require('../services/api').default.put(`/users/${userId}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Update failed');
    }
  },
);

// ─── Slice ───

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: false,
    error: null,
  },
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    resetAuth: state => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Login
    builder
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, state => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    // Load stored user (app startup)
    builder
      .addCase(loadStoredUser.pending, state => {
        state.isInitializing = true;
      })
      .addCase(loadStoredUser.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(loadStoredUser.rejected, state => {
        state.isInitializing = false;
        state.isAuthenticated = false;
      });

    // Update profile
    builder
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError, setUser, resetAuth } = authSlice.actions;

// ─── Selectors ───
export const selectUser = state => state.auth.user;
export const selectIsAuthenticated = state => state.auth.isAuthenticated;
export const selectAuthLoading = state => state.auth.isLoading;
export const selectAuthError = state => state.auth.error;
export const selectIsInitializing = state => state.auth.isInitializing;
export const selectIsHost = state => state.auth.user?.profile?.is_host || state.auth.user?.role === 'host';

export default authSlice.reducer;
