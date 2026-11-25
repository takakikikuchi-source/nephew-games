// ベノムモンスターのデータ。文章は「{漢字|かんじ}」でふりがなを付ける。
// 事実の文章は、図鑑・ヒントにそのまま出る。

export type PType = 'shibire' | 'chi' | 'itami' | 'kowashi';
export const PTYPE_IDS: PType[] = ['shibire', 'chi', 'itami', 'kowashi'];

export interface PTypeInfo {
  name: string;
  real: string;
  body: string;
  effect: string;
  color: string;
  icon: string;
}

export const PTYPES: Record<PType, PTypeInfo> = {
  shibire: {
    name: 'しびれどく',
    real: '{神経毒|しんけいどく}',
    body: 'しんけいの しんごうを じゃまして、しびれたり うごけなく なったり する。',
    effect: 'あいてが しびれて、うごけなく なることが ある。',
    color: '#f2c230',
    icon: '⚡',
  },
  chi: {
    name: 'ちのどく',
    real: '{出血毒|しゅっけつどく}',
    body: '{血|ち}が とまりにくく なったり、からだの なかで {血|ち}が でたり する。',
    effect: 'まいターン、あいてに すこしずつ ダメージ。',
    color: '#e03131',
    icon: '🩸',
  },
  itami: {
    name: 'いたみどく',
    real: 'いたみを おこす せいぶん',
    body: 'とても つよい いたみを おこす。',
    effect: 'あいての こうげきが さがる。',
    color: '#f08c00',
    icon: '💥',
  },
  kowashi: {
    name: 'こわしどく',
    real: '{細胞毒|さいぼうどく}',
    body: 'からだを つくっている {小|ちい}さな つぶ（さいぼう）を こわす。',
    effect: 'あいての ぼうぎょが さがる。',
    color: '#7048e8',
    icon: '🧪',
  },
};

export type FoodId = 'korogi' | 'imomushi' | 'hae' | 'ari' | 'jueki' | 'nezumi' | 'tokage' | 'hebi' | 'ringo' | 'onigiri' | 'kyabetsu' | 'keki';

export const FOODS: Record<FoodId, { name: string; emoji: string; junk?: boolean }> = {
  korogi: { name: 'コオロギ', emoji: '🦗' },
  imomushi: { name: 'イモムシ', emoji: '🐛' },
  hae: { name: 'ハエ', emoji: '🪰' },
  ari: { name: 'アリ', emoji: '🐜' },
  jueki: { name: 'じゅえき', emoji: '🌳' },
  nezumi: { name: 'ネズミ', emoji: '🐭' },
  tokage: { name: 'トカゲ', emoji: '🦎' },
  hebi: { name: 'ヘビ', emoji: '🐍' },
  ringo: { name: 'りんご', emoji: '🍎', junk: true },
  onigiri: { name: 'おにぎり', emoji: '🍙', junk: true },
  kyabetsu: { name: 'キャベツ', emoji: '🥬', junk: true },
  keki: { name: 'ケーキ', emoji: '🍰', junk: true },
};

export type SpeciesId = 'sasori' | 'seaka' | 'suzumebachi' | 'yadoku' | 'habu' | 'cobra';
export type Rarity = 'N' | 'R' | 'SR';
export type Habitat = 'desert' | 'town' | 'forest' | 'rainforest' | 'okinawa' | 'jungle';

export interface Stats {
  hp: number;
  doku: number;
  def: number;
  spd: number;
}

export interface Species {
  id: SpeciesId;
  name: string;
  rarity: Rarity;
  types: PType[];
  foods: FoodId[];
  habitat: Habitat;
  where: string;
  size: string;
  base: Stats;
  stageNames: [string, string, string];
  moveName: string;
  // 1つめは生まれたとき、2つめはこども、3つめはおとなになったときに図鑑に入る
  facts: [string, string, string];
  // 「ほんとうは…」の一言（ゲームの都合と本当がちがうところ）
  truth?: string;
  // 食べ物から毒をためる生き物（正しいごはんで どくパワーが上がる）
  poisonFromFood?: boolean;
  glow?: boolean;
}

export const SPECIES: Record<SpeciesId, Species> = {
  sasori: {
    id: 'sasori',
    name: 'サソリ',
    rarity: 'N',
    types: ['shibire'],
    foods: ['korogi', 'imomushi'],
    habitat: 'desert',
    where: 'さばく、{沖縄|おきなわ}の {島|しま}',
    size: '6〜10センチくらい（しゅるいで ちがう）',
    base: { hp: 90, doku: 26, def: 22, spd: 16 },
    stageNames: ['あかちゃん', 'こども', 'おとな'],
    moveName: 'どくばり',
    facts: [
      '{世界|せかい}に 1700しゅるい いじょう いる。{日本|にほん}でも {沖縄|おきなわ}の {島|しま}に 2しゅるい すんでいるよ。',
      'ブラックライト（むらさきの ひかり）を あてると、からだが みどりいろに ひかる！',
      '{人|ひと}の いのちに かかわる どくを もつのは、ほんの {一部|いちぶ}の サソリだけ。',
    ],
    truth: 'ほんとうの サソリは、おかあさんの おなかの なかで たまごが かえって、あかちゃんの すがたで うまれる。おかあさんは あかちゃんを せなかに のせて まもるよ。',
    glow: true,
  },
  seaka: {
    id: 'seaka',
    name: 'セアカゴケグモ',
    rarity: 'N',
    types: ['shibire'],
    foods: ['hae', 'korogi'],
    habitat: 'town',
    where: '{日本|にほん}の まちの みぞや ブロックの すきま',
    size: 'メスは 1センチくらい',
    base: { hp: 70, doku: 30, def: 12, spd: 22 },
    stageNames: ['あかちゃん', 'こども', 'おとな'],
    moveName: 'どくのキバ',
    facts: [
      'もともとは オーストラリアの クモ。1995{年|ねん}に {大阪|おおさか}で {見|み}つかり、いまは {日本|にほん}の あちこちに いる。',
      'メスは 1センチくらい。{黒|くろ}い からだの せなかに {赤|あか}い もようが ある。',
      '{人|ひと}が かまれるのは ほとんどが メス。オスは メスより ずっと {小|ちい}さくて、めったに かまない。',
    ],
    truth: 'ほんとうは {小|ちい}さな たまごを たくさん、ふくろ（らんのう）に まとめて うむよ。',
  },
  suzumebachi: {
    id: 'suzumebachi',
    name: 'オオスズメバチ',
    rarity: 'N',
    types: ['itami', 'kowashi'],
    foods: ['imomushi', 'jueki'],
    habitat: 'forest',
    where: '{日本|にほん}の {山|やま}や {森|もり}',
    size: '4センチくらい',
    base: { hp: 80, doku: 28, def: 16, spd: 26 },
    stageNames: ['ようちゅう', 'さなぎ', 'おとな'],
    moveName: 'どくばり',
    facts: [
      '{世界|せかい}で いちばん {大|おお}きな スズメバチ。からだは 4センチくらいも ある。',
      'ようちゅうは おとなが はこんでくる {虫|むし}の {肉|にく}だんごを たべる。おとなは {木|き}の しる（じゅえき）や、ようちゅうが だす えきを のむ。',
      'たまご → ようちゅう → さなぎ → おとな と、すがたを かえて そだつ。',
    ],
  },
  yadoku: {
    id: 'yadoku',
    name: 'ヤドクガエル',
    rarity: 'R',
    types: ['shibire'],
    foods: ['ari', 'hae'],
    habitat: 'rainforest',
    where: '{中南米|ちゅうなんべい}の あつい {森|もり}',
    size: '2〜6センチくらい',
    base: { hp: 65, doku: 36, def: 12, spd: 22 },
    stageNames: ['おたまじゃくし', 'こがえる', 'おとな'],
    moveName: 'どくのひふ',
    facts: [
      '{中南米|ちゅうなんべい}の あつい {森|もり}に すむ、2〜6センチくらいの {小|ちい}さな カエル。',
      'あざやかな {色|いろ}は「ぼくには どくが あるぞ！」という しるし。',
      'どくは たべた アリや ダニから からだに ためている。{人|ひと}に かわれて そだつと、どくが なくなるんだ。',
    ],
    truth: 'ヤドクガエルの なかまには、うまれた おたまじゃくしを おやが せなかに のせて、{水|みず}たまりまで はこぶ しゅるいが いるよ。',
    poisonFromFood: true,
  },
  habu: {
    id: 'habu',
    name: 'ハブ',
    rarity: 'R',
    types: ['kowashi', 'itami'],
    foods: ['nezumi', 'tokage'],
    habitat: 'okinawa',
    where: '{沖縄|おきなわ}や {奄美|あまみ}の {島|しま}',
    size: '1〜2メートルくらい（2メートルを こえることも）',
    base: { hp: 110, doku: 32, def: 20, spd: 18 },
    stageNames: ['あかちゃん', 'こども', 'おとな'],
    moveName: 'どくのキバ',
    facts: [
      '{沖縄|おきなわ}や {奄美|あまみ}の {島|しま}に すむ どくヘビ。{長|なが}さは 1〜2メートルくらい。',
      '{熱|ねつ}を かんじる「ピット」という きかんが あり、{夜|よる}でも えものを {見|み}つける。',
      'かまれた ところが はれて、とても いたみ、からだが こわされる。かまれたら すぐに びょういんへ！',
    ],
  },
  cobra: {
    id: 'cobra',
    name: 'キングコブラ',
    rarity: 'SR',
    types: ['shibire'],
    foods: ['hebi', 'tokage'],
    habitat: 'jungle',
    where: '{東南|とうなん}アジアや インドの {森|もり}',
    size: '3〜5メートル',
    base: { hp: 130, doku: 38, def: 24, spd: 20 },
    stageNames: ['あかちゃん', 'こども', 'おとな'],
    moveName: 'キングのキバ',
    facts: [
      '{世界|せかい}で いちばん {長|なが}い どくヘビ。5メートルを こえることも ある。',
      'おもに ほかの ヘビを たべる。あかちゃんは {黒|くろ}い からだに、はっきりした しまもようが ある。',
      'メスは {落|お}ち{葉|ば}を あつめて {巣|す}を つくり、たまごを まもる。こんな ヘビは めずらしい。',
    ],
  },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export const RARITY: Record<Rarity, { name: string; rate: number; essence: number; color: string }> = {
  N: { name: 'ノーマル', rate: 0.6, essence: 1, color: '#e9dcc0' },
  R: { name: 'レア', rate: 0.3, essence: 2, color: '#5fd3c7' },
  SR: { name: 'げきレア', rate: 0.1, essence: 3, color: '#ffd43b' },
};

// --- ボス ---
export type BossId = 'hebikui' | 'mongoose' | 'mitsuanaguma';

export interface BossMove {
  name: string;
  power: number;
  hits?: number;
  defUp?: number;
  weight: number;
}

export interface Boss {
  id: BossId;
  name: string;
  where: string;
  fact: string;
  resist: Partial<Record<PType, number>>;
  stats: Stats;
  moves: BossMove[];
  reward: { coins: number; moto: number };
  hint: string;
  bg: string;
}

export const BOSSES: Boss[] = [
  {
    id: 'hebikui',
    name: 'ヘビクイワシ',
    where: 'アフリカの {草原|そうげん}',
    fact: '{長|なが}い あしで どくヘビを けって たおす {鳥|とり}。ける ちからは とても つよい。',
    resist: {},
    stats: { hp: 150, doku: 24, def: 14, spd: 30 },
    moves: [
      { name: 'キック', power: 1.0, weight: 3 },
      { name: 'れんぞくキック', power: 0.6, hits: 2, weight: 2 },
    ],
    reward: { coins: 150, moto: 1 },
    hint: 'ヘビクイワシは とても すばやい。トレーニングで たいりょくや ぼうぎょを あげてから いどもう！',
    bg: 'linear-gradient(#ffe8a3,#e9c46a 55%,#b5893b)',
  },
  {
    id: 'mongoose',
    name: 'マングース',
    where: 'アジアや アフリカ',
    fact: 'ヘビの しびれどく（{神経毒|しんけいどく}）が ききにくい からだを もっている。すばやく うごいて ヘビと たたかう。',
    resist: { shibire: 0.25 },
    stats: { hp: 230, doku: 28, def: 20, spd: 28 },
    moves: [
      { name: 'かみつく', power: 1.0, weight: 3 },
      { name: 'すばやい かみつき', power: 0.7, hits: 2, weight: 2 },
    ],
    reward: { coins: 200, moto: 2 },
    hint: 'マングースには しびれどくが ききにくい！ どくラボで、ちのどくや いたみどくを まぜた どくを つくってみよう。',
    bg: 'linear-gradient(#d8f3a5,#9ccc65 55%,#5b8c2a)',
  },
  {
    id: 'mitsuanaguma',
    name: 'ラーテル',
    where: 'アフリカや アジア',
    fact: 'べつの なまえは ミツアナグマ。コブラの どくにも つよく、かわが とても ぶあつい。ハチの {巣|す}も へいきで おそう。',
    resist: { shibire: 0.25, itami: 0.25 },
    stats: { hp: 320, doku: 34, def: 28, spd: 18 },
    moves: [
      { name: 'ひっかく', power: 1.0, weight: 4 },
      { name: 'のしかかり', power: 1.4, weight: 2 },
      { name: 'ぶあついかわ', power: 0, defUp: 0.3, weight: 1 },
    ],
    reward: { coins: 300, moto: 3 },
    hint: 'ラーテルには しびれどくと いたみどくが ききにくい！ こわしどくで ぼうぎょを さげて、ちのどくで ダメージを かさねよう。',
    bg: 'linear-gradient(#f6d6a8,#d4a373 55%,#8d5a2b)',
  },
];

// --- くすりカード（毒は薬にもなる）---
export interface MedCard {
  id: string;
  from: string;
  drug: string;
  use: string;
  more: string;
  unlock: [PType, PType];
}

export const MED_CARDS: MedCard[] = [
  {
    id: 'captopril',
    from: 'ブラジルの ハブの なかま（ハララカ）',
    drug: 'カプトプリル',
    use: '{高|たか}い {血圧|けつあつ}を さげる {薬|くすり}',
    more: 'ハララカの どくには、{血圧|けつあつ}を さげる せいぶんが ふくまれていた。それを ヒントに 1970{年代|ねんだい}に つくられた {薬|くすり}だよ。',
    unlock: ['chi', 'chi'],
  },
  {
    id: 'ziconotide',
    from: 'イモガイ（{海|うみ}に すむ まきがい）',
    drug: 'ジコノチド',
    use: 'とても つよい いたみを とめる {薬|くすり}',
    more: 'イモガイの なかまには、どくの ついた「もり」のような {歯|は}を うちこんで、さかなを つかまえる しゅるいが いる。その どくの せいぶんから、いたみ{止|ど}めが うまれた。',
    unlock: ['shibire', 'shibire'],
  },
  {
    id: 'exenatide',
    from: 'アメリカドクトカゲ',
    drug: 'エキセナチド',
    use: '{糖尿病|とうにょうびょう}の {薬|くすり}',
    more: 'アメリカドクトカゲの どくには、{血|ち}の なかの さとうの りょうを ととのえる せいぶんが あった。それが {薬|くすり}に なったよ。',
    unlock: ['itami', 'itami'],
  },
];

// 2つの「どくのもと」から作る毒の名前
const COMBO_NAMES: Record<string, string> = {
  'shibire+shibire': 'ビリビリベノム',
  'chi+chi': 'ブラッドベノム',
  'itami+itami': 'ズキズキベノム',
  'kowashi+kowashi': 'メルトベノム',
  'chi+shibire': 'ビリブラッド',
  'itami+shibire': 'ビリズキ',
  'kowashi+shibire': 'ビリメルト',
  'chi+itami': 'ブラッドズキ',
  'chi+kowashi': 'ブラッドメルト',
  'itami+kowashi': 'ズキメルト',
};

export function comboKey(a: PType, b: PType): string {
  return [a, b].sort().join('+');
}

export function comboName(a: PType, b: PType): string {
  return COMBO_NAMES[comboKey(a, b)] ?? 'ふしぎなどく';
}
