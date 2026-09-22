// scripts/build-articles.mjs
// Jana fail statik /artikel/{slug}/index.html untuk setiap Post Review,
// supaya og:title / og:image betul-betul wujud dalam HTML (bukan diselit JS)
// untuk crawler WhatsApp/Facebook/Telegram semasa link dikongsi.
//
// Jalan: node scripts/build-articles.mjs
// Perlukan Node 18+ (guna fetch terbina dalam).

import fs from "node:fs/promises";
import path from "node:path";

const API_URL = "https://script.google.com/macros/s/AKfycbx0d9SD9yEU8_KwP1R5TbXiPfSnXOEaOIVE20qA4J6peoXtRwR87ox9bTWtPAiqz3eY8A/exec";
const SITE_URL = "https://ahmadalbab.store";
const OUT_DIR = "artikel";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text) {
  const parts = (text || "").split(/\n+/).filter((p) => p.trim());
  return parts.length ? parts.map((p) => `<p>${esc(p)}</p>`).join("") : "<p>Kandungan penuh belum ditambah lagi.</p>";
}

function absoluteImage(image) {
  if (!image) return `${SITE_URL}/og-cover.png`;
  return image.startsWith("http") ? image : `${SITE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

function renderArticleHtml(item, others) {
  const title = `${item.title} — Ahmad Albab`;
  const desc = item.excerpt || item.title;
  const canonical = `${SITE_URL}/artikel/${item.slug}/`;
  const image = absoluteImage(item.image);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: item.title,
        description: item.excerpt || "",
        image,
        author: { "@type": "Organization", name: "Ahmad Albab" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Laman Utama", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Artikel", item: `${SITE_URL}/artikel/` },
          { "@type": "ListItem", position: 3, name: item.title },
        ],
      },
    ],
  };

  const figureHtml = item.image
    ? `<figure><img src="${esc(item.image)}" alt="${esc(item.title)}" width="1200" height="675"><figcaption>${esc(item.title)}</figcaption></figure>`
    : `<figure><div style="width:100%;aspect-ratio:16/9;border-radius:14px;background:var(--n200);display:flex;align-items:center;justify-content:center;color:var(--n700);font-size:13px;font-weight:600;">Gambar utama artikel (1200×675)</div></figure>`;

  const excerptHtml = item.excerpt
    ? `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--n700);">Ringkasan</p><p class="lede">${esc(item.excerpt)}</p>`
    : "";

  const recentHtml = others.length
    ? others.map((r) => `<a href="../${esc(r.slug)}/">${esc(r.title)}<span>${esc(r.readTime || "")}</span></a>`).join("")
    : `<span style="font-size:13px;color:var(--n700);">Belum ada artikel lain.</span>`;

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Ahmad Albab">
<meta property="og:locale" content="ms_MY">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">
<meta name="theme-color" content="#ec3013">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="icon" href="../../favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="../../apple-touch-icon.png">
<link rel="manifest" href="../../manifest.webmanifest">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css">
</head>
<body>

<header>
  <div class="header-inner">
    <a href="../../index.html" style="display:flex;align-items:center;gap:10px;">
      <img src="../../favicon.svg" alt="Logo Ahmad Albab" width="40" height="40" style="display:block;width:40px;height:40px;flex:none;border-radius:11px;">
      <span style="display:flex;flex-direction:column;gap:3px;">
        <span class="wordmark">ahmadalbab<span style="color:var(--accent);">.</span></span>
        <span style="font-size:11.5px;font-weight:500;color:var(--n700);">Review Produk Shopee &amp; Tiktok Untuk Anda!</span>
      </span>
    </a>
    <button type="button" class="hamburger-btn" id="menuToggle" aria-label="Buka menu">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
    </button>
    <div id="headerNav">
      <a href="../" class="back-store">Semua artikel</a>
      <a href="../../index.html#langgan" style="display:inline-flex;align-items:center;height:38px;padding:0 16px;border-radius:999px;background:var(--accent);color:#fff;font-size:13px;font-weight:700;">Dapatkan Review Terkini</a>
    </div>
  </div>
</header>
<script>
document.getElementById("menuToggle").addEventListener("click", function(){
  document.getElementById("headerNav").classList.toggle("open");
});
</script>

<main class="wrap">
  <nav aria-label="breadcrumb" class="breadcrumb wrap" style="padding-left:0;padding-right:0;">
    <ol style="display:flex;">
      <li><a href="../../index.html">Laman Utama</a></li>
      <li aria-hidden="true">/</li>
      <li><a href="../">Artikel</a></li>
      <li aria-hidden="true">/</li>
      <li><span aria-current="page">${esc(item.title)}</span></li>
    </ol>
  </nav>
  <div class="body-grid">
    <article class="article-card">
      <h1>${esc(item.title)}</h1>
      <div class="article-meta">
        <span class="pill">${esc(item.tag || "Panduan")}</span>
        <span>${esc(item.readTime || "")}</span>
        <span>· Ditulis oleh Ahmad Albab</span>
      </div>
      ${figureHtml}
      ${excerptHtml}
      <div class="article-body">${paragraphs(item.body)}</div>
      <div class="inline-cta">
        <div>
          <p>Nak tengok produk yang kami sebut dalam artikel ni?</p>
          <p style="font-weight:500;color:var(--accent-800);font-size:13px;margin-top:4px;">Senarai pilihan kami ada di laman utama, lengkap dengan harga terkini.</p>
        </div>
        <a href="../../index.html#produk">Lihat pilihan kami</a>
      </div>
      <p class="disclosure">Nota: kami tidak menguji setiap produk secara peribadi. Ulasan ini berdasarkan spesifikasi penjual, rating dan ulasan pembeli sebenar di Shopee dan TikTok Shop. Sesetengah link adalah link affiliate.</p>
    </article>
    <aside>
      <div class="side-card">
        <h2>Cari Artikel</h2>
        <form action="../" method="get" role="search" style="display:flex;align-items:center;gap:10px;border:1px solid var(--n300);border-radius:999px;padding:0 8px 0 14px;height:46px;background:var(--bg);">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" style="flex:none;color:var(--n700);"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          <input type="search" name="q" aria-label="Cari artikel" placeholder="Cari tajuk atau topik…" style="flex:1;min-width:0;border:0;outline:none;background:transparent;font-family:inherit;font-size:15px;color:var(--text);height:42px;">
          <button type="submit" aria-label="Cari" style="flex:none;width:34px;height:34px;border:0;border-radius:999px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
          </button>
        </form>
      </div>
      <div class="side-card">
        <h2>Artikel Terkini</h2>
        <p style="margin-bottom:10px;">Ulasan lain yang mungkin berguna.</p>
        <div class="recent-list">${recentHtml}</div>
        <a class="outline-link" href="../">Semua artikel</a>
      </div>
    </aside>
  </div>
</main>

<footer>
  <div class="wrap footer-row">
    <div class="footer-meta">
      <p style="margin:0;">© ${year} <a href="../../index.html" style="color:var(--accent-700);font-weight:600;">ahmadalbab</a>. Hak Cipta Terpelihara.</p>
      <p style="margin:0;">No. Pendaftaran SSM: 202603001066 (CT0159040-U)</p>
    </div>
    <nav aria-label="Navigasi footer" class="footer-links">
      <a href="../../index.html#produk">Produk terlaris</a>
      <a href="../../index.html#digital">Produk digital</a>
      <a href="../">Semua artikel</a>
    </nav>
  </div>
</footer>

</body>
</html>
`;
}

async function main() {
  console.log("Fetching articles from backend…");
  const res = await fetch(`${API_URL}?action=getContent&type=review`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ms;q=0.8",
      "Referer": "https://ahmadalbab.store/",
    },
  });
  if (!res.ok) {
    console.error(`Backend returned HTTP ${res.status}. Berhenti tanpa jana apa-apa.`);
    process.exit(1);
  }
  const data = await res.json();
  const items = (data.items || []).filter((x) => x.slug);

  if (!items.length) {
    console.log("Tiada artikel dengan slug dijumpai. Tiada apa nak dijana.");
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const item of items) {
    const others = items.filter((x) => x.slug !== item.slug).slice(0, 5);
    const html = renderArticleHtml(item, others);
    const dir = path.join(OUT_DIR, item.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), html, "utf8");
    console.log("Generated:", path.join(dir, "index.html"));
  }

  console.log(`Selesai — ${items.length} halaman artikel dijana.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
