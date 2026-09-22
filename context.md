# Contexto — Dofus Receitas (extrator_dofus)

> Gerado em 2026-08-31 (atualizado sessão de hoje). Monorepo Turborepo (Nest API :3001 + Next Web :3000) reconstruindo o site Flask "Dofus Recipe Manager" a partir de JSON local do DofusDB.

## Objetivo

- Reconstruir o site Flask original (`site/dofus_receitas_hm`) em TypeScript moderno, usando dados extraídos localmente do DofusDB (licença LPNC-IA 1.0: proíbe fetch/store por agentes — o assistente escreve o extrator, **o usuário roda o download**). Atribuição no README + rodapé web.
- Dados via `items.json` (133MB), `recipes.json` (135MB), `jobs.json` + projeção compacta `apps/api/data/*.min.json`.
- Persistência apenas no navegador (`localStorage` via Zustand `dofus-receitas:v1`).
- UI autoral (noite azul + dourado, serif display), não "cara de IA". Paginação da API usa `$limit`/`$skip` (max 50) e exige `?lang=` mas API retorna todas as línguas. Item PT = `pt`.

## Decisões (grill-me)

- **Monorepo:** Turborepo, workspaces `apps/*`, npm 10.5.0.
- **Fonte:** JSON local extraído, não fetch remoto em runtime.
- **Persistência:** browser (localStorage).
- **Escopo:** todas as features originais + UI moderna. Local = raiz do projeto `/home/bob/projetos/extrator_dofus`.
- **Servidores padrão:** `['Hellmina','Tal Kasha','Ombre','Pandora']` (API/Web).
- **python3:** sem pip/venv (PEP 668) — deps via `get-pip.py --target /home/bob/.local/pylibs` + `PYTHONPATH`.
- **Unificação Receitas→Bancada:** `/workbench` vira página única (busca no topo + fila abaixo). Rota `/receitas` redireciona (307) para `/workbench`. Aba no menu: **Bancada**.
- **Busca:** cada resultado ganha botão `Adicionar à bancada`; autocomplete (debounce 220ms, z-50, nav teclado) ganha botão `Adicionar` por sugestão (sem abrir cálculo).
- **Materiais:** não podem recolher (usuário). Resumo virou última linha dentro da Fila.
- **Fila:** 5 por linha (`grid-cols-2 sm:3 lg:5`) em quadrados pequenos; materiais 10 por linha (`grid-cols-3 sm:5 md:7 lg:10 xl:12`) só ícone. `Qtd` na Bancada suporta 4 dígitos (`w-16`, `max=9999`).
- **Extrator:** experimental, só equipamentos quebráveis (superType 1,2,3,4,5,7,10,11). Coeficiente `MAX/ATUAL` manual (default novos itens `0/0`), `Qtd fabricada` + `Qtd runas` e `Preço` por runa, ou `Valor obtido` simplificado — mantido detalhado por ser mais eficaz. Histórico persistido via `extractorHistory`.
- **Análise:** aba própria `/analise-extrator` — Top 10 com filtros `maior cof (max/atual)`, `maior lucro`, `maior margem`, `tipo de runa`, `lvl`, `tipo do item`; ordenação clicável.

## Estado Atual

### Concluído

- **Extractor:** `extract_dofusdb.py` + `README.md` (progresso ao vivo). Validação: "Chapéu do Papatudo" id 2411 → Alfaiate (Chifre de Paparneiro x3 id 383 + Lã do Chefe de Guerra Papatudo x1 id 882).
- **Monorepo scaffold:** `package.json`, `turbo.json`, `tsconfig.base.json`, `.gitignore` (revisado hoje: `/*.json` com `!package.json` etc., `__pycache__/`, `**/dist/`, `**/.next/`, `apps/api/data/*.min.json`).
- **build-data:** `scripts/build-data.mjs` projeta `items.min.json` (8,5MB com `effects` + `superTypeId`), `recipes.min.json` (3,8MB), `jobs.min.json`, `characteristics.min.json` (opcional) e **`runes.min.json` (52 runas mapeadas: `characteristic → {id, name, img}`)**.
- **Nest API:** `DofusModule/Service/Controller` — endpoints `/api/health`, `/api/items/search`, `/api/items/by-ids`, `/api/items/:id` (com `effects`+`superTypeId`), `/api/recipes/*`, `/api/jobs`, `/api/prices`, `/api/characteristics`, **`/api/runes`**. Busca PT accent-insensitive. Carrega `items.min.json` + `runes.min.json` + `characteristics.min.json`. Reiniciado detached corretamente via `setsid`.
- **Next Web:** Tailwind tema custom, `components/Nav.tsx` (links: Início, Bancada, Vendas, Runas, **Extrator**, **Análise**, Top 20; seletor servidor), `ItemThumb.tsx` (`copyName` + `requireCtrl` → `Shift+Click` na Bancada e `Shift+Click` na Vendas — revertido de `Ctrl+Shift`), `PriceField.tsx`, `RecipeAutocomplete.tsx` (`searchHref`, botão Adicionar, guarda Shift).
- **Páginas:** `/` (home `searchHref="/workbench"`), `/workbench` (unificada, busca + fila 5/linha + materiais 10/linha só-ícone, `consolidatedView` ordenada por `lineCost` desc, `Qtd` 4 dígitos, **lucro extração** integrado), `/receitas/[id]` (calculadora reativa + **Runas ao quebrar** com ícone/nome correto via `runes.min.json`), `/receitas` → redirect 307, `/vendas` (com `+ Bancada` ao lado do nome, sem navegação automática), `/runas` (3:1 corrigido), `/top20`, **`/extrator-runas`** (experimental, só quebráveis, coef manual, `Qtd fabricada` + `Qtd runas`/`Preço` por runa, `Custo total`/`Runas total`/`Lucro`/`Margem`), **`/analise-extrator`** (Top 10 de todo o histórico `consulted`+`extractorHistory`, filtros e ordenação).
- **Store (Zustand `dofus-receitas:v1`):** `server`, `servers`, `prices[server]`, `workbench`, `sales`, `recent` (50), `stock`, **`extractor: ExtractorEntry[]` (`id, coefMax, coefAtual, itemQty, runeQty`)**, **`consulted: number[]`**, **`extractorHistory: Record<number, ExtractorEntry>`** (mantém último `coef/qty/lucro` mesmo após X), `setStock`, `setPrice`, `addWorkbench` etc., `addExtractor` (restaura do histórico se já consultado, default `0/0`), `updateExtractorCoef/ItemQty/RuneQty` (sempre espelham para `extractorHistory`), `pushRecent` (alimenta `consulted`+`history`), `addConsulted`/`clearHistory`. `partialize` inclui `extractor`, `consulted`, `extractorHistory`.
- **Vendas:** "Vender" por item + "Colocar tudo à venda" → `/vendas`; vendas têm `+ Bancada` para refazer sem trocar de aba.
- **Runas (correção):** `runas` usa 3:1 (3 lvl1→1 lvl2; 9 lvl1 ou 3 lvl2→1 lvl3).
- **Fila (métricas):** `Venda unit.` editável, `Custo` (ingredientes×qtd), `Lucro venda`/`Margem venda` e **`Lucro extração`/`Margem extração`** (média dos preços das runas possíveis × `qtd`, ou valor real do Extrator quando o item está no histórico: `perItemProfit = totalProfitExtrator / extItemQty`). Layout final: `Custo | Lucro (venda em cima, extração embaixo) | Margem (venda/extração)` com subtítulo `venda / extração`; comparativo `▲ melhor extrair/vender` removido a pedido.
- **Shift+Click cópia:** `lib/copy.ts`; `ItemThumb` no ícone (`Shift+Click: copiar nome` na Bancada, `Shift+Click` também na Vendas); aviso "Dica: Shift+Click no ícone…".
- **Runas ao quebrar:** `lib/runes.ts` (`RUNE_LEGEND` + `loadRunes`/`loadCharacteristics`, `runeInfo` com `img`/`name` oficiais). `items.json` tem 58 `characteristic` distintos; `c=-1` (dano base) é filtrado (não gera runa). Ex.: *Pá de graveto* (id 153, `c:-1 9-11` dano + `c:13 7-10` Sorte) mostra só `Runa Sor`.
- **Materiais:** `Tenho` + `/+buy` + `Preço`; `buy = max(0, req-have)`; `totals.cost` usa `buy`; `consolidatedView` ordenada por `lineCost` desc e `done` por último (`opacity-60`); botão geral **Zerar recursos** no rodapé da lista. `Custo total` no rodapé da fila considera `stock`; per-item `CUSTO` é cheio (explica `Custo total 0 K` quando `Tenho` cobre tudo).
- **Spinners removidos:** `globals.css` esconde `input[type=number]` spinners para fila e materiais.
- **Correções de hoje:** `Qtd` 4 dígitos; `coef` default `0/0` para novos itens (antes `378/378`); `extractorHistory` sempre atualizado (mesmo se não existia) e `addExtractor` restaura do histórico ao readicionar (ex.: *sacola 644* não zera mais ao fechar); **Bancada** agora puxa `valorRunas`/`runeQty` reais do Extrator (`totalProfit / itemQty`) para o `Lucro extração` (ex.: 20 Pandawa com 23340 total → 1167 por unidade); `Análise` usa `allIds = consulted ?? extractor+recent` e `extractorHistory` para não perder `COF`/`lucro` após X.

### Ativo

- Nenhum — último build passou (`rm -rf .next && npm run build`), Web `:3000` e API `:3001` detached (`setsid`), ambos 200 (verificado `/workbench`, `/extrator-runas`, `/analise-extrator`, `/receitas/153`).

### Bloqueado

- Nenhum.

## Próximos Passos

1. Ajustes finos na Análise (ex.: exportar CSV) se solicitado.
2. Refinar `RUNE_LEGEND` com `characteristics.json` oficial se o usuário baixar.

## Arquivos Relevantes

- `extract_dofusdb.py` — extrator (usuário roda por licença).
- `scripts/build-data.mjs` — projeta `items.min.json` (+`effects`+`superTypeId`), `recipes.min.json`, `jobs.min.json`, `runes.min.json`, `characteristics.min.json`.
- `apps/api/src/dofus/dofus.service.ts` — carga de dados, `ItemEffect`, `ItemMin.superTypeId`, `runes`, `characteristics`.
- `apps/api/src/dofus/dofus.controller.ts` — rotas REST (`/runes`, `/characteristics`).
- `apps/api/data/*.min.json` — índices gerados (gitignored).
- `apps/web/lib/store.ts` — estado persistido (`extractor`, `consulted`, `extractorHistory`, `stock`, etc.).
- `apps/web/lib/api.ts` — cliente (`/runes`, `/characteristics`).
- `apps/web/lib/types.ts` — `ItemEffect`, `ItemMin.superTypeId`.
- `apps/web/lib/runes.ts` — `loadRunes`/`loadCharacteristics`, `runeInfo` com `img`.
- `apps/web/app/workbench/page.tsx` — unificada (busca + fila 5/linha com `Qtd` 4 dígitos, `Venda`+`Extração` lado a lado, `Extrair` sem navegação, `Vender | Extrair`, `consolidatedView` ordenada, `Zerar recursos`).
- `apps/web/app/extrator-runas/page.tsx` — experimental (só quebráveis, `Qtd fabricada` + `Qtd runas`/`Preço` por runa, `Custo total`/`Lucro`/`Margem`, persistido via `extractorHistory`, `coef` default `0/0`).
- `apps/web/app/analise-extrator/page.tsx` — Top 10 de `consulted`+`history` com filtros `runa`, `tipo`, `lvl`, ordenação `coef`/`lucro`/`margem`.
- `apps/web/app/receitas/[id]/page.tsx` — calculadora + **Runas ao quebrar** (ícone+nome, filtra `c=-1`, usa `runeMap`).
- `apps/web/components/ItemThumb.tsx` — `copyName` + `requireCtrl` (Shift na Bancada/Vendas).
- `apps/web/components/Nav.tsx` — links atualizados.
- `context.md` — este arquivo.
