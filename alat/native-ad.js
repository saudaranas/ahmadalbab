/* Native ad berputar — ahmadalbab.store
   Guna: <div data-native-ad></div> + <script src="../native-ad.js" defer></script>
   Tukar iklan setiap 10 saat, gilir Shopee → TikTok → Produk digital.
   Berhenti sementara bila tak kelihatan di skrin, tab disorok, atau jari sedang menyentuh. */
(function(){
  const API_URL = "https://script.google.com/macros/s/AKfycbx0d9SD9yEU8_KwP1R5TbXiPfSnXOEaOIVE20qA4J6peoXtRwR87ox9bTWtPAiqz3eY8A/exec";
  const INTERVAL = 10000;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const css = `
  .na{position:relative;display:block;background:#fff;border:1px solid #d6d4d4;border-radius:16px;padding:12px;text-decoration:none;color:#201e1d;overflow:hidden;}
  .na-inner{display:flex;gap:12px;align-items:center;transition:opacity .35s ease;}
  .na-inner.fade{opacity:0;}
  .na-img{flex:none;width:84px;height:84px;border-radius:12px;background:#eceaea center/cover no-repeat;}
  .na-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}
  .na-meta{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#6b6767;}
  .na-tag{padding:1px 7px;border-radius:999px;background:#eceaea;color:#3b3837;}
  .na-src{display:inline-flex;align-items:center;gap:4px;}
  .na-dot{width:7px;height:7px;border-radius:999px;background:#ee4d2d;}
  .na-dot.tiktok{background:#201e1d;}
  .na-dot.digital{background:#b8250e;}
  .na-title{font-size:13.5px;font-weight:700;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  .na-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px;}
  .na-price{font-size:14px;font-weight:800;color:#b8250e;}
  .na-price s{margin-left:5px;font-size:11.5px;font-weight:600;color:#9a9696;}
  .na-cta{flex:none;height:30px;padding:0 12px;border-radius:999px;background:#ec3013;color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;}
  .na-dots{position:absolute;right:12px;top:12px;display:flex;gap:3px;}
  .na-dots i{width:5px;height:5px;border-radius:999px;background:#d6d4d4;}
  .na-dots i.on{background:#ec3013;}
  .na-bar{position:absolute;left:0;bottom:0;height:2px;background:#ec3013;width:0;}
  .na-bar.run{animation:naBar ${INTERVAL}ms linear forwards;}
  .na-bar.hold{animation-play-state:paused;}
  @keyframes naBar{to{width:100%;}}
  @media(prefers-reduced-motion:reduce){ .na-inner{transition:none;} .na-bar{display:none;} }`;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  function load(k){ try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(e){ return null; } }
  function save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function niceTitle(s){
    s = String(s||""); const L = s.replace(/[^a-zA-Z]/g,"");
    if(L.length < 3 || (L.match(/[A-Z]/g)||[]).length / L.length < .7) return s;
    return s.toLowerCase().replace(/(^|[\s([\/-])([a-z])/g, (m,p,c) => p + c.toUpperCase());
  }
  function money(v){ const n = parseFloat(String(v).replace(/[^0-9.]/g,"")); return isNaN(n) ? String(v||"") : "RM" + n.toFixed(2); }
  function track(id, kind, label){
    try{ fetch(API_URL + "?action=trackClick&id=" + encodeURIComponent(id) + "&kind=" + encodeURIComponent(kind) + "&label=" + encodeURIComponent(label||""), { mode:"no-cors" }); }catch(e){}
  }

  // ---- normalise data into one ad shape ----
  function fromProducts(list){
    return (list||[]).filter(p => p && p.title && (p.link || p.affiliateLink) && (p.imageUrl || p.image)).map(p => {
      const plat = String(p.platform||"").toLowerCase() === "tiktok" ? "tiktok" : "shopee";
      const price = parseFloat(p.price)||0, old = parseFloat(p.old)||0;
      return { id:p.id, kind:plat, title:niceTitle(p.title), image:p.imageUrl || p.image, link:p.link || p.affiliateLink,
        price: money(price), old: old > price ? money(old) : "", src: plat === "tiktok" ? "TikTok Shop" : "Shopee",
        cta: plat === "tiktok" ? "Lihat di TikTok" : "Lihat di Shopee" };
    });
  }
  function fromDigital(list){
    return (list||[]).filter(d => d && d.link && d.link !== "#" && (d.title || d.brand)).map(d => ({
      id: "digital-" + (d.brand || d.title), kind:"digital", title: d.title || d.brand, image: d.image || "", link: d.link,
      price: d.price || "", old: d.old || "", src: (d.brand || "Produk digital").split("·")[0].trim(), cta: "Lihat tawaran"
    }));
  }
  // gilir: shopee, tiktok, digital, shopee, tiktok, digital…
  function interleave(groups){
    const out = [], g = groups.map(x => shuffle(x.slice())), max = Math.max(0, ...g.map(x => x.length));
    for(let i=0;i<max;i++) g.forEach(x => { if(x[i]) out.push(x[i]); });
    return out;
  }
  function buildAds(products, digital){
    const p = fromProducts(products), d = fromDigital(digital);
    return interleave([p.filter(a => a.kind === "shopee"), p.filter(a => a.kind === "tiktok"), d]).slice(0, 12);
  }

  // ---- widget ----
  function Widget(host){
    this.host = host; this.ads = []; this.i = 0; this.timer = null; this.visible = true; this.held = false;
    host.innerHTML = `<a class="na" target="_blank" rel="noopener nofollow sponsored" aria-label="Iklan produk pilihan">
      <div class="na-inner"></div><div class="na-dots"></div><div class="na-bar"></div></a>`;
    this.a = host.querySelector(".na"); this.inner = host.querySelector(".na-inner");
    this.dots = host.querySelector(".na-dots"); this.bar = host.querySelector(".na-bar");
    this.a.addEventListener("click", () => { const ad = this.ads[this.i]; if(ad) track(ad.id, ad.kind, ad.title); });
    const hold = v => () => { this.held = v; this.syncBar(); };
    this.a.addEventListener("touchstart", hold(true), { passive:true });
    this.a.addEventListener("touchend", hold(false));
    this.a.addEventListener("mouseenter", hold(true));
    this.a.addEventListener("mouseleave", hold(false));
    if("IntersectionObserver" in window){
      new IntersectionObserver(es => { this.visible = es[0].isIntersecting; this.syncBar(); }, { threshold:.4 }).observe(host);
    }
    document.addEventListener("visibilitychange", () => this.syncBar());
  }
  Widget.prototype.setAds = function(ads){
    if(!ads.length){ this.host.style.display = "none"; return; }
    this.host.style.display = "";
    this.ads = ads; this.i = 0; this.paint(false); this.start();
  };
  Widget.prototype.active = function(){ return this.visible && !this.held && document.visibilityState === "visible"; };
  Widget.prototype.syncBar = function(){ this.bar.classList.toggle("hold", !this.active()); };
  Widget.prototype.paint = function(animate){
    const ad = this.ads[this.i];
    const draw = () => {
      this.a.href = ad.link;
      this.inner.innerHTML = `
        <div class="na-img" style="${ad.image ? `background-image:url('${esc(ad.image)}')` : ""}"></div>
        <div class="na-body">
          <div class="na-meta"><span class="na-tag">Iklan</span><span class="na-src"><span class="na-dot ${ad.kind}"></span>${esc(ad.src)}</span></div>
          <div class="na-title">${esc(ad.title)}</div>
          <div class="na-row">
            <span class="na-price">${esc(ad.price)}${ad.old ? `<s>${esc(ad.old)}</s>` : ""}</span>
            <span class="na-cta">${esc(ad.cta)}</span>
          </div>
        </div>`;
      this.dots.innerHTML = this.ads.length > 1 ? this.ads.map((_,k) => `<i class="${k===this.i?'on':''}"></i>`).join("") : "";
      this.inner.classList.remove("fade");
      this.bar.classList.remove("run"); void this.bar.offsetWidth;
      if(this.ads.length > 1) this.bar.classList.add("run");
      this.syncBar();
    };
    if(animate && !reduceMotion){ this.inner.classList.add("fade"); setTimeout(draw, 350); } else draw();
  };
  Widget.prototype.start = function(){
    clearInterval(this.timer);
    if(this.ads.length < 2) return;
    let waited = 0;
    this.timer = setInterval(() => {
      if(!this.active()) return;          // masa hanya dikira bila iklan kelihatan
      waited += 500;
      if(waited >= INTERVAL){ waited = 0; this.i = (this.i + 1) % this.ads.length; this.paint(true); }
    }, 500);
  };

  // ---- boot ----
  function boot(){
    const hosts = Array.from(document.querySelectorAll("[data-native-ad]"));
    if(!hosts.length) return;
    const widgets = hosts.map(h => new Widget(h));
    let products = load("aab_products_v1") || [], digital = load("aab_digital_v1") || [];
    const apply = () => { const ads = buildAds(products, digital); widgets.forEach(w => w.setAds(ads.slice())); };
    if(products.length || digital.length) apply(); else hosts.forEach(h => h.style.display = "none");

    let pending = 2, changed = false;
    const done = () => { if(--pending === 0 && changed) apply(); };
    fetch(API_URL + "?action=getData").then(r => r.json()).then(d => {
      if(d && d.success && (d.products||[]).length){
        products = d.products.map(p => ({ id:p.id, title:p.title, price:parseFloat(p.price)||0, old:parseFloat(p.old)||0, platform:p.platform, category:p.category, imageUrl:p.imageUrl, link:p.affiliateLink, hot:p.hot, sold:p.sold }));
        save("aab_products_v1", products); changed = true;
      }
    }).catch(()=>{}).finally(done);
    fetch(API_URL + "?action=getContent&type=digital").then(r => r.json()).then(d => {
      if(d && d.success && (d.items||[]).length){
        digital = d.items.map(g => ({ brand:g.brand||"", kicker:g.kicker||"", title:g.title||"", desc:g.desc||"", price:g.price||"", old:g.old||"", badge:g.badge||"", cta:g.cta||"Lihat tawaran", points:String(g.points||"").split("\n").filter(Boolean), link:g.link||"#", image:g.image||"" }));
        save("aab_digital_v1", digital); changed = true;
      }
    }).catch(()=>{}).finally(done);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
