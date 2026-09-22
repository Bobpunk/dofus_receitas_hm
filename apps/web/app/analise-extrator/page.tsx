'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { loadRunes, runeInfo } from '@/lib/runes';
import ItemThumb from '@/components/ItemThumb';
import { formatKamas, formatSignedCompact } from '@/lib/format';
import type { ItemMin, RecipeMin } from '@/lib/types';

const BREAKABLE_LABEL: Record<number, string> = {
  1: 'Amuleto',
  2: 'Arma',
  3: 'Anel',
  4: 'Cinto',
  5: 'Botas',
  7: 'Escudo',
  10: 'Chapéu',
  11: 'Capa',
};

type Row = {
  id: number;
  name: string;
  img: string | null;
  level: number | null;
  typeName: string | null;
  superTypeId: number | null;
  coefMax: number;
  coefAtual: number;
  costPerItem: number;
  itemQty: number;
  totalCost: number;
  runes: { c: number; label: string; img: string | null }[];
  valorRunas: number;
  totalProfit: number;
  margem: number;
};

export default function AnaliseExtratorPage() {
  return (
    <Suspense fallback={<p className="text-muted">Carregando…</p>}>
      <AnaliseInner />
    </Suspense>
  );
}

function AnaliseInner() {
  const extractor = useStore((s) => s.extractor[s.server] ?? []);
  const consulted = useStore((s) => s.consulted[s.server] ?? []);
  const recent = useStore((s) => s.recent[s.server] ?? []);
  const addConsulted = useStore((s) => s.addConsulted);
  const clearConsulted = useStore((s) => s.clearConsulted);
  const clearHistory = useStore((s) => s.clearHistory);
  const extractorHistory = useStore((s) => s.extractorHistory[s.server] ?? {});
  const prices = useStore((s) => s.prices[s.server] ?? {});

  const [itemsById, setItemsById] = useState<Record<number, ItemMin>>({});
  const [recipes, setRecipes] = useState<Record<number, RecipeMin>>({});
  const [runeMap, setRuneMap] = useState<Record<number, { id: number; name: string; img: string | null }>>({});
  const [chars, setChars] = useState<Record<number, string>>({});

  // filtros
  const [runeFilter, setRuneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lvlMin, setLvlMin] = useState<string>('');
  const [lvlMax, setLvlMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<'coefMax' | 'coefAtual' | 'lucro' | 'margem' | 'lvl' | 'custo'>('lucro');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    loadRunes().then(setRuneMap).catch(() => {});
    // chars not needed for runeInfo fallback, but load
    import('@/lib/runes').then((m) => m.loadCharacteristics().then(setChars).catch(() => {}));
  }, []);

  // backfill consulted e history para quem já tinha dados antes
  useEffect(() => {
    if (consulted.length === 0 && (extractor.length > 0 || recent.length > 0)) {
      const ids = new Set([...extractor.map((e) => e.id), ...recent]);
      ids.forEach((id) => addConsulted(id));
    }
    if (Object.keys(extractorHistory).length === 0 && extractor.length > 0) {
      const hist: Record<number, any> = {};
      extractor.forEach((e) => (hist[e.id] = e));
      // @ts-ignore
      const srv = useStore.getState().server; useStore.setState({ extractorHistory: { ...useStore.getState().extractorHistory, [srv]: hist } });
    }
  }, [consulted.length, extractor, recent, addConsulted, extractorHistory]);

  const allIds = useMemo(() => {
    const ids = consulted.length > 0 ? consulted : [...extractor.map((e) => e.id), ...recent];
    return [...new Set(ids)];
  }, [consulted, extractor, recent]);

  // fetch items + recipes for todos os consultados
  useEffect(() => {
    if (allIds.length === 0) return;
    let alive = true;
    (async () => {
      const ids = allIds as number[];
      const gotItems = await api.byIds(ids);
      const imap: Record<number, ItemMin> = {};
      gotItems.forEach((it) => (imap[it.id] = it));
      const recs = await Promise.all(ids.map((id) => api.getRecipe(id).catch(() => null)));
      const rmap: Record<number, RecipeMin> = {};
      const ingIds = new Set<number>();
      recs.forEach((r) => {
        if (r) {
          rmap[r.resultId] = r;
          r.ingredients.forEach((ing) => ingIds.add(ing.id));
        }
      });
      const ingGot = ingIds.size ? await api.byIds([...ingIds]) : [];
      ingGot.forEach((it) => (imap[it.id] = it));
      // rune items for price lookup
      const runeIds = new Set<number>();
      gotItems.forEach((it) => {
        it.effects?.forEach((e) => {
          if (e.c != null && e.c !== -1 && runeMap[e.c!] != null) runeIds.add(runeMap[e.c!]!.id);
        });
      });
      if (runeIds.size) {
        const runeItems = await api.byIds([...runeIds]);
        runeItems.forEach((it) => (imap[it.id] = it));
      }
      if (!alive) return;
      setItemsById(imap);
      setRecipes(rmap);
    })();
    return () => {
      alive = false;
    };
  }, [allIds, runeMap]);

  const rows: Row[] = useMemo(() => {
    return allIds
      .map((id) => {
        const it = itemsById[id];
        if (!it) return null;
        const rec = recipes[id];
        const ext = (extractor.find((e) => e.id === id) ?? (extractorHistory as any)[id]) as any;
        const coefMax = ext?.coefMax ?? 0;
        const coefAtual = ext?.coefAtual ?? 0;
        const itemQty = ext?.itemQty ?? 1;
        let costPerItem = 0;
        if (rec) {
          for (const ing of rec.ingredients) {
            const p = prices[ing.id] ?? itemsById[ing.id]?.price ?? 0;
            costPerItem += p * ing.quantity;
          }
        }
        const totalCost = costPerItem * itemQty;
        const valorRaw = ext?.valorRunas ?? 0;
        let effectiveValor = valorRaw;
        if (effectiveValor === 0 && ext?.runeQty) {
          const rq = ext.runeQty as Record<number, number>;
          effectiveValor = Object.entries(rq).reduce((acc, [c, qty]) => {
            const rid = runeMap[Number(c)]?.id;
            const p = rid != null ? (prices[rid] ?? 0) : 0;
            return acc + p * (qty as number);
          }, 0);
        }
        const totalProfit = effectiveValor - totalCost;
        const margem = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        const runes = (it.effects || [])
          .filter((eff) => eff.c != null && eff.c !== -1)
          .filter((eff) => {
            if (Object.keys(runeMap).length === 0) return true;
            return runeMap[eff.c!] != null;
          })
          .map((eff) => {
            const info = runeInfo(eff.c, runeMap, chars);
            return { c: eff.c!, label: info.name, img: info.img };
          });
        return {
          id: it.id,
          name: it.name?.pt ?? `#${it.id}`,
          img: it.img,
          level: it.level,
          typeName: it.typeName,
          superTypeId: it.superTypeId,
          coefMax,
          coefAtual,
          costPerItem,
          itemQty,
          totalCost,
          runes,
          valorRunas: effectiveValor,
          totalProfit,
          margem,
        } as Row;
      })
      .filter((r): r is Row => r != null);
  }, [allIds, itemsById, recipes, prices, runeMap, chars, extractor, extractorHistory]);

  const runeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.runes.forEach((ru) => set.add(ru.label)));
    return [...set].sort();
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.superTypeId != null) {
        const label = BREAKABLE_LABEL[r.superTypeId] ?? `Tipo ${r.superTypeId}`;
        set.add(label);
      }
    });
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let out = [...rows];
    if (runeFilter !== 'all') out = out.filter((r) => r.runes.some((ru) => ru.label === runeFilter));
    if (typeFilter !== 'all') out = out.filter((r) => (BREAKABLE_LABEL[r.superTypeId as number] ?? `Tipo ${r.superTypeId}`) === typeFilter);
    if (lvlMin !== '') out = out.filter((r) => (r.level ?? 0) >= Number(lvlMin));
    if (lvlMax !== '') out = out.filter((r) => (r.level ?? 0) <= Number(lvlMax));
    out.sort((a, b) => {
      let va: number, vb: number;
      switch (sortBy) {
        case 'coefMax':
          va = a.coefMax;
          vb = b.coefMax;
          break;
        case 'coefAtual':
          va = a.coefAtual;
          vb = b.coefAtual;
          break;
        case 'lucro':
          va = a.totalProfit;
          vb = b.totalProfit;
          break;
        case 'margem':
          va = a.margem;
          vb = b.margem;
          break;
        case 'lvl':
          va = a.level ?? 0;
          vb = b.level ?? 0;
          break;
        case 'custo':
          va = a.totalCost;
          vb = b.totalCost;
          break;
        default:
          va = 0;
          vb = 0;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return out.slice(0, 10);
  }, [rows, runeFilter, typeFilter, lvlMin, lvlMax, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  if (allIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="display text-2xl font-semibold">Análise do Extrator — Top 10</h1>
        <div className="panel p-8 text-center text-muted">
          Nenhum item consultado ainda. Visualize um item, adicione no <span className="text-gold">Extrator</span> ou via <span className="text-gold">Bancada → Extrair</span> — ele entra no histórico e aparece aqui.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl font-semibold">Análise do Extrator — Top 10</h1>
        <p className="text-sm text-muted">
          Filtre por runa, nível e tipo. Clique nos cabeçalhos para ordenar. Mostrando até 10.
        </p>
      </div>

      <div className="panel flex flex-wrap gap-3 p-4">
        <label className="block">
          <span className="label text-xs">Tipo de runa</span>
          <select value={runeFilter} onChange={(e) => setRuneFilter(e.target.value)} className="input w-40 py-1 text-sm">
            <option value="all">Todas</option>
            {runeOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label text-xs">Tipo do item</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-40 py-1 text-sm">
            <option value="all">Todos</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label text-xs">LVL min</span>
          <input type="number" value={lvlMin} onChange={(e) => setLvlMin(e.target.value)} className="input w-20 py-1 text-sm" placeholder="1" />
        </label>
        <label className="block">
          <span className="label text-xs">LVL max</span>
          <input type="number" value={lvlMax} onChange={(e) => setLvlMax(e.target.value)} className="input w-20 py-1 text-sm" placeholder="200" />
        </label>
        <div className="ml-auto flex items-end gap-2">
          <button
            onClick={() => {
              setRuneFilter('all');
              setTypeFilter('all');
              setLvlMin('');
              setLvlMax('');
            }}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            Limpar filtros
          </button>
          <button
            onClick={() => {
              if (confirm('Limpar histórico de consultados?')) clearHistory();
            }}
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            Limpar histórico
          </button>
        </div>
      </div>

      <div className="panel overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-bg2/40 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="cursor-pointer px-2 py-2 text-right" onClick={() => toggleSort('lvl')}>
                LVL {sortBy === 'lvl' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
              <th className="cursor-pointer px-2 py-2 text-right" onClick={() => toggleSort('coefMax')}>
                COEF MAX {sortBy === 'coefMax' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
              <th className="cursor-pointer px-2 py-2 text-right" onClick={() => toggleSort('coefAtual')}>
                COEF ATUAL {sortBy === 'coefAtual' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
              <th className="px-2 py-2 text-left">Runas</th>
              <th className="cursor-pointer px-2 py-2 text-right" onClick={() => toggleSort('custo')}>
                Custo {sortBy === 'custo' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
              <th className="cursor-pointer px-2 py-2 text-right" onClick={() => toggleSort('lucro')}>
                Lucro {sortBy === 'lucro' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
              <th className="cursor-pointer px-2 py-2 text-right" onClick={() => toggleSort('margem')}>
                Margem {sortBy === 'margem' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line/50 last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ItemThumb src={r.img} alt={r.name} size={32} />
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted">{r.typeName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-right">{r.level ?? '—'}</td>
                <td className="px-2 py-2 text-right">{r.coefMax || '—'}</td>
                <td className="px-2 py-2 text-right">{r.coefAtual || '—'}</td>
                <td className="px-2 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.runes.map((ru) => (
                      <span key={ru.c} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel2/60 px-2 py-0.5 text-xs">
                        {ru.img && <img src={ru.img} alt={ru.label} width={16} height={16} className="rounded" />}
                        {ru.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-2 text-right">{formatKamas(r.totalCost)} K</td>
                <td className={`px-2 py-2 text-right font-semibold ${r.totalProfit >= 0 ? 'text-ok' : 'text-danger'}`}>
                  {formatSignedCompact(r.totalProfit)} K
                </td>
                <td className={`px-2 py-2 text-right font-medium ${r.margem >= 0 ? 'text-ok' : 'text-danger'}`}>
                  {r.margem >= 0 ? '+' : ''}
                  {r.margem.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-center text-sm text-muted">Nenhum item com esses filtros no Top 10.</p>}
      </div>

      <p className="text-xs text-muted">
        Lucro = valor obtido com runas − custo total (custo unitário × Qtd fabricada). Dados vêm do Extrator.
      </p>
    </div>
  );
}
