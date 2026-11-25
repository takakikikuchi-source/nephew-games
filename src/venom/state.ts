// ベノムモンスターのセーブデータと、育成のルール（v2：レベル・チーム・強さ3つ）
import { load, save } from '../common/storage';
import type { ProfileId } from '../common/profiles';
import {
  AREAS,
  BOSSES,
  FOODS,
  MED_CARDS,
  PTYPE_IDS,
  RARITY,
  SPECIES,
  SPECIES_IDS,
  comboKey,
  comboName,
  type BossId,
  type FoodId,
  type PType,
  type Rarity,
  type StatKey,
} from './data';

export const SAVE_VERSION = 2;
export const GACHA_COST = 100;
export const MAX_MEALS = 3;
export const MAX_TRAINS = 3;
export const MAX_MOVES = 4;
export const MAX_LEVEL = 30;
export const TEAM_SIZE = 3;
export const ESSENCE_EXP = 40;
export const HP_PER_POINT = 3;

export interface Move {
  id: string;
  name: string;
  types: PType[];
  power: number;
}

export interface Creature {
  uid: string;
  species: string;
  hatched: boolean;
  level: number;
  exp: number;
  hp: number; // いまのHP
  bonus: Record<StatKey, number>; // ごはん・トレーニングで ふえた ぶん
  mealsToday: number;
  trainsToday: number;
  moves: Move[];
}

export interface VenomSave {
  v: number;
  day: number;
  coins: number;
  essence: number;
  moto: Record<PType, number>;
  creatures: Creature[];
  team: string[]; // uid（3びきまで）
  focus: string | null; // ホームで えらんでいる 1ぴき
  freeGacha: boolean;
  gachaCount: number;
  owned: string[]; // なかまに したことが ある しゅるい
  met: string[]; // バトルで であった しゅるい
  factsSeen: Record<string, number>;
  bossBeaten: BossId[];
  cards: string[];
  petWarned: boolean;
}

export interface Stats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
}

const key = (pid: ProfileId) => `venom.${pid}`;
const rid = () => Math.random().toString(36).slice(2, 10);

export function newSave(): VenomSave {
  return {
    v: SAVE_VERSION,
    day: 1,
    coins: 0,
    essence: 0,
    moto: { shibire: 0, chi: 0, itami: 0, kowashi: 0 },
    creatures: [],
    team: [],
    focus: null,
    freeGacha: true,
    gachaCount: 0,
    owned: [],
    met: [],
    factsSeen: {},
    bossBeaten: [],
    cards: [],
    petWarned: false,
  };
}

// ---------------- 強さの計算 ----------------
const levelFactor = (lv: number) => 0.4 + 0.03 * lv;

export function statsFor(species: string, level: number, bonus?: Record<StatKey, number>): Stats {
  const b = SPECIES[species].base;
  const f = levelFactor(level);
  return {
    maxHp: Math.round(b.hp * f) + (bonus?.hp ?? 0) * HP_PER_POINT,
    atk: Math.round(b.atk * f) + (bonus?.atk ?? 0),
    def: Math.round(b.def * f) + (bonus?.def ?? 0),
    spd: Math.round(b.spd * f),
  };
}

export const stats = (c: Creature): Stats => statsFor(c.species, c.level, c.bonus);

// 見た目の段階：Lv1〜9 あかちゃん、10〜19 こども、20〜 おとな
export function stageOf(c: Creature): number {
  if (!c.hatched) return 0;
  return c.level >= 20 ? 3 : c.level >= 10 ? 2 : 1;
}

// つぎの レベルまでの けいけんち（はじめは数回のバトル、あとになるほど多く）
export function expToNext(level: number): number {
  return Math.round((2 + 0.3 * level) * 1.6 * (5 + 4 * level));
}

export function enemyExp(level: number): number {
  return 5 + 4 * level;
}

// ---------------- ロード・セーブ（版の移行つき） ----------------
interface V1Creature {
  uid: string;
  species: string;
  stage: number;
  day: number;
  train?: { hp: number; doku: number; def: number };
  moves?: Move[];
}

function migrate1to2(d: Record<string, unknown>): Record<string, unknown> {
  const old = (d.creatures as V1Creature[] | undefined) ?? [];
  const creatures: Creature[] = old
    .filter((c) => SPECIES[c.species])
    .map((c) => {
      const level = c.stage >= 3 ? 20 : c.stage === 2 ? 10 : 1;
      const bonus = { hp: c.train?.hp ?? 0, atk: c.train?.doku ?? 0, def: c.train?.def ?? 0 };
      return {
        uid: c.uid,
        species: c.species,
        hatched: c.stage > 0,
        level,
        exp: 0,
        hp: statsFor(c.species, level, bonus).maxHp,
        bonus,
        mealsToday: 0,
        trainsToday: 0,
        moves: c.moves?.length ? c.moves : [naturalMove(c.species)],
      };
    });
  return {
    ...d,
    v: 2,
    day: Math.max(1, ...old.map((c) => c.day ?? 1)),
    creatures,
    team: creatures.slice(0, TEAM_SIZE).map((c) => c.uid),
    focus: (d.current as string | null) ?? creatures[0]?.uid ?? null,
    owned: (d.seen as string[] | undefined) ?? [],
    met: [],
  };
}

const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = { 1: migrate1to2 };

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
  // こわれた データを はずす
  s.creatures = s.creatures.filter((c) => c && SPECIES[c.species]);
  s.team = s.team.filter((u) => s.creatures.some((c) => c.uid === u));
  if (s.focus && !s.creatures.some((c) => c.uid === s.focus)) s.focus = s.creatures[0]?.uid ?? null;
  return { ok: true, save: s };
}

export function saveGame(pid: ProfileId, s: VenomSave): void {
  save(key(pid), s);
}

export function focused(s: VenomSave): Creature | null {
  return s.creatures.find((c) => c.uid === s.focus) ?? s.creatures[0] ?? null;
}

export function teamMembers(s: VenomSave): Creature[] {
  return s.team.map((u) => s.creatures.find((c) => c.uid === u)).filter((c): c is Creature => !!c);
}

export function topLevel(s: VenomSave): number {
  return Math.max(1, ...s.creatures.filter((c) => c.hatched).map((c) => c.level));
}

export function areaUnlocked(s: VenomSave, i: number): boolean {
  return topLevel(s) >= AREAS[i].unlockLevel;
}

// ---------------- わざ ----------------
export function naturalMove(id: string): Move {
  const sp = SPECIES[id];
  return { id: `nat-${id}`, name: `${sp.name}の ${sp.moveName}`, types: [...sp.types], power: 1.1 };
}

export function basicMove(): Move {
  return { id: 'basic', name: 'たいあたり', types: [], power: 0.8 };
}

function newCreature(id: string): Creature {
  const bonus = { hp: 0, atk: 0, def: 0 };
  return {
    uid: rid(),
    species: id,
    hatched: false,
    level: 1,
    exp: 0,
    hp: statsFor(id, 1, bonus).maxHp,
    bonus,
    mealsToday: 0,
    trainsToday: 0,
    moves: [naturalMove(id)],
  };
}

// ---------------- ガチャ ----------------
export type GachaResult =
  | { kind: 'new'; species: string; rarity: Rarity; creature: Creature }
  | { kind: 'dup'; species: string; rarity: Rarity; essence: number };

export function canGacha(s: VenomSave): boolean {
  return s.freeGacha || s.coins >= GACHA_COST;
}

export function rollGacha(s: VenomSave): GachaResult | null {
  if (!canGacha(s)) return null;
  if (s.freeGacha) s.freeGacha = false;
  else s.coins -= GACHA_COST;
  s.gachaCount++;
  const r = Math.random();
  let rarity: Rarity = r < RARITY.SR.rate ? 'SR' : r < RARITY.SR.rate + RARITY.R.rate ? 'R' : 'N';
  if (s.gachaCount === 1 && rarity === 'SR') rarity = 'R';
  const pool = SPECIES_IDS.filter((id) => SPECIES[id].rarity === rarity);
  const species = pool[Math.floor(Math.random() * pool.length)];
  if (s.creatures.some((c) => c.species === species)) {
    const essence = RARITY[rarity].essence;
    s.essence += essence;
    return { kind: 'dup', species, rarity, essence };
  }
  const creature = newCreature(species);
  s.creatures.push(creature);
  if (s.team.length < TEAM_SIZE) s.team.push(creature.uid);
  if (!s.focus) s.focus = creature.uid;
  return { kind: 'new', species, rarity, creature };
}

// ---------------- けいけんち・レベル ----------------
export interface LevelUp {
  uid: string;
  from: number;
  to: number;
  newStage: boolean;
}

export function addExp(s: VenomSave, c: Creature, amount: number): LevelUp | null {
  if (!c.hatched || c.level >= MAX_LEVEL) return null;
  const from = c.level;
  const stageBefore = stageOf(c);
  c.exp += amount;
  while (c.level < MAX_LEVEL && c.exp >= expToNext(c.level)) {
    c.exp -= expToNext(c.level);
    const before = stats(c).maxHp;
    c.level++;
    c.hp += stats(c).maxHp - before; // ふえた ぶんだけ HPも ふえる
  }
  if (c.level >= MAX_LEVEL) c.exp = 0;
  if (c.level === from) return null;
  const st = stageOf(c);
  if (st > (s.factsSeen[c.species] ?? 0)) s.factsSeen[c.species] = st;
  return { uid: c.uid, from, to: c.level, newStage: st > stageBefore };
}

// ---------------- ごはん ----------------
export type FeedResult =
  | { ok: true; stat: StatKey; gain: number; poisonUp: boolean }
  | { ok: false; reason: 'full' | 'wrong' | 'egg' };

export function feed(c: Creature, food: FoodId): FeedResult {
  if (!c.hatched) return { ok: false, reason: 'egg' };
  if (c.mealsToday >= MAX_MEALS) return { ok: false, reason: 'full' };
  const sp = SPECIES[c.species];
  if (!sp.foods.includes(food)) return { ok: false, reason: 'wrong' };
  const f = FOODS[food];
  c.mealsToday++;
  c.bonus[f.stat] += f.gain;
  if (f.stat === 'hp') c.hp += f.gain * HP_PER_POINT;
  let poisonUp = false;
  if (sp.poisonFromFood && Math.random() < 0.5) {
    c.bonus.atk += 1;
    poisonUp = true;
  }
  return { ok: true, stat: f.stat, gain: f.gain, poisonUp };
}

export function foodChoices(c: Creature): FoodId[] {
  const sp = SPECIES[c.species];
  const others = (Object.keys(FOODS) as FoodId[]).filter((f) => !sp.foods.includes(f)).sort(() => Math.random() - 0.5);
  return [...sp.foods, ...others.slice(0, 4 - sp.foods.length)].sort(() => Math.random() - 0.5);
}

// ---------------- トレーニング ----------------
export function applyTraining(c: Creature, stat: StatKey, total: number): number {
  const gain = 1 + Math.floor(total / 3); // 0〜9点 → 1〜4
  c.bonus[stat] += gain;
  if (stat === 'hp') c.hp += gain * HP_PER_POINT;
  c.trainsToday++;
  return gain;
}

// ---------------- エキス ----------------
export function useEssence(s: VenomSave, c: Creature): LevelUp | null | false {
  if (s.essence <= 0 || !c.hatched || c.level >= MAX_LEVEL) return false;
  s.essence--;
  return addExp(s, c, ESSENCE_EXP);
}

export function essenceToMoto(s: VenomSave, t: PType): boolean {
  if (s.essence <= 0) return false;
  s.essence--;
  s.moto[t]++;
  return true;
}

// ---------------- ねる ----------------
export interface SleepReport {
  hatched: string[];
  coins: number;
  moto: PType | null;
  newOwned: string[];
}

export function sleep(s: VenomSave): SleepReport {
  const r: SleepReport = { hatched: [], coins: 10, moto: null, newOwned: [] };
  for (const c of s.creatures) {
    if (!c.hatched) {
      c.hatched = true;
      r.hatched.push(c.uid);
      if (!s.owned.includes(c.species)) {
        s.owned.push(c.species);
        r.newOwned.push(c.species);
        r.coins += 20;
      }
      if ((s.factsSeen[c.species] ?? 0) < 1) s.factsSeen[c.species] = 1;
    }
    c.hp = stats(c).maxHp;
    c.mealsToday = 0;
    c.trainsToday = 0;
  }
  const lead = teamMembers(s).find((c) => c.hatched);
  if (lead) {
    const types = SPECIES[lead.species].types;
    r.moto = types[s.day % types.length];
    s.moto[r.moto]++;
  }
  s.day++;
  s.coins += r.coins;
  return r;
}

// ---------------- どくラボ ----------------
export type CraftResult = { move: Move; newCard: string | null };

export function craft(s: VenomSave, a: PType, b: PType): CraftResult | null {
  if (a === b ? s.moto[a] < 2 : s.moto[a] < 1 || s.moto[b] < 1) return null;
  s.moto[a]--;
  s.moto[b]--;
  const move: Move = { id: rid(), name: comboName(a, b), types: [a, b], power: a === b ? 1.35 : 1.25 };
  let newCard: string | null = null;
  const card = MED_CARDS.find((m) => comboKey(m.unlock[0], m.unlock[1]) === comboKey(a, b));
  if (card && !s.cards.includes(card.id)) {
    s.cards.push(card.id);
    newCard = card.id;
  }
  return { move, newCard };
}

export function learn(c: Creature, m: Move, replaceIndex?: number): void {
  if (replaceIndex != null && replaceIndex >= 0 && replaceIndex < c.moves.length) c.moves[replaceIndex] = m;
  else if (c.moves.length < MAX_MOVES) c.moves.push(m);
}

// ---------------- バトルの ほうび ----------------
export function wildReward(s: VenomSave, enemies: { species: string; level: number }[], survivors: Creature[]): { exp: number; coins: number; moto: PType[]; ups: LevelUp[] } {
  const exp = enemies.reduce((a, e) => a + enemyExp(e.level), 0);
  const coins = enemies.reduce((a, e) => a + 5 + 2 * e.level, 0);
  const moto: PType[] = [];
  for (const e of enemies) {
    if (!s.met.includes(e.species)) s.met.push(e.species);
    if (Math.random() < 0.4) {
      const t = SPECIES[e.species].types[0];
      s.moto[t]++;
      moto.push(t);
    }
  }
  s.coins += coins;
  const ups = survivors.map((c) => addExp(s, c, exp)).filter((u): u is LevelUp => !!u);
  return { exp, coins, moto, ups };
}

export function bossReward(s: VenomSave, bossIndex: number, survivors: Creature[]): { coins: number; moto: number; exp: number; first: boolean; ups: LevelUp[] } {
  const b = BOSSES[bossIndex];
  const first = !s.bossBeaten.includes(b.id);
  const coins = first ? b.reward.coins : Math.round(b.reward.coins / 3);
  const moto = first ? b.reward.moto : 1;
  const exp = first ? b.reward.exp : Math.round(b.reward.exp / 3);
  s.coins += coins;
  for (const t of PTYPE_IDS) s.moto[t] += moto;
  if (first) s.bossBeaten.push(b.id);
  const ups = survivors.map((c) => addExp(s, c, exp)).filter((u): u is LevelUp => !!u);
  return { coins, moto, exp, first, ups };
}

// やせいの てきを えらぶ
export function rollWild(areaIndex: number): { species: string; level: number }[] {
  const a = AREAS[areaIndex];
  const pool = SPECIES_IDS.filter((id) => SPECIES[id].area === a.id);
  const n = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3;
  return Array.from({ length: n }, () => ({
    species: pool[Math.floor(Math.random() * pool.length)],
    level: a.levels[0] + Math.floor(Math.random() * (a.levels[1] - a.levels[0] + 1)),
  }));
}
