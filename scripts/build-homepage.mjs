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
  fields.push(`why:${jsStringLiteral(p.why)}`);
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

  await fs.writeFile(INDEX_PATH, html, "utf8");
  console.log(`Selesai — ${products.length} produk dan ${categories.length} kategori dibakar ke dalam index.html.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
