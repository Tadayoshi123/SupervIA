'use client';

import { useState } from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

export default function ClientAppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen w-full">
      <a href="#main" className="skip-link">Aller au contenu principal</a>
      <AppHeader onOpenSidebar={() => setSidebarOpen(true)} />
      <div className="flex">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* Laisse de la place à gauche pour la sidebar et ajoute un padding-top pour le header */}
        <main id="main" tabIndex={-1} className="flex-1 container mx-auto px-4 py-6 pt-4 md:pt-6">{children}</main>
      </div>
    </div>
  );
}


