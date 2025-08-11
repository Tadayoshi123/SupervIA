'use client';

export type NavItem = {
  href: string;
  label: string;
};

export const navItems: NavItem[] = [
  { href: '/', label: 'Accueil' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/hosts', label: 'Hôtes' },
  { href: '/dashboard-editor', label: 'Éditeur' },
  { href: '/dashboards', label: 'Mes dashboards' },
];


