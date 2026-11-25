// ベノムモンスターのセーブデータと、育成のルール。
import { load, save } from '../common/storage';
import type { ProfileId } from '../common/profiles';
import {
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
  type SpeciesId,
  type Stats,
} from './data';

export interface Move {
  id: string;
  name: string;
  types: PType[];
  power: number;
}

export interface Poop {
  x: number;
  y: number;
}

export interface Creature {
  uid: string;
  species: SpeciesId;
  stage: number; // 0たまご 1あかちゃん 2こども 3おとな
  exp: number;
  day: number;
  hunger: number;
  mood: number;
  clean: number;
  poops: Poop[];
  sick: boolean;
  train: Stats;
  trainsToday: number;
  petsToday: number;
  moves: Move[];
}

export interface VenomSave {
  v: 1;
  coins: number;
  essence: number;
  moto: Record<PType, number>;
  creatures: Creature[];
  current: string | null;
  freeGacha: boolean;
  seen: SpeciesId[];
  factsSeen: Partial<Record<SpeciesId, number>>;
  bossBeaten: BossId[];
  cards: string[];
  petWarned: boolean;
  gachaCount: number;
}

export const GACHA_COST = 100;
export const MAX_TRAINS = 3;
export const MAX_MOVES = 4;
export const STAGE_EXP = [0, 0, 15, 40]; // このexp以上で そのstageになる
const STAGE_FACTOR = [0, 0.55, 0.8, 1.0];

const key = (pid: ProfileId) => `venom.${pid}`;

export function newSave(): VenomSave {
  return {
    v: 1,
    coins: 0,
    essence: 0,
    moto: { shibire: 0, chi: 0, itami: 0, kowashi: 0 },
    creatures: [],
    current: null,
    freeGacha: true,
    seen: [],
    factsSeen: {},
    bossBeaten: [],
    cards: [],
    petWarned: false,
    gachaCount: 0,
  };
}

export function loadGame(pid: ProfileId): VenomSave {
  const s = load<VenomSave | null>(key(pid), null);
  if (!s || s.v !== 1) return newSave();
  return { ...newSave(), ...s };
}

export function saveGame(pid: ProfileId, s: VenomSave): void {
  save(key(pid), s);
}

export function current(s: VenomSave): Creature | null {
  return s.creatures.find((c) => c.uid === s.current) ?? null;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rid = () => Math.random().toString(36).slice(2, 10);

export function stats(c: Creature): Stats {
  const sp = SPECIES[c.species];
  const f = STAGE_FACTOR[c.stage] ?? 0;
  return {
    hp: Math.round(sp.base.hp * f) + c.train.hp * 3,
    doku: Math.round(sp.base.doku * f) + c.train.doku,
    def: Math.round(sp.base.def * f) + c.train.def,
    spd: Math.round(sp.base.spd * f) + c.train.spd,
  };
}

function naturalMove(id: SpeciesId): Move {
  const sp = SPECIES[id];
  return { id: `nat-${id}`, name: `${sp.name}の ${sp.moveName}`, types: [...sp.types], power: 1.1 };
}

export function basicMove(): Move {
  return { id: 'basic', name: 'たいあたり', types: [], power: 0.8 };
}

function newCreature(id: SpeciesId): Creature {
  return {
    uid: rid(),
    species: id,
    stage: 0,
    exp: 0,
    day: 1,
    hunger: 80,
    mood: 80,
    clean: 100,
    poops: [],
    sick: false,
    train: { hp: 0, doku: 0, def: 0, spd: 0 },
    trainsToday: 0,
    petsToday: 0,
    moves: [naturalMove(id)],
  };
}

// ---------------- ガチャ ----------------
export type GachaResult =
  | { kind: 'new'; species: SpeciesId; rarity: Rarity; creature: Creature }
  | { kind: 'dup'; species: SpeciesId; rarity: Rarity; essence: number };

export function canGacha(s: VenomSave): boolean {
  return s.freeGacha || s.coins >= GACHA_COST;
}

export function rollGacha(s: VenomSave): GachaResult | null {
  if (!canGacha(s)) return null;
  if (s.freeGacha) s.freeGacha = false;
  else s.coins -= GACHA_COST;
  s.gachaCount++;
  // はじめの1回は ノーマルが出やすい（すぐ育てられるように）
  const r = Math.random();
  let rarity: Rarity = r < RARITY.SR.rate ? 'SR' : r < RARITY.SR.rate + RARITY.R.rate ? 'R' : 'N';
  if (s.gachaCount === 1 && rarity === 'SR') rarity = 'R';
  const pool = SPECIES_IDS.filter((id) => SPECIES[id].rarity === rarity);
  const species = pool[Math.floor(Math.random() * pool.length)];
  const owned = s.creatures.some((c) => c.species === species);
  if (owned) {
    const essence = RARITY[rarity].essence;
    s.essence += essence;
    return { kind: 'dup', species, rarity, essence };
  }
  const creature = newCreature(species);
  s.creatures.push(creature);
  if (!s.current) s.current = creature.uid;
  return { kind: 'new', species, rarity, creature };
}

// ---------------- お世話 ----------------
export type FeedResult = { ok: true; poisonUp: boolean; full: false } | { ok: false; full: boolean };

export function feed(c: Creature, food: FoodId): FeedResult {
  const sp = SPECIES[c.species];
  if (c.hunger >= 95) return { ok: false, full: true };
  if (!sp.foods.includes(food)) {
    c.mood = clamp(c.mood - 5);
    return { ok: false, full: false };
  }
  c.hunger = clamp(c.hunger + 30);
  c.mood = clamp(c.mood + 5);
  c.exp += 1;
  let poisonUp = false;
  if (sp.poisonFromFood && c.stage >= 2 && Math.random() < 0.5) {
    c.train.doku += 1;
    poisonUp = true;
  }
  if (Math.random() < 0.55 && c.poops.length < 4) {
    c.poops.push({ x: 20 + Math.random() * 60, y: 62 + Math.random() * 22 });
    c.clean = clamp(c.clean - 15);
  }
  return { ok: true, poisonUp, full: false };
}

export function cleanPoop(c: Creature, i: number): void {
  c.poops.splice(i, 1);
  c.clean = clamp(c.clean + 15);
}

export function pet(c: Creature): boolean {
  if (c.petsToday >= 5) return false;
  c.petsToday++;
  c.mood = clamp(c.mood + 8);
  return true;
}

// 遊んでいる間、ゆっくりお腹がへる
export function tick(c: Creature): void {
  if (c.stage === 0) return;
  c.hunger = clamp(c.hunger - 2);
  c.mood = clamp(c.mood - 1);
}

export function applyTraining(c: Creature, stat: keyof Stats, points: number): void {
  c.train[stat] += points;
  c.trainsToday++;
  c.hunger = clamp(c.hunger - 10);
  c.mood = clamp(c.mood + 4);
}

// ---------------- ねる（1日すすむ） ----------------
export interface SleepReport {
  hatched: boolean;
  grewTo: number | null;
  exp: number;
  coins: number;
  careBonus: boolean;
  moto: PType | null;
  gotSick: boolean;
  cured: boolean;
  newFact: string | null;
  newSpecies: boolean;
}

export function sleep(s: VenomSave, c: Creature): SleepReport {
  const report: SleepReport = {
    hatched: false,
    grewTo: null,
    exp: 0,
    coins: 10,
    careBonus: false,
    moto: null,
    gotSick: false,
    cured: false,
    newFact: null,
    newSpecies: false,
  };
  if (c.stage === 0) {
    c.stage = 1;
    report.hatched = true;
    if (!s.seen.includes(c.species)) {
      s.seen.push(c.species);
      report.newSpecies = true;
      report.coins += 20;
    }
  } else if (c.sick) {
    c.sick = false;
    report.cured = true;
    c.hunger = clamp(Math.max(c.hunger, 50));
    c.mood = clamp(Math.max(c.mood, 50));
  } else {
    const care = (c.hunger + c.mood + c.clean) / 3;
    report.exp = Math.round(care / 10) + (c.trainsToday > 0 ? 2 : 0);
    c.exp += report.exp;
    if (c.hunger >= 60 && c.mood >= 60 && c.clean >= 60) {
      report.careBonus = true;
      report.coins += 30;
    }
    if (c.hunger < 20 || c.clean < 20 || c.mood < 15) {
      c.sick = true;
      report.gotSick = true;
    }
    const sp = SPECIES[c.species];
    const t = sp.types[(c.day - 1) % sp.types.length];
    s.moto[t]++;
    report.moto = t;
    const next = c.stage + 1;
    if (c.stage < 3 && c.exp >= STAGE_EXP[next] && !c.sick) {
      c.stage = next;
      report.grewTo = next;
    }
  }
  // 図鑑の豆知識（生まれた→1つめ、こども→2つめ、おとな→3つめ）
  const known = s.factsSeen[c.species] ?? 0;
  if (c.stage > known) {
    s.factsSeen[c.species] = c.stage;
    report.newFact = SPECIES[c.species].facts[c.stage - 1];
  }
  c.day++;
  c.hunger = clamp(c.hunger - 30);
  c.mood = clamp(c.mood - 20);
  c.clean = clamp(c.clean - 10 - c.poops.length * 10);
  c.trainsToday = 0;
  c.petsToday = 0;
  s.coins += report.coins;
  return report;
}

// ---------------- どくラボ ----------------
export function essenceToMoto(s: VenomSave, t: PType): boolean {
  if (s.essence <= 0) return false;
  s.essence--;
  s.moto[t]++;
  return true;
}

export type CraftResult = { move: Move; newCard: string | null };

export function craft(s: VenomSave, a: PType, b: PType): CraftResult | null {
  if (a === b ? s.moto[a] < 2 : s.moto[a] < 1 || s.moto[b] < 1) return null;
  s.moto[a]--;
  s.moto[b]--;
  const move: Move = {
    id: rid(),
    name: comboName(a, b),
    types: [a, b],
    power: a === b ? 1.35 : 1.25,
  };
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

export function bossUnlocked(s: VenomSave, i: number): boolean {
  if (i === 0) return true;
  return s.bossBeaten.includes(BOSSES[i - 1].id);
}

export function giveBossReward(s: VenomSave, bossIndex: number): { coins: number; moto: number; first: boolean } {
  const b = BOSSES[bossIndex];
  const first = !s.bossBeaten.includes(b.id);
  const coins = first ? b.reward.coins : Math.round(b.reward.coins / 3);
  const moto = first ? b.reward.moto : 1;
  s.coins += coins;
  for (const t of PTYPE_IDS) s.moto[t] += moto;
  if (first) s.bossBeaten.push(b.id);
  return { coins, moto, first };
}

export function foodChoices(c: Creature): FoodId[] {
  const sp = SPECIES[c.species];
  const others = (Object.keys(FOODS) as FoodId[]).filter((f) => !sp.foods.includes(f));
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 2);
  return [...sp.foods, ...shuffled].sort(() => Math.random() - 0.5);
}
