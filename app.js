'use strict';
/* ══════════════════════════════════════════
   WIKITCG — app.js v2
══════════════════════════════════════════ */

/* ══ Utils ══ */
const hash  = s => { let h = 5381; for (let i=0;i<s.length;i++) h=(Math.imul(h,33)+s.charCodeAt(i))|0; return Math.abs(h); };
const pick  = (a, s) => a[Math.abs(s) % a.length];
const rng   = (min, max, seed) => min + (Math.abs(seed) % (max - min + 1));

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
  const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.trim().replace(/ /g,'_'))}`;
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
    return (page?.categories || []).map(c => c.title.replace('Catégorie:','').toLowerCase());
  } catch { return []; }
}

/* ══ YGOPro cache ══ */
const _ygoCache = {};

async function fetchYGOEffect(category, subtype, attr, race, level, h) {
  const key = `${category}|${subtype}|${attr}|${race}`;
  if (_ygoCache[key]) return _ygoCache[key];

  let params = {};
  if (category === 'place')   params = { type: 'Field Spell Card', num: 20 };
  else if (category === 'event') params = { type: pick(['Spell Card','Trap Card'], h), num: 20 };
  else if (['work','concept'].includes(category)) params = { type: 'Spell Card', num: 20 };
  else if (category === 'object') params = { type: pick(['Spell Card','Spell Card'], h), num: 20 };
  else {
    const kinds = { fusion:'Fusion Monster', synchro:'Synchro Monster', xyz:'XYZ Monster', link:'Link Monster', ritual:'Ritual Monster', normal:'Normal Monster', effect:'Effect Monster' };
    const kind  = ygoKindFromCat(category, h);
    params = { type: kinds[kind] || 'Effect Monster', num: 20, offset: h % 100 };
    if (attr && attr !== 'DIVINE') params.attribute = attr.toLowerCase();
    if (race && race !== 'Magie')  params.race = race;
  }

  try {
    const qs  = new URLSearchParams(params);
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?${qs}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data) return [];

    const sentences = [];
    for (const card of data.data) {
      if (!card.desc) continue;
      const parts = card.desc
        .split(/(?<=[.!])\s+|\n/)
        .map(s => s.trim())
        .filter(s => s.length > 25 && s.length < 200 && !/["«»""][\w\s'-]{3,35}["»""]/.test(s));
      sentences.push(...parts);
    }
    _ygoCache[key] = sentences;
    return sentences;
  } catch { return []; }
}

function ygoKindFromCat(category, h) {
  if (['place','event','work','concept','object'].includes(category)) return 'spell';
  const r = h % 12;
  if (r === 0) return 'fusion';
  if (r === 1) return 'synchro';
  if (r === 2) return 'xyz';
  if (r === 3) return 'ritual';
  if (r === 4) return 'normal';
  return 'effect';
}

function pickEffect(sentences, h) {
  if (!sentences.length) return null;
  const n = 1 + (h % 3); // 1-3 phrases
  const picked = [], used = new Set();
  for (let i = 0; i < n; i++) {
    let idx = (h + i * 1337) % sentences.length;
    let tries = 0;
    while (used.has(idx) && tries < 10) { idx = (idx + 1) % sentences.length; tries++; }
    used.add(idx); picked.push(sentences[idx]);
  }
  return picked.join(' ');
}

/* ══════════════════════════════════════════
   DÉTECTION DE CATÉGORIE — Version améliorée
══════════════════════════════════════════ */

function detectCategory(summary, cats) {
  const desc    = (summary.description || '').toLowerCase();
  const extract = (summary.extract     || '').toLowerCase();
  const all     = desc + ' ' + cats.join(' ');
  const first300 = extract.slice(0, 300);

  /* ── Lieux en premier (les coordonnées ne mentent pas) ── */
  if (summary.coordinates) return 'place';
  if (/commune|municipalit|ville|cité|capitale|pays|région|département|province|district|arrondissement|territoire/.test(desc)) return 'place';
  if (/île|archipel|péninsule|océan|mer |lac |fleuve|rivière|canal|détroit|golfe|baie|montagne|volcan|col |massif|désert|forêt|parc national|réserve naturelle/.test(desc)) return 'place';
  if (cats.some(c => /géographie|commune|ville|territoire|province/.test(c))) return 'place';

  /* ── Espèces / animaux ── */
  if (/espèce|sous-espèce|mammifère|reptile|oiseau|poisson|insecte|arachnid|amphibien|mollusque|crustacé|félin|canidé|primate|cétacé|dinosaure|arachnide|arthropode|végét|plante|arbre|fleur|champignon/.test(desc)) return 'animal';
  if (cats.some(c => /faune|zoologie|animal|botanique|espèce/.test(c))) return 'animal';

  /* ── Personnes ── */
  if (/né le|née le|né à |née à /.test(first300)) return 'person';
  if (/homme politique|femme politique|militaire|général|amiral|roi |reine |emperor|impératrice|prince |princesse |duc |comte |pharaon|sultan|tsar|président/.test(desc)) return 'person';
  if (/physicien|chimiste|mathématicien|biologiste|médecin|philosophe|historien|archéologue|astron/.test(desc)) return 'person';
  if (/acteur|actrice|réalisateur|musicien|chanteur|chanteuse|compositeur|écrivain|auteur|poète|peintre|sculpteur|architecte|dessinateur/.test(desc)) return 'person';
  if (/footballeur|tennisman|cycliste|nageur|athlète|boxeur|pilote de/.test(desc)) return 'person';
  if (cats.some(c => /naissance|décès|personnalité|biographie/.test(c))) return 'person';

  /* ── Événements ── */
  if (/bataille de|guerre de|siège de|combat de|révolution|insurrection|coup d'état|offensive|opération militaire/.test(desc)) return 'event';
  if (/tremblement de terre|séisme|éruption|tsunami|ouragan|cyclone|catastrophe/.test(desc)) return 'event';
  if (/épidémie|pandémie|peste |choléra|grippe/.test(desc)) return 'event';
  if (/attentat|massacre|génocide/.test(desc)) return 'event';
  if (/traité de|accord de|conférence de|sommet de/.test(desc)) return 'event';

  /* ── Objets / artefacts ── */
  if (/épée|lance|bouclier|armure|casque|arme |fusil|canon/.test(desc)) return 'object';
  if (/navire|bateau|vaisseau|frégate|galère|sous-marin|avion|locomotive|automobile|véhicule/.test(desc)) return 'object';
  if (/monument|temple|château|cathédrale|basilique|mosquée|palais|tour |pont |pyramide/.test(desc)) return 'object';
  if (/relique|talisman|couronne|sceptre|anneau|calice|grimoire|amulette/.test(desc)) return 'object';

  /* ── Œuvres ── */
  if (/film |série télévisée|documentaire|long métrage|court métrage/.test(desc)) return 'work';
  if (/roman |livre |manga|bande dessinée|album de|chanson|opéra|symphonie/.test(desc)) return 'work';
  if (/tableau |peinture|sculpture|œuvre d'art|jeu vidéo|jeu de société/.test(desc)) return 'work';
  if (cats.some(c => /film|roman|album|jeu vidéo|série/.test(c))) return 'work';

  /* ── Concepts / sciences / autres ── */
  return 'concept';
}

/* ══ Sous-types ══ */
function personSubtype(desc) {
  const d = desc.toLowerCase();
  if (/roi |reine |emperor|impératrice|prince |princesse|pharaon|sultan|tsar|duc |comte /.test(d)) return 'Noble';
  if (/général|amiral|maréchal|officier|militaire/.test(d)) return 'Guerrier';
  if (/physicien|chimiste|mathématicien|ingénieur|inventeur|scientifique/.test(d)) return 'Mage';
  if (/philosophe|théologien|écrivain|auteur|historien/.test(d)) return 'Sage';
  if (/prêtre|évêque|cardinal|pape|moine|imam|rabbin/.test(d)) return 'Prêtre';
  if (/footballeur|tennisman|cycliste|nageur|athlète|boxeur|sportif/.test(d)) return 'Champion';
  if (/espion|agent secret|assassin/.test(d)) return 'Espion';
  if (/acteur|actrice|musicien|chanteur|peintre|architecte/.test(d)) return 'Artiste';
  return 'Humain';
}

function animalSubtype(desc) {
  const d = desc.toLowerCase();
  if (/dragon/.test(d)) return 'Dragon';
  if (/dinosaure/.test(d)) return 'Dinosaure';
  if (/serpent|python|anaconda|cobra|vipère/.test(d)) return 'Reptile';
  if (/araignée|scorpion|mygale/.test(d)) return 'Araignée';
  if (/loup|renard|canidé|chien sauvage/.test(d)) return 'Loup';
  if (/chat|lion|tigre|léopard|jaguar|guépard|lynx/.test(d)) return 'Félin';
  if (/ours|panda/.test(d)) return 'Ours';
  if (/aigle|faucon|chouette|vautour|rapace|perroquet/.test(d)) return 'Oiseau';
  if (/requin|baleine|dauphin|orque/.test(d)) return 'Aquatique';
  if (/insecte|fourmi|abeille|guêpe|papillon|coléoptère/.test(d)) return 'Insecte';
  if (/gorille|chimpanzé|singe|primate/.test(d)) return 'Singe';
  if (/cheval|zèbre|licorne/.test(d)) return 'Cheval';
  if (/crocodile|lézard|alligator/.test(d)) return 'Reptile';
  if (/plante|arbre|végét|champignon/.test(d)) return 'Plante';
  return 'Bête';
}

function objectSubtype(desc) {
  const d = desc.toLowerCase();
  if (/épée|sabre|dague|lance|arme blanche|hallebarde/.test(d)) return 'Arme';
  if (/bouclier|armure|casque/.test(d)) return 'Armure';
  if (/navire|bateau|vaisseau|frégate|galère/.test(d)) return 'Vaisseau';
  if (/avion|dirigeable|fusée/.test(d)) return 'Aéronef';
  if (/château|temple|cathédrale|pyramide|monument|tour |pont /.test(d)) return 'Monument';
  if (/anneau|couronne|sceptre|relique|talisman|calice|grimoire|amulette/.test(d)) return 'Artefact';
  return 'Artefact';
}

/* ══ Couleurs MTG ══ */
function colorForCategory(category, desc, cats, h) {
  const d = desc.toLowerCase();
  switch (category) {
    case 'place': {
      if (/île|archipel|océan|mer |lac |fleuve|rivière|port |côte|maritime/.test(d)) return 'U';
      if (/montagne|volcan|désert/.test(d)) return 'R';
      if (/forêt|jungle|parc naturel|réserve|savane|prairie/.test(d)) return 'G';
      if (/cathédrale|basilique|abbaye|monastère|église|saint|sacré/.test(d)) return 'W';
      if (/cimetière|tombeau|catacombes|nécropole/.test(d)) return 'B';
      return pick(['W','U','G'], h);
    }
    case 'person': {
      if (/général|militaire|guerre|révolution|conquête/.test(d)) return 'R';
      if (/roi |reine |noble|saint|justice|ordre|pape|évêque/.test(d)) return 'W';
      if (/physicien|mathématicien|inventeur|philosophe|scientifique/.test(d)) return 'U';
      if (/assassin|espion|poison|trahison|tyran|dictateur/.test(d)) return 'B';
      if (/biologiste|botaniste|naturaliste|écologiste/.test(d)) return 'G';
      return pick(['W','U','B','R','G'], h);
    }
    case 'animal': {
      if (/aquatique|marin|océan|mer |eau|poisson|baleine|requin/.test(d)) return 'U';
      if (/dragon|serpent|venimeux|prédateur|carnivore/.test(d)) return 'R';
      if (/nocturne|chauve-souris|sombre/.test(d)) return 'B';
      if (/forêt|jungle|insecte|herbivore|plante/.test(d)) return 'G';
      if (/aigle|faucon|oiseau|céleste|lumineux/.test(d)) return 'W';
      return 'G';
    }
    case 'event': {
      if (/épidémie|pandémie|peste|poison/.test(d)) return 'B';
      if (/tremblement|éruption|tsunami|catastrophe/.test(d)) return 'R';
      if (/traité|accord|paix|diplomatie/.test(d)) return 'W';
      if (/découverte|exploration|invention/.test(d)) return 'U';
      return pick(['R','B'], h);
    }
    case 'object': {
      const sub = objectSubtype(d);
      if (sub === 'Arme' || sub === 'Vaisseau') return 'R';
      if (sub === 'Armure' || sub === 'Monument') return 'W';
      if (sub === 'Artefact') return 'A';
      return 'A';
    }
    case 'work':    return pick(['U','W','B'], h);
    case 'concept': return pick(['U','W','B','G'], h);
    default:        return pick(['U','W','B','R','G'], h);
  }
}

/* ══ Capacités MTG ══ */
function mtgAbility(category, subtype, desc, color, h) {
  const d = desc.toLowerCase();
  const m = { W:'{W}', U:'{U}', B:'{B}', R:'{R}', G:'{G}' };

  if (category === 'place') {
    if (/île|océan|mer |lac |fleuve|rivière/.test(d))
      return `{T} : Ajoutez ${m[color] || '{U}'} à votre réserve de mana.\n{T} : Piochez une carte, puis défaussez-vous d'une carte.`;
    if (/montagne|volcan/.test(d))
      return `{T} : Ajoutez ${m[color] || '{R}'} à votre réserve de mana.\n{T}, Sacrifiez ~ : Cette carte inflige 2 blessures à n'importe quelle cible.`;
    if (/forêt|jungle|parc/.test(d))
      return `{T} : Ajoutez ${m[color] || '{G}'} à votre réserve de mana.\n{T} : Cherchez une Forêt de base dans votre bibliothèque, mettez-la sur le champ de bataille.`;
    if (/château|palais|temple|cathédrale/.test(d))
      return `{T} : Ajoutez ${m[color] || '{W}'} à votre réserve de mana.\nLes créatures légendaires que vous contrôlez gagnent +1/+1.`;
    return `{T} : Ajoutez ${m[color] || '{C}'} à votre réserve de mana.`;
  }

  if (category === 'person') {
    if (/roi |reine |emperor|impératrice|pharaon/.test(d))
      return `Au début de chaque combat, les autres créatures que vous contrôlez gagnent +1/+1 jusqu'à la fin du tour.\nVous pouvez invoquer des créatures légendaires sans payer leur coût de mana.`;
    if (/général|amiral|maréchal/.test(d))
      return `Quand ~ entre sur le champ de bataille, cherchez dans votre bibliothèque une carte Créature de force 2 ou moins et mettez-la sur le champ de bataille.\nLes créatures que vous contrôlez ont la Célérité.`;
    if (/physicien|scientifique|inventeur|ingénieur/.test(d))
      return `{2}, {T} : Créez un jeton Artefact 0/0 incolore avec deux marqueurs +1/+1.\nLes Artefacts que vous contrôlez ont la Hexproof.`;
    if (/philosophe|écrivain|auteur|historien/.test(d))
      return `Quand ~ entre sur le champ de bataille, piochez deux cartes.\nVos sorts coûtent {1} de moins à lancer.`;
    if (/prêtre|moine|pape|évêque|saint/.test(d))
      return `Lien de vie.\nChaque fois que vous gagnez des points de vie, mettez un marqueur +1/+1 sur ~.`;
    if (/assassin|espion/.test(d))
      return `Discrétion.\nChaque fois que ~ inflige des blessures de combat à un joueur, ce joueur défausse une carte.`;
    if (/sportif|athlète|boxeur|champion/.test(d))
      return `Célérité. Premier combat.\nChaque fois que ~ attaque, il gagne +1/+0 pour chaque autre créature attaquante.`;
    return `Quand ~ entre sur le champ de bataille, regardez les ${rng(3,5,h)} premières cartes de votre bibliothèque. Mettez-en une dans votre main, replacez le reste.`;
  }

  if (category === 'animal') {
    if (/dragon/.test(d)) return `Vol. Célérité.\n{R}, {T} : ~ inflige X blessures à n'importe quelle cible, où X est sa force.`;
    if (/venimeux|serpent|araignée/.test(d)) return `Contact mortel. Portée.\nChaque fois qu'une créature bloquée par ~ meurt, son contrôleur perd 2 points de vie.`;
    if (/aquatique|marin|baleine|requin|dauphin/.test(d)) return `~ ne peut être bloqué que par des créatures avec Islandwalk.\nChaque fois que ~ attaque, piochez une carte.`;
    if (/aigle|faucon|oiseau/.test(d)) return `Vol. Vigilance.\nQuand ~ entre sur le champ de bataille, regardez la carte du dessus de votre bibliothèque.`;
    if (/loup|meute/.test(d)) return `Chaque fois qu'une autre créature entre sur le champ de bataille sous votre contrôle, ~ gagne +1/+1 jusqu'à la fin du tour.`;
    if (/dragon/.test(d)) return `Vol. Piétinement.\n{2} : ~ gagne +2/+0 jusqu'à la fin du tour.`;
    return `Quand ~ entre sur le champ de bataille, cherchez une carte Créature du même sous-type dans votre bibliothèque et mettez-la dans votre main.`;
  }

  if (category === 'object') {
    const sub = objectSubtype(d);
    if (sub === 'Arme')    return `Équipement\nLa créature équipée gagne +${rng(1,3,h)}/+${rng(0,1,h+1)} et a la ${pick(['Premier combat','Contact mortel','Hexproof'],h)}.\nÉquiper {${rng(2,4,h+2)}}`;
    if (sub === 'Armure')  return `Équipement\nLa créature équipée gagne +0/+${rng(2,4,h)} et a la ${pick(['Vigilance','Lien de vie','Indestructible'],h)}.\nÉquiper {${rng(2,4,h+2)}}`;
    if (sub === 'Vaisseau'||sub==='Aéronef') return `Équipage ${rng(1,3,h)} (Engagez cette créature artefact.)\nVol. Ce vaisseau ne peut être bloqué que par des créatures avec Vol ou Portée.`;
    if (sub === 'Monument') return `Indestructible.\nAu début de votre entretien, ajoutez un mana de n'importe quelle couleur pour chaque créature légendaire que vous contrôlez.`;
    return `{2}, {T} : Créez un jeton Créature artefact 1/1 incolore.\n{4}, {T} : Détruisez un artefact ou enchantement ciblé.`;
  }

  if (category === 'event') {
    if (/épidémie|pandémie|peste/.test(d)) return `Chaque adversaire sacrifie la moitié de ses créatures (arrondi à l'inférieur). Chaque joueur perd la moitié de ses points de vie.`;
    if (/bataille|guerre|offensive/.test(d)) return `~ inflige X blessures réparties parmi n'importe quel nombre de cibles, où X est le nombre de créatures sur le champ de bataille.`;
    if (/révolution|insurrection/.test(d)) return `Jusqu'à la fin du tour, vous gagnez le contrôle de toutes les créatures de vos adversaires. Ces créatures ont la Célérité. Sacrifiez-les au début de l'étape de fin.`;
    if (/tremblement|éruption|tsunami/.test(d)) return `Détruisez tous les terrains. ~ inflige 3 blessures à chaque créature et à chaque joueur.`;
    if (/traité|accord|paix/.test(d)) return `Les joueurs ne peuvent pas attaquer jusqu'à votre prochain tour. Chaque joueur pioche deux cartes.`;
    return `~ inflige ${rng(3,6,h)} blessures à n'importe quelle cible. Piochez une carte.`;
  }

  if (category === 'work') {
    if (/film|série/.test(d)) return `Quand ~ entre sur le champ de bataille, piochez deux cartes.\nAu début de votre étape de fin, si vous avez pioché 2+ cartes ce tour, ~ inflige 2 blessures à chaque adversaire.`;
    if (/roman|livre|manga/.test(d)) return `Quand ~ entre sur le champ de bataille, cherchez une sorcellerie ou éphémère dans votre bibliothèque et mettez-la dans votre main.\nVos sorcelleries coûtent {1} de moins.`;
    if (/tableau|peinture|sculpture/.test(d)) return `Les créatures que vous contrôlez gagnent +1/+1.\nAu début de votre entretien, si vous contrôlez 3+ créatures, piochez une carte.`;
    return `Quand ~ entre sur le champ de bataille, piochez ${rng(1,2,h)} carte(s).\nAu début de votre entretien, vous pouvez payer {2} pour piocher une carte.`;
  }

  return `Au début de votre entretien, piochez une carte.\nChaque fois que vous lancez votre deuxième sort à chaque tour, ~ inflige 2 blessures à n'importe quelle cible.`;
}

function mtgKeywords(category, subtype, color, d) {
  if (!['person','animal'].includes(category)) return [];
  const byColor = { W:['Vol','Vigilance','Lien de vie','Premier combat'], U:['Vol','Hexproof','Flash'], B:['Contact mortel','Intimidation','Discrétion'], R:['Célérité','Piétinement','Premier combat'], G:['Piétinement','Portée','Vigilance'] };
  const bySub   = { Noble:['Vigilance','Lien de vie'], Guerrier:['Célérité','Premier combat'], Mage:['Flash','Hexproof'], Prêtre:['Lien de vie','Vigilance'], Espion:['Discrétion','Contact mortel'], Champion:['Célérité','Piétinement'], Dragon:['Vol','Célérité'], Oiseau:['Vol','Vigilance'], Reptile:['Contact mortel'], Araignée:['Portée','Contact mortel'] };
  return [...new Set([...(bySub[subtype]||[]), ...(byColor[color]||[])])].slice(0,2);
}

function mtgPT(category, subtype, desc, h) {
  if (!['person','animal'].includes(category)) return null;
  const d = desc.toLowerCase();
  const b = rng(1, 4, h);
  if (category === 'animal') {
    if (/dragon/.test(d))                       return { p: b+3, t: b+2 };
    if (/baleine|éléphant|rhinocéros/.test(d))  return { p: b+1, t: b+3 };
    if (/requin|tigre|lion|loup/.test(d))       return { p: b+2, t: b+1 };
    if (/insecte|araignée/.test(d))             return { p: 1,   t: b   };
    return { p: b+1, t: b };
  }
  // person
  if (/général|militaire|guerrier/.test(d))     return { p: b+1, t: b   };
  if (/physicien|philosophe|sage/.test(d))      return { p: 1,   t: b+2 };
  if (/roi |reine |emperor/.test(d))            return { p: b,   t: b+1 };
  if (/assassin|espion/.test(d))                return { p: b+1, t: 1   };
  return { p: b, t: b };
}

function mtgMana(category, color, extract, h) {
  if (category === 'place') return [];
  const wc  = (extract || '').split(/\s+/).length;
  let cmc = Math.min(8, Math.max(1, Math.round(wc / 55)));
  if (category === 'event') cmc = Math.min(8, cmc + 1);
  if (/dragon/.test((extract||'').toLowerCase())) cmc = Math.min(8, cmc + 3);
  const syms = [];
  if (cmc > 1) syms.push({ n: cmc - 1, cls: 'gen' });
  syms.push({ n: null, cls: 'm' + color });
  return syms;
}

function mtgTypeStr(category, subtype, desc, cats) {
  const d = desc.toLowerCase();
  const legendary = /roi |reine |emperor|impératrice|général|amiral|légendaire|unique|premier|fondateur/.test(d) || cats.some(c => /monarque|chef d'état|fondateur/.test(c));
  const sup = legendary ? 'Légendaire ' : '';
  switch (category) {
    case 'place':   return `${sup}Terrain`;
    case 'person':  return `${sup}Créature — Humain ${subtype}`;
    case 'animal':  return `${sup}Créature — ${subtype}`;
    case 'object': {
      const sub = objectSubtype(d);
      if (sub === 'Arme' || sub === 'Armure') return `${sup}Artefact — Équipement`;
      if (sub === 'Vaisseau' || sub === 'Aéronef') return `${sup}Artefact — Véhicule`;
      return `${sup}Artefact`;
    }
    case 'event':   return pick(['Éphémère','Rituel'], hash(d));
    case 'work':    return `${sup}Enchantement`;
    case 'concept': return `Enchantement`;
    default:        return 'Carte';
  }
}

function mtgRarity(desc, h) {
  const d = desc.toLowerCase();
  if (/roi |reine |emperor|dragon|légendaire|unique|premier |fondateur/.test(d)) return h % 3 === 0 ? '★' : '◆◆◆';
  const r = h % 20;
  return r < 10 ? '◆' : r < 16 ? '◆◆' : r < 19 ? '◆◆◆' : '★';
}

function mtgFlavor(summary) {
  const desc = summary.description || '';
  if (desc.length > 10 && desc.length < 90) return desc;
  const sents = ((summary.extract || '').match(/[^.!?]+[.!?]+/g) || []).filter(s => s.trim().length > 20 && s.trim().length < 100);
  return sents.length ? sents[0].trim() : '';
}

/* ══ Build MTG ══ */
function buildMTG(summary, cats) {
  const h       = hash(summary.title || 'X');
  const desc    = summary.description || '';
  const cat     = detectCategory(summary, cats);
  let subtype   = '';
  if (cat === 'person') subtype = personSubtype(desc);
  else if (cat === 'animal') subtype = animalSubtype(desc);

  const color   = colorForCategory(cat, desc, cats, h);
  const ability = mtgAbility(cat, subtype, desc, color, h);
  const kws     = mtgKeywords(cat, subtype, color, desc);
  const pt      = mtgPT(cat, subtype, desc, h+2);
  const mana    = mtgMana(cat, color, summary.extract || '', h+3);
  const typeStr = mtgTypeStr(cat, subtype, desc, cats);
  const rarity  = mtgRarity(desc, h);
  const flavor  = mtgFlavor(summary);

  return {
    name: (summary.title || '').slice(0, 27),
    color, category: cat, subtype, kws, ability, pt, mana, rarity, typeStr, flavor,
    image: summary.thumbnail?.source || null,
    url: summary.content_urls?.desktop?.page || '#',
  };
}

/* ══ Render MTG ══ */
function renderMTG(c) {
  const mc = document.getElementById('mc');
  mc.className = 'mtg-card ' + c.color;

  document.getElementById('mc-name').textContent    = c.name;
  document.getElementById('mc-typetxt').textContent = c.typeStr;
  document.getElementById('mc-rarity').textContent  = c.rarity;

  // Mana
  const manaEl = document.getElementById('mc-mana');
  manaEl.innerHTML = '';
  c.mana.forEach(m => {
    const s = document.createElement('div');
    s.className = 'msym ' + m.cls;
    const labels = { gen: String(m.n), mW:'W', mU:'U', mB:'B', mR:'R', mG:'G', mA:'◇' };
    s.textContent = labels[m.cls] ?? m.n;
    manaEl.appendChild(s);
  });

  // Textbox
  document.getElementById('mc-kw').innerHTML  = c.kws.length ? `<em>${c.kws.join(', ')}</em>` : '';
  document.getElementById('mc-ab').innerHTML  = c.ability.split('\n').map(l => `<div>${l}</div>`).join('');
  document.getElementById('mc-flav').textContent = c.flavor ? `« ${c.flavor} »` : '';

  // Art
  setArt(document.getElementById('mc-img'), document.getElementById('mc-ph'), c.image, colorEmoji(c.color));

  // PT
  const ptEl = document.getElementById('mc-pt');
  if (c.pt) {
    ptEl.textContent = `${c.pt.p}/${c.pt.t}`;
    ptEl.classList.add('show');
  } else {
    ptEl.classList.remove('show');
  }
}

function colorEmoji(color) {
  return { W:'☀️', U:'💧', B:'💀', R:'🔥', G:'🌿', A:'💎' }[color] || '✨';
}

/* ══════════════════════════════════════════
   YGO BUILD
══════════════════════════════════════════ */

const ATTRS = { DARK:'🌑', LIGHT:'☀️', FIRE:'🔥', WATER:'💧', EARTH:'🌍', WIND:'💨', DIVINE:'✨' };

function ygoAttr(category, desc) {
  const d = desc.toLowerCase();
  if (category === 'place') {
    if (/île|océan|mer |lac |fleuve/.test(d)) return 'WATER';
    if (/montagne|volcan|désert/.test(d))     return 'FIRE';
    return 'EARTH';
  }
  if (category === 'animal') {
    if (/aquatique|marin|poisson|baleine|requin/.test(d)) return 'WATER';
    if (/dragon|serpent|vulcain|feu/.test(d))              return 'FIRE';
    if (/nocturne|chauve-souris|sombre/.test(d))           return 'DARK';
    if (/aigle|faucon|oiseau/.test(d))                     return 'WIND';
    return 'EARTH';
  }
  if (category === 'person') {
    if (/saint|divin|ange|pape|roi |reine/.test(d))   return 'LIGHT';
    if (/assassin|tyran|dictateur|sombre/.test(d))    return 'DARK';
    if (/militaire|guerrier|général|conquête/.test(d)) return 'FIRE';
    if (/scientifique|inventeur|mage/.test(d))         return 'WIND';
    return 'EARTH';
  }
  if (category === 'event') return /épidémie|poison|sombre/.test(d) ? 'DARK' : 'FIRE';
  if (category === 'object') return /magie|mystiq|sacré/.test(d) ? 'LIGHT' : 'EARTH';
  return 'EARTH';
}

function ygoRace(category, subtype) {
  if (['place','event','work','concept','object'].includes(category)) return 'Magie';
  const map = {
    Dragon:'Dragon', Reptile:'Reptile', Araignée:'Insecte', Insecte:'Insecte',
    Oiseau:'Oiseau', Aquatique:'Poisson', Loup:'Bête', Félin:'Bête', Ours:'Bête',
    Bête:'Bête', Dinosaure:'Dinosaure', Singe:'Bête', Cheval:'Bête', Plante:'Plante',
    Noble:'Guerrier', Guerrier:'Guerrier', Mage:'Magicien', Prêtre:'Magicien',
    Sage:'Magicien', Espion:'Guerrier', Champion:'Guerrier', Artiste:'Magicien', Humain:'Guerrier',
  };
  return map[subtype] || 'Guerrier';
}

function ygoKind(category, desc, h) {
  const d = desc.toLowerCase();
  if (['event','work','concept','place','object'].includes(category)) {
    if (category === 'place') return 'spell';
    if (category === 'event') return /piège|embuscade|trahison|surprise/.test(d) ? 'trap' : 'spell';
    return h % 3 === 0 ? 'trap' : 'spell';
  }
  if (category === 'animal' && /dragon/.test(d) && h % 4 === 0) return 'fusion';
  if (category === 'person' && /dieu|déesse|divin/.test(d)) return 'ritual';
  const r = h % 10;
  if (r === 0) return 'normal';
  if (r === 1) return 'fusion';
  if (r === 2) return 'synchro';
  if (r === 3) return 'xyz';
  return 'effect';
}

function ygoLevel(category, desc, h) {
  if (['place','event','work','concept','object'].includes(category)) return null;
  const d = desc.toLowerCase();
  if (/dragon/.test(d))                       return rng(7, 12, h);
  if (/roi |reine |emperor|légendaire/.test(d)) return rng(6, 9, h);
  if (/général|amiral/.test(d))               return rng(5, 8, h);
  if (/scientifique|philosophe/.test(d))      return rng(3, 6, h);
  if (/insecte|araignée/.test(d))             return rng(1, 4, h);
  return rng(3, 7, h);
}

function ygoStats(desc, level, h) {
  if (!level) return null;
  const d = desc.toLowerCase();
  let atk = level * 300, def = level * 250;
  if (/dragon/.test(d))                        { atk += 900; def += 300; }
  else if (/guerrier|militaire|général/.test(d)) { atk += 400; }
  else if (/scientifique|philosophe/.test(d))    { atk -= 200; def += 500; }
  else if (/roi |reine |noble/.test(d))          { atk += 200; def += 400; }
  else if (/assassin|espion/.test(d))            { atk += 600; def -= 200; }
  atk = Math.min(5000, Math.round(Math.max(0, atk) / 50) * 50);
  def = Math.min(5000, Math.round(Math.max(0, def) / 50) * 50);
  return { atk, def };
}

function ygoBracket(kind, race, category, desc, h) {
  const d = desc.toLowerCase();
  if (category === 'place')   return '[Magie — Terrain]';
  if (category === 'event')   return kind === 'trap' ? `[Piège — ${pick(['Normal','Continu','Contre'],h)}]` : `[Magie — ${pick(['Normal','Déclenchement Rapide'],h)}]`;
  if (category === 'work')    return '[Magie — Normal]';
  if (category === 'concept') return '[Magie — Continu]';
  if (category === 'object') {
    const sub = objectSubtype(d);
    if (sub === 'Arme' || sub === 'Armure') return '[Magie — Équipement]';
    return '[Magie — Normal]';
  }
  const ext = { fusion:' / Fusion', synchro:' / Synchro', xyz:' / Xyz', link:' / Lien', ritual:' / Rituel' };
  return `[${race}${ext[kind]||''} / ${kind === 'normal' ? 'Normal' : 'Effet'}]`;
}

function ygoEffectFallback(category, desc, kind, h) {
  const d = desc.toLowerCase();
  if (category === 'place') {
    if (/île|océan|mer |lac |fleuve/.test(d)) return `Sort de Terrain.\nTant que cette carte est sur le Terrain, tous les monstres EAU gagnent 500 ATK/DEF.`;
    if (/montagne|volcan/.test(d))             return `Sort de Terrain.\nTant que cette carte est sur le Terrain, tous les monstres FEU gagnent 500 ATK.`;
    return `Sort de Terrain.\nTant que cette carte est sur le Terrain, tous vos monstres gagnent 300 ATK/DEF.`;
  }
  if (kind === 'normal') return '';
  if (kind === 'trap') return `Activez cette carte quand un adversaire déclare une attaque : annulez l'attaque. Détruisez ${rng(1,2,h)} carte(s) sur le Terrain.`;
  if (category === 'event') return `Infligez ${rng(1000,3000,h*7)} dommages à tous les adversaires. Détruisez toutes les créatures sur le Terrain.`;
  return `Lorsque cette carte est Invoquée Normalement : piochez 1 carte. Une fois par tour : ciblez 1 monstre sur le Terrain ; il perd 500 ATK/DEF jusqu'à la fin du tour.`;
}

async function buildYGO(summary, cats) {
  const h        = hash(summary.title || 'X');
  const desc     = summary.description || '';
  const category = detectCategory(summary, cats);
  const subtype  = category === 'person' ? personSubtype(desc) : category === 'animal' ? animalSubtype(desc) : '';
  const kind     = ygoKind(category, desc, h);
  const attr     = ygoAttr(category, desc);
  const race     = ygoRace(category, subtype);
  const level    = ygoLevel(category, desc, h);
  const stats    = ygoStats(desc, level, h + 1);
  const bracket  = ygoBracket(kind, race, category, desc, h + 3);

  let eff = '';
  if (kind !== 'normal') {
    try {
      const sentences = await fetchYGOEffect(category, subtype, attr, race, level, h);
      if (sentences.length) eff = pickEffect(sentences, h);
    } catch {}
    if (!eff) eff = ygoEffectFallback(category, desc, kind, h);
  }

  const flavor = kind === 'normal' ? (summary.description || '') : '';

  return {
    name:   (summary.title || '').slice(0, 28),
    kind, attr, level, race, stats, eff, flavor, bracket, category,
    isXYZ:  kind === 'xyz',
    isLink: kind === 'link',
    linkN:  kind === 'link' ? rng(1, 4, h) : null,
    serial: String(Math.abs(h)).padStart(8,'0').slice(0, 8),
    image:  summary.thumbnail?.source || null,
    url:    summary.content_urls?.desktop?.page || '#',
    emoji:  ATTRS[attr] || '🌍',
  };
}

/* ══ Render YGO ══ */
function renderYGO(c) {
  const yc = document.getElementById('yc');
  yc.className = 'ygo-card ' + c.kind;

  document.getElementById('yc-name').textContent   = c.name;
  document.getElementById('yc-attr').textContent   = ATTRS[c.attr] || '🌍';

  // Étoiles / niveaux
  const starsEl = document.getElementById('yc-stars');
  starsEl.innerHTML = '';
  const levelRow = document.getElementById('yc-level-row');
  if (c.level && !c.isLink) {
    levelRow.style.display = '';
    const starChar = c.isXYZ ? '✦' : '★';
    const starClass = c.isXYZ ? 'ygo-star rk' : 'ygo-star';
    for (let i = 0; i < c.level; i++) {
      const s = document.createElement('span');
      s.className = starClass; s.textContent = starChar;
      starsEl.appendChild(s);
    }
  } else if (c.isLink) {
    levelRow.style.display = '';
    const s = document.createElement('span');
    s.className = 'ygo-star lk'; s.textContent = 'LINK-' + c.linkN;
    starsEl.appendChild(s);
  } else {
    levelRow.style.display = 'none';
  }

  // Art
  setArt(document.getElementById('yc-img'), document.getElementById('yc-ph'), c.image, c.emoji);

  // Bracket / type
  const YGO_LABELS = { normal:'Monstre Normal', effect:'Monstre à Effet', ritual:'Monstre Rituel', fusion:'Monstre Fusion', synchro:'Monstre Synchro', xyz:'Monstre Xyz', link:'Monstre Lien', spell:'Carte Magie', trap:'Carte Piège' };
  document.getElementById('yc-subtype').textContent = YGO_LABELS[c.kind] || c.kind;
  document.getElementById('yc-bracket').textContent = c.bracket;

  // Effet
  document.getElementById('yc-eff').innerHTML = c.eff
    ? c.eff.split('\n').map(l => `<div>${l}</div>`).join('')
    : '';
  document.getElementById('yc-flav').textContent = c.flavor || '';

  // Stats
  const statsEl = document.getElementById('yc-stats');
  statsEl.innerHTML = '';
  if (c.stats) {
    const a  = document.createElement('div'); a.className  = 'ygo-stat'; a.innerHTML  = `ATK / <span>${c.stats.atk}</span>`; statsEl.appendChild(a);
    const dv = document.createElement('div'); dv.className = 'ygo-stat'; dv.innerHTML = `DEF / <span>${c.stats.def}</span>`; statsEl.appendChild(dv);
  }

  document.getElementById('yc-serial').textContent = c.serial;
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
let currentData = null, currentCats = [], currentMode = 'mtg';

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btnMTG').className = 'mode-btn' + (mode === 'mtg' ? ' m-active' : '');
  document.getElementById('btnYGO').className = 'mode-btn' + (mode === 'ygo' ? ' y-active' : '');
  document.getElementById('view-mtg').classList.toggle('hidden', mode !== 'mtg');
  document.getElementById('view-ygo').classList.toggle('hidden', mode !== 'ygo');
  if (currentData) {
    if (mode === 'mtg') renderMTG(buildMTG(currentData, currentCats));
    else buildYGO(currentData, currentCats).then(renderYGO);
  }
}

/* ══ Loading ══ */
function setLoading(on) {
  document.getElementById('loader').classList.toggle('hidden', !on);
  ['bGen','bRand','bDaily'].forEach(id => { document.getElementById(id).disabled = on; });
}
function showErr(msg) {
  const e = document.getElementById('err'); e.textContent = msg; e.classList.remove('hidden');
}

/* ══ loadCard ══ */
async function loadCard(summaryPromise) {
  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const data = await summaryPromise;
    const cats = await fetchCategories(data.title);
    currentData = data; currentCats = cats;
    document.getElementById('q').value = data.title || '';
    document.getElementById('wikiLink').href = data.content_urls?.desktop?.page || '#';
    if (currentMode === 'mtg') renderMTG(buildMTG(data, cats));
    else { const ygo = await buildYGO(data, cats); renderYGO(ygo); }
    document.getElementById('out').classList.remove('hidden');
  } catch (e) { showErr(e.message); }
  finally { setLoading(false); }
}

/* ══ Carte du jour ══ */
async function goDaily() {
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
  const cached = localStorage.getItem('wikitcg-daily-date');
  const cachedTitle = localStorage.getItem('wikitcg-daily-title');
  if (cached === String(seed) && cachedTitle) { loadCard(fetchWiki(cachedTitle)); return; }

  document.getElementById('out').classList.add('hidden');
  document.getElementById('err').classList.add('hidden');
  setLoading(true);
  try {
    const data = await fetchRandom();
    localStorage.setItem('wikitcg-daily-date', String(seed));
    localStorage.setItem('wikitcg-daily-title', data.title);
    const cats = await fetchCategories(data.title);
    currentData = data; currentCats = cats;
    document.getElementById('q').value = data.title || '';
    document.getElementById('wikiLink').href = data.content_urls?.desktop?.page || '#';
    if (currentMode === 'mtg') renderMTG(buildMTG(data, cats));
    else { const ygo = await buildYGO(data, cats); renderYGO(ygo); }
    document.getElementById('out').classList.remove('hidden');
  } catch (e) { showErr(e.message); }
  finally { setLoading(false); }
}

/* ══ Events ══ */
document.getElementById('bGen').addEventListener('click', () => { const q = document.getElementById('q').value.trim(); if (q) loadCard(fetchWiki(q)); });
document.getElementById('bRand').addEventListener('click', () => loadCard(fetchRandom()));
document.getElementById('bDaily').addEventListener('click', goDaily);
document.getElementById('q').addEventListener('keydown', e => { if (e.key === 'Enter') { const q = document.getElementById('q').value.trim(); if (q) loadCard(fetchWiki(q)); }});
