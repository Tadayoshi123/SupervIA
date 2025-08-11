'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated, selectUser } from '@/lib/features/auth/authSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import dashboardService, { DashboardDto } from '@/lib/features/dashboard/dashboardService';

export default function DashboardsPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<DashboardDto[]>([]);

  useEffect(() => {
    async function load() {
      if (isAuthenticated && user?.id) {
        try {
          const res = await dashboardService.listDashboards(user.id);
          setDashboards(res);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    load();
  }, [isAuthenticated, user?.id]);

  return (
    <div className="container mx-auto p-6">
      <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/dashboards', label: 'Mes dashboards' }]} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-tech-gradient">Mes dashboards</h1>
          <p className="text-muted-foreground">Gérez et ouvrez vos dashboards sauvegardés</p>
        </div>
        <Link href="/dashboard-editor">
          <Button variant="outline">Créer un dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboards</CardTitle>
          <CardDescription>Vos créations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : dashboards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun dashboard pour l'instant.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((d) => (
                <div key={d.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.updatedAt).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">{d.widgets?.length || 0} widgets</div>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/dashboards/${d.id}`}><Button size="sm" variant="outline">Ouvrir</Button></Link>
                    <Link href={`/dashboard-editor?dashboardId=${d.id}`}><Button size="sm">Éditer</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


