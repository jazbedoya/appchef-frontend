# App Chef - Frontend

> Descubre experiencias gastronómicas únicas. Chefs caseros publican cenas y talleres, tú reservas y disfrutas.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.2-764ABC?logo=redux)
![Platform](https://img.shields.io/badge/Platform-iOS_|_Android_|_Web-green)

## Pantallas

| Pantalla | Descripción |
|----------|-------------|
| **Auth** | Login / Registro con validación (8+ chars, mayúscula, dígito) |
| **Home** | Feed de eventos con búsqueda por ciudad, filtros por cocina, hero cards |
| **Mapa** | Descubrimiento geográfico con marcadores, filtros de precio, distancia |
| **Detalle evento** | Info completa: menú por platos, host, spots disponibles, reserva con party size |
| **Crear evento** | Formulario 3 pasos: info → detalles → ubicación (geocoding OSM) |
| **Chat** | Mensajería en tiempo real por evento (WebSocket) |
| **Perfil** | Datos del usuario, historial de cenas, toggle host, editar perfil |

## Tech Stack

- **Framework:** React Native + Expo SDK 54 (managed workflow)
- **State:** Redux Toolkit (authSlice + eventsSlice)
- **Navigation:** React Navigation 6 (Bottom Tabs + Stack)
- **HTTP:** Axios con interceptors JWT
- **Storage:** AsyncStorage para tokens y sesión
- **Maps:** react-native-maps (nativo) + Leaflet (web)
- **Styling:** StyleSheet con design system propio (colors, spacing, typography)

## Arquitectura

```
src/
├── screens/          7 pantallas (Auth, Home, Map, EventDetail, Create, Chat, Profile)
├── navigation/       AppNavigator (tabs + stack) + AuthNavigator
├── store/            Redux: authSlice (login/register/profile) + eventsSlice (CRUD + reservas)
├── services/         API clients: userApi (:8000) + reservationApi (:8002) + chatApi (:8004)
├── components/       EventCard, UserAvatar, RatingStars, SkeletonCard
└── theme/            colors (paleta gastronómica), spacing, typography
```

## Configuración

```bash
npm install
npx expo start --clear
```

### Variables de entorno
La API se configura en `src/services/api.js`:
- `USER_SERVICE_URL` — Servicio de usuarios (puerto 8000)
- `RESERVATION_SERVICE_URL` — Servicio de reservas (puerto 8002)
- `CHAT_SERVICE_URL` — Servicio de chat (puerto 8004)

## Paleta de colores

| Color | Hex | Uso |
|-------|-----|-----|
| Forest Green | `#2C3E2D` | Primary / botones |
| Warm Gold | `#D4A853` | Accent / badges precio |
| Ivory | `#FDFAF5` | Surface / fondos |
| Terracotta | `#C17A5A` | Detalles cálidos |

## Autor

**Jazmín Bedoya** — [GitHub](https://github.com/jazbedoya)
