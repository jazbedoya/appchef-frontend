import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import eventsReducer from './eventsSlice';
import usersReducer from './usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
    users: usersReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        warnAfter: 200,
        ignoredActions: ['events/setEvents', 'events/addEvent', 'events/setCurrentEvent'],
        ignoredPaths: [
          'events.events',
          'events.currentEvent',
          'events.nearbyEvents',
          'users.nearbyUsers',
        ],
      },
    }),
});

export default store;
