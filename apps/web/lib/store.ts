'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_SERVERS = ['Hellmina', 'Tal Kasha', 'Ombre', 'Pandora', 'Draconiros', 'Kourial', 'Rafal', 'Mikhal'];

interface WorkbenchEntry {
  resultId: number;
  qty: number;
}

interface SaleEntry {
  resultId: number;
  qty: number;
  addedAt: number;
}

interface ExtractorEntry {
  id: number;
  coefMax: number;
  coefAtual: number;
  itemQty: number;
  runeQty: Record<number, number>;
}

type PerServer<T> = Record<string, T>;

interface State {
  server: string;
  servers: string[];
  prices: PerServer<Record<number, number>>;
  priceUpdatedAt: PerServer<Record<number, number>>;
  workbench: PerServer<WorkbenchEntry[]>;
  sales: PerServer<SaleEntry[]>;
  recent: PerServer<number[]>;
  stock: PerServer<Record<number, number>>;
  extractor: PerServer<ExtractorEntry[]>;
  consulted: PerServer<number[]>;
  extractorHistory: PerServer<Record<number, ExtractorEntry>>;
  setServer: (s: string) => void;
  addServer: (s: string) => void;
  setPrice: (itemId: number, value: number | null) => void;
  priceFor: (itemId: number) => number | undefined;
  setStock: (itemId: number, qty: number) => void;
  addWorkbench: (resultId: number, qty?: number) => void;
  updateWorkbenchQty: (resultId: number, qty: number) => void;
  removeWorkbench: (resultId: number) => void;
  clearWorkbench: () => void;
  addSale: (resultId: number, qty?: number) => void;
  updateSaleQty: (resultId: number, qty: number) => void;
  removeSale: (resultId: number) => void;
  clearSales: () => void;
  pushRecent: (resultId: number) => void;
  addExtractor: (id: number, coefMax?: number, coefAtual?: number) => void;
  removeExtractor: (id: number) => void;
  clearExtractor: () => void;
  updateExtractorCoef: (id: number, coefMax: number, coefAtual: number) => void;
  updateExtractorItemQty: (id: number, qty: number) => void;
  updateExtractorRuneQty: (id: number, charId: number, qty: number) => void;
  addConsulted: (id: number) => void;
  clearConsulted: () => void;
  clearHistory: () => void;
}

function getServerMap<T>(map: PerServer<T> | undefined, server: string, fallback: T): T {
  return (map?.[server] as T) ?? fallback;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      server: DEFAULT_SERVERS[0],
      servers: DEFAULT_SERVERS,
      prices: {},
      priceUpdatedAt: {},
      workbench: {},
      sales: {},
      recent: {},
      stock: {},
      extractor: {},
      consulted: {},
      extractorHistory: {},
      setServer: (s) => set({ server: s }),
      addServer: (s) =>
        set((st) =>
          st.servers.includes(s) ? st : { servers: [...st.servers, s] }
        ),
      setPrice: (itemId, value) =>
        set((st) => {
          const srv = st.server;
          const cur = { ...(st.prices[srv] ?? {}) };
          const curAt = { ...(st.priceUpdatedAt[srv] ?? {}) };
          if (value == null || Number.isNaN(value)) {
            delete cur[itemId];
            delete curAt[itemId];
          } else {
            cur[itemId] = value;
            curAt[itemId] = Date.now();
          }
          return {
            prices: { ...st.prices, [srv]: cur },
            priceUpdatedAt: { ...st.priceUpdatedAt, [srv]: curAt },
          };
        }),
      priceFor: (itemId) => get().prices[get().server]?.[itemId],
      setStock: (itemId, qty) =>
        set((st) => {
          const srv = st.server;
          const curMap = { ...(st.stock[srv] ?? {}) };
          const q = Math.max(0, Math.floor(qty) || 0);
          if (q === 0) delete curMap[itemId];
          else curMap[itemId] = q;
          return { stock: { ...st.stock, [srv]: curMap } };
        }),
      addWorkbench: (resultId, qty = 1) =>
        set((st) => {
          const srv = st.server;
          const list = getServerMap(st.workbench, srv, [] as WorkbenchEntry[]);
          const found = list.find((w) => w.resultId === resultId);
          const next = found
            ? list.map((w) => (w.resultId === resultId ? { ...w, qty: w.qty + qty } : w))
            : [...list, { resultId, qty }];
          return { workbench: { ...st.workbench, [srv]: next } };
        }),
      updateWorkbenchQty: (resultId, qty) =>
        set((st) => {
          const srv = st.server;
          const list = getServerMap(st.workbench, srv, [] as WorkbenchEntry[]);
          return {
            workbench: {
              ...st.workbench,
              [srv]: list.map((w) => (w.resultId === resultId ? { ...w, qty: Math.max(0, qty) } : w)),
            },
          };
        }),
      removeWorkbench: (resultId) =>
        set((st) => {
          const srv = st.server;
          const list = getServerMap(st.workbench, srv, [] as WorkbenchEntry[]);
          return { workbench: { ...st.workbench, [srv]: list.filter((w) => w.resultId !== resultId) } };
        }),
      clearWorkbench: () =>
        set((st) => ({ workbench: { ...st.workbench, [st.server]: [] } })),
      addSale: (resultId, qty = 1) =>
        set((st) => {
          const srv = st.server;
          const list = getServerMap(st.sales, srv, [] as SaleEntry[]);
          const found = list.find((w) => w.resultId === resultId);
          const now = Date.now();
          const next = found
            ? list.map((w) => (w.resultId === resultId ? { ...w, qty: w.qty + qty } : w))
            : [...list, { resultId, qty, addedAt: now } as SaleEntry];
          return { sales: { ...st.sales, [srv]: next } };
        }),
      updateSaleQty: (resultId, qty) =>
        set((st) => {
          const srv = st.server;
          const list = getServerMap(st.sales, srv, [] as SaleEntry[]);
          return {
            sales: { ...st.sales, [srv]: list.map((w) => (w.resultId === resultId ? { ...w, qty: Math.max(0, qty) } : w)) },
          };
        }),
      removeSale: (resultId) =>
        set((st) => {
          const srv = st.server;
          const list = getServerMap(st.sales, srv, [] as SaleEntry[]);
          return { sales: { ...st.sales, [srv]: list.filter((w) => w.resultId !== resultId) } };
        }),
      clearSales: () =>
        set((st) => ({ sales: { ...st.sales, [st.server]: [] } })),
      pushRecent: (resultId) =>
        set((st) => {
          const srv = st.server;
          const cur = getServerMap(st.recent, srv, [] as number[]);
          const nextRecent = [resultId, ...cur.filter((r) => r !== resultId)].slice(0, 50);
          const curCons = getServerMap(st.consulted, srv, [] as number[]);
          const nextConsulted = curCons.includes(resultId) ? curCons : [...curCons, resultId];
          const histMap = { ...(st.extractorHistory[srv] ?? {}) };
          if (!histMap[resultId]) histMap[resultId] = { id: resultId, coefMax: 0, coefAtual: 0, itemQty: 1, runeQty: {} };
          return {
            recent: { ...st.recent, [srv]: nextRecent },
            consulted: { ...st.consulted, [srv]: nextConsulted },
            extractorHistory: { ...st.extractorHistory, [srv]: histMap },
          };
        }),
      addExtractor: (id, coefMax = 0, coefAtual = 0) =>
        set((st) => {
          const srv = st.server;
          const curCons = getServerMap(st.consulted, srv, [] as number[]);
          const nextConsulted = curCons.includes(id) ? curCons : [...curCons, id];
          const curList = getServerMap(st.extractor, srv, [] as ExtractorEntry[]);
          const curHist = { ...(st.extractorHistory[srv] ?? {}) };
          if (curList.find((e) => e.id === id)) {
            const existing = curList.find((e) => e.id === id)!;
            return {
              consulted: { ...st.consulted, [srv]: nextConsulted },
              extractorHistory: { ...st.extractorHistory, [srv]: { ...curHist, [id]: existing } },
            } as any;
          }
          const hist = curHist[id] as ExtractorEntry | undefined;
          if (hist) {
            return {
              extractor: { ...st.extractor, [srv]: [...curList, hist] },
              consulted: { ...st.consulted, [srv]: nextConsulted },
              extractorHistory: { ...st.extractorHistory, [srv]: { ...curHist, [id]: hist } },
            };
          }
          const entry: ExtractorEntry = { id, coefMax, coefAtual, itemQty: 1, runeQty: {} as Record<number, number> };
          return {
            extractor: { ...st.extractor, [srv]: [...curList, entry] },
            consulted: { ...st.consulted, [srv]: nextConsulted },
            extractorHistory: { ...st.extractorHistory, [srv]: { ...curHist, [id]: entry } },
          };
        }),
      removeExtractor: (id) =>
        set((st) => {
          const srv = st.server;
          const curList = getServerMap(st.extractor, srv, [] as ExtractorEntry[]);
          return { extractor: { ...st.extractor, [srv]: curList.filter((e) => e.id !== id) } };
        }),
      clearExtractor: () =>
        set((st) => ({ extractor: { ...st.extractor, [st.server]: [] } })),
      updateExtractorCoef: (id, coefMax, coefAtual) =>
        set((st) => {
          const srv = st.server;
          const curList = getServerMap(st.extractor, srv, [] as ExtractorEntry[]);
          const curHist = { ...(st.extractorHistory[srv] ?? {}) };
          const base = (curHist[id] ?? curList.find((e) => e.id === id) ?? { id, coefMax: 0, coefAtual: 0, itemQty: 1, runeQty: {} as Record<number, number> }) as any;
          curHist[id] = { ...base, coefMax, coefAtual };
          return {
            extractor: { ...st.extractor, [srv]: curList.map((e) => (e.id === id ? { ...e, coefMax, coefAtual } : e)) },
            extractorHistory: { ...st.extractorHistory, [srv]: curHist },
          };
        }),
      updateExtractorItemQty: (id, qty) =>
        set((st) => {
          const srv = st.server;
          const q = Math.max(1, Math.floor(qty) || 1);
          const curList = getServerMap(st.extractor, srv, [] as ExtractorEntry[]);
          const curHist = { ...(st.extractorHistory[srv] ?? {}) };
          const base = (curHist[id] ?? curList.find((e) => e.id === id) ?? { id, coefMax: 0, coefAtual: 0, itemQty: 1, runeQty: {} as Record<number, number> }) as any;
          curHist[id] = { ...base, itemQty: q };
          return {
            extractor: { ...st.extractor, [srv]: curList.map((e) => (e.id === id ? { ...e, itemQty: q } : e)) },
            extractorHistory: { ...st.extractorHistory, [srv]: curHist },
          };
        }),
      updateExtractorRuneQty: (id, charId, qty) =>
        set((st) => {
          const srv = st.server;
          const q = Math.max(0, Math.floor(qty) || 0);
          const curList = getServerMap(st.extractor, srv, [] as ExtractorEntry[]);
          const curHist = { ...(st.extractorHistory[srv] ?? {}) };
          const hBase = (curHist[id] ?? curList.find((e) => e.id === id) ?? { id, coefMax: 0, coefAtual: 0, itemQty: 1, runeQty: {} as Record<number, number> }) as any;
          const h = { ...hBase, runeQty: { ...(hBase.runeQty ?? {}) } };
          if (q === 0) delete h.runeQty[charId];
          else h.runeQty[charId] = q;
          curHist[id] = h;
          return {
            extractor: {
              ...st.extractor,
              [srv]: curList.map((e) => {
                if (e.id !== id) return e;
                const next = { ...(e.runeQty ?? {}) };
                if (q === 0) delete next[charId];
                else next[charId] = q;
                return { ...e, runeQty: next };
              }),
            },
            extractorHistory: { ...st.extractorHistory, [srv]: curHist },
          };
        }),
      addConsulted: (id) =>
        set((st) => {
          const srv = st.server;
          const cur = getServerMap(st.consulted, srv, [] as number[]);
          if (cur.includes(id)) return st;
          const hist = { ...(st.extractorHistory[srv] ?? {}) };
          if (!hist[id]) hist[id] = { id, coefMax: 0, coefAtual: 0, itemQty: 1, runeQty: {} };
          return { consulted: { ...st.consulted, [srv]: [...cur, id] }, extractorHistory: { ...st.extractorHistory, [srv]: hist } };
        }),
      clearConsulted: () =>
        set((st) => ({ consulted: { ...st.consulted, [st.server]: [] } })),
      clearHistory: () =>
        set((st) => ({ consulted: { ...st.consulted, [st.server]: [] }, extractorHistory: { ...st.extractorHistory, [st.server]: {} } })),
    }),
    {
      name: 'dofus-receitas:v1',
      version: 8,
      // Garante que servidores novos (ex: Mikhal) apareçam mesmo para
      // quem já tem lista antiga salva no localStorage.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<State>;
        const merged = { ...currentState, ...(persisted as object) } as State;
        const persistedServers = Array.isArray(persisted.servers) ? persisted.servers : [];
        merged.servers = Array.from(new Set([...DEFAULT_SERVERS, ...persistedServers]));
        return merged;
      },
      partialize: (s) => ({
        server: s.server,
        servers: s.servers,
        prices: s.prices,
        priceUpdatedAt: (s as any).priceUpdatedAt ?? {},
        workbench: s.workbench,
        sales: s.sales,
        recent: s.recent,
        stock: s.stock,
        extractor: s.extractor,
        consulted: s.consulted,
        extractorHistory: s.extractorHistory,
      }),
      migrate: (persisted: any, version) => {
        if (!persisted) return persisted;
        // garante Draconiros, Kourial, Rafal e Mikhal em qualquer versão
        if (Array.isArray(persisted.servers)) {
          if (!persisted.servers.includes('Draconiros')) persisted.servers = [...persisted.servers, 'Draconiros'];
          if (!persisted.servers.includes('Kourial')) persisted.servers = [...persisted.servers, 'Kourial'];
          if (!persisted.servers.includes('Rafal')) persisted.servers = [...persisted.servers, 'Rafal'];
          if (!persisted.servers.includes('Mikhal')) persisted.servers = [...persisted.servers, 'Mikhal'];
        } else {
          persisted.servers = [...DEFAULT_SERVERS];
        }
        if (persisted.priceUpdatedAt == null) persisted.priceUpdatedAt = {};
        // garante addedAt em sales (v4 -> v5)
        if (persisted.sales && typeof persisted.sales === 'object' && !Array.isArray(persisted.sales)) {
          for (const srv of Object.keys(persisted.sales)) {
            const list = persisted.sales[srv];
            if (Array.isArray(list)) {
              persisted.sales[srv] = list.map((e: any) => (e.addedAt == null ? { ...e, addedAt: Date.now() } : e));
            }
          }
        }
        if (version < 7) {
          // v1 -> v2: converte workbench/sales/recent/stock/extractor/consulted de formato global para per-server
          const curServer = persisted.server ?? DEFAULT_SERVERS[0];
        const toPerServer = <T,>(val: any, fallback: T): PerServer<T> => {
          if (val == null) return {} as PerServer<T>;
          // já é per-server (objeto com chaves de servidor)
          if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).some((k) => DEFAULT_SERVERS.includes(k) || typeof (val as any)[k] === 'object')) {
            // heurística: se tem chave que é servidor, assume já é per-server
            const hasServerKey = Object.keys(val).some((k) => DEFAULT_SERVERS.includes(k));
            if (hasServerKey) return val as PerServer<T>;
          }
          if (Array.isArray(val)) return { [curServer]: val } as PerServer<T>;
          if (typeof val === 'object') return { [curServer]: val } as PerServer<T>;
          return {} as PerServer<T>;
        };
        try {
          if (Array.isArray(persisted.workbench)) persisted.workbench = toPerServer(persisted.workbench, []);
          if (Array.isArray(persisted.sales)) persisted.sales = toPerServer(persisted.sales, []);
          if (Array.isArray(persisted.recent)) persisted.recent = toPerServer(persisted.recent, []);
          if (persisted.stock && !Object.keys(persisted.stock).some((k) => DEFAULT_SERVERS.includes(k)) && typeof persisted.stock === 'object' && !Array.isArray(persisted.stock)) {
            // stock era Record<number,number> global
            const isGlobalStock = Object.keys(persisted.stock).every((k) => !isNaN(Number(k)));
            if (isGlobalStock) persisted.stock = { [curServer]: persisted.stock } as any;
          }
          if (Array.isArray(persisted.extractor)) persisted.extractor = toPerServer(persisted.extractor, []);
          if (Array.isArray(persisted.consulted)) persisted.consulted = toPerServer(persisted.consulted, []);
          if (persisted.extractorHistory && typeof persisted.extractorHistory === 'object' && !Object.keys(persisted.extractorHistory).some((k) => DEFAULT_SERVERS.includes(k))) {
            const isGlobalHist = Object.keys(persisted.extractorHistory).every((k) => !isNaN(Number(k)));
            if (isGlobalHist) persisted.extractorHistory = { [curServer]: persisted.extractorHistory } as any;
          }
        } catch {}
        }
        return persisted;
      },
    }
  )
);
