import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100',
        className
      )}
      {...props}
    />
  );
}
