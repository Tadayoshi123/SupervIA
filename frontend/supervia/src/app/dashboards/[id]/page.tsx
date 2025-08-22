'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated } from '@/lib/features/auth/authSlice';
import dashboardService, { DashboardDto } from '@/lib/features/dashboard/dashboardService';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WidgetComponent from '@/components/dashboard/WidgetComponent';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, EyeOff, Edit, LayoutGrid, Maximize, Minimize } from 'lucide-react';
import Link from 'next/link';
import { Widget } from '@/types/dashboard';

export default function DashboardViewPage() {
  const params = useParams();
  const id = Number(params.id);
  
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [density, setDensity] = useState<'compact' | 'spacious'>('spacious');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Configuration de la grille selon la densité
  const gridSize = useMemo(() => {
    return density === 'spacious' ? 120 : 90;
  }, [density]);

  const gridCols = useMemo(() => {
    return density === 'spacious' ? 8 : 12;
  }, [density]);

  // Transformation des widgets pour l'affichage
  const transformedWidgets = useMemo(() => {
    if (!dashboard?.widgets) return [];
    
    return dashboard.widgets.map(w => {
      // Calculer la position en grille basée sur la taille d'édition
      const baseGridSize = 64;
      const gridCol = Math.round(w.x / baseGridSize);
      const gridRow = Math.round(w.y / baseGridSize);
      
      // Recalculer la position en pixels selon le nouveau gridSize
      const newX = gridCol * gridSize;
      const newY = gridRow * gridSize;
      
      // Ajuster les dimensions selon la densité
      let newWidth = w.width;
      let newHeight = w.height;
      
      if (density === 'spacious') {
        newWidth = Math.max(2, Math.min(w.width + 1, 4));
        newHeight = Math.max(2, Math.min(w.height, 3));
      }
      
      return {
        id: `view-${w.id}`,
        type: w.type as any,
        title: w.title,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        hostId: (w as any).hostId || undefined,
        itemId: (w as any).itemId || undefined,
        config: (w as any).config || undefined,
      } as Widget;
    });
  }, [dashboard?.widgets, gridSize, density]);

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
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className={`${isFullscreen ? 'h-full' : 'container mx-auto p-6'}`}>
        {!isFullscreen && (
          <Breadcrumbs items={[
            { href: '/', label: 'Accueil' }, 
            { href: '/dashboards', label: 'Mes dashboards' }, 
            { href: '#', label: dashboard?.name || '...' }
          ]} />
        )}
        
        {/* Header avec contrôles */}
        <div className={`${isFullscreen ? 'p-4' : ''} mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {dashboard?.name || 'Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Visualisation en temps réel • {transformedWidgets.length} widgets
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Contrôles de densité */}
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <Button
                  size="sm"
                  variant={density === 'spacious' ? 'default' : 'ghost'}
                  onClick={() => setDensity('spacious')}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Large
                </Button>
                <Button
                  size="sm"
                  variant={density === 'compact' ? 'default' : 'ghost'}
                  onClick={() => setDensity('compact')}
                  className="h-8 px-3"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Compact
                </Button>
              </div>
              
              {/* Plein écran */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              
              {/* Éditer */}
              <Link href={`/dashboard-editor?dashboardId=${id}`}>
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                  <Edit className="h-4 w-4 mr-2" />
                  Éditer
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        {loading || !dashboard ? (
          <Card className={isFullscreen ? 'h-[calc(100%-140px)]' : 'h-[calc(100vh-280px)]'}>
            <CardContent className="p-6 h-full">
              <Skeleton className="h-full" />
            </CardContent>
          </Card>
        ) : (
          <div 
            className={`relative overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm ${
              isFullscreen ? 'h-[calc(100%-140px)]' : 'h-[calc(100vh-280px)]'
            }`}
          >
            <div 
              className="relative bg-gray-50 dark:bg-gray-900"
              style={{ 
                width: Math.max(gridCols * gridSize, 1200), 
                height: Math.max(20 * gridSize, 800),
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.15) 1px, transparent 0)
                `,
                backgroundSize: `${gridSize}px ${gridSize}px`
              }}
            >
              {transformedWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className="absolute"
                  style={{
                    left: widget.x + (density === 'spacious' ? 16 : 8) / 2,
                    top: widget.y + (density === 'spacious' ? 16 : 8) / 2,
                    width: Math.max(0, widget.width * gridSize - (density === 'spacious' ? 16 : 8)),
                    height: Math.max(0, widget.height * gridSize - (density === 'spacious' ? 16 : 8)),
                  }}
                >
                  <WidgetComponent widget={widget} />
                </div>
              ))}
              
              {transformedWidgets.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <LayoutGrid className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Dashboard vide
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500 mb-4">
                      Ce dashboard ne contient aucun widget pour le moment.
                    </p>
                    <Link href={`/dashboard-editor?dashboardId=${id}`}>
                      <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white">
                        <Edit className="h-4 w-4 mr-2" />
                        Ajouter des widgets
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


