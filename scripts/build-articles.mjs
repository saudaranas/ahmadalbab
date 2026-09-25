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

function formatInline(s) {
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/_(.+?)_/g, "<em>$1</em>");
  s = s.replace(/\[btn:([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="inline-btn">$1</a>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function paragraphs(text) {
  const rawLines = (text || "").split("\n");
  const items = [];
  let blankRun = 0, first = true;
  for (const raw of rawLines) {
    if (raw.trim() === "") { blankRun++; }
    else { items.push({ line: raw, gapBefore: first ? 0 : blankRun }); blankRun = 0; first = false; }
  }
  if (!items.length) return "<p>Kandungan penuh belum ditambah lagi.</p>";
  return items.map(({ line, gapBefore }) => {
    const extra = gapBefore > 1 ? (gapBefore - 1) * 18 : 0;
    const wrapStyle = extra ? ` style="margin-top:${extra}px;"` : "";
    const trimmed = line.trim();
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1], url = imgMatch[2];
      return `<div${wrapStyle}><figure class="body-img"><img src="${url}" alt="${esc(alt)}" loading="lazy">${alt ? `<figcaption>${esc(alt)}</figcaption>` : ""}</figure></div>`;
    }
    const vidMatch = trimmed.match(/^\[video:(https?:\/\/[^\s\]]+)\]$/);
    if (vidMatch) {
      const url = vidMatch[1];
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
      if (ytMatch) return `<div${wrapStyle}><div class="body-video"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div></div>`;
      return `<div${wrapStyle}><div class="body-video"><video controls src="${url}"></video></div></div>`;
    }
    if (trimmed.startsWith(">")) return `<div${wrapStyle}><blockquote>${formatInline(trimmed.slice(1).trim())}</blockquote></div>`;
    return `<div${wrapStyle}><p>${formatInline(line)}</p></div>`;
  }).join("");
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
    ? `<div style="background:#faf6ec;border-radius:14px;padding:16px 18px;margin-bottom:18px;"><p style="margin:0;font-size:13px;line-height:1.65;color:var(--n800);">${esc(item.excerpt)}</p></div>`
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
    <a href="../../" style="display:flex;align-items:center;gap:10px;">
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
      <a href="../../#langgan" style="display:inline-flex;align-items:center;height:38px;padding:0 16px;border-radius:999px;background:var(--accent);color:#fff;font-size:13px;font-weight:700;">Dapatkan Review Terkini</a>
    </div>
  </div>
</header>
<script>
document.getElementById("menuToggle").addEventListener("click", function(){
  document.getElementById("headerNav").classList.toggle("open");
});
function shareArticleStatic(title){
  const url = window.location.href;
  if(navigator.share){
    navigator.share({ title: title, url: url }).catch(function(){});
  } else {
    navigator.clipboard.writeText(url).then(function(){
      const label = document.getElementById("shareBtnLabelStatic");
      if(label){ const old = label.textContent; label.textContent = "Link Disalin!"; setTimeout(function(){ label.textContent = old; }, 1500); }
    }).catch(function(){});
  }
}
</script>

<main class="wrap">
  <nav aria-label="breadcrumb" class="breadcrumb wrap" style="padding-left:0;padding-right:0;">
    <ol style="display:flex;">
      <li><a href="../../">Laman Utama</a></li>
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
        <span>· Ditulis oleh ${esc(item.authorName || "Ahmad Albab")}</span>
      </div>
      ${figureHtml}
      ${excerptHtml}
      <div class="article-body">${paragraphs(item.body)}</div>
      ${item.ctaTarget === "Sembunyikan" ? "" :
        item.ctaTarget === "Produk Digital" ? `<div class="inline-cta">
        <div>
          <p>Nak tengok kelas/panduan digital yang kami syorkan?</p>
          <p style="font-weight:500;color:var(--accent-800);font-size:13px;margin-top:4px;">Senarai produk digital ada di laman utama.</p>
        </div>
        <a href="../../#digital">Lihat pilihan kami</a>
      </div>` : `<div class="inline-cta">
        <div>
          <p>Nak tengok produk yang kami sebut dalam artikel ni?</p>
          <p style="font-weight:500;color:var(--accent-800);font-size:13px;margin-top:4px;">Senarai pilihan kami ada di laman utama, lengkap dengan harga terkini.</p>
        </div>
        <a href="../../">Lihat pilihan kami</a>
      </div>`}
      ${item.authorBio ? `<div style="margin-top:24px;padding:18px;border:1px solid var(--n300);border-radius:14px;display:flex;gap:14px;align-items:flex-start;">
        ${item.authorImage ? `<div style="width:52px;height:52px;border-radius:999px;flex:none;background-image:url('${esc(item.authorImage)}');background-size:cover;background-position:center;"></div>` : ""}
        <div>
          <p style="margin:0 0 4px;font-weight:700;font-size:14px;">${esc(item.authorName || "Ahmad Albab")}</p>
          <p style="margin:0;font-size:13px;color:var(--n700);line-height:1.55;">${esc(item.authorBio)}</p>
          ${item.authorLink ? `<a href="${esc(item.authorLink)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:var(--accent-700);">Ikuti ${esc(item.authorName || "saya")} →</a>` : ""}
        </div>
      </div>` : ""}
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--n200);text-align:center;">
        <button type="button" onclick="shareArticleStatic('${esc(item.title)}')" style="display:inline-flex;align-items:center;gap:8px;height:46px;padding:0 22px;border-radius:999px;border:1px solid var(--n300);background:#fff;font-family:inherit;font-size:14px;font-weight:700;color:var(--text);cursor:pointer;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg>
          <span id="shareBtnLabelStatic">Kongsi Artikel</span>
        </button>
      </div>
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
  <div class="wrap">
    <div class="footer-row">
      <div class="footer-brand-col">
        <a href="../../" style="display:flex;align-items:center;gap:9px;">
          <img src="../../favicon.svg" alt="Logo Ahmad Albab" width="30" height="30" style="display:block;width:30px;height:30px;flex:none;border-radius:8px;">
          <span class="wordmark-footer">ahmadalbab<span style="color:var(--accent);">.</span></span>
        </a>
        <p style="margin:10px 0 0;color:var(--n700);">Review Produk Shopee &amp; Tiktok Untuk Anda!</p>
      </div>
      <div>
        <p class="footer-col-title">Store</p>
        <nav aria-label="Navigasi footer" class="footer-links">
          <a href="../../">Produk terlaris</a>
          <a href="../../#digital">Produk digital</a>
          <a href="../">Semua artikel</a>
        </nav>
      </div>
      <div>
        <p class="footer-col-title">Alat Percuma</p>
        <div class="footer-links"><a href="../../alat/pendekkan-link/">Pendekkan Link</a></div>
      </div>
      <div>
        <p class="footer-col-title">Hubungi</p>
        <div class="footer-links">
          <a href="mailto:hello@ahmadalbab.store">hello@ahmadalbab.store</a>
        </div>
      </div>
    </div>
    <div class="footer-legal">
      <span>© ${year} ahmadalbab. Hak Cipta Terpelihara.</span>
      <span>No. Pendaftaran SSM: 202603001066 (CT0159040-U)</span>
    </div>
  </div>
</footer>

</body>
</html>
`;
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
  console.log("Fetching articles from backend…");
  const data = await fetchJsonRetry(`${API_URL}?action=getContent&type=review`);
  const items = (data.items || []).filter((x) => x.slug);

  if (!items.length) {
    console.log("Tiada artikel dengan slug dijumpai. Tiada apa nak dijana.");
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const currentSlugs = new Set(items.map((x) => x.slug));
  const existingFolders = await fs.readdir(OUT_DIR, { withFileTypes: true }).catch(() => []);
  for (const entry of existingFolders) {
    if (entry.isDirectory() && !currentSlugs.has(entry.name)) {
      await fs.rm(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
      console.log("Dibuang (artikel dah dipadam):", entry.name);
    }
  }

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
