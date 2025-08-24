'use client';

import { useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectItemsForHost } from '@/lib/features/metrics/metricsSlice';
import { ZabbixHost } from '@/lib/features/metrics/metricsService';
import { WidgetType, WidgetConfig } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BarChart3, Activity, Gauge, FileText, AlertCircle, ChevronRight, Monitor, TrendingUp, PieChart, Plus } from 'lucide-react';

interface WidgetSelectorProps {
  hosts: ZabbixHost[];
  onAddWidget: (type: WidgetType, title: string, hostId?: string, itemId?: string, config?: WidgetConfig) => void;
}

export default function WidgetSelector({ hosts, onAddWidget }: WidgetSelectorProps) {
  const [selectedType, setSelectedType] = useState<WidgetType>('multiChart');
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [widgetTitle, setWidgetTitle] = useState<string>('');
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [warn, setWarn] = useState<number>(70);
  const [crit, setCrit] = useState<number>(90);
  const [activeCategory, setActiveCategory] = useState<'charts' | 'monitoring' | 'single'>('charts');
  
  const items = useAppSelector(selectItemsForHost(selectedHostId));
  
  // Fonction pour gérer l'ajout d'un widget
  const handleAddWidget = () => {
    let title = widgetTitle;  
    
    // Si aucun titre n'est spécifié, on utilise un titre par défaut
    if (!title) {
      if (selectedType === 'metricValue' && selectedHostId && selectedItemId) {
        const host = hosts.find(h => h.hostid === selectedHostId);
        const item = items.find(i => i.itemid === selectedItemId);
        title = `${host?.name || 'Hôte'} - ${item?.name || 'Métrique'}`;
      } else {
        title = `Widget ${selectedType}`;
      }
    }
    
    // Ne pas passer hostId si c'est "all-hosts"
    const finalHostId = selectedHostId === "all-hosts" ? undefined : selectedHostId;
    if (selectedType === 'multiChart') {
      onAddWidget(selectedType, title || 'Graphique multi-métriques', finalHostId, undefined, { chartType, legend: true, showGrid: true, series: selectedSeriesIds });
    } else if (selectedType === 'gauge') {
      onAddWidget(selectedType, title || 'Jauge', finalHostId, selectedItemId, { warningThreshold: warn, criticalThreshold: crit });
    } else if (selectedType === 'availability') {
      // Pour le widget availability, on ne passe pas d'itemId car il sera auto-détecté
      onAddWidget(selectedType, title || 'Disponibilité', finalHostId);
    } else if (selectedType === 'metricValue') {
      onAddWidget(selectedType, title || 'Valeur métrique', finalHostId, selectedItemId);
    } else if (selectedType === 'problems') {
      onAddWidget(selectedType, title || 'Problèmes', finalHostId);
    }
    
    // Reset du formulaire
    setWidgetTitle('');
    setSelectedHostId('');
    setSelectedItemId('');
    setSelectedSeriesIds([]);
  };

  const widgetCategories = {
    charts: {
      label: 'Graphiques',
      icon: TrendingUp,
      widgets: [
        { type: 'multiChart' as WidgetType, label: 'Multi-métriques', icon: BarChart3, description: 'Graphique avec plusieurs métriques' },
        { type: 'gauge' as WidgetType, label: 'Jauge', icon: Gauge, description: 'Indicateur circulaire avec seuils' }
      ]
    },
    monitoring: {
      label: 'Surveillance',
      icon: Monitor,
      widgets: [
        { type: 'availability' as WidgetType, label: 'Disponibilité', icon: Activity, description: 'État de disponibilité des hôtes' },
        { type: 'problems' as WidgetType, label: 'Problèmes', icon: AlertCircle, description: 'Liste des incidents actifs' }
      ]
    },
    single: {
      label: 'Métriques simples',
      icon: PieChart,
      widgets: [
        { type: 'metricValue' as WidgetType, label: 'Valeur métrique', icon: FileText, description: 'Affichage d&apos;une métrique unique' }
      ]
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation par catégories */}
      <div className="space-y-2">
        {Object.entries(widgetCategories).map(([key, category]) => {
          const Icon = category.icon;
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key as typeof activeCategory)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isActive 
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                </div>
                <div>
                  <p className={`font-medium ${isActive ? 'text-cyan-900 dark:text-cyan-100' : 'text-gray-900 dark:text-gray-100'}`}>
                    {category.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {category.widgets.length} widget{category.widgets.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${
                isActive ? 'rotate-90 text-cyan-600' : 'text-gray-400'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Widgets de la catégorie active */}
      <div className="space-y-3">
        {widgetCategories[activeCategory].widgets.map((widget) => {
          const Icon = widget.icon;
          const isSelected = selectedType === widget.type;
          return (
            <div
              key={widget.type}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedType(widget.type)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  isSelected 
                    ? 'bg-cyan-500' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    isSelected ? 'text-cyan-900 dark:text-cyan-100' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {widget.label}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {widget.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration du widget sélectionné */}
      {selectedType && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            Configuration
          </h3>
          
          {/* Titre personnalisé */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Titre du widget
            </label>
            <Input
              placeholder="Nom personnalisé (optionnel)"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Sélection de l'hôte selon le type de widget */}
          {(selectedType === 'metricValue' || selectedType === 'gauge' || selectedType === 'availability' || selectedType === 'multiChart' || selectedType === 'problems') && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {selectedType === 'problems' ? 'Hôte (optionnel)' : 'Hôte source'}
              </label>
              <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                <SelectTrigger aria-label={selectedType === 'problems' ? 'Hôte (optionnel)' : 'Hôte source'}>
                  <SelectValue placeholder="Choisir un hôte..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedType === 'problems' && <SelectItem value="all-hosts">Tous les hôtes</SelectItem>}
                  {hosts.map(host => (
                    <SelectItem key={host.hostid} value={host.hostid}>
                      {host.name || host.host}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sélection de la métrique pour les widgets qui en ont besoin */}
          {(selectedType === 'metricValue' || selectedType === 'gauge') && selectedHostId && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Métrique</label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger aria-label="Métrique">
                  <SelectValue placeholder="Choisir une métrique..." />
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

          {/* Configuration spécifique pour multiChart */}
          {selectedType === 'multiChart' && selectedHostId && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Type de graphique</label>
                <Select value={chartType} onValueChange={(value: 'area' | 'line' | 'bar') => setChartType(value)}>
                  <SelectTrigger aria-label="Type de graphique">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area">Graphique en aires</SelectItem>
                    <SelectItem value="line">Graphique linéaire</SelectItem>
                    <SelectItem value="bar">Graphique en barres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Métriques à afficher <span className="text-xs text-gray-500">(max 5)</span>
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                  {items.filter(item => item.value_type === '0' || item.value_type === '3').slice(0, 30).map(item => {
                    const isSelected = selectedSeriesIds.includes(item.itemid);
                    return (
                      <label key={item.itemid} className={`flex items-center p-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        isSelected ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedSeriesIds(prev => prev.filter(id => id !== item.itemid));
                            } else if (selectedSeriesIds.length < 5) {
                              setSelectedSeriesIds(prev => [...prev, item.itemid]);
                            }
                          }}
                          className="mr-3 w-4 h-4 text-cyan-600"
                        />
                        <span className="flex-1 truncate">{item.name}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedSeriesIds.length > 0 && (
                  <p className="text-xs text-cyan-600 mt-2">
                    {selectedSeriesIds.length} métrique{selectedSeriesIds.length > 1 ? 's' : ''} sélectionnée{selectedSeriesIds.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Configuration pour gauge */}
          {selectedType === 'gauge' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Seuil d&apos;alerte</label>
                <Input
                  type="number"
                  value={warn}
                  onChange={(e) => setWarn(Number(e.target.value))}
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Seuil critique</label>
                <Input
                  type="number"
                  value={crit}
                  onChange={(e) => setCrit(Number(e.target.value))}
                  placeholder="90"
                />
              </div>
            </div>
          )}

          {/* Information pour availability */}
          {selectedType === 'availability' && selectedHostId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                La métrique de disponibilité sera détectée automatiquement (icmp ping / agent ping).
              </p>
            </div>
          )}

          {/* Bouton d'ajout */}
          <Button 
            onClick={handleAddWidget} 
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            disabled={
              (selectedType === 'metricValue' || selectedType === 'gauge') && (!selectedHostId || !selectedItemId) ||
              (selectedType === 'multiChart') && (!selectedHostId || selectedSeriesIds.length === 0) ||
              (selectedType === 'availability') && !selectedHostId
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter ce widget
          </Button>
        </div>
      )}
    </div>
  );
}