'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logOut, selectIsAuthenticated } from '@/lib/features/auth/authSlice';
import { navItems } from './navItems';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type AppHeaderProps = {
  onOpenSidebar: () => void;
  isEditorPage?: boolean;
};

export default function AppHeader({ onOpenSidebar, isEditorPage }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const dispatch = useAppDispatch();

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b bg-white/80 backdrop-blur dark:bg-gray-900/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3 md:gap-6">
          {!isEditorPage && (
            <button
              aria-label="Ouvrir le menu"
              className="md:hidden rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onOpenSidebar}
            >
              Menu
            </button>
          )}
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-6 w-6 rounded bg-tech-gradient" />
            <span>SupervIA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  pathname === item.href && 'bg-gray-100 dark:bg-gray-800'
                )}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell />
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="outline" onClick={() => dispatch(logOut())}>Se déconnecter</Button>
          ) : (
            <Button variant="outline" onClick={() => router.push('/login')}>Se connecter</Button>
          )}
        </div>
      </div>
    </header>
  );
}


function NotificationsBell() {
  const [open, setOpen] = useState(false);
  type Notif = { 
    id: string; 
    title: string; 
    time: number; 
    body?: string; 
    read?: boolean;
    type?: string; // Type d'alerte (gauge, multiChart, etc.)
    severity?: string; // Niveau de sévérité
    hostName?: string; // Nom de l'hôte
    metricName?: string; // Nom de la métrique
  };
  const [items, setItems] = useState<Notif[]>([]);
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number; text: string } | null>(null);

  // Charger et normaliser depuis localStorage avec extraction d'informations enrichies
  const load = () => {
    try {
      const raw = localStorage.getItem('supervia.notifications') || '[]';
      const arr = (JSON.parse(raw) as any[]).map((n) => {
        // Extraire le type d'alerte depuis l'ID
        let type = 'unknown';
        let severity = 'info';
        let hostName = '';
        let metricName = '';
        
        if (n.id) {
          if (n.id.includes('-gauge-')) type = 'gauge';
          else if (n.id.includes('-multi-')) type = 'multiChart';
          else if (n.id.includes('-avail-')) type = 'availability';
          else if (n.id.includes('-problems-')) type = 'problems';
          else if (n.id.includes('-single-')) type = 'metricValue';
        }
        
        // Extraire la sévérité depuis le titre
        if (n.title) {
          if (n.title.includes('[CRITIQUE]') || n.title.includes('[CRITICAL]')) severity = 'critical';
          else if (n.title.includes('[ÉLEVÉE]') || n.title.includes('[HIGH]')) severity = 'high';
          else if (n.title.includes('[MOYENNE]') || n.title.includes('[MEDIUM]')) severity = 'medium';
          else if (n.title.includes('[ATTENTION]') || n.title.includes('[WARNING]')) severity = 'warning';
          else if (n.title.includes('[INFO]')) severity = 'info';
        }
        
        // Extraire le nom d'hôte et de métrique depuis le titre ou le body
        if (n.title) {
          const hostMatch = n.title.match(/- ([^-\[\]]+)$/);
          if (hostMatch) hostName = hostMatch[1].trim();
        }
        
        if (n.body) {
          const metricMatch = n.body.match(/Metric: ([^\n]+)/);
          if (metricMatch) metricName = metricMatch[1].trim();
          
          const serieMatch = n.body.match(/Série: ([^\n]+)/);
          if (serieMatch) metricName = serieMatch[1].trim();
          
          const hostBodyMatch = n.body.match(/Host: ([^\n]+)/);
          if (hostBodyMatch && !hostName) hostName = hostBodyMatch[1].trim();
        }
        
        return {
          id: n.id,
          title: n.title,
          time: n.time,
          body: n.body,
          read: !!n.read,
          type,
          severity,
          hostName,
          metricName,
        };
      }) as Notif[];
      setItems(arr.slice(-50).reverse());
    } catch {}
  };

  useEffect(() => { 
    load();
  }, [open]);

  // Charger au montage et réagir aux changements inter‑onglets
  useEffect(() => {
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'supervia.notifications') load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  // Marquer comme lus quand on ouvre le panneau (sans vider)
  const markAllAsRead = () => {
    try {
      const raw = localStorage.getItem('supervia.notifications') || '[]';
      const arr = (JSON.parse(raw) as any[]).map((n) => ({ ...n, read: true }));
      localStorage.setItem('supervia.notifications', JSON.stringify(arr));
    } catch {}
    load();
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) markAllAsRead();
        }}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded border bg-white dark:bg-gray-900 shadow overflow-visible">
          <div className="p-2 text-xs font-medium border-b">Notifications</div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">Aucune notification</div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => {
                  // Déterminer l'icône et la couleur selon le type et la sévérité
                  const getTypeIcon = (type: string) => {
                    switch (type) {
                      case 'gauge': return '🔘';
                      case 'multiChart': return '📊';
                      case 'availability': return '🌐';
                      case 'problems': return '⚠️';
                      case 'metricValue': return '📈';
                      default: return '🔔';
                    }
                  };
                  
                  const getSeverityColor = (severity: string) => {
                    switch (severity) {
                      case 'critical': return 'text-red-600 dark:text-red-400';
                      case 'high': return 'text-orange-600 dark:text-orange-400';
                      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
                      case 'warning': return 'text-amber-600 dark:text-amber-400';
                      case 'info': return 'text-blue-600 dark:text-blue-400';
                      default: return 'text-gray-600 dark:text-gray-400';
                    }
                  };
                  
                  const getSeverityBg = (severity: string) => {
                    switch (severity) {
                      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-l-red-500';
                      case 'high': return 'bg-orange-50 dark:bg-orange-900/20 border-l-orange-500';
                      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500';
                      case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 border-l-amber-500';
                      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500';
                      default: return 'bg-gray-50 dark:bg-gray-900/20 border-l-gray-500';
                    }
                  };
                  
                  return (
                    <li
                      key={n.id}
                      className={`p-3 text-sm relative border-l-2 ${getSeverityBg(n.severity || 'info')} ${n.read ? 'opacity-70' : ''}`}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const x = Math.max(8, rect.left - 340);
                        const y = rect.top + rect.height / 2;
                        setTooltip({ id: n.id, x, y, text: n.body || n.title });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className={`${n.read ? 'text-gray-600 dark:text-gray-400' : 'text-black dark:text-white'}`}>
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-sm">{getTypeIcon(n.type || 'unknown')}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${getSeverityColor(n.severity || 'info')}`}>
                              {n.title}
                            </div>
                            {(n.hostName || n.metricName) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                                {n.hostName && (
                                  <div className="flex items-center gap-1">
                                    <span>🖥️</span>
                                    <span className="truncate">{n.hostName}</span>
                                  </div>
                                )}
                                {n.metricName && (
                                  <div className="flex items-center gap-1">
                                    <span>📊</span>
                                    <span className="truncate">{n.metricName}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                          <span>
                            {new Date(n.time).toLocaleString('fr-FR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {!n.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {tooltip && typeof window !== 'undefined' ? createPortal(
              <div
                role="tooltip"
                className="fixed z-[100] w-80 max-w-[90vw] p-2 rounded border bg-white dark:bg-gray-900 shadow text-xs whitespace-pre-wrap pointer-events-none"
                style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-50%)' }}
              >
                {tooltip.text}
              </div>,
              document.body
            ) : null}
          </div>
          <div className="p-2 flex items-center justify-end gap-2 border-t">
            <button className="text-xs text-blue-600 hover:underline" onClick={() => { markAllAsRead(); }}>Marquer comme lus</button>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => { localStorage.removeItem('supervia.notifications'); setItems([]); }}>Effacer l&apos;historique</button>
          </div>
        </div>
      )}
    </div>
  );
}


