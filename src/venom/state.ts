// ベノムモンスターのセーブデータと、育成のルール（v4）
// 1かいの プレイ＝たまご 1こを 約15ふんで 完成体まで そだてる。完成体に なったら その日は おしまい。
// あかちゃん → こども → おとな の それぞれで、ごはん 1かい・トレーニング 1かい・やせいバトル 2かい → つぎの すがた。
// おとなで ぜんぶ おわったら ボスに ちょうせん。かつと 完成体に なって「でんどう」いり。
import { load, save } from '../common/storage';
import type { ProfileId } from '../common/profiles';
import {
  AREAS,
  BOSSES,
  FOODS,
  MED_CARDS,
  RARITY,
  SPECIES,
  SPECIES_IDS,
  type BossId,
  type FoodId,
  type Hand,
  type PType,
  type Rarity,
  type StatKey,
} from './data';
import { BOSS_MOVES, MOVESETS, SKILLS, handsOk, moveCd, moveKey, type MoveDef, type SkillId } from './moves';

export const SAVE_VERSION = 5;
export const HP_PER_POINT = 3;
export const BASE_RES = 10; // どくたいせいの はじめの あたい
export const RES_PER_POINT = 2; // どくたいせいは トレーニング1かいで 2ばい のびる
export const WINS_PER_STAGE = 2; // 1つの すがたで かつ バトルの かず
export const STAGE_START_LEVEL = [0, 1, 6, 11]; // すがた（1〜3）の はじまりの レベル
export const LV_PER_WIN = 2;
export const KANSEI_LEVEL = 16; // 完成体の レベル
export const STAGE_NAMES = ['', 'あかちゃん', 'こども', 'おとな', 'かんせいたい'];

export type Stage = 1 | 2 | 3;

// いま そだてている 1ぴき
export interface Run {
  uid: string;
  species: string;
  stage: Stage;
  level: number;
  hp: number;
  bonus: Record<StatKey, number>; // ごはん・トレーニングで ふえた ぶん（hp は ポイント）
  fed: boolean;
  trained: boolean;
  wins: number;
  bossTries: number; // ボスに まけた かず（まけるほど ボスが すこし よわく なる）
  moves: MoveDef[]; // いまの わざ 3つ（その日の 1ぴきだけの もの）
  startedAt: number;
}

// でんどう（完成体に した いきもの）
export interface HallEntry {
  species: string;
  date: string;
  boss: BossId | null;
}

export interface VenomSave {
  v: number;
  run: Run | null;
  hall: HallEntry[];
  owned: string[]; // そだてた ことが ある しゅるい
  met: string[]; // バトルで であった しゅるい
  factsSeen: Record<string, number>; // 1〜3：みた すがた（3まで）
  bossBeaten: BossId[];
  cards: string[];
  petWarned: boolean;
  lastDone: string | null; // さいごに 完成体に した日（YYYY-MM-DD）
  extraDay: string | null; // おうちの ひとが「もう1かい」を ゆるした日
  gachaCount: number;
}

export interface Stats {
  maxHp: number;
  atk: number;
  def: number;
  res: number;
}

export interface Move {
  hand: Hand;
  name: string;
  skill?: SkillId;
  cd: number; // つかった あと やすむ ターン
  power: number; // グー・チョキの ダメージの つよさ
  types: PType[]; // チョキの どく（パーの「どくのひふ」も これを つかう）
  hits?: number;
  guard?: number; // パー：その ターンに うける ダメージを へらす わりあい（へらした ぶんを はねかえす）
  heal?: number; // パー：HPを かいふくする わりあい
}

const key = (pid: ProfileId) => `venom.${pid}`;
const rid = () => Math.random().toString(36).slice(2, 10);
export const emptyBonus = (): Record<StatKey, number> => ({ hp: 0, atk: 0, def: 0, res: 0 });

export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function newSave(): VenomSave {
  return {
    v: SAVE_VERSION,
    run: null,
    hall: [],
    owned: [],
    met: [],
    factsSeen: {},
    bossBeaten: [],
    cards: [],
    petWarned: false,
    lastDone: null,
    extraDay: null,
    gachaCount: 0,
  };
}

// ---------------- 強さの計算 ----------------
const levelFactor = (lv: number) => 0.4 + 0.06 * lv;

export function statsFor(species: string, level: number, bonus?: Record<StatKey, number>): Stats {
  const b = SPECIES[species].base;
  const f = levelFactor(level);
  return {
    maxHp: Math.round(b.hp * f) + (bonus?.hp ?? 0) * HP_PER_POINT,
    atk: Math.round(b.atk * f) + (bonus?.atk ?? 0),
    def: Math.round(b.def * f) + (bonus?.def ?? 0),
    res: BASE_RES + (bonus?.res ?? 0),
  };
}

export const runStats = (r: Run): Stats => statsFor(r.species, r.level, r.bonus);

// どくたいせい → どくの ききめを へらす わりあい（50で はんぶん、さいだい 75%）
export const resistFrac = (res: number): number => Math.min(0.75, res / (res + 50));

// ---------------- わざ ----------------
// わざの つよさ：グーは ダメージ大、チョキは ダメージ小＋どく、パーは まもり（6わり へらして はねかえす＋かいふく）。
// 2ターン やすむ わざは つよい かわりに はんどうが ある ので、こうげきの わざは すこし ダメージが おおきい。
const STAGE_PREFIX = ['', '', 'つよい ', 'スーパー '];
const STAGE_MUL = [1, 1, 1.06, 1.12];
export function buildMove(def: MoveDef, species: string | null, stage: number): Move {
  const [hand, name, skill] = def;
  const st = Math.max(1, Math.min(3, stage));
  const cd = moveCd(def);
  const mul = STAGE_MUL[st] * (cd === 2 && hand !== 'pa' ? 1.1 : 1);
  const types = species ? [...SPECIES[species].types] : [];
  const m: Move = { hand, name: STAGE_PREFIX[st] + name, skill, cd, power: 0, types: hand === 'gu' ? [] : types };
  if (hand === 'gu') m.power = 1.8 * mul;
  else if (hand === 'choki') m.power = (species ? 1.1 : 1.3) * mul; // ボスの ✌️は どくが ない かわりに すこし つよい
  else {
    m.guard = skill === 'fukuramu' ? 0.8 : 0.6;
    m.heal = [0, 0.08, 0.1, 0.12][st] * (skill === 'fukuramu' ? 2 : 1);
  }
  if (skill === 'rensoku') m.hits = 2;
  return m;
}

export const startMoves = (species: string): MoveDef[] => MOVESETS[species].start.map((m) => [...m] as MoveDef);
export const runMoves = (r: Run): Move[] => r.moves.map((m) => buildMove(m, r.species, r.stage));
export const bossMoves = (bossId: string): Move[] => BOSS_MOVES[bossId].map((m) => buildMove(m, null, 3));
export const skillText = (m: MoveDef | Move): string => {
  const sk = Array.isArray(m) ? m[2] : m.skill;
  return sk ? `〔${SKILLS[sk].name}〕` : '';
};

// ---------------- わざを ひらめく ----------------
// トレーニングの あと 30%、やせいバトルに かった あと 40%。まだ もっていない わざから 1つ。
export const LEARN_CHANCE = { train: 0.3, win: 0.4 };
export function rollInspiration(r: Run, chance: number): MoveDef | null {
  if (Math.random() >= chance) return null;
  const have = new Set(r.moves.map(moveKey));
  const set = MOVESETS[r.species];
  const pool = [...set.learn, ...set.start].filter((m) => !have.has(moveKey(m)));
  // おなじ 手が 3つに なる わざしか ない ときも、いれかえ できる ものだけ
  const usable = pool.filter((m) => r.moves.some((_, i) => canReplace(r, i, m)));
  if (!usable.length) return null;
  return [...usable[Math.floor(Math.random() * usable.length)]] as MoveDef;
}
export function canReplace(r: Run, idx: number, def: MoveDef): boolean {
  const next = r.moves.map((m, i) => (i === idx ? def : m));
  return handsOk(next);
}
export function replaceMove(r: Run, idx: number, def: MoveDef): boolean {
  if (!canReplace(r, idx, def)) return false;
  r.moves[idx] = [...def] as MoveDef;
  return true;
}

// ---------------- ロード・セーブ（版の移行つき） ----------------
interface OldCreature {
  uid: string;
  species: string;
  stage?: number;
  level?: number;
  hatched?: boolean;
  train?: { hp: number; doku: number; def: number };
  bonus?: Partial<Record<StatKey, number>>;
}

function migrate1to2(d: Record<string, unknown>): Record<string, unknown> {
  const old = (d.creatures as OldCreature[] | undefined) ?? [];
  const creatures = old
    .filter((c) => SPECIES[c.species])
    .map((c) => ({ uid: c.uid, species: c.species, hatched: (c.stage ?? 0) > 0, level: (c.stage ?? 0) >= 3 ? 20 : (c.stage ?? 0) === 2 ? 10 : 1 }));
  return { ...d, v: 2, creatures, owned: (d.seen as string[] | undefined) ?? [], met: [] };
}

const migrate2to3 = (d: Record<string, unknown>): Record<string, unknown> => ({ ...d, v: 3 });

// v4：チームを やめて、レベル20いじょうの こは 完成体として でんどうへ
function migrate3to4(d: Record<string, unknown>): Record<string, unknown> {
  const old = ((d.creatures as OldCreature[] | undefined) ?? []).filter((c) => SPECIES[c.species]);
  const done = today();
  const seen = new Set<string>();
  const hall: HallEntry[] = [];
  for (const c of old) {
    if ((c.level ?? 0) >= 20 && !seen.has(c.species)) {
      seen.add(c.species);
      hall.push({ species: c.species, date: done, boss: null });
    }
  }
  const factsSeen = { ...((d.factsSeen as Record<string, number> | undefined) ?? {}) };
  for (const h of hall) factsSeen[h.species] = 3;
  return {
    v: 4,
    run: null,
    hall,
    owned: (d.owned as string[] | undefined) ?? [],
    met: (d.met as string[] | undefined) ?? [],
    factsSeen,
    bossBeaten: (d.bossBeaten as BossId[] | undefined) ?? [],
    cards: (d.cards as string[] | undefined) ?? [],
    petWarned: !!d.petWarned,
    lastDone: null,
    extraDay: null,
    gachaCount: Number(d.gachaCount ?? 0),
  };
}

// v5：わざ 3つ（いま そだてて いる こは さいしょの わざに する）・はやさを なくす
function migrate4to5(d: Record<string, unknown>): Record<string, unknown> {
  const run = d.run as Run | null | undefined;
  if (run && SPECIES[run.species]) run.moves = startMoves(run.species);
  return { ...d, v: 5, run: run ?? null };
}

const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = { 1: migrate1to2, 2: migrate2to3, 3: migrate3to4, 4: migrate4to5 };

export type LoadResult = { ok: true; save: VenomSave } | { ok: false; reason: 'newer' };

export function loadGame(pid: ProfileId): LoadResult {
  let d = load<Record<string, unknown> | null>(key(pid), null);
  if (!d) return { ok: true, save: newSave() };
  let v = Number(d.v ?? 1);
  if (v > SAVE_VERSION) return { ok: false, reason: 'newer' };
  while (v < SAVE_VERSION) {
    d = MIGRATIONS[v](d);
    v++;
  }
  const s = { ...newSave(), ...(d as unknown as VenomSave), v: SAVE_VERSION };
  // こわれた データを なおす
  s.hall = (s.hall ?? []).filter((h) => h && SPECIES[h.species]);
  if (s.run && !SPECIES[s.run.species]) s.run = null;
  if (s.run) {
    const b: Partial<Record<string, number>> = s.run.bonus ?? {};
    s.run.bonus = { hp: b.hp ?? 0, atk: b.atk ?? 0, def: b.def ?? 0, res: b.res ?? 0 };
    if (!Array.isArray(s.run.moves) || s.run.moves.length !== 3 || !handsOk(s.run.moves)) s.run.moves = startMoves(s.run.species);
    s.run.hp = Math.max(1, Math.min(s.run.hp, runStats(s.run).maxHp));
  }
  return { ok: true, save: s };
}

export function saveGame(pid: ProfileId, s: VenomSave): void {
  save(key(pid), s);
}

// ---------------- 1日の きまり ----------------
// 完成体に した日は おしまい。おうちの ひとが「もう1かい」を ゆるすと、もう1ぴき そだてられる。
export function doneToday(s: VenomSave): boolean {
  return !s.run && s.lastDone === today() && s.extraDay !== today();
}

export function allowExtra(s: VenomSave): void {
  s.extraDay = today();
}

// ---------------- たまごガチャ（1かいの プレイに 1かい） ----------------
export function startRun(s: VenomSave): { run: Run; rarity: Rarity; isNew: boolean } {
  s.gachaCount++;
  const r = Math.random();
  let rarity: Rarity = r < RARITY.SR.rate ? 'SR' : r < RARITY.SR.rate + RARITY.R.rate ? 'R' : 'N';
  if (s.gachaCount === 1 && rarity === 'SR') rarity = 'R';
  const pool = SPECIES_IDS.filter((id) => SPECIES[id].rarity === rarity);
  // まだ でんどうに いない いきものが でやすい
  const done = new Set(s.hall.map((h) => h.species));
  const weighted = pool.flatMap((id) => (done.has(id) ? [id] : [id, id, id]));
  const species = weighted[Math.floor(Math.random() * weighted.length)];
  const isNew = !s.owned.includes(species);
  if (isNew) s.owned.push(species);
  if ((s.factsSeen[species] ?? 0) < 1) s.factsSeen[species] = 1;
  const bonus = emptyBonus();
  const run: Run = {
    uid: rid(),
    species,
    stage: 1,
    level: STAGE_START_LEVEL[1],
    hp: statsFor(species, STAGE_START_LEVEL[1], bonus).maxHp,
    bonus,
    fed: false,
    trained: false,
    wins: 0,
    bossTries: 0,
    moves: startMoves(species),
    startedAt: Date.now(),
  };
  s.run = run;
  return { run, rarity, isNew };
}

// ---------------- つぎに やること ----------------
export type Task = 'feed' | 'train' | 'battle' | 'boss';
export function stageDone(r: Run): boolean {
  return r.fed && r.trained && r.wins >= WINS_PER_STAGE;
}
export function nextTask(r: Run): Task {
  if (!r.fed) return 'feed';
  if (!r.trained) return 'train';
  if (r.wins < WINS_PER_STAGE) return 'battle';
  return 'boss';
}

// ---------------- ごはん ----------------
export type FeedResult =
  | { ok: true; stat: StatKey; gain: number; poisonUp: boolean }
  | { ok: false; reason: 'full' | 'wrong' };

export function feed(r: Run, food: FoodId): FeedResult {
  if (r.fed) return { ok: false, reason: 'full' };
  const sp = SPECIES[r.species];
  if (!sp.foods.includes(food)) return { ok: false, reason: 'wrong' };
  const f = FOODS[food];
  r.fed = true;
  // すがたが すすむほど たくさん つよく なる
  const gain = f.gain + (r.stage - 1);
  r.bonus[f.stat] += gain;
  if (f.stat === 'hp') r.hp += gain * HP_PER_POINT;
  let poisonUp = false;
  if (sp.poisonFromFood && Math.random() < 0.5) {
    r.bonus.atk += 1;
    poisonUp = true;
  }
  return { ok: true, stat: f.stat, gain: f.stat === 'hp' ? gain * HP_PER_POINT : gain, poisonUp };
}

export function foodChoices(species: string): FoodId[] {
  const sp = SPECIES[species];
  const others = (Object.keys(FOODS) as FoodId[]).filter((f) => !sp.foods.includes(f)).sort(() => Math.random() - 0.5);
  return [...sp.foods, ...others.slice(0, 4 - sp.foods.length)].sort(() => Math.random() - 0.5);
}

// ---------------- トレーニング ----------------
// もどりちは がめんに だす「ふえた かず」（たいりょくは ×3、どくたいせいは ×2）
export function applyTraining(r: Run, stat: StatKey, total: number): number {
  const gain = 1 + Math.floor(total / 3) + (r.stage - 1); // 0〜9点 → 1〜4（すがたが すすむと +1、+2）
  const pts = stat === 'res' ? gain * RES_PER_POINT : gain;
  r.bonus[stat] += pts;
  if (stat === 'hp') r.hp += gain * HP_PER_POINT;
  r.trained = true;
  return stat === 'hp' ? gain * HP_PER_POINT : pts;
}

// ---------------- やせいバトル ----------------
export function rollWild(r: Run): { species: string; level: number } {
  const area = SPECIES[r.species].area;
  const pool = SPECIES_IDS.filter((id) => SPECIES[id].area === area && id !== r.species);
  return { species: pool[Math.floor(Math.random() * pool.length)], level: r.level };
}

export function healFull(r: Run): void {
  r.hp = runStats(r).maxHp;
}

// かったら レベルが あがる（その すがたの なかで）
export function winWild(s: VenomSave, r: Run, enemy: string): { from: number; to: number } {
  if (!s.met.includes(enemy)) s.met.push(enemy);
  const from = r.level;
  r.wins = Math.min(WINS_PER_STAGE, r.wins + 1);
  r.level = Math.min(STAGE_START_LEVEL[r.stage] + 4, r.level + LV_PER_WIN);
  healFull(r);
  return { from, to: r.level };
}

// その すがたの やることが ぜんぶ おわったら、つぎの すがたへ
export function growUp(s: VenomSave, r: Run): boolean {
  if (!stageDone(r) || r.stage >= 3) return false;
  r.stage = (r.stage + 1) as Stage;
  r.level = STAGE_START_LEVEL[r.stage];
  r.fed = false;
  r.trained = false;
  r.wins = 0;
  healFull(r);
  if ((s.factsSeen[r.species] ?? 0) < r.stage) s.factsSeen[r.species] = r.stage;
  return true;
}

// ---------------- ボス ----------------
// まだ たおして いない ボスから じゅんばんに。ぜんぶ たおしたら じゅんばんに くりかえす。
export function bossFor(s: VenomSave): number {
  const i = BOSSES.findIndex((b) => !s.bossBeaten.includes(b.id));
  return i >= 0 ? i : s.hall.length % BOSSES.length;
}

export function bossStats(r: Run, bossIndex: number): Stats {
  const b = BOSSES[bossIndex];
  const p = runStats(r);
  const ease = Math.pow(0.7, r.bossTries); // まけるたびに すこし よわく なる
  return {
    maxHp: Math.round(p.maxHp * b.scale.hp * ease),
    atk: Math.round(p.atk * b.scale.atk * (0.5 + 0.5 * ease)),
    def: Math.round(p.def * b.scale.def),
    res: 0,
  };
}

export function loseBoss(r: Run): void {
  r.bossTries++;
  healFull(r);
}

// ボスに かった → 完成体！ でんどういり
export function completeRun(s: VenomSave, bossIndex: number): { entry: HallEntry; newCards: string[]; firstBoss: boolean } {
  const r = s.run!;
  const b = BOSSES[bossIndex];
  const firstBoss = !s.bossBeaten.includes(b.id);
  if (firstBoss) s.bossBeaten.push(b.id);
  const entry: HallEntry = { species: r.species, date: today(), boss: b.id };
  s.hall.push(entry);
  s.factsSeen[r.species] = 3;
  const newCards = MED_CARDS.filter((m) => m.species.includes(r.species) && !s.cards.includes(m.id)).map((m) => m.id);
  s.cards.push(...newCards);
  s.lastDone = today();
  if (s.extraDay === today()) s.extraDay = null; // ゆるされた「もう1かい」を つかった
  s.run = null;
  return { entry, newCards, firstBoss };
}

export const areaOf = (species: string) => AREAS.find((a) => a.id === SPECIES[species].area) ?? AREAS[0];
