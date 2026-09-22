'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ItemThumb from '@/components/ItemThumb';
import RecipeAutocomplete from '@/components/RecipeAutocomplete';
import { formatKamas, formatSigned, formatCompact, formatSignedCompact, formatRelDays } from '@/lib/format';
import { loadCharacteristics, loadRunes } from '@/lib/runes';
import type { ItemMin, RecipeMin } from '@/lib/types';

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<p className="text-muted">Carregando…</p>}>
      <WorkbenchInner />
    </Suspense>
  );
}

function WorkbenchInner() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';

  const workbench = useStore((s) => s.workbench[s.server] ?? []);
  const prices = useStore((s) => s.prices[s.server] ?? {});
  const priceUpdatedAt = useStore((s) => (s as any).priceUpdatedAt?.[s.server] ?? {});
  const stock = useStore((s) => s.stock[s.server] ?? {});
  const setStock = useStore((s) => s.setStock);
  const setPrice = useStore((s) => s.setPrice);
  const updateQty = useStore((s) => s.updateWorkbenchQty);
  const remove = useStore((s) => s.removeWorkbench);
  const clear = useStore((s) => s.clearWorkbench);
  const addSale = useStore((s) => s.addSale);
  const addWorkbench = useStore((s) => s.addWorkbench);
  const pushRecent = useStore((s) => s.pushRecent);
  const addExtractor = useStore((s) => s.addExtractor);
  const extractor = useStore((s) => s.extractor[s.server] ?? []);

  const [recipes, setRecipes] = useState<Record<number, RecipeMin>>({});
  const [items, setItems] = useState<Record<number, ItemMin>>({});
  const [results, setResults] = useState<RecipeMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [chars, setChars] = useState<Record<number, string>>({});
  const [runeMap, setRuneMap] = useState<Record<number, { id: number; name: string; img: string | null }>>({});

  async function runSearch(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await api.searchRecipes(query, 100);
      setResults(r);
      setRan(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.get('q')) runSearch(params.get('q')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCharacteristics().then(setChars).catch(() => {});
    loadRunes().then(setRuneMap).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (workbench.length === 0) return;
      const recs = await Promise.all(
        workbench.map((w) => api.getRecipe(w.resultId).catch(() => null))
      );
      const recMap: Record<number, RecipeMin> = {};
      const ids = new Set<number>();
      recs.forEach((r, i) => {
        if (r) {
          recMap[workbench[i].resultId] = r;
          r.ingredients.forEach((ing) => ids.add(ing.id));
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
  }, [workbench]);

  const consolidated = useMemo(() => {
    const map = new Map<number, { id: number; qty: number }>();
    for (const w of workbench) {
      const r = recipes[w.resultId];
      if (!r) continue;
      for (const ing of r.ingredients) {
        const cur = map.get(ing.id) ?? { id: ing.id, qty: 0 };
        cur.qty += ing.quantity * w.qty;
        map.set(ing.id, cur);
      }
    }
    return [...map.values()];
  }, [workbench, recipes]);

  const consolidatedView = useMemo(() => {
    return consolidated
      .map((c) => {
        const have = stock[c.id] ?? 0;
        const done = have >= c.qty && c.qty > 0;
        const unit = prices[c.id] ?? items[c.id]?.price ?? 0;
        const buy = Math.max(0, c.qty - have);
        const lineCost = unit * buy;
        return { ...c, have, done, unit, buy, lineCost };
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.lineCost - a.lineCost;
      });
  }, [consolidated, stock, prices, items]);

  const totals = useMemo(() => {
    let cost = 0;
    for (const c of consolidated) {
      const price = prices[c.id] ?? items[c.id]?.price ?? 0;
      const buy = Math.max(0, c.qty - (stock[c.id] ?? 0));
      cost += price * buy;
    }
    let revenue = 0;
    for (const w of workbench) {
      const r = recipes[w.resultId];
      if (!r) continue;
      const price = prices[r.resultId] ?? items[r.resultId]?.price ?? 0;
      revenue += price * w.qty;
    }
    return { cost, revenue, profit: revenue - cost };
  }, [consolidated, workbench, recipes, items, prices, stock]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-semibold">Bancada</h1>
        <p className="text-sm text-muted">
          Busque receitas, adicione à fila e calcule o lucro da produção.
        </p>
        <p className="mt-1 text-xs text-gold/80">
          Dica: Shift+Click no ícone de um item copia o nome (útil para colar no Dofus).
        </p>
      </div>

      <RecipeAutocomplete initial={q} autoFocus searchHref="/workbench" />

      {ran && results.length === 0 && !loading && (
        <p className="text-muted">Nenhuma receita encontrada para “{q}”.</p>
      )}

      {results.length > 0 && (
        <div className="panel p-5">
          <h2 className="display mb-3 text-lg font-semibold">
            Resultados ({results.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <div
                key={r.resultId}
                className="flex items-center gap-3 rounded-xl border border-line bg-bg2/40 p-3"
              >
                <Link href={`/receitas/${r.resultId}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <ItemThumb
                    src={r.resultImg}
                    alt={r.resultName ?? ''}
                    size={48}
                    copyName={r.resultName}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium hover:text-gold">
                      {r.resultName}
                    </div>
                    <div className="text-xs text-muted">
                      {r.jobName} · nível {r.resultLevel} · {r.ingredients.length} ingredientes
                    </div>
                  </div>
                </Link>
                <button
                  className="btn btn-gold px-3 py-1.5 text-xs"
                  onClick={() => {
                    addWorkbench(r.resultId, 1);
                    pushRecent(r.resultId);
                  }}
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {workbench.length === 0 ? (
        <div className="panel p-8 text-center text-muted">
          Sua fila está vazia. Use a busca acima para encontrar uma receita e
          clique em <span className="text-gold">Adicionar</span>.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display text-lg font-semibold">Fila de produção</h2>
            <div className="flex gap-2">
              <button
                className="btn btn-gold"
                onClick={() => workbench.forEach((w) => addSale(w.resultId, w.qty))}
              >
                Colocar tudo à venda
              </button>
              <button className="btn btn-ghost" onClick={clear}>
                Esvaziar
              </button>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="display mb-3 text-sm font-semibold text-muted">
              Itens na fila
            </h3>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {workbench.map((w) => {
                  const r = recipes[w.resultId];
                  if (!r) return null;
                  const saleUnit =
                    prices[r.resultId] ?? items[r.resultId]?.price ?? 0;
                  let cost = 0;
                  for (const ing of r.ingredients) {
                    const p = prices[ing.id] ?? items[ing.id]?.price ?? 0;
                    cost += p * ing.quantity;
                  }
                  cost *= w.qty;
                  const venda = saleUnit * w.qty;
                  const lucro = venda - cost;
                  const margem = cost > 0 ? (lucro / cost) * 100 : 0;

                  const extEntry = extractor.find((e) => e.id === r.resultId) as any;
                  let extractionValue = 0;
                  let runeCount = 0;
                  if (extEntry) {
                    const extItemQty = extEntry.itemQty ?? 1;
                    const costPerItem = w.qty ? cost / w.qty : 0;
                    const extTotalCost = costPerItem * extItemQty;
                    let extTotalRuneValue = 0;
                    if (extEntry.valorRunas != null && extEntry.valorRunas !== 0) {
                      extTotalRuneValue = extEntry.valorRunas;
                    } else if (extEntry.runeQty && Object.keys(extEntry.runeQty).length > 0) {
                      extTotalRuneValue = Object.entries(extEntry.runeQty).reduce((acc, [c, qty]) => {
                        const rid = runeMap[Number(c)]?.id;
                        const p = rid != null ? (prices[rid] ?? 0) : 0;
                        return acc + p * (qty as number);
                      }, 0);
                    } else {
                      const tmpItem = items[r.resultId];
                      if (tmpItem?.effects) {
                        const tmpEff = tmpItem.effects.filter((e) => e.c != null && e.c !== -1);
                        const withRunes = tmpEff.filter((e) => {
                          if (Object.keys(runeMap).length === 0) return true;
                          return runeMap[e.c!] != null;
                        });
                        const eff = withRunes.length > 0 ? withRunes : tmpEff;
                        if (eff.length > 0) {
                          const sum = eff.reduce((a, e) => {
                            const rid = runeMap[e.c!]?.id;
                            const p = rid != null ? (prices[rid] ?? 0) : 0;
                            return a + p;
                          }, 0);
                          extTotalRuneValue = eff.length ? (sum / eff.length) * extItemQty : 0;
                        }
                      }
                    }
                    const extTotalProfit = extTotalRuneValue - extTotalCost;
                    const perItemRuneValue = extItemQty ? extTotalRuneValue / extItemQty : 0;
                    extractionValue = perItemRuneValue * w.qty;
                    const perItemRuneQty = extEntry.runeQty ? Object.keys(extEntry.runeQty).length : 0;
                    runeCount = perItemRuneQty || (items[r.resultId]?.effects?.filter((e) => e.c != null && e.c !== -1).length ?? 0);
                  } else {
                    const itemForRunes = items[r.resultId];
                    if (itemForRunes?.effects) {
                      const runeEffects = itemForRunes.effects.filter((e) => e.c != null && e.c !== -1);
                      if (runeEffects.length > 0) {
                        const withRunes = runeEffects.filter((e) => {
                          if (Object.keys(runeMap).length === 0) return true;
                          return runeMap[e.c!] != null;
                        });
                        const effective = withRunes.length > 0 ? withRunes : runeEffects;
                        const sum = effective.reduce((acc, e) => {
                          const rid = runeMap[e.c!]?.id;
                          const p = rid != null ? (prices[rid] ?? 0) : 0;
                          return acc + p;
                        }, 0);
                        extractionValue = effective.length ? (sum / effective.length) * w.qty : 0;
                        runeCount = effective.length;
                      }
                    }
                  }
                  const extractionProfit = extractionValue - cost;
                  const extractionMargem = cost > 0 ? (extractionProfit / cost) * 100 : 0;
                  return (
                    <div
                      key={w.resultId}
                      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-bg2/40 p-2 text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <ItemThumb
                          src={r.resultImg}
                          alt={r.resultName ?? ''}
                          copyName={r.resultName}
                          size={20}
                        />
                        <Link
                          href={`/receitas/${w.resultId}`}
                          title={r.resultName ?? ''}
                          className="min-w-0 flex-1 truncate font-medium hover:text-gold"
                        >
                          {r.resultName}
                        </Link>
                        <button
                          className="shrink-0 text-muted hover:text-danger"
                          onClick={() => remove(w.resultId)}
                          aria-label="Remover"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-1 flex items-center gap-1">
                        <label className="flex items-center gap-0.5 text-[10px] text-muted">
                          Qtd
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={w.qty}
                            onChange={(e) =>
                              updateQty(
                                w.resultId,
                                Math.max(1, Number(e.target.value) || 1)
                              )
                            }
                            className="input w-16 py-0.5 text-xs"
                          />
                        </label>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            className="btn btn-ghost px-1.5 py-0.5 text-[10px]"
                            onClick={() => addSale(w.resultId, w.qty)}
                          >
                            Vender
                          </button>
                          <span className="text-[10px] text-muted">|</span>
                          <button
                            className="btn btn-ghost px-1.5 py-0.5 text-[10px]"
                            onClick={() => addExtractor(w.resultId, 0, 0)}
                          >
                            Extrair
                          </button>
                        </div>
                      </div>

                      <label className="mt-1 block">
                        <span className="label text-[10px]">Venda</span>
                        <input
                          type="number"
                          min={0}
                          value={saleUnit}
                          onChange={(e) =>
                            setPrice(r.resultId, Number(e.target.value) || 0)
                          }
                          className="input w-full py-0.5 text-xs"
                        />
                      </label>

                      <div className="mt-1 grid grid-cols-3 gap-1 text-center">
                        <div className="min-w-0">
                          <div className="label text-[9px] leading-none">Custo</div>
                          <div className="truncate text-[11px] font-medium" title={`${formatKamas(cost)} K`}>
                            {formatCompact(cost)} K
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="label text-[9px] leading-none">Lucro</div>
                          <div
                            className={`truncate text-[11px] font-semibold ${lucro >= 0 ? 'text-ok' : 'text-danger'}`}
                            title="Venda"
                          >
                            {formatSignedCompact(lucro)} K
                          </div>
                          <div
                            className={`truncate text-[11px] font-semibold ${extractionProfit >= 0 ? 'text-ok' : 'text-danger'}`}
                            title="Extração"
                          >
                            {formatSignedCompact(extractionProfit)} K
                          </div>
                          <div className="label text-[7px] leading-none">venda / extração</div>
                        </div>
                        <div className="min-w-0">
                          <div className="label text-[9px] leading-none">Margem</div>
                          <div
                            className={`truncate text-[11px] font-semibold ${margem >= 0 ? 'text-ok' : 'text-danger'}`}
                            title="Venda"
                          >
                            {margem >= 0 ? '+' : ''}
                            {margem.toFixed(0)}%
                          </div>
                          <div
                            className={`truncate text-[11px] font-semibold ${extractionMargem >= 0 ? 'text-ok' : 'text-danger'}`}
                            title="Extração"
                          >
                            {extractionMargem >= 0 ? '+' : ''}
                            {extractionMargem.toFixed(0)}%
                          </div>
                          <div className="label text-[7px] leading-none">venda / extração</div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                <span className="text-muted">
                  Custo total{' '}
                  <b className="text-ink">{formatKamas(totals.cost)} K</b>
                </span>
                <span className="text-muted">
                  Receita total{' '}
                  <b className="text-ink">{formatKamas(totals.revenue)} K</b>
                </span>
                <span className="text-muted">
                  Lucro{' '}
                  <b className={totals.profit >= 0 ? 'text-ok' : 'text-danger'}>
                    {formatSigned(totals.profit)} K
                  </b>
                </span>
              </div>
            </div>

          <div className="panel p-5">
            <h3 className="display mb-3 text-sm font-semibold text-muted">
              Materiais consolidados ({consolidatedView.length})
            </h3>
            <div className="grid gap-2 grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-12">
              {consolidatedView.map((c) => {
                const it = items[c.id];
                const unit = prices[c.id] ?? it?.price ?? 0;
                const have = c.have;
                const buy = Math.max(0, c.qty - have);
                const name = it?.name?.pt ?? `#${c.id}`;
                return (
                  <div
                    key={c.id}
                    className={`flex min-w-0 flex-col items-center overflow-hidden rounded-lg border border-line bg-bg2/40 p-2 text-xs ${
                      c.done ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <ItemThumb
                        src={it?.img}
                        alt={name}
                        copyName={name}
                        size={28}
                      />
                      {c.done && (
                        <span className="shrink-0 text-[10px] text-ok">✓</span>
                      )}
                    </div>

                    <div className="mt-1 flex w-full items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={have}
                        onChange={(e) =>
                          setStock(c.id, Number(e.target.value) || 0)
                        }
                        className="input w-full py-0.5 text-xs"
                        aria-label="Tenho"
                        title={`Tenho (necessário: ${c.qty})`}
                      />
                      <span className="whitespace-nowrap text-[10px] text-muted">
                        /+{buy}
                      </span>
                    </div>

                    <label className="mt-1 block w-full">
                      <span className="label flex items-center justify-between text-[10px]">
                        <span>Preço</span>
                        {priceUpdatedAt[c.id] ? (
                          <span
                            className="text-[10px] font-medium normal-case tracking-normal text-gold/70"
                            title={new Date(priceUpdatedAt[c.id]).toLocaleString('pt-BR')}
                          >
                            {formatRelDays(priceUpdatedAt[c.id])}
                          </span>
                        ) : (
                          <span className="text-[9px] font-normal normal-case tracking-normal text-muted">—</span>
                        )}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={unit}
                        onChange={(e) =>
                          setPrice(c.id, Number(e.target.value) || 0)
                        }
                        className="input w-full py-0.5 text-xs"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => consolidatedView.forEach((c) => setStock(c.id, 0))}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                Zerar recursos
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
