'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { copyText } from '@/lib/copy';
import { loadCharacteristics, loadRunes, runeInfo } from '@/lib/runes';
import ItemThumb from '@/components/ItemThumb';
import { formatKamas, formatSignedCompact } from '@/lib/format';
import type { ItemMin, RecipeMin } from '@/lib/types';

const BREAKABLE = new Set([1, 2, 3, 4, 5, 7, 10, 11]);

type Card = {
  item: ItemMin;
  coefMax: number;
  coefAtual: number;
  itemQty: number;
  runeQty: Record<number, number>;
};

export default function ExtratorRunasPage() {
  return (
    <Suspense fallback={<p className="text-muted">Carregando…</p>}>
      <ExtratorInner />
    </Suspense>
  );
}

function ExtratorInner() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ItemMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [chars, setChars] = useState<Record<number, string>>({});
  const [runeMap, setRuneMap] = useState<Record<number, { id: number; name: string; img: string | null }>>({});
  const extractor = useStore((s) => s.extractor[s.server] ?? []);
  const addExtractor = useStore((s) => s.addExtractor);
  const removeExtractor = useStore((s) => s.removeExtractor);
  const updateExtractorCoef = useStore((s) => s.updateExtractorCoef);
  const updateExtractorItemQty = useStore((s) => s.updateExtractorItemQty);
  const updateExtractorRuneQty = useStore((s) => s.updateExtractorRuneQty);

  const [recipes, setRecipes] = useState<Record<number, RecipeMin>>({});
  const [itemsById, setItemsById] = useState<Record<number, ItemMin>>({});
  const [extractorItems, setExtractorItems] = useState<Record<number, ItemMin>>({});

  const cards = useMemo(() => {
    return extractor
      .map((e) => {
        const item = extractorItems[e.id] ?? itemsById[e.id];
        if (!item) return null;
        return {
          item,
          coefMax: e.coefMax,
          coefAtual: e.coefAtual,
          itemQty: (e as any).itemQty ?? 1,
          runeQty: (e as any).runeQty ?? {},
        } as Card;
      })
      .filter((c): c is Card => c != null);
  }, [extractor, extractorItems, itemsById]);

  const prices = useStore((s) => s.prices[s.server] ?? {});
  const setPrice = useStore((s) => s.setPrice);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadCharacteristics().then(setChars).catch(() => {});
    loadRunes().then(setRuneMap).catch(() => {});
  }, []);

  useEffect(() => {
    const add = searchParams.get('add');
    if (!add) return;
    const id = Number(add);
    if (!Number.isFinite(id)) return;
    api
      .getItem(id)
      .then((it) => {
        if (!it || !BREAKABLE.has(it.superTypeId as number)) {
          router.replace('/extrator-runas');
          return;
        }
        setExtractorItems((prev) => ({ ...prev, [it.id]: it }));
        addExtractor(id, 0, 0);
        router.replace('/extrator-runas');
      })
      .catch(() => router.replace('/extrator-runas'));
  }, [searchParams, router, addExtractor]);

  // fetch extractor items when missing
  useEffect(() => {
    const missing = extractor.filter((e) => !extractorItems[e.id] && !itemsById[e.id]).map((e) => e.id);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      const got = await api.byIds(missing);
      if (!alive) return;
      const imap: Record<number, ItemMin> = {};
      got.forEach((it) => (imap[it.id] = it));
      setExtractorItems((prev) => ({ ...prev, ...imap }));
    })();
    return () => {
      alive = false;
    };
  }, [extractor, extractorItems, itemsById]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setRan(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.searchItems(term, 30);
        const filtered = r.filter((it) => BREAKABLE.has(it.superTypeId as number));
        setResults(filtered);
        setRan(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // fetch recipes for cards
  useEffect(() => {
    if (cards.length === 0) return;
    let alive = true;
    (async () => {
      const ids = cards.map((c) => c.item.id);
      const recs = await Promise.all(ids.map((id) => api.getRecipe(id).catch(() => null)));
      const recMap: Record<number, RecipeMin> = {};
      const ingIds = new Set<number>();
      recs.forEach((r) => {
        if (r) {
          recMap[r.resultId] = r;
          r.ingredients.forEach((ing) => ingIds.add(ing.id));
        }
      });
      const got = ingIds.size ? await api.byIds([...ingIds]) : [];
      const imap: Record<number, ItemMin> = {};
      got.forEach((it) => (imap[it.id] = it));
      // also add rune items for price lookup
      const runeIds = new Set<number>();
      cards.forEach((c) => {
        c.item.effects?.forEach((e) => {
          if (e.c != null && e.c !== -1 && runeMap[e.c] != null) runeIds.add(runeMap[e.c]!.id);
        });
      });
      if (runeIds.size) {
        const runeItems = await api.byIds([...runeIds]);
        runeItems.forEach((it) => (imap[it.id] = it));
      }
      if (!alive) return;
      setRecipes(recMap);
      setItemsById((prev) => ({ ...prev, ...imap }));
    })();
    return () => {
      alive = false;
    };
  }, [cards, runeMap]);

  function addCard(it: ItemMin) {
    setExtractorItems((prev) => ({ ...prev, [it.id]: it }));
    addExtractor(it.id, 0, 0);
    setQ('');
    setResults([]);
  }

  function removeCard(id: number) {
    removeExtractor(id);
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="tag-gold">Experimental</span>
        <h1 className="display mt-2 text-2xl font-semibold">Extrator de Runas</h1>
        <p className="mt-1 text-sm text-muted">
          Selecione um <b className="text-ink">equipamento</b> quebrável e veja se dá lucro. Coeficiente (max/atual) é manual — quanto maior, maior a chance de runas.
        </p>
        <p className="text-xs text-muted">Apenas equipamentos (amuletos, anéis, armas, cintos, botas, escudos, chapéus, capas) são listados.</p>
      </div>

      <div className="panel p-5">
        <label className="block">
          <span className="label mb-1 block">Buscar equipamento</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: Pequena sacola em lã de paparneiro, Bloptas Cereja"
            className="input"
            autoFocus
          />
        </label>

        {loading && <p className="mt-2 text-sm text-muted">Buscando…</p>}
        {ran && !loading && results.length === 0 && (
          <p className="mt-2 text-sm text-muted">Nenhum equipamento quebrável encontrado para “{q}”.</p>
        )}

        {results.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {results.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => addCard(it)}
                className="flex items-center gap-3 rounded-xl border border-line bg-bg2/40 p-3 text-left hover:border-gold/50"
              >
                <ItemThumb src={it.img} alt={it.name?.pt ?? ''} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.name?.pt ?? `#${it.id}`}</div>
                  <div className="text-xs text-muted">
                    {it.typeName ?? 'Item'} {it.level != null ? `· nível ${it.level}` : ''}
                  </div>
                </div>
                <span className="ml-auto text-xs text-gold">+ Adicionar</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const it = card.item;
            const recipe = recipes[it.id];
            // custo = soma ingredientes * preço (se tem receita) senão 0 (usuário verá 0 e pode editar via preços dos ingredientes)
            let costPerItem = 0;
            if (recipe) {
              for (const ing of recipe.ingredients) {
                const p = prices[ing.id] ?? itemsById[ing.id]?.price ?? 0;
                costPerItem += p * ing.quantity;
              }
            }
            const itemQty = card.itemQty ?? 1;
            const totalCost = costPerItem * itemQty;
            const runes = (it.effects || [])
              .filter((e) => e.c != null && e.c !== -1)
              .filter((e) => {
                if (Object.keys(runeMap).length === 0) return true;
                return runeMap[e.c!] != null;
              })
              .map((e) => {
                const info = runeInfo(e.c, runeMap, chars);
                const runeId = runeMap[e.c!]?.id;
                const runePrice = runeId != null ? (prices[runeId] ?? itemsById[runeId]?.price ?? 0) : 0;
                const qty = card.runeQty?.[e.c!] ?? 0;
                const totalValue = runePrice * qty;
                return {
                  c: e.c!,
                  from: e.from,
                  to: e.to,
                  label: info.name,
                  img: info.img,
                  runeId,
                  runePrice,
                  qty,
                  totalValue,
                };
              });
            const totalRuneValue = runes.reduce((sum, r) => sum + r.totalValue, 0);
            const totalProfit = totalRuneValue - totalCost;
            const totalMargem = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

            return (
              <div key={it.id} className="flex flex-col rounded-xl border border-line bg-bg2/40 p-3">
                <div className="flex items-center gap-2">
                  <ItemThumb src={it.img} alt={it.name?.pt ?? ''} copyName={it.name?.pt} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.name?.pt}</div>
                    <div className="text-xs text-muted">
                      LVL {it.level ?? '—'} · {it.typeName}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCard(it.id)}
                    className="text-muted hover:text-danger"
                    aria-label="Remover"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="label text-[10px]">Coef. MAX</span>
                    <input
                      type="number"
                      value={card.coefMax}
                      onChange={(e) => updateExtractorCoef(it.id, Number(e.target.value) || 0, card.coefAtual)}
                      className="input w-full py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="label text-[10px]">Coef. ATUAL</span>
                    <input
                      type="number"
                      value={card.coefAtual}
                      onChange={(e) => updateExtractorCoef(it.id, card.coefMax, Number(e.target.value) || 0)}
                      className="input w-full py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="label text-[10px]">Qtd fabricada</span>
                    <input
                      type="number"
                      min={1}
                      value={card.itemQty ?? 1}
                      onChange={(e) => updateExtractorItemQty(it.id, Number(e.target.value) || 1)}
                      className="input w-full py-1 text-sm"
                    />
                  </label>
                </div>
                <div className="text-center text-[10px] text-muted">
                  {card.coefMax > 0 ? `${card.coefAtual}/${card.coefMax}` : '—/—'} · quanto maior, maior a chance
                </div>

                <div className="mt-3">
                  <div className="label mb-1 text-[10px]">Runas possíveis</div>
                  {runes.length === 0 ? (
                    <p className="text-xs text-muted">Sem runas mapeadas</p>
                  ) : (
                    <div className="space-y-1.5">
                      {runes.map((r) => (
                        <div
                          key={r.c}
                          className="flex items-center gap-2 rounded-lg border border-line/50 bg-bg2/60 p-2"
                        >
                          {r.img ? (
                            <ItemThumb src={r.img} alt={r.label} size={24} copyName={r.label} />
                          ) : (
                            <span className="h-6 w-6 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{r.label}</div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="Qtd"
                                min={0}
                                value={r.qty || ''}
                                onChange={(e) => updateExtractorRuneQty(it.id, r.c, Number(e.target.value) || 0)}
                                className="input w-12 py-0.5 text-xs"
                              />
                              <span className="text-[10px] text-muted">×</span>
                              <input
                                type="number"
                                placeholder="Preço"
                                value={r.runeId != null ? (prices[r.runeId] ?? '') : ''}
                                onChange={(e) => {
                                  if (r.runeId == null) return;
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  const { setPrice } = useStore.getState();
                                  setPrice(r.runeId!, v);
                                }}
                                className="input w-16 py-0.5 text-xs"
                              />
                              <span className="text-[10px] text-muted">K</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-medium">{formatKamas(r.totalValue)} K</div>
                            <div className="text-[10px] text-muted">
                              {r.qty} × {formatKamas(r.runePrice)} K
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2 text-center">
                  <div>
                    <div className="label text-[9px]">Custo total</div>
                    <div className="text-xs font-medium">{formatKamas(totalCost)} K</div>
                    <div className="text-[10px] text-muted">
                      {card.itemQty} × {formatKamas(costPerItem)} K
                    </div>
                  </div>
                  <div>
                    <div className="label text-[9px]">Runas total</div>
                    <div className="text-xs font-medium">{formatKamas(totalRuneValue)} K</div>
                  </div>
                  <div>
                    <div className={`label text-[9px] ${totalProfit >= 0 ? 'text-ok' : 'text-danger'}`}>Lucro</div>
                    <div className={`text-xs font-semibold ${totalProfit >= 0 ? 'text-ok' : 'text-danger'}`}>
                      {formatSignedCompact(totalProfit)} K
                    </div>
                    <div className={`text-[10px] ${totalMargem >= 0 ? 'text-ok' : 'text-danger'}`}>
                      {totalMargem >= 0 ? '+' : ''}
                      {totalMargem.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
