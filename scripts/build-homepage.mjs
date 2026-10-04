// scripts/build-homepage.mjs
// Tarik produk terkini dari backend, "bakar" masuk ke dalam array DEMO
// di index.html — supaya fallback yang pelawat nampak sebelum fetch
// live siap adalah produk SEBENAR, bukan demo generik lapuk.
//
// Jalan: node scripts/build-homepage.mjs
// Perlukan Node 18+ (guna fetch terbina dalam).

import fs from "node:fs/promises";

const API_URL = "https://script.google.com/macros/s/AKfycbx0d9SD9yEU8_KwP1R5TbXiPfSnXOEaOIVE20qA4J6peoXtRwR87ox9bTWtPAiqz3eY8A/exec";
const INDEX_PATH = "index.html";
const START_MARKER = "// SEED:PRODUCTS:START — jangan edit manual, dikemas kini automatik oleh GitHub Action";
const END_MARKER = "// SEED:PRODUCTS:END";
const CATS_START_MARKER = "// SEED:CATEGORIES:START — jangan edit manual, dikemas kini automatik oleh GitHub Action";
const CATS_END_MARKER = "// SEED:CATEGORIES:END";
const DIGITAL_START = "// SEED:DIGITAL:START — jangan edit manual, dikemas kini automatik oleh GitHub Action";
const DIGITAL_END = "// SEED:DIGITAL:END";
const HERO_START = "// SEED:HERO:START — jangan edit manual, dikemas kini automatik oleh GitHub Action";
const HERO_END = "// SEED:HERO:END";

function replaceBlock(html, start, end, body, label) {
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a === -1 || b === -1 || b < a) {
    console.error(`Tidak jumpa penanda ${label} dalam index.html. Kekalkan macam sedia ada.`);
    return html;
  }
  return html.slice(0, a) + start + "\n" + body + html.slice(b);
}

async function fetchContent(type) {
  try {
    const d = await fetchJsonRetry(`${API_URL}?action=getContent&type=${type}`);
    return (d && d.success && d.items) ? d.items : [];
  } catch (e) {
    console.error(`Gagal ambil ${type}:`, e.message);
    return [];
  }
}

function jsStringLiteral(s) {
  return JSON.stringify(String(s ?? ""));
}

function productToJs(p) {
  const fields = [
    `id:${jsStringLiteral(p.id)}`,
    `title:${jsStringLiteral(p.title)}`,
    `price:${Number(p.price) || 0}`,
  ];
  if (p.old) fields.push(`old:${Number(p.old) || 0}`);
  fields.push(`platform:${jsStringLiteral(p.platform)}`);
  fields.push(`category:${jsStringLiteral(p.category)}`);
  fields.push(`sold:${Number(p.sold) || 0}`);
  if (p.hot) fields.push(`hot:true`);
  if (p.imageUrl) fields.push(`imageUrl:${jsStringLiteral(p.imageUrl)}`);
  if (p.affiliateLink) fields.push(`link:${jsStringLiteral(p.affiliateLink)}`);
  return `  { ${fields.join(", ")} }`;
}

function catToJs(c) {
  return `  { key:${jsStringLiteral(c.key)}, name:${jsStringLiteral(c.name)} }`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonRetry(url, attempts = 5) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ms;q=0.8",
    "Referer": "https://ahmadalbab.store/",
  };
  let lastStatus = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
      lastStatus = res.status;
    } catch (err) {
      lastStatus = err.message;
    }
    if (i < attempts - 1) {
      console.log(`Percubaan ${i + 1} gagal (${lastStatus}). Cuba lagi dalam 3 saat…`);
      await sleep(3000);
    }
  }
  throw new Error(`Backend gagal selepas ${attempts} percubaan (status terakhir: ${lastStatus}).`);
}

async function main() {
  console.log("Fetching products from backend…");
  const data = await fetchJsonRetry(`${API_URL}?action=getData`);
  const products = (data.products || []).filter((p) => p.title);
  const uniqueCatNames = [];
  products.forEach((p) => { if (p.category && uniqueCatNames.indexOf(p.category) === -1) uniqueCatNames.push(p.category); });
  const categories = uniqueCatNames.sort().map((name) => ({ key: name, name }));

  if (!products.length) {
    console.log("Tiada produk dijumpai dari backend. Kekalkan index.html macam sedia ada.");
    return;
  }

  let html = await fs.readFile(INDEX_PATH, "utf8");
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error("Tidak jumpa penanda SEED:PRODUCTS dalam index.html. Berhenti tanpa ubah apa-apa.");
    process.exit(1);
  }

  const newBlock =
    START_MARKER + "\n" +
    "const DEMO = [\n" +
    products.map(productToJs).join(",\n") + "\n" +
    "];\n";

  html = html.slice(0, startIdx) + newBlock + html.slice(endIdx);

  if (categories.length) {
    const catsStartIdx = html.indexOf(CATS_START_MARKER);
    const catsEndIdx = html.indexOf(CATS_END_MARKER);
    if (catsStartIdx === -1 || catsEndIdx === -1 || catsEndIdx < catsStartIdx) {
      console.error("Tidak jumpa penanda SEED:CATEGORIES dalam index.html. Kekalkan kategori macam sedia ada.");
    } else {
      const newCatsBlock =
        CATS_START_MARKER + "\n" +
        "const DEMO_CATS = [\n" +
        categories.map(catToJs).join(",\n") + "\n" +
        "];\n";
      html = html.slice(0, catsStartIdx) + newCatsBlock + html.slice(catsEndIdx);
    }
  }

  const heroItems = await fetchContent("hero");
  if (heroItems.length) {
    const heroJs = heroItems.map((h) => `  { kicker:${jsStringLiteral(h.kicker)}, title:${jsStringLiteral(h.title)}, excerpt:${jsStringLiteral(h.excerpt)}, readTime:${jsStringLiteral(h.readTime)}, cta:${jsStringLiteral(h.cta || "Baca sebelum beli")}, href:${jsStringLiteral(h.href || "#produk")}, image:${jsStringLiteral(h.image)} }`).join(",\n");
    html = replaceBlock(html, HERO_START, HERO_END, "let ARTICLES = [\n" + heroJs + "\n];\n", "SEED:HERO");
  }

  const digitalItems = await fetchContent("digital");
  if (digitalItems.length) {
    const digJs = digitalItems.map((g) => {
      const points = String(g.points || "").split("\n").filter(Boolean);
      return `  { brand:${jsStringLiteral(g.brand)}, kicker:${jsStringLiteral(g.kicker)}, title:${jsStringLiteral(g.title)}, desc:${jsStringLiteral(g.desc)}, points:${JSON.stringify(points)}, price:${jsStringLiteral(g.price)}, old:${jsStringLiteral(g.old)}, badge:${jsStringLiteral(g.badge)}, cta:${jsStringLiteral(g.cta || "Lihat tawaran")}, link:${jsStringLiteral(g.link || "#")}, image:${jsStringLiteral(g.image)} }`;
    }).join(",\n");
    html = replaceBlock(html, DIGITAL_START, DIGITAL_END, "let DIGITAL = [\n" + digJs + "\n];\n", "SEED:DIGITAL");
  }

  await fs.writeFile(INDEX_PATH, html, "utf8");
  console.log(`Selesai — ${products.length} produk, ${categories.length} kategori, ${heroItems.length} slaid hero dan ${digitalItems.length} produk digital dibakar ke dalam index.html.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
