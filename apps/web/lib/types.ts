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

export function itemName(it: ItemMin | null | undefined): string {
  if (!it) return '?';
  return it.name?.pt ?? it.name?.fr ?? it.name?.en ?? '?';
}

export interface DropSource {
  m: number;
  n: string;
  p: number;
  lvl: number | null;
}
