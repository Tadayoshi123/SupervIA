'use client';

import WidgetPropertiesPanel from '@/components/dashboard/WidgetPropertiesPanel';
import { Widget, WidgetType, WidgetConfig } from '@/types/dashboard';
import aiService from '@/lib/features/ai/aiService';
import metricsService from '@/lib/features/metrics/metricsService';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectHostsStats, selectProblems, selectItemsForHost, selectHosts } from '@/lib/features/metrics/metricsSlice';
import { AlertRule } from '@/types/dashboard';
import { X } from 'lucide-react';
import { NumberInput } from '@/components/ui/NumberInput';

type Props = {
  selectedWidget: Widget | null;
  onChange: (updates: Partial<Widget>) => void;
  onAddWidget?: (type: WidgetType, title: string, hostId?: string, itemId?: string, config?: WidgetConfig) => void;
  widgets?: Widget[];
  currentHostId?: string;
};

export default function RightPanel({ selectedWidget, onChange, onAddWidget, widgets = [], currentHostId }: Props) {
  const [loading, setLoading] = useState(false);
  const [iaText, setIaText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'properties' | 'ai' | 'alerts'>('properties');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const canGauge = selectedWidget?.type === 'gauge';
  const canTitle = !!selectedWidget;
  const hostsStats = useAppSelector(selectHostsStats);
  const problems = useAppSelector(selectProblems);
  const itemsForHost = useAppSelector(
    selectedWidget?.hostId ? selectItemsForHost(selectedWidget.hostId) : () => []
  );
  const isSingleMetric = selectedWidget ? (['gauge','metricValue'] as WidgetType[]).includes(selectedWidget.type as WidgetType) : false;
  const hostsList = useAppSelector(selectHosts);
  // Carte globale itemId -> libellé (tous hôtes), pour libeller les métriques même si elles ne sont pas sur l'hôte courant
  const allItemsByHost = useAppSelector((state) => (state as any).metrics.items as Record<string, any[]>);
  const { itemLabelById, itemHostIdByItemId, hostNameById } = useMemo(() => {
    const labelMap: Record<string, string> = {};
    const hostIdByItem: Record<string, string> = {};
    const hostNameMap: Record<string, string> = {};
    (hostsList || []).forEach((h: any) => { hostNameMap[h.hostid] = h.name || h.host || String(h.hostid); });
    if (allItemsByHost) {
      Object.values(allItemsByHost).forEach((arr) => {
        (arr || []).forEach((it: any) => {
          labelMap[it.itemid] = it.name || it.key_ || String(it.itemid);
          if (it.hostid) hostIdByItem[it.itemid] = it.hostid;
        });
      });
    }
    return { itemLabelById: labelMap, itemHostIdByItemId: hostIdByItem, hostNameById: hostNameMap };
  }, [allItemsByHost, hostsList]);

  const handleAutoThresholds = async () => {
    if (!selectedWidget || selectedWidget.type !== 'gauge') return;
    if (!selectedWidget.itemId) return;
    setLoading(true);
    try {
      const resp = await metricsService.getItemHistory(selectedWidget.itemId, undefined, undefined, 100);
      const values = resp.map(p => Number(p.value)).filter(v => !isNaN(v));
      if (values.length > 0) {
        const result = await aiService.thresholds(values);
        setIaText(`Seuils recommandés pour cette métrique :\n- Warning: ${result.warning}\n- Critical: ${result.critical}`);
        onChange({
          config: {
            ...(selectedWidget.config || {}),
            warningThreshold: result.warning,
            criticalThreshold: result.critical,
          } as WidgetConfig
        });
      }
    } catch {
      setIaText('Impossible de calculer les seuils automatiques pour cette métrique.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTitle = async () => {
    if (!selectedWidget) return;
    setLoading(true);
    try {
      let items: Array<{ name: string }> = [];
      if (selectedWidget.type === 'multiChart') {
        const series = (selectedWidget.config as any)?.series || [];
        items = series.map((itemId: string) => ({ name: itemLabelById[itemId] || `Item ${itemId}` }));
      } else if (selectedWidget.itemId) {
        items = [{ name: itemLabelById[selectedWidget.itemId] || `Item ${selectedWidget.itemId}` }];
      }
      const suggestion = await aiService.generateTitle(selectedWidget.type, items);
      const titleText = typeof suggestion === 'string' ? suggestion : suggestion.title;
      setIaText(`Titre suggéré : &ldquo;${titleText}&rdquo;`);
      onChange({ title: titleText });
    } catch {
      setIaText('Impossible de générer un titre pour ce widget.');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setLoading(true);
    try {
      // Collecter les métriques principales depuis les widgets
      const topMetrics = widgets
        .filter(w => w.type === 'metricValue' || w.type === 'gauge')
        .map(w => {
          const item = w.itemId && allItemsByHost ? 
            Object.values(allItemsByHost).flat().find((it: any) => it.itemid === w.itemId) : null;
          return item ? {
            name: item.name || item.key_ || 'Métrique',
            value: item.lastvalue || '0',
            units: item.units || '',
            hostId: w.hostId,
            hostName: hostNameById[w.hostId || ''] || 'Hôte inconnu'
          } : null;
        })
        .filter(Boolean)
        .slice(0, 10); // Limiter à 10 métriques principales

      // Statistiques du dashboard
      const dashboardStats = {
        totalWidgets: widgets.length,
        widgetTypes: widgets.reduce((acc: any, w) => {
          acc[w.type] = (acc[w.type] || 0) + 1;
          return acc;
        }, {}),
        hostsMonitored: new Set(widgets.map(w => w.hostId).filter(Boolean)).size,
        lastUpdate: new Date().toISOString()
      };

      // Problèmes enrichis avec noms d'hôtes
      const enrichedProblems = problems.slice(0, 20).map(p => ({
        name: p.name,
        severity: p.severity,
        hostName: p.hosts?.[0] ? (hostNameById[p.hosts[0].hostid] || p.hosts[0].host || 'Hôte inconnu') : 'Hôte inconnu',
        eventid: p.eventid
      }));

      const summary = await aiService.summarize(
        problems.length,
        hostsStats.online,
        hostsStats.total,
        enrichedProblems,
        widgets.map(w => ({ type: w.type, title: w.title, hostId: w.hostId })),
        topMetrics,
        dashboardStats,
        '1h' // Période d'analyse
      );
      
      const text = typeof (summary as any) === 'string' ? (summary as any) : (summary as any)?.text || '';
      setIaText(`📊 Analyse de l'infrastructure :\n\n${text}`);
    } catch (error) {
      console.error('Erreur lors de la génération du résumé:', error);
      setIaText('Impossible de générer un résumé. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnomaly = async () => {
    if (!selectedWidget || !selectedWidget.itemId) return;
    setLoading(true);
    try {
      const resp = await metricsService.getItemHistory(selectedWidget.itemId, undefined, undefined, 100);
      const series = resp.map(p => ({ ts: Number(p.clock), value: Number(p.value) })).filter(p => !isNaN(p.value));
      if (series.length === 0) {
        setIaText('Aucune donnée historique disponible pour analyser les anomalies.');
        return;
      }
      const result = await aiService.anomaly(series);
      if (result.anomalies && result.anomalies.length > 0) {
        setIaText(`Anomalies détectées : ${result.anomalies.length} point(s) anormal(aux) identifié(s)`);
      } else {
        setIaText('Aucune anomalie détectée dans les données récentes.');
      }
    } catch {
      setIaText('Impossible d&apos;analyser les anomalies pour cette métrique.');
    } finally {
      setLoading(false);
    }
  };

  const handleForecast = async () => {
    if (!selectedWidget || !selectedWidget.itemId) return;
    setLoading(true);
    try {
      const resp = await metricsService.getItemHistory(selectedWidget.itemId, undefined, undefined, 100);
      const series = resp.map(p => ({ ts: Number(p.clock), value: Number(p.value) })).filter(p => !isNaN(p.value));
      if (series.length < 10) {
        setIaText('Pas assez de données historiques pour effectuer une prévision (minimum 10 points).');
        return;
      }
      const predictions = await aiService.predict(series, 5);
      if (predictions.forecast && Array.isArray(predictions.forecast)) {
        const forecastPoints = predictions.forecast.map((p: any) => ({ ts: p.index, value: p.value }));
        setIaText(`Prévisions pour les 5 prochains points :\n${predictions.forecast.map((p: any, i: number) => `Point ${i+1}: ${p.value.toFixed(2)}`).join('\n')}`);
        
        // Ajouter les prévisions au widget
        onChange({
          config: {
            ...(selectedWidget.config || {}),
            forecastPoints: forecastPoints,
            showForecast: true,
            forecastColor: '#ff6b6b',
          } as WidgetConfig
        });
      } else {
        setIaText('Format de prévision inattendu reçu du service IA.');
      }
    } catch {
      setIaText('Impossible de générer des prévisions pour cette métrique.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestWidgets = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      // Contexte complet pour l'IA
      const contextHostId = currentHostId || selectedWidget?.hostId || (hostsList.length > 0 ? hostsList[0].hostid : undefined);
      const contextItems = contextHostId && allItemsByHost[contextHostId] ? allItemsByHost[contextHostId] : [];
      
      // Informations sur les widgets actuels
      const currentWidgets = widgets.map(w => ({
        type: w.type,
        title: w.title,
        hostId: w.hostId,
        itemId: w.itemId,
        config: w.config
      }));
      
      // Informations sur l'hôte sélectionné
      const hostInfo = hostsList.find(h => h.hostid === contextHostId);
      
      const items = contextItems.map(item => ({
        itemid: item.itemid,
        name: item.name,
        key_: item.key_,
        value_type: item.value_type,
        units: item.units,
        lastvalue: item.lastvalue
      }));
      
      // Contexte enrichi pour l'IA
      const context = {
        hostId: contextHostId,
        hostName: hostInfo?.name || hostInfo?.host || 'Hôte inconnu',
        currentWidgets,
        availableItems: items,
        dashboardStats: {
          totalWidgets: widgets.length,
          widgetTypes: [...new Set(widgets.map(w => w.type))]
        }
      };
      
      const suggestions = await aiService.suggestWidgets(contextHostId, items);
      if (suggestions && suggestions.length > 0) {
        setSuggestions(suggestions);
        setIaText(`Voici ${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''} de widgets pour enrichir votre dashboard "${hostInfo?.name || 'cet hôte'}" :`);
      } else {
        setIaText('Aucun widget supplémentaire recommandé pour le moment. Votre dashboard semble déjà bien complet !');
      }
    } catch {
      setIaText('Impossible de générer des suggestions de widgets. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuggestedWidget = (suggestion: any) => {
    if (!onAddWidget) return;
    
    try {
      const { type, title, hostId, itemId, config } = suggestion;
      onAddWidget(type as WidgetType, title, hostId, itemId, config);
      
      // Retirer la suggestion de la liste après l'avoir ajoutée
      setSuggestions(prev => prev.filter(s => s !== suggestion));
      
      // Mettre à jour le texte si plus de suggestions
      if (suggestions.length === 1) {
        setIaText('Toutes les suggestions ont été ajoutées ! Votre dashboard est maintenant plus complet.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du widget suggéré:', error);
    }
  };

  if (!selectedWidget) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Aucun widget sélectionné
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Cliquez sur un widget dans le canvas pour voir ses propriétés et options de configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Navigation des onglets */}
      <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Options du widget">
        {[
          { key: 'properties', label: 'Propriétés', icon: '⚙️' },
          { key: 'ai', label: 'Assistant IA', icon: '🤖' },
          { key: 'alerts', label: 'Alertes', icon: '🔔' }
        ].map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50 dark:bg-cyan-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            aria-label={`Onglet ${tab.label}`}
            aria-selected={activeTab === tab.key}
            role="tab"
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'properties' && (
          <div className="p-4" role="tabpanel" id="panel-properties" aria-labelledby="tab-properties">
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4-1.79 4-4M4 7l8-4 8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Widget {selectedWidget.type}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedWidget.title || 'Sans titre'}
                  </p>
                </div>
              </div>
            </div>
            <WidgetPropertiesPanel widget={selectedWidget} onChange={onChange} />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="p-4" role="tabpanel" id="panel-ai" aria-labelledby="tab-ai">
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                  🤖 Assistant IA
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                  Utilisez l&apos;IA pour optimiser et améliorer votre widget automatiquement.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    onClick={handleSuggestTitle} 
                    disabled={loading || !canTitle} 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    ✨ Suggérer un titre
                  </Button>
                  <Button 
                    onClick={handleAutoThresholds} 
                    disabled={loading || !canGauge} 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    🎯 Calculer seuils automatiques
                  </Button>
                  <Button 
                    onClick={handleSummarize} 
                    disabled={loading} 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    📝 Générer résumé
                  </Button>
                  <Button 
                    onClick={handleAnomaly} 
                    disabled={loading || !isSingleMetric} 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    🔍 Détecter anomalies
                  </Button>
                  <Button 
                    onClick={handleForecast} 
                    disabled={loading || !isSingleMetric} 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    📈 Prévisions intelligentes
                  </Button>
                  <Button 
                    onClick={handleSuggestWidgets} 
                    disabled={loading} 
                    size="sm" 
                    variant="outline"
                    className="w-full justify-start"
                  >
                    💡 Suggérer widgets complémentaires
                  </Button>
                </div>
              </div>
              
              {iaText && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    💬 Réponse de l&apos;assistant
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                    {iaText}
                  </p>
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    🎯 Suggestions disponibles
                  </h4>
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-green-900 dark:text-green-100 text-sm truncate">
                            {suggestion.type === 'gauge' && '📊'} 
                            {suggestion.type === 'multiChart' && '📈'} 
                            {suggestion.type === 'metricValue' && '🔢'} 
                            {suggestion.type === 'problems' && '⚠️'} 
                            {suggestion.title}
                          </h5>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1 line-clamp-2">
                            {suggestion.reasoning}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAddSuggestedWidget(suggestion)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-auto"
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      L&apos;assistant IA travaille...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="p-4" role="tabpanel" id="panel-alerts" aria-labelledby="tab-alerts">
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                  🔔 Configuration des alertes
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Configurez les notifications et seuils d&apos;alerte pour ce widget.
                </p>
              </div>

              {/* Configuration globale */}
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Configuration globale</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Délai entre notifications (secondes)
                  </label>
                  <NumberInput 
                    className="w-full" 
                    min={10}
                    value={(selectedWidget.config as any)?.cooldownSec || 300}
                    onChange={(value) => onChange({ config: { ...(selectedWidget.config || {}), cooldownSec: value } as any })} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Évite l&apos;envoi de notifications trop fréquentes pour le même widget
                  </p>
                </div>
              </div>

              {selectedWidget.type === 'metricValue' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Règle d&apos;alerte</h4>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        checked={!!(selectedWidget.config as any)?.alertsEnabled}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertsEnabled: e.target.checked } as any })}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activer les alertes</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Définissez une condition pour déclencher une alerte pour cette métrique.
                    </p>
                    <div className="flex items-center gap-2">
                      <select 
                        className="flex-1 h-8 w-full border rounded px-2 bg-background text-foreground text-sm"
                        value={(selectedWidget.config?.alerts?.[0]?.operator) || '>'}
                        onChange={(e) => {
                          const newRule: AlertRule = { 
                            ...(selectedWidget.config?.alerts?.[0] || { threshold: 100 }),
                            operator: e.target.value as any 
                          };
                          onChange({ config: { ...(selectedWidget.config || {}), alerts: [newRule] } as any });
                        }}
                      >
                        <option value=">">&gt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="<">&lt;</option>
                        <option value="<=">&lt;=</option>
                      </select>
                      <NumberInput 
                        className="flex-1"
                        placeholder="Seuil"
                        value={(selectedWidget.config?.alerts?.[0]?.threshold) || 100}
                        onChange={(value) => {
                          const newRule: AlertRule = { 
                            ...(selectedWidget.config?.alerts?.[0] || { operator: '>' }),
                            threshold: value 
                          };
                          onChange({ config: { ...(selectedWidget.config || {}), alerts: [newRule] } as any });
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {selectedWidget.type === 'gauge' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Seuils de jauge</h4>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        checked={!!(selectedWidget.config as any)?.alertsEnabled}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertsEnabled: e.target.checked } as any })}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activer les alertes</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Niveau minimal d&apos;alerte
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        value={(selectedWidget.config as any)?.gaugeNotifyLevel || 'warning'}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), gaugeNotifyLevel: e.target.value as 'warning' | 'critical' } as any })}
                      >
                        <option value="warning">Avertissement</option>
                        <option value="critical">Critique</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {selectedWidget.type === 'multiChart' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Alertes par métrique</h4>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        checked={!!(selectedWidget.config as any)?.alertsEnabled}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertsEnabled: e.target.checked } as any })}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activer les alertes</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Définissez des alertes pour des métriques spécifiques dans ce graphique.</p>
                    {(selectedWidget.config?.series as string[] || []).map(itemId => {
                      const rule = (selectedWidget.config?.alerts || []).find(a => a.targetItemId === itemId);
                      if (rule) return null; // Pour l&apos;instant, on ne gère que l&apos;ajout
                      return (
                        <div key={itemId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-md">
                          <span className="text-sm truncate">{itemLabelById[itemId] || `Item ${itemId}`}</span>
                          <Button size="sm" variant="outline" onClick={() => {
                            const newRule: AlertRule = { targetItemId: itemId, operator: '>', threshold: 100 };
                            const alerts = [...(selectedWidget.config?.alerts || []), newRule];
                            onChange({ config: { ...(selectedWidget.config || {}), alerts } as any });
                          }}>
                            + Ajouter une alerte
                          </Button>
                        </div>
                      );
                    })}
                    {(selectedWidget.config?.alerts || []).map((rule, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{itemLabelById[rule.targetItemId || ''] || 'Alerte'}</p>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6" 
                            onClick={() => {
                               const alerts = (selectedWidget.config?.alerts || []).filter((_, i) => i !== index);
                               onChange({ config: { ...(selectedWidget.config || {}), alerts } as any });
                            }}
                            aria-label={`Supprimer l'alerte pour ${itemLabelById[rule.targetItemId || ''] || 'cette métrique'}`}
                            title={`Supprimer l'alerte pour ${itemLabelById[rule.targetItemId || ''] || 'cette métrique'}`}
                          >
                            <X className="h-4 w-4"/>
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            className="flex-1 h-8 w-full border rounded px-2 bg-background text-foreground text-sm"
                            value={rule.operator}
                            onChange={(e) => {
                              const alerts = [...(selectedWidget.config?.alerts || [])];
                              alerts[index] = { ...alerts[index], operator: e.target.value as any };
                              onChange({ config: { ...(selectedWidget.config || {}), alerts } as any });
                            }}
                          >
                            <option value=">">&gt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<">&lt;</option>
                            <option value="<=">&lt;=</option>
                          </select>
                          <NumberInput 
                            className="flex-1"
                            value={rule.threshold}
                            onChange={(value) => {
                              const alerts = [...(selectedWidget.config?.alerts || [])];
                              alerts[index] = { ...alerts[index], threshold: value };
                              onChange({ config: { ...(selectedWidget.config || {}), alerts } as any });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedWidget.type === 'availability' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Événements de disponibilité</h4>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        checked={!!(selectedWidget.config as any)?.alertsEnabled}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertsEnabled: e.target.checked } as any })}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activer les alertes</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Notifier quand l&apos;hôte devient indisponible</span>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500" 
                        checked={!!(selectedWidget.config as any)?.alertOnDown}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertOnDown: e.target.checked } as any })} 
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Notifier quand l&apos;hôte redevient disponible</span>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500" 
                        checked={!!(selectedWidget.config as any)?.alertOnUp}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertOnUp: e.target.checked } as any })} 
                      />
                    </label>
                  </div>
                </div>
              )}

              {selectedWidget.type === 'problems' && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Seuils de problèmes</h4>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        checked={!!(selectedWidget.config as any)?.alertsEnabled}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), alertsEnabled: e.target.checked } as any })}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Activer les alertes</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Seuil de nombre de problèmes
                      </label>
                      <NumberInput 
                        className="w-full" 
                        min={1}
                        value={(selectedWidget.config as any)?.problemsThreshold || 1}
                        onChange={(value) => onChange({ config: { ...(selectedWidget.config || {}), problemsThreshold: value } as any })} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sévérité minimale
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        value={(selectedWidget.config as any)?.problemsMinSeverity || '0'}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), problemsMinSeverity: e.target.value as any } as any })}
                      >
                        <option value="0">Non classifié</option>
                        <option value="1">Information</option>
                        <option value="2">Avertissement</option>
                        <option value="3">Moyen</option>
                        <option value="4">Élevé</option>
                        <option value="5">Catastrophe</option>
                      </select>
                    </div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Filtrer uniquement pour cet hôte</span>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                        checked={!!(selectedWidget.config as any)?.problemsHostOnly}
                        onChange={(e) => onChange({ config: { ...(selectedWidget.config || {}), problemsHostOnly: e.target.checked } as any })}
                      />
                    </label>
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