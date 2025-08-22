'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { 
  fetchItemsForHost,
  selectItemsForHost,
  selectHosts,
  selectMetricsLoading,
  selectMetricsError,
  clearError
} from '@/lib/features/metrics/metricsSlice';
import { selectIsAuthenticated } from '@/lib/features/auth/authSlice';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  RefreshCw, 
  Server, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff,
  Monitor,
  Globe,
  Shield,
  Search,
  BarChart3,
  Gauge,
  Database,
  Network,
  Cpu,
  HardDrive,
  MemoryStick,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function HostDetailPage() {
  const params = useParams();
  const hostId = params.hostId as string;
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Sélecteurs pour l'authentification et les données
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hosts = useAppSelector(selectHosts);
  const items = useAppSelector(selectItemsForHost(hostId));
  const isLoading = useAppSelector(selectMetricsLoading);
  const error = useAppSelector(selectMetricsError);
  
  // Trouver l'hôte correspondant à l'ID
  const host = hosts.find(h => h.hostid === hostId);
  
  // Vérification de l'authentification
  useEffect(() => {
    if (!isAuthenticated) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
    }
  }, [isAuthenticated, router]);
  
  // Chargement des items pour l'hôte
  useEffect(() => {
    if (isAuthenticated && hostId) {
      dispatch(fetchItemsForHost(hostId));
    }
  }, [dispatch, hostId, isAuthenticated]);
  
  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      toast.error(`Erreur : ${error}`);
      dispatch(clearError());
    }
  }, [error, dispatch]);
  
  // Fonction pour actualiser les données
  const handleRefresh = () => {
    dispatch(fetchItemsForHost(hostId));
    toast.success('Données actualisées !');
  };
  
  // Fonction pour formater les valeurs selon leur type
  const formatValue = (value: string | undefined, units: string) => {
    if (!value) return 'N/A';

    // Truncate very long strings that are likely not simple numerical values.
    if (value.length > 25) {
      return value.substring(0, 22) + '...';
    }
    
    // Conversion des octets en format lisible
    if (units === 'B' && !isNaN(parseFloat(value))) {
      const bytes = parseFloat(value);
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
      if (i === 0) return `${bytes} ${sizes[i]}`;
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }
    
    // For numbers with % units, format them to 2 decimal places.
    if (units === '%' && !isNaN(parseFloat(value))) {
        return `${parseFloat(value).toFixed(2)}%`;
    }
    
    // Valeurs avec unités
    return `${value} ${units || ''}`;
  };
  
  // Fonction pour obtenir la classe CSS selon la valeur et l'unité
  const getValueClass = (value: string | undefined, units: string, key: string) => {
    if (!value || units !== '%') return '';

    const percent = parseFloat(value);
    if (isNaN(percent)) return '';

    const lowerKey = key.toLowerCase();

    // Mots-clés indiquant que "plus c'est haut, moins c'est bon" (utilisation, etc.)
    const lowerIsBetterKeywords = ['util', 'usage', 'used', 'utilization'];
    // Mots-clés indiquant que "plus c'est haut, mieux c'est" (disponible, libre, etc.)
    const higherIsBetterKeywords = ['available', 'free', 'idle', 'pfree'];

    let isLowerBetter = lowerIsBetterKeywords.some(k => lowerKey.includes(k));
    let isHigherBetter = higherIsBetterKeywords.some(k => lowerKey.includes(k));

    // Cas spécifique pour éviter les conflits (ex: "used memory available")
    if (isLowerBetter && isHigherBetter) return '';
    
    // Comportement par défaut: si ni l'un ni l'autre, on ne colore pas.
    if (!isLowerBetter && !isHigherBetter) return '';

    if (isLowerBetter) {
      if (percent > 90) return 'text-red-600 dark:text-red-400 font-bold';
      if (percent > 75) return 'text-orange-500 dark:text-orange-400 font-semibold';
      return 'text-green-600 dark:text-green-400';
    }

    if (isHigherBetter) {
      if (percent < 10) return 'text-red-600 dark:text-red-400 font-bold';
      if (percent < 25) return 'text-orange-500 dark:text-orange-400 font-semibold';
      return 'text-green-600 dark:text-green-400';
    }
    
    return '';
  };
  
  // Filtre global sur les métriques (nom, clé, unités)
  const [metricQuery, setMetricQuery] = useState<string>('');
  const normalizedQuery = metricQuery.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((it) =>
      (it.name || '').toLowerCase().includes(normalizedQuery) ||
      (it.key_ || '').toLowerCase().includes(normalizedQuery) ||
      (it.units || '').toLowerCase().includes(normalizedQuery)
    );
  }, [items, normalizedQuery]);

  // Grouper les items visibles par type (préfixe)
  const groupedItems = visibleItems.reduce((acc, item) => {
    // Extraire le préfixe de la clé (avant le premier point)
    const prefix = item.key_.split('.')[0];
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // Fonction pour obtenir l'icône selon le type de métrique
  const getMetricIcon = (prefix: string) => {
    switch (prefix.toLowerCase()) {
      case 'system':
      case 'kernel':
        return Monitor;
      case 'proc':
        return Activity;
      case 'vm':
      case 'memory':
        return MemoryStick;
      case 'vfs':
      case 'disk':
        return HardDrive;
      case 'net':
        return Network;
      case 'agent':
        return Zap;
      case 'cpu':
        return Cpu;
      default:
        return Database;
    }
  };

  // Métriques clés pour le tableau de bord rapide
  const keyMetrics = useMemo(() => {
    const cpu = items.find(item => 
      item.key_.includes('cpu') && 
      (item.key_.includes('util') || item.key_.includes('usage')) && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    const memory = items.find(item => 
      (item.key_.includes('memory') || item.key_.includes('mem')) && 
      item.key_.includes('util') && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    const disk = items.find(item => 
      item.key_.includes('disk') && 
      item.key_.includes('util') && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    const load = items.find(item => 
      item.key_.includes('load') && 
      item.lastvalue && 
      !isNaN(Number(item.lastvalue))
    );
    
    return { cpu, memory, disk, load };
  }, [items]);
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Vérification de l&apos;authentification...</p>
      </div>
    );
  }
  
  if (!host) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/hosts', label: 'Hôtes' }, { href: '#', label: 'Introuvable' }]} />
          <div className="flex items-center mb-6">
            <Link href="/hosts" className="mr-4">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Hôte non trouvé</h1>
          </div>
          <Card className="shadow-sm">
            <CardContent className="py-8">
              <EmptyState
                title="Hôte introuvable"
                description={`L'hôte avec l'ID ${hostId} n'existe pas ou n'est pas accessible.`}
                icon={<XCircle className="h-12 w-12 text-red-500" />}
                action={
                  <Link href="/hosts">
                    <Button variant="outline">Retour à la liste</Button>
                  </Link>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Obtenir le statut de l'hôte
  const isEnabled = host.status === '0';
  const isAvailable = host.active_available === '1' || host.available === '1';
  let statusInfo = { 
    status: 'Inconnu', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: Shield
  };
  
  if (!isEnabled) {
    statusInfo = { 
      status: 'Désactivé', 
      color: 'text-gray-600 dark:text-gray-400', 
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      icon: Shield
    };
  } else if (isAvailable) {
    statusInfo = { 
      status: 'En ligne', 
      color: 'text-green-700 dark:text-green-300', 
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle2
    };
  } else {
    statusInfo = { 
      status: 'Hors ligne', 
      color: 'text-red-700 dark:text-red-300', 
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: XCircle
    };
  }
  
  const StatusIcon = statusInfo.icon;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6">
        <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/hosts', label: 'Hôtes' }, { href: '#', label: host.name }]} />
        
        {/* Header moderne */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center">
              <Link href="/hosts" className="mr-4">
                <Button variant="outline" size="icon" className="shadow-sm hover:shadow-md transition-shadow">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight">
                    <span className="text-tech-gradient">{host.name || host.host}</span>
                  </h1>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor}`}>
                    <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                    <span className={`text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Server className="h-4 w-4" />
                  <span>{host.host}</span>
                  {host.description && (
                    <>
                      <span>•</span>
                      <span>{host.description}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleRefresh} 
                disabled={isLoading}
                className="bg-tech-gradient text-white hover:opacity-90 shadow-sm hover:shadow-md transition-all"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Actualisation...' : 'Actualiser'}
              </Button>
            </div>
          </div>

          {/* Métriques clés */}
          {items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {keyMetrics.cpu && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">CPU</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {Number(keyMetrics.cpu.lastvalue).toFixed(1)}%
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Utilisation
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                        <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {keyMetrics.memory && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Mémoire</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {Number(keyMetrics.memory.lastvalue).toFixed(1)}%
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Utilisée
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                        <MemoryStick className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {keyMetrics.disk && (
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Disque</p>
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {Number(keyMetrics.disk.lastvalue).toFixed(1)}%
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Utilisé
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                        <HardDrive className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {keyMetrics.load && (
                <Card className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Charge</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {Number(keyMetrics.load.lastvalue).toFixed(2)}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Load average
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center">
                        <Gauge className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      
        {/* Informations sur l'hôte */}
        <Card className="mb-8 shadow-sm hover:shadow-md transition-shadow" role="region" aria-label="Informations sur l'hôte">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-tech-gradient" />
              <CardTitle>Informations de l&apos;hôte</CardTitle>
            </div>
            <CardDescription>Détails techniques et configuration réseau</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Identifiant</p>
                </div>
                <p className="text-sm font-mono">{host.hostid}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Nom technique</p>
                </div>
                <p className="text-sm font-mono truncate" title={host.host}>{host.host}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Nom d&apos;affichage</p>
                </div>
                <p className="text-sm truncate" title={host.name || 'N/A'}>{host.name || 'N/A'}</p>
              </div>
              {host.interfaces && host.interfaces.length > 0 && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Adresse IP</p>
                    </div>
                    <p className="text-sm font-mono">{host.interfaces[0].ip}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">DNS</p>
                    </div>
                    <p className="text-sm font-mono truncate" title={host.interfaces[0].dns || 'N/A'}>{host.interfaces[0].dns || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Port</p>
                    </div>
                    <p className="text-sm font-mono">{host.interfaces[0].port}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Barre de recherche et statistiques */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-tech-gradient">Métriques détaillées</h2>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{visibleItems.length}</span> métrique{visibleItems.length > 1 ? 's' : ''}
                {Object.keys(groupedItems).length > 0 && (
                  <span> • <span className="font-medium">{Object.keys(groupedItems).length}</span> catégorie{Object.keys(groupedItems).length > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
            <div className="relative max-w-md w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={metricQuery}
                onChange={(e) => setMetricQuery(e.target.value)}
                placeholder="Rechercher une métrique..."
                className="pl-10"
                aria-label="Filtrer les métriques"
              />
            </div>
          </div>
          {metricQuery && (
            <p className="text-sm text-muted-foreground">
              {visibleItems.length} résultat{visibleItems.length > 1 ? 's' : ''} pour "{metricQuery}"
            </p>
          )}
        </div>

        {/* Liste des métriques */}
        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8">
              <EmptyState 
                title="Aucune métrique disponible" 
                description="Cet hôte ne semble pas avoir de métriques configurées ou actives."
                icon={<BarChart3 className="h-12 w-12 text-muted-foreground" />}
              />
            </CardContent>
          </Card>
        ) : visibleItems.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8">
              <EmptyState 
                title="Aucun résultat" 
                description={`Aucune métrique ne correspond à "${metricQuery}".`}
                icon={<Search className="h-12 w-12 text-muted-foreground" />}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(groupedItems)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([prefix, prefixItems]) => {
                const MetricIcon = getMetricIcon(prefix);
                return (
                  <Card key={prefix} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900" role="region" aria-label={`Catégorie ${prefix}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <MetricIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold capitalize">{prefix}</CardTitle>
                            <p className="text-xs text-muted-foreground">{prefixItems.length} métrique{prefixItems.length > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3 max-h-64 overflow-auto">
                        {prefixItems.map((item) => (
                          <div key={item.itemid} className="group/item p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate" title={item.name}>
                                  {item.name}
                                </h4>
                                <p className="text-xs text-muted-foreground font-mono mt-1" title={item.key_}>
                                  {item.key_}
                                </p>
                              </div>
                              <div className="ml-3 text-right">
                                <p className={`text-sm font-semibold ${getValueClass(item.lastvalue, item.units, item.key_)}`} title={item.lastvalue}>
                                  {formatValue(item.lastvalue, item.units)}
                                </p>
                                {item.lastclock && (
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(parseInt(item.lastclock) * 1000).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}