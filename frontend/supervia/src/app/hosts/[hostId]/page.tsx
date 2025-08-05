'use client';

import { useEffect } from 'react';
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
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

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
    
    // Conversion des octets en format lisible
    if (units === 'B') {
      const bytes = parseFloat(value);
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      if (i === 0) return `${bytes} ${sizes[i]}`;
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]} (${bytes} B)`;
    }
    
    // Valeurs avec unités
    return `${value} ${units}`;
  };
  
  // Fonction pour obtenir la classe CSS selon la valeur et l'unité
  const getValueClass = (value: string | undefined, units: string) => {
    if (!value) return '';
    
    // Pour les pourcentages
    if (units === '%') {
      const percent = parseFloat(value);
      if (percent > 90) return 'text-red-600';
      if (percent > 70) return 'text-amber-600';
      if (percent > 0) return 'text-green-600';
    }
    
    return '';
  };
  
  // Grouper les items par type
  const groupedItems = items.reduce((acc, item) => {
    // Extraire le préfixe de la clé (avant le premier point)
    const prefix = item.key_.split('.')[0];
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(item);
    return acc;
  }, {} as Record<string, typeof items>);
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Vérification de l&apos;authentification...</p>
      </div>
    );
  }
  
  if (!host) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Link href="/dashboard" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Hôte non trouvé</h1>
        </div>
        <p>L&apos;hôte avec l&apos;ID {hostId} n&apos;existe pas ou n&apos;est pas accessible.</p>
      </div>
    );
  }
  
  // Obtenir le statut de l'hôte
  const isEnabled = host.status === '0';
  const isAvailable = host.active_available === '1' || host.available === '1';
  let statusInfo = { status: 'Inconnu', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  
  if (!isEnabled) {
    statusInfo = { status: 'Désactivé', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  } else if (isAvailable) {
    statusInfo = { status: 'En ligne', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else {
    statusInfo = { status: 'Hors ligne', color: 'text-red-600', bgColor: 'bg-red-100' };
  }
  
  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/dashboard" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{host.name}</h1>
              <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color} ${statusInfo.bgColor}`}>
                {statusInfo.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {host.host} {host.description ? `- ${host.description}` : ''}
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Actualisation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </>
          )}
        </Button>
      </div>
      
      {/* Informations sur l'hôte */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Informations sur l&apos;hôte</CardTitle>
          <CardDescription>Détails techniques de l&apos;hôte Zabbix</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">ID</p>
              <p className="text-sm text-muted-foreground">{host.hostid}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Nom technique</p>
              <p className="text-sm text-muted-foreground">{host.host}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Nom d&apos;affichage</p>
              <p className="text-sm text-muted-foreground">{host.name}</p>
            </div>
            {host.interfaces && host.interfaces.length > 0 && (
              <>
                <div>
                  <p className="text-sm font-medium">IP</p>
                  <p className="text-sm text-muted-foreground">{host.interfaces[0].ip}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">DNS</p>
                  <p className="text-sm text-muted-foreground">{host.interfaces[0].dns || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Port</p>
                  <p className="text-sm text-muted-foreground">{host.interfaces[0].port}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Liste des métriques */}
      {isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
          <p className="text-lg">Chargement des métriques...</p>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <p className="text-lg text-muted-foreground">Aucune métrique disponible pour cet hôte</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Affichage des items groupés par type */}
          {Object.entries(groupedItems).map(([prefix, prefixItems]) => (
            <Card key={prefix} className="mb-6">
              <CardHeader>
                <CardTitle>Métriques {prefix}</CardTitle>
                <CardDescription>
                  {prefixItems.length} métriques disponibles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Nom</th>
                        <th className="text-left py-3 px-4 font-medium">Clé</th>
                        <th className="text-left py-3 px-4 font-medium">Dernière valeur</th>
                        <th className="text-left py-3 px-4 font-medium">Unité</th>
                        <th className="text-left py-3 px-4 font-medium">Dernière mise à jour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prefixItems.map((item) => (
                        <tr key={item.itemid} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{item.name}</td>
                          <td className="py-3 px-4">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.key_}</code>
                          </td>
                          <td className={`py-3 px-4 ${getValueClass(item.lastvalue, item.units)}`}>
                            {formatValue(item.lastvalue, item.units)}
                          </td>
                          <td className="py-3 px-4">{item.units || '-'}</td>
                          <td className="py-3 px-4">
                            {item.lastclock 
                              ? new Date(parseInt(item.lastclock) * 1000).toLocaleString()
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}