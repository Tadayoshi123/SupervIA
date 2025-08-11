'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated } from '@/lib/features/auth/authSlice';
import dashboardService, { DashboardDto } from '@/lib/features/dashboard/dashboardService';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const GRID_SIZE = 50;

export default function DashboardViewPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const d = await dashboardService.getDashboard(id);
        setDashboard(d);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (!isAuthenticated) {
    // laissez l'auth guard global gérer la redirection si nécessaire
  }

  return (
    <div className="container mx-auto p-6">
      <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/dashboards', label: 'Mes dashboards' }, { href: '#', label: dashboard?.name || '...' }]} />
      <Card>
        <CardHeader>
          <CardTitle>{dashboard?.name || 'Dashboard'}</CardTitle>
          <CardDescription>Visualisation en lecture seule</CardDescription>
        </CardHeader>
        <CardContent>
          {loading || !dashboard ? (
            <Skeleton className="h-[400px]" />
          ) : (
            <div className="relative overflow-auto border rounded-md" style={{ height: 600 }}>
              <div className="relative" style={{ width: 12 * GRID_SIZE, height: 20 * GRID_SIZE }}>
                {dashboard.widgets.map((w) => (
                  <div
                    key={w.id}
                    className="absolute p-2"
                    style={{
                      left: w.x,
                      top: w.y,
                      width: w.width * GRID_SIZE,
                      height: w.height * GRID_SIZE,
                    }}
                  >
                    <Card className="h-full">
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm truncate">{w.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">{w.type}</CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


