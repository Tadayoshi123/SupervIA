'use client';

import PublicHeader from './PublicHeader';
import { Toaster, ToastBar } from 'react-hot-toast';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <a href="#main" className="skip-link">Aller au contenu principal</a>
      <PublicHeader />
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 80, right: 16 }}
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
      <main id="main" tabIndex={-1} className="w-full">
        {children}
      </main>
    </div>
  );
}
