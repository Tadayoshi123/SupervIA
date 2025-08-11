'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated } from '@/lib/features/auth/authSlice';
import { navItems } from './navItems';

type AppHeaderProps = {
  onOpenSidebar: () => void;
};

export default function AppHeader({ onOpenSidebar }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <header className="sticky top-0 z-40 w-full h-14 border-b bg-white/80 backdrop-blur dark:bg-gray-900/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3 md:gap-6">
          <button
            aria-label="Ouvrir le menu"
            className="md:hidden rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onOpenSidebar}
          >
            Menu
          </button>
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
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="default" onClick={() => router.push('/dashboard')}>Ouvrir</Button>
          ) : (
            <Button variant="outline" onClick={() => router.push('/login')}>Se connecter</Button>
          )}
        </div>
      </div>
    </header>
  );
}


