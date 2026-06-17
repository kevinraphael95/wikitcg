'use strict';
/* ══════════════════════════════════════════
   WIKITCG — main.js
   Wiring : événements, thème, boutons
══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Bouton INVOQUER ── */
  document.getElementById('bGen').addEventListener('click', () => {
    const q = document.getElementById('q').value.trim();
    if (q) window._loadCardInternal(fetchWiki(q));
  });

  /* ── Entrée clavier ── */
  document.getElementById('q').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = document.getElementById('q').value.trim();
      if (q) window._loadCardInternal(fetchWiki(q));
    }
  });

  /* ── Aléatoire ── */
  document.getElementById('bRand').addEventListener('click', () => {
    window._loadCardInternal(fetchRandom());
  });

  /* ── Carte du jour ── */
  document.getElementById('bDaily').addEventListener('click', async () => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
    const cached = localStorage.getItem('wikitcg-daily-date');
    const cachedTitle = localStorage.getItem('wikitcg-daily-title');
    if (cached === String(seed) && cachedTitle) {
      window._loadCardInternal(fetchWiki(cachedTitle));
      return;
    }
    document.getElementById('emptyState').classList.add('hidden');
    setLoading(true);
    try {
      const data = await fetchRandom();
      localStorage.setItem('wikitcg-daily-date', String(seed));
      localStorage.setItem('wikitcg-daily-title', data.title);
      window._loadCardInternal(Promise.resolve(data));
    } catch(e) {
      showErr(e.message);
      setLoading(false);
    }
  });

  /* ── Clear champ ── */
  const qInput = document.getElementById('q');
  const qClear = document.getElementById('qClear');
  qClear.addEventListener('click', () => { qInput.value = ''; qInput.focus(); });

  /* ── Thème ── */
  const themeBtn = document.getElementById('themeBtn');
  const iconMoon = document.getElementById('icon-moon');
  const iconSun  = document.getElementById('icon-sun');
  const saved = localStorage.getItem('wikitcg-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  if (saved === 'light') { iconMoon.style.display = 'none'; iconSun.style.display = ''; }

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wikitcg-theme', next);
    iconMoon.style.display = next === 'dark' ? '' : 'none';
    iconSun.style.display  = next === 'light' ? '' : 'none';
  });
});
