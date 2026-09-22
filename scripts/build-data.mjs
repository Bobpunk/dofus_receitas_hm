import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(__root(), "apps", "api", "data");

function __root() {
  return ROOT;
}

function load(name) {
  const p = resolve(ROOT, name);
  console.log(`Lendo ${name} ...`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

function pick(o, keys) {
  const out = {};
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const items = load("items.json");
  const recipes = load("recipes.json");
  const jobs = load("jobs.json");

  console.log(`Processando ${items.length} itens ...`);
  const itemsById = new Map();
  const itemsMin = items.map((it) => {
    const typeName = it.type?.name?.pt ?? it.type?.name?.fr ?? null;
    const row = {
      id: it.id,
      ankamaId: it.ankamaId ?? null,
      name: it.name,
      img: it.img ?? null,
      level: it.level ?? null,
      typeId: it.typeId ?? null,
      superTypeId: it.type?.superTypeId ?? null,
      typeName,
      price: it.price ?? null,
      effects: (it.effects || []).map((e) => ({
        c: e.characteristic ?? null,
        from: e.from ?? 0,
        to: e.to ?? 0,
        eid: e.effectId ?? null,
      })),
    };
    itemsById.set(it.id, row);
    return row;
  });

  // runas: mapa characteristic -> { id, name, img } (ícone/nome corretos)
  const runeByChar = new Map();
  for (const it of items) {
    const tName = it.type?.name?.pt ?? it.type?.name?.fr ?? "";
    const pName = it.name?.pt ?? "";
    const isRune = tName.toLowerCase().includes("runa de forjamagia") || pName.toLowerCase().startsWith("runa ");
    if (!isRune) continue;
    const eff = (it.effects || [])[0];
    if (!eff || eff.characteristic == null) continue;
    const c = eff.characteristic;
    const cur = runeByChar.get(c);
    const level = it.level ?? 999;
    const curLevel = cur?.level ?? 999;
    const hasPa = pName.toLowerCase().includes(" pa ");
    const curHasPa = cur?.name?.toLowerCase().includes(" pa ") ?? false;
    // prefere sem " Pa " e menor level
    const better =
      !cur ||
      (hasPa && !curHasPa ? false : !hasPa && curHasPa ? true : level < curLevel);
    if (better) {
      runeByChar.set(c, {
        id: it.id,
        name: pName,
        img: it.img ?? null,
        level,
        c,
      });
    }
  }
  const runesMin = {};
  for (const [c, v] of runeByChar.entries()) {
    runesMin[c] = { id: v.id, name: v.name, img: v.img };
  }
  console.log(`Processando ${runeByChar.size} runas mapeadas ...`);

  console.log(`Processando ${jobs.length} profissões ...`);
  const jobsById = new Map();
  const jobsMin = jobs.map((j) => {
    const row = {
      id: j.id,
      name: j.name?.pt ?? j.name?.fr ?? null,
      ankamaId: j.ankamaId ?? null,
    };
    jobsById.set(j.id, row);
    return row;
  });

  // characteristics reference (optional: only if user downloaded it)
  let characteristicsMin = {};
  try {
    const ch = load('characteristics.json');
    const arr = Array.isArray(ch) ? ch : ch.characteristics ?? ch;
    for (const c of arr) {
      const id = c.id ?? c.ankamaId ?? null;
      if (id == null) continue;
      characteristicsMin[id] = c.name?.pt ?? c.name?.fr ?? null;
    }
    console.log(`Processando ${Object.keys(characteristicsMin).length} características ...`);
  } catch {
    console.log('characteristics.json não encontrado — usando mapa embutido no frontend.');
  }
  writeFileSync(
    resolve(OUT_DIR, 'characteristics.min.json'),
    JSON.stringify(characteristicsMin)
  );
  writeFileSync(resolve(OUT_DIR, 'runes.min.json'), JSON.stringify(runesMin));

  // drops: mapa itemId -> [{ m (monsterId), n (nome), p (% drop), lvl }]
  // fonte: monsters.json (drops[].percentDropForGrade1..5, fallback maxPercentDrop)
  let dropsMin = {};
  try {
    const monsters = load('monsters.json');
    console.log(`Processando drops de ${monsters.length} monstros ...`);
    const byItem = new Map();
    for (const m of monsters) {
      const mid = m.id ?? null;
      if (mid == null) continue;
      const mName = m.name?.pt ?? m.name?.fr ?? m.name?.en ?? `#${mid}`;
      const grades = Array.isArray(m.grades) ? m.grades : [];
      const minLvl = grades.reduce((a, g) => (g?.level != null ? Math.min(a, g.level) : a), 9999);
      const lvl = minLvl === 9999 ? null : minLvl;
      for (const d of m.drops ?? []) {
        const oid = d.objectId ?? null;
        if (oid == null || oid <= 0) continue;
        const gmax = Math.max(
          d.percentDropForGrade1 ?? 0,
          d.percentDropForGrade2 ?? 0,
          d.percentDropForGrade3 ?? 0,
          d.percentDropForGrade4 ?? 0,
          d.percentDropForGrade5 ?? 0
        );
        const p = gmax > 0 ? gmax : (d.maxPercentDrop ?? 0);
        if (!(p > 0)) continue;
        if (!byItem.has(oid)) byItem.set(oid, []);
        byItem.get(oid).push({ m: mid, n: mName, p, lvl });
      }
    }
    for (const [oid, list] of byItem.entries()) {
      list.sort((a, b) => b.p - a.p || (a.lvl ?? 9999) - (b.lvl ?? 9999));
      const seen = new Set();
      const top = [];
      for (const s of list) {
        if (seen.has(s.m)) continue;
        seen.add(s.m);
        top.push(s);
        if (top.length >= 5) break;
      }
      dropsMin[oid] = top;
    }
    console.log(`Processando ${byItem.size} itens com drops ...`);
  } catch (e) {
    console.log('monsters.json não encontrado — drops.min.json ficará vazio.', e?.message ?? e);
  }
  writeFileSync(resolve(OUT_DIR, 'drops.min.json'), JSON.stringify(dropsMin));

  console.log(`Processando ${recipes.length} receitas ...`);  const recipesMin = recipes
    .map((r) => {
      const resultId = r.resultId ?? r.id;
      const result = itemsById.get(resultId) ?? null;
      const ingredientIds = r.ingredientIds ?? [];
      const quantities = r.quantities ?? [];
      const ingredients = ingredientIds.map((iid, idx) => {
        const it = itemsById.get(iid);
        return {
          id: iid,
          quantity: quantities[idx] ?? 1,
          name: it?.name?.pt ?? it?.name?.fr ?? null,
          img: it?.img ?? null,
          level: it?.level ?? null,
        };
      });
      const job = jobsById.get(r.jobId) ?? null;
      return {
        resultId,
        resultName: result?.name?.pt ?? r.resultName?.pt ?? null,
        resultNameFr: result?.name?.fr ?? r.resultName?.fr ?? null,
        resultImg: result?.img ?? null,
        resultLevel: r.resultLevel ?? result?.level ?? null,
        jobId: r.jobId ?? null,
        jobName: job?.name ?? null,
        ingredients,
      };
    })
    .filter((r) => r.resultName);

  const meta = {
    generatedAt: new Date().toISOString(),
    counts: {
      items: itemsMin.length,
      recipes: recipesMin.length,
      jobs: jobsMin.length,
      drops: Object.keys(dropsMin).length,
    },
  };

  writeFileSync(resolve(OUT_DIR, "items.min.json"), JSON.stringify(itemsMin));
  writeFileSync(resolve(OUT_DIR, "recipes.min.json"), JSON.stringify(recipesMin));
  writeFileSync(resolve(OUT_DIR, "jobs.min.json"), JSON.stringify(jobsMin));
  writeFileSync(resolve(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));

  console.log("Índices gravados em apps/api/data:");
  console.log(meta.counts);
}

main();
