'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Save, LayoutGrid, Eye, EyeOff, PanelRight } from 'lucide-react';
import Link from 'next/link';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import WidgetSelector from '@/components/dashboard/WidgetSelector';
import WidgetComponent from '@/components/dashboard/WidgetComponent';
import { Widget, WidgetType, WidgetConfig } from '@/types/dashboard';
import RightPanel from '@/components/dashboard/RightPanel';

function DashboardEditorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [density, setDensity] = useState<'compact'|'spacious'>('spacious');
  
  // Grille adaptative selon le mode d'affichage
  const gridCols = useMemo(() => {
    if (isPreviewMode) {
      return density === 'spacious' ? 8 : 12; // Moins de colonnes en Large pour éviter superposition
    } else {
      return 12; // Mode édition garde 12 colonnes
    }
  }, [isPreviewMode, density]);
  
  const [gridRows, setGridRows] = useState<number>(20);
  // Taille de grille adaptative selon le mode et la densité
  const gridSize = useMemo(() => {
    if (isPreviewMode) {
      return density === 'spacious' ? 120 : 90;
    } else {
      return density === 'spacious' ? 64 : 54;
    }
  }, [isPreviewMode, density]);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  // Widgets transformés selon le mode d'affichage
  const transformedWidgets = useMemo(() => {
    return widgets.map(widget => {
      if (!isPreviewMode) {
        // Mode édition : utiliser les positions originales
        return widget;
      }
      
      // Calculer la position en grille (colonnes/lignes) basée sur la taille d'édition
      const baseGridSize = 64;
      const gridCol = Math.round(widget.x / baseGridSize);
      const gridRow = Math.round(widget.y / baseGridSize);
      
      // Recalculer la position en pixels selon le nouveau gridSize
      const newX = gridCol * gridSize;
      const newY = gridRow * gridSize;
      
      // Ajuster les dimensions selon le mode
      let newWidth = widget.width;
      let newHeight = widget.height;
      
      if (density === 'spacious') {
        // En mode Large, widgets plus larges et mieux espacés
        newWidth = Math.max(2, Math.min(widget.width + 1, 4));
        newHeight = Math.max(2, Math.min(widget.height, 3));
      }
      
      return {
        ...widget,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      };
    });
  }, [widgets, gridSize, isPreviewMode, density]);
  
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
    const WIDGET_WIDTH = isPreviewMode && density === 'spacious' ? 2 : 4; // Widgets plus larges en mode Large
    const WIDGET_HEIGHT = isPreviewMode && density === 'spacious' ? 3 : 4;
    
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
    const idParam = searchParams.get('dashboardId');
    if (idParam && currentUser?.id) {
      // Charger depuis l'API
      (async () => {
        try {
          const svc = (await import('@/lib/features/dashboard/dashboardService')).default;
          const dash = await svc.getDashboard(Number(idParam));
          setDashboardName(dash.name);
          const mapped: Widget[] = dash.widgets.map((w, idx) => ({
            id: `widget-${idx + 1}`,
            type: w.type as WidgetType,
            title: w.title,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            hostId: w.hostId || undefined,
            itemId: w.itemId || undefined,
            config: (w.config || undefined) as WidgetConfig | undefined,
          }));
          setWidgets(mapped);
          setNextId(mapped.length + 1);
        } catch {
          // fallback local
          const saved = localStorage.getItem('dashboard.widgets');
          if (saved) {
            try {
              const parsed = JSON.parse(saved) as Widget[];
              setWidgets(parsed);
              setNextId(parsed.length + 1);
            } catch {}
          }
        }
      })();
    } else {
      const saved = localStorage.getItem('dashboard.widgets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Widget[];
          setWidgets(parsed);
          setNextId(parsed.length + 1);
        } catch {}
      }
    }
  }, [searchParams, currentUser?.id]);

  // Adapter la grille à la taille réelle du conteneur d'édition / preview
  useEffect(() => {
    if (!editorRef.current) return;

    const el = editorRef.current;
    const compute = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      const baseRows = Math.max(12, Math.ceil(height / gridSize) + 2); // marge basse pour scroller
      const rows = isPreviewMode ? Math.max(baseRows, 24) : baseRows;
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
  }, [gridSize, isPreviewMode]);

  // Fonction pour ajouter un widget au dashboard
  const handleAddWidget = (type: WidgetType, title: string, hostId?: string, itemId?: string, config?: WidgetConfig) => {
    const position = findNextFreePosition();
    
    // Déduplication simple pour éviter d'ajouter plusieurs fois le même widget suggéré
    const signatureOf = (w: Partial<Widget>) => {
      const t = w.type as WidgetType;
      const h = w.hostId || '';
      const cfg = (w.config || {}) as WidgetConfig;
      if (t === 'multiChart') {
        const series = Array.isArray(cfg.series) ? (cfg.series as string[]).filter(Boolean).sort().join(',') : '';
        return `multiChart|${h}|${series}`;
      }
      if (t === 'gauge' || t === 'availability' || t === 'metricValue') {
        return `${t}|${h}|${w.itemId || ''}`;
      }
      return `${t}|${h}|${w.title || ''}`;
    };
    const candidate: Partial<Widget> = { type, hostId, itemId, config, title } as Partial<Widget>;
    const exists = widgets.some(w => signatureOf(w) === signatureOf(candidate));
    if (exists) {
      const existing = widgets.find(w => signatureOf(w) === signatureOf(candidate));
      if (existing) {
        setSelectedWidgetId(existing.id);
        toast('Widget similaire déjà présent — sélectionné');
      }
      return;
    }

    const defaultWidth = isPreviewMode && density === 'spacious' ? 2 : 4;
    const defaultHeight = isPreviewMode && density === 'spacious' ? 3 : 4;
    
    const newWidget: Widget = {
      id: `widget-${nextId}`,
      type,
      title,
      x: position.x,
      y: position.y,
      width: defaultWidth,
      height: defaultHeight,
      hostId,
      itemId,
      // Sécurise multiChart si aucun hôte n'est encore choisi
      config: config ?? (type === 'multiChart' ? { chartType: 'area', legend: true, showGrid: true, series: [] } :
        type === 'gauge' ? { warningThreshold: 70, criticalThreshold: 90 } : {}),
    } as Widget;
    
    setWidgets([...widgets, newWidget]);
    setNextId(nextId + 1);
    setSelectedWidgetId(newWidget.id);
    toast.success(`Widget "${title}" ajouté`);
  };

  // Fonction pour supprimer un widget
  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(widget => widget.id !== id));
    toast('Widget supprimé');
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
        const idParam = searchParams.get('dashboardId');
        if (idParam) {
          await svc.updateDashboard(Number(idParam), { name: dashboardName || 'Mon dashboard', widgets: dto });
          toast.success('Dashboard mis à jour');
        } else {
          const created = await svc.createDashboard(dashboardName || 'Mon dashboard', currentUser.id, dto);
          toast.success('Dashboard sauvegardé');
          // Rediriger vers l'éditeur avec l'id pour les prochaines sauvegardes
          router.push(`/dashboard-editor?dashboardId=${created.id}`);
        }
      }
    } catch {
      toast.error('Échec sauvegarde distante — enregistrement local');
    } finally {
      localStorage.setItem('dashboard.widgets', JSON.stringify(widgets));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header moderne fixe */}
      <div className="editor-toolbar px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <LayoutGrid className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isPreviewMode ? dashboardName : 'Éditeur de Dashboard'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isPreviewMode ? 'Mode aperçu' : 'Mode édition'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions principales */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDensity(prev => prev === 'spacious' ? 'compact' : 'spacious')} title={density === 'spacious' ? 'Passer en compact' : 'Passer en large'}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              {density === 'spacious' ? 'Large' : 'Compact'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsPreviewMode(v => !v)}>
              {isPreviewMode ? <><EyeOff className="h-4 w-4 mr-2" />Éditer</> : <><Eye className="h-4 w-4 mr-2" />Aperçu</>}
            </Button>
            {!isPreviewMode && (
              <Button size="sm" onClick={handleSaveDashboard} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar secondaire */}
        {!isPreviewMode && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Input 
                className="w-64" 
                placeholder="Nom du dashboard" 
                value={dashboardName} 
                onChange={(e) => setDashboardName(e.target.value)} 
              />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <Input 
                  className="w-56" 
                  placeholder="Rechercher un widget..." 
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') {
                      const q = (e.target as HTMLInputElement).value.trim();
                      if (!q) return;
                      const target = widgets.find(w => (w.title || '').toLowerCase().includes(q.toLowerCase()));
                      if (target && editorRef.current) {
                        editorRef.current.scrollTo({ 
                          top: Math.max(0, target.y - 80), 
                          left: Math.max(0, target.x - 80), 
                          behavior: 'smooth' 
                        });
                      }
                    }
                  }} 
                />
                <select
                  aria-label="Filtrer par hôte"
                  className="h-9 min-w-[180px] border rounded-md px-3 bg-background text-foreground"
                  onChange={(e) => {
                    const hostId = e.target.value;
                    const none = !hostId;
                    const container = editorRef.current;
                    if (!container) return;
                    const all = Array.from(container.querySelectorAll('[data-host-id]')) as HTMLElement[];
                    all.forEach(el => {
                      const h = el.getAttribute('data-host-id');
                      el.style.opacity = none || h === hostId ? '1' : '0.25';
                    });
                  }}
                >
                  <option value="">Tous les hôtes</option>
                  {hosts.map(h => (<option key={h.hostid} value={h.hostid}>{h.name || h.host}</option>))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {widgets.length} widget{widgets.length > 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRightPanel((v) => !v)}
                className={showRightPanel ? 'bg-gray-100 dark:bg-gray-700' : ''}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Corps principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar gauche - Widgets */}
        {!isPreviewMode && (
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Widgets disponibles
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Glissez-déposez pour ajouter des widgets
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <WidgetSelector hosts={hosts} onAddWidget={handleAddWidget} />
            </div>
          </div>
        )}

        {/* Zone centrale - Canvas */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          <div className="flex-1 p-6 overflow-auto">
            <div 
              ref={editorRef} 
              className={`relative h-full w-full min-h-[800px] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 editor-scrollbar ${
                widgets.length === 0 ? 'empty-canvas' : 'editor-canvas'
              }`}
              style={{
                backgroundSize: `${gridSize}px ${gridSize}px`,
              }}
            >
              {widgets.length === 0 && !isPreviewMode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <LayoutGrid className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Commencez votre dashboard
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                      Sélectionnez des widgets dans le panneau de gauche et glissez-les ici pour créer votre dashboard personnalisé.
                    </p>
                  </div>
                </div>
              )}

              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges]}
              >
                <DashboardGrid 
                  widgets={transformedWidgets} 
                  onRemoveWidget={handleRemoveWidget}
                  onUpdateWidget={handleUpdateWidget}
                  selectedWidgetId={selectedWidgetId}
                  onSelectWidget={setSelectedWidgetId}
                  onKeyMove={handleKeyMoveWidget}
                  gridSize={gridSize}
                  gridCols={gridCols}
                  gridRows={gridRows}
                  gap={density === 'spacious' ? 16 : 8}
                />
                
                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: 'ease-out'
                }}>
                  {activeWidget ? (
                    <div className="shadow-2xl transform rotate-3 opacity-90 ring-2 ring-cyan-500">
                      <WidgetComponent widget={activeWidget} isDragging={true} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        {/* Sidebar droite - Propriétés */}
        {!isPreviewMode && showRightPanel && (
          <div className="w-80 min-w-80 max-w-80 editor-sidebar border-l border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
            <RightPanel
                selectedWidget={transformedWidgets.find(w => w.id === selectedWidgetId) || null}
                onChange={(updates) => {
                  if (!selectedWidgetId) return;
                  setWidgets(prev => prev.map(w => w.id === selectedWidgetId ? { ...w, ...updates } : w));
                }}
                onAddWidget={(type, title, hostId, itemId, config) => {
                  // réutilise handleAddWidget
                  const signatureOf = (w: Partial<Widget>) => {
                    const t = w.type as WidgetType;
                    const h = w.hostId || '';
                    const cfg = (w.config || {}) as WidgetConfig;
                    if (t === 'multiChart') {
                      const series = Array.isArray(cfg.series) ? (cfg.series as string[]).filter(Boolean).sort().join(',') : '';
                      return `multiChart|${h}|${series}`;
                    }
                    if (t === 'gauge' || t === 'availability' || t === 'metricValue') {
                      return `${t}|${h}|${w.itemId || ''}`;
                    }
                    return `${t}|${h}|${w.title || ''}`;
                  };
                  const candidate: Partial<Widget> = { type, hostId, itemId, config, title } as Partial<Widget>;
                  const exists = widgets.some(w => signatureOf(w) === signatureOf(candidate));
                  if (exists) {
                    const existing = widgets.find(w => signatureOf(w) === signatureOf(candidate));
                    if (existing) {
                      setSelectedWidgetId(existing.id);
                      toast('Widget similaire déjà présent — sélectionné');
                    }
                    return;
                  }
                  const pos = findNextFreePosition();
                  const defaultWidth = isPreviewMode && density === 'spacious' ? 2 : 4;
                  const defaultHeight = isPreviewMode && density === 'spacious' ? 3 : 4;
                  
                  const newWidget: Widget = {
                    id: `widget-${nextId}`,
                    type,
                    title,
                    x: pos.x,
                    y: pos.y,
                    width: defaultWidth,
                    height: defaultHeight,
                    hostId,
                    itemId,
                    config: (config as WidgetConfig) ?? {},
                  };
                  setWidgets(prev => [...prev, newWidget]);
                  setNextId(prev => prev + 1);
                  setSelectedWidgetId(newWidget.id);
                }}
              />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardEditorPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Chargement…</div>}>
      <DashboardEditorPageInner />
    </Suspense>
  );
}