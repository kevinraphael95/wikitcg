// shapes.js — Formes SVG pour Typographie Vivante
// Tout est centré sur viewBox 0 0 500 500 (centre = 250,250)

export const SHAPES = {

  // ── OISEAU ──
  // Silhouette d'oiseau en vol, construite comme une vraie forme reconnaissable
  bird: [
    // Corps principal (ellipse orientée)
    "M 200 255 C 210 235 235 225 260 228 C 285 231 305 245 308 262 C 311 278 298 292 275 295 C 252 298 225 288 210 275 C 198 265 198 260 200 255 Z",
    // Aile gauche déployée (grande)
    "M 210 260 C 195 248 175 235 150 222 C 125 209 98 200 72 196 C 95 205 118 218 138 232 C 158 246 178 258 200 265",
    // Aile droite déployée (grande)
    "M 305 258 C 320 246 340 233 365 220 C 390 207 417 198 443 194 C 420 203 397 216 377 230 C 357 244 337 256 310 265",
    // Courbe supérieure aile gauche
    "M 200 252 C 185 238 165 224 142 212 C 119 200 94 192 70 190",
    // Courbe supérieure aile droite
    "M 310 254 C 325 240 345 226 368 214 C 391 202 416 194 442 192",
    // Tête
    "M 260 228 C 268 218 278 212 288 214 C 298 216 304 226 302 236 C 300 246 290 250 280 248",
    // Bec
    "M 288 214 C 296 208 306 206 312 210 C 308 216 300 218 294 216",
    // Queue (plumes)
    "M 210 278 C 200 290 192 305 186 320 C 192 308 200 296 208 285",
    "M 215 282 C 206 296 200 312 196 328 C 202 314 210 300 218 288",
    "M 220 285 C 214 300 210 316 208 332 C 213 318 220 304 226 290",
  ],

  // ── CERCLE ── concentriques bien remplis
  circle: (() => {
    const paths = [];
    for (let r = 15; r <= 220; r += 17)
      paths.push(`M ${250 + r} 250 A ${r} ${r} 0 1 1 ${250 + r - 0.01} 250`);
    return paths;
  })(),

  // ── ÉTOILE ──
  star: (() => {
    const paths = [];
    const cx = 250, cy = 250;
    function star(R, r, n = 5) {
      const pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (i * Math.PI / n) - Math.PI / 2;
        const rad = i % 2 === 0 ? R : r;
        pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
      }
      return 'M ' + pts.join(' L ') + ' Z';
    }
    // 3 étoiles concentriques
    paths.push(star(215, 86), star(155, 62), star(95, 38));
    // Rayons du centre vers les pointes
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
      paths.push(`M 250 250 L ${(250 + 215 * Math.cos(a)).toFixed(1)} ${(250 + 215 * Math.sin(a)).toFixed(1)}`);
    }
    // Rayons vers les creux
    for (let i = 0; i < 5; i++) {
      const a = ((i + 0.5) * 2 * Math.PI / 5) - Math.PI / 2;
      paths.push(`M 250 250 L ${(250 + 86 * Math.cos(a)).toFixed(1)} ${(250 + 86 * Math.sin(a)).toFixed(1)}`);
    }
    return paths;
  })(),

  // ── CŒUR ──
  heart: (() => {
    const paths = [];
    // Plusieurs contours de cœur concentriques
    function heartPath(scale, dy = 0) {
      const s = scale;
      const cx = 250, cy = 250 + dy;
      return `M ${cx} ${cy + 90 * s} ` +
        `C ${cx - 30 * s} ${cy + 70 * s} ${cx - 120 * s} ${cy + 30 * s} ${cx - 120 * s} ${cy - 20 * s} ` +
        `C ${cx - 120 * s} ${cy - 75 * s} ${cx - 60 * s} ${cy - 110 * s} ${cx} ${cy - 70 * s} ` +
        `C ${cx + 60 * s} ${cy - 110 * s} ${cx + 120 * s} ${cy - 75 * s} ${cx + 120 * s} ${cy - 20 * s} ` +
        `C ${cx + 120 * s} ${cy + 30 * s} ${cx + 30 * s} ${cy + 70 * s} ${cx} ${cy + 90 * s} Z`;
    }
    paths.push(heartPath(1.0));
    paths.push(heartPath(0.78));
    paths.push(heartPath(0.56));
    paths.push(heartPath(0.34));
    // Ligne centrale verticale
    paths.push("M 250 180 L 250 340");
    // Ligne horizontale au milieu
    paths.push("M 135 230 C 180 210 220 210 250 220 C 280 210 320 210 365 230");
    return paths;
  })(),

  // ── VAGUE ──
  wave: (() => {
    const paths = [];
    for (let i = 0; i < 10; i++) {
      const y = 68 + i * 40;
      const amp = 28 - i * 0.5;
      paths.push(
        `M 28 ${y} C 90 ${y - amp} 145 ${y + amp} 200 ${y} ` +
        `C 255 ${y - amp} 310 ${y + amp} 365 ${y} ` +
        `C 420 ${y - amp} 455 ${y + amp} 472 ${y}`
      );
    }
    return paths;
  })(),

  // ── POISSON ──
  fish: [
    // Corps principal
    "M 110 250 C 125 210 170 180 230 175 C 290 170 345 190 375 225 C 395 248 390 275 370 295 C 340 320 285 330 225 325 C 165 320 125 295 110 270 C 106 262 106 256 110 250 Z",
    // Nageoire caudale (queue)
    "M 375 250 C 395 228 425 210 450 195 C 432 232 430 268 450 305 C 425 290 395 272 375 250",
    // Nageoire dorsale
    "M 230 175 C 235 148 250 130 268 128 C 278 138 282 158 278 178",
    // Nageoire ventrale
    "M 240 325 C 244 345 255 360 268 365 C 275 355 278 338 272 325",
    // Œil
    "M 185 235 C 185 225 193 218 203 218 C 213 218 221 225 221 235 C 221 245 213 252 203 252 C 193 252 185 245 185 235 Z",
    // Pupille
    "M 199 235 C 199 231 202 228 206 228 C 210 228 213 231 213 235 C 213 239 210 242 206 242 C 202 242 199 239 199 235 Z",
    // Écailles (arcs)
    "M 200 200 C 215 192 232 190 248 194",
    "M 220 210 C 238 200 258 198 275 203",
    "M 235 222 C 255 212 278 210 295 216",
    "M 240 236 C 262 226 286 224 305 230",
    "M 238 250 C 260 242 285 240 305 247",
    "M 230 264 C 252 258 275 257 295 263",
    "M 215 277 C 236 272 258 271 276 278",
  ],

  // ── SPIRALE ──
  spiral: (() => {
    const paths = [];
    const cx = 250, cy = 250;
    const turns = 4.5, maxR = 215;
    const segments = 12;
    for (let seg = 0; seg < segments; seg++) {
      const t0 = (seg / segments) * turns * 2 * Math.PI;
      const t1 = ((seg + 1) / segments) * turns * 2 * Math.PI;
      const r0 = (t0 / (turns * 2 * Math.PI)) * maxR + 6;
      const r1 = (t1 / (turns * 2 * Math.PI)) * maxR + 6;
      const pts = [];
      for (let k = 0; k <= 30; k++) {
        const t = t0 + (k / 30) * (t1 - t0);
        const r = r0 + (k / 30) * (r1 - r0);
        pts.push(`${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`);
      }
      paths.push('M ' + pts.join(' L '));
    }
    return paths;
  })(),

  // ── ARBRE ──
  tree: [
    // Tronc
    "M 250 430 L 250 310",
    "M 238 430 C 232 400 230 368 236 335",
    "M 262 430 C 268 400 270 368 264 335",
    // Racines
    "M 250 425 C 232 430 212 438 192 448",
    "M 250 425 C 268 430 288 438 308 448",
    "M 244 430 C 228 438 210 448 190 458",
    "M 256 430 C 272 438 290 448 310 458",
    // Branches basses
    "M 248 360 C 225 345 198 336 170 330",
    "M 252 360 C 275 345 302 336 330 330",
    "M 246 340 C 218 322 190 312 160 306",
    "M 254 340 C 282 322 310 312 340 306",
    // Branches moyennes
    "M 247 310 C 220 294 192 284 162 278",
    "M 253 310 C 280 294 308 284 338 278",
    "M 246 292 C 224 276 200 266 174 260",
    "M 254 292 C 276 276 300 266 326 260",
    // Branches hautes
    "M 248 265 C 230 248 210 238 188 232",
    "M 252 265 C 270 248 290 238 312 232",
    "M 247 248 C 232 232 216 224 196 220",
    "M 253 248 C 268 232 284 224 304 220",
    // Couronne extérieure
    "M 250 120 C 192 132 155 165 148 205 C 142 240 158 268 184 280",
    "M 250 120 C 308 132 345 165 352 205 C 358 240 342 268 316 280",
    "M 184 280 C 204 288 228 292 250 290 C 272 292 296 288 316 280",
    // Couronne intérieure
    "M 250 148 C 206 160 180 188 176 218 C 172 245 188 264 210 272",
    "M 250 148 C 294 160 320 188 324 218 C 328 245 312 264 290 272",
    "M 210 272 C 228 280 242 282 250 280 C 258 282 272 280 290 272",
  ],

};

// ── FORME ALÉATOIRE ──
export function generateRandom() {
  const fns = [genBlob, genFlower, genMandala, genConstellation, genPolygon, genAbstract];
  return fns[Math.floor(Math.random() * fns.length)]();
}

function genBlob() {
  const paths = [], cx = 250, cy = 250;
  for (let l = 0; l < 4 + Math.floor(Math.random() * 3); l++) {
    paths.push(catmullRom(blobPoints(cx, cy, 40 + l * 46, 8 + l * 2), true));
  }
  const spokes = 5 + Math.floor(Math.random() * 6);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * 2 * Math.PI;
    const r = 30 + Math.random() * 180;
    paths.push(`M ${cx} ${cy} Q ${f(cx + r * .5 * Math.cos(a + .4))} ${f(cy + r * .5 * Math.sin(a + .4))} ${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`);
  }
  return paths;
}

function genFlower() {
  const paths = [], cx = 250, cy = 250;
  const petals = 5 + Math.floor(Math.random() * 7);
  const pr = 70 + Math.random() * 80, pw = 35 + Math.random() * 30;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * 2 * Math.PI;
    const px = cx + pr * Math.cos(a), py = cy + pr * Math.sin(a);
    const c1x = cx + pw * Math.cos(a - Math.PI / 3), c1y = cy + pw * Math.sin(a - Math.PI / 3);
    const c2x = cx + pw * Math.cos(a + Math.PI / 3), c2y = cy + pw * Math.sin(a + Math.PI / 3);
    paths.push(`M ${cx} ${cy} C ${f(c1x)} ${f(c1y)} ${f(px)} ${f(py)} ${f(px)} ${f(py)} C ${f(px)} ${f(py)} ${f(c2x)} ${f(c2y)} ${cx} ${cy}`);
  }
  for (let r = 12; r <= 45; r += 15)
    paths.push(`M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx + r - .01} ${cy}`);
  return paths;
}

function genMandala() {
  const paths = [], cx = 250, cy = 250;
  const sym = 6 + Math.floor(Math.random() * 4) * 2;
  const rings = 3 + Math.floor(Math.random() * 4);
  for (let ring = 1; ring <= rings; ring++) {
    const r = ring * 50;
    paths.push(`M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx + r - .01} ${cy}`);
    for (let s = 0; s < sym; s++) {
      const a = (s / sym) * 2 * Math.PI;
      paths.push(`M ${cx} ${cy} L ${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`);
      if (ring > 1) {
        const r1 = (ring - 1) * 50;
        const a2 = a + Math.PI / sym;
        paths.push(`M ${f(cx + r1 * Math.cos(a))} ${f(cy + r1 * Math.sin(a))} C ${f(cx + r * .8 * Math.cos(a2))} ${f(cy + r * .8 * Math.sin(a2))} ${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))} ${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`);
      }
    }
  }
  return paths;
}

function genConstellation() {
  const paths = [];
  const n = 10 + Math.floor(Math.random() * 10);
  const pts = Array.from({ length: n }, () => [65 + Math.random() * 370, 65 + Math.random() * 370]);
  for (let i = 0; i < n; i++) {
    const sorted = pts.map((p, j) => [j, Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1])]).filter(d => d[0] !== i).sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < Math.min(3, sorted.length); k++) {
      const j = sorted[k][0];
      if (j > i) paths.push(`M ${f(pts[i][0])} ${f(pts[i][1])} L ${f(pts[j][0])} ${f(pts[j][1])}`);
    }
  }
  pts.forEach(p => {
    const r = 4 + Math.random() * 8;
    paths.push(`M ${f(p[0] + r)} ${f(p[1])} A ${f(r)} ${f(r)} 0 1 1 ${f(p[0] + r - .01)} ${f(p[1])}`);
  });
  return paths;
}

function genPolygon() {
  const paths = [], cx = 250, cy = 250;
  const sides = 3 + Math.floor(Math.random() * 8);
  const layers = 4 + Math.floor(Math.random() * 4);
  const twist = Math.random() * 0.35;
  for (let l = 0; l < layers; l++) {
    const r = 25 + l * 46;
    const off = l * twist;
    const pts = Array.from({ length: sides + 1 }, (_, i) => {
      const a = (i / sides) * 2 * Math.PI - Math.PI / 2 + off;
      return `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
    });
    paths.push('M ' + pts.join(' L '));
    if (l === layers - 1 && sides >= 5) {
      for (let i = 0; i < sides; i++) {
        const a1 = (i / sides) * 2 * Math.PI - Math.PI / 2 + off;
        const a2 = ((i + Math.floor(sides / 2)) / sides) * 2 * Math.PI - Math.PI / 2 + off;
        paths.push(`M ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))} L ${f(cx + r * Math.cos(a2))} ${f(cy + r * Math.sin(a2))}`);
      }
    }
  }
  return paths;
}

function genAbstract() {
  const paths = [];
  const count = 8 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const y = 55 + (i / count) * 390;
    const amp = 20 + Math.random() * 55;
    const freq = 1 + Math.floor(Math.random() * 4);
    const pts = [];
    for (let x = 28; x <= 472; x += 18) {
      pts.push(`${f(x)} ${f(y + amp * Math.sin((x / 500) * freq * 2 * Math.PI + i))}`);
    }
    paths.push('M ' + pts.join(' L '));
  }
  return paths;
}

// ── UTILS ──
const f = n => n.toFixed(1);

function blobPoints(cx, cy, baseR, n) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    const r = baseR * (0.72 + Math.random() * 0.56);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function catmullRom(pts, closed = true) {
  const n = pts.length;
  const g = i => pts[(i + n) % n];
  let d = '';
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [g(i - 1), g(i), g(i + 1), g(i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6, cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6, cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    if (i === 0) d += `M ${f(p1[0])} ${f(p1[1])} `;
    d += `C ${f(cp1x)} ${f(cp1y)} ${f(cp2x)} ${f(cp2y)} ${f(p2[0])} ${f(p2[1])} `;
  }
  return (closed ? d + 'Z' : d).trim();
}
