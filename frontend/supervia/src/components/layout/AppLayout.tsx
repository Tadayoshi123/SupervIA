'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { selectIsAuthenticated, setCredentials } from '@/lib/features/auth/authSlice';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import { Toaster, ToastBar } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

interface AppLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AppLayout({ children, requireAuth = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      if (requireAuth) {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    try {
      const decoded: { exp: number } = jwtDecode(token);
      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        localStorage.removeItem('token');
        if (requireAuth) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        }
      } else if (!isAuthenticated) {
        dispatch(setCredentials({ token }));
      }
    } catch (error) {
      localStorage.removeItem('token');
      if (requireAuth) {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isAuthenticated, requireAuth, router, pathname, dispatch]);

  const isEditorPage = pathname.startsWith('/dashboard-editor');

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 bg-tech-gradient rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
            <p className="text-lg text-foreground">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <a href="#main" className="skip-link">Aller au contenu principal</a>
      <AppHeader onOpenSidebar={() => setSidebarOpen(true)} isEditorPage={isEditorPage} />
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 64, right: 16 }}
        toastOptions={{
          duration: 4000,
          className:
            'rounded-lg shadow-lg border text-sm font-medium bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700',
          style: { padding: '10px 12px' },
          success: {
            className: 'border-green-200 dark:border-green-800',
            iconTheme: { primary: '#10b981', secondary: '#ffffff' },
          },
          error: {
            className: 'border-red-200 dark:border-red-800',
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          },
        }}
      >
        {(t) => <ToastBar toast={t} style={{ ...t.style }} />}
      </Toaster>
      <div className="flex h-[calc(100vh-65px)]">
        {!isEditorPage && <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main id="main" tabIndex={-1} className={`flex-1 overflow-y-auto ${isEditorPage ? '' : 'container mx-auto px-4 py-6 pt-4 md:pt-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
