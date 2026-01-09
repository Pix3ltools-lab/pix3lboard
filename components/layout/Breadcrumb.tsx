'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={clsx('flex items-center gap-2 text-sm', className)} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            )}

            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className={clsx(
                'flex items-center gap-2',
                isLast ? 'text-text-primary font-medium' : 'text-text-secondary'
              )}>
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
