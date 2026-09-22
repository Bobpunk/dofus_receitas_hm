'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ItemThumb from '@/components/ItemThumb';
import { PriceField } from '@/components/PriceField';
import { formatKamas, formatRelDays, formatRelDays29 } from '@/lib/format';
import type { ItemMin, RecipeMin } from '@/lib/types';

export default function VendasPage() {
  const sales = useStore((s) => s.sales[s.server] ?? []);
  const prices = useStore((s) => s.prices[s.server] ?? {});
  const priceUpdatedAt = useStore((s) => (s as any).priceUpdatedAt?.[s.server] ?? {});
  const updateQty = useStore((s) => s.updateSaleQty);
  const remove = useStore((s) => s.removeSale);
  const clear = useStore((s) => s.clearSales);
  const addWorkbench = useStore((s) => s.addWorkbench);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [recipes, setRecipes] = useState<Record<number, RecipeMin>>({});
  const [items, setItems] = useState<Record<number, ItemMin>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      if (sales.length === 0) return;
      const recs = await Promise.all(
        sales.map((w) => api.getRecipe(w.resultId).catch(() => null))
      );
      const recMap: Record<number, RecipeMin> = {};
      const ids = new Set<number>();
      recs.forEach((r, i) => {
        if (r) {
          recMap[sales[i].resultId] = r;
          ids.add(r.resultId);
        }
      });
      const got = await api.byIds([...ids]);
      const itemMap: Record<number, ItemMin> = {};
      got.forEach((it) => (itemMap[it.id] = it));
      if (!alive) return;
      setRecipes(recMap);
      setItems(itemMap);
    })();
    return () => {
      alive = false;
    };
  }, [sales]);

  const total = useMemo(() => {
    let t = 0;
    for (const w of sales) {
      const price = prices[w.resultId] ?? items[w.resultId]?.price ?? 0;
      t += price * w.qty;
    }
    return t;
  }, [sales, items, prices]);

  const sortedSales = useMemo(() => {
    const arr = [...sales] as any[];
    arr.sort((a, b) => {
      const ta = (a as any).addedAt ?? 0;
      const tb = (b as any).addedAt ?? 0;
      return sortOrder === 'newest' ? tb - ta : ta - tb;
    });
    return arr;
  }, [sales, sortOrder]);

  if (sales.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="display text-2xl font-semibold">Vendas</h1>
        <div className="panel p-8 text-center text-muted">
          Nenhum item à venda. Use “Vender” na{' '}
          <Link href="/workbench" className="text-gold hover:underline">
            Bancada
          </Link>{' '}
          para listar itens produzidos.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="display text-2xl font-semibold">Vendas</h1>
          <div className="flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="input w-auto py-1 text-xs"
            >
              <option value="newest">Mais novos primeiro</option>
              <option value="oldest">Mais antigos primeiro</option>
            </select>
            <button className="btn btn-ghost" onClick={clear}>
              Limpar vendas
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-gold/80">
          Dica: Shift+Click no ícone copia o nome (útil para colar no Dofus).
        </p>
      </div>

      <div className="panel p-5">
        <div className="space-y-2">
          {sortedSales.map((w) => {
            const r = recipes[w.resultId];
            if (!r) return null;
            const price = prices[w.resultId] ?? items[w.resultId]?.price ?? 0;
            const addedAt = (w as any).addedAt as number | undefined;
            const priceAt = priceUpdatedAt[w.resultId];
            return (
              <div
                key={w.resultId}
                className="flex items-center gap-3 rounded-xl border border-line bg-bg2/40 p-2"
              >
                <ItemThumb
                  src={r.resultImg}
                  alt={r.resultName ?? ''}
                  copyName={r.resultName}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/receitas/${w.resultId}`}
                      className="block truncate font-medium hover:text-gold"
                    >
                      {r.resultName}
                    </Link>
                    <button
                      className="btn btn-gold px-2 py-1 text-xs"
                      onClick={() => addWorkbench(w.resultId, w.qty)}
                      title="Adicionar esta receita à Bancada para refazer"
                    >
                      + Bancada
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{r.jobName}</span>
                    {addedAt ? (
                      <span className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] text-gold/70" title={new Date(addedAt).toLocaleString('pt-BR')}>
                        {formatRelDays29(addedAt)}
                      </span>
                    ) : null}
                    {priceAt ? (
                      <span className="text-[10px] text-muted" title={`Preço atualizado ${new Date(priceAt).toLocaleString('pt-BR')}`}>
                        · preço {formatRelDays29(priceAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={w.qty}
                  onChange={(e) =>
                    updateQty(w.resultId, Math.max(1, Number(e.target.value) || 1))
                  }
                  className="input w-20"
                />
                <div className="w-32">
                  <PriceField itemId={w.resultId} label="Preço venda" />
                </div>
                <div className="w-28 text-right text-sm font-medium">
                  {formatKamas(price * w.qty)} K
                </div>
                <button
                  className="text-muted hover:text-danger"
                  onClick={() => remove(w.resultId)}
                  aria-label="Remover da venda"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel flex items-center justify-between p-5">
        <span className="text-muted">Valor total à venda</span>
        <span className="display text-xl font-semibold text-gold">
          {formatKamas(total)} K
        </span>
      </div>
    </div>
  );
}
