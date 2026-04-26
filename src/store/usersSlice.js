import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../services/api';

export const fetchNearbyUsers = createAsyncThunk(
  'users/fetchNearby',
  async ({ lat, lng, radius_km = 50, is_host }, { rejectWithValue }) => {
    try {
      const params = { lat, lng, radius_km };
      if (is_host !== undefined) params.is_host = is_host;
      const res = await userApi.get('/users/nearby', { params });
      return res.data;
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Error cargando usuarios');
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    nearbyUsers: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearNearbyUsers: (state) => { state.nearbyUsers = []; },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNearbyUsers.pending, state => { state.isLoading = true; state.error = null; })
      .addCase(fetchNearbyUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;
        state.nearbyUsers = Array.isArray(payload) ? payload : (payload?.users || []);
      })
      .addCase(fetchNearbyUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearNearbyUsers } = usersSlice.actions;
export const selectNearbyUsers = state => state.users.nearbyUsers;
export const selectUsersLoading = state => state.users.isLoading;
export default usersSlice.reducer;
