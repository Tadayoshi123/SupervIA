// Types pour l'éditeur de dashboard

export type WidgetType = 'metric' | 'chart' | 'status' | 'text' | 'problems';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hostId?: string;
  itemId?: string;
  config?: Record<string, unknown>;
}

export interface DashboardConfig {
  id?: string;
  name: string;
  widgets: Widget[];
  createdAt?: string;
  updatedAt?: string;
}