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
   DÉTECTION CATÉGORIE PRINCIPALE
   'person' | 'place' | 'animal' | 'object' | 'event' | 'work' | 'concept'
══════════════════════════════════════════ */

function detectCategory(summary, cats) {
  const desc = (summary.description || '').toLowerCase();
  const all  = desc + ' ' + cats.join(' ');

  /* Lieu */
  if (/commune|municipalit|ville|cité|capitale|pays|région|département|province|district|arrondissement|territoire/.test(desc)) return 'place';
  if (/île|archipel|péninsule|océan|mer|lac|fleuve|rivière|canal|détroit|golfe|baie|montagne|volcan|col|massif|désert|forêt|parc national|réserve naturelle/.test(desc)) return 'place';
  if (summary.coordinates) return 'place';

  /* Animal */
  if (/espèce|mammifère|reptile|oiseau|poisson|insecte|arachnid|amphibien|mollusque|crustacé|félin|canidé|primate|cétacé|dinosaure/.test(desc)) return 'animal';
  if (cats.some(c => /faune|zoologie|animal/.test(c))) return 'animal';

  /* Personne */
  if (/né le|née le/.test((summary.extract || '').slice(0, 200))) return 'person';
  if (/homme politique|femme politique|militaire|général|amiral|roi|reine|emperor|impératrice|prince|princesse|duc|noble/.test(desc)) return 'person';
  if (/physicien|chimiste|mathématicien|biologiste|médecin|philosophe|historien|archéologue/.test(desc)) return 'person';
  if (/acteur|actrice|réalisateur|musicien|chanteur|chanteuse|compositeur|écrivain|auteur|poète|peintre|sculpteur|architecte/.test(desc)) return 'person';
  if (/sportif|footballeur|tennisman|cycliste|nageur|athlète|boxeur/.test(desc)) return 'person';
  if (cats.some(c => /naissance|décès|personnalité/.test(c))) return 'person';

  /* Événement */
  if (/bataille|guerre|conflit|révolution|insurrection|coup d'état|siège|offensive/.test(desc)) return 'event';
  if (/tremblement de terre|séisme|éruption|tsunami|ouragan|catastrophe/.test(desc)) return 'event';
  if (/épidémie|pandémie|peste|choléra/.test(desc)) return 'event';
  if (/attentat|massacre|génocide/.test(desc)) return 'event';
  if (/traité|accord|conférence/.test(desc)) return 'event';

  /* Objet */
  if (/épée|lance|bouclier|armure|casque|arme|fusil|canon/.test(desc)) return 'object';
  if (/navire|bateau|vaisseau|frégate|galère|sous-marin|avion|locomotive|automobile/.test(desc)) return 'object';
  if (/monument|temple|château|cathédrale|basilique|mosquée|palais|tour|pont|pyramide/.test(desc)) return 'object';
  if (/instrument de musique|outil|machine|moteur|ordinateur|satellite|fusée/.test(desc)) return 'object';
  if (/relique|talisman|couronne|sceptre|anneau|calice|grimoire/.test(desc)) return 'object';

  /* Œuvre */
  if (/film|série télévisée|documentaire/.test(desc)) return 'work';
  if (/roman|livre|manga|bande dessinée/.test(desc)) return 'work';
  if (/tableau|peinture|sculpture|œuvre d'art/.test(desc)) return 'work';
  if (/chanson|album|opéra|symphonie/.test(desc)) return 'work';
  if (/jeu vidéo|jeu de société/.test(desc)) return 'work';

  /* Concept */
  if (/théorie|philosophie|religion|mouvement|courant|idéologie|doctrine|mythologie|mythe/.test(desc)) return 'concept';
  if (/maladie|syndrome|phénomène|processus|science|discipline/.test(desc)) return 'concept';

  return 'concept';
}

/* ══════════════════════════════════════════
   SOUS-TYPES
══════════════════════════════════════════ */

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
   COULEURS
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
   CAPACITÉS MTG PAR CATÉGORIE
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
  const byColor = {
    W: ['Vol','Vigilance','Lien de vie','Premier combat'],
    U: ['Vol','Hexproof','Flash'],
    B: ['Contact mortel','Lien de vie','Intimidation','Discrétion'],
    R: ['Célérité','Piétinement','Premier combat'],
    G: ['Piétinement','Portée','Vigilance'],
  };
  const bySub = {
    'Human Noble':   ['Vigilance','Lien de vie'],
    'Human Soldier': ['Célérité','Premier combat'],
    'Human Wizard':  ['Flash','Hexproof'],
    'Human Cleric':  ['Lien de vie','Vigilance'],
    'Human Rogue':   ['Discrétion','Contact mortel'],
    'Dragon':        ['Vol','Célérité'],
    'Bird':          ['Vol','Vigilance'],
    'Snake':         ['Contact mortel'],
    'Spider':        ['Portée','Contact mortel'],
  };
  return [...new Set(bySub[subtype] || byColor[color] || [])].slice(0, 2);
}

function mtgPT(category, subtype, desc, h) {
  if (!['person','animal'].includes(category)) return null;
  const d = desc.toLowerCase();
  const b = range(1, 5, h);
  if (category === 'animal') {
    if (/dragon/.test(d))                          return { p: b+3, t: b+2 };
    if (/baleine|éléphant|rhinocéros/.test(d))     return { p: b+2, t: b+3 };
    if (/requin|tigre|lion|loup/.test(d))          return { p: b+2, t: b+1 };
    if (/insecte|araignée/.test(d))                return { p: 1,   t: b   };
    return { p: b+1, t: b };
  }
  if (/général|militaire|guerrier/.test(d))        return { p: b+1, t: b   };
  if (/physicien|scientifique|philosophe/.test(d)) return { p: 1,   t: b+2 };
  if (/roi|reine|emperor/.test(d))                 return { p: b,   t: b+1 };
  if (/assassin|espion/.test(d))                   return { p: b+1, t: 1   };
  return { p: b, t: b };
}

function mtgMana(category, color, desc, h) {
  if (category === 'place') return [];
  const wc  = (desc || '').split(/\s+/).length;
  let   cmc = Math.min(8, Math.max(1, Math.round(wc / 60)));
  if (category === 'event')  cmc = Math.min(8, cmc + 2);
  if (/dragon/.test((desc||'').toLowerCase())) cmc = Math.min(8, cmc + 3);
  const syms = [];
  if (cmc > 1) syms.push({ n: cmc - 1, cls: 'gen' });
  syms.push({ n: null, cls: 'm' + color });
  return syms;
}

function mtgTypeString(category, subtype, desc, cats) {
  const d = desc.toLowerCase();
  const legendary = /roi|reine|emperor|impératrice|général|amiral|légendaire|unique/.test(d)
    || cats.some(c => /monarque|chef d'état/.test(c));
  const sup = legendary ? 'Légendaire ' : '';
  switch (category) {
    case 'place':  return `${sup}Terrain`;
    case 'person': return `${sup}Créature — ${subtype}`;
    case 'animal': return `${sup}Créature — ${subtype}`;
    case 'object':
      if (subtype === 'Equipment') return `${sup}Artefact — Équipement`;
      if (subtype === 'Vehicle')   return `${sup}Artefact — Véhicule`;
      return `${sup}Artefact`;
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
  const sents = ((summary.extract || '').match(/[^.!?]+[.!?]+/g) || [])
    .filter(s => s.trim().length > 15 && s.trim().length < 100);
  return sents.length ? sents[0].trim() : ''