'use strict';
/* ══════════════════════════════════════════
   WIKITCG — app.js v3 — Claude-powered
══════════════════════════════════════════ */

/* ══ Utils ══ */
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0; return Math.abs(h); };
const pick = (a, s) => a[Math.abs(s) % a.length];
const rng  = (min, max, seed) => min + (Math.abs(seed) % (max - min + 1));

/* ══ Thème ══ */
const themeBtn = document.getElementById('themeBtn');
const saved    = localStorage.getItem('wikitcg-theme') || 'dark';
document.documentElement.setAttribute('data-theme', saved);
themeBtn.textContent = saved === 'dark' ? '☀' : '☽';
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
async function fetchCategories(title) {
  const url = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=categories&cllimit=50&clshow=!hidden&format=json&origin=*`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    const pages = data.query?.pages || {};
    const page  = Object.values(pages)[0];
    return (page?.categories || []).map(c => c.title.replace('Catégorie:', '').toLowerCase());
  } catch { return []; }
}

/* ══════════════════════════════════════════
   CLAUDE API — Génération du contenu de carte
══════════════════════════════════════════ */

async function generateCardWithClaude(summary, cats) {
  const title   = summary.title || '';
  const desc    = summary.description || '';
  const extract = (summary.extract || '').slice(0, 1200);
  const catStr  = cats.slice(0, 15).join(', ');

  const prompt = `Tu es un expert des jeux de cartes Magic: The Gathering et Yu-Gi-Oh!. À partir de l'article Wikipédia suivant, crée une carte TCG originale et fidèle au sujet.

ARTICLE WIKIPÉDIA :
Titre : ${title}
Description : ${desc}
Catégories : ${catStr}
Extrait : ${extract}

Génère un objet JSON avec exactement cette structure. Réponds UNIQUEMENT avec le JSON brut, aucun texte avant ou après, aucun backtick.

{
  "category": "person|animal|place|event|object|work|concept",
  "mtg": {
    "name": "nom court max 27 caractères",
    "color": "W|U|B|R|G|A",
    "colorReason": "une phrase expliquant pourquoi cette couleur",
    "typeStr": "ex: Créature légendaire — Humain Guerrier",
    "manaGeneric": 3,
    "manaColored": 1,
    "rarity": "◆|◆◆|◆◆◆|★",
    "keywords": ["Célérité", "Vol"],
    "ability": "Texte de capacité MTG précis et original, lié au sujet. Peut contenir \\n pour les sauts de ligne. Utilise des mécaniques MTG réelles (Piétinement, Lien de vie, Flash, Hexproof, etc.). Fais référence à des aspects concrets du sujet.",
    "flavorText": "Citation ou phrase d'ambiance en italique, liée au sujet, max 80 caractères",
    "power": 3,
    "toughness": 3,
    "isCreature": true
  },
  "ygo": {
    "name": "nom court max 28 caractères",
    "kind": "normal|effect|ritual|fusion|synchro|xyz|link|spell|trap",
    "attr": "DARK|LIGHT|FIRE|WATER|EARTH|WIND|DIVINE",
    "race": "ex: Guerrier|Dragon|Magicien|Monstre aquatique|Plante|etc.",
    "level": 4,
    "atk": 1800,
    "def": 1200,
    "bracket": "[Guerrier / Effet]",
    "effect": "Texte d'effet YGO précis, original, lié au sujet réel de l'article. Utilise la syntaxe YGO : 'Lorsque cette carte est...', 'Une fois par tour :', 'Pendant votre Main Phase :'. Peut contenir \\n. Sois créatif et spécifique.",
    "flavorText": "Texte de saveur si monstre normal, sinon vide",
    "isMonster": true,
    "isSpell": false,
    "isTrap": false
  }
}

Règles importantes :
- Pour MTG : color W=blanc/lumière/ordre, U=eau/intellect/mystère, B=mort/pouvoir/corruption, R=feu/chaos/passion, G=nature/vie/instinct, A=artefact/neutre
- Pour MTG : si c'est un lieu, typeStr commence par "Terrain" et isCreature=false, power/toughness=null
- Pour MTG : si c'est un événement/concept/œuvre, isCreature=false, power/toughness=null, typeStr="Éphémère" ou "Rituel" ou "Enchantement"
- Pour YGO : si c'est un lieu, kind="spell" et bracket="[Magie — Terrain]", isMonster=false, isSpell=true, level=null, atk=null, def=null
- Pour YGO : si kind est spell ou trap, isMonster=false, level=null, atk=null, def=null
- Les capacités/effets doivent vraiment refléter ce qu'est le sujet, pas être génériques
- Le flavor text doit être poétique et lié au sujet`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error('Erreur API Claude');
  const data = await response.json();
  const text = data.content?.map(b => b.text || '').join('') || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* ══ Cache par titre ══ */
const _claudeCache = {};

async function getCardData(summary, cats) {
  const key = summary.title;
  if (_claudeCache[key]) return _claudeCache[key];
  const result = await generateCardWithClaude(summary, cats);
  _claudeCache[key] = result;
  return result;
}

/* ══════════════════════════════════════════
   RENDER MTG
══════════════════════════════════════════ */

function renderMTG(card, summary) {
  const mc = document.getElementById('mc');
  mc.className = 'mtg-card ' + (card.color || 'A');

  document.getElementById('mc-name').textContent    = card.name || summary.title?.slice(0, 27) || '';
  document.getElementById('mc-typetxt').textContent = card.typeStr || 'Carte';
  document.getElementById('mc-rarity').textContent  = card.rarity || '◆';

  /* Mana */
  const manaEl = document.getElementById('mc-mana');
  manaEl.innerHTML = '';
  const generic = card.manaGeneric ?? 2;
  const colored = card.manaColored ?? 1;
  const color   = card.color || 'A';
  if (generic > 0) {
    const s = document.createElement('div');
    s.className = 'msym gen';
    s.textContent = String(generic);
    manaEl.appendChild(s);
  }
  for (let i = 0; i < colored; i++) {
    const s = document.createElement('div');
    s.className = 'msym m' + color;
    s.textContent = color;
    manaEl.appendChild(s);
  }

  /* Keywords + ability */
  const kws = card.keywords || [];
  document.getElementById('mc-kw').innerHTML = kws.length ? `<em>${kws.join(', ')}</em>` : '';
  document.getElementById('mc-ab').innerHTML = (card.ability || '').split('\n').map(l => `<div>${l}</div>`).join('');
  document.getElementById('mc-flav').textContent = card.flavorText ? `« ${card.flavorText} »` : '';

  /* Art */
  setArt(document.getElementById('mc-img'), document.getElementById('mc-ph'), summary.thumbnail?.source || null, colorEmoji(color));

  /* P/T */
  const ptEl = document.getElementById('mc-pt');
  if (card.isCreature && card.power != null && card.toughness != null) {
    ptEl.textContent = `${card.power}/${card.toughness}`;
    ptEl.classList.add('show');
  } else {
    ptEl.classList.remove('show');
  }
}

function colorEmoji(color) {
  return { W: '☀️', U: '💧', B: '💀', R: '🔥', G: '🌿', A: '💎' }[color] || '✨';
}

/* ══════════════════════════════════════════
   RENDER YGO
══════════════════════════════════════════ */

const ATTRS = { DARK: '🌑', LIGHT: '☀️', FIRE: '🔥', WATER: '💧', EARTH: '🌍', WIND: '💨', DIVINE: '✨' };
const YGO_LABELS = { normal: 'Monstre Normal', effect: 'Monstre à Effet', ritual: 'Monstre Rituel', fusion: 'Monstre Fusion', synchro: 'Monstre Synchro', xyz: 'Monstre Xyz', link: 'Monstre Lien', spell: 'Carte Magie', trap: 'Carte Piège' };

function renderYGO(card, summary) {
  const yc = document.getElementById('yc');
  yc.className = 'ygo-card ' + (card.kind || 'effect');

  document.getElementById('yc-name').textContent = card.name || summary.title?.slice(0, 28) || '';
  document.getElementById('yc-attr').textContent = ATTRS[card.attr] || '🌍';

  /* Étoiles */
  const starsEl  = document.getElementById('yc-stars');
  const levelRow = document.getElementById('yc-level-row');
  starsEl.innerHTML = '';
  const level = card.level;
  const kind  = card.kind || 'effect';

  if (level && kind !== 'link' && kind !== 'spell' && kind !== 'trap') {
    levelRow.style.display = '';
    const isXYZ     = kind === 'xyz';
    const starChar  = isXYZ ? '✦' : '★';
    const starClass = isXYZ ? 'ygo-star rk' : 'ygo-star';
    for (let i = 0; i < level; i++) {
      const s = document.createElement('span');
      s.className = starClass;
      s.textContent = starChar;
      starsEl.appendChild(s);
    }
  } else if (kind === 'link' && card.linkRating) {
    levelRow.style.display = '';
    const s = document.createElement('span');
    s.className = 'ygo-star lk';
    s.textContent = 'LINK-' + card.linkRating;
    starsEl.appendChild(s);
  } else {
    levelRow.style.display = 'none';
  }

  /* Art */
  setArt(document.getElementById('yc-img'), document.getElementById('yc-ph'), summary.thumbnail?.source || null, ATTRS[card.attr] || '🌍');

  /* Bracket / type */
  document.getElementById('yc-subtype').textContent = YGO_LABELS[kind] || kind;
  document.getElementById('yc-bracket').textContent = card.bracket || '';

  /* Effet */
  document.getElementById('yc-eff').innerHTML = (card.effect || '').split('\n').map(l => `<div>${l}</div>`).join('');
  document.getElementById('yc-flav').textContent = card.flavorText || '';

  /* Stats */
  const statsEl = document.getElementById('yc-stats');
  statsEl.innerHTML = '';
  if (card.isMonster && card.atk != null) {
    const a  = document.createElement('div'); a.className = 'ygo-stat'; a.innerHTML = `ATK / <span>${card.atk}</span>`; statsEl.appendChild(a);
    const dv = document.createElement('div'); dv.className = 'ygo-stat'; dv.innerHTML = `DEF / <span>${card.def ?? 0}</span>`; statsEl.appendChild(dv);
  }

  document.getElementById('yc-serial').textContent = card.serial || String(hash(summary.title || 'X')).padStart(8, '0').slice(0, 8);
}

/* ══ setArt ══ */
function setArt(img, ph, src, emoji) {
  if (src) {
    img.src = src; img.style.display = 'block'; ph.style.display = 'none';
    img.onerror = () => { img.style.display = 'none'; ph.textContent = emoji; ph.style.display = 'flex'; };
  } else {
    img.style.display = 'none'; ph.textContent = emoji; ph.style.display = 'flex';
  }
}

/* ══ Mode switch ══ */
let currentSummary = null, currentCats = [], currentCard = null, currentMode = 'mtg';

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btnMTG').className = 'mode-btn' + (mode === 'mtg' ? ' m-active' : '');
  document.getElementById('btnYGO').className = 'mode-btn' + (mode === 'ygo' ? ' y-active' : '');
  document.getElementById('view-mtg').classList.toggle('hidden', mode !== 'mtg');
  document.getElementById('view-ygo').classList.toggle('hidden', mode !== 'ygo');
  if (currentCard && currentSummary) {
    if (mode === 'mtg') renderMTG(currentCard.mtg, currentSummary);
    else renderYGO(currentCard.ygo, currentSummary);
  }
}

/* ══ Loading ══ */
function setLoading(on) {
  document.getElementById('loader').classList.toggle('hidden', !on);
  ['bGen', 'bRand', 'bDaily'].forEach(id => { document.getElementById(id).disabled = on; });
}
function showErr(msg) {
  const e = document.getElementById('err');
  e.textContent = msg;
  e.classList.remove('hidden');
}

/* ══ loadCard ══ */
async function loadCard(summaryPromise) {
  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const summary = await summaryPromise;
    const cats    = await fetchCategories(summary.title);
    currentSummary = summary;
    currentCats    = cats;

    document.getElementById('q').value = summary.title || '';
    document.getElementById('wikiLink').href = summary.content_urls?.desktop?.page || '#';

    /* Génération Claude */
    const card = await getCardData(summary, cats);
    currentCard = card;

    /* Ajouter le serial YGO si absent */
    if (card.ygo && !card.ygo.serial) {
      card.ygo.serial = String(hash(summary.title || 'X')).padStart(8, '0').slice(0, 8);
    }

    if (currentMode === 'mtg') renderMTG(card.mtg, summary);
    else renderYGO(card.ygo, summary);

    document.getElementById('out').classList.remove('hidden');
  } catch (e) {
    showErr(e.message);
  } finally {
    setLoading(false);
  }
}

/* ══ Carte du jour ══ */
async function goDaily() {
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const cached      = localStorage.getItem('wikitcg-daily-date');
  const cachedTitle = localStorage.getItem('wikitcg-daily-title');
  if (cached === String(seed) && cachedTitle) {
    loadCard(fetchWiki(cachedTitle));
    return;
  }
  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const summary = await fetchRandom();
    localStorage.setItem('wikitcg-daily-date', String(seed));
    localStorage.setItem('wikitcg-daily-title', summary.title);
    const cats = await fetchCategories(summary.title);
    currentSummary = summary;
    currentCats    = cats;
    document.getElementById('q').value = summary.title || '';
    document.getElementById('wikiLink').href = summary.content_urls?.desktop?.page || '#';
    const card = await getCardData(summary, cats);
    currentCard = card;
    if (!card.ygo.serial) card.ygo.serial = String(hash(summary.title || 'X')).padStart(8, '0').slice(0, 8);
    if (currentMode === 'mtg') renderMTG(card.mtg, summary);
    else renderYGO(card.ygo, summary);
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
  if (q) loadCard(fetchWiki(q));
});
document.getElementById('bRand').addEventListener('click', () => loadCard(fetchRandom()));
document.getElementById('bDaily').addEventListener('click', goDaily);
document.getElementById('q').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = document.getElementById('q').value.trim();
    if (q) loadCard(fetchWiki(q));
  }
});
