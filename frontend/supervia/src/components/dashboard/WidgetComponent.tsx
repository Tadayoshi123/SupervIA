'use client';

import { useAppSelector } from '@/lib/hooks';
import { selectItemsForHost, selectProblems, selectHosts } from '@/lib/features/metrics/metricsSlice';
import { Widget } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, BarChart3, Activity, AlertCircle, Gauge, FileText, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface WidgetComponentProps {
  widget: Widget;
  onRemove?: () => void;
  isDragging?: boolean;
}

export default function WidgetComponent({ widget, onRemove, isDragging }: WidgetComponentProps) {
  // Récupérer les données selon le type de widget
  const items = useAppSelector(selectItemsForHost(widget.hostId || ''));
  const problems = useAppSelector(selectProblems);
  const hosts = useAppSelector(selectHosts);
  
  const item = widget.itemId ? items.find(i => i.itemid === widget.itemId) : undefined;
  const host = widget.hostId ? hosts.find(h => h.hostid === widget.hostId) : undefined;
  
  // Fonction pour formater les valeurs selon leur type
  const formatValue = (value: string | undefined, units: string) => {
    if (!value) return 'N/A';
    
    // Conversion des octets en format lisible
    if (units === 'B') {
      const bytes = parseFloat(value);
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      if (i === 0) return `${bytes} ${sizes[i]}`;
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
    
    // Valeurs numériques formatées
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      return `${asNumber.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${units}`.trim();
    }
    // Valeur brute si non numérique
    return `${value} ${units}`.trim();
  };
  
  // Fonction pour obtenir l'icône du type de widget
  const getWidgetIcon = () => {
    switch (widget.type) {
      case 'metric':
        return <Gauge className="h-4 w-4" />;
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'status':
        return <Activity className="h-4 w-4" />;
      case 'problems':
        return <AlertCircle className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <Gauge className="h-4 w-4" />;
    }
  };
  
  // Générer des données factices pour les graphiques
  const generateChartData = () => {
    const data = [];
    const baseValue = parseFloat(item?.lastvalue || '0') || Math.random() * 100;
    
    for (let i = 0; i < 7; i++) {
      data.push({
        name: `J-${6-i}`,
        value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3),
        valueFormatted: formatValue((baseValue + (Math.random() - 0.5) * baseValue * 0.3).toString(), item?.units || '')
      });
    }
    return data;
  };

  const chartData = generateChartData();

  // Rendu du contenu du widget selon son type
  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'metric':
        return (
          <div className="widget-content flex flex-col items-center justify-center h-full space-y-3 p-4" suppressHydrationWarning>
            {item ? (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Gauge className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="widget-value font-bold text-center text-3xl text-gray-900 dark:text-gray-100">
                  {formatValue(item.lastvalue, item.units)}
                </div>
                <div className="widget-title text-muted-foreground text-center text-sm font-medium" title={item.name}>
                  {item.name.length > 25 ? `${item.name.substring(0, 25)}...` : item.name}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Gauge className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-muted-foreground text-sm">Aucune donnée</div>
              </>
            )}
          </div>
        );
      case 'chart':
        return (
          <div className="widget-content flex flex-col h-full" suppressHydrationWarning>
            {item ? (
              <>
                 <div className="widget-title text-muted-foreground mb-2 text-center text-sm font-medium px-3 pt-2" title={item.name}>
                   <span className="line-clamp-2 break-words">{item.name}</span>
                 </div>
                 <div className="flex-1 min-h-0 px-2 pb-2">
                  <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                    {(() => {
                      const chartType = widget.config?.chartType || 'area';
                      const color = (widget.config?.color as string) || '#3b82f6';
                      const commonAxes = (
                        <>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} height={20} />
                          <YAxis hide />
                          <Tooltip formatter={(value) => [formatValue(value.toString(), item.units), 'Valeur']} />
                        </>
                      );
                      if (chartType === 'line') {
                        return (
                          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            {commonAxes}
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
                          </LineChart>
                        );
                      }
                      if (chartType === 'bar') {
                        return (
                          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            {commonAxes}
                            <Bar dataKey="value" fill={color} />
                          </BarChart>
                        );
                      }
                      return (
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id={`colorValue-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          {commonAxes}
                          <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#colorValue-${widget.id})`} strokeWidth={2} />
                        </AreaChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>
                <div className="text-center px-3 pb-2">
                  <div className="widget-value font-semibold text-blue-600 text-base">
                    {formatValue(item.lastvalue, item.units)}
                  </div>
                  <div className="text-xs text-muted-foreground">Valeur actuelle</div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-2 text-gray-300" />
                <div className="text-sm text-center">Sélectionnez une métrique</div>
              </div>
            )}
          </div>
        );
      case 'status':
        // Si aucune métrique n'est sélectionnée, essayer d'auto-déduire sur l'hôte:
        // 1) prendre un item dont la clé contient 'icmpping' ou 'agent.ping' ou 'availability'.
        let statusItem = item;
        if (!statusItem && widget.hostId) {
          const auto = items.find(i => {
            const key = (i.key_ || '').toLowerCase();
            return key.includes('icmpping') || key.includes('agent.ping') || key.includes('availability');
          });
          if (auto) statusItem = auto;
        }
        const isOnline = Number(statusItem?.lastvalue || 0) > 0;
        return (
          <div className="widget-content flex flex-col items-center justify-center h-full space-y-3 p-4" suppressHydrationWarning>
            {statusItem ? (
              <>
                <div className={`flex items-center justify-center w-16 h-16 rounded-full ${isOnline ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  {isOnline ? (
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className={`widget-value font-bold text-center text-2xl ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isOnline ? 'En ligne' : 'Hors ligne'}
                </div>
                 <div className="widget-title text-muted-foreground text-center text-sm font-medium px-2" title={statusItem?.name}>
                   <span className="line-clamp-2 break-words">{statusItem?.name || 'Disponibilité'}</span>
                 </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-muted-foreground text-sm">Sélectionnez un hôte pour auto-détecter</div>
              </>
            )}
          </div>
        );
      case 'problems':
        const hostProblems = widget.hostId 
          ? problems.filter(p => p.hosts?.some(h => h.hostid === widget.hostId))
          : problems.slice(0, 5);
        
        return (
          <div className="widget-content flex flex-col h-full p-3" suppressHydrationWarning>
            <div className="widget-title text-muted-foreground mb-3 text-center text-sm font-medium">
              {widget.hostId ? `Problèmes de ${host?.name ? (host.name.length > 15 ? `${host.name.substring(0, 15)}...` : host.name) : 'Hôte'}` : 'Problèmes récents'}
            </div>
            {hostProblems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-green-600 dark:text-green-400 font-semibold text-lg">✓ Aucun problème</div>
                <div className="text-xs text-muted-foreground mt-1">Système oprationnel</div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-3">
                    <div className="text-red-600 dark:text-red-400 font-bold text-lg">{hostProblems.length}</div>
                    <div className="text-xs text-muted-foreground">Problème(s)</div>
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {hostProblems.slice(0, 2).map((problem) => (
                    <div key={problem.eventid} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="font-medium text-red-800 dark:text-red-300 text-xs leading-tight" title={problem.name}>
                        {problem.name.length > 30 ? `${problem.name.substring(0, 30)}...` : problem.name}
                      </div>
                      <div className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                        Sévérité: {problem.severity}
                      </div>
                    </div>
                  ))}
                  {hostProblems.length > 2 && (
                    <div className="text-xs text-center text-muted-foreground p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      +{hostProblems.length - 2} autres problèmes
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      case 'text':
        const textContent = widget.config?.text as string || 'Texte personnalisé';
        return (
             <div className="widget-content flex flex-col h-full p-4" suppressHydrationWarning>
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="widget-value text-center break-words text-gray-900 dark:text-gray-100 font-medium leading-relaxed text-lg">
                  {textContent}
                </div>
                <div className="text-xs text-muted-foreground mt-3 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">
                  📝 Cliquez pour éditer
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">
              Widget non reconnu
            </div>
          </div>
        );
    }
  };
  
  return (
    <Card 
      className={`widget-card group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm h-full flex flex-col ${isDragging ? 'dragging border-blue-500 shadow-2xl' : ''}`}
      suppressHydrationWarning
    >
       <CardHeader className="flex flex-row items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center min-w-0 flex-1 text-gray-900 dark:text-gray-100">
          {getWidgetIcon()}
          <span className="ml-2 truncate">{widget.title}</span>
        </CardTitle>
        {onRemove && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRemove} 
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-full w-full overflow-auto">
          {renderWidgetContent()}
        </div>
      </CardContent>
    </Card>
  );
}