'use client';

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode; // e.g. <Button>Actualiser</Button>
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-6 border rounded-lg bg-card ${className || ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 text-primary">
        {icon || <Inbox className="h-8 w-8" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-prose">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}


