// src/lib/features/metrics/metricsSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import metricsService, { ZabbixHost, ZabbixItem, ZabbixProblem, HostsSummary } from './metricsService';
import { RootState } from '@/lib/store/store';

// État initial du slice
interface MetricsState {
  hosts: ZabbixHost[];
  items: { [hostid: string]: ZabbixItem[] }; // Items par host ID
  problems: ZabbixProblem[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null; // Timestamp de la dernière récupération
  hostsSummary?: HostsSummary | null;
}

const initialState: MetricsState = {
  hosts: [],
  items: {},
  problems: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  hostsSummary: null,
};

// Thunks asynchrones pour récupérer les données de Zabbix

// Récupérer la liste des hôtes
export const fetchHosts = createAsyncThunk<ZabbixHost[], void, { rejectValue: string }>(
  'metrics/fetchHosts',
  async (_, { rejectWithValue }) => {
    try {
      const hosts = await metricsService.getHosts();
      return hosts;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des hôtes';
      return rejectWithValue(message);
    }
  }
);

// Récupérer le résumé des hôtes
export const fetchHostsSummary = createAsyncThunk<HostsSummary, void, { rejectValue: string }>(
  'metrics/fetchHostsSummary',
  async (_, { rejectWithValue }) => {
    try {
      const summary = await metricsService.getHostsSummary();
      return summary;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du résumé des hôtes';
      return rejectWithValue(message);
    }
  }
);

// Récupérer les items d'un hôte spécifique
export const fetchItemsForHost = createAsyncThunk<
  { hostid: string; items: ZabbixItem[] },
  string,
  { rejectValue: string }
>(
  'metrics/fetchItemsForHost',
  async (hostid, { rejectWithValue }) => {
    try {
      const items = await metricsService.getItemsForHost(hostid);
      return { hostid, items };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des items';
      return rejectWithValue(message);
    }
  }
);

// Récupérer les problèmes actifs
export const fetchProblems = createAsyncThunk<ZabbixProblem[], void, { rejectValue: string }>(
  'metrics/fetchProblems',
  async (_, { rejectWithValue }) => {
    try {
      const problems = await metricsService.getProblems();
      return problems;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des problèmes';
      return rejectWithValue(message);
    }
  }
);

// Slice Redux
export const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    // Action pour vider les erreurs
    clearError: (state) => {
      state.error = null;
    },
    // Action pour vider les items d'un hôte spécifique
    clearItemsForHost: (state, action: PayloadAction<string>) => {
      delete state.items[action.payload];
    },
    // Action pour vider toutes les données (utile pour la déconnexion)
    clearAllData: (state) => {
      state.hosts = [];
      state.items = {};
      state.problems = [];
      state.error = null;
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Récupération des hôtes
      .addCase(fetchHosts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hosts = action.payload;
        state.lastFetch = Date.now();
      })
      .addCase(fetchHosts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Erreur lors de la récupération des hôtes';
      })
      
      // Récupération des items d'un hôte
      .addCase(fetchItemsForHost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchItemsForHost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items[action.payload.hostid] = action.payload.items;
      })
      .addCase(fetchItemsForHost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Erreur lors de la récupération des items';
      })
      
      // Récupération des problèmes
      .addCase(fetchProblems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProblems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.problems = action.payload;
      })
      .addCase(fetchProblems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Erreur lors de la récupération des problèmes';
      })
      // Résumé des hôtes
      .addCase(fetchHostsSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHostsSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hostsSummary = action.payload;
      })
      .addCase(fetchHostsSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Erreur lors du résumé des hôtes";
      });
  },
});

// Actions exportées
export const { clearError, clearItemsForHost, clearAllData } = metricsSlice.actions;

// Sélecteurs
export const selectHosts = (state: RootState) => state.metrics.hosts;
export const selectItemsForHost = (hostid: string) => (state: RootState) => state.metrics.items[hostid] || [];
export const selectProblems = (state: RootState) => state.metrics.problems;
export const selectMetricsLoading = (state: RootState) => state.metrics.isLoading;
export const selectMetricsError = (state: RootState) => state.metrics.error;
export const selectLastFetch = (state: RootState) => state.metrics.lastFetch;

// Sélecteur pour le nombre d'hôtes en ligne/hors ligne
export const selectHostsStats = (state: RootState) => {
  const hosts = state.metrics.hosts;
  const total = hosts.length;
  
  console.log('Hosts in selectHostsStats:', hosts);
  if (hosts.length > 0) {
    console.log('First host available:', hosts[0].available, 'type:', typeof hosts[0].available);
    console.log('First host active_available:', hosts[0].active_available, 'type:', typeof hosts[0].active_available);
    
    // Affichons toutes les propriétés du premier hôte pour déboguer
    console.log('First host all properties:', Object.keys(hosts[0]));
  }
  
  const online = hosts.filter(host => {
    // On vérifie d'abord active_available puis available
    const isOnline = host.active_available === '1' || host.available === '1';
    console.log(`Host ${host.name} active_available: ${host.active_available}, available: ${host.available}, isOnline: ${isOnline}`);
    return isOnline;
  }).length;
  const offline = total - online;
  
  return { total, online, offline };
};

// Sélecteur pour les problèmes par sévérité
export const selectProblemsBySeverity = (state: RootState) => {
  const problems = state.metrics.problems;
  const severityCount = {
    '0': 0, // Not classified
    '1': 0, // Information
    '2': 0, // Warning
    '3': 0, // Average
    '4': 0, // High
    '5': 0, // Disaster
  };
  
  problems.forEach(problem => {
    severityCount[problem.severity as keyof typeof severityCount]++;
  });
  
  return severityCount;
};

export default metricsSlice.reducer;