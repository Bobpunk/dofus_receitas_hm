'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import RecipeAutocomplete from '@/components/RecipeAutocomplete';

const FEATURES = [
  {
    href: '/workbench',
    title: 'Calculadora de Receitas',
    desc: 'Busque qualquer item, informe os preços e veja custo, receita e lucro na hora.',
  },
  {
    href: '/workbench',
    title: 'Bancada de Produção',
    desc: 'Empilhe itens numa fila e consolide todos os materiais e o lucro total.',
  },
  {
    href: '/runas',
    title: 'Calculadora de Runas',
    desc: 'Compare criar runas de nível 3 a partir de nível 1 vs comprar nível 2.',
  },
  {
    href: '/top20',
    title: 'Top 20 Lucrativos',
    desc: 'Ranqueie automaticamente as receitas mais rentáveis pelos preços salvos.',
  },
  {
    href: '/vendas',
    title: 'Vendas',
    desc: 'Coloque itens produzidos à venda e acompanhe o valor até removê-los.',
  },
];

export default function Home() {
  const recent = useStore((s) => s.recent[s.server] ?? []);

  return (
    <div className="space-y-10">
      <section className="panel relative z-10 p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 overflow-hidden rounded-full bg-gold/10 blur-3xl" />
        <span className="tag-gold">Dados do DofusDB</span>
        <h1 className="display mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Artesanato com <span className="text-gold">lucro</span> calculado
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Encontre receitas do Dofus, calcule custo e lucro com preços de mercado
          e monte sua fila de produção. Tudo offline-friendly, com os dados que
          extraímos da API.
        </p>

        <div className="mt-6 max-w-xl">
          <RecipeAutocomplete autoFocus searchHref="/workbench" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="panel group p-5 hover:border-gold/50">
            <h3 className="display text-lg font-semibold group-hover:text-gold">
              {f.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{f.desc}</p>
          </Link>
        ))}
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="display mb-3 text-xl font-semibold">Vistos recentemente</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((id) => (
              <Link
                key={id}
                href={`/receitas/${id}`}
                className="chip hover:border-gold/50"
              >
                Receita #{id}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
