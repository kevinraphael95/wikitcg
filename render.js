// render.js — Rendu SVG et export

const PALETTES = {
  mono:     ['#2a2620', '#4a4540', '#7a7570'],
  gold:     ['#bf4020', '#c87030', '#a03010'],
  spectrum: ['#bf4020', '#306080', '#5a7040', '#7050a0', '#c87030'],
};

/**
 * Remplit le SVG #svg-output avec des mots Wikipedia tracés le long des chemins.
 * Le texte tourne en boucle pour couvrir tous les chemins intégralement.
 */
export function render(paths, wikiData, colorMode = 'mono') {
  const svg = document.getElementById('svg-output');
  const rawWords = wikiData.text.split(/\s+/).filter(Boolean);
  if (!rawWords.length || !paths.length) return;

  svg.innerHTML = '';

  // Fond
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '500');
  bg.setAttribute('height', '500');
  bg.setAttribute('fill', '#ebe4d6');
  svg.appendChild(bg);

  const palette = PALETTES[colorMode] || PALETTES.mono;
  const fontSize = 5.5;
  const charWidth = fontSize * 0.55;
  const spaceWidth = fontSize * 0.8;

  // Mesure des longueurs via SVG temporaire hors écran
  const tmpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  tmpSvg.setAttribute('viewBox', '0 0 500 500');
  tmpSvg.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0';
  document.body.appendChild(tmpSvg);

  const pathLengths = paths.map(d => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    tmpSvg.appendChild(el);
    const len = el.getTotalLength();
    tmpSvg.removeChild(el);
    return len;
  });
  document.body.removeChild(tmpSvg);

  const totalLength = pathLengths.reduce((a, b) => a + b, 0);
  const avgWordPx = (rawWords.reduce((a, w) => a + w.length, 0) / rawWords.length) * charWidth + spaceWidth;
  const repeats = Math.ceil(totalLength / (rawWords.length * avgWordPx)) + 2;

  // Mots en boucle pour couvrir tous les chemins
  const words = [];
  for (let i = 0; i < repeats; i++) words.push(...rawWords);

  // Defs pour les chemins nommés (textPath href)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  paths.forEach((d, pi) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('id', 'tv' + pi);
    el.setAttribute('d', d);
    defs.appendChild(el);
  });
  svg.appendChild(defs);

  let wordIdx = 0;
  let colorIdx = 0;

  paths.forEach((_, pi) => {
    const pathLen = pathLengths[pi];
    if (pathLen < 5) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    let dist = 0;

    while (dist < pathLen - 1) {
      const word = words[wordIdx % words.length];
      wordIdx++;
      const color = palette[colorIdx % palette.length];
      colorIdx++;

      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('font-family', 'DM Mono, monospace');
      t.setAttribute('font-size', fontSize);
      t.setAttribute('fill', color);
      t.setAttribute('letter-spacing', '0.05em');

      const tp = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
      tp.setAttribute('href', '#tv' + pi);
      tp.setAttribute('startOffset', dist.toFixed(1));
      tp.textContent = word + ' ';

      t.appendChild(tp);
      g.appendChild(t);

      dist += word.length * charWidth + spaceWidth;
    }

    svg.appendChild(g);
  });
}

/**
 * Télécharge le SVG courant en .svg
 */
export function exportSVG() {
  const svg = document.getElementById('svg-output');
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'typographie-vivante.svg';
  a.click();
  URL.revokeObjectURL(a.href);
}
