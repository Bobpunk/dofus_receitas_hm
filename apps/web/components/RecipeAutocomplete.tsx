'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import ItemThumb from './ItemThumb';
import type { RecipeMin } from '@/lib/types';

export default function RecipeAutocomplete({
  initial = '',
  autoFocus = false,
  searchHref = '/receitas',
}: {
  initial?: string;
  autoFocus?: boolean;
  searchHref?: string;
}) {
  const router = useRouter();
  const addWorkbench = useStore((s) => s.addWorkbench);
  const pushRecent = useStore((s) => s.pushRecent);
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<RecipeMin[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.searchRecipes(term, 8);
        setResults(r);
      } catch {
        setResults([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(id: number) {
    setOpen(false);
    router.push(`/receitas/${id}`);
  }

  function add(id: number) {
    addWorkbench(id, 1);
    pushRecent(id);
    setOpen(false);
  }

  function submitAll(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      setOpen(false);
      router.push(`${searchHref}?q=${encodeURIComponent(q.trim())}`);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      go(results[active].resultId);
    }
  }

  return (
    <div className="relative z-50" ref={boxRef}>
      <form onSubmit={submitAll} className="flex gap-2" onKeyDown={onKey}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
          }}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Buscar receita (ex.: chapéu de papatudo)"
          className="input"
          autoFocus={autoFocus}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-gold">
          Buscar
        </button>
      </form>

      {open && results.length > 0 && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-panel">
          {results.map((r, i) => (
            <div
              key={r.resultId}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 border-b border-line/60 p-3 last:border-0 ${
                i === active ? 'bg-panel2' : ''
              }`}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  if (!e.shiftKey) go(r.resultId);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ItemThumb
                  src={r.resultImg}
                  alt={r.resultName ?? ''}
                  copyName={r.resultName}
                />
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.resultName}</div>
                  <div className="text-xs text-muted">
                    {r.jobName} · nível {r.resultLevel}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(r.resultId);
                }}
                className="btn btn-gold shrink-0 px-3 py-1.5 text-xs"
              >
                Adicionar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
