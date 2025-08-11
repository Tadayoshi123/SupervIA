'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from './navItems';

type AppSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Mobile: panneau slide sous la barre supérieure (56px = h-14)
        // Desktop: colonne sticky qui ne recouvre pas le header
        'fixed left-0 right-auto top-14 bottom-0 z-30 w-64 border-r bg-white/95 backdrop-blur dark:bg-gray-900/95 transition-transform md:translate-x-0 md:sticky md:top-14 md:h-[calc(100vh-56px)] md:self-start md:z-30 md:bg-transparent md:backdrop-blur-0 overflow-y-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      aria-label="Navigation latérale"
    >
      <div className="h-14 flex items-center px-4 border-b md:hidden">
        <button
          aria-label="Fermer le menu"
          className="ml-auto rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
      <nav className="p-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800',
              pathname === item.href && 'bg-gray-100 dark:bg-gray-800'
            )}
            onClick={onClose}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}


