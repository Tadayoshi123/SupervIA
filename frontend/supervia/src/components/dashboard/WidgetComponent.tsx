'use client';

import { useAppSelector } from '@/lib/hooks';
import { selectItemsForHost, selectProblems, selectHosts } from '@/lib/features/metrics/metricsSlice';
import { Widget } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Gauge, CheckCircle, BarChart3, Activity, Hash, TrendingUp, PieChart } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useEffect, useRef, useState } from 'react';
import metricsService from '@/lib/features/metrics/metricsService';
import notificationService from '@/lib/features/notifications/notificationService';
import toast from 'react-hot-toast';

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
  
  // État/rafraîchissement pour multi‑métriques (déclarés au niveau du composant pour respecter les règles des hooks)
  const seriesIds = Array.isArray(widget.config?.series) ? (widget.config?.series as string[]).filter(Boolean) : [];
  const refreshSec = (widget.config?.refreshSec as number) ?? 0;
  const timeRangeSec = (widget.config?.timeRangeSec as number) ?? 3600;
  const [multiData, setMultiData] = useState<Array<Record<string, number | string>>>([]);
  const lastLoadRef = useRef<number>(0);
  useEffect(() => {
    if (widget.type !== 'multiChart') return; // n'exécuter que pour le widget multi‑métriques
    let stopped = false;
    async function load() {
      if (!widget.hostId || seriesIds.length === 0) { setMultiData([]); return; }
      const now = Math.floor(Date.now() / 1000);
      const from = now - timeRangeSec;
      try {
        const results = await Promise.all(seriesIds.map((sid) => metricsService.getItemHistory(sid, from, now, 600)));
        const allTs = new Set<number>();
        const seriesData = results.map((arr) => arr.map((p) => ({ ts: Number(p.clock) * 1000, value: Number(p.value) })));
        seriesData.forEach((arr) => arr.forEach((p) => allTs.add(p.ts)));
        const sortedTs = Array.from(allTs).sort((a, b) => a - b);
        const rows = sortedTs.map((ts) => {
          const row: Record<string, number | string> = { ts };
          seriesData.forEach((arr, idx) => {
            const found = arr.find((p) => p.ts === ts);
            row[`s${idx}`] = found ? found.value : null as unknown as number;
          });
          return row;
        });
        if (!stopped) { setMultiData(rows); lastLoadRef.current = Date.now(); }
      } catch {
        if (!stopped) setMultiData([]);
      }
    }
    load();
    if (refreshSec > 0) {
      const id = setInterval(load, refreshSec * 1000);
      return () => { stopped = true; clearInterval(id); };
    }
    return () => { stopped = true; };
  }, [widget.type, widget.hostId, seriesIds.join(','), timeRangeSec, refreshSec]);
  
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
      case 'multiChart':
        return <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'gauge':
        return <Gauge className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'metricValue':
        return <Hash className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'availability':
        return <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case 'problems':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <PieChart className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };
  
  // (Supprimé) Données factices inutiles

  // Évaluation des alertes pour widgets mono‑métriques (metricValue uniquement)
  useEffect(() => {
    if (!(widget.type === 'metricValue')) return;
    const cfg: any = widget.config || {};
    if (!Array.isArray(cfg.alerts) || cfg.alerts.length === 0) return;
    if (!item) return;
    const value = Number(item.lastvalue);
    if (!Number.isFinite(value)) return;
    const cooldownSec = Number(cfg.cooldownSec || 300);
    const baseKey = `supervia.cooldown.single.${widget.id}`;
    const now = Date.now();
    for (let idx = 0; idx < cfg.alerts.length; idx++) {
      const r = cfg.alerts[idx];
      if (r.targetItemId && r.targetItemId !== widget.itemId) continue;
      const thr = Number(r.threshold);
      const op = r.operator as string;
      const ok = op === '>' ? value > thr : op === '>=' ? value >= thr : op === '<' ? value < thr : value <= thr;
      if (!ok) continue;
      const ck = `${baseKey}.${idx}`;
      const last = typeof window !== 'undefined' ? Number(localStorage.getItem(ck) || 0) : 0;
      if (now - last <= cooldownSec * 1000) continue;
      const severity = (r.severity || 'warning').toUpperCase();
      const subject = `[${severity}] ${widget.title || 'Métrique'} (${item?.name || ''})`;
      const text = `Widget: ${widget.title || 'Métrique'}\nHost: ${host?.name || widget.hostId}\nMetric: ${item?.name}\nCondition: ${op} ${thr}\nValeur: ${value}${item?.units || ''}`;
      try {
        const raw = localStorage.getItem('supervia.notifications') || '[]';
        const arr = JSON.parse(raw);
        arr.push({ id: `${widget.id}-single-${now}-${idx}`, title: subject, time: now, body: text, read: false });
        localStorage.setItem('supervia.notifications', JSON.stringify(arr));
      } catch {}
      try { toast.success(subject); } catch {}
      notificationService.sendEmail({ subject, text }).catch(() => { try { toast.error("Échec de l'envoi de l'email"); } catch {} });
      if (typeof window !== 'undefined') localStorage.setItem(ck, String(now));
    }
  }, [widget.type, widget.id, widget.itemId, widget.config, item?.lastvalue, host?.name, widget.hostId]);

  // Rendu du contenu du widget selon son type
  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'multiChart': {
        const hostItems = items; // déjà récupéré en haut de composant
        if (!widget.hostId) {
          return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Sélectionnez un hôte pour ce graphique.
            </div>
          );
        }
        if (!widget.hostId || seriesIds.length === 0) {
          return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Sélectionnez un hôte et au moins une métrique à comparer.
            </div>
          );
        }
        const seriesColors = (widget.config?.seriesColors || {}) as Record<string, string>;
        const palette = ['#22d3ee', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'];
        const colorFor = (idx: number) => palette[idx % palette.length];
        const chartType = widget.config?.chartType || 'area';
        const showLegend = widget.config?.legend !== false;
        const showGrid = widget.config?.showGrid !== false;
        const showForecast = widget.config?.showForecast !== false; // par défaut on affiche si présent
        const forecastColor = (widget.config?.forecastColor as string) || '#94a3b8';
        const forecast = (widget.config?.forecastPoints || []).map(p => ({ ts: (p.ts > 1e12 ? p.ts : p.ts * 1000), value: p.value }));
        const seriesMeta = seriesIds.map((sid, idx) => {
          const it = hostItems.find((x) => x.itemid === sid);
          const c = seriesColors[sid] || colorFor(idx);
          return { key: `s${idx}`, sid, name: it?.name || it?.key_ || `Métrique ${idx + 1}`, color: c } as { key: string; sid: string; name: string; color: string };
        });
        // Notification multi‑métriques (MVP) : si notifyOnMulti et une règle est vraie, envoi avec cooldown
        try {
          const cfg: any = widget.config || {};
          const enabled = !!cfg.notifyOnMulti;
          const cooldownSec = Number(cfg.cooldownSec || 300);
          const keyBase = `supervia.cooldown.multichart.${widget.id}`;
          if (enabled && Array.isArray(cfg.alerts) && cfg.alerts.length > 0 && multiData.length > 0) {
            const lastRow = multiData[multiData.length - 1] as any;
            for (let idx = 0; idx < cfg.alerts.length; idx++) {
              const r = cfg.alerts[idx];
              const seriesIdx = seriesIds.findIndex((id) => id === r.targetItemId);
              if (seriesIdx === -1) continue;
              const val = Number(lastRow[`s${seriesIdx}`]);
              if (!Number.isFinite(val)) continue;
              const op = r.operator as string;
              const thr = Number(r.threshold);
              const ok = op === '>' ? val > thr : op === '>=' ? val >= thr : op === '<' ? val < thr : val <= thr;
              if (ok) {
                const ck = `${keyBase}.${idx}`;
                const last = typeof window !== 'undefined' ? Number(localStorage.getItem(ck) || 0) : 0;
                const now = Date.now();
                if (now - last > cooldownSec * 1000) {
                  const lbl = seriesMeta[seriesIdx]?.name || `s${seriesIdx}`;
                  const subject = `[${(r.severity || 'warning').toUpperCase()}] ${widget.title || 'Multi‑métriques'} - ${lbl}`;
                  const text = `Widget: ${widget.title || 'Multi‑métriques'}\nHost: ${host?.name || widget.hostId}\nSérie: ${lbl}\nCondition: ${op} ${thr}\nValeur: ${val}`;
                  try { const raw = localStorage.getItem('supervia.notifications') || '[]'; const arr = JSON.parse(raw); arr.push({ id: `${widget.id}-multi-${now}-${idx}`, title: subject, time: now, body: text, read: false }); localStorage.setItem('supervia.notifications', JSON.stringify(arr)); } catch {}
                  try { toast.success(subject); } catch {}
                  notificationService.sendEmail({ subject, text }).catch(() => { try { toast.error("Échec de l'envoi de l'email"); } catch {} });
                  if (typeof window !== 'undefined') localStorage.setItem(ck, String(now));
                }
              }
            }
          }
        } catch {}
        const lastTs = multiData.length ? multiData[multiData.length - 1].ts : 0;
        const CommonAxes = () => (
          <>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="ts" tickFormatter={(ts) => new Date(Number(ts)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} minTickGap={24} />
            <YAxis allowDecimals tick={{ fontSize: 10 }} domain={[
              (widget.config?.yMin ?? 'auto') as any,
              (widget.config?.yMax ?? 'auto') as any
            ]} />
            <Tooltip />
            {showLegend && <Legend />}
          </>
        );
        return (
          <div className="flex flex-col h-full" suppressHydrationWarning>
            <div className="px-3 pt-2 text-xs text-muted-foreground line-clamp-2" title={widget.title}>{widget.title}</div>
            <div className="flex-1 min-h-0 px-2 pb-2">
              <ResponsiveContainer width="100%" height="100%" minHeight={140}>
                {chartType === 'line' ? (
                  <LineChart key={`line-${widget.id}-${lastTs}`} data={multiData} margin={{ top: 4, left: 8, right: 8, bottom: 4 }}>
                    <CommonAxes />
                    {seriesMeta.map((s) => (
                      <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} connectNulls isAnimationActive animationDuration={350} />
                    ))}
                    {showForecast && forecast.length > 0 && (
                      <Line dataKey="value" data={forecast} stroke={forecastColor} strokeDasharray="4 4" dot={false} isAnimationActive={false} xAxisId={0} yAxisId={0} />
                    )}
                  </LineChart>
                ) : chartType === 'bar' ? (
                  <BarChart key={`bar-${widget.id}-${lastTs}`} data={multiData} margin={{ top: 4, left: 8, right: 8, bottom: 4 }}>
                    <CommonAxes />
                    {seriesMeta.map((s) => (
                      <Bar key={s.key} dataKey={s.key} fill={s.color} isAnimationActive animationDuration={300} />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart key={`area-${widget.id}-${lastTs}`} data={multiData} margin={{ top: 4, left: 8, right: 8, bottom: 4 }}>
                    <defs>
                      {seriesMeta.map((s) => (
                        <linearGradient key={s.key} id={`grad-${widget.id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={s.color} stopOpacity={0.7} />
                          <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CommonAxes />
                    {seriesMeta.map((s) => (
                      <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={`url(#grad-${widget.id}-${s.key})`} strokeWidth={2} connectNulls isAnimationActive animationDuration={350} />
                    ))}
                    {showForecast && forecast.length > 0 && (
                      <Line dataKey="value" data={forecast} stroke={forecastColor} strokeDasharray="4 4" dot={false} isAnimationActive={false} xAxisId={0} yAxisId={0} />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'gauge': {
        const value = Number(item?.lastvalue || 0);
        const warn = widget.config?.warningThreshold ?? 70;
        const crit = widget.config?.criticalThreshold ?? 90;
        const status = value >= crit ? 'critique' : value >= warn ? 'avertissement' : 'normal';
        const color = status === 'critique' ? '#ef4444' : status === 'avertissement' ? '#f59e0b' : '#10b981';
        // Envoi email (MVP) si notifyOnGauge et valeur >= niveau choisi, avec cooldown local par widget
        try {
          const cfg: any = widget.config || {};
          const level: 'warning' | 'critical' = cfg.gaugeNotifyLevel || 'critical';
          const shouldNotify = cfg.notifyOnGauge && ((level === 'critical' && value >= crit) || (level === 'warning' && value >= warn));
          const cooldownSec = Number(cfg.cooldownSec || 300);
          const key = `supervia.cooldown.gauge.${widget.id}`;
          const last = typeof window !== 'undefined' ? Number(localStorage.getItem(key) || 0) : 0;
          const now = Date.now();
          if (shouldNotify && now - last > cooldownSec * 1000) {
            const subject = `[${status.toUpperCase()}] ${widget.title || 'Jauge'} (${item?.name || ''})`;
            const text = `Widget: ${widget.title || 'Jauge'}\nHost: ${host?.name || widget.hostId}\nMetric: ${item?.name}\nValue: ${value}${item?.units || '%'}\nThresholds: warn=${warn}, crit=${crit}`;
            try { const raw = localStorage.getItem('supervia.notifications') || '[]'; const arr = JSON.parse(raw); arr.push({ id: `${widget.id}-gauge-${now}`, title: subject, time: now, body: text, read: false }); localStorage.setItem('supervia.notifications', JSON.stringify(arr)); } catch {}
            try { toast.success(subject); } catch {}
            notificationService.sendEmail({ subject, text }).catch(() => { try { toast.error("Échec de l'envoi de l'email"); } catch {} });
            if (typeof window !== 'undefined') localStorage.setItem(key, String(now));
          }
        } catch {}
        return (
          <div className="flex h-full items-center justify-center p-4" suppressHydrationWarning>
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="8" fill="none" strokeDasharray={`${(value / 100) * 251} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold" style={{ color }}>{Math.round(value)}%</div>
                <div className="text-xs text-muted-foreground capitalize">{status}</div>
              </div>
            </div>
          </div>
        );
      }

      case 'availability': {
        // Déterminer la dispo sans exiger une métrique sélectionnée
        // 1) Priorité: champs d'état de l'hôte (active_available / available)
        // 2) Sinon, auto‑détection d'une métrique de ping (icmpping / agent.ping / net.tcp.service)
        let isOnline: boolean | null = null;
        if (host) {
          const enabled = host.status === '0';
          if (enabled) {
            if (host.active_available != null || host.available != null) {
              isOnline = host.active_available === '1' || host.available === '1';
            }
          } else {
            isOnline = null; // hôte désactivé → état inconnu visuellement
          }
        }
        if (isOnline === null) {
          // Auto‑détection d'une métrique pertinente
          const statusItem = items.find((i) => {
            const key = (i.key_ || '').toLowerCase();
            return (
              key.includes('icmpping') ||
              key.includes('agent.ping') ||
              key.includes('net.tcp.service') ||
              key.includes('availability')
            );
          });
          if (statusItem) {
            isOnline = Number(statusItem.lastvalue || 0) > 0;
          }
        }

        const label = isOnline === null ? 'Indisponible (désactivé)' : isOnline ? 'En service' : 'Hors service';
        const classes = isOnline === null
          ? 'bg-gray-50 text-gray-600'
          : isOnline
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700';
        // Envoi email (MVP) sur transition DOWN/UP selon la config avec cooldown
        try {
          const cfg: any = widget.config || {};
          const cooldownSec = Number(cfg.cooldownSec || 300);
          const key = `supervia.cooldown.availability.${widget.id}`;
          const last = typeof window !== 'undefined' ? Number(localStorage.getItem(key) || 0) : 0;
          const now = Date.now();
          const prevKey = `supervia.prev.availability.${widget.id}`;
          const prev = typeof window !== 'undefined' ? localStorage.getItem(prevKey) : null;
          const prevOnline = prev === '1' ? true : prev === '0' ? false : null;
          if (typeof window !== 'undefined') localStorage.setItem(prevKey, isOnline === null ? '-1' : isOnline ? '1' : '0');
          const transitionedDown = prevOnline === true && isOnline === false;
          const transitionedUp = prevOnline === false && isOnline === true;
          const wantDown = !!cfg.alertOnDown;
          const wantUp = !!cfg.alertOnUp;
          if ((transitionedDown && wantDown) || (transitionedUp && wantUp)) {
            if (now - last > cooldownSec * 1000) {
              const subject = `[${transitionedDown ? 'DOWN' : 'UP'}] ${host?.name || widget.hostId}`;
              const text = `Host: ${host?.name || widget.hostId}\nStatus: ${transitionedDown ? 'Hors ligne' : 'En ligne'}\nWidget: ${widget.title || 'Disponibilité'}`;
              try { const raw = localStorage.getItem('supervia.notifications') || '[]'; const arr = JSON.parse(raw); arr.push({ id: `${widget.id}-avail-${now}`, title: subject, time: now, body: text, read: false }); localStorage.setItem('supervia.notifications', JSON.stringify(arr)); } catch {}
              try { toast.success(subject); } catch {}
              notificationService.sendEmail({ subject, text }).catch(() => { try { toast.error("Échec de l'envoi de l'email"); } catch {} });
              if (typeof window !== 'undefined') localStorage.setItem(key, String(now));
            }
          }
        } catch {}
        return (
          <div className="flex h-full items-center justify-center p-4" suppressHydrationWarning>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${classes}`}>
              {label}
            </div>
          </div>
        );
      }

      case 'metricValue': {
        return (
          <div className="flex h-full items-center justify-center p-4" suppressHydrationWarning>
            {item ? (
              <div className="text-center">
                <div className="text-3xl font-bold">{formatValue(item.lastvalue, item.units)}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2" title={item.name}>{item.name}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sélectionnez une métrique</div>
            )}
          </div>
        );
      }
      case 'problems':
        const hostProblems = widget.hostId 
          ? problems.filter(p => p.hosts?.some(h => h.hostid === widget.hostId))
          : problems.slice(0, 5);
        // Notification simple sur problèmes si activé
        try {
          const cfg: any = widget.config || {};
          if (cfg.notifyOnProblems) {
            const minSev = cfg.problemsMinSeverity || '0';
            const onlyHost = !!cfg.problemsHostOnly;
            const pool = onlyHost && widget.hostId ? problems.filter(p => p.hosts?.some(h => h.hostid === widget.hostId)) : problems;
            const count = pool.filter(p => Number(p.severity) >= Number(minSev)).length;
            const threshold = Number(cfg.problemsThreshold || 1);
            const key = `supervia.cooldown.problems.${widget.id}`;
            const last = typeof window !== 'undefined' ? Number(localStorage.getItem(key) || 0) : 0;
            const now = Date.now();
            const cooldownSec = Number(cfg.cooldownSec || 300);
            if (count >= threshold && now - last > cooldownSec * 1000) {
              const subject = `[ALERTE] ${count} problème(s) ${onlyHost ? `sur ${host?.name || widget.hostId}` : 'actifs'}`;
              const text = `Widget: ${widget.title || 'Problèmes'}\nScope: ${onlyHost ? (host?.name || widget.hostId) : 'Tous hôtes'}\nSeuil: >= ${threshold} (sev >= ${minSev})\nActuels: ${count}`;
              try { const raw = localStorage.getItem('supervia.notifications') || '[]'; const arr = JSON.parse(raw); arr.push({ id: `${widget.id}-problems-${now}`, title: subject, time: now, body: text, read: false }); localStorage.setItem('supervia.notifications', JSON.stringify(arr)); } catch {}
              try { toast.success(subject); } catch {}
              notificationService.sendEmail({ subject, text }).catch(() => { try { toast.error("Échec de l'envoi de l'email"); } catch {} });
              if (typeof window !== 'undefined') localStorage.setItem(key, String(now));
            }
          }
        } catch {}
        
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
                {hostProblems.length > 2 && (
                  <div className="mt-2 text-center">
                    <a className="text-xs text-blue-600 hover:underline" href="/dashboard?tab=problems">Voir plus</a>
                  </div>
                )}
              </>
            )}
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
  
  const getWidgetGradient = () => {
    switch (widget.type) {
      case 'multiChart':
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20';
      case 'gauge':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20';
      case 'metricValue':
        return 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20';
      case 'availability':
        return 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20';
      case 'problems':
        return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';
      default:
        return 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20';
    }
  };

  const getBorderGradient = () => {
    switch (widget.type) {
      case 'multiChart':
        return 'border-blue-200 dark:border-blue-800';
      case 'gauge':
        return 'border-green-200 dark:border-green-800';
      case 'metricValue':
        return 'border-orange-200 dark:border-orange-800';
      case 'availability':
        return 'border-cyan-200 dark:border-cyan-800';
      case 'problems':
        return 'border-red-200 dark:border-red-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Card 
      className={`widget-card group relative h-full flex flex-col rounded-xl shadow-sm transition-all duration-300 hover:shadow-md ${getBorderGradient()} bg-gradient-to-br ${getWidgetGradient()} ${
        isDragging ? 'scale-105 shadow-2xl ring-2 ring-cyan-500 ring-opacity-50' : 'hover:scale-[1.02]'
      }`}
      suppressHydrationWarning
    >
      {/* Indicateur de type de widget */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${
        widget.type === 'multiChart' ? 'bg-blue-500' :
        widget.type === 'gauge' ? 'bg-green-500' :
        widget.type === 'metricValue' ? 'bg-orange-500' :
        widget.type === 'availability' ? 'bg-cyan-500' :
        widget.type === 'problems' ? 'bg-red-500' : 'bg-gray-500'
      } opacity-60`} />

      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-800/20 shrink-0 rounded-t-xl">
        <CardTitle className="text-sm font-semibold flex items-center min-w-0 flex-1 text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              {getWidgetIcon()}
            </div>
            <div className="min-w-0">
              <span className="truncate block">{widget.title}</span>
              {host && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                  {host.name || host.host}
                </span>
              )}
            </div>
          </div>
        </CardTitle>
        {onRemove && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRemove} 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-1 min-h-0 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-b-xl">
        <div className="h-full w-full overflow-auto">
          {renderWidgetContent()}
        </div>
      </CardContent>
    </Card>
  );
}