// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
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
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Sélecteurs pour l'authentification
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Sélecteurs pour les métriques
  const hosts = useAppSelector(selectHosts);
  const problems = useAppSelector(selectProblems);
  const isLoading = useAppSelector(selectMetricsLoading);
  const error = useAppSelector(selectMetricsError);
  const hostsStats = useAppSelector(selectHostsStats);
  const problemsBySeverity = useAppSelector(selectProblemsBySeverity);
  
  // Sélecteur pour les items du premier hôte
  const firstHostId = hosts.length > 0 ? hosts[0].hostid : '';
  const firstHostItems = useAppSelector(selectItemsForHost(firstHostId));

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
    }
  }, [dispatch, isAuthenticated]);

  // Récupération des items pour le premier hôte
  useEffect(() => {
    if (hosts.length > 0) {
      const firstHostId = hosts[0].hostid;
      dispatch(fetchItemsForHost(firstHostId));
    }
  }, [hosts, dispatch]);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      toast.error(`Erreur : ${error}`);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Vérification de l&apos;authentification...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord SupervIA</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {user?.name || user?.email} !
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard-editor">
            <Button variant="outline">
              Créer un dashboard
            </Button>
          </Link>
          <Button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total des hôtes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hostsStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {hostsStats.online} en ligne, {hostsStats.offline} hors ligne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Problèmes actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{problems.length}</div>
            <p className="text-xs text-muted-foreground">
              {problemsBySeverity['4'] + problemsBySeverity['5']} critiques
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Disponibilité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hostsStats.total > 0 ? 
                Math.round((hostsStats.online / hostsStats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Hôtes disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des hôtes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hôtes surveillés</CardTitle>
            <CardDescription>
              Liste des hôtes Zabbix et leur état actuel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && hosts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Chargement des hôtes...</p>
              </div>
            ) : hosts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Aucun hôte trouvé</p>
              </div>
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
                      <span className={`text-sm ${statusInfo.color}`}>
                        {statusInfo.status}
                      </span>
                    </Link>
                  );
                })}
                {hosts.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-3">
                    ... et {hosts.length - 10} hôtes de plus
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des problèmes */}
        <Card>
          <CardHeader>
            <CardTitle>Problèmes récents</CardTitle>
            <CardDescription>
              Alertes et problèmes détectés par Zabbix
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && problems.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Chargement des problèmes...</p>
              </div>
            ) : problems.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Aucun problème actuel 🎉</p>
              </div>
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
                  };
                  
                  return (
                    <div key={problem.eventid} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{problem.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Hôte: {problem.hosts?.[0]?.name || problem.hosts?.[0]?.host || 'Inconnu'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${severityColors[problem.severity as keyof typeof severityColors] || severityColors['0']}`}>
                          {getSeverityName(problem.severity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {problems.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-3">
                    ... et {problems.length - 10} problèmes de plus
                  </p>
                )}
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
              <CardDescription>
                Items disponibles pour cet hôte
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && firstHostItems.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Chargement des métriques...</p>
                </div>
              ) : firstHostItems.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Aucune métrique disponible</p>
                </div>
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
                  {firstHostItems.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-3">
                      ... et {firstHostItems.length - 10} métriques de plus
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}