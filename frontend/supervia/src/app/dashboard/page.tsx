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
  selectHostsStats,
  selectProblemsBySeverity,
  clearError 
} from '@/lib/features/metrics/metricsSlice';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { fetchHostsSummary, selectHostsStats as selectHostsStatsRaw } from '@/lib/features/metrics/metricsSlice';
import metricsService, { ZabbixItem } from '@/lib/features/metrics/metricsService';

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

  // Vérification de l'authentification
  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      } else {
        // Recharger le token dans Redux
        dispatch(setCredentials({ token }));
      }
    }
  }, [isAuthenticated, router, dispatch]);

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
        const row: Record<string, number | null> = { ts } as any;
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
      toast.error(`Erreur : ${error}`);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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
    console.log('Host data:', host);
    console.log('Host available type:', typeof host.available, 'value:', host.available);
    console.log('Host active_available type:', typeof host.active_available, 'value:', host.active_available);
    
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
  const severityFill: Record<string, string> = {
    '0': '#9ca3af',
    '1': '#60a5fa',
    '2': '#fbbf24',
    '3': '#fb923c',
    '4': '#ef4444',
    '5': '#8b5cf6',
  };

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
  ), [problemsBySeverity]);

  const topItemsBarData = useMemo(() => (
    (topItems.length > 0 ? topItems : firstHostItems)
      .slice(0, 5)
      .map((it) => ({
        itemid: it.itemid,
        name: (it.name || it.key_).slice(0, 18),
        value: Number(it.lastvalue) || 0,
        units: it.units,
      }))
  ), [topItems, firstHostItems]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Vérification de l&apos;authentification...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/dashboard', label: 'Dashboard' }]} />
      {/* Header */}
      <div className="flex items-center justify-between mb-8" aria-live="polite">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-tech-gradient">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {user?.name || user?.email} !
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">Dernière mise à jour : {lastUpdated}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard-editor">
            <Button variant="outline">
              Créer un dashboard
            </Button>
          </Link>
          <Button onClick={handleRefresh} disabled={isLoading} aria-busy={isLoading} aria-live="polite">
            {isLoading ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Sous navigation (onglets) */}
      <div role="tablist" aria-label="Sections du tableau de bord" className="mb-6 flex flex-wrap gap-2 border-b">
        {([
          { key: 'overview', label: 'Vue générale' },
          { key: 'problems', label: 'Problèmes' },
          { key: 'trends', label: 'Tendances' },
        ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            id={`tab-${key}`}
            aria-controls={`panel-${key}`}
            className={`px-3 py-2 -mb-px border-b-2 ${
              activeTab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
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
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" aria-busy={isLoading}>
          {/* Statistiques générales avec charts Recharts (données préparées) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" role="region" aria-label="Statistiques générales">
            {/* Disponibilité (donut) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Disponibilité</CardTitle>
                <CardDescription className="text-xs">Hôtes disponibles</CardDescription>
              </CardHeader>
              <CardContent className="h-48">
                <figure aria-label="Répartition de la disponibilité des hôtes" aria-describedby="figcap-availability" className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={availabilityData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill="#22d3ee" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <RechartsTooltip formatter={(v) => [`${v}%`, '']} />
                      <Legend verticalAlign="bottom" height={24} />
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
                <div className="text-center text-sm mt-2">{availabilityPercent}% en ligne</div>
              </CardContent>
            </Card>

            {/* Répartition sévérités (camembert) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Répartition des problèmes</CardTitle>
                <CardDescription className="text-xs">Par sévérité</CardDescription>
              </CardHeader>
              <CardContent className="h-48">
                <figure aria-label="Répartition des problèmes par sévérité" aria-describedby="figcap-severity" className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={problemsBySeverityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {problemsBySeverityData.map((d, idx) => (
                          <Cell key={idx} fill={d.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(v, n) => [String(v), String(n)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <figcaption id="figcap-severity" className="sr-only">Répartition actuelle des problèmes par niveau.</figcaption>
                </figure>
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

            {/* Volume d'items (barres) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Items (échantillon)</CardTitle>
                <CardDescription className="text-xs">Top 5 de {hosts[0]?.name || 'hôte'} (numériques)</CardDescription>
              </CardHeader>
              <CardContent className="h-48">
                {topItemsBarData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune métrique numérique</div>
                ) : (
                  <>
                    <figure aria-label="Top 5 des items numériques du premier hôte" className="h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topItemsBarData} margin={{ left: 12, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={40} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]}>
                            {topItemsBarData.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill="#22d3ee" />
                            ))}
                          </Bar>
                          <RechartsTooltip formatter={(v: number, _n, p: any) => [`${v} ${p?.payload?.units || ''}`.trim(), p?.payload?.name]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </figure>
                    <div className="sr-only">
                      <table>
                        <thead><tr><th>Nom</th><th>Valeur</th><th>Unité</th></tr></thead>
                        <tbody>
                          {topItemsBarData.map((d) => (
                            <tr key={d.itemid}><td>{d.name}</td><td>{d.value}</td><td>{d.units || ''}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deux colonnes: hôtes et problèmes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hôtes surveillés</CardTitle>
                <CardDescription>Liste des hôtes Zabbix et leur état actuel</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && hosts.length === 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
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
                    {hosts.slice(0, 10).map((host) => {
                      const statusInfo = getHostStatusInfo(host);
                      return (
                        <Link
                          href={`/hosts/${host.hostid}`}
                          key={host.hostid}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${statusInfo.bgColor}`} />
                            <div>
                              <p className="font-medium">{host.name || host.host}</p>
                              <p className="text-sm text-muted-foreground">{host.host}</p>
                            </div>
                          </div>
                          <span className={`text-sm ${statusInfo.color}`}>{statusInfo.status}</span>
                        </Link>
                      );
                    })}
                    {hosts.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center pt-3">... et {hosts.length - 10} hôtes de plus</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Problèmes récents</CardTitle>
                <CardDescription>Alertes et problèmes détectés par Zabbix</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && problems.length === 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : problems.length === 0 ? (
                  <EmptyState title="Aucun problème actuel" description="Tout est au vert pour le moment." />
                ) : (
                  <div className="space-y-3">
                    {problems.slice(0, 10).map((problem) => {
                      const severityColors = {
                        '0': 'bg-gray-100 text-gray-800',
                        '1': 'bg-blue-100 text-blue-800',
                        '2': 'bg-yellow-100 text-yellow-800',
                        '3': 'bg-orange-100 text-orange-800',
                        '4': 'bg-red-100 text-red-800',
                        '5': 'bg-purple-100 text-purple-800',
                      } as const;
                      return (
                        <div key={problem.eventid} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{problem.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">Hôte: {problem.hosts?.[0]?.name || problem.hosts?.[0]?.host || 'Inconnu'}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${severityColors[problem.severity as keyof typeof severityColors] || severityColors['0']}`}>{getSeverityName(problem.severity)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {problems.length > 10 && <p className="text-sm text-muted-foreground text-center pt-3">... et {problems.length - 10} problèmes de plus</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items du premier hôte */}
          {hosts.length > 0 && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Métriques de {hosts[0].name}</CardTitle>
                  <CardDescription>Items disponibles pour cet hôte</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading && firstHostItems.length === 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : firstHostItems.length === 0 ? (
                    <EmptyState title="Aucune métrique disponible" />
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-4 font-medium text-sm mb-2">
                        <div>Nom</div>
                        <div>Clé</div>
                        <div>Dernière valeur</div>
                        <div>Unité</div>
                      </div>
                      {firstHostItems.slice(0, 10).map((item) => (
                        <div key={item.itemid} className="grid grid-cols-4 gap-4 text-sm p-3 border rounded-lg">
                          <div className="truncate" title={item.name}>{item.name}</div>
                          <div className="truncate font-mono text-xs" title={item.key_}>{item.key_}</div>
                          <div>{item.lastvalue || 'N/A'}</div>
                          <div>{item.units}</div>
                        </div>
                      ))}
                      {firstHostItems.length > 10 && <p className="text-sm text-muted-foreground text-center pt-3">... et {firstHostItems.length - 10} métriques de plus</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
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
            <CardDescription>Comparez jusqu'à 3 métriques sur une période</CardDescription>
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
  );
}