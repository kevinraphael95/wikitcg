'use strict';

/* ══════════════════════════════════════════
   YGO CARD RENDERER — Canvas 2D
   Dimensions réelles : 421 × 614 px (ratio 59/86)
══════════════════════════════════════════ */

const YGO_W = 421;
const YGO_H = 614;

/* ── Palettes de fond par type ── */
const CARD_PALETTES = {
  normal:  { top: '#d4a93a', mid: '#c8921c', bot: '#b87a10', shine: 'rgba(255,220,100,.18)' },
  effect:  { top: '#c8681a', mid: '#b04c10', bot: '#983a08', shine: 'rgba(255,140,60,.14)'  },
  ritual:  { top: '#2a4aac', mid: '#1c3490', bot: '#142878', shine: 'rgba(120,160,255,.14)' },
  fusion:  { top: '#7228ac', mid: '#561890', bot: '#3a0870', shine: 'rgba(180,100,255,.14)' },
  synchro: { top: '#dedad2', mid: '#cac4b8', bot: '#b8b0a0', shine: 'rgba(255,255,255,.3)'  },
  xyz:     { top: '#141018', mid: '#0c0a10', bot: '#060408', shine: 'rgba(80,60,140,.2)'    },
  link:    { top: '#1a2a7c', mid: '#101c64', bot: '#08104c', shine: 'rgba(80,120,255,.14)'  },
  spell:   { top: '#126640', mid: '#0a4c2c', bot: '#063818', shine: 'rgba(60,200,100,.12)'  },
  trap:    { top: '#8c1840', mid: '#680c2c', bot: '#4c0818', shine: 'rgba(255,60,120,.12)'  },
};

/* ── Couleur du bandeau nom par type ── */
const NAME_BAR = {
  normal:  { bg: ['#1a0e00','#0a0600'], text: '#f8e8a0', shadow: '#000' },
  effect:  { bg: ['#1a0800','#0c0400'], text: '#f8e0c0', shadow: '#000' },
  ritual:  { bg: ['#08143c','#040c28'], text: '#c0d8ff', shadow: '#000020' },
  fusion:  { bg: ['#200838','#100420'], text: '#e0c0ff', shadow: '#100030' },
  synchro: { bg: ['#1a1a1a','#080808'], text: '#ffffff',  shadow: '#000'   },
  xyz:     { bg: ['#080608','#040208'], text: '#d0c8e8',  shadow: '#000'   },
  link:    { bg: ['#08102c','#040818'], text: '#a0c0ff',  shadow: '#000020'},
  spell:   { bg: ['#061a0c','#030e06'], text: '#a0f0c0',  shadow: '#001008'},
  trap:    { bg: ['#1a0610','#0e0208'], text: '#ffa0c0',  shadow: '#200010'},
};

/* ── Couleur textbox ── */
const TEXTBOX_BG = {
  normal:  { fill: '#fffce8', border: '#b8960c', inner: '#d4aa10' },
  effect:  { fill: '#fffce8', border: '#b8960c', inner: '#d4aa10' },
  ritual:  { fill: '#f0f4ff', border: '#6080c0', inner: '#8090d0' },
  fusion:  { fill: '#f8f0ff', border: '#9060c0', inner: '#a870d0' },
  synchro: { fill: '#fafaf8', border: '#a0a090', inner: '#b8b8a8' },
  xyz:     { fill: '#0c0a14', border: '#6040a0', inner: '#4830780' },
  link:    { fill: '#080e24', border: '#3050a0', inner: '#2040800' },
  spell:   { fill: '#fffce8', border: '#207040', inner: '#309050' },
  trap:    { fill: '#fffce8', border: '#902040', inner: '#b03060' },
};

/* ── Couleur texte dans textbox ── */
const TEXT_COLOR = {
  normal: '#0a0600', effect: '#0a0600', ritual: '#080c20',
  fusion: '#100820', synchro: '#080808',
  xyz: '#d0c8e8', link: '#a0b8e8',
  spell: '#0a0e04', trap: '#0e0408',
};

/* ══ Utilitaire : arrondi ══ */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ══ Fond de carte ══ */
function drawBackground(ctx, kind) {
  const p = CARD_PALETTES[kind] || CARD_PALETTES.effect;

  /* Dégradé principal */
  const grad = ctx.createLinearGradient(0, 0, 0, YGO_H);
  grad.addColorStop(0,   p.top);
  grad.addColorStop(0.5, p.mid);
  grad.addColorStop(1,   p.bot);
  roundRect(ctx, 0, 0, YGO_W, YGO_H, 14);
  ctx.fillStyle = grad;
  ctx.fill();

  /* Reflet diagonale */
  const shine = ctx.createLinearGradient(0, 0, YGO_W, YGO_H * .6);
  shine.addColorStop(0,   p.shine);
  shine.addColorStop(0.4, 'rgba(255,255,255,0)');
  roundRect(ctx, 0, 0, YGO_W, YGO_H, 14);
  ctx.fillStyle = shine;
  ctx.fill();

  /* Motif losange (normal/effect uniquement) */
  if (['normal','effect'].includes(kind)) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = kind === 'normal' ? '#8a6000' : '#6a2000';
    ctx.lineWidth = 0.5;
    for (let x = -20; x < YGO_W + 20; x += 16) {
      for (let y = -20; y < YGO_H + 20; y += 16) {
        ctx.beginPath();
        ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y);
        ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y);
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* Bordure extérieure triple */
  roundRect(ctx, 1, 1, YGO_W - 2, YGO_H - 2, 13);
  ctx.strokeStyle = kind === 'xyz' ? '#8060c0' : '#f0d060';
  ctx.lineWidth = 3;
  ctx.stroke();

  roundRect(ctx, 4, 4, YGO_W - 8, YGO_H - 8, 11);
  ctx.strokeStyle = kind === 'xyz' ? '#4030800' : '#806820';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  roundRect(ctx, 6, 6, YGO_W - 12, YGO_H - 12, 10);
  ctx.strokeStyle = kind === 'xyz' ? '#c090f0' : '#c8a030';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* ══ Bandeau nom ══ */
function drawNameBar(ctx, name, kind, attrEmoji) {
  const nb = NAME_BAR[kind] || NAME_BAR.effect;
  const barH = 38;
  const x = 10, y = 10, w = YGO_W - 20;

  /* Fond dégradé */
  const grad = ctx.createLinearGradient(x, y, x, y + barH);
  grad.addColorStop(0, nb.bg[0]);
  grad.addColorStop(1, nb.bg[1]);
  roundRect(ctx, x, y, w, barH, 4);
  ctx.fillStyle = grad;
  ctx.fill();

  /* Bordure dorée */
  roundRect(ctx, x, y, w, barH, 4);
  ctx.strokeStyle = 'rgba(200,160,40,.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* Nom */
  ctx.save();
  ctx.shadowColor = nb.shadow;
  ctx.shadowBlur = 3;
  ctx.fillStyle = nb.text;
  ctx.font = `bold ${Math.min(22, Math.max(14, 420 / (name.length + 2)))}px "Palatino Linotype", Palatino, serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(name, x + 8, y + barH / 2, w - 44);
  ctx.restore();

  /* Attribut emoji */
  ctx.font = '18px serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(attrEmoji, x + w - 6, y + barH / 2);
}

/* ══ Illustration ══ */
async function drawArt(ctx, imgSrc, emoji) {
  const artX = 14, artY = 56, artW = YGO_W - 28, artH = 210;

  /* Fond sombre */
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(artX, artY, artW, artH);

  /* Bordures de l'illustration */
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(artX, artY, artW, artH);
  ctx.strokeStyle = 'rgba(200,160,40,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(artX + 2, artY + 2, artW - 4, artH - 4);

  if (imgSrc) {
    try {
      const img = await loadImage(imgSrc);
      /* Calcul pour couvrir la zone en gardant le ratio */
      const scale = Math.max(artW / img.width, artH / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      const sx = artX + (artW - sw) / 2, sy = artY + (artH - sh) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(artX + 2, artY + 2, artW - 4, artH - 4);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh);
      ctx.restore();
      return;
    } catch {}
  }

  /* Fallback emoji */
  ctx.font = '80px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(emoji, artX + artW / 2, artY + artH / 2);
  ctx.globalAlpha = 1;
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => res(img);
    img.onerror = () => rej(new Error('img load fail'));
    img.src = src;
  });
}

/* ══ Ligne type/étoiles ══ */
function drawTypeLine(ctx, kind, race, level, isXYZ, isLink, linkN, subLabel) {
  const lineY = 272, lineH = 20;
  const x = 14, w = YGO_W - 28;

  /* Fond léger */
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.fillRect(x, lineY, w, lineH);

  /* Subtype (gauche) */
  ctx.fillStyle = ['xyz','link','spell','trap','ritual','fusion'].includes(kind)
    ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.65)';
  ctx.font = `italic bold 10px "Palatino Linotype", serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(subLabel, x + 4, lineY + lineH / 2);

  /* Étoiles (droite) */
  if (level && !isXYZ && !isLink) {
    const starSize = 14, gap = 1;
    const totalW = level * (starSize + gap);
    let sx = x + w - totalW - 2;
    ctx.font = `${starSize}px serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0c820';
    ctx.shadowColor = 'rgba(240,200,32,.7)';
    ctx.shadowBlur = 4;
    for (let i = 0; i < level; i++) {
      ctx.fillText('★', sx, lineY + lineH / 2 + 1);
      sx += starSize + gap;
    }
    ctx.shadowBlur = 0;
  } else if (isXYZ && level) {
    const starSize = 13, gap = 1;
    const totalW = level * (starSize + gap);
    let sx = x + w - totalW - 2;
    ctx.font = `${starSize}px serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b0b0d0';
    for (let i = 0; i < level; i++) {
      ctx.fillText('✦', sx, lineY + lineH / 2 + 1);
      sx += starSize + gap;
    }
  } else if (isLink) {
    ctx.fillStyle = '#88b8ff';
    ctx.font = `bold 10px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`LINK-${linkN}`, x + w - 4, lineY + lineH / 2);
  }
}

/* ══ Textbox ══ */
function drawTextbox(ctx, kind, bracket, effect, flavor, stats) {
  const tb = TEXTBOX_BG[kind] || TEXTBOX_BG.effect;
  const tc = TEXT_COLOR[kind] || '#0a0600';
  const hasStats = stats !== null;

  const tbX = 10, tbY = 296;
  const tbW = YGO_W - 20;
  const tbH = hasStats ? YGO_H - tbY - 46 : YGO_H - tbY - 28;

  /* Fond */
  roundRect(ctx, tbX, tbY, tbW, tbH, 3);
  ctx.fillStyle = tb.fill;
  ctx.fill();

  /* Bordure extérieure */
  roundRect(ctx, tbX, tbY, tbW, tbH, 3);
  ctx.strokeStyle = tb.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* Bordure intérieure ornée */
  roundRect(ctx, tbX + 2, tbY + 2, tbW - 4, tbH - 4, 2);
  ctx.strokeStyle = tb.inner;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* Bracket */
  ctx.fillStyle = tc;
  ctx.font = `italic 10px "Palatino Linotype", serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(bracket, tbX + 5, tbY + 4, tbW - 10);

  /* Effet — wrapping manuel */
  const effLines = wrapText(ctx, effect, tbW - 12, `11px "Times New Roman", serif`);
  ctx.font = `11px "Times New Roman", serif`;
  ctx.fillStyle = tc;
  let ly = tbY + 18;
  const lineH = 14;
  const maxLines = Math.floor((tbH - 24) / lineH);
  for (let i = 0; i < Math.min(effLines.length, maxLines); i++) {
    ctx.fillText(effLines[i], tbX + 5, ly);
    ly += lineH;
  }

  /* Flavor (italique, si pas d'effet) */
  if (flavor && effLines.length === 0) {
    ctx.font = `italic 11px "Times New Roman", serif`;
    ctx.fillStyle = tc;
    ctx.globalAlpha = 0.75;
    const flavLines = wrapText(ctx, flavor, tbW - 12, `italic 11px "Times New Roman", serif`);
    let fy = tbY + 8;
    for (const fl of flavLines.slice(0, 5)) { ctx.fillText(fl, tbX + 5, fy); fy += 14; }
    ctx.globalAlpha = 1;
  }
}

/* ══ Stats ATK/DEF ══ */
function drawStats(ctx, kind, stats) {
  if (!stats) return;
  const tc = ['xyz','link'].includes(kind) ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.75)';
  const y = YGO_H - 42;

  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(10, y, YGO_W - 20, 16);

  ctx.font = `bold 12px "Arial Narrow", Arial, sans-serif`;
  ctx.fillStyle = tc;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ATK / ${stats.atk}`, YGO_W / 2 - 10, y + 8);
  ctx.fillText(`DEF / ${stats.def}`, YGO_W - 14, y + 8);
}

/* ══ Footer : hologramme + serial ══ */
function drawFooter(ctx, kind, serial) {
  const y = YGO_H - 24;

  /* Hologramme */
  const hx = 20, hy = y + 4, hr = 8;
  const conic = ctx.createConicGradient ? ctx.createConicGradient(0, hx, hy) : null;
  if (conic) {
    conic.addColorStop(0,      'rgba(255,0,0,.7)');
    conic.addColorStop(1/6,    'rgba(255,165,0,.7)');
    conic.addColorStop(2/6,    'rgba(255,255,0,.7)');
    conic.addColorStop(3/6,    'rgba(0,255,0,.7)');
    conic.addColorStop(4/6,    'rgba(0,0,255,.7)');
    conic.addColorStop(5/6,    'rgba(238,130,238,.7)');
    conic.addColorStop(1,      'rgba(255,0,0,.7)');
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fillStyle = conic;
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    /* Fallback sans createConicGradient */
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180,180,220,.5)';
    ctx.fill();
  }

  /* Set info */
  const tc = ['xyz','link'].includes(kind) ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.4)';
  ctx.font = `8px monospace`;
  ctx.fillStyle = tc;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WIKITCG-001', hx + hr + 4, y + 4);

  /* Serial */
  ctx.textAlign = 'right';
  ctx.fillText(serial, YGO_W - 14, y + 4);
}

/* ══ Wrap texte ══ */
function wrapText(ctx, text, maxW, font) {
  ctx.font = font;
  const words = (text || '').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ══════════════════════════════════════════
   EXPORT PRINCIPAL
══════════════════════════════════════════ */

async function renderYGOCanvas(canvas, card) {
  canvas.width  = YGO_W;
  canvas.height = YGO_H;
  const ctx = canvas.getContext('2d');

  const kind = card.kind || 'effect';

  /* 1. Fond */
  drawBackground(ctx, kind);

  /* 2. Bandeau nom */
  drawNameBar(ctx, card.name || '', kind, card.emoji || '🌍');

  /* 3. Art */
  await drawArt(ctx, card.image || null, card.emoji || '🐉');

  /* 4. Ligne type */
  const subLabel = {
    normal:'Monstre Normal', effect:'Monstre à Effet', ritual:'Monstre Rituel',
    fusion:'Monstre Fusion', synchro:'Monstre Synchro', xyz:'Monstre Xyz',
    link:'Monstre Lien', spell:'Carte Magie', trap:'Carte Piège',
  }[kind] || 'Monstre à Effet';

  drawTypeLine(ctx, kind, card.race, card.level, card.isXYZ, card.isLink, card.linkN, subLabel);

  /* 5. Textbox */
  drawTextbox(ctx, kind, card.bracket || '', card.eff || '', card.flavor || '', card.stats || null);

  /* 6. Stats */
  drawStats(ctx, kind, card.stats || null);

  /* 7. Footer */
  drawFooter(ctx, kind, card.serial || '00000000');
}
