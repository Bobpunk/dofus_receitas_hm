'use client';

import { useStore } from '@/lib/store';

export function PriceField({
  itemId,
  label,
  className = '',
}: {
  itemId: number;
  label?: string;
  className?: string;
}) {
  const value = useStore((s) => s.prices[s.server]?.[itemId]);
  const setPrice = useStore((s) => s.setPrice);

  return (
    <label className={`block ${className}`}>
      {label && <span className="label mb-1 block">{label}</span>}
      <span className="relative block">
        <input
          type="number"
          min={0}
          value={value ?? ''}
          placeholder="0"
          onChange={(e) =>
            setPrice(itemId, e.target.value === '' ? null : Number(e.target.value))
          }
          className="input pr-8 kamas-input"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold">
          K
        </span>
      </span>
    </label>
  );
}
