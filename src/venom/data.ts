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

// ---------------- 強さ（3つ） ----------------
export type StatKey = 'hp' | 'atk' | 'def';
export const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def'];
export const STAT_INFO: Record<StatKey, { name: string; icon: string; color: string }> = {
  hp: { name: 'たいりょく', icon: '❤️', color: '#ff6b6b' },
  atk: { name: 'こうげき', icon: '⚔️', color: '#ffa94d' },
  def: { name: 'ぼうぎょ', icon: '🛡️', color: '#4dabf7' },
};

// ---------------- たべもの：たべると強さが上がる ----------------
export type FoodId =
  | 'korogi' | 'imomushi' | 'hae' | 'ari' | 'jueki' | 'mitsu' | 'happa' | 'nezumi' | 'tokage' | 'hebi' | 'kaeru' | 'tori'
  | 'sakana' | 'ebi' | 'kani' | 'kai' | 'mimizu' | 'tamago' | 'kudamono' | 'keki' | 'poteto';

export interface Food {
  name: string;
  emoji: string;
  stat: StatKey;
  gain: number;
  junk?: boolean;
}

export const FOODS: Record<FoodId, Food> = {
  korogi: { name: 'コオロギ', emoji: '🦗', stat: 'atk', gain: 2 },
  imomushi: { name: 'イモムシ', emoji: '🐛', stat: 'hp', gain: 2 },
  hae: { name: 'ハエ', emoji: '🪰', stat: 'atk', gain: 1 },
  ari: { name: 'アリ', emoji: '🐜', stat: 'atk', gain: 1 },
  jueki: { name: 'じゅえき', emoji: '🌳', stat: 'hp', gain: 2 },
  mitsu: { name: 'はなの みつ', emoji: '🌸', stat: 'hp', gain: 2 },
  happa: { name: 'はっぱ', emoji: '🍃', stat: 'hp', gain: 2 },
  nezumi: { name: 'ネズミ', emoji: '🐭', stat: 'hp', gain: 3 },
  tokage: { name: 'トカゲ', emoji: '🦎', stat: 'atk', gain: 2 },
  hebi: { name: 'ヘビ', emoji: '🐍', stat: 'atk', gain: 3 },
  kaeru: { name: 'カエル', emoji: '🐸', stat: 'atk', gain: 2 },
  tori: { name: 'ことり', emoji: '🐦', stat: 'atk', gain: 2 },
  sakana: { name: 'さかな', emoji: '🐟', stat: 'hp', gain: 2 },
  ebi: { name: 'エビ', emoji: '🦐', stat: 'def', gain: 2 },
  kani: { name: 'カニ', emoji: '🦀', stat: 'def', gain: 3 },
  kai: { name: 'かい', emoji: '🐚', stat: 'def', gain: 2 },
  mimizu: { name: 'ミミズ', emoji: '🪱', stat: 'hp', gain: 2 },
  tamago: { name: 'とりの たまご', emoji: '🥚', stat: 'hp', gain: 3 },
  kudamono: { name: 'くだもの', emoji: '🍌', stat: 'hp', gain: 1 },
  keki: { name: 'ケーキ', emoji: '🍰', stat: 'hp', gain: 0, junk: true },
  poteto: { name: 'ポテト', emoji: '🍟', stat: 'hp', gain: 0, junk: true },
};

// ---------------- 生き物 ----------------
export type Rarity = 'N' | 'R' | 'SR';
export type AreaId = 'mori' | 'sabaku' | 'umi' | 'jungle';
export type Habitat = 'desert' | 'town' | 'forest' | 'rainforest' | 'okinawa' | 'jungle' | 'sea' | 'river' | 'field';

export type ArtKind =
  | 'scorpion' | 'spider' | 'hornet' | 'bee' | 'frog' | 'toad' | 'coil' | 'cobra' | 'centipede' | 'caterpillar'
  | 'octopus' | 'stonefish' | 'lionfish' | 'puffer' | 'jelly' | 'cone' | 'ray' | 'lizard' | 'newt' | 'platypus' | 'loris' | 'seasnake';

export interface Base {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface Species {
  id: string;
  name: string;
  rarity: Rarity;
  types: PType[];
  foods: FoodId[];
  area: AreaId;
  habitat: Habitat;
  where: string;
  size: string;
  base: Base;
  stageNames: [string, string, string];
  moveName: string;
  art: ArtKind;
  pal?: Record<string, string>;
  facts: [string, string, string];
  truth?: string;
  poisonFromFood?: boolean;
  glow?: boolean;
}

const KIDS: [string, string, string] = ['あかちゃん', 'こども', 'おとな'];
const LIVE_BIRTH = (n: string) => `ほんとうの ${n}は、おかあさんの おなかの なかで たまごが かえって、あかちゃんの すがたで うまれるよ。`;

const LIST: Species[] = [
  // ======== もり（日本の 山・森・まち） ========
  {
    id: 'seaka', name: 'セアカゴケグモ', rarity: 'N', types: ['shibire'], foods: ['hae', 'korogi'], area: 'mori', habitat: 'town',
    where: '{日本|にほん}の まちの みぞや ブロックの すきま', size: 'メスは 1センチくらい', base: { hp: 70, atk: 30, def: 12, spd: 22 },
    stageNames: KIDS, moveName: 'どくのキバ', art: 'spider',
    facts: [
      'もともとは オーストラリアの クモ。1995{年|ねん}に {大阪|おおさか}で {見|み}つかり、いまは {日本|にほん}の あちこちに いる。',
      'メスは 1センチくらい。{黒|くろ}い からだの せなかに {赤|あか}い もようが ある。',
      '{人|ひと}が かまれるのは ほとんどが メス。オスは メスより ずっと {小|ちい}さくて、めったに かまない。',
    ],
    truth: 'ほんとうは {小|ちい}さな たまごを たくさん、ふくろ（らんのう）に まとめて うむよ。',
  },
  {
    id: 'suzumebachi', name: 'オオスズメバチ', rarity: 'N', types: ['itami', 'kowashi'], foods: ['imomushi', 'jueki'], area: 'mori', habitat: 'forest',
    where: '{日本|にほん}の {山|やま}や {森|もり}', size: '4センチくらい', base: { hp: 75, atk: 30, def: 14, spd: 28 },
    stageNames: ['ようちゅう', 'さなぎ', 'おとな'], moveName: 'どくばり', art: 'hornet',
    facts: [
      '{世界|せかい}で いちばん {大|おお}きな スズメバチ。からだは 4センチくらいも ある。',
      'ようちゅうは おとなが はこんでくる {虫|むし}の {肉|にく}だんごを たべる。おとなは {木|き}の しる（じゅえき）や、ようちゅうが だす えきを のむ。',
      'たまご → ようちゅう → さなぎ → おとな と、すがたを かえて そだつ。',
    ],
  },
  {
    id: 'mamushi', name: 'ニホンマムシ', rarity: 'N', types: ['chi'], foods: ['nezumi', 'kaeru'], area: 'mori', habitat: 'field',
    where: '{日本|にほん}の {山|やま}や {田|た}んぼの まわり', size: '40〜65センチくらい（大きいと 80センチ）', base: { hp: 85, atk: 28, def: 18, spd: 16 },
    stageNames: KIDS, moveName: 'どくのキバ', art: 'coil', pal: { base: '#a58d6a', pat: '#4a3826', head: '#8f7656', dash: '7 9' },
    facts: [
      '{日本|にほん}の {山|やま}や {田|た}んぼの まわりに すむ どくヘビ。{長|なが}さは 40〜65センチくらい。',
      'せなかに、ふちどりの ある {丸|まる}い もようが ならんでいる。',
      '{目|め}と はなの あいだに {熱|ねつ}を かんじる「ピット」が あり、くらくても えものを {見|み}つける。',
    ],
    truth: LIVE_BIRTH('マムシ'),
  },
  {
    id: 'yamakagashi', name: 'ヤマカガシ', rarity: 'N', types: ['chi'], foods: ['kaeru', 'sakana'], area: 'mori', habitat: 'field',
    where: '{日本|にほん}の {田|た}んぼや {川|かわ}の ちかく', size: '60センチ〜1.2メートルくらい', base: { hp: 80, atk: 27, def: 16, spd: 20 },
    stageNames: KIDS, moveName: 'おくばの どく', art: 'coil', pal: { base: '#6f7a3e', pat: '#1e1e1a', head: '#5c6a33', neck: '#d9482b', dash: '5 11' },
    facts: [
      '{日本|にほん}の {田|た}んぼや {川|かわ}の ちかくに すむ ヘビ。カエルが だいこうぶつ。',
      'おくばに どくが あり、かまれると {血|ち}が とまりにくく なる。',
      'くびの うしろからも どくを だす。たべた ヒキガエルの どくを ためた ものと かんがえられている。',
    ],
  },
  {
    id: 'tobizu', name: 'トビズムカデ', rarity: 'N', types: ['itami'], foods: ['korogi', 'imomushi'], area: 'mori', habitat: 'forest',
    where: '{日本|にほん}の {森|もり}や いえの まわり', size: '8〜15センチくらい', base: { hp: 80, atk: 30, def: 20, spd: 24 },
    stageNames: KIDS, moveName: 'どくの あご', art: 'centipede',
    facts: [
      '{日本|にほん}で いちばん {大|おお}きな ムカデの なかま。10センチを こえる ことも ある。',
      'あたまが {赤|あか}っぽく、からだは {黒|くろ}っぽい。あしは {黄色|きいろ}っぽい。',
      'おかあさんムカデは、たまごを だきかかえて まもる。',
    ],
  },
  {
    id: 'kabaki', name: 'カバキコマチグモ', rarity: 'N', types: ['itami'], foods: ['hae', 'korogi'], area: 'mori', habitat: 'field',
    where: '{日本|にほん}の くさむら', size: '1センチくらい', base: { hp: 60, atk: 28, def: 12, spd: 22 },
    stageNames: KIDS, moveName: 'どくのキバ', art: 'spider', pal: { abd: '#e7b866', abd2: '#c98f3a', stripe: '#e7b866', leg: '#d39a4a', ceph: '#d9742b' },
    facts: [
      '{日本|にほん}の くさむらに すむ クモ。からだは 1センチくらい。',
      'ススキなどの はっぱを まいて、ちまきのような {巣|す}を つくる。',
      'うまれた こどもは、おかあさんの からだを たべて そだつ。',
    ],
  },
  {
    id: 'mitsubachi', name: 'ミツバチ', rarity: 'N', types: ['itami'], foods: ['mitsu'], area: 'mori', habitat: 'field',
    where: '{花|はな}の ある {野原|のはら}や {森|もり}', size: '1センチくらい', base: { hp: 55, atk: 22, def: 10, spd: 30 },
    stageNames: ['ようちゅう', 'さなぎ', 'おとな'], moveName: 'どくばり', art: 'bee',
    facts: [
      '{花|はな}の みつや かふんを あつめる ハチ。{人|ひと}や どうぶつを さすと、はりが ぬけて じぶんは しんでしまう。',
      'ダンスで、なかまに {花|はな}の ばしょを おしえる。',
      'ニホンミツバチは、スズメバチを みんなで かこんで、{熱|ねつ}で たおす。',
    ],
  },
  {
    id: 'iraga', name: 'イラガ', rarity: 'N', types: ['itami'], foods: ['happa'], area: 'mori', habitat: 'forest',
    where: '{日本|にほん}の カキや サクラの {木|き}', size: 'ようちゅうは 2センチくらい', base: { hp: 70, atk: 22, def: 22, spd: 8 },
    stageNames: ['ちいさな ようちゅう', 'ようちゅう', 'おおきな ようちゅう'], moveName: 'どくの とげ', art: 'caterpillar',
    facts: [
      'イラガの ようちゅうに さわると とても いたい。「デンキムシ」とも よばれる。',
      'カキや サクラなどの はっぱを たべる。',
      'さなぎに なる ときは、たまごのような かたい まゆを つくる。',
    ],
  },
  {
    id: 'imori', name: 'アカハライモリ', rarity: 'N', types: ['shibire'], foods: ['mimizu', 'korogi'], area: 'mori', habitat: 'river',
    where: '{日本|にほん}の {田|た}んぼや {池|いけ}', size: '10センチくらい', base: { hp: 65, atk: 24, def: 16, spd: 14 },
    stageNames: KIDS, moveName: 'どくの ひふ', art: 'newt',
    facts: [
      '{日本|にほん}の {田|た}んぼや {池|いけ}に すむ イモリ。せなかは {黒|くろ}く、おなかは {赤|あか}い。',
      'からだに フグと おなじ どく（テトロドトキシン）を もっている。',
      'しっぽや あしが きれても、また はえてくる。',
    ],
  },
  {
    id: 'hikigaeru', name: 'ニホンヒキガエル', rarity: 'N', types: ['kowashi'], foods: ['mimizu', 'korogi'], area: 'mori', habitat: 'field',
    where: '{日本|にほん}の {森|もり}や にわ', size: '7〜18センチくらい', base: { hp: 95, atk: 22, def: 22, spd: 10 },
    stageNames: ['おたまじゃくし', 'こども', 'おとな'], moveName: 'どくの しる', art: 'toad',
    facts: [
      '{日本|にほん}に すむ {大|おお}きな カエル。10センチを こえる ことも ある。',
      '{目|め}の うしろの ふくらみから、どくの しるを だす。',
      'たまごは、ひものように ながく つながっている。',
    ],
  },
  {
    id: 'shidoni', name: 'シドニージョウゴグモ', rarity: 'R', types: ['shibire'], foods: ['korogi', 'tokage'], area: 'mori', habitat: 'forest',
    where: 'オーストラリアの シドニーの まわり', size: '1〜5センチくらい', base: { hp: 70, atk: 36, def: 14, spd: 24 },
    stageNames: KIDS, moveName: 'どくのキバ', art: 'spider', pal: { abd: '#3a2f2a', abd2: '#151110', stripe: '#3a2f2a', leg: '#1d1714', ceph: '#24201d' },
    facts: [
      'オーストラリアの シドニーの まわりに すむ クモ。',
      'じめんに、ろうと（じょうご）のような {形|かたち}の {巣|す}あなを つくる。',
      'どくが つよいのは オス。いまは よく きく くすりが ある。',
    ],
  },
  // ======== さばく ========
  {
    id: 'sasori', name: 'サソリ', rarity: 'N', types: ['shibire'], foods: ['korogi', 'imomushi'], area: 'sabaku', habitat: 'desert',
    where: 'さばく、{沖縄|おきなわ}の {島|しま}', size: '6〜10センチくらい（しゅるいで ちがう）', base: { hp: 90, atk: 26, def: 24, spd: 16 },
    stageNames: KIDS, moveName: 'どくばり', art: 'scorpion', glow: true,
    facts: [
      '{世界|せかい}に 1700しゅるい いじょう いる。{日本|にほん}でも {沖縄|おきなわ}の {島|しま}に 2しゅるい すんでいるよ。',
      'ブラックライト（むらさきの ひかり）を あてると、からだが みどりいろに ひかる！',
      '{人|ひと}の いのちに かかわる どくを もつのは、ほんの {一部|いちぶ}の サソリだけ。',
    ],
    truth: LIVE_BIRTH('サソリ') + 'おかあさんは あかちゃんを せなかに のせて まもる。',
  },
  {
    id: 'deathstalker', name: 'デスストーカー', rarity: 'R', types: ['shibire'], foods: ['korogi', 'imomushi'], area: 'sabaku', habitat: 'desert',
    where: '{北|きた}アフリカから {中東|ちゅうとう}の さばく', size: '6センチくらい', base: { hp: 85, atk: 34, def: 20, spd: 20 },
    stageNames: KIDS, moveName: 'もうどくの はり', art: 'scorpion', glow: true, pal: { b1: '#f6e27a', b2: '#c9a73a', line: '#6a5414', dark: '#3d2f06', thin: '1' },
    facts: [
      '{北|きた}アフリカから {中東|ちゅうとう}の さばくに すむ、{黄色|きいろ}い サソリ。',
      'しびれる どくが とても つよい サソリの ひとつ。',
      'どくの せいぶんは、のうの びょうきの けんきゅうにも つかわれている。',
    ],
    truth: LIVE_BIRTH('デスストーカー'),
  },
  {
    id: 'garagara', name: 'ガラガラヘビ', rarity: 'R', types: ['chi', 'kowashi'], foods: ['nezumi', 'tokage'], area: 'sabaku', habitat: 'desert',
    where: 'アメリカの かわいた {土地|とち}や {草原|そうげん}', size: '1〜2メートルくらい', base: { hp: 105, atk: 33, def: 20, spd: 18 },
    stageNames: KIDS, moveName: 'どくのキバ', art: 'coil', pal: { base: '#c2a878', pat: '#5a4430', head: '#a68e62', dash: '12 8', rattle: '1' },
    facts: [
      'アメリカの かわいた {土地|とち}や {草原|そうげん}に すむ ヘビ。',
      'しっぽの さきの ふしを ふるわせて、「シャー」と {音|おと}を だして いかくする。',
      'しっぽの ふしは、だっぴの たびに ひとつずつ ふえる。',
    ],
    truth: LIVE_BIRTH('ガラガラヘビ'),
  },
  {
    id: 'gila', name: 'アメリカドクトカゲ', rarity: 'R', types: ['itami'], foods: ['tamago', 'nezumi'], area: 'sabaku', habitat: 'desert',
    where: 'アメリカの さばく', size: '30センチくらい（大きいと 50センチ）', base: { hp: 120, atk: 32, def: 26, spd: 10 },
    stageNames: KIDS, moveName: 'どくの かみつき', art: 'lizard',
    facts: [
      'アメリカの さばくに すむ どくトカゲ。こげちゃいろの からだに、ピンクや オレンジの もようが ある。',
      'したあごから どくを だす。',
      'どくの せいぶんから、{糖尿病|とうにょうびょう}の {薬|くすり}が うまれた。',
    ],
  },
  {
    id: 'taipan', name: 'ナイリクタイパン', rarity: 'SR', types: ['shibire', 'chi'], foods: ['nezumi'], area: 'sabaku', habitat: 'desert',
    where: 'オーストラリアの かわいた {土地|とち}', size: '2メートルくらい', base: { hp: 115, atk: 44, def: 20, spd: 26 },
    stageNames: KIDS, moveName: 'さいきょうの キバ', art: 'coil', pal: { base: '#9a7446', pat: '#6b4e2c', head: '#3b2a1a', dash: '2 16' },
    facts: [
      'オーストラリアの かわいた {土地|とち}に すむ ヘビ。',
      'りくに すむ ヘビの なかで、いちばん どくが つよいと いわれる。',
      'きせつで からだの {色|いろ}が かわり、{冬|ふゆ}は {色|いろ}が こく なる。おとなしく、{人|ひと}を かむことは めったに ない。',
    ],
  },
  // ======== うみ・みずべ ========
  {
    id: 'minokasago', name: 'ミノカサゴ', rarity: 'N', types: ['itami'], foods: ['sakana', 'ebi'], area: 'umi', habitat: 'sea',
    where: 'あたたかい {海|うみ}の いわばや サンゴしょう', size: '25〜30センチくらい', base: { hp: 80, atk: 28, def: 16, spd: 18 },
    stageNames: KIDS, moveName: 'どくの とげ', art: 'lionfish',
    facts: [
      'あたたかい {海|うみ}の サンゴしょうや いわばに すむ さかな。',
      'むなびれが {大|おお}きく、はでな しまもようで よく めだつ。',
      'せびれの とげに どくが あり、さされると とても いたい。',
    ],
  },
  {
    id: 'akaei', name: 'アカエイ', rarity: 'N', types: ['itami'], foods: ['kani', 'kai'], area: 'umi', habitat: 'sea',
    where: '{日本|にほん}の {海|うみ}の すなの そこ', size: 'からだの はばは 60センチくらい', base: { hp: 100, atk: 28, def: 22, spd: 14 },
    stageNames: KIDS, moveName: 'しっぽの とげ', art: 'ray',
    facts: [
      '{日本|にほん}の {海|うみ}の すなの そこに すむ エイ。',
      'しっぽに どくの ある とげが あり、さされると とても いたい。',
      'すなに もぐって かくれ、カニや {貝|かい}を たべる。',
    ],
    truth: LIVE_BIRTH('アカエイ'),
  },
  {
    id: 'torafugu', name: 'トラフグ', rarity: 'N', types: ['shibire'], foods: ['kani', 'kai'], area: 'umi', habitat: 'sea',
    where: '{日本|にほん}の {海|うみ}', size: '70センチくらい', base: { hp: 90, atk: 26, def: 26, spd: 12 },
    stageNames: KIDS, moveName: 'フグどく', art: 'puffer', poisonFromFood: true,
    facts: [
      '{日本|にほん}の {海|うみ}に すむ {大|おお}きな フグ。むなびれの うしろに、{白|しろ}い ふちの ある {黒|くろ}い もようが ある。',
      'てきが {来|く}ると、{水|みず}を すいこんで からだを ふくらませる。',
      'どくは たべものから からだに ためる。フグを りょうりするには、とくべつな しかくが いる。',
    ],
  },
  {
    id: 'hyoumon', name: 'ヒョウモンダコ', rarity: 'R', types: ['shibire'], foods: ['kani', 'ebi'], area: 'umi', habitat: 'sea',
    where: 'あたたかい {海|うみ}の いわば（{日本|にほん}にも いる）', size: '10センチくらい', base: { hp: 65, atk: 38, def: 12, spd: 22 },
    stageNames: KIDS, moveName: 'フグどくの くちばし', art: 'octopus',
    facts: [
      'からだは 10センチくらい。でも、フグと おなじ どくを もっている。',
      'おこると からだが {黄色|きいろ}っぽく なり、{青|あお}い わっかの もようが うかびあがる。',
      '{日本|にほん}の {海|うみ}でも {見|み}つかっている。いそあそびで {見|み}つけても ぜったい さわらないで！',
    ],
  },
  {
    id: 'onidaruma', name: 'オニダルマオコゼ', rarity: 'R', types: ['itami', 'kowashi'], foods: ['sakana', 'ebi'], area: 'umi', habitat: 'sea',
    where: 'あたたかい {海|うみ}の いわば（{沖縄|おきなわ}など）', size: '30〜40センチくらい', base: { hp: 110, atk: 32, def: 30, spd: 8 },
    stageNames: KIDS, moveName: 'もうどくの とげ', art: 'stonefish',
    facts: [
      'あたたかい {海|うみ}の いわばに すむ さかな。いしに そっくりで {見|み}つけにくい。',
      'せなかの とげに、とても つよい どくが ある。',
      '{日本|にほん}でも {沖縄|おきなわ}などに すんでいる。',
    ],
  },
  {
    id: 'katsuo', name: 'カツオノエボシ', rarity: 'R', types: ['itami'], foods: ['sakana', 'ebi'], area: 'umi', habitat: 'sea',
    where: 'せかいの あたたかい {海|うみ}', size: 'うきぶくろは 10センチくらい', base: { hp: 85, atk: 34, def: 10, spd: 12 },
    stageNames: KIDS, moveName: 'どくの しょくしゅ', art: 'jelly',
    facts: [
      '{青|あお}い ふうせんのような うきぶくろで、{海|うみ}に うかんで ながされる。',
      'ながい しょくしゅに どくの はりが あり、さされると とても いたい。「デンキクラゲ」とも よばれる。',
      'たくさんの {小|ちい}さな いきものが あつまって、ひとつの からだを つくっている。',
    ],
    truth: 'ほんとうの カツオノエボシは、{小|ちい}さな いきものが ふえて あつまって できるよ。',
  },
  {
    id: 'anboina', name: 'アンボイナ', rarity: 'R', types: ['shibire'], foods: ['sakana'], area: 'umi', habitat: 'sea',
    where: 'あたたかい {海|うみ}の サンゴしょう', size: '10センチくらい', base: { hp: 80, atk: 38, def: 30, spd: 6 },
    stageNames: KIDS, moveName: 'どくの もり', art: 'cone',
    facts: [
      'あたたかい {海|うみ}に すむ、イモガイの なかまの {貝|かい}。',
      'どくの ついた「もり」のような {歯|は}を うちこんで、さかなを つかまえる。',
      'イモガイの なかまで いちばん あぶないと いわれる。きれいな {貝|かい}でも ひろわないで！',
    ],
  },
  {
    id: 'erabu', name: 'エラブウミヘビ', rarity: 'R', types: ['shibire'], foods: ['sakana'], area: 'umi', habitat: 'sea',
    where: '{沖縄|おきなわ}など あたたかい {海|うみ}', size: '1〜1.5メートルくらい', base: { hp: 95, atk: 34, def: 18, spd: 20 },
    stageNames: KIDS, moveName: 'うみの キバ', art: 'seasnake',
    facts: [
      '{沖縄|おきなわ}など あたたかい {海|うみ}に すむ ウミヘビ。{青|あお}っぽい からだに {黒|くろ}い しまもよう。',
      'たまごは {海|うみ}ではなく、りくの いわの すきまに うむ。',
      'どくは つよいが、おとなしい せいかく。',
    ],
  },
  {
    id: 'kamonohashi', name: 'カモノハシ', rarity: 'SR', types: ['itami'], foods: ['mimizu', 'ebi'], area: 'umi', habitat: 'river',
    where: 'オーストラリアの {川|かわ}', size: '40〜60センチくらい', base: { hp: 110, atk: 30, def: 24, spd: 20 },
    stageNames: KIDS, moveName: 'どくの けづめ', art: 'platypus',
    facts: [
      'オーストラリアの {川|かわ}に すむ、くちばしの ある ほにゅうるい。',
      'オスの うしろあしに、どくの ある けづめが ある。さされると とても いたい。',
      'ほにゅうるい なのに、たまごを うむ。',
    ],
  },
  // ======== ジャングル（あつい 森） ========
  {
    id: 'yadoku', name: 'ヤドクガエル', rarity: 'R', types: ['shibire'], foods: ['ari', 'hae'], area: 'jungle', habitat: 'rainforest',
    where: '{中南米|ちゅうなんべい}の あつい {森|もり}', size: '2〜6センチくらい', base: { hp: 60, atk: 36, def: 10, spd: 22 },
    stageNames: ['おたまじゃくし', 'こがえる', 'おとな'], moveName: 'どくの ひふ', art: 'frog', poisonFromFood: true,
    facts: [
      '{中南米|ちゅうなんべい}の あつい {森|もり}に すむ、2〜6センチくらいの {小|ちい}さな カエル。',
      'あざやかな {色|いろ}は「ぼくには どくが あるぞ！」という しるし。',
      'どくは たべた アリや ダニから からだに ためている。{人|ひと}に かわれて そだつと、どくが なくなるんだ。',
    ],
    truth: 'ヤドクガエルの なかまには、うまれた おたまじゃくしを おやが せなかに のせて、{水|みず}たまりまで はこぶ しゅるいが いるよ。',
  },
  {
    id: 'habu', name: 'ハブ', rarity: 'R', types: ['kowashi', 'itami'], foods: ['nezumi', 'tokage'], area: 'jungle', habitat: 'okinawa',
    where: '{沖縄|おきなわ}や {奄美|あまみ}の {島|しま}', size: '1〜2メートルくらい（2メートルを こえることも）', base: { hp: 110, atk: 32, def: 20, spd: 18 },
    stageNames: KIDS, moveName: 'どくのキバ', art: 'coil',
    facts: [
      '{沖縄|おきなわ}や {奄美|あまみ}の {島|しま}に すむ どくヘビ。{長|なが}さは 1〜2メートルくらい。',
      '{熱|ねつ}を かんじる「ピット」という きかんが あり、{夜|よる}でも えものを {見|み}つける。',
      'かまれた ところが はれて、とても いたみ、からだが こわされる。かまれたら すぐに びょういんへ！',
    ],
  },
  {
    id: 'cobra', name: 'キングコブラ', rarity: 'SR', types: ['shibire'], foods: ['hebi', 'tokage'], area: 'jungle', habitat: 'jungle',
    where: '{東南|とうなん}アジアや インドの {森|もり}', size: '3〜5メートル', base: { hp: 140, atk: 40, def: 24, spd: 22 },
    stageNames: KIDS, moveName: 'キングのキバ', art: 'cobra',
    facts: [
      '{世界|せかい}で いちばん {長|なが}い どくヘビ。5メートルを こえることも ある。',
      'おもに ほかの ヘビを たべる。あかちゃんは {黒|くろ}い からだに、はっきりした しまもようが ある。',
      'メスは {落|お}ち{葉|ば}を あつめて {巣|す}を つくり、たまごを まもる。こんな ヘビは めずらしい。',
    ],
  },
  {
    id: 'mamba', name: 'ブラックマンバ', rarity: 'SR', types: ['shibire'], foods: ['nezumi', 'tori'], area: 'jungle', habitat: 'jungle',
    where: 'アフリカの {草原|そうげん}や {森|もり}', size: '2〜3メートルくらい', base: { hp: 120, atk: 40, def: 20, spd: 34 },
    stageNames: KIDS, moveName: 'マンバの キバ', art: 'coil', pal: { base: '#7c7a6c', pat: '#5d5b50', head: '#6b695d', dash: '0 30', mouth: '1' },
    facts: [
      'アフリカに すむ どくヘビ。からだは はいいろだが、くちの なかが {黒|くろ}い。',
      'とても すばやく、いちばん はやい ヘビの ひとつと いわれる。',
      '{長|なが}さは 2〜3メートルくらいに なる。',
    ],
  },
  {
    id: 'loris', name: 'スローロリス', rarity: 'SR', types: ['itami'], foods: ['korogi', 'kudamono'], area: 'jungle', habitat: 'rainforest',
    where: '{東南|とうなん}アジアの {森|もり}', size: '30センチくらい', base: { hp: 90, atk: 34, def: 18, spd: 10 },
    stageNames: KIDS, moveName: 'どくの かみつき', art: 'loris',
    facts: [
      '{東南|とうなん}アジアの {森|もり}に すむ、{目|め}の {大|おお}きな サルの なかま。',
      'うでの うちがわから でる しるを つばと まぜて、どくに する。',
      '{夜|よる}に ゆっくり うごいて、{虫|むし}や くだものを たべる。',
    ],
    truth: 'ほんとうの スローロリスは、たまごではなく あかちゃんの すがたで うまれるよ。',
  },
];

export type SpeciesId = string;
export const SPECIES: Record<string, Species> = Object.fromEntries(LIST.map((s) => [s.id, s]));
export const SPECIES_IDS: string[] = LIST.map((s) => s.id);

export const RARITY: Record<Rarity, { name: string; rate: number; essence: number; color: string }> = {
  N: { name: 'ノーマル', rate: 0.6, essence: 1, color: '#e9dcc0' },
  R: { name: 'レア', rate: 0.3, essence: 2, color: '#5fd3c7' },
  SR: { name: 'げきレア', rate: 0.1, essence: 3, color: '#ffd43b' },
};

// ---------------- やせいの バトルの ばしょ ----------------
export interface Area {
  id: AreaId;
  name: string;
  icon: string;
  unlockLevel: number;
  levels: [number, number];
  bg: string;
}

export const AREAS: Area[] = [
  { id: 'mori', name: 'もり', icon: '🌲', unlockLevel: 1, levels: [1, 8], bg: 'linear-gradient(#cfeac4,#7fbf72 55%,#477f3c)' },
  { id: 'sabaku', name: 'さばく', icon: '🌵', unlockLevel: 6, levels: [6, 14], bg: 'linear-gradient(#ffe2a8,#f3b562 55%,#d99a4e)' },
  { id: 'umi', name: 'うみ・みずべ', icon: '🌊', unlockLevel: 12, levels: [12, 20], bg: 'linear-gradient(#bde4ff,#4dabf7 50%,#1864ab)' },
  { id: 'jungle', name: 'ジャングル', icon: '🌴', unlockLevel: 18, levels: [18, 28], bg: 'linear-gradient(#dcf3b0,#86b94c 55%,#2f5a16)' },
];

// ---------------- ボス ----------------
export type BossId = 'hebikui' | 'mongoose' | 'mitsuanaguma';

export interface BossMove {
  name: string;
  power: number;
  hits?: number;
  all?: boolean; // チーム全員に
  defUp?: number;
  weight: number;
}

export interface Boss {
  id: BossId;
  name: string;
  where: string;
  fact: string;
  recLevel: number;
  resist: Partial<Record<PType, number>>;
  stats: Base;
  moves: BossMove[];
  reward: { coins: number; moto: number; exp: number };
  hint: string;
  bg: string;
}

export const BOSSES: Boss[] = [
  {
    id: 'hebikui',
    name: 'ヘビクイワシ',
    where: 'アフリカの {草原|そうげん}',
    fact: '{長|なが}い あしで どくヘビを けって たおす {鳥|とり}。ける ちからは とても つよい。',
    recLevel: 8,
    resist: {},
    stats: { hp: 560, atk: 38, def: 20, spd: 30 },
    moves: [
      { name: 'キック', power: 1.0, weight: 3 },
      { name: 'れんぞくキック', power: 0.6, hits: 2, weight: 2 },
    ],
    reward: { coins: 150, moto: 1, exp: 200 },
    hint: 'ヘビクイワシは とても すばやい。レベルを あげて、ごはんで たいりょくを ふやそう！',
    bg: 'linear-gradient(#ffe8a3,#e9c46a 55%,#b5893b)',
  },
  {
    id: 'mongoose',
    name: 'マングース',
    where: 'アジアや アフリカ',
    fact: 'ヘビの しびれどく（{神経毒|しんけいどく}）が ききにくい からだを もっている。すばやく うごいて ヘビと たたかう。',
    recLevel: 15,
    resist: { shibire: 0.25 },
    stats: { hp: 880, atk: 48, def: 26, spd: 32 },
    moves: [
      { name: 'かみつく', power: 1.0, weight: 3 },
      { name: 'すばやい かみつき', power: 0.7, hits: 2, weight: 2 },
      { name: 'とびかかる', power: 0.6, all: true, weight: 1 },
    ],
    reward: { coins: 250, moto: 2, exp: 600 },
    hint: 'マングースには しびれどくが ききにくい！ どくラボで、ちのどくや いたみどくを まぜた どくを つくってみよう。',
    bg: 'linear-gradient(#d8f3a5,#9ccc65 55%,#5b8c2a)',
  },
  {
    id: 'mitsuanaguma',
    name: 'ラーテル',
    where: 'アフリカや アジア',
    fact: 'べつの なまえは ミツアナグマ。コブラの どくにも つよく、かわが とても ぶあつい。ハチの {巣|す}も へいきで おそう。',
    recLevel: 24,
    resist: { shibire: 0.25, itami: 0.25 },
    stats: { hp: 1600, atk: 64, def: 38, spd: 22 },
    moves: [
      { name: 'ひっかく', power: 1.0, weight: 4 },
      { name: 'のしかかり', power: 1.4, weight: 2 },
      { name: 'あばれまわる', power: 0.6, all: true, weight: 1 },
      { name: 'ぶあついかわ', power: 0, defUp: 0.3, weight: 1 },
    ],
    reward: { coins: 400, moto: 3, exp: 1500 },
    hint: 'ラーテルには しびれどくと いたみどくが ききにくい！ こわしどくで ぼうぎょを さげて、ちのどくで ダメージを かさねよう。',
    bg: 'linear-gradient(#f6d6a8,#d4a373 55%,#8d5a2b)',
  },
];

// ---------------- くすりカード（毒は薬にもなる）----------------
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
