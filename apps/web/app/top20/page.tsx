'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ItemThumb from '@/components/ItemThumb';
import { formatKamas, formatSigned } from '@/lib/format';
import type { RecipeMin } from '@/lib/types';

export default function Top20Page() {
  const [recipes, setRecipes] = useState<RecipeMin[]>([]);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [onlyPositive, setOnlyPositive] = useState(true);

  const userPrices = useStore((s) => s.prices[s.server] ?? {});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [r, p] = await Promise.all([api.recipes(), api.prices()]);
        if (!alive) return;
        setRecipes(r);
        setPrices(p);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const ranked = useMemo(() => {
    const list = recipes.map((r) => {
        let cost = 0;
        for (const ing of r.ingredients)
          cost += (userPrices[ing.id] ?? prices[ing.id] ?? 0) * ing.quantity;
        const revenue = userPrices[r.resultId] ?? prices[r.resultId] ?? 0;
      const profit = revenue - cost;
      return { r, cost, revenue, profit };
    });
    list.sort((a, b) => b.profit - a.profit);
    return (onlyPositive ? list.filter((x) => x.profit > 0) : list).slice(0, 20);
  }, [recipes, prices, userPrices, onlyPositive]);

  if (loading) return <p className="text-muted">Carregando…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl font-semibold">Top 20 Lucrativos</h1>
          <p className="text-sm text-muted">
            Receitas com maior lucro usando preços salvos (ou padrão do DofusDB).
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={onlyPositive}
            onChange={(e) => setOnlyPositive(e.target.checked)}
          />
          Só lucrativos
        </label>
      </div>

      <div className="panel divide-y divide-line">
        {ranked.map((x, i) => (
          <Link
            key={x.r.resultId}
            href={`/receitas/${x.r.resultId}`}
            className="flex items-center gap-3 p-3 hover:bg-panel2"
          >
            <span className="w-6 text-center font-semibold text-gold">{i + 1}</span>
            <ItemThumb src={x.r.resultImg} alt={x.r.resultName ?? ''} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{x.r.resultName}</div>
              <div className="text-xs text-muted">
                {x.r.jobName} · custo {formatKamas(x.cost)} K
              </div>
            </div>
            <div
              className={`text-right font-semibold ${
                x.profit >= 0 ? 'text-ok' : 'text-danger'
              }`}
            >
              {formatSigned(x.profit)} K
            </div>
          </Link>
        ))}
        {ranked.length === 0 && (
          <p className="p-4 text-center text-muted">
            Nenhuma receita lucrativa com os preços atuais.
          </p>
        )}
      </div>
    </div>
  );
}
