import React from 'react';

export function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[92px] rounded-xl bg-neutral-900 text-white px-3 py-2 text-right dark:bg-neutral-100 dark:text-neutral-900">
      <div className="text-[10px] font-bold tracking-wider opacity-80">{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}
