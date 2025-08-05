'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Widget } from '@/types/dashboard';
import WidgetComponent from '@/components/dashboard/WidgetComponent';

interface DashboardGridProps {
  widgets: Widget[];
  onRemoveWidget: (id: string) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
}

const GRID_SIZE = 50; // Taille de la grille en pixels (augmentée)
const GRID_COLS = 12; // Nombre de colonnes (réduit pour des widgets plus larges)
const GRID_ROWS = 20; // Nombre de lignes

export default function DashboardGrid({ widgets, onRemoveWidget, onUpdateWidget }: DashboardGridProps) {
  const { setNodeRef } = useDroppable({ id: 'dashboard-grid' });

  return (
    <div 
      ref={setNodeRef}
      className="relative w-full h-full bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden"
      style={{ minHeight: '600px' }}
    >
      {/* Grille de fond */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Lignes verticales */}
        {Array.from({ length: GRID_COLS + 1 }).map((_, colIndex) => (
          <div 
            key={`col-${colIndex}`} 
            className="absolute h-full border-r border-dashed border-gray-200 dark:border-gray-800 opacity-20" 
            style={{ left: `${colIndex * GRID_SIZE}px` }}
          />
        ))}
        {/* Lignes horizontales */}
        {Array.from({ length: GRID_ROWS + 1 }).map((_, rowIndex) => (
          <div 
            key={`row-${rowIndex}`} 
            className="absolute w-full border-b border-dashed border-gray-200 dark:border-gray-800 opacity-20" 
            style={{ top: `${rowIndex * GRID_SIZE}px` }}
          />
        ))}
      </div>
      
      {/* Widgets */}
      {widgets.map((widget) => (
        <DraggableWidget 
          key={widget.id} 
          widget={widget} 
          onRemove={onRemoveWidget}
          onUpdateWidget={onUpdateWidget}
        />
      ))}
    </div>
  );
}

interface DraggableWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
}

function DraggableWidget({ 
  widget, 
  onRemove, 
  onUpdateWidget 
}: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    data: {
      widget,
      type: 'widget'
    }
  });
  
  const style = {
    position: 'absolute' as const,
    left: widget.x,
    top: widget.y,
    width: widget.width * GRID_SIZE,
    height: widget.height * GRID_SIZE,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    // Assurer que le contenu ne déborde pas
    overflow: 'hidden',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-2xl' : 'shadow-sm'} transition-shadow`}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
    >
      <WidgetComponent 
        widget={widget} 
        onRemove={() => onRemove(widget.id)}
        isDragging={isDragging}
      />
    </div>
  );
}