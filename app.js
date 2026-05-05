/* ═══════════════════════════════════════════
   WIKITCG — app.js
═══════════════════════════════════════════ */

'use strict';

/* ══ Utilitaires ══ */
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0; return Math.abs(h); };
const range = (a, b, s) => a + (((s % (b - a + 1)) + (b - a + 1)) % (b - a + 1));
const pick = (a, s) => a[Math.abs(s) % a.length];

/* ══ Thème ══ */
const themeBtn = document.getElementById('themeBtn');
const savedTheme = localStorage.getItem('wikitcg-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.textContent = savedTheme === 'dark' ? '☀' : '☽';

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeBtn.textContent = next === 'dark' ? '☀' : '☽';
  localStorage.setItem('wikitcg-theme', next);
});

/* ══ Wikipedia API ══ */
async function fetchWiki(title) {
  const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.trim().replace(/ /g, '_'))}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Article introuvable : « ${title} »`);
  return r.json();
}

async function fetchRandom() {
  const r = await fetch('https://fr.wikipedia.org/api/rest_v1/page/random/summary');
  if (!r.ok) throw new Error('Impossible de charger un article aléatoire.');
  return r.json();
}

/* ══════════════════════════════════════════
   MAGIC: THE GATHERING
══════════════════════════════════════════ */

function mtgColor(d, h) {
  const t = ((d.description || '') + (d.extract || '')).toLowerCase();
  if (/lumière|paix|divin|saint|église|loi|justice|ordre|noble|paladin|roi|reine/.test(t)) return 'W';
  if (/mer|océan|science|physique|mathématique|invention|magie|illusion|philosophie|technologie/.test(t)) return 'U';
  if (/mort|poison|maladie|épidémie|ombre|nécromant|démon|corruption|trahison|assassinat|peste/.test(t)) return 'B';
  if (/guerre|bataille|feu|volcan|révolution|chaos|dragon|combat/.test(t)) return 'R';
  if (/forêt|nature|animal|plante|bête|croissance|jungle|arbre/.test(t)) return 'G';
  return pick(['W','U','B','R','G'], h);
}

function mtgCardType(d, h) {
  const t = ((d.description || '') + (d.extract || '')).toLowerCase();
  if (/ville|cité|capitale|pays|île|mer|océan|lac|fleuve|mont|forêt|désert|région/.test(t))
    return { type: 'Land', sub: '', isLand: true };
  if (/épée|bouclier|armure|anneau|couronne|bâton|lance|arc|calice|grimoire|relique|talisman/.test(t))
    return { type: 'Artifact', sub: 'Equipment', isLand: false };
  if (/sort|enchantement|alchimie|sorcellerie|malédiction|rune/.test(t))
    return { type: 'Enchantment', sub: 'Saga', isLand: false };
  if (/bataille|guerre|révolution|épidémie|catastrophe|tremblement|éruption|attentat/.test(t))
    return { type: pick(['Instant', 'Sorcery'], h), sub: '', isLand: false };
  if (/général|conquistador|pharaon|sorcier|archimage|dieu|déesse/.test(t) && h % 7 === 0)
    return { type: 'Planeswalker', sub: '', isLand: false };
  let sub = 'Human';
  if (/dragon/.test(t)) sub = 'Dragon';
  else if (/monstre|bête|animal/.test(t)) sub = 'Beast';
  else if (/démon/.test(t)) sub = 'Demon';
  else if (/esprit|fantôme/.test(t)) sub = 'Spirit';
  else if (/vampire/.test(t)) sub = 'Vampire';
  else if (/général|soldat|guerrier/.test(t)) sub = 'Human Soldier';
  else if (/scientifique|inventeur|philosophe/.test(t)) sub = 'Human Wizard';
  else if (/roi|reine|noble/.test(t)) sub = 'Human Noble';
  else if (/prêtre|moine|saint/.test(t)) sub = 'Human Cleric';
  return { type: 'Creature', sub, isLand: false };
}

function mtgSupertype(d) {
  const t = ((d.description || '') + (d.extract || '')).toLowerCase();
  return /né le|né en|général|roi|reine|philosophe|scientifique|artiste|inventeur|île|mont|ville|épée|anneau|grimoire/.test(t)
    ? 'Legendary' : '';
}

function mtgKeywords(color, ct, h) {
  const k = {
    W: ['Flying','Vigilance','Lifelink','First Strike','Protection'],
    U: ['Flying','Hexproof','Flash','Prowess','Islandwalk'],
    B: ['Deathtouch','Lifelink','Menace','Shadow','Intimidate'],
    R: ['Haste','Trample','First Strike'],
    G: ['Trample','Reach','Vigilance','Regenerate'],
    A: ['Defender','Indestructible','Hexproof'],
    M: ['Flying','Trample','Lifelink','Hexproof'],
  };
  if (ct.type !== 'Creature') return [];
  const list = k[color] || k.A;
  return [...new Set([list[h % list.length], list[(h + 3) % list.length]])];
}

function mtgAbility(d, color, ct, h) {
  const sents = ((d.extract || '').match(/[^.!?]+[.!?]+/g) || [d.extract || '']).filter(s => s.trim().length > 20);
  const s = (sents[h % sents.length] || '').trim();
  if (ct.isLand) return `{T}: Ajoutez {${color}} à votre réserve de mana.`;
  if (ct.type === 'Artifact' && ct.sub === 'Equipment')
    return `Équipement — La créature équipée gagne +${range(1,3,h)}/+${range(0,2,h+1)}.\nÉquiper {${range(1,4,h+2)}}`;
  if (ct.type === 'Enchantment')
    return `I, II — Chaque adversaire sacrifie une créature.\nIII — ${s.slice(0, 80)}`;
  if (ct.type === 'Planeswalker')
    return `+1 : ${s.slice(0, 55)}\n−2 : Piochez deux cartes.\n−7 : ${s.slice(0, 55)}`;
  return s.slice(0, 150);
}

function mtgPT(d, ct, h) {
  if (ct.type !== 'Creature') return null;
  const t = (d.extract || '').toLowerCase();
  const b = range(1, 5, h);
  if (/monstre|dragon|bête|démon/.test(t)) return { p: b + 2, t: b + 1 };
  if (/armée|guerrier|bataille|conquête|général/.test(t)) return { p: b + 1, t: b };
  if (/scientifique|inventeur|mathématicien|philosophe/.test(t)) return { p: 1, t: b + 2 };
  return { p: b, t: b };
}

function mtgMana(color, ct, d, h) {
  if (ct.isLand) return [];
  const wc = (d.extract || '').split(/\s+/).length;
  const g = Math.min(8, Math.max(1, Math.round(wc / 70)));
  const syms = [];
  if (g > 1) syms.push({ n: g - 1, cls: 'gen' });
  syms.push({ n: null, cls: 'm' + color });
  return syms;
}

function mtgRarity(h) {
  const r = h % 20;
  return r < 10 ? '◆' : r < 16 ? '◆◆' : r < 19 ? '◆◆◆' : '★';
}

function mtgFlavor(d, h) {
  const desc = d.description || '';
  if (desc.length > 12 && desc.length < 72) return desc;
  const sents = ((d.extract || '').match(/[^.!?]+[.!?]+/g) || [])
    .filter(s => s.trim().length > 15 && s.trim().length < 75);
  return sents.length ? sents[h % sents.length].trim() : '';
}

function buildMTG(d) {
  const h = hash(d.title || 'X');
  const color  = mtgColor(d, h);
  const ct     = mtgCardType(d, h);
  const sup    = mtgSupertype(d);
  const kws    = mtgKeywords(color, ct, h);
  const ab     = mtgAbility(d, color, ct, h + 1);
  const pt     = mtgPT(d, ct, h + 2);
  const loy    = ct.type === 'Planeswalker' ? range(3, 5, h) : null;
  const mana   = mtgMana(color, ct, d, h + 3);
  const typeStr = (sup ? sup + ' ' : '') + ct.type + (ct.sub ? ' — ' + ct.sub : '');
  const EMOJIS = { W:'☀️', U:'💧', B:'💀', R:'🔥', G:'🌿', A:'💎', M:'🌈' };
  return {
    name: (d.title || '').slice(0, 26), color, ct, kws, ab, pt, loy, mana,
    rarity: mtgRarity(h), typeStr, flavor: mtgFlavor(d, h + 4),
    dark: ['U','B','R','G','M'].includes(color),
    image: d.thumbnail?.source || null,
    url: d.content_urls?.desktop?.page || '#',
    emoji: EMOJIS[color] || '🐉',
  };
}

function renderMTG(c) {
  const mc = document.getElementById('mc');
  mc.className = 'mtg-card ' + c.color;
  document.getElementById('mc-name').textContent = c.name;
  document.getElementById('mc-typetxt').textContent = c.typeStr;
  document.getElementById('mc-rarity').textContent = c.rarity;

  const manaEl = document.getElementById('mc-mana');
  manaEl.innerHTML = '';
  c.mana.forEach(m => {
    const s = document.createElement('div');
    s.className = 'msym ' + m.cls;
    const labels = { gen: m.n, mW:'W', mU:'U', mB:'B', mR:'R', mG:'G' };
    s.textContent = labels[m.cls] ?? m.n;
    manaEl.appendChild(s);
  });

  const box = document.getElementById('mc-box');
  box.className = 'mtg-box' + (c.dark ? ' dk' : '');
  document.getElementById('mc-kw').innerHTML = (c.kws.length && c.ct.type === 'Creature')
    ? c.kws.join(', ') : '';
  document.getElementById('mc-ab').innerHTML = c.ab.split('\n').map(l => `<div>${l}</div>`).join('');
  document.getElementById('mc-flav').textContent = c.flavor ? `« ${c.flavor} »` : '';

  const img = document.getElementById('mc-img');
  const ph  = document.getElementById('mc-ph');
  setArt(img, ph, c.image, c.emoji);

  const pt  = document.getElementById('mc-pt');
  const loy = document.getElementById('mc-loy');
  if (c.pt) {
    pt.textContent = `${c.pt.p}/${c.pt.t}`;
    pt.style.display = 'block';
    loy.style.display = 'none';
  } else if (c.loy !== null) {
    loy.textContent = c.loy;
    loy.style.display = 'flex';
    pt.style.display = 'none';
  } else {
    pt.style.display = 'none';
    loy.style.display = 'none';
  }
}

/* ══════════════════════════════════════════
   YU-GI-OH!
══════════════════════════════════════════ */

const ATTRS = { DARK:'🌑', LIGHT:'☀️', FIRE:'🔥', WATER:'💧', EARTH:'🌍', WIND:'💨', DIVINE:'✨' };
const YGO_LABELS = {
  normal:'Normal Monster', effect:'Effect Monster', ritual:'Ritual Monster',
  fusion:'Fusion Monster', synchro:'Synchro Monster', xyz:'Xyz Monster',
  link:'Link Monster', spell:'Spell Card', trap:'Trap Card',
};

function ygoKind(d, h) {
  const t = ((d.description || '') + (d.extract || '')).toLowerCase();
  if (/sort|magie|rituel|alchimie|malédiction|prophétie/.test(t) && h % 5 === 0) return 'spell';
  if (/piège|trahison|embuscade|complot/.test(t) && h % 5 === 1) return 'trap';
  if (/rituel|cérémonie|sacrifice/.test(t) && h % 4 === 0) return 'ritual';
  if (/fusion|hybride|alliance|coalition|empire/.test(t)) return 'fusion';
  if (/lumière|vitesse|énergie|électricité|onde|photon/.test(t)) return 'synchro';
  if (/cosmos|galaxie|univers|espace|trou noir|ténèbres/.test(t)) return 'xyz';
  if (/réseau|technologie|internet|connexion|numérique/.test(t)) return 'link';
  const simple = /né le|peuple|cité|île|lac|mont/.test(t) && !/pouvoir|effet|magie/.test(t);
  return (simple && h % 3 === 0) ? 'normal' : 'effect';
}

function ygoAttr(d) {
  const t = ((d.description || '') + (d.extract || '')).toLowerCase();
  if (/feu|flamme|volcan/.test(t)) return 'FIRE';
  if (/eau|mer|océan|lac|pluie|fleuve/.test(t)) return 'WATER';
  if (/vent|air|tempête|cyclone/.test(t)) return 'WIND';
  if (/lumière|saint|divin|ange|soleil/.test(t)) return 'LIGHT';
  if (/ombre|nuit|mort|ténèbres|démon|vampire/.test(t)) return 'DARK';
  if (/dieu|déesse|divin|sacré/.test(t)) return 'DIVINE';
  return 'EARTH';
}

function ygoLevel(d) {
  const wc = (d.extract || '').split(/\s+/).length;
  return Math.min(12, Math.max(1, Math.round(wc / 50)));
}

function ygoRace(d, h) {
  const t = ((d.description || '') + (d.extract || '')).toLowerCase();
  if (/dragon/.test(t)) return 'Dragon';
  if (/zombie|mort-vivant/.test(t)) return 'Zombie';
  if (/magie|sorcier|sort/.test(t)) return 'Magicien';
  if (/machine|robot/.test(t)) return 'Machine';
  if (/plante|végétal|arbre/.test(t)) return 'Plante';
  if (/insecte/.test(t)) return 'Insecte';
  if (/eau|mer|poisson/.test(t)) return 'Monstre Aquatique';
  if (/feu|flamme/.test(t)) return 'Pyro';
  if (/ange|séraphin/.test(t)) return 'Ange';
  if (/démon|diable/.test(t)) return 'Démon';
  if (/fantôme|spectre/.test(t)) return 'Fantôme';
  if (/monstre|bête|animal/.test(t)) return 'Bête';
  return 'Guerrier';
}

function ygoStats(d, kind, level, h) {
  if (!['normal','effect','ritual','fusion','synchro','xyz','link'].includes(kind)) return null;
  const t = (d.extract || '').toLowerCase();
  let atk = level * 300;
  let def = level * 250;
  if (/monstre|dragon|bête|démon/.test(t)) atk += 500;
  else if (/armée|guerrier|bataille|conquête|général/.test(t)) { atk += 200; def -= 100; }
  else if (/scientifique|inventeur|mathématicien|philosophe/.test(t)) { atk -= 200; def += 300; }
  if (['xyz','synchro','fusion'].includes(kind)) { atk += 500; def += 300; }
  atk = Math.min(5000, Math.round(Math.max(0, atk) / 50) * 50);
  def = Math.min(5000, Math.round(Math.max(0, def) / 50) * 50);
  return { atk, def: kind === 'link' ? null : def };
}

function ygoEffect(d, kind, h) {
  const sents = ((d.extract || '').match(/[^.!?]+[.!?]+/g) || [d.extract || ''])
    .filter(s => s.trim().length > 15);
  const s0 = (sents[0] || '').trim().slice(0, 120);
  const s1 = (sents[1] || '').trim().slice(0, 80);
  if (kind === 'spell')    return `Activez cette carte : ${s0}`;
  if (kind === 'trap')     return `Lorsque votre adversaire déclare une attaque : ${s0}. Piochez 1 carte.`;
  if (kind === 'normal')   return '';
  if (kind === 'ritual')   return `Invoquez Rituellement cette carte avec le Sort Rituel adéquat. ${s0}`;
  if (kind === 'fusion')   return `Doit être Invoqué par Fusion. ${s0} Une fois par tour : ${s1}.`;
  if (kind === 'synchro')  return `1 Syntoniseur + 1 ou plusieurs non-Syntoniseurs. ${s0}`;
  if (kind === 'xyz')      return `2 monstres de Niveau ${h%4+4}. ${s0} Détachez 1 Matériel ; ${s1}.`;
  if (kind === 'link') {
    const ar = ['↑','↗','→','↘','↓','↙','←','↖'];
    const n  = range(1, 4, h);
    const ch = Array.from({ length: n }, (_, i) => ar[(h + i * 2) % 8]);
    return `${n} monstres (non-Jeton). Flèches : ${ch.join(' ')}.\n${s0}`;
  }
  return `Lorsque cette carte est Invoquée : ${s0}. Une fois par tour : ${s1}.`;
}

function ygoBracket(kind, race, h) {
  if (kind === 'spell') return `[Sort — ${pick(['Normale','Continue','Terrain','Équipement','Rituel','Déclenchement Rapide'], h)}]`;
  if (kind === 'trap')  return `[Piège — ${pick(['Normale','Continue','Contre'], h)}]`;
  const ext = { fusion:' / Fusion', synchro:' / Synchro', xyz:' / Xyz', link:' / Lien', ritual:' / Rituel' };
  return `[Monstre ${race}${ext[kind] || ''} ${kind === 'normal' ? '/ Normal' : '/ Effet'}]`;
}

function ygoFlavor(d, kind, h) {
  if (kind !== 'normal') return '';
  const desc = d.description || '';
  if (desc.length > 12 && desc.length < 80) return desc;
  const sents = ((d.extract || '').match(/[^.!?]+[.!?]+/g) || [])
    .filter(s => s.trim().length > 15 && s.trim().length < 80);
  return sents.length ? sents[h % sents.length].trim() : '';
}

function buildYGO(d) {
  const h     = hash(d.title || 'X');
  const kind  = ygoKind(d, h);
  const attr  = ygoAttr(d);
  const level = ygoLevel(d);
  const race  = ygoRace(d, h + 1);
  const stats = ygoStats(d, kind, level, h + 2);
  const eff   = ygoEffect(d, kind, h + 3);
  const flav  = ygoFlavor(d, kind, h + 4);
  const bracket = ygoBracket(kind, race, h + 5);
  return {
    name: (d.title || '').slice(0, 28),
    kind, attr, level, race, stats, eff, flav, bracket,
    isXYZ: kind === 'xyz',
    isLink: kind === 'link',
    linkN: kind === 'link' ? range(1, 4, h) : null,
    serial: String(Math.abs(h)).padStart(8, '0').slice(0, 8),
    image: d.thumbnail?.source || null,
    url: d.content_urls?.desktop?.page || '#',
    emoji: ATTRS[attr] || '🐉',
  };
}

function renderYGO(c) {
  const yc = document.getElementById('yc');
  yc.className = 'ygo-card ' + c.kind;
  document.getElementById('yc-name').textContent = c.name;
  document.getElementById('yc-attr').textContent = ATTRS[c.attr] || '🌍';

  const img = document.getElementById('yc-img');
  const ph  = document.getElementById('yc-ph');
  setArt(img, ph, c.image, c.emoji);

  const starsEl = document.getElementById('yc-stars');
  starsEl.innerHTML = '';
  if (!c.isXYZ && !c.isLink) {
    for (let i = 0; i < c.level; i++) {
      const s = document.createElement('span');
      s.className = 'ygo-star';
      s.textContent = '★';
      starsEl.appendChild(s);
    }
  } else if (c.isXYZ) {
    for (let i = 0; i < c.level; i++) {
      const s = document.createElement('span');
      s.className = 'ygo-star rk';
      s.textContent = '✦';
      starsEl.appendChild(s);
    }
  } else {
    const s = document.createElement('span');
    s.className = 'ygo-star lk';
    s.textContent = 'LINK-' + c.linkN;
    starsEl.appendChild(s);
  }

  document.getElementById('yc-subtype').textContent = YGO_LABELS[c.kind] || c.kind;
  document.getElementById('yc-bracket').textContent = c.bracket;
  document.getElementById('yc-eff').innerHTML = c.eff.split('\n').map(l => `<div>${l}</div>`).join('');
  document.getElementById('yc-flav').textContent = c.flav || '';

  const statsEl = document.getElementById('yc-stats');
  statsEl.innerHTML = '';
  if (c.stats) {
    const a = document.createElement('div');
    a.className = 'ygo-stat';
    a.innerHTML = `ATK / <span>${c.stats.atk}</span>`;
    statsEl.appendChild(a);
    if (c.stats.def !== null) {
      const dv = document.createElement('div');
      dv.className = 'ygo-stat';
      dv.innerHTML = `DEF / <span>${c.stats.def}</span>`;
      statsEl.appendChild(dv);
    }
  }
  document.getElementById('yc-serial').textContent = c.serial;
}

/* ══ Utilitaire image ══ */
function setArt(img, ph, src, emoji) {
  if (src) {
    img.src = src;
    img.style.display = 'block';
    ph.style.display = 'none';
    img.onerror = () => {
      img.style.display = 'none';
      ph.textContent = emoji;
      ph.style.display = 'flex';
    };
  } else {
    img.style.display = 'none';
    ph.textContent = emoji;
    ph.style.display = 'flex';
  }
}

/* ══ Mode switch ══ */
let currentData = null;
let currentMode = 'mtg';

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btnMTG').className = 'mode-btn' + (mode === 'mtg' ? ' m-active' : '');
  document.getElementById('btnYGO').className = 'mode-btn' + (mode === 'ygo' ? ' y-active' : '');
  document.getElementById('view-mtg').classList.toggle('hidden', mode !== 'mtg');
  document.getElementById('view-ygo').classList.toggle('hidden', mode !== 'ygo');
  if (currentData) {
    if (mode === 'mtg') renderMTG(buildMTG(currentData));
    else                renderYGO(buildYGO(currentData));
  }
}

/* ══ UI helpers ══ */
function setLoading(on) {
  document.getElementById('loader').classList.toggle('hidden', !on);
  document.getElementById('bGen').disabled  = on;
  document.getElementById('bRand').disabled = on;
}

function showErr(msg) {
  const e = document.getElementById('err');
  e.textContent = msg;
  e.classList.remove('hidden');
}

/* ══ Recherche principale ══ */
async function go(title) {
  document.getElementById('q').value = title;
  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const data = await fetchWiki(title);
    currentData = data;
    document.getElementById('wikiLink').href = data.content_urls?.desktop?.page || '#';
    if (currentMode === 'mtg') renderMTG(buildMTG(data));
    else                        renderYGO(buildYGO(data));
    document.getElementById('out').classList.remove('hidden');
  } catch (e) {
    showErr(e.message);
  } finally {
    setLoading(false);
  }
}

/* ══ Aléatoire ══ */
async function goRandom() {
  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const data = await fetchRandom();
    currentData = data;
    document.getElementById('q').value = data.title || '';
    document.getElementById('wikiLink').href = data.content_urls?.desktop?.page || '#';
    if (currentMode === 'mtg') renderMTG(buildMTG(data));
    else                        renderYGO(buildYGO(data));
    document.getElementById('out').classList.remove('hidden');
  } catch (e) {
    showErr(e.message);
  } finally {
    setLoading(false);
  }
}

/* ══ Events ══ */
document.getElementById('bGen').addEventListener('click', () => {
  const q = document.getElementById('q').value.trim();
  if (q) go(q);
});


/* ── Carte du jour ── */
async function goDaily() {
  // Seed basé sur la date du jour — même seed = même article
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  // On utilise un titre déterministe via l'API "random" seedée par date
  const cached = localStorage.getItem('wikitcg-daily-date');
  const cachedTitle = localStorage.getItem('wikitcg-daily-title');

  if (cached === String(seed) && cachedTitle) {
    go(cachedTitle);
    return;
  }
  // Pas encore en cache : on tire aléatoirement et on stocke
  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const data = await fetchRandom();
    localStorage.setItem('wikitcg-daily-date', String(seed));
    localStorage.setItem('wikitcg-daily-title', data.title);
    currentData = data;
    document.getElementById('q').value = data.title || '';
    document.getElementById('wikiLink').href = data.content_urls?.desktop?.page || '#';
    if (currentMode === 'mtg') renderMTG(buildMTG(data));
    else                        renderYGO(buildYGO(data));
    document.getElementById('out').classList.remove('hidden');
  } catch (e) {
    showErr(e.message);
  } finally {
    setLoading(false);
  }
}

document.getElementById('bDaily').addEventListener('click', goDaily);

document.getElementById('bRand').addEventListener('click', goRandom);

document.getElementById('q').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = document.getElementById('q').value.trim();
    if (q) go(q);
  }
});
