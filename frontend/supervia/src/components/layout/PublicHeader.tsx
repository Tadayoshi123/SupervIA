'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated } from '@/lib/features/auth/authSlice';

const publicNavItems = [
  { href: '/', label: 'Accueil' },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b bg-white/95 backdrop-blur dark:bg-gray-900/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-tech-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-tech-gradient">SupervIA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  pathname === item.href && 'bg-gray-100 dark:bg-gray-800'
                )}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm" className="bg-tech-gradient text-white hover:opacity-90">
                Accéder au tableau de bord
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Se connecter
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-tech-gradient text-white hover:opacity-90">
                  S'inscrire
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
