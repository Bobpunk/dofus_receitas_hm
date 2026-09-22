import { api } from '@/lib/api';

export const RUNE_LEGEND: Record<number, string> = {
  10: 'PA',
  11: 'Vitalidade',
  12: 'Vida',
  13: 'PM',
  15: 'Força',
  23: 'Inteligência',
  24: 'Agilidade',
  25: 'Sorte',
  26: 'Sabedoria',
  28: 'Alcance',
  44: 'Prospecção',
  48: 'Iniciativa',
  49: 'Pods',
  50: 'Invocações',
  54: 'Tacle',
  55: 'Esquiva PA',
  56: 'Esquiva PM',
  57: 'Puissance',
  58: 'Renvoi de Dommages',
  40: 'Coups Critiques',
  80: 'Dommages Neutres',
  81: 'Dommages Terre',
  82: 'Dommages Feu',
  83: 'Dommages Água',
  84: 'Dommages Ar',
  85: 'Resistência Neutra',
  86: 'Resistência Terre',
  87: 'Resistência Feu',
  88: 'Resistência Água',
  89: 'Resistência Ar',
  90: '% Resistência Neutra',
  91: '% Resistência Terre',
  92: '% Resistência Feu',
  120: '% Resistência Água',
  121: '% Resistência Ar',
  78: 'Resistência Crítica',
  79: 'Esquiva Crítica',
  0: 'Dommages Neutres',
};

let cache: Record<number, string> | null = null;
let runeCache: Record<number, { id: number; name: string; img: string | null }> | null = null;

export async function loadCharacteristics(): Promise<Record<number, string>> {
  if (cache) return cache;
  let remote: Record<number, string> = {};
  try {
    remote = await api.characteristics();
  } catch {
    remote = {};
  }
  cache = { ...RUNE_LEGEND, ...remote };
  return cache;
}

export async function loadRunes(): Promise<Record<number, { id: number; name: string; img: string | null }>> {
  if (runeCache) return runeCache;
  try {
    const raw = await api.runes();
    const norm: Record<number, { id: number; name: string; img: string | null }> = {};
    for (const [k, v] of Object.entries(raw)) norm[Number(k)] = v;
    runeCache = norm;
    return norm;
  } catch {
    runeCache = {};
    return {};
  }
}

export function runeName(
  cid: number | null,
  map: Record<number, string>
): string {
  if (cid == null) return 'Atributo ?';
  const name = map[cid];
  if (!name) return `Atributo #${cid}`;
  const article = /^[AEIOU]/.test(name) ? "Runa d'" : 'Runa de ';
  return `${article}${name}`;
}

export function runeInfo(
  cid: number | null,
  runes: Record<number, { id: number; name: string; img: string | null }>,
  chars: Record<number, string>
): { name: string; img: string | null; id: number | null } {
  if (cid == null) return { name: 'Atributo ?', img: null, id: null };
  const r = runes[cid];
  if (r) return { name: r.name, img: r.img, id: r.id };
  return { name: runeName(cid, chars), img: null, id: null };
}
