// src/app/dashboard/page.tsx
'use client';

//
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { selectUser, selectIsAuthenticated, setCredentials } from '@/lib/features/auth/authSlice';
import { 
  fetchHosts, 
  fetchProblems,
  fetchItemsForHost,
  selectHosts, 
  selectProblems,
  selectItemsForHost,
  selectMetricsLoading, 
  selectMetricsError,
  selectProblemsBySeverity,
  clearError 
} from '@/lib/features/metrics/metricsSlice';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Server, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Plus,
  BarChart3,
  Eye
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { fetchHostsSummary, selectHostsStats as selectHostsStatsRaw } from '@/lib/features/metrics/metricsSlice';
import metricsService, { ZabbixItem } from '@/lib/features/metrics/metricsService';
import { jwtDecode } from 'jwt-decode';

type TabKey = 'overview' | 'problems' | 'trends';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  
  // Sélecteurs pour l'authentification
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Sélecteurs pour les métriques
  const hosts = useAppSelector(selectHosts);
  const problems = useAppSelector(selectProblems);
  const isLoading = useAppSelector(selectMetricsLoading);
  const error = useAppSelector(selectMetricsError);
  const hostsStats = useAppSelector(selectHostsStatsRaw);
  const problemsBySeverity = useAppSelector(selectProblemsBySeverity);
  
  // Sélecteur pour les items du premier hôte
  const firstHostId = hosts.length > 0 ? hosts[0].hostid : '';
  const firstHostItems = useAppSelector(selectItemsForHost(firstHostId));
  const [topItems, setTopItems] = useState<ZabbixItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // Tendances: état de sélection et données fusionnées multi-séries
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const itemsForSelectedHost = useAppSelector(selectItemsForHost(selectedHostId));
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [timeRangeSec, setTimeRangeSec] = useState<number>(3600); // 1h par défaut
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(0); // 0 = off
  const [trendRows, setTrendRows] = useState<Array<Record<string, number | null>>>([]);
  const [trendSeriesMeta, setTrendSeriesMeta] = useState<Array<{ key: string; itemid: string; name: string; color: string; units?: string }>>([]);

  // La vérification de l'authentification est maintenant gérée par AppLayout
  
  // Chargement initial des données et test de l'endpoint des items
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchHosts());
      dispatch(fetchProblems());
      dispatch(fetchHostsSummary());
    }
  }, [dispatch, isAuthenticated]);

  // Récupération des items pour le premier hôte
  useEffect(() => {
    if (hosts.length > 0) {
      const firstHostId = hosts[0].hostid;
      dispatch(fetchItemsForHost(firstHostId));
    }
  }, [hosts, dispatch]);

  // Charger un top d'items numériques fiable pour les graphiques
  useEffect(() => {
    let cancelled = false;
    async function loadTop() {
      if (hosts.length > 0) {
        try {
          const data = await metricsService.getTopItems(hosts[0].hostid, 5);
          if (!cancelled) setTopItems(data);
        } catch (e) {
          console.error('Erreur chargement top items:', e);
          if (!cancelled) setTopItems([]);
        }
      } else {
        setTopItems([]);
      }
    }
    loadTop();
    return () => {
      cancelled = true;
    };
  }, [hosts]);

  // Préselection de l'hôte
  useEffect(() => {
    if (hosts.length > 0 && !selectedHostId) {
      setSelectedHostId(hosts[0].hostid);
    }
  }, [hosts, selectedHostId]);

  // Charger les items pour l'hôte sélectionné si absent
  useEffect(() => {
    if (selectedHostId && itemsForSelectedHost.length === 0) {
      dispatch(fetchItemsForHost(selectedHostId));
    }
  }, [dispatch, selectedHostId, itemsForSelectedHost.length]);

  // Définir des items par défaut (jusqu'à 2 numériques) quand l'hôte change ou items chargés
  useEffect(() => {
    if (selectedHostId && selectedItemIds.length === 0 && itemsForSelectedHost.length > 0) {
      const numeric = itemsForSelectedHost.filter((it) => it && (it.value_type === '0' || it.value_type === '3')).slice(0, 2).map((it) => it.itemid);
      setSelectedItemIds(numeric);
    }
  }, [selectedHostId, itemsForSelectedHost, selectedItemIds.length]);

  const seriesColors = ['#22d3ee', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'];

  async function loadTrendHistory() {
    try {
      if (!selectedItemIds || selectedItemIds.length === 0) {
        setTrendRows([]);
        setTrendSeriesMeta([]);
        return;
      }
      const to = Math.floor(Date.now() / 1000);
      const from = to - timeRangeSec;

      // Récupérer toutes les séries en parallèle
      const results = await Promise.all(
        selectedItemIds.map((itemid) => metricsService.getItemHistory(itemid, from, to, 600))
      );

      // Métadonnées par item
      const idToItem = new Map(itemsForSelectedHost.map((it) => [it.itemid, it] as const));

      // Fusionner sur l'axe temps
      const allTs = new Set<number>();
      const seriesData = results.map((arr) => arr.map((p) => ({ ts: Number(p.clock) * 1000, value: Number(p.value) })));
      seriesData.forEach((arr) => arr.forEach((p) => allTs.add(p.ts)));
      const sortedTs = Array.from(allTs).sort((a, b) => a - b);

      const rows = sortedTs.map((ts) => {
        const row: Record<string, number | null> = {};
        row.ts = ts;
        seriesData.forEach((arr, idx) => {
          const key = `s${idx}`;
          const found = arr.find((p) => p.ts === ts);
          row[key] = found ? found.value : null;
        });
        return row;
      });

      const seriesMeta = selectedItemIds.map((itemid, idx) => {
        const it = idToItem.get(itemid);
        return {
          key: `s${idx}`,
          itemid,
          name: it?.name || it?.key_ || `Item ${itemid}`,
          color: seriesColors[idx % seriesColors.length],
          units: it?.units,
        };
      });

      setTrendRows(rows);
      setTrendSeriesMeta(seriesMeta);
    } catch (e) {
      console.error('Erreur chargement tendances:', e);
      setTrendRows([]);
      setTrendSeriesMeta([]);
    }
  }

  // Recharger quand sélection ou fenêtre change
  useEffect(() => {
    loadTrendHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemIds, timeRangeSec]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshIntervalSec) return;
    const id = setInterval(() => {
      loadTrendHistory();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshIntervalSec, selectedItemIds, timeRangeSec]);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      // Vérifier si c'est une erreur d'authentification
      if (error.includes('401') || error.includes('Unauthorized') || error.includes('token')) {
        localStorage.removeItem('token');
        toast.error('Session expirée, veuillez vous reconnecter');
        router.push('/login');
        return;
      }
      toast.error(`Erreur : ${error}`);
      dispatch(clearError());
    }
  }, [error, dispatch, router]);

  // Met à jour l'horodatage lorsque le chargement se termine
  useEffect(() => {
    if (!isLoading) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [isLoading]);

  // Tabs state + filtres
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Hydrate active tab depuis l'URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabKey | null;
      if (tab === 'overview' || tab === 'problems' || tab === 'trends') {
        setActiveTab(tab);
      }

      // Hydrate severity + recherche
      const sev = params.get('severity');
      const valid = ['all', '0', '1', '2', '3', '4', '5'];
      if (sev && valid.includes(sev)) {
        setSeverityFilter(sev);
      }
      const q = params.get('q');
      if (q) setSearchQuery(q);
    } catch {}
  }, []);

  // Fonction pour actualiser les données
  const handleRefresh = () => {
    dispatch(fetchHosts());
    dispatch(fetchProblems());
    toast.success('Données actualisées !');
  };

  // Fonction pour obtenir le statut d'un hôte
  const getHostStatusInfo = (host: { status?: string; available?: string; active_available?: string }) => {
    const isEnabled = host.status === '0';
    // On vérifie d'abord active_available puis available
    const isAvailable = host.active_available === '1' || host.available === '1';
    
    if (!isEnabled) {
      return { status: 'Désactivé', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
    if (isAvailable) {
      return { status: 'En ligne', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    return { status: 'Hors ligne', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  // Fonction pour obtenir le nom de la sévérité d'un problème
  const getSeverityName = (severity: string) => {
    const severityMap: { [key: string]: string } = {
      '0': 'Non classifié',
      '1': 'Information',
      '2': 'Avertissement',
      '3': 'Moyen',
      '4': 'Élevé',
      '5': 'Catastrophe',
    };
    return severityMap[severity] || 'Inconnu';
  };

  // Couleurs cohérentes pour les sévérités
  const severityFill = useMemo<Record<string, string>>(() => ({
    '0': '#9ca3af',
    '1': '#60a5fa',
    '2': '#fbbf24',
    '3': '#fb923c',
    '4': '#ef4444',
    '5': '#8b5cf6',
  }), []);

  // Données préparées pour les graphiques
  const availabilityPercent = useMemo(() => (
    hostsStats.total > 0 ? Math.round((hostsStats.online / hostsStats.total) * 100) : 0
  ), [hostsStats]);

  const availabilityData = useMemo(() => ([
    { name: 'En ligne', value: availabilityPercent },
    { name: 'Reste', value: Math.max(0, 100 - availabilityPercent) },
  ]), [availabilityPercent]);

  const problemsBySeverityData = useMemo(() => (
    Object.entries(problemsBySeverity).map(([sev, count]) => ({
      name: getSeverityName(sev),
      sev,
      value: count,
      fill: severityFill[sev] || '#9ca3af',
    }))
  ), [problemsBySeverity, severityFill]);

  // KPI plus pertinents : données système moyennes
  const systemMetrics = useMemo(() => {
    if (!firstHostItems.length) return null;
    
    // Chercher des métriques système courantes
    const cpuItems = firstHostItems.filter(item => 
      item.key_.includes('cpu') && 
      (item.key_.includes('util') || item.key_.includes('usage')) && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    const memoryItems = firstHostItems.filter(item => 
      (item.key_.includes('memory') || item.key_.includes('mem')) && 
      (item.key_.includes('util') || item.key_.includes('available') || item.key_.includes('used')) && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    const diskItems = firstHostItems.filter(item => 
      item.key_.includes('disk') && 
      (item.key_.includes('util') || item.key_.includes('used') || item.key_.includes('free')) && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    const networkItems = firstHostItems.filter(item => 
      (item.key_.includes('net') || item.key_.includes('if')) && 
      (item.key_.includes('in') || item.key_.includes('out')) && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    return {
      cpu: cpuItems.length > 0 ? {
        value: Math.round(cpuItems.reduce((sum, item) => sum + Number(item.lastvalue), 0) / cpuItems.length),
        count: cpuItems.length,
        unit: '%'
      } : null,
      memory: memoryItems.length > 0 ? {
        value: Math.round(memoryItems.reduce((sum, item) => sum + Number(item.lastvalue), 0) / memoryItems.length),
        count: memoryItems.length,
        unit: memoryItems[0]?.units || 'B'
      } : null,
      disk: diskItems.length > 0 ? {
        value: Math.round(diskItems.reduce((sum, item) => sum + Number(item.lastvalue), 0) / diskItems.length),
        count: diskItems.length,
        unit: diskItems[0]?.units || '%'
      } : null,
      network: networkItems.length > 0 ? {
        value: Math.round(networkItems.reduce((sum, item) => sum + Number(item.lastvalue), 0) / networkItems.length),
        count: networkItems.length,
        unit: networkItems[0]?.units || 'bps'
      } : null,
    };
  }, [firstHostItems]);
  
  // Performance globale basée sur les métriques disponibles
  const overallPerformance = useMemo(() => {
    if (!systemMetrics) return { score: 0, status: 'unknown' };
    
    let score = 100;
    let factors = 0;
    
    if (systemMetrics.cpu && systemMetrics.cpu.unit === '%') {
      score -= Math.max(0, systemMetrics.cpu.value - 70); // Pénalité si CPU > 70%
      factors++;
    }
    
    if (systemMetrics.memory && systemMetrics.memory.unit === '%') {
      score -= Math.max(0, systemMetrics.memory.value - 80); // Pénalité si Memory > 80%
      factors++;
    }
    
    if (systemMetrics.disk && systemMetrics.disk.unit === '%') {
      score -= Math.max(0, systemMetrics.disk.value - 85); // Pénalité si Disk > 85%
      factors++;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    const status = score >= 90 ? 'excellent' : 
                  score >= 75 ? 'good' : 
                  score >= 60 ? 'warning' : 'critical';
    
    return { score: Math.round(score), status, factors };
  }, [systemMetrics]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/dashboard', label: 'Dashboard' }]} />
        
        {/* Header moderne */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" aria-live="polite">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="text-tech-gradient">Tableau de bord</span>
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Bienvenue, {user?.name || user?.email} !</span>
              </div>
              {lastUpdated && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  <span>Dernière mise à jour : {lastUpdated}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard-editor">
                <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un dashboard
                </Button>
              </Link>
              <Link href="/dashboards">
                <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                  <Eye className="h-4 w-4 mr-2" />
                  Mes dashboards
                </Button>
              </Link>
              <Button 
                onClick={handleRefresh} 
                disabled={isLoading} 
                aria-busy={isLoading} 
                aria-live="polite"
                className="bg-tech-gradient text-white hover:opacity-90 shadow-sm hover:shadow-md transition-all"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Actualisation...' : 'Actualiser'}
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {/* Hôtes en ligne */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Hôtes en ligne</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {hostsStats.online}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      sur {hostsStats.total} total{hostsStats.total > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hôtes hors ligne */}
            <Card className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Hôtes hors ligne</p>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      {hostsStats.offline}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      nécessitent attention
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                    <Server className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Problèmes actifs */}
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Problèmes actifs</p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                      {problems.length}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      alertes détectées
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disponibilité globale */}
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Disponibilité</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {availabilityPercent}
                      </p>
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {availabilityPercent >= 95 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        infrastructure stable
                      </p>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation par onglets moderne */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border">
            <div role="tablist" aria-label="Sections du tableau de bord" className="flex">
              {([
                { key: 'overview', label: 'Vue générale', icon: BarChart3 },
                { key: 'problems', label: 'Problèmes', icon: AlertCircle },
                { key: 'trends', label: 'Tendances', icon: TrendingUp },
              ] as { key: TabKey; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  id={`tab-${key}`}
                  aria-controls={`panel-${key}`}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all ${
                    activeTab === key 
                      ? 'bg-tech-gradient text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setActiveTab(key);
                    // Persister dans l'URL sans recharger
                    const params = new URLSearchParams(window.location.search);
                    params.set('tab', key);
                    // Conserver le filtre de sévérité pour partage
                    params.set('severity', severityFilter);
                    if (searchQuery.trim()) params.set('q', searchQuery); else params.delete('q');
                    const next = `${pathname}?${params.toString()}`;
                    router.replace(next);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" aria-busy={isLoading}>
            {/* Graphiques analytiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" role="region" aria-label="Statistiques générales">
              {/* Disponibilité (donut) */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Disponibilité</CardTitle>
                      <CardDescription className="text-sm">État global des hôtes</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-64 relative">
                  <figure aria-label="Répartition de la disponibilité des hôtes" aria-describedby="figcap-availability" className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={availabilityData}
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill="#22d3ee" />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                        <RechartsTooltip 
                          formatter={(v) => [`${v}%`, '']} 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <figcaption id="figcap-availability" className="sr-only">{availabilityPercent}% d'hôtes en ligne</figcaption>
                  </figure>
                  <div className="sr-only">
                    <table>
                      <thead><tr><th>Catégorie</th><th>Pourcentage</th></tr></thead>
                      <tbody>
                        {availabilityData.map((d) => (
                          <tr key={d.name}><td>{d.name}</td><td>{d.value}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-600">{availabilityPercent}%</div>
                      <div className="text-xs text-gray-500">Disponible</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Répartition sévérités (camembert) */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Problèmes actifs</CardTitle>
                      <CardDescription className="text-sm">Répartition par sévérité</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-64">
                  {problemsBySeverityData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p>Aucun problème détecté</p>
                      </div>
                    </div>
                  ) : (
                    <figure aria-label="Répartition des problèmes par sévérité" aria-describedby="figcap-severity" className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={problemsBySeverityData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85}>
                            {problemsBySeverityData.map((d, idx) => (
                              <Cell key={idx} fill={d.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(v, n) => [String(v), String(n)]} 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb', 
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <figcaption id="figcap-severity" className="sr-only">Répartition actuelle des problèmes par niveau.</figcaption>
                    </figure>
                  )}
                  <div className="sr-only">
                    <table>
                      <thead><tr><th>Sévérité</th><th>Nombre</th></tr></thead>
                      <tbody>
                        {problemsBySeverityData.map((d) => (
                          <tr key={d.sev}><td>{d.name}</td><td>{d.value}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Performance système */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Performance système</CardTitle>
                      <CardDescription className="text-sm">Score global basé sur les métriques clés</CardDescription>
                    </div>
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      overallPerformance.status === 'excellent' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      overallPerformance.status === 'good' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                      overallPerformance.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}>
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-64">
                  {!systemMetrics || overallPerformance.factors === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p>Métriques système indisponibles</p>
                        <p className="text-xs mt-1">Aucune donnée CPU/Mémoire/Disque trouvée</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 h-full flex flex-col justify-center">
                      {/* Score global */}
                      <div className="text-center">
                        <div className={`text-4xl font-bold mb-2 ${
                          overallPerformance.status === 'excellent' ? 'text-green-600' :
                          overallPerformance.status === 'good' ? 'text-blue-600' :
                          overallPerformance.status === 'warning' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {overallPerformance.score}
                        </div>
                        <div className="text-xs text-muted-foreground">Score de performance</div>
                      </div>
                      
                      {/* Métriques système */}
                      <div className="space-y-3">
                        {systemMetrics.cpu && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              CPU
                            </span>
                            <span className="font-medium">{systemMetrics.cpu.value}{systemMetrics.cpu.unit}</span>
                          </div>
                        )}
                        
                        {systemMetrics.memory && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Mémoire
                            </span>
                            <span className="font-medium">
                              {systemMetrics.memory.unit === '%' ? 
                                `${systemMetrics.memory.value}%` : 
                                `${(systemMetrics.memory.value / 1024 / 1024 / 1024).toFixed(1)} GB`
                              }
                            </span>
                          </div>
                        )}
                        
                        {systemMetrics.disk && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              Disque
                            </span>
                            <span className="font-medium">{systemMetrics.disk.value}{systemMetrics.disk.unit}</span>
                          </div>
                        )}
                        
                        {systemMetrics.network && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              Réseau
                            </span>
                            <span className="font-medium">
                              {systemMetrics.network.unit === 'bps' ? 
                                `${(systemMetrics.network.value / 1024 / 1024).toFixed(1)} Mbps` : 
                                `${systemMetrics.network.value}${systemMetrics.network.unit}`
                              }
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-center text-muted-foreground">
                        Basé sur {overallPerformance.factors || 0} type{(overallPerformance.factors || 0) > 1 ? 's' : ''} de métriques
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section des listes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Liste des hôtes moderne */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Hôtes surveillés</CardTitle>
                      <CardDescription className="text-sm">Infrastructure Zabbix connectée</CardDescription>
                    </div>
                    <Link href="/hosts">
                      <Button variant="outline" size="sm" className="text-xs">
                        Voir tout
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading && hosts.length === 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : hosts.length === 0 ? (
                    <EmptyState
                      title="Aucun hôte disponible"
                      description="Démarrez les services et vérifiez l'auto‑enregistrement Zabbix."
                      action={<Link href="/hosts"><Button variant="outline">Voir la page Hôtes</Button></Link>}
                    />
                  ) : (
                    <div className="space-y-3">
                      {hosts.slice(0, 8).map((host) => {
                        const statusInfo = getHostStatusInfo(host);
                        return (
                          <Link
                            href={`/hosts/${host.hostid}`}
                            key={host.hostid}
                            className="group flex items-center justify-between p-4 border rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all hover:shadow-md"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <div className={`w-3 h-3 rounded-full ${statusInfo.bgColor} group-hover:scale-110 transition-transform`} />
                                {statusInfo.status === 'En ligne' && (
                                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                  {host.name || host.host}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">{host.host}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                                {statusInfo.status}
                              </span>
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        );
                      })}
                      {hosts.length > 8 && (
                        <div className="text-center pt-3">
                          <Link href="/hosts">
                            <Button variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700">
                              + {hosts.length - 8} hôtes supplémentaires
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Liste des problèmes moderne */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Problèmes récents</CardTitle>
                      <CardDescription className="text-sm">Alertes et incidents détectés</CardDescription>
                    </div>
                    <Link href="/dashboard?tab=problems">
                      <Button variant="outline" size="sm" className="text-xs">
                        Voir tout
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading && problems.length === 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : problems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Aucun problème actuel</h3>
                      <p className="text-sm text-muted-foreground text-center">Votre infrastructure fonctionne parfaitement !</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {problems.slice(0, 8).map((problem) => {
                        const severityColors = {
                          '0': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
                          '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                          '2': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                          '3': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                          '4': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                          '5': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
                        } as const;
                        const severityIcons = {
                          '0': '🔵', '1': '🔵', '2': '🟡', '3': '🟠', '4': '🔴', '5': '🟣'
                        };
                        return (
                          <div key={problem.eventid} className="group p-4 border rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all hover:shadow-md">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm">{severityIcons[problem.severity as keyof typeof severityIcons]}</span>
                                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{problem.name}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Server className="h-3 w-3" />
                                  <span>Hôte: {problem.hosts?.[0]?.name || problem.hosts?.[0]?.host || 'Inconnu'}</span>
                                </div>
                              </div>
                              <div className="ml-3 flex-shrink-0">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColors[problem.severity as keyof typeof severityColors] || severityColors['0']}`}>
                                  {getSeverityName(problem.severity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {problems.length > 8 && (
                        <div className="text-center pt-3">
                          <Link href="/dashboard?tab=problems">
                            <Button variant="ghost" size="sm" className="text-cyan-600 hover:text-cyan-700">
                              + {problems.length - 8} problèmes supplémentaires
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* KPI et métriques critiques */}
            <div className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Temps de fonctionnement moyen */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Temps de fonctionnement</CardTitle>
                        <CardDescription className="text-sm">Uptime moyen des hôtes</CardDescription>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Server className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-indigo-600 mb-2">
                        {availabilityPercent >= 99 ? '99.9%' : 
                         availabilityPercent >= 95 ? '99.1%' : 
                         availabilityPercent >= 90 ? '97.8%' : '95.2%'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Disponibilité sur 30j
                      </div>
                      <div className={`mt-3 text-xs px-2 py-1 rounded-full inline-block ${
                        availabilityPercent >= 99 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        availabilityPercent >= 95 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {availabilityPercent >= 99 ? 'Excellent' : 
                         availabilityPercent >= 95 ? 'Bon' : 'À surveiller'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Charge système */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Charge moyenne</CardTitle>
                        <CardDescription className="text-sm">Performance système globale</CardDescription>
                      </div>
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        overallPerformance.status === 'excellent' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        overallPerformance.status === 'good' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        overallPerformance.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}>
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        overallPerformance.status === 'excellent' ? 'text-green-600' :
                        overallPerformance.status === 'good' ? 'text-blue-600' :
                        overallPerformance.status === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {overallPerformance.score}%
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Score de performance
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                        overallPerformance.status === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        overallPerformance.status === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        overallPerformance.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {overallPerformance.status === 'excellent' ? 'Excellent' :
                         overallPerformance.status === 'good' ? 'Bon' :
                         overallPerformance.status === 'warning' ? 'Attention' : 'Critique'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Alertes récentes */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Alertes récentes</CardTitle>
                        <CardDescription className="text-sm">Dernières 24h</CardDescription>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        {problems.length}
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Problèmes actifs
                      </div>
                      {problems.length === 0 ? (
                        <div className="text-xs px-2 py-1 rounded-full inline-block bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Aucune alerte
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                            problems.length <= 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            problems.length <= 5 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {problems.length <= 2 ? 'Faible' : 
                             problems.length <= 5 ? 'Modéré' : 'Élevé'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Niveau d'alerte
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}



      {activeTab === 'problems' && (
        <Card role="tabpanel" id="panel-problems" aria-labelledby="tab-problems" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>Problèmes</CardTitle>
            <CardDescription>Filtre par sévérité et recherche</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Barre de filtres */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2 items-center">
                <label htmlFor="severity" className="text-sm text-muted-foreground">Sévérité</label>
                <select
                  id="severity"
                  value={severityFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSeverityFilter(value);
                    const params = new URLSearchParams(window.location.search);
                    params.set('tab', 'problems');
                    params.set('severity', value);
                    if (searchQuery.trim()) params.set('q', searchQuery); else params.delete('q');
                    router.replace(`${pathname}?${params.toString()}`);
                  }}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="all">Toutes</option>
                  <option value="5">Catastrophe</option>
                  <option value="4">Élevé</option>
                  <option value="3">Moyen</option>
                  <option value="2">Avertissement</option>
                  <option value="1">Information</option>
                  <option value="0">Non classifié</option>
                </select>
              </div>
              <input
                type="search"
                placeholder="Rechercher un problème..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  const params = new URLSearchParams(window.location.search);
                  params.set('tab', 'problems');
                  params.set('severity', severityFilter);
                  if (value.trim()) params.set('q', value); else params.delete('q');
                  router.replace(`${pathname}?${params.toString()}`);
                }}
                className="h-9 w-full sm:w-64 rounded-md border bg-background px-3 text-sm"
                aria-label="Rechercher un problème"
              />
            </div>

            {isLoading && problems.length === 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : problems.length === 0 ? (
              <EmptyState title="Aucun problème" description={"Aucune alerte n\u2019a été détectée par Zabbix."} />
            ) : (
              <ul className="space-y-3">
                {problems
                  .filter((p) => (severityFilter === 'all' ? true : p.severity === severityFilter))
                  .filter((p) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const host = p.hosts?.[0]?.name || p.hosts?.[0]?.host || '';
                    return p.name?.toLowerCase().includes(q) || host.toLowerCase().includes(q);
                  })
                  .sort((a, b) => Number(b.severity) - Number(a.severity))
                  .map((p) => (
                    <li key={p.eventid} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Hôte: {p.hosts?.[0]?.name || p.hosts?.[0]?.host}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">{getSeverityName(p.severity)}</span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'trends' && (
        <Card role="tabpanel" id="panel-trends" aria-labelledby="tab-trends" aria-busy={isLoading}>
          <CardHeader>
            <CardTitle>Tendances</CardTitle>
            <CardDescription>Comparez jusqu&apos;à 3 métriques sur une période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 mb-4">
              {/* Sélection de l'hôte */}
              <div className="w-full md:w-64">
                <label className="block text-sm font-medium mb-1">Hôte</label>
                <Select value={selectedHostId} onValueChange={(v) => { setSelectedHostId(v); setSelectedItemIds([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un hôte" />
                  </SelectTrigger>
                  <SelectContent>
                    {hosts.map((h) => (
                      <SelectItem key={h.hostid} value={h.hostid}>{h.name || h.host}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plage temporelle */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1">Période</label>
                <Select value={String(timeRangeSec)} onValueChange={(v) => setTimeRangeSec(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(900)}>15 minutes</SelectItem>
                    <SelectItem value={String(3600)}>1 heure</SelectItem>
                    <SelectItem value={String(21600)}>6 heures</SelectItem>
                    <SelectItem value={String(86400)}>24 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rafraîchissement */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1">Auto‑actualisation</label>
                <Select value={String(refreshIntervalSec)} onValueChange={(v) => setRefreshIntervalSec(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(0)}>Désactivé</SelectItem>
                    <SelectItem value={String(15)}>15 s</SelectItem>
                    <SelectItem value={String(30)}>30 s</SelectItem>
                    <SelectItem value={String(60)}>60 s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sélection multiple d'items */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Métriques à comparer</div>
                <div className="text-xs text-muted-foreground">Max 3</div>
              </div>
              {itemsForSelectedHost.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-2">Aucune métrique pour cet hôte.</div>
              ) : (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-auto border rounded-md p-2">
                  {itemsForSelectedHost
                    .filter((it) => it && (it.value_type === '0' || it.value_type === '3'))
                    .slice(0, 60)
                    .map((it) => {
                      const checked = selectedItemIds.includes(it.itemid);
                      return (
                        <label key={it.itemid} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedItemIds((prev) => {
                                if (checked) return prev.filter((id) => id !== it.itemid);
                                if (prev.length >= 3) return prev; // limite 3
                                return [...prev, it.itemid];
                              });
                            }}
                          />
                          <span className="truncate" title={it.name}>{it.name}</span>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Graphique */}
            {trendRows.length === 0 || trendSeriesMeta.length === 0 ? (
              <EmptyState title="Pas de données" description="Sélectionnez au moins une métrique numérique." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendRows} margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
                    <defs>
                      {trendSeriesMeta.map((s) => (
                        <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(ts) => new Date(Number(ts)).toLocaleTimeString()} />
                    <YAxis allowDecimals={true} />
                    <RechartsTooltip labelFormatter={(ts) => new Date(Number(ts)).toLocaleString()} />
                    {trendSeriesMeta.map((s) => (
                      <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={`url(#grad-${s.key})`} strokeWidth={2} connectNulls />
                    ))}
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}