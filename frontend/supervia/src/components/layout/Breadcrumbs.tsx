'use client';

import Link from 'next/link';

export type Crumb = {
  href: string;
  label: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              )}
              {!isLast && <span className="opacity-60" aria-hidden> / </span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


