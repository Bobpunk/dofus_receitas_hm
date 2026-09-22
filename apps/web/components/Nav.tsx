'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/workbench', label: 'Bancada' },
  { href: '/vendas', label: 'Vendas' },
  { href: '/runas', label: 'Runas' },
  { href: '/extrator-runas', label: 'Extrator' },
  { href: '/analise-extrator', label: 'Análise' },
  { href: '/drops', label: 'Drops' },
  { href: '/top20', label: 'Top 20' },
];

export default function Nav() {
  const pathname = usePathname();
  const server = useStore((s) => s.server);
  const servers = useStore((s) => s.servers);
  const setServer = useStore((s) => s.setServer);

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg2/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold2 to-gold text-lg font-black text-[#2a2010] shadow-glow">
            D
          </span>
          <span className="display text-lg font-semibold leading-none">
            Dofus<span className="text-gold">Receitas</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? 'bg-panel2 text-ink'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="label hidden sm:inline">Servidor</span>
          <select
            value={server}
            onChange={(e) => setServer(e.target.value)}
            className="input w-auto py-1.5 text-sm"
            aria-label="Servidor"
          >
            {servers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {LINKS.map((l) => {
          const active =
            l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                active ? 'bg-panel2 text-ink' : 'text-muted'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
