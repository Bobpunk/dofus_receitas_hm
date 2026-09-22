import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface IngredientMin {
  id: number;
  quantity: number;
  name: string | null;
  img: string | null;
  level: number | null;
}

export interface ItemEffect {
  c: number | null;
  from: number;
  to: number;
  eid: number | null;
}

export interface ItemMin {
  id: number;
  ankamaId: number | null;
  name: Record<string, string>;
  img: string | null;
  level: number | null;
  typeId: number | null;
  superTypeId: number | null;
  typeName: string | null;
  price: number | null;
  effects: ItemEffect[];
}

export interface DropSource {
  m: number;
  n: string;
  p: number;
  lvl: number | null;
}

export interface RecipeMin {
  resultId: number;
  resultName: string | null;
  resultNameFr: string | null;
  resultImg: string | null;
  resultLevel: number | null;
  jobId: number | null;
  jobName: string | null;
  ingredients: IngredientMin[];
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

@Injectable()
export class DofusService implements OnModuleInit {
  private items: ItemMin[] = [];
  private recipes: RecipeMin[] = [];
  private jobs: any[] = [];
  private itemsById = new Map<number, ItemMin>();
  private normName = new Map<number, string>();
  private characteristics: Record<number, string> = {};
  private runes: Record<number, { id: number; name: string; img: string | null }> = {};
  private drops: Record<number, DropSource[]> = {};

  onModuleInit() {
    const candidates = [
      path.join(__dirname, '..', '..', 'data'),
      path.join(__dirname, '..', 'data'),
      path.join(process.cwd(), 'apps', 'api', 'data'),
    ];
    const dir = candidates.find((c) => fs.existsSync(c))!;
    console.log('DofusService dataDir=', dir);
    this.items = JSON.parse(fs.readFileSync(path.join(dir, 'items.min.json'), 'utf-8'));
    this.recipes = JSON.parse(fs.readFileSync(path.join(dir, 'recipes.min.json'), 'utf-8'));
    this.jobs = JSON.parse(fs.readFileSync(path.join(dir, 'jobs.min.json'), 'utf-8'));
    try {
      this.characteristics = JSON.parse(
        fs.readFileSync(path.join(dir, 'characteristics.min.json'), 'utf-8')
      );
    } catch {
      this.characteristics = {};
    }
    try {
      this.runes = JSON.parse(fs.readFileSync(path.join(dir, 'runes.min.json'), 'utf-8'));
    } catch {
      this.runes = {};
    }
    try {
      this.drops = JSON.parse(fs.readFileSync(path.join(dir, 'drops.min.json'), 'utf-8'));
    } catch {
      this.drops = {};
    }
    for (const it of this.items) {
      this.itemsById.set(it.id, it);
      this.normName.set(it.id, normalize(it.name?.pt ?? ''));
    }
    console.log(`DofusService: ${this.items.length} itens, ${this.recipes.length} receitas carregados.`);
  }

  searchItems(q: string, limit = 50): ItemMin[] {
    const nq = normalize(q);
    if (!nq) return this.items.slice(0, limit);
    return this.items.filter((it) => this.normName.get(it.id)?.includes(nq)).slice(0, limit);
  }

  getItem(id: number): ItemMin | null {
    return this.itemsById.get(id) ?? null;
  }

  getItemsByIds(ids: number[]): ItemMin[] {
    return ids.map((id) => this.itemsById.get(id)).filter((x): x is ItemMin => Boolean(x));
  }

  searchRecipes(q: string, limit = 50): RecipeMin[] {
    const nq = normalize(q);
    if (!nq) return this.recipes.slice(0, limit);
    return this.recipes
      .filter((r) => normalize(r.resultName ?? '').includes(nq))
      .slice(0, limit);
  }

  getRecipes(): RecipeMin[] {
    return this.recipes;
  }

  getRecipe(resultId: number): RecipeMin | null {
    return this.recipes.find((r) => r.resultId === resultId) ?? null;
  }

  getRecipeIds(): number[] {
    return this.recipes.map((r) => r.resultId);
  }

  getJobs(): any[] {
    return this.jobs;
  }

  getCharacteristics(): Record<number, string> {
    return this.characteristics;
  }

  getRunes(): Record<number, { id: number; name: string; img: string | null }> {
    return this.runes;
  }

  getPrices(): Record<number, number> {
    const map: Record<number, number> = {};
    for (const it of this.items) map[it.id] = it.price ?? 0;
    return map;
  }

  getDrops(): Record<number, DropSource[]> {
    return this.drops;
  }

  getDropsForItem(id: number): DropSource[] {
    return this.drops[id] ?? [];
  }
}
