'use client';

import { usePathname } from 'next/navigation';
import PublicLayout from './PublicLayout';
import AppLayout from './AppLayout';

// Pages publiques qui ne nécessitent pas d'authentification
const publicRoutes = ['/', '/login', '/register', '/auth/callback'];

// Pages qui nécessitent une authentification
const protectedRoutes = ['/dashboard', '/hosts', '/dashboard-editor', '/dashboards'];

export default function ClientAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Détermine si c'est une page publique
  const isPublicPage = publicRoutes.includes(pathname) || 
                       pathname.startsWith('/auth/');
  
  // Détermine si c'est une page protégée
  const isProtectedPage = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Pour les pages publiques, utilise le layout public
  if (isPublicPage) {
    return <PublicLayout>{children}</PublicLayout>;
  }
  
  // Pour les pages protégées, utilise le layout applicatif avec protection
  if (isProtectedPage) {
    return <AppLayout requireAuth={true}>{children}</AppLayout>;
  }
  
  // Par défaut, utilise le layout applicatif sans protection stricte
  return <AppLayout requireAuth={false}>{children}</AppLayout>;
}


