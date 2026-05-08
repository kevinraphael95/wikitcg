// wiki.js — Accès à l'API Wikipedia (fr)

const BASE = 'https://fr.wikipedia.org/w/api.php';

export async function searchWiki(query) {
  const url = `${BASE}?action=opensearch&search=${encodeURIComponent(query)}&limit=6&namespace=0&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  return data[1] || [];
}

export async function fetchWikiRandom() {
  const url = `${BASE}?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const title = data.query.random[0].title;
  return fetchWikiByTitle(title);
}

export async function fetchWikiByTitle(title) {
  const url = `${BASE}?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro&explaintext&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query.pages;
  const page = pages[Object.keys(pages)[0]];
  return {
    title: page.title,
    text: page.extract || '',
    pageId: page.pageid,
  };
}
