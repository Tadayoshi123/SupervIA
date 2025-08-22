'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Crumb = {
  href: string;
  label: string;
};

interface BreadcrumbsProps {
  items?: Crumb[];
  hideOnPublicPages?: boolean;
}

export default function Breadcrumbs({ items, hideOnPublicPages = true }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Masquer les breadcrumbs sur les pages publiques par défaut
  const publicRoutes = ['/', '/login', '/register'];
  if (hideOnPublicPages && (publicRoutes.includes(pathname) || pathname.startsWith('/auth/'))) {
    return null;
  }

  // Générer automatiquement les breadcrumbs si non fournis
  const breadcrumbs = items || generateAutoBreadcrumbs(pathname);
  
  // Ne pas afficher si moins de 2 éléments ou si on est sur la page d'accueil du dashboard
  if (breadcrumbs.length <= 1 || pathname === '/dashboard') return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'hover:text-foreground transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1 py-0.5'
                )}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Génère automatiquement les breadcrumbs basés sur le pathname
function generateAutoBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Crumb[] = [];
  
  // Toujours commencer par le tableau de bord (sauf pour les pages publiques)
  if (segments.length > 0 && !['login', 'register', 'auth'].includes(segments[0])) {
    breadcrumbs.push({ href: '/dashboard', label: 'Tableau de bord' });
  }
  
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Mapper les segments aux labels appropriés
    let label = segment;
    switch (segment) {
      case 'dashboard':
        label = 'Tableau de bord';
        break;
      case 'dashboard-editor':
        label = 'Éditeur de dashboard';
        break;
      case 'dashboards':
        label = 'Mes dashboards';
        break;
      case 'hosts':
        label = 'Hôtes';
        break;
      default:
        // Pour les IDs dynamiques, utiliser le segment tel quel
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    
    // Ne pas dupliquer le tableau de bord
    if (segment !== 'dashboard' || index > 0) {
      breadcrumbs.push({ href: currentPath, label });
    }
  });
  
  return breadcrumbs;
}


