'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectHosts, selectItemsForHost } from '@/lib/features/metrics/metricsSlice';
import { Widget } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Type, Server, Clock, Eye, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';

type Props = {
  widget: Widget | null;
  onChange: (updates: Partial<Widget>) => void;
};

export default function WidgetPropertiesPanel({ widget, onChange }: Props) {
  const hosts = useAppSelector(selectHosts);
  const items = useAppSelector(selectItemsForHost(widget?.hostId || ''));
  // Timers de debounce pour le color picker (clé = itemid)
  const colorTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});

  const [localTitle, setLocalTitle] = useState(widget?.title || '');
  useEffect(() => setLocalTitle(widget?.title || ''), [widget?.title]);

  if (!widget) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Aucun widget sélectionné
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Sélectionnez un widget pour voir et modifier ses propriétés.
          </p>
        </div>
      </div>
    );
  }

  const setConfig = (cfg: Record<string, unknown>) => {
    onChange({ config: { ...(widget.config || {}), ...cfg } });
  };

  const sanitizeConfigForType = (type: Widget['type']): Record<string, unknown> => {
    if (type === 'multiChart') {
      return {
        chartType: (widget.config?.chartType as any) || 'area',
        legend: widget.config?.legend !== false,
        showGrid: widget.config?.showGrid !== false,
        series: Array.isArray(widget.config?.series) ? (widget.config?.series as string[]) : [],
        timeRangeSec: (widget.config?.timeRangeSec as number) || 3600,
        refreshSec: (widget.config?.refreshSec as number) || 0,
        showForecast: widget.config?.showForecast !== false,
        forecastColor: (widget.config?.forecastColor as string) || '#94a3b8',
        forecastPoints: Array.isArray(widget.config?.forecastPoints) ? widget.config?.forecastPoints : [],
        seriesColors: widget.config?.seriesColors || {}
      };
    } else if (type === 'gauge') {
      return {
        warningThreshold: (widget.config?.warningThreshold as number) || 70,
        criticalThreshold: (widget.config?.criticalThreshold as number) || 90
      };
    } else if (type === 'metricValue') {
      return {
        color: (widget.config?.color as string) || '#1e293b'
      };
    }
    return {};
  };

  const widgetTypeOptions = [
    { value: 'multiChart', label: 'Multi-métriques', icon: BarChart3 },
    { value: 'gauge', label: 'Jauge', icon: Clock },
    { value: 'metricValue', label: 'Valeur métrique', icon: Type },
    { value: 'availability', label: 'Disponibilité', icon: Server },
    { value: 'problems', label: 'Problèmes', icon: Settings }
  ];

  const selectedTypeOption = widgetTypeOptions.find(opt => opt.value === widget.type);

  return (
    <div className="h-full overflow-y-auto editor-scrollbar">
      <div className="p-6 space-y-6">
        {/* En-tête du widget */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              {selectedTypeOption?.icon && (
                <selectedTypeOption.icon className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {selectedTypeOption?.label || widget.type}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Widget ID: {widget.id}
              </p>
            </div>
          </div>
        </div>

        {/* Informations générales */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Informations générales
          </h4>
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de widget
              </label>
              <Select 
                value={widget.type} 
                onValueChange={(newType: Widget['type']) => {
                  const newConfig = sanitizeConfigForType(newType);
                  onChange({ type: newType, config: newConfig });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {widgetTypeOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre du widget
              </label>
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={() => onChange({ title: localTitle })}
                placeholder="Nom du widget..."
                className="w-full"
              />
            </div>

            {(widget.type === 'multiChart' || widget.type === 'gauge' || widget.type === 'metricValue' || widget.type === 'availability' || widget.type === 'problems') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hôte source
                </label>
                <Select 
                  value={widget.hostId || ''} 
                  onValueChange={(hostId) => onChange({ hostId: hostId === 'all-hosts' ? undefined : hostId })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un hôte..." />
                  </SelectTrigger>
                  <SelectContent>
                    {widget.type === 'problems' && (
                      <SelectItem value="all-hosts">Tous les hôtes</SelectItem>
                    )}
                    {hosts.map(host => (
                      <SelectItem key={host.hostid} value={host.hostid}>
                        {host.name || host.host}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(widget.type === 'gauge' || widget.type === 'metricValue') && widget.hostId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Métrique
                </label>
                <Select 
                  value={widget.itemId || ''} 
                  onValueChange={(itemId) => onChange({ itemId: itemId || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une métrique..." />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.itemid} value={item.itemid}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Configuration spécifique multi-métriques */}
        {widget.type === 'multiChart' && widget.hostId && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Multi-métriques
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de graphique
                </label>
                <Select 
                  value={widget.config?.chartType as string || 'area'} 
                  onValueChange={(chartType) => setConfig({ chartType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area">Aires</SelectItem>
                    <SelectItem value="line">Lignes</SelectItem>
                    <SelectItem value="bar">Barres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Période (sec)
                </label>
                <Input
                  type="number"
                  value={widget.config?.timeRangeSec as number || 3600}
                  onChange={(e) => setConfig({ timeRangeSec: Number(e.target.value) })}
                  min={300}
                  max={86400}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actualisation (sec)
                </label>
                <Input
                  type="number"
                  value={widget.config?.refreshSec as number || 0}
                  onChange={(e) => setConfig({ refreshSec: Number(e.target.value) })}
                  min={0}
                  max={3600}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Afficher la légende</span>
                <button
                  onClick={() => setConfig({ legend: !(widget.config?.legend !== false) })}
                  className="relative inline-flex items-center"
                >
                  {widget.config?.legend !== false ? (
                    <ToggleRight className="h-6 w-6 text-cyan-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Afficher la grille</span>
                <button
                  onClick={() => setConfig({ showGrid: !(widget.config?.showGrid !== false) })}
                  className="relative inline-flex items-center"
                >
                  {widget.config?.showGrid !== false ? (
                    <ToggleRight className="h-6 w-6 text-cyan-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Métriques sélectionnées (max 5)
              </label>
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {items.filter(item => item.value_type === '0' || item.value_type === '3').slice(0, 30).map(item => {
                  const series = Array.isArray(widget.config?.series) ? widget.config?.series as string[] : [];
                  const isSelected = series.includes(item.itemid);
                  return (
                    <label key={item.itemid} className={`flex items-center p-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      isSelected ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setConfig({ series: series.filter(id => id !== item.itemid) });
                          } else if (series.length < 5) {
                            setConfig({ series: [...series, item.itemid] });
                          }
                        }}
                        className="mr-3 w-4 h-4 text-cyan-600 rounded"
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Configuration spécifique jauge */}
        {widget.type === 'gauge' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Configuration jauge
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seuil d&apos;alerte
                </label>
                <Input
                  type="number"
                  value={widget.config?.warningThreshold as number || 70}
                  onChange={(e) => setConfig({ warningThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seuil critique
                </label>
                <Input
                  type="number"
                  value={widget.config?.criticalThreshold as number || 90}
                  onChange={(e) => setConfig({ criticalThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
        )}

        {/* Configuration prévision */}
        {widget.type === 'multiChart' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Prévision
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Afficher les prévisions</span>
                <button
                  onClick={() => setConfig({ showForecast: !(widget.config?.showForecast !== false) })}
                  className="relative inline-flex items-center"
                >
                  {widget.config?.showForecast !== false ? (
                    <ToggleRight className="h-6 w-6 text-cyan-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                </button>
              </div>

              {widget.config?.showForecast !== false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Couleur des prévisions
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={widget.config?.forecastColor as string || '#94a3b8'}
                      onChange={(e) => {
                        const color = e.target.value;
                        const timerId = 'forecast';
                        if (colorTimersRef.current[timerId]) {
                          clearTimeout(colorTimersRef.current[timerId]);
                        }
                        colorTimersRef.current[timerId] = setTimeout(() => {
                          setConfig({ forecastColor: color });
                        }, 300);
                      }}
                      className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {widget.config?.forecastColor as string || '#94a3b8'}
                    </span>
                  </div>
                </div>
              )}

              {Array.isArray(widget.config?.forecastPoints) && (widget.config?.forecastPoints as any[]).length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ✨ {(widget.config?.forecastPoints as any[]).length} point(s) de prévision disponible(s)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfig({ forecastPoints: [], showForecast: false })}
                    className="mt-2 text-xs"
                  >
                    Effacer les prévisions
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Informations de debug */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              Informations de débogage
            </summary>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
              <div><strong>Position:</strong> x={(widget as any).position?.x || 0}, y={(widget as any).position?.y || 0}</div>
              <div><strong>Taille:</strong> w={(widget as any).size?.w || 2}, h={(widget as any).size?.h || 2}</div>
              <div><strong>Host ID:</strong> {widget.hostId || 'Non défini'}</div>
              <div><strong>Item ID:</strong> {widget.itemId || 'Non défini'}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}