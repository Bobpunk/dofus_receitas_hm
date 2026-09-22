import './globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'DofusReceitas — Gestão de lucro de artesanato',
  description:
    'Busque receitas do Dofus, calcule custo e lucro com preços de mercado e monte filas de produção. Dados do DofusDB.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Nav />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-line/70 py-6 text-center text-xs text-muted">
          Dados do{' '}
          <a
            className="text-gold hover:underline"
            href="https://dofusdb.fr"
            target="_blank"
            rel="noreferrer"
          >
            DofusDB
          </a>{' '}
          — licença LPNC-IA 1.0. Preços são colaborativos e ficam no seu navegador.
        </footer>
      </body>
    </html>
  );
}
