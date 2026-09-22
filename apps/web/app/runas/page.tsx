'use client';

import { useState } from 'react';
import { formatKamas, formatSigned } from '@/lib/format';

export default function RunasPage() {
  const [p1, setP1] = useState<number | ''>('');
  const [p2, setP2] = useState<number | ''>('');
  const [p3, setP3] = useState<number | ''>('');
  const [qty, setQty] = useState<number | ''>(1);

  const n1 = Number(p1) || 0;
  const n2 = Number(p2) || 0;
  const n3 = Number(p3) || 0;
  const q = Math.max(1, Number(qty) || 1);

  // 1 runa nível 3 = 3 nível 2 = 9 nível 1
  const craftFrom1 = q * 9 * n1;
  const craftFrom2 = q * 3 * n2;
  const buyDirect = q * n3;

  const options = [
    { label: 'Criar a partir de nível 1', value: craftFrom1 },
    { label: 'Comprar nível 2 e combinar', value: craftFrom2 },
    { label: 'Comprar nível 3 direto', value: buyDirect },
  ];
  const best = options.reduce((a, b) => (b.value < a.value ? b : a), options[0]);
  const worst = options.reduce((a, b) => (b.value > a.value ? b : a), options[0]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="display text-2xl font-semibold">Calculadora de Runas</h1>
        <p className="text-sm text-muted">
          No Dofus, 3 runas de um nível viram 1 do nível seguinte (3 nível 1 → 1
          nível 2; 9 nível 1 ou 3 nível 2 → 1 nível 3). Compare criar runas de
          nível 3 a partir de nível 1 versus comprar nível 2 e combinar.
        </p>
      </div>

      <div className="panel grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Preço runa nível 1 (K)" value={p1} set={setP1} />
        <Field label="Preço runa nível 2 (K)" value={p2} set={setP2} />
        <Field label="Preço runa nível 3 (K)" value={p3} set={setP3} />
        <Field label="Quantidade de nível 3" value={qty} set={setQty} />
      </div>

      <div className="panel space-y-2 p-5">
        <h2 className="display text-lg font-semibold">Custo para {q} runa(s) nível 3</h2>
        {options.map((o) => (
          <div
            key={o.label}
            className={`flex items-center justify-between rounded-xl border p-3 ${
              o.label === best.label
                ? 'border-ok/50 bg-ok/10'
                : o.label === worst.label
                  ? 'border-danger/40 bg-danger/5'
                  : 'border-line bg-bg2/40'
            }`}
          >
            <span className="text-sm">{o.label}</span>
            <span className="font-semibold">{formatKamas(o.value)} K</span>
          </div>
        ))}
        <div className="mt-2 border-t border-line pt-3 text-sm">
          <span className="text-muted">Melhor opção: </span>
          <span className="font-semibold text-ok">{best.label}</span>
          {worst.value > best.value && (
            <span className="text-muted">
              {' '}
              — economiza {formatKamas(worst.value - best.value)} K vs pior opção
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: number | '';
  set: (v: number | '') => void;
}) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
        className="input"
        placeholder="0"
      />
    </label>
  );
}
