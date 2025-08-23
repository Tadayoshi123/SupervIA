/**
 * Configuration du store Redux avec Redux Toolkit
 * 
 * Combine les reducers auth et metrics pour la gestion d'état globale.
 * Utilisé par le StoreProvider pour l'injection dans l'arbre React.
 * 
 * @author SupervIA Team
 * @version 1.0.0
 */

// src/lib/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import metricsReducer from '../features/metrics/metricsSlice';

/**
 * Crée une nouvelle instance du store Redux
 * @returns {Object} Store configuré avec tous les reducers
 */
export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      metrics: metricsReducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
