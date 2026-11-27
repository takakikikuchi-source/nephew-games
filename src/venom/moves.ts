// わざと スキル（要件定義書「わざとスキル」「生き物とわざ（30種類）」）
// いきものは わざを 3つ もつ（おなじ 手は 2つまで）。わざには スキルが 1つ つく ことが ある。
// つかった わざは スキルの つよさに おうじて 0〜2ターン やすみ（2ターンの わざは つよいが はんどうが ある）。
import type { Hand } from './data';

export type SkillId =
  | 'rensoku' | 'hayawaza' | 'machibuse' | 'zusshiri'
  | 'moudoku' | 'jiwajiwa' | 'kakujitsu' | 'taiseiwari'
  | 'dokuhifu' | 'kakureru' | 'ikaku' | 'fukuramu';

export interface SkillInfo {
  name: string;
  desc: string; // こどもむけの みじかい せつめい
  cd: 1 | 2; // つかったあと やすむ ターン
}

export const SKILLS: Record<SkillId, SkillInfo> = {
  rensoku: { name: 'れんぞく', desc: '2かい こうげき', cd: 1 },
  hayawaza: { name: 'はやわざ', desc: 'あいこでも さきに うごく', cd: 1 },
  machibuse: { name: 'まちぶせ', desc: 'じゃんけんに かつと ダメージ 1.6ばい', cd: 2 },
  zusshiri: { name: 'ずっしり', desc: 'パーの まもりを やぶる', cd: 2 },
  moudoku: { name: 'もうどく', desc: 'どくの こうか 2ばい', cd: 2 },
  jiwajiwa: { name: 'じわじわ', desc: 'どくが 5ターン つづく', cd: 1 },
  kakujitsu: { name: 'かくじつ', desc: 'どくが かならず きく', cd: 1 },
  taiseiwari: { name: 'たいせいわり', desc: 'あいての どくたいせいを むしする', cd: 2 },
  dokuhifu: { name: 'どくのひふ', desc: 'うけとめると あいてにも どく', cd: 2 },
  kakureru: { name: 'かくれる', desc: 'その ターンの こうげきを ぜんぶ よける', cd: 1 },
  ikaku: { name: 'いかく', desc: 'あいての こうげきを 2ターン さげる', cd: 1 },
  fukuramu: { name: 'ふくらむ', desc: 'まもり 8わり＋かいふく 2ばい', cd: 2 },
};

// [手, なまえ, スキル]
export type MoveDef = [Hand, string, SkillId?];

export const moveCd = (m: MoveDef): number => (m[2] ? SKILLS[m[2]].cd : 0);
export const moveKey = (m: MoveDef): string => `${m[0]}:${m[1]}`;

export const MOVESETS: Record<string, { start: [MoveDef, MoveDef, MoveDef]; learn: MoveDef[] }> = {
  seaka: {
    start: [['choki', 'どくのキバ', 'moudoku'], ['choki', 'いとで しばる', 'kakujitsu'], ['pa', 'しんだ ふり', 'kakureru']],
    learn: [['gu', 'とびかかり', 'hayawaza'], ['gu', 'かみつき']],
  },
  suzumebachi: {
    start: [['gu', 'おおあごで かむ', 'zusshiri'], ['gu', 'たいあたり', 'hayawaza'], ['choki', 'どくばり', 'rensoku']],
    learn: [['pa', 'あごを カチカチ', 'ikaku'], ['choki', 'どくを ふきかける', 'taiseiwari']],
  },
  mamushi: {
    start: [['choki', 'どくのキバ', 'jiwajiwa'], ['gu', 'まちぶせ かみつき', 'machibuse'], ['pa', 'とぐろを まく']],
    learn: [['choki', 'ふかい キバ', 'moudoku'], ['pa', 'くさむらに かくれる', 'kakureru']],
  },
  yamakagashi: {
    start: [['choki', 'おくばの どく', 'jiwajiwa'], ['pa', 'くびの どくで まもる', 'dokuhifu'], ['pa', 'くびを ひろげる', 'ikaku']],
    learn: [['gu', 'すばやい かみつき', 'hayawaza'], ['choki', 'おくばの もうどく', 'moudoku']],
  },
  tobizu: {
    start: [['gu', 'かみつき', 'rensoku'], ['gu', 'とびかかり', 'hayawaza'], ['choki', 'どくの あご']],
    learn: [['choki', 'どくの おおあご', 'moudoku'], ['pa', 'まるくなる']],
  },
  kabaki: {
    start: [['choki', 'どくのキバ', 'moudoku'], ['gu', 'とびかかり'], ['pa', 'ススキの すに こもる', 'kakureru']],
    learn: [['choki', 'じわじわ キバ', 'jiwajiwa'], ['pa', 'キバを むける', 'ikaku']],
  },
  mitsubachi: {
    start: [['choki', 'どくばり'], ['gu', 'みんなで たいあたり', 'rensoku'], ['pa', 'なかまと まもる', 'fukuramu']],
    learn: [['choki', 'のこった はり', 'jiwajiwa'], ['pa', 'ねつで つつむ', 'ikaku']],
  },
  iraga: {
    start: [['pa', 'どくの とげで まもる', 'dokuhifu'], ['pa', 'まゆに こもる', 'fukuramu'], ['choki', 'どくの とげ']],
    learn: [['choki', 'とげ チクチク', 'rensoku'], ['gu', 'ずつき']],
  },
  imori: {
    start: [['pa', 'あかい おなかを みせる', 'ikaku'], ['pa', 'どくの ひふ', 'dokuhifu'], ['choki', 'どくの ねばねば']],
    learn: [['choki', 'フグと おなじ どく', 'moudoku'], ['gu', 'たいあたり']],
  },
  hikigaeru: {
    start: [['pa', 'からだを ふくらませる', 'fukuramu'], ['pa', 'どくの しる', 'dokuhifu'], ['gu', 'したで パクッ', 'machibuse']],
    learn: [['choki', 'どくの しる', 'jiwajiwa'], ['gu', 'のしかかり', 'zusshiri']],
  },
  shidoni: {
    start: [['choki', 'もうどくの キバ', 'moudoku'], ['choki', 'なんども かむ', 'rensoku'], ['pa', 'キバを ふりあげる', 'ikaku']],
    learn: [['gu', 'とびかかり', 'hayawaza'], ['choki', 'さいきょうの キバ', 'kakujitsu']],
  },
  sasori: {
    start: [['gu', 'はさみパンチ'], ['choki', 'しっぽの どくばり'], ['pa', 'はさみで ガード']],
    learn: [['choki', 'しっぽ れんだ', 'rensoku'], ['pa', 'すなに もぐる', 'kakureru']],
  },
  deathstalker: {
    start: [['choki', 'もうどくの はり', 'moudoku'], ['choki', 'すばやい はり', 'hayawaza'], ['pa', 'すなに もぐる', 'kakureru']],
    learn: [['gu', 'はさみで つかむ'], ['choki', 'ねらいうちの はり', 'kakujitsu']],
  },
  garagara: {
    start: [['pa', 'ガラガラ いかく', 'ikaku'], ['choki', 'どくのキバ', 'jiwajiwa'], ['gu', 'まちぶせ かみつき', 'machibuse']],
    learn: [['choki', 'こわす どく', 'taiseiwari'], ['pa', 'とぐろを まく', 'fukuramu']],
  },
  gila: {
    start: [['gu', 'かみついて はなさない', 'rensoku'], ['choki', 'どくの かみつき', 'jiwajiwa'], ['pa', 'かたい うろこ']],
    learn: [['gu', 'のしかかり', 'zusshiri'], ['pa', 'あなに かくれる', 'kakureru']],
  },
  taipan: {
    start: [['choki', 'さいきょうの キバ', 'moudoku'], ['choki', 'れんぞく かみつき', 'rensoku'], ['gu', 'すばやい かみつき', 'hayawaza']],
    learn: [['choki', 'ねらいうち キバ', 'kakujitsu'], ['pa', 'すなに かくれる', 'kakureru']],
  },
  minokasago: {
    start: [['pa', 'ひれを ひろげる', 'ikaku'], ['pa', 'とげの ひれで まもる', 'dokuhifu'], ['choki', 'どくの とげ']],
    learn: [['gu', 'まるのみ', 'machibuse'], ['choki', 'とげ つきさし', 'jiwajiwa']],
  },
  akaei: {
    start: [['pa', 'すなに もぐる', 'kakureru'], ['choki', 'しっぽの とげ', 'jiwajiwa'], ['gu', 'しっぽムチ']],
    learn: [['choki', 'ギザギザの とげ', 'taiseiwari'], ['pa', 'ひらべったく まもる']],
  },
  torafugu: {
    start: [['pa', 'ぷくっと ふくらむ', 'fukuramu'], ['pa', 'フグどくの からだ', 'dokuhifu'], ['gu', 'かたい はで かむ', 'zusshiri']],
    learn: [['choki', 'フグどく', 'moudoku'], ['gu', 'ガブリ', 'rensoku']],
  },
  hyoumon: {
    start: [['pa', 'あおい わを ひからせる', 'ikaku'], ['choki', 'フグどくの くちばし', 'moudoku'], ['pa', 'すみを はく', 'kakureru']],
    learn: [['choki', 'だえきの どく', 'kakujitsu'], ['gu', 'からみつき']],
  },
  onidaruma: {
    start: [['pa', 'いしに なりきる', 'kakureru'], ['pa', 'もうどくの せなか', 'dokuhifu'], ['gu', 'まるのみ', 'machibuse']],
    learn: [['choki', 'もうどくの とげ', 'moudoku'], ['pa', 'ごつごつ ガード', 'fukuramu']],
  },
  katsuo: {
    start: [['choki', 'どくの しょくしゅ', 'rensoku'], ['choki', 'からみつく しょくしゅ', 'jiwajiwa'], ['pa', 'ふわふわ ただよう', 'kakureru']],
    learn: [['choki', 'はり だらけの しょくしゅ', 'moudoku'], ['pa', 'うきぶくろ', 'fukuramu']],
  },
  anboina: {
    start: [['choki', 'どくの もり', 'kakujitsu'], ['choki', 'さかなを とめる どく', 'moudoku'], ['pa', 'からに こもる', 'fukuramu']],
    learn: [['gu', 'からで ぶつかる', 'zusshiri'], ['pa', 'すなに もぐる', 'kakureru']],
  },
  erabu: {
    start: [['choki', 'うみの キバ', 'moudoku'], ['gu', 'かみつき'], ['pa', 'いわかげに かくれる', 'kakureru']],
    learn: [['choki', 'しずかな キバ', 'kakujitsu'], ['pa', 'うみに もぐる']],
  },
  kamonohashi: {
    start: [['choki', 'どくの けづめ', 'jiwajiwa'], ['gu', 'くちばしアタック'], ['pa', 'みずに もぐる', 'kakureru']],
    learn: [['gu', 'けりあげ', 'zusshiri'], ['choki', 'けづめ れんげき', 'rensoku']],
  },
  yadoku: {
    start: [['pa', 'どくの ひふ', 'dokuhifu'], ['pa', 'あざやかな いろ', 'ikaku'], ['choki', 'どくの ひふ ぺたり', 'moudoku']],
    learn: [['gu', 'ジャンプアタック', 'hayawaza'], ['pa', 'ぴょんと よける', 'kakureru']],
  },
  habu: {
    start: [['choki', 'どくのキバ', 'jiwajiwa'], ['gu', 'のびる かみつき', 'hayawaza'], ['gu', 'まちぶせ かみつき', 'machibuse']],
    learn: [['choki', 'こわす どく', 'taiseiwari'], ['pa', 'とぐろを まく']],
  },
  cobra: {
    start: [['pa', 'フードを ひろげる', 'ikaku'], ['choki', 'キングのキバ', 'kakujitsu'], ['gu', 'たちあがって かむ', 'zusshiri']],
    learn: [['choki', 'たっぷり どく', 'moudoku'], ['gu', 'すばやい かみつき', 'hayawaza']],
  },
  mamba: {
    start: [['gu', 'すばやい かみつき', 'hayawaza'], ['gu', 'れんぞく かみつき', 'rensoku'], ['choki', 'マンバの キバ']],
    learn: [['choki', 'もうどくの キバ', 'moudoku'], ['pa', 'くちを ひらいて いかく', 'ikaku']],
  },
  loris: {
    start: [['choki', 'どくの かみつき', 'jiwajiwa'], ['pa', 'うでを あたまに あげる', 'dokuhifu'], ['pa', 'じっと うごかない', 'kakureru']],
    learn: [['gu', 'パンチ'], ['choki', 'うでの どく', 'moudoku']],
  },
};

// ボスの わざ（✊✌️🖐️を 1つずつ。ボスは どくを もたないので ✌️は「するどい こうげき」）
export const BOSS_MOVES: Record<string, [MoveDef, MoveDef, MoveDef]> = {
  hebikui: [['gu', 'キック', 'zusshiri'], ['choki', 'くちばしで つつく', 'rensoku'], ['pa', 'つばさを ひろげる', 'ikaku']],
  mongoose: [['gu', 'すばやい かみつき', 'hayawaza'], ['choki', 'するどい きば', 'rensoku'], ['pa', 'けを さかだてる', 'ikaku']],
  mitsuanaguma: [['gu', 'のしかかり', 'zusshiri'], ['choki', 'ながい つめで ひっかく', 'rensoku'], ['pa', 'ぶあつい かわ', 'fukuramu']],
};

// おなじ 手は 2つまで
export function handsOk(moves: MoveDef[]): boolean {
  const c: Record<string, number> = {};
  for (const m of moves) c[m[0]] = (c[m[0]] ?? 0) + 1;
  return Object.values(c).every((n) => n <= 2);
}
