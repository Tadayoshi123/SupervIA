'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated, setCredentials, selectUser } from '@/lib/features/auth/authSlice';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import WidgetSelector from '@/components/dashboard/WidgetSelector';
import WidgetComponent from '@/components/dashboard/WidgetComponent';
import { Widget, WidgetType, WidgetConfig } from '@/types/dashboard';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export default function DashboardEditorPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectUser);
  const hosts = useAppSelector(selectHosts);
  
  // État local pour le dashboard en cours d'édition
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);
  const [nextId, setNextId] = useState(1);
  const [dashboardName, setDashboardName] = useState('Mon dashboard');
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [gridCols, setGridCols] = useState<number>(12);
  const [gridRows, setGridRows] = useState<number>(20);
  const gridSize = 64; // cellules plus grandes pour éviter la troncature
  
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
    const GRID_COLS = gridCols;
    const WIDGET_WIDTH = 4;
    const WIDGET_HEIGHT = 4;
    
    for (let row = 0; row < Math.max(20, gridRows); row++) {
      for (let col = 0; col < GRID_COLS - WIDGET_WIDTH + 1; col++) {
        const x = col * gridSize;
        const y = row * gridSize;
        
        // Vérifier s'il y a une collision avec les widgets existants
        const hasCollision = widgets.some(widget => {
          const widgetRight = widget.x + widget.width * gridSize;
          const widgetBottom = widget.y + widget.height * gridSize;
          const newRight = x + WIDGET_WIDTH * gridSize;
          const newBottom = y + WIDGET_HEIGHT * gridSize;
          
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

  // Restaurer depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard.widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Widget[];
        setWidgets(parsed);
        setNextId(parsed.length + 1);
      } catch {}
    }
  }, []);

  // Adapter la grille à la taille réelle du conteneur d'édition
  useEffect(() => {
    if (!editorRef.current) return;

    const el = editorRef.current;
    const compute = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      const cols = Math.max(8, Math.floor(width / gridSize));
      const rows = Math.max(12, Math.ceil(height / gridSize) + 2); // marge basse pour scroller
      setGridCols(cols);
      setGridRows(rows);
    };
    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [gridSize]);

  // Fonction pour ajouter un widget au dashboard
  const handleAddWidget = (type: WidgetType, title: string, hostId?: string, itemId?: string) => {
    const position = findNextFreePosition();
    
    const newWidget: Widget = {
      id: `widget-${nextId}`,
      type,
      title,
      x: position.x,
      y: position.y,
      width: 4,
      height: 4,
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

  const handleKeyMoveWidget = (id: string, dx: number, dy: number) => {
    const w = widgets.find(w => w.id === id);
    if (!w) return;
    const maxX = (gridCols - w.width) * gridSize;
    const maxY = (gridRows - w.height) * gridSize;
    const finalX = Math.max(0, Math.min(w.x + dx, maxX));
    const finalY = Math.max(0, Math.min(w.y + dy, maxY));
    handleUpdateWidget(id, { x: finalX, y: finalY });
  };

  // Fonction pour gérer la fin du drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    
    setActiveWidget(null);
    
    if (!over || !delta) {
      return;
    }
    
    const GRID_COLS = gridCols;
    const GRID_ROWS = gridRows;
    
    const draggedWidget = widgets.find(w => w.id === active.id);
    
    if (draggedWidget && over.id === 'dashboard-grid') {
      // Calculer la nouvelle position en fonction du delta
      const rawX = draggedWidget.x + delta.x;
      const rawY = draggedWidget.y + delta.y;
      
      // Snapper à la grille
      const snappedX = Math.round(rawX / gridSize) * gridSize;
      const snappedY = Math.round(rawY / gridSize) * gridSize;
      
      // Contraindre dans les limites de la grille
      const maxX = (GRID_COLS - draggedWidget.width) * gridSize;
      const maxY = (GRID_ROWS - draggedWidget.height) * gridSize;
      
      const finalX = Math.max(0, Math.min(snappedX, maxX));
      const finalY = Math.max(0, Math.min(snappedY, maxY));
      
      // Vérifier les collisions avec d'autres widgets
      const hasCollision = widgets.some(widget => {
        if (widget.id === draggedWidget.id) return false;
        
        const widgetRight = widget.x + widget.width * gridSize;
        const widgetBottom = widget.y + widget.height * gridSize;
        const newRight = finalX + draggedWidget.width * gridSize;
        const newBottom = finalY + draggedWidget.height * gridSize;
        
        return !(finalX >= widgetRight || newRight <= widget.x || finalY >= widgetBottom || newBottom <= widget.y);
      });
      
      // Mettre à jour la position seulement s'il n'y a pas de collision
      if (!hasCollision) {
        handleUpdateWidget(draggedWidget.id, { x: finalX, y: finalY });
      }
    }
  };

  // Fonction pour sauvegarder le dashboard
  const handleSaveDashboard = async () => {
    try {
      if (currentUser?.id) {
         const dto = widgets.map((w) => ({
          type: w.type,
          title: w.title,
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
          hostId: w.hostId,
          itemId: w.itemId,
           config: (w.config as Record<string, unknown>) || null,
        }));
        const svc = (await import('@/lib/features/dashboard/dashboardService')).default;
        await svc.createDashboard(dashboardName || 'Mon dashboard', currentUser.id, dto);
        toast.success('Dashboard sauvegardé');
      }
    } catch {
      toast.error('Échec sauvegarde distante — enregistrement local');
    } finally {
      localStorage.setItem('dashboard.widgets', JSON.stringify(widgets));
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Breadcrumbs items={[{ href: '/', label: 'Accueil' }, { href: '/dashboard', label: 'Dashboard' }, { href: '/dashboard-editor', label: 'Éditeur' }]} />
      {/* En-tête */}
      <div className="flex items-center justify-between mb-8">
      <div className="flex items-center">
          <Link href="/dashboard" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-tech-gradient">Éditeur de Dashboard</h1>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            className="w-48"
            placeholder="Nom du dashboard"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            aria-label="Nom du dashboard"
          />
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
            <CardContent className="relative h-[calc(100%-5rem)] overflow-auto">
              <div ref={editorRef} className="relative h-full w-full">
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
                  selectedWidgetId={selectedWidgetId}
                  onSelectWidget={setSelectedWidgetId}
                  onKeyMove={handleKeyMoveWidget}
                  gridSize={gridSize}
                  gridCols={gridCols}
                  gridRows={gridRows}
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}