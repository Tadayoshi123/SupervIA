'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated, selectUser } from '@/lib/features/auth/authSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BarChart3, Calendar, Trash2, Eye, Edit } from 'lucide-react';
import dashboardService, { DashboardDto } from '@/lib/features/dashboard/dashboardService';
import toast from 'react-hot-toast';

export default function DashboardsPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<DashboardDto[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/dashboards', label: 'Mes dashboards' }]} />
        
        {/* Header moderne */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Mes dashboards
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Gérez et visualisez vos tableaux de bord personnalisés
              </p>
            </div>
            <Link href="/dashboard-editor">
              <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Créer un dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <Skeleton className="h-6 mb-3" />
                  <Skeleton className="h-4 mb-2" />
                  <Skeleton className="h-4 mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dashboards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Aucun dashboard créé</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Commencez par créer votre premier dashboard pour surveiller vos métriques.
                </p>
                <Link href="/dashboard-editor">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer mon premier dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {dashboards.map((d) => (
              <Card key={d.id} className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold truncate group-hover:text-cyan-600 transition-colors">
                        {d.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(d.updatedAt).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {d.widgets?.length || 0} widgets
                        </div>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-cyan-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Link href={`/dashboards/${d.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 dark:hover:bg-cyan-900/20">
                        <Eye className="h-4 w-4 mr-1" />
                        Ouvrir
                      </Button>
                    </Link>
                    <Link href={`/dashboard-editor?dashboardId=${d.id}`} className="flex-1">
                      <Button size="sm" className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                        <Edit className="h-4 w-4 mr-1" />
                        Éditer
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20"
                      disabled={deletingIds.has(d.id)}
                      onClick={async () => {
                        if (confirm(`Êtes-vous sûr de vouloir supprimer "${d.name}" ?`)) {
                          setDeletingIds(prev => new Set(prev).add(d.id));
                          try {
                            toast.loading('Suppression en cours...', { id: `delete-${d.id}` });
                            await dashboardService.deleteDashboard(d.id);
                            setDashboards((prev) => prev.filter((x) => x.id !== d.id));
                            toast.success('Dashboard supprimé avec succès', { id: `delete-${d.id}` });
                          } catch (error) {
                            console.error('Erreur lors de la suppression:', error);
                            toast.error('Erreur lors de la suppression du dashboard', { id: `delete-${d.id}` });
                          } finally {
                            setDeletingIds(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(d.id);
                              return newSet;
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


