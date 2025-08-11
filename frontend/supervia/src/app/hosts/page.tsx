'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchHosts, selectHosts, selectMetricsLoading } from '@/lib/features/metrics/metricsSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { selectIsAuthenticated, setCredentials } from '@/lib/features/auth/authSlice';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { EmptyState } from '@/components/ui/empty-state';

export default function HostsPage() {
  const dispatch = useAppDispatch();
  const hosts = useAppSelector(selectHosts);
  const isLoading = useAppSelector(selectMetricsLoading);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const router = useRouter();

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

  return (
    <div className="container mx-auto px-6 py-8">
      <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/hosts', label: 'Hôtes' }]} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-tech-gradient">Hôtes</h1>
          <p className="text-muted-foreground">Liste des hôtes découverts via Zabbix</p>
        </div>
        <Button variant="outline" onClick={() => dispatch(fetchHosts())} disabled={isLoading}>
          {isLoading ? 'Actualisation...' : 'Actualiser'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hôtes surveillés</CardTitle>
          <CardDescription>Accédez au détail et aux métriques</CardDescription>
        </CardHeader>
        <CardContent>
          {hosts.length === 0 ? (
            <EmptyState title="Aucun hôte disponible" description="Assurez-vous que Zabbix et les agents sont démarrés." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hosts.map((h) => (
                <Link key={h.hostid} href={`/hosts/${h.hostid}`} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="font-medium truncate">{h.name || h.host}</div>
                  <div className="text-xs text-muted-foreground truncate">{h.host}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


