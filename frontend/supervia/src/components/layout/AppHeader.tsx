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
  type Notif = { id: string; title: string; time: number; body?: string; read?: boolean };
  const [items, setItems] = useState<Notif[]>([]);
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number; text: string } | null>(null);

  // Charger et normaliser depuis localStorage
  const load = () => {
    try {
      const raw = localStorage.getItem('supervia.notifications') || '[]';
      const arr = (JSON.parse(raw) as any[]).map((n) => ({
        id: n.id,
        title: n.title,
        time: n.time,
        body: n.body,
        read: !!n.read,
      })) as Notif[];
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
                {items.map((n) => (
                  <li
                    key={n.id}
                    className="p-2 text-sm relative"
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const x = Math.max(8, rect.left - 340);
                      const y = rect.top + rect.height / 2;
                      setTooltip({ id: n.id, x, y, text: n.body || n.title });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div className="font-medium truncate">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(n.time).toLocaleString()}</div>
                  </li>
                ))}
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
            <button className="text-xs text-blue-600 hover:underline" onClick={() => { localStorage.removeItem('supervia.notifications'); setItems([]); }}>Effacer l'historique</button>
          </div>
        </div>
      )}
    </div>
  );
}


