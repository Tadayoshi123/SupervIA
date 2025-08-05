'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated, setCredentials } from '@/lib/features/auth/authSlice';
import { fetchHosts, fetchItemsForHost, selectHosts } from '@/lib/features/metrics/metricsSlice';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  MouseSensor, 
  TouchSensor, 
  PointerSensor,
  useSensor, 
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import WidgetSelector from '@/components/dashboard/WidgetSelector';
import WidgetComponent from '@/components/dashboard/WidgetComponent';
import { Widget, WidgetType } from '@/types/dashboard';

export default function DashboardEditorPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hosts = useAppSelector(selectHosts);
  
  // État local pour le dashboard en cours d'édition
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);
  const [nextId, setNextId] = useState(1);
  
  // Configuration des capteurs pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

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

  // Chargement initial des données
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchHosts());
    }
  }, [dispatch, isAuthenticated]);

  // Charger les items pour chaque hôte
  useEffect(() => {
    if (hosts.length > 0) {
      hosts.forEach(host => {
        dispatch(fetchItemsForHost(host.hostid));
      });
    }
  }, [hosts, dispatch]);

  // Fonction pour trouver la prochaine position libre
  const findNextFreePosition = (): { x: number; y: number } => {
    const GRID_SIZE = 50;
    const GRID_COLS = 12;
    const WIDGET_WIDTH = 3;
    const WIDGET_HEIGHT = 3;
    
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < GRID_COLS - WIDGET_WIDTH + 1; col++) {
        const x = col * GRID_SIZE;
        const y = row * GRID_SIZE;
        
        // Vérifier s'il y a une collision avec les widgets existants
        const hasCollision = widgets.some(widget => {
          const widgetRight = widget.x + widget.width * GRID_SIZE;
          const widgetBottom = widget.y + widget.height * GRID_SIZE;
          const newRight = x + WIDGET_WIDTH * GRID_SIZE;
          const newBottom = y + WIDGET_HEIGHT * GRID_SIZE;
          
          return !(x >= widgetRight || newRight <= widget.x || y >= widgetBottom || newBottom <= widget.y);
        });
        
        if (!hasCollision) {
          return { x, y };
        }
      }
    }
    
    // Si aucune position libre n'est trouvée, placer en haut à gauche
    return { x: 0, y: 0 };
  };

  // Fonction pour ajouter un widget au dashboard
  const handleAddWidget = (type: WidgetType, title: string, hostId?: string, itemId?: string) => {
    const position = findNextFreePosition();
    
    const newWidget: Widget = {
      id: `widget-${nextId}`,
      type,
      title,
      x: position.x,
      y: position.y,
      width: 3,
      height: 3,
      hostId,
      itemId,
    };
    
    setWidgets([...widgets, newWidget]);
    setNextId(nextId + 1);
    toast.success(`Widget "${title}" ajouté`);
  };

  // Fonction pour supprimer un widget
  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(widget => widget.id !== id));
    toast.info('Widget supprimé');
  };

  // Fonction pour gérer le début du drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedWidget = widgets.find(widget => widget.id === active.id);
    if (draggedWidget) {
      setActiveWidget(draggedWidget);
    }
  };

  // Fonction pour mettre à jour un widget
  const handleUpdateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(widget => 
      widget.id === id ? { ...widget, ...updates } : widget
    ));
  };

  // Fonction pour gérer la fin du drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    
    setActiveWidget(null);
    
    if (!over || !delta) {
      return;
    }
    
    const GRID_SIZE = 50;
    const GRID_COLS = 12;
    const GRID_ROWS = 20;
    
    const draggedWidget = widgets.find(w => w.id === active.id);
    
    if (draggedWidget && over.id === 'dashboard-grid') {
      // Calculer la nouvelle position en fonction du delta
      const rawX = draggedWidget.x + delta.x;
      const rawY = draggedWidget.y + delta.y;
      
      // Snapper à la grille
      const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
      
      // Contraindre dans les limites de la grille
      const maxX = (GRID_COLS - draggedWidget.width) * GRID_SIZE;
      const maxY = (GRID_ROWS - draggedWidget.height) * GRID_SIZE;
      
      const finalX = Math.max(0, Math.min(snappedX, maxX));
      const finalY = Math.max(0, Math.min(snappedY, maxY));
      
      // Vérifier les collisions avec d'autres widgets
      const hasCollision = widgets.some(widget => {
        if (widget.id === draggedWidget.id) return false;
        
        const widgetRight = widget.x + widget.width * GRID_SIZE;
        const widgetBottom = widget.y + widget.height * GRID_SIZE;
        const newRight = finalX + draggedWidget.width * GRID_SIZE;
        const newBottom = finalY + draggedWidget.height * GRID_SIZE;
        
        return !(finalX >= widgetRight || newRight <= widget.x || finalY >= widgetBottom || newBottom <= widget.y);
      });
      
      // Mettre à jour la position seulement s'il n'y a pas de collision
      if (!hasCollision) {
        handleUpdateWidget(draggedWidget.id, { x: finalX, y: finalY });
      }
    }
  };

  // Fonction pour sauvegarder le dashboard
  const handleSaveDashboard = () => {
    // Dans une version future, on pourrait sauvegarder le dashboard dans une base de données
    // Pour l'instant, on simule une sauvegarde
    toast.success('Dashboard sauvegardé avec succès !');
    console.log('Dashboard sauvegardé:', widgets);
  };

  return (
    <div className="container mx-auto p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/dashboard" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Éditeur de Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveDashboard}>
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panneau latéral pour sélectionner les widgets */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Widgets disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WidgetSelector hosts={hosts} onAddWidget={handleAddWidget} />
            </CardContent>
          </Card>
        </div>

        {/* Zone d'édition du dashboard */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader>
              <CardTitle>Zone d&apos;édition</CardTitle>
            </CardHeader>
            <CardContent className="relative h-[calc(100%-5rem)] overflow-hidden">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges]}
              >
                <DashboardGrid 
                  widgets={widgets} 
                  onRemoveWidget={handleRemoveWidget}
                  onUpdateWidget={handleUpdateWidget}
                />
                
                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: 'ease-out'
                }}>
                  {activeWidget ? (
                    <div className="shadow-2xl transform rotate-3 opacity-90">
                      <WidgetComponent widget={activeWidget} isDragging={true} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}