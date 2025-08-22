'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchHosts, selectHosts, selectMetricsLoading } from '@/lib/features/metrics/metricsSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { selectIsAuthenticated, setCredentials } from '@/lib/features/auth/authSlice';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  RefreshCw, 
  Search, 
  Server, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff,
  Monitor,
  Globe,
  Shield,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function HostsPage() {
  const dispatch = useAppDispatch();
  const hosts = useAppSelector(selectHosts);
  const isLoading = useAppSelector(selectMetricsLoading);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Auth guard minimal pour éviter les 401
    if (!isAuthenticated) {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      dispatch(setCredentials({ token }));
    }
  }, [dispatch, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchHosts());
    }
  }, [dispatch, isAuthenticated]);

  // Fonction pour obtenir le statut d'un hôte
  const getHostStatus = (host: typeof hosts[0]) => {
    const isEnabled = host.status === '0';
    const isAvailable = host.active_available === '1' || host.available === '1';
    
    if (!isEnabled) {
      return { 
        status: 'Désactivé', 
        color: 'text-gray-600 dark:text-gray-400', 
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        icon: Shield,
        variant: 'disabled' as const
      };
    }
    if (isAvailable) {
      return { 
        status: 'En ligne', 
        color: 'text-green-700 dark:text-green-300', 
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: CheckCircle2,
        variant: 'online' as const
      };
    }
    return { 
      status: 'Hors ligne', 
      color: 'text-red-700 dark:text-red-300', 
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: XCircle,
      variant: 'offline' as const
    };
  };

  // Filtrer les hôtes selon la recherche
  const filteredHosts = useMemo(() => {
    if (!searchQuery.trim()) return hosts;
    const query = searchQuery.toLowerCase();
    return hosts.filter(host => 
      (host.name || '').toLowerCase().includes(query) ||
      host.host.toLowerCase().includes(query) ||
      (host.description || '').toLowerCase().includes(query)
    );
  }, [hosts, searchQuery]);

  // Statistiques des hôtes
  const hostStats = useMemo(() => {
    const total = hosts.length;
    const online = hosts.filter(h => h.active_available === '1' || h.available === '1').length;
    const offline = hosts.filter(h => h.status === '0' && !(h.active_available === '1' || h.available === '1')).length;
    const disabled = hosts.filter(h => h.status !== '0').length;
    
    return { total, online, offline, disabled };
  }, [hosts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/hosts', label: 'Hôtes' }]} />
        
        {/* Header moderne */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="text-tech-gradient">Infrastructure</span>
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Server className="h-4 w-4" />
                <span>Supervision et monitoring des hôtes</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => dispatch(fetchHosts())} 
                disabled={isLoading}
                className="bg-tech-gradient text-white hover:opacity-90 shadow-sm hover:shadow-md transition-all"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Actualisation...' : 'Actualiser'}
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total hôtes</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {hostStats.total}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Infrastructure complète
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                    <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">En ligne</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {hostStats.online}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Hôtes actifs
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                    <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Hors ligne</p>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      {hostStats.offline}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Nécessitent attention
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Désactivés</p>
                    <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                      {hostStats.disabled}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Hôtes en maintenance
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un hôte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredHosts.length} hôte{filteredHosts.length > 1 ? 's' : ''} trouvé{filteredHosts.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Liste des hôtes */}
        {isLoading && hosts.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-4" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredHosts.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8">
              <EmptyState 
                title={searchQuery ? "Aucun hôte trouvé" : "Aucun hôte disponible"} 
                description={searchQuery ? "Essayez avec d'autres termes de recherche" : "Assurez-vous que Zabbix et les agents sont démarrés."} 
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHosts.map((host) => {
              const status = getHostStatus(host);
              const StatusIcon = status.icon;
              
              return (
                <Link key={host.hostid} href={`/hosts/${host.hostid}`}>
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {host.name || host.host}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {host.host}
                          </p>
                          {host.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {host.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          <div className={`h-10 w-10 rounded-lg ${status.bgColor} flex items-center justify-center`}>
                            <StatusIcon className={`h-5 w-5 ${status.color}`} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.bgColor} ${status.color}`}>
                          {status.status}
                        </span>
                        
                        {host.interfaces && host.interfaces.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span>{host.interfaces[0].ip}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex items-center text-xs text-muted-foreground">
                        <Activity className="h-3 w-3 mr-1" />
                        <span>ID: {host.hostid}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


