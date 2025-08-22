'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = React.PropsWithChildren<{ defaultValue: string; className?: string }>;
export function Tabs({ defaultValue, className, children }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  const ctx = useMemo(() => ({ value, setValue }), [value]);
  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>;
}

export function TabsTrigger({ value, className, children }: React.PropsWithChildren<{ value: string; className?: string }>) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      className={`px-2 py-1 text-sm rounded ${active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'} ${className || ''}`}
      data-state={active ? 'active' : 'inactive'}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: React.PropsWithChildren<{ value: string; className?: string }>) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}



