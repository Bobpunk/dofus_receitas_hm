'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ItemThumb from '@/components/ItemThumb';
import { PriceField } from '@/components/PriceField';
import { formatKamas, formatSigned, pct } from '@/lib/format';
import { copyText } from '@/lib/copy';
import { loadCharacteristics, loadRunes, runeInfo } from '@/lib/runes';
import type { ItemMin, RecipeMin } from '@/lib/types';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const resultId = Number(id);

  const [recipe, setRecipe] = useState<RecipeMin | null>(null);
  const [items, setItems] = useState<Record<number, ItemMin>>({});
  const [yieldQty, setYieldQty] = useState(1);
  const [wbQty, setWbQty] = useState(1);
  const [chars, setChars] = useState<Record<number, string>>({});
  const [runeMap, setRuneMap] = useState<Record<number, { id: number; name: string; img: string | null }>>({});
  const [err, setErr] = useState('');

  const prices = useStore((s) => s.prices[s.server] ?? {});
  const addWorkbench = useStore((s) => s.addWorkbench);
  const pushRecent = useStore((s) => s.pushRecent);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.getRecipe(resultId);
        if (!alive) return;
        if (!r) {
          setErr('Receita não encontrada.');
          return;
        }
        setRecipe(r);
        pushRecent(resultId);
        const ids = [r.resultId, ...r.ingredients.map((i) => i.id)];
        const got = await api.byIds(ids);
        if (!alive) return;
        const map: Record<number, ItemMin> = {};
        for (const it of got) map[it.id] = it;
        setItems(map);
        loadCharacteristics().then(setChars).catch(() => {});
        loadRunes().then(setRuneMap).catch(() => {});
      } catch (e: any) {
        if (alive) setErr(e?.message ?? 'Erro');
      }
    })();
    return () => {
      alive = false;
    };
  }, [resultId, pushRecent]);

  const calc = useMemo(() => {
    if (!recipe) return null;
    let cost = 0;
    const lines = recipe.ingredients.map((ing) => {
      const price = prices[ing.id] ?? items[ing.id]?.price ?? 0;
      const sub = price * ing.quantity;
      cost += sub;
      return { ...ing, price, sub };
    });
    const unitRevenue = prices[recipe.resultId] ?? items[recipe.resultId]?.price ?? 0;
    const revenue = unitRevenue * (yieldQty || 1);
    const profit = revenue - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;
    return { lines, cost, unitRevenue, revenue, profit, margin };
  }, [recipe, items, yieldQty, prices]);

  if (err) return <p className="text-danger">{err}</p>;
  if (!recipe || !calc) return <p className="text-muted">Carregando…</p>;

  return (
    <div className="space-y-6">
      <Link href="/workbench" className="text-sm text-muted hover:text-ink">
        ← Voltar à busca
      </Link>

      <div className="panel flex flex-wrap items-center gap-4 p-5">
        <ItemThumb src={recipe.resultImg} alt={recipe.resultName ?? ''} size={72} />
        <div>
          <h1 className="display text-2xl font-semibold">{recipe.resultName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="tag-accent">{recipe.jobName}</span>
            <span>nível {recipe.resultLevel}</span>
            <span>· {recipe.ingredients.length} ingredientes</span>
          </div>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <label className="block">
            <span className="label mb-1 block">Qtd na bancada</span>
            <input
              type="number"
              min={1}
              value={wbQty}
              onChange={(e) => setWbQty(Math.max(1, Number(e.target.value) || 1))}
              className="input w-20"
            />
          </label>
          <button
            className="btn btn-gold"
            onClick={() => addWorkbench(recipe.resultId, wbQty)}
          >
            + Bancada
          </button>
        </div>
      </div>

      {items[recipe.resultId]?.effects?.length > 0 && (
        <div className="panel p-5">
          <h2 className="display mb-1 text-lg font-semibold">
            Runas ao quebrar
          </h2>
          <p className="mb-3 text-xs text-muted">
            Ao quebrar este item no Magus você recebe uma runa por atributo.
            Shift+Click copia o nome.
          </p>
          <div className="flex flex-wrap gap-2">
            {items[recipe.resultId].effects
              .filter((e) => e.c != null && e.c !== -1)
              .filter((e) => {
                if (Object.keys(runeMap).length === 0) return true;
                return runeMap[e.c!] != null;
              })
              .map((e, i) => {
                const info = runeInfo(e.c, runeMap, chars);
                return (
                  <button
                    key={`${e.c}-${i}`}
                    type="button"
                    title="Shift+Click: copiar nome da runa"
                    onClick={(ev) => ev.shiftKey && copyText(info.name)}
                    className="chip hover:border-gold/50"
                  >
                    {info.img && <ItemThumb src={info.img} alt={info.name} size={20} />}
                    {info.name}
                    {e.from !== e.to ? (
                      <span className="text-muted">
                        {' '}
                        ({e.from}–{e.to})
                      </span>
                    ) : (
                      <span className="text-muted"> {e.from}</span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel p-5">
          <h2 className="display mb-3 text-lg font-semibold">Ingredientes</h2>
          <div className="space-y-2">
            {calc.lines.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-bg2/40 p-2"
              >
                <ItemThumb src={ing.img} alt={ing.name ?? ''} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{ing.name}</div>
                  <div className="text-xs text-muted">
                    {ing.quantity}× · subtotal{' '}
                    <span className="text-ink">{formatKamas(ing.sub)} K</span>
                  </div>
                </div>
                <div className="w-32">
                  <PriceField itemId={ing.id} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="display mb-3 text-lg font-semibold">Calculadora</h2>
            <label className="block">
              <span className="label mb-1 block">Quantidade produzida</span>
              <input
                type="number"
                min={1}
                value={yieldQty}
                onChange={(e) => setYieldQty(Math.max(1, Number(e.target.value) || 1))}
                className="input w-28"
              />
            </label>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Custo total" value={`${formatKamas(calc.cost)} K`} />
              <Row
                label={`Receita (${formatKamas(calc.unitRevenue)} K × ${yieldQty})`}
                value={`${formatKamas(calc.revenue)} K`}
              />
              <div className="my-2 border-t border-line" />
              <Row
                label="Lucro líquido"
                value={`${formatSigned(calc.profit)} K`}
                accent={calc.profit >= 0 ? 'ok' : 'danger'}
                strong
              />
              <Row
                label="Margem"
                value={pct(calc.profit, calc.cost)}
                accent={calc.profit >= 0 ? 'ok' : 'danger'}
              />
            </div>

            <div className="mt-4">
              <span className="label mb-1 block">Preço de venda (item final)</span>
              <PriceField itemId={recipe.resultId} />
            </div>
          </div>

          <p className="text-xs text-muted">
            Preços são salvos neste navegador, por servidor. Use-os em todas as
            páginas para manter seus cálculos consistentes.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: string;
  accent?: 'ok' | 'danger';
  strong?: boolean;
}) {
  const color =
    accent === 'ok' ? 'text-ok' : accent === 'danger' ? 'text-danger' : 'text-ink';
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`${color} ${strong ? 'text-lg font-semibold' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}
