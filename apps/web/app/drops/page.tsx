'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ItemThumb from '@/components/ItemThumb';
import { PriceField } from '@/components/PriceField';
import { formatKamas } from '@/lib/format';
import { itemName, type DropSource, type ItemMin } from '@/lib/types';

interface DropRow {
  id: number;
  price: number;
  sources: DropSource[];
  best: DropSource | null;
  expQty100: number;
  expEco100: number;
}

function fmtPct(p: number): string {
  if (p >= 10) return `${p.toFixed(p % 1 === 0 ? 0 : 1)}%`;
  if (p >= 1) return `${p.toFixed(1)}%`;
  return `${p.toFixed(2)}%`;
}

export default function DropsPage() {
  const server = useStore((s) => s.server);
  const userPrices = useStore((s) => s.prices[s.server] ?? {});

  const [drops, setDrops] = useState<Record<number, DropSource[]> | null>(null);
  const [items, setItems] = useState<Record<number, ItemMin>>({});
  const [recipeIds, setRecipeIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [minDrop, setMinDrop] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [searchHits, setSearchHits] = useState<ItemMin[]>([]);

  const pricedIds = useMemo(
    () =>
      Object.entries(userPrices)
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k]) => Number(k))
        .filter((n) => Number.isFinite(n)),
    [userPrices]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [d, ids] = await Promise.all([api.drops(), api.recipeIds().catch(() => [] as number[])]);
        if (!alive) return;
        setDrops(d);
        setRecipeIds(new Set(ids ?? []));
      } catch {
        if (alive) setDrops({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearchHits(await api.searchItems(term, 20));
      } catch {
        setSearchHits([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (pricedIds.length === 0) {
        setItems({});
        return;
      }
      const chunks: number[][] = [];
      for (let i = 0; i < pricedIds.length; i += 200) chunks.push(pricedIds.slice(i, i + 200));
      try {
        const parts = await Promise.all(chunks.map((c) => api.byIds(c).catch(() => [] as ItemMin[])));
        if (!alive) return;
        const map: Record<number, ItemMin> = {};
        for (const it of parts.flat()) map[it.id] = it;
        setItems(map);
      } catch {
        if (alive) setItems({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [pricedIds.join(',')]);

  const { rows, noDropCount } = useMemo(() => {
    if (!drops) return { rows: [] as DropRow[], noDropCount: 0 };
    const out: DropRow[] = [];
    let noDrop = 0;
    for (const id of pricedIds) {
      const sources = drops[id] ?? [];
      if (sources.length === 0) {
        noDrop += 1;
        continue;
      }
      const best = sources[0];
      const price = userPrices[id] ?? 0;
      out.push({
        id,
        price,
        sources,
        best,
        expQty100: best.p,
        expEco100: price * best.p,
      });
    }
    out.sort((a, b) => b.expEco100 - a.expEco100);
    return { rows: out, noDropCount: noDrop };
  }, [drops, userPrices]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if ((r.best?.p ?? 0) < minDrop) return false;
      if (!term) return true;
      const it = items[r.id];
      const name = (it ? itemName(it) : `#${r.id}`).toLowerCase();
      return name.includes(term) || (r.best?.n ?? '').toLowerCase().includes(term);
    });
  }, [rows, q, minDrop, items]);

  // Busca no catálogo geral: itens sem preço aparecem com valor 0 para cadastrar
  const searchMap = useMemo(() => {
    const map: Record<number, ItemMin> = {};
    for (const h of searchHits) map[h.id] = h;
    return map;
  }, [searchHits]);

  const displayed = useMemo(() => {
    const term = q.trim();
    if (!term || !drops) return filtered;
    const priced = new Set(rows.map((r) => r.id));
    const extra: DropRow[] = [];
    for (const h of searchHits) {
      if (priced.has(h.id)) continue;
      const sources = drops[h.id] ?? [];
      const best = sources[0] ?? null;
      extra.push({ id: h.id, price: 0, sources, best, expQty100: best?.p ?? 0, expEco100: 0 });
    }
    return [...filtered, ...extra];
  }, [q, drops, filtered, rows, searchHits]);

  const lookup = useMemo(() => ({ ...searchMap, ...items }), [searchMap, items]);

  const visible = showAll ? displayed : displayed.slice(0, 50);

  if (loading) return <p className="text-muted">Carregando drops…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl font-semibold">Drops — onde farmar</h1>
        <p className="text-sm text-muted">
          Cruzamos os itens com preço cadastrado no servidor <b className="text-gold">{server}</b> com a
          taxa de drop dos monstros.
        </p>
        <p className="mt-1 text-xs text-muted">
          Simulação: como se você matasse <b>100 monstros</b> de cada — qtd. esperada = taxa de drop × 100,
          economia esperada = preço × qtd. esperada. Caro com drop baixo pode valer menos que barato com drop alto.
        </p>
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar item ou monstro… (vale para cadastrar: sem preço aparece 0)"
          className="input min-w-[200px] flex-1 py-1.5 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          Drop mín.
          <select
            value={minDrop}
            onChange={(e) => setMinDrop(Number(e.target.value))}
            className="input w-auto py-1.5 text-sm"
          >
            <option value={0}>0%</option>
            <option value={1}>1%</option>
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={50}>50%</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-muted">
          {pricedIds.length} com preço · {rows.length} com drop · {noDropCount} sem drop registrado
        </span>
      </div>

      {displayed.length === 0 ? (
        <div className="panel p-8 text-center text-muted">
          {q.trim() ? (
            <>Nada encontrado para “{q.trim()}”.</>
          ) : (
            <>Nenhum preço cadastrado no servidor <b className="text-gold">{server}</b> ainda. Use a busca acima para achar o item e cadastre o preço (começa em 0).</>
          )}
        </div>
      ) : (
        <div className="panel divide-y divide-line">
          {visible.map((r, i) => {
            const it = lookup[r.id];
            const name = it ? itemName(it) : `#${r.id}`;
            const isOpen = expanded[r.id] ?? false;
            return (
              <div key={r.id} className="p-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm font-semibold text-gold">{i + 1}</span>
                  <ItemThumb src={it?.img} alt={name} copyName={name} />
                  <div className="min-w-0 flex-1">
                    {recipeIds.has(r.id) ? (
                      <Link href={`/receitas/${r.id}`} className="truncate font-medium hover:text-gold">
                        {name}
                      </Link>
                    ) : (
                      <span className="truncate font-medium" title="Recurso — sem receita de craft">
                        {name}
                      </span>
                    )}
                    <div className="truncate text-xs text-muted">
                      {r.best ? (
                        <>
                          {r.best.n}
                          {r.best.lvl != null ? ` · nível ${r.best.lvl}` : ''} · drop {fmtPct(r.best.p)}
                          {r.sources.length > 1 && ` · +${r.sources.length - 1} fontes`}
                        </>
                      ) : (
                        <>sem drop registrado</>
                      )}
                    </div>
                  </div>
                  <div className="hidden w-32 shrink-0 sm:block">
                    <PriceField itemId={r.id} />
                    <div className="mt-1 text-right text-xs text-muted">~{r.expQty100 >= 10 ? r.expQty100.toFixed(1).replace('.', ',') : r.expQty100.toFixed(2).replace('.', ',')} drops / 100 kills</div>
                  </div>
                  <div className="w-28 shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted">econ. /100 kills</div>
                    <div className="font-semibold text-ok">{formatKamas(Math.round(r.expEco100))} K</div>
                  </div>
                  {r.sources.length > 1 && (
                    <button
                      className="btn btn-ghost shrink-0 px-2 py-1 text-xs"
                      onClick={() => setExpanded((p) => ({ ...p, [r.id]: !isOpen }))}
                    >
                      {isOpen ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                <div className="ml-9 mt-2 w-32 sm:hidden">
                  <PriceField itemId={r.id} />
                </div>
                {isOpen && (
                  <div className="ml-9 mt-2 space-y-1">
                    {r.sources.slice(1).map((s) => (
                      <div key={s.m} className="flex items-center justify-between gap-2 text-xs text-muted">
                        <span className="truncate">
                          {s.n}
                          {s.lvl != null ? ` · nível ${s.lvl}` : ''}
                        </span>
                        <span className="shrink-0">
                          {fmtPct(s.p)} · ~{formatKamas(Math.round(r.price * s.p))} K/100 kills
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showAll && displayed.length > 50 && (
        <div className="text-center">
          <button className="btn btn-ghost" onClick={() => setShowAll(true)}>
            Mostrar todos ({displayed.length})
          </button>
        </div>
      )}
    </div>
  );
}
