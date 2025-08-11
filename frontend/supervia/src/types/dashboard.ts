// Types pour l'éditeur de dashboard

export type WidgetType = 'metric' | 'chart' | 'status' | 'text' | 'problems';

export type ChartType = 'area' | 'line' | 'bar';

export interface WidgetConfig {
  chartType?: ChartType;
  color?: string;
  text?: string;
}

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
  config?: WidgetConfig;
}

export interface DashboardConfig {
  id?: string;
  name: string;
  widgets: Widget[];
  createdAt?: string;
  updatedAt?: string;
}