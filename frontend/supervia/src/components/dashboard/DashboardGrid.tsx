'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Widget } from '@/types/dashboard';
import WidgetComponent from '@/components/dashboard/WidgetComponent';

interface DashboardGridProps {
  widgets: Widget[];
  onRemoveWidget: (id: string) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
  selectedWidgetId?: string | null;
  onSelectWidget?: (id: string) => void;
  onKeyMove?: (id: string, dx: number, dy: number) => void;
  gridSize: number;
  gridCols: number;
  gridRows: number;
  gap?: number; // espacement visuel entre widgets (en px)
}

export default function DashboardGrid({ widgets, onRemoveWidget, onUpdateWidget, selectedWidgetId, onSelectWidget, onKeyMove, gridSize, gridCols, gridRows, gap = 0 }: DashboardGridProps) {
  const { setNodeRef } = useDroppable({ id: 'dashboard-grid' });

  return (
    <div
      ref={setNodeRef}
      className="relative w-full h-full bg-gray-50 dark:bg-gray-900 rounded-md overflow-auto"
      role="grid"
    >
      {/* Surface de la grille avec taille fixe pour dnd */}
      <div className="relative" style={{ width: gridCols * gridSize, height: gridRows * gridSize }}>
        {/* Grille de fond */}
        <div className="absolute inset-0 pointer-events-none">
        {/* Lignes verticales */}
        {Array.from({ length: gridCols + 1 }).map((_, colIndex) => (
          <div 
            key={`col-${colIndex}`} 
            className="absolute h-full border-r border-dashed border-gray-200 dark:border-gray-800 opacity-20" 
            style={{ left: `${colIndex * gridSize}px` }}
          />
        ))}
        {/* Lignes horizontales */}
        {Array.from({ length: gridRows + 1 }).map((_, rowIndex) => (
          <div 
            key={`row-${rowIndex}`} 
            className="absolute w-full border-b border-dashed border-gray-200 dark:border-gray-800 opacity-20" 
            style={{ top: `${rowIndex * gridSize}px` }}
          />
        ))}
        </div>

        {/* Widgets */}
        {widgets.map((widget, idx) => (
          <DraggableWidget
            key={widget.id}
            widget={widget}
            onRemove={onRemoveWidget}
            isSelected={selectedWidgetId === widget.id}
            onSelect={onSelectWidget}
            onKeyMove={onKeyMove}
            gridSize={gridSize}
            gap={gap}
            tabIndex={selectedWidgetId ? (selectedWidgetId === widget.id ? 0 : -1) : (idx === 0 ? 0 : -1)}
          />
        ))}
      </div>
    </div>
  );
}

interface DraggableWidgetProps {
  widget: Widget;
  onRemove: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onKeyMove?: (id: string, dx: number, dy: number) => void;
  gridSize: number;
  gap: number;
  tabIndex: number;
}

function DraggableWidget({ 
  widget, 
  onRemove, 
  isSelected,
  onSelect,
  onKeyMove,
  gridSize,
  gap,
  tabIndex,
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
    left: widget.x + gap / 2,
    top: widget.y + gap / 2,
    width: Math.max(0, widget.width * gridSize - gap),
    height: Math.max(0, widget.height * gridSize - gap),
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    // Assurer que le contenu ne déborde pas
    overflow: 'visible',
  };

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    onSelect?.(widget.id);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!isSelected) return;
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -gridSize;
    else if (e.key === 'ArrowRight') dx = gridSize;
    else if (e.key === 'ArrowUp') dy = -gridSize;
    else if (e.key === 'ArrowDown') dy = gridSize;
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onRemove(widget.id);
      return;
    }
    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      onKeyMove?.(widget.id, dx, dy);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-2xl' : 'shadow-sm'} transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      tabIndex={tabIndex}
      role="button"
      aria-pressed={isSelected}
      aria-grabbed={isDragging}
      onKeyDown={handleKeyDown}
      suppressHydrationWarning
      data-id={widget.id}
      data-host-id={widget.hostId || ''}
    >
      <WidgetComponent 
        widget={widget} 
        onRemove={() => onRemove(widget.id)}
        isDragging={isDragging}
      />
    </div>
  );
}