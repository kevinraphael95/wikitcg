'use strict';

/* ══════════════════════════════════════════
   WIKITCG — app.js
══════════════════════════════════════════ */

/* ══ Utilitaires ══ */
const hash  = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0; return Math.abs(h); };
const range = (a, b, s) => a + (((s % (b - a + 1)) + (b - a + 1)) % (b - a + 1));
const pick  = (a, s) => a[Math.abs(s) % a.length];

/* ══ Thème ══ */
const themeBtn   = document.getElementById('themeBtn');
const savedTheme = localStorage.getItem('wikitcg-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.textContent = savedTheme === 'dark' ? '☀' : '☽';
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeBtn.textContent = next === 'dark' ? '☀' : '☽';
  localStorage.setItem('wikitcg-theme', next);
});

/* ══════════════════════════════════════════
   WIKIPEDIA API
══════════════════════════════════════════ */

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
  const url = `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=categories&cllimit=30&clshow=!hidden&format=json&origin=*`;
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
   YGOPRO API — Phrases d'effets
══════════════════════════════════════════ */

/* Cache mémoire pour éviter les requêtes répétées */
const _ygoCache = {};

/* Mapping catégorie/sous-type → paramètres API YGOPro */
function ygoApiParams(category, subtype, attr, race, level) {
  const attrLow = attr.toLowerCase();

  if (category === 'place')   return { type: 'Field Spell Card' };
  if (category === 'work')    return { type: 'Spell Card', race: 'Normal' };
  if (category === 'concept') return { type: 'Spell Card', race: 'Continuous' };
  if (category === 'event') {
    const isT = /piège|embuscade|trahison/.test(subtype);
    return isT ? { type: 'Trap Card' } : { type: 'Spell Card' };
  }
  if (category === 'object') {
    const d = subtype.toLowerCase();
    if (/épée|arme|bouclier|armure/.test(d)) return { type: 'Spell Card', race: 'Equip' };
    return { type: 'Spell Card', race: 'Normal' };
  }
  /* Monstres */
  const typeMap = { fusion: 'Fusion Monster', synchro: 'Synchro Monster', xyz: 'XYZ Monster', link: 'Link Monster', ritual: 'Ritual Monster', normal: 'Normal Monster', effect: 'Effect Monster' };
  const kind = ygoKindFromSubtype(subtype);
  const params = { type: typeMap[kind] || 'Effect Monster' };
  if (attrLow && attrLow !== 'divine') params.attribute = attrLow;
  if (race && race !== 'Magie') params.race = race;
  if (level && level >= 1 && level <= 12) {
    /* ±2 niveaux pour élargir les résultats */
    params.level = level;
  }
  return params;
}

function ygoKindFromSubtype(subtype) {
  /* Réutilise la logique de kind sans recalculer tout buildYGO */
  return 'effect';
}

async function fetchYGOPhrases(category, subtype, attr, race, level, h) {
  /* Construit la clé de cache */
  const cacheKey = `${category}|${subtype}|${attr}|${race}|${level}`;
  if (_ygoCache[cacheKey]) return _ygoCache[cacheKey];

  const params = ygoApiParams(category, subtype, attr, race, level);
  const qs = new URLSearchParams({ ...params, num: 15, offset: Math.abs(h) % 50 });
  const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?${qs}`;

  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    if (data.error || !data.data) return [];

    /* Extrait toutes les phrases de tous les effets */
    const sentences = [];
    for (const card of data.data) {
      if (!card.desc) continue;
      /* Split sur . ou \n, filtre les phrases trop courtes ou trop longues */
      const parts = card.desc
        .split(/(?<=[.!])\s+|\n/)
        .map(s => s.trim())
        .filter(s =>
          s.length > 20 &&
          s.length < 180 &&
          /* Filtre les refs à des cartes nommées (guillemets, apostrophes autour d'un nom) */
          !/["«»][\w\s'-]{3,40}["»]/.test(s) &&
          !/"[\w\s'-]{3,40}"/.test(s)
        );
      sentences.push(...parts);
    }

    _ygoCache[cacheKey] = sentences;
    return sentences;
  } catch {
    return [];
  }
}

/* Pioche 1-4 phrases seedées selon la catégorie/rareté */
function pickYGOPhrases(sentences, category, h, rarity) {
  if (!sentences.length) return null;

  /* Nombre de phrases selon catégorie + rareté */
  let maxPhrases;
  if (category === 'place')   maxPhrases = range(1, 2, h) === 1 ? 1 : (h % 5 === 0 ? 2 : 1);
  else if (category === 'event' || category === 'work' || category === 'concept' || category === 'object') maxPhrases = range(1, 2, h);
  else {
    /* Monstres : 1-4 selon rareté */
    if (rarity === '★')    maxPhrases = range(3, 4, h);
    else if (rarity === '◆◆◆') maxPhrases = range(2, 3, h);
    else if (rarity === '◆◆')  maxPhrases = range(1, 2, h);
    else                        maxPhrases = 1;
  }

  const picked = [];
  const used = new Set();
  for (let i = 0; i < maxPhrases; i++) {
    let idx = Math.abs(h + i * 1337) % sentences.length;
    /* Évite les doublons */
    let attempts = 0;
    while (used.has(idx) && attempts < 10) { idx = (idx + 1) % sentences.length; attempts++; }
    used.add(idx);
    picked.push(sentences[idx]);
  }
  return picked.join(' ');
}

/* ══════════════════════════════════════════
   DÉTECTION CATÉGORIE PRINCIPALE
══════════════════════════════════════════ */

function detectCategory(summary, cats) {
  const desc = (summary.description || '').toLowerCase();
  const all  = desc + ' ' + cats.join(' ');

  if (/commune|municipalit|ville|cité|capitale|pays|région|département|province|district|arrondissement|territoire/.test(desc)) return 'place';
  if (/île|archipel|péninsule|océan|mer|lac|fleuve|rivière|canal|détroit|golfe|baie|montagne|volcan|col|massif|désert|forêt|parc national|réserve naturelle/.test(desc)) return 'place';
  if (summary.coordinates) return 'place';

  if (/espèce|mammifère|reptile|oiseau|poisson|insecte|arachnid|amphibien|mollusque|crustacé|félin|canidé|primate|cétacé|dinosaure/.test(desc)) return 'animal';
  if (cats.some(c => /faune|zoologie|animal/.test(c))) return 'animal';

  if (/né le|née le/.test((summary.extract || '').slice(0, 200))) return 'person';
  if (/homme politique|femme politique|militaire|général|amiral|roi|reine|emperor|impératrice|prince|princesse|duc|noble/.test(desc)) return 'person';
  if (/physicien|chimiste|mathématicien|biologiste|médecin|philosophe|historien|archéologue/.test(desc)) return 'person';
  if (/acteur|actrice|réalisateur|musicien|chanteur|chanteuse|compositeur|écrivain|auteur|poète|peintre|sculpteur|architecte/.test(desc)) return 'person';
  if (/sportif|footballeur|tennisman|cycliste|nageur|athlète|boxeur/.test(desc)) return 'person';
  if (cats.some(c => /naissance|décès|personnalité/.test(c))) return 'person';

  if (/bataille|guerre|conflit|révolution|insurrection|coup d'état|siège|offensive/.test(desc)) return 'event';
  if (/tremblement de terre|séisme|éruption|tsunami|ouragan|catastrophe/.test(desc)) return 'event';
  if (/épidémie|pandémie|peste|choléra/.test(desc)) return 'event';
  if (/attentat|massacre|génocide/.test(desc)) return 'event';
  if (/traité|accord|conférence/.test(desc)) return 'event';

  if (/épée|lance|bouclier|armure|casque|arme|fusil|canon/.test(desc)) return 'object';
  if (/navire|bateau|vaisseau|frégate|galère|sous-marin|avion|locomotive|automobile/.test(desc)) return 'object';
  if (/monument|temple|château|cathédrale|basilique|mosquée|palais|tour|pont|pyramide/.test(desc)) return 'object';
  if (/instrument de musique|outil|machine|moteur|ordinateur|satellite|fusée/.test(desc)) return 'object';
  if (/relique|talisman|couronne|sceptre|anneau|calice|grimoire/.test(desc)) return 'object';

  if (/film|série télévisée|documentaire/.test(desc)) return 'work';
  if (/roman|livre|manga|bande dessinée/.test(desc)) return 'work';
  if (/tableau|peinture|sculpture|œuvre d'art/.test(desc)) return 'work';
  if (/chanson|album|opéra|symphonie/.test(desc)) return 'work';
  if (/jeu vidéo|jeu de société/.test(desc)) return 'work';

  if (/théorie|philosophie|religion|mouvement|courant|idéologie|doctrine|mythologie|mythe/.test(desc)) return 'concept';
  if (/maladie|syndrome|phénomène|processus|science|discipline/.test(desc)) return 'concept';

  return 'concept';
}

/* ══ Sous-types ══ */
function getPersonSubtype(desc, cats) {
  const d = desc.toLowerCase();
  if (/roi|reine|emperor|impératrice|prince|princesse|duc|comte|pharaon|sultan|tsar/.test(d)) return 'Human Noble';
  if (/général|amiral|maréchal|colonel|officier|militaire/.test(d)) return 'Human Soldier';
  if (/physicien|chimiste|mathématicien|médecin|ingénieur|inventeur|scientifique/.test(d)) return 'Human Wizard';
  if (/philosophe|théologien|économiste|historien/.test(d)) return 'Human Advisor';
  if (/prêtre|évêque|cardinal|pape|moine|abbé|imam|rabbin/.test(d)) return 'Human Cleric';
  if (/footballeur|tennisman|cycliste|nageur|athlète|sportif/.test(d)) return 'Human Warrior';
  if (/espion|agent secret|assassin/.test(d)) return 'Human Rogue';
  return 'Human';
}

function getAnimalSubtype(desc) {
  const d = desc.toLowerCase();
  if (/dragon/.test(d)) return 'Dragon';
  if (/dinosaure/.test(d)) return 'Dinosaur';
  if (/serpent|python|anaconda|cobra|vipère/.test(d)) return 'Snake';
  if (/araignée|scorpion/.test(d)) return 'Spider';
  if (/loup|renard|canidé/.test(d)) return 'Wolf';
  if (/chat|lion|tigre|léopard|jaguar|félin/.test(d)) return 'Cat';
  if (/ours/.test(d)) return 'Bear';
  if (/aigle|faucon|chouette|vautour|oiseau/.test(d)) return 'Bird';
  if (/requin|baleine|dauphin|poisson/.test(d)) return 'Fish';
  if (/insecte|fourmi|abeille|guêpe|papillon/.test(d)) return 'Insect';
  if (/singe|gorille|chimpanzé|primate/.test(d)) return 'Ape';
  if (/cheval|zèbre/.test(d)) return 'Horse';
  if (/reptile|lézard|crocodile/.test(d)) return 'Lizard';
  return 'Beast';
}

function getObjectSubtype(desc) {
  const d = desc.toLowerCase();
  if (/épée|sabre|dague|lance|arme blanche/.test(d)) return 'Equipment';
  if (/bouclier|armure|casque/.test(d)) return 'Equipment';
  if (/navire|bateau|vaisseau|galère|frégate|avion|fusée|automobile|locomotive/.test(d)) return 'Vehicle';
  if (/château|temple|cathédrale|pyramide|monument|tour|pont/.test(d)) return 'Monument';
  if (/anneau|couronne|sceptre|relique|talisman|calice|grimoire/.test(d)) return 'Equipment';
  return 'Artifact';
}

/* ══════════════════════════════════════════
   COULEURS MTG
══════════════════════════════════════════ */

function getPlaceColor(desc, cats) {
  const d = desc.toLowerCase();
  if (/île|archipel|océan|mer|lac|fleuve|rivière|port|côte|maritime/.test(d)) return 'U';
  if (/montagne|volcan|désert/.test(d)) return 'R';
  if (/forêt|jungle|parc naturel|réserve|savane|prairie/.test(d)) return 'G';
  if (/cathédrale|basilique|abbaye|monastère|église|saint/.test(d)) return 'W';
  if (/cimetière|tombeau|catacombes/.test(d)) return 'B';
  return pick(['W','U','G'], hash(desc));
}

function getPersonColor(desc, cats) {
  const d = desc.toLowerCase();
  if (/général|militaire|guerre|révolution|combat|conquête/.test(d)) return 'R';
  if (/roi|reine|noble|église|saint|justice|ordre/.test(d)) return 'W';
  if (/physicien|chimiste|mathématicien|inventeur|philosophe|science/.test(d)) return 'U';
  if (/assassin|espion|poison|trahison|crime|tyran|dictateur/.test(d)) return 'B';
  if (/biologiste|botaniste|naturaliste|écologiste/.test(d)) return 'G';
  return pick(['W','U','B','R','G'], hash(desc));
}

function getEventColor(desc) {
  const d = desc.toLowerCase();
  if (/épidémie|pandémie|peste|poison/.test(d)) return 'B';
  if (/bataille|guerre|révolution|attentat|massacre/.test(d)) return 'R';
  if (/tremblement|éruption|tsunami|catastrophe/.test(d)) return 'R';
  if (/traité|accord|paix|diplomatie/.test(d)) return 'W';
  if (/découverte|exploration/.test(d)) return 'U';
  return pick(['R','B'], hash(desc));
}

function getAnimalColor(desc) {
  const d = desc.toLowerCase();
  if (/aquatique|marin|océan|mer|eau|poisson|baleine/.test(d)) return 'U';
  if (/dragon|serpent|venimeux|prédateur|carnivore/.test(d)) return 'R';
  if (/nocturne|vampire|chauve-souris/.test(d)) return 'B';
  if (/forêt|jungle|insecte|herbivore/.test(d)) return 'G';
  if (/aigle|faucon|oiseau/.test(d)) return 'W';
  return 'G';
}

/* ══════════════════════════════════════════
   CAPACITÉS MTG
══════════════════════════════════════════ */

function mtgAbility(category, subtype, desc, color, h) {
  const d = desc.toLowerCase();
  const m = { W:'{W}', U:'{U}', B:'{B}', R:'{R}', G:'{G}' };

  if (category === 'place') {
    if (/île|océan|mer|lac|fleuve|rivière/.test(d))
      return `{T} : Ajoutez ${m[color]} à votre réserve de mana.\n{T} : Piochez une carte, puis défaussez-vous d'une carte.`;
    if (/montagne|volcan/.test(d))
      return `{T} : Ajoutez ${m[color]} à votre réserve de mana.\n{T}, Sacrifiez ~ : infligez 2 blessures à n'importe quelle cible.`;
    if (/forêt|jungle|parc/.test(d))
      return `{T} : Ajoutez ${m[color]} à votre réserve de mana.\n{T} : Cherchez une Forêt de base dans votre bibliothèque et mettez-la sur le champ de bataille sous votre contrôle.`;
    if (/château|palais|temple|cathédrale/.test(d))
      return `{T} : Ajoutez ${m[color]} à votre réserve de mana.\nLes créatures légendaires que vous contrôlez gagnent +1/+1.`;
    return `{T} : Ajoutez ${m[color]} à votre réserve de mana.`;
  }

  if (category === 'person') {
    if (/roi|reine|emperor|impératrice/.test(d))
      return `Au début de chaque combat, les autres créatures que vous contrôlez gagnent +1/+1 jusqu'à la fin du tour.\nVous pouvez invoquer des créatures légendaires sans payer leur coût de mana.`;
    if (/général|amiral|maréchal/.test(d))
      return `Lorsque ~ entre sur le champ de bataille, cherchez dans votre bibliothèque une carte Créature de force 2 ou moins et mettez-la sur le champ de bataille.\nLes créatures que vous contrôlez ont la Célérité.`;
    if (/physicien|scientifique|inventeur|ingénieur/.test(d))
      return `{2}, {T} : Créez un jeton Artefact 0/0 incolore avec deux marqueurs +1/+1.\nLes Artefacts que vous contrôlez ont la Hexproof.`;
    if (/philosophe|écrivain|auteur|penseur/.test(d))
      return `Quand ~ entre sur le champ de bataille, piochez deux cartes.\nVos sorts coûtent {1} de moins à lancer.`;
    if (/prêtre|moine|pape|évêque/.test(d))
      return `Lien de vie.\nChaque fois que vous gagnez des points de vie, mettez un marqueur +1/+1 sur ~.`;
    if (/assassin|espion/.test(d))
      return `Discrétion.\nChaque fois que ~ inflige des blessures de combat à un joueur, ce joueur défausse une carte.`;
    if (/sportif|athlète|guerrier|soldat/.test(d))
      return `Célérité. Premier combat.\nChaque fois que ~ attaque, il gagne +1/+0 pour chaque autre créature qui attaque.`;
    return `Lorsque ~ entre sur le champ de bataille, regardez les ${range(3,5,h)} premières cartes de votre bibliothèque. Mettez-en une dans votre main, le reste au bas de votre bibliothèque.`;
  }

  if (category === 'animal') {
    if (/dragon/.test(d))
      return `Vol. Célérité.\n{R}, {T} : ~ inflige X blessures à n'importe quelle cible, X étant sa force.`;
    if (/venimeux|serpent|araignée/.test(d))
      return `Contact mortel. Portée.\nChaque fois qu'une créature bloquée par ~ meurt, son contrôleur perd 2 points de vie.`;
    if (/aquatique|marin|baleine|requin/.test(d))
      return `~ ne peut être bloqué que par des créatures avec Islandwalk.\nChaque fois que ~ attaque, piochez une carte.`;
    if (/aigle|faucon|oiseau/.test(d))
      return `Vol. Vigilance.\nChaque fois que ~ entre en combat, regardez la carte du dessus de votre bibliothèque.`;
    if (/loup|meute/.test(d))
      return `Chaque fois qu'une autre créature entre sur le champ de bataille sous votre contrôle, ~ gagne +1/+1 jusqu'à la fin du tour.`;
    return `Lorsque ~ entre sur le champ de bataille, cherchez dans votre bibliothèque une carte Créature du même type et mettez-la dans votre main.`;
  }

  if (category === 'object') {
    if (subtype === 'Equipment')
      return `Équipement\nLa créature équipée gagne +${range(1,3,h)}/+${range(1,2,h+1)} et a la ${pick(['Lien de vie','Contact mortel','Premier combat','Vigilance','Hexproof'],h)}.\nÉquiper {${range(1,4,h+2)}}`;
    if (subtype === 'Vehicle')
      return `Équipage ${range(1,3,h)} (Engagez ${range(1,3,h)} créature(s) que vous contrôlez : ~ devient une créature artefact jusqu'à la fin du tour.)\nVol.`;
    if (subtype === 'Monument')
      return `Indestructible.\nAu début de votre entretien, ajoutez {${color}} pour chaque créature légendaire que vous contrôlez.`;
    return `{2}, {T} : Créez un jeton Créature artefact 1/1 incolore.\n{4}, {T} : Détruisez un artefact ou enchantement ciblé.`;
  }

  if (category === 'event') {
    if (/épidémie|pandémie|peste/.test(d))
      return `Chaque adversaire sacrifie la moitié de ses créatures (arrondi à l'inférieur). Chaque joueur perd la moitié de ses points de vie (arrondi à l'inférieur).`;
    if (/bataille|guerre|offensive/.test(d))
      return `~ inflige X blessures réparties comme vous le souhaitez parmi n'importe quelle nombre de cibles, X étant le nombre de créatures sur le champ de bataille.`;
    if (/révolution|insurrection/.test(d))
      return `Jusqu'à la fin du tour, vous gagnez le contrôle de toutes les créatures que vous ne contrôlez pas. Ces créatures acquièrent la Célérité. Sacrifiez-les au début de la prochaine étape de fin.`;
    if (/tremblement|éruption|tsunami/.test(d))
      return `Détruisez tous les terrains. ~ inflige 3 blessures à chaque créature et à chaque joueur.`;
    if (/traité|accord|paix/.test(d))
      return `Les joueurs ne peuvent pas attaquer jusqu'à votre prochain tour. Chaque joueur pioche deux cartes.`;
    return `~ inflige ${range(3,6,h)} blessures à n'importe quelle cible. Piochez une carte.`;
  }

  if (category === 'work') {
    if (/film|série/.test(d))
      return `Quand ~ entre sur le champ de bataille, piochez deux cartes.\nAu début de votre étape de fin, si vous avez pioché deux cartes ou plus ce tour, ~ inflige 2 blessures à chaque adversaire.`;
    if (/roman|livre|manga/.test(d))
      return `Quand ~ entre sur le champ de bataille, cherchez une carte sorcellerie ou éphémère dans votre bibliothèque et mettez-la dans votre main.\nLes sorcelleries que vous lancez coûtent {1} de moins.`;
    if (/tableau|peinture|sculpture/.test(d))
      return `Les créatures que vous contrôlez gagnent +1/+1.\nAu début de votre entretien, si vous contrôlez trois créatures ou plus, piochez une carte.`;
    return `Quand ~ entre sur le champ de bataille, piochez ${range(1,3,h)} carte(s).\nAu début de votre entretien, vous pouvez payer {2} pour piocher une carte.`;
  }

  return `Au début de votre entretien, piochez une carte.\nChaque fois que vous lancez votre deuxième sort à chaque tour, ~ inflige 2 blessures à n'importe quelle cible.`;
}

/* ══════════════════════════════════════════
   MTG — KEYWORDS, P/T, MANA, TYPE, RARETÉ
══════════════════════════════════════════ */

function mtgKeywords(category, subtype, color, h) {
  if (!['person','animal'].includes(category)) return [];
  const byColor = { W:['Vol','Vigilance','Lien de vie','Premier combat'], U:['Vol','Hexproof','Flash'], B:['Contact mortel','Lien de vie','Intimidation','Discrétion'], R:['Célérité','Piétinement','Premier combat'], G:['Piétinement','Portée','Vigilance'] };
  const bySub   = { 'Human Noble':['Vigilance','Lien de vie'], 'Human Soldier':['Célérité','Premier combat'], 'Human Wizard':['Flash','Hexproof'], 'Human Cleric':['Lien de vie','Vigilance'], 'Human Rogue':['Discrétion','Contact mortel'], Dragon:['Vol','Célérité'], Bird:['Vol','Vigilance'], Snake:['Contact mortel'], Spider:['Portée','Contact mortel'] };
  return [...new Set(bySub[subtype] || byColor[color] || [])].slice(0, 2);
}

function mtgPT(category, subtype, desc, h) {
  if (!['person','animal'].includes(category)) return null;
  const d = desc.toLowerCase();
  const b = range(1, 5, h);
  if (category === 'animal') {
    if (/dragon/.test(d))                        return { p: b+3, t: b+2 };
    if (/baleine|éléphant|rhinocéros/.test(d))   return { p: b+2, t: b+3 };
    if (/requin|tigre|lion|loup/.test(d))        return { p: b+2, t: b+1 };
    if (/insecte|araignée/.test(d))              return { p: 1,   t: b   };
    return { p: b+1, t: b };
  }
  if (/général|militaire|guerrier/.test(d))      return { p: b+1, t: b   };
  if (/physicien|scientifique|philosophe/.test(d)) return { p: 1, t: b+2 };
  if (/roi|reine|emperor/.test(d))               return { p: b,   t: b+1 };
  if (/assassin|espion/.test(d))                 return { p: b+1, t: 1   };
  return { p: b, t: b };
}

function mtgMana(category, color, desc, h) {
  if (category === 'place') return [];
  const wc  = (desc || '').split(/\s+/).length;
  let   cmc = Math.min(8, Math.max(1, Math.round(wc / 60)));
  if (category === 'event') cmc = Math.min(8, cmc + 2);
  if (/dragon/.test((desc||'').toLowerCase())) cmc = Math.min(8, cmc + 3);
  const syms = [];
  if (cmc > 1) syms.push({ n: cmc - 1, cls: 'gen' });
  syms.push({ n: null, cls: 'm' + color });
  return syms;
}

function mtgTypeString(category, subtype, desc, cats) {
  const d = desc.toLowerCase();
  const legendary = /roi|reine|emperor|impératrice|général|amiral|légendaire|unique/.test(d) || cats.some(c => /monarque|chef d'état/.test(c));
  const sup = legendary ? 'Légendaire ' : '';
  switch (category) {
    case 'place':  return `${sup}Terrain`;
    case 'person': return `${sup}Créature — ${subtype}`;
    case 'animal': return `${sup}Créature — ${subtype}`;
    case 'object': if (subtype === 'Equipment') return `${sup}Artefact — Équipement`; if (subtype === 'Vehicle') return `${sup}Artefact — Véhicule`; return `${sup}Artefact`;
    case 'event':   return pick(['Éphémère','Rituel'], hash(d));
    case 'work':    return `${sup}Enchantement`;
    case 'concept': return `Enchantement`;
    default:        return 'Carte';
  }
}

function mtgRarity(category, desc, h) {
  const d = desc.toLowerCase();
  if (/roi|reine|emperor|impératrice|général|dragon|légendaire/.test(d)) return h % 4 === 0 ? '★' : '◆◆◆';
  if (category === 'event') return '◆◆';
  const r = h % 20;
  return r < 10 ? '◆' : r < 16 ? '◆◆' : r < 19 ? '◆◆◆' : '★';
}

function mtgFlavor(summary) {
  const desc = summary.description || '';
  if (desc.length > 8 && desc.length < 90) return desc;
  const sents = ((summary.extract || '').match(/[^.!?]+[.!?]+/g) || []).filter(s => s.trim().length > 15 && s.trim().length < 100);
  return sents.length ? sents[0].trim() : '';
}

/* ══════════════════════════════════════════
   BUILD MTG
══════════════════════════════════════════ */

function buildMTG(summary, cats) {
  const h        = hash(summary.title || 'X');
  const desc     = summary.description || '';
  const category = detectCategory(summary, cats);
  let color, subtype;
  switch (category) {
    case 'place':   color = getPlaceColor(desc, cats);  subtype = ''; break;
    case 'person':  color = getPersonColor(desc, cats); subtype = getPersonSubtype(desc, cats); break;
    case 'animal':  color = getAnimalColor(desc);        subtype = getAnimalSubtype(desc); break;
    case 'object':  color = pick(['A','W','U','R'], h);  subtype = getObjectSubtype(desc); break;
    case 'event':   color = getEventColor(desc);         subtype = ''; break;
    case 'work':    color = pick(['U','W','B'], h);      subtype = ''; break;
    default:        color = pick(['U','W','B','G'], h);  subtype = '';
  }
  const ability = mtgAbility(category, subtype, desc, color, h);
  const kws     = mtgKeywords(category, subtype, color, h);
  const pt      = mtgPT(category, subtype, desc, h+2);
  const mana    = mtgMana(category, color, summary.extract || '', h+3);
  const typeStr = mtgTypeString(category, subtype, desc, cats);
  const rarity  = mtgRarity(category, desc, h);
  const flavor  = mtgFlavor(summary);
  const dark    = ['U','B','R','G','M'].includes(color);
  const EMOJIS  = { W:'☀️', U:'💧', B:'💀', R:'🔥', G:'🌿', A:'💎', M:'🌈' };
  return { name: (summary.title||'').slice(0,26), color, category, subtype, kws, ability, pt, mana, rarity, typeStr, flavor, dark, image: summary.thumbnail?.source||null, url: summary.content_urls?.desktop?.page||'#', emoji: EMOJIS[color]||'🐉' };
}

/* ══════════════════════════════════════════
   RENDER MTG
══════════════════════════════════════════ */

function renderMTG(c) {
  const mc = document.getElementById('mc');
  mc.className = 'mtg-card ' + c.color;
  document.getElementById('mc-name').textContent    = c.name;
  document.getElementById('mc-typetxt').textContent = c.typeStr;
  document.getElementById('mc-rarity').textContent  = c.rarity;
  const manaEl = document.getElementById('mc-mana');
  manaEl.innerHTML = '';
  c.mana.forEach(m => {
    const s = document.createElement('div');
    s.className = 'msym ' + m.cls;
    s.textContent = ({ gen: m.n, mW:'W', mU:'U', mB:'B', mR:'R', mG:'G', mA:'A' })[m.cls] ?? m.n;
    manaEl.appendChild(s);
  });
  const box = document.getElementById('mc-box');
  box.className = 'mtg-box' + (c.dark ? ' dk' : '');
  document.getElementById('mc-kw').innerHTML  = c.kws.length ? `<em>${c.kws.join(', ')}</em>` : '';
  document.getElementById('mc-ab').innerHTML  = c.ability.split('\n').map(l => `<div>${l}</div>`).join('');
  document.getElementById('mc-flav').textContent = c.flavor ? `« ${c.flavor} »` : '';
  setArt(document.getElementById('mc-img'), document.getElementById('mc-ph'), c.image, c.emoji);
  const pt  = document.getElementById('mc-pt');
  const loy = document.getElementById('mc-loy');
  if (c.pt) { pt.textContent = `${c.pt.p}/${c.pt.t}`; pt.style.display = 'block'; loy.style.display = 'none'; }
  else { pt.style.display = 'none'; loy.style.display = 'none'; }
}

/* ══════════════════════════════════════════
   YU-GI-OH
══════════════════════════════════════════ */

const ATTRS = { DARK:'🌑', LIGHT:'☀️', FIRE:'🔥', WATER:'💧', EARTH:'🌍', WIND:'💨', DIVINE:'✨' };
const YGO_LABELS = { normal:'Monstre Normal', effect:'Monstre à Effet', ritual:'Monstre Rituel', fusion:'Monstre Fusion', synchro:'Monstre Synchro', xyz:'Monstre Xyz', link:'Monstre Lien', spell:'Carte Magie', trap:'Carte Piège' };

function ygoKind(category, desc, h) {
  const d = desc.toLowerCase();
  if (category === 'event')   return /piège|embuscade|trahison/.test(d) ? 'trap' : 'spell';
  if (category === 'work')    return 'spell';
  if (category === 'concept') return h % 2 === 0 ? 'spell' : 'trap';
  if (category === 'place')   return 'spell';
  if (category === 'object')  return 'spell';
  if (category === 'animal' && /dragon/.test(d) && h % 5 === 0) return 'fusion';
  if (category === 'person' && /dieu|déesse|divin/.test(d)) return 'ritual';
  return h % 8 === 0 ? 'normal' : 'effect';
}

function ygoAttr(category, desc, cats) {
  const d = desc.toLowerCase();
  if (category === 'place') {
    if (/île|océan|mer|lac|fleuve/.test(d)) return 'WATER';
    if (/montagne|volcan|désert/.test(d))   return 'FIRE';
    return 'EARTH';
  }
  if (category === 'animal') {
    if (/aquatique|marin|poisson|baleine/.test(d)) return 'WATER';
    if (/dragon|serpent/.test(d))                  return 'FIRE';
    if (/nocturne|chauve-souris/.test(d))          return 'DARK';
    if (/aigle|faucon|oiseau/.test(d))             return 'WIND';
    return 'EARTH';
  }
  if (category === 'person') {
    if (/saint|divin|ange|roi|reine/.test(d))  return 'LIGHT';
    if (/assassin|tyran|dictateur/.test(d))    return 'DARK';
    if (/militaire|guerrier|général/.test(d))  return 'FIRE';
    if (/scientifique|inventeur/.test(d))      return 'WIND';
    return 'EARTH';
  }
  if (category === 'event') return /épidémie|poison/.test(d) ? 'DARK' : 'FIRE';
  return 'EARTH';
}

function ygoRace(category, subtype, desc) {
  if (['place','event','work','concept','object'].includes(category)) return 'Magie';
  const map = { Dragon:'Dragon', Snake:'Reptile', Spider:'Insecte', Bird:'Oiseau', Fish:'Poisson', Insect:'Insecte', Wolf:'Bête', Cat:'Bête', Bear:'Bête', Beast:'Bête', Dinosaur:'Dinosaure', Ape:'Bête', Horse:'Bête', Lizard:'Reptile', 'Human Noble':'Guerrier', 'Human Soldier':'Guerrier', 'Human Wizard':'Magicien', 'Human Cleric':'Magicien', 'Human Advisor':'Magicien', 'Human Rogue':'Guerrier', 'Human Warrior':'Guerrier', Human:'Guerrier' };
  return map[subtype] || 'Guerrier';
}

function ygoLevel(category, desc, h) {
  if (['place','event','work','concept','object'].includes(category)) return null;
  const d = desc.toLowerCase();
  if (/dragon/.test(d))                       return range(7, 12, h);
  if (/roi|reine|emperor|légendaire/.test(d)) return range(6, 9, h);
  if (/général|amiral/.test(d))               return range(5, 8, h);
  if (/scientifique|philosophe/.test(d))      return range(3, 6, h);
  if (/insecte|araignée/.test(d))             return range(1, 4, h);
  return range(3, 7, h);
}

function ygoStats(desc, level, h) {
  if (!level) return null;
  const d = desc.toLowerCase();
  let atk = level * 300, def = level * 250;
  if (/dragon/.test(d))                          { atk += 800; def += 300; }
  else if (/guerrier|militaire|général/.test(d)) { atk += 400; }
  else if (/scientifique|philosophe/.test(d))    { atk -= 200; def += 500; }
  else if (/roi|reine|noble/.test(d))            { atk += 200; def += 400; }
  else if (/assassin|espion/.test(d))            { atk += 600; def -= 100; }
  atk = Math.min(5000, Math.round(Math.max(0, atk) / 50) * 50);
  def = Math.min(5000, Math.round(Math.max(0, def) / 50) * 50);
  return { atk, def };
}

function ygoRarity(category, desc, h) {
  const d = desc.toLowerCase();
  if (/roi|reine|emperor|impératrice|général|dragon|légendaire/.test(d)) return h % 4 === 0 ? '★' : '◆◆◆';
  if (category === 'event') return '◆◆';
  const r = h % 20;
  return r < 10 ? '◆' : r < 16 ? '◆◆' : r < 19 ? '◆◆◆' : '★';
}

/* Fallback si l'API échoue */
function ygoEffectFallback(category, subtype, desc, kind, h) {
  const d = desc.toLowerCase();
  if (category === 'place') {
    if (/île|océan|mer|lac|fleuve/.test(d)) return `Sort de Terrain.\nTant que cette carte est sur le Terrain, tous les monstres EAU gagnent 500 ATK/DEF.`;
    if (/montagne|volcan/.test(d))           return `Sort de Terrain.\nTant que cette carte est sur le Terrain, tous les monstres FEU gagnent 500 ATK.`;
    return `Sort de Terrain.\nTant que cette carte est sur le Terrain, tous vos monstres gagnent 300 ATK/DEF.`;
  }
  if (kind === 'normal') return '';
  return `Lorsque cette carte est Invoquée Normalement : piochez 1 carte. Une fois par tour : ciblez 1 monstre sur le Terrain, il perd 500 ATK/DEF jusqu'à la fin du tour.`;
}

function ygoBracket(kind, race, category, desc, h) {
  const d = desc.toLowerCase();
  if (category === 'place')   return `[Magie — Terrain]`;
  if (category === 'event')   return /piège|embuscade|trahison/.test(d) ? `[Piège — ${pick(['Normal','Continu','Contre'],h)}]` : `[Magie — ${pick(['Normal','Déclenchement Rapide'],h)}]`;
  if (category === 'work')    return `[Magie — Normal]`;
  if (category === 'concept') return `[Magie — Continu]`;
  if (category === 'object')  return /épée|arme|bouclier|armure/.test(d) ? `[Magie — Équipement]` : `[Magie — Normal]`;
  const ext = { fusion:' / Fusion', synchro:' / Synchro', xyz:' / Xyz', link:' / Lien', ritual:' / Rituel' };
  return `[${race}${ext[kind]||''} / ${kind === 'normal' ? 'Normal' : 'Effet'}]`;
}

/* ══════════════════════════════════════════
   BUILD YGO (async pour l'API)
══════════════════════════════════════════ */

async function buildYGO(summary, cats) {
  const h        = hash(summary.title || 'X');
  const desc     = summary.description || '';
  const category = detectCategory(summary, cats);
  const subtype  = category === 'person' ? getPersonSubtype(desc, cats) : category === 'animal' ? getAnimalSubtype(desc) : '';
  const kind     = ygoKind(category, desc, h);
  const attr     = ygoAttr(category, desc, cats);
  const race     = ygoRace(category, subtype, desc);
  const level    = ygoLevel(category, desc, h);
  const stats    = ygoStats(desc, level, h+1);
  const rarity   = ygoRarity(category, desc, h);
  const bracket  = ygoBracket(kind, race, category, desc, h+3);
  const flavor   = kind === 'normal' ? (summary.description || '') : '';

  /* Récupère les phrases depuis YGOPro */
  let eff = '';
  if (kind !== 'normal') {
    try {
      const sentences = await fetchYGOPhrases(category, subtype, attr, race, level, h);
      if (sentences.length) {
        eff = pickYGOPhrases(sentences, category, h, rarity);
      }
    } catch {}
    if (!eff) eff = ygoEffectFallback(category, subtype, desc, kind, h);
  }

  return { name: (summary.title||'').slice(0,28), kind, attr, level, race, stats, eff, flavor, bracket, category, rarity, isXYZ: kind==='xyz', isLink: kind==='link', linkN: kind==='link' ? range(1,4,h) : null, serial: String(Math.abs(h)).padStart(8,'0').slice(0,8), image: summary.thumbnail?.source||null, url: summary.content_urls?.desktop?.page||'#', emoji: ATTRS[attr]||'🐉' };
}

/* ══════════════════════════════════════════
   RENDER YGO
══════════════════════════════════════════ */

function renderYGO(c) {
  document.getElementById('yc').className = 'ygo-card ' + c.kind;
  document.getElementById('yc-name').textContent = c.name;
  document.getElementById('yc-attr').textContent = ATTRS[c.attr] || '🌍';
  setArt(document.getElementById('yc-img'), document.getElementById('yc-ph'), c.image, c.emoji);

  const starsEl = document.getElementById('yc-stars');
  starsEl.innerHTML = '';
  if (c.level && !c.isXYZ && !c.isLink) {
    for (let i = 0; i < c.level; i++) { const s = document.createElement('span'); s.className = 'ygo-star'; s.textContent = '★'; starsEl.appendChild(s); }
  } else if (c.isXYZ && c.level) {
    for (let i = 0; i < c.level; i++) { const s = document.createElement('span'); s.className = 'ygo-star rk'; s.textContent = '✦'; starsEl.appendChild(s); }
  } else if (c.isLink) {
    const s = document.createElement('span'); s.className = 'ygo-star lk'; s.textContent = 'LINK-' + c.linkN; starsEl.appendChild(s);
  }

  document.getElementById('yc-subtype').textContent = YGO_LABELS[c.kind] || c.kind;
  document.getElementById('yc-bracket').textContent = c.bracket;
  document.getElementById('yc-eff').innerHTML = c.eff ? c.eff.split('\n').map(l => `<div>${l}</div>`).join('') : '';
  document.getElementById('yc-flav').textContent = c.flavor || '';

  const statsEl = document.getElementById('yc-stats');
  statsEl.innerHTML = '';
  if (c.stats) {
    const a = document.createElement('div'); a.className = 'ygo-stat'; a.innerHTML = `ATK / <span>${c.stats.atk}</span>`; statsEl.appendChild(a);
    const dv = document.createElement('div'); dv.className = 'ygo-stat'; dv.innerHTML = `DEF / <span>${c.stats.def}</span>`; statsEl.appendChild(dv);
  }
  document.getElementById('yc-serial').textContent = c.serial;
}

/* ══ Image ══ */
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

/* ══ Chargement carte ══ */
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
    else {
      const ygo = await buildYGO(data, cats);
      renderYGO(ygo);
    }
    document.getElementById('out').classList.remove('hidden');
  } catch (e) { showErr(e.message); }
  finally { setLoading(false); }
}

/* ══ Carte du jour ══ */
async function goDaily() {
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
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
    else {
      const ygo = await buildYGO(data, cats);
      renderYGO(ygo);
    }
    document.getElementById('out').classList.remove('hidden');
  } catch (e) { showErr(e.message); }
  finally { setLoading(false); }
}

/* ══ Events ══ */
document.getElementById('bGen').addEventListener('click', () => { const q = document.getElementById('q').value.trim(); if (q) loadCard(fetchWiki(q)); });
document.getElementById('bRand').addEventListener('click', () => loadCard(fetchRandom()));
document.getElementById('bDaily').addEventListener('click', goDaily);
document.getElementById('q').addEventListener('keydown', e => { if (e.key === 'Enter') { const q = document.getElementById('q').value.trim(); if (q) loadCard(fetchWiki(q)); } });
