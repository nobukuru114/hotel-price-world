// index.html の DATA を正本として、都市別ページ・国別ページ・sitemap.xml を各言語ぶん生成する。
// 使い方: node tools/build-pages.js
// 文言は tools/i18n/pages.js（言語を足すときはそこにキーを1つ増やす）。
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const BASE = "https://nobukuru114.github.io/hotel-price-world";
const CAPTURED = "2026-09-21", BUILT = new Date().toISOString().slice(0,10);
const LANGS = require("./i18n/pages.js");           // { ja, en, ... }
const LKEYS = Object.keys(LANGS);
const XDEFAULT = "en";                              // hreflang x-default に使う言語

// ---- index.html から正本データを抽出 -------------------------------------
const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const pick = (marker) => {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("not found: " + marker);
  const s = src.indexOf(marker.endsWith("[") ? "[" : "{", i);
  let depth = 0, j = s;
  const open = src[s], close = open === "[" ? "]" : "}";
  for (; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close && --depth === 0) break;
  }
  return JSON.parse(src.slice(s, j + 1));
};
const DATA = pick("const DATA = [");
const CJ   = pick("const CJ = {");

// ---- 共通ヘルパ -----------------------------------------------------------
const MORDER = [3,4,5,6,7,8,9,10,11,0,1,2];              // 表示順(1月→12月) → データ添字
const YEAR   = i => (i <= 8 ? 2027 : 2026);              // 1〜9月=2027, 10〜12月=2026
const BANDS = [
  {max:5000,   c:"var(--b1)"}, {max:10000, c:"var(--b2)"}, {max:15000, c:"var(--b3)"},
  {max:20000,  c:"var(--b4)"}, {max:30000, c:"var(--b5)"}, {max:Infinity, c:"var(--b6)"}
];
const bandOf = v => BANDS.findIndex(b => v <= b.max);   // index.html と同じ判定（上限を含む）
const esc  = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const yen  = n => "¥" + Number(n).toLocaleString("ja-JP");
const money = n => `<span class="jpy" data-jpy="${Number(n)}">${yen(n)}</span>`;   // 本文用（ブラウザ側で表示通貨に換算）
const enc  = encodeURIComponent;
const RATES = (() => { const m = src.match(/^const RATES = (.*);$/m); if(!m) throw new Error("RATES not found in index.html"); return JSON.parse(m[1]); })();
const CURS_JA = (() => { const m = src.match(/^const CURS = (.*);$/m); if(!m) throw new Error("CURS not found"); return eval("(" + m[1] + ")"); })();   // キーが無引用符なので eval
const CUR_NAMES = { ja: null, en: require("./i18n/en.js").currencyNames };
const cursFor = key => {
  const names = CUR_NAMES[key];
  if(!names) return CURS_JA;
  return Object.fromEntries(Object.entries(CURS_JA).map(([k,v]) => [k, [v[0], names[k] || k]]));
};

const mapUrl = d => "https://www.google.com/maps/search/?api=1&query=" + enc(d.name + ", " + d.c);
const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

// Booking.com の絞り込み。掲載数 cnt と緯度 lat で3段階に自動調整する。
// 全条件を一律に付けると寒冷地（エアコン非設置）や小規模都市で0件になるため（2026-09-23 実測）。
//   共通      : 4つ星＋5つ星／口コミ8.0以上／朝食付き／ホテル／中心から3km以内
//   cnt >= 30 : ＋無料Wi-Fi ＋専用バスルーム ＋ダブルベッド（|lat| < 40 のときは ＋エアコン）
//   cnt >= 100: ＋フィットネス ＋眺望
function bookFilters(d, L){
  const f = ["class=4","class=5","ht_id=204","review_score=80","mealplan=1","distance=3000"];
  const l = L.bk.base.slice();
  const cnt = d && d.cnt != null ? d.cnt : 0, lat = d && d.lat != null ? Math.abs(d.lat) : 0;
  if(cnt >= 30){ f.push("hotelfacility=107","roomfacility=38","tdb=3"); l.push(...L.bk.mid);
    if(lat < 40){ f.push("roomfacility=11"); l.push(L.bk.ac); } }
  if(cnt >= 100){ f.push("hotelfacility=11","roomfacility=81"); l.push(...L.bk.top); }
  return { nflt: f.join(";"), label: l.join(L.bk.sep) };
}
const bookUrl = (d, L) => "https://www.booking.com/" + L.booking + "?ss=" + enc(d.name + ", " + d.c)
  + "&group_adults=1&no_rooms=1&group_children=0&selected_currency=" + L.defCur + "&nflt=" + enc(bookFilters(d, L).nflt);

// ---- 派生値 ---------------------------------------------------------------
const byMed = DATA.slice().sort((a,b) => a.med - b.med);
byMed.forEach((d,i) => { d.__rank = i + 1; });
const byCountry = {};
DATA.forEach(d => (byCountry[d.c] = byCountry[d.c] || []).push(d));
Object.values(byCountry).forEach(list => {
  list.sort((a,b) => a.med - b.med);
  list.forEach((d,i) => { d.__crank = i + 1; });
});
const seen = {};
DATA.forEach(d => { const s = slugify(d.name); (seen[s] = seen[s] || []).push(d); });
DATA.forEach(d => { const s = slugify(d.name); d.__slug = seen[s].length > 1 ? s + "-" + slugify(d.c) : s; });

const median = a => { const v = a.slice().sort((x,y)=>x-y); const n = v.length;
  return n % 2 ? v[(n-1)/2] : Math.round((v[n/2-1] + v[n/2]) / 2); };
const COUNTRIES = Object.entries(byCountry).map(([c, list]) => {
  const mid = median(list.map(d => d.med));
  const months = MORDER.map((s) => { const vs = list.map(d => d.m[s]).filter(v => v != null); return vs.length ? median(vs) : null; });
  return { c, list, mid, months, slug: slugify(c), ja: (CJ[c] ? CJ[c].ja : c), flag: (CJ[c] ? CJ[c].f : "") };
});
COUNTRIES.sort((a,b) => a.mid - b.mid).forEach((k,i) => { k.rank = i + 1; });
const CMAP = Object.fromEntries(COUNTRIES.map(k => [k.c, k]));

// ---- ページ共通の断片 -----------------------------------------------------
const keyOf = L => LKEYS.find(k => LANGS[k] === L);
function head(L, { title, desc, url, altPath, type, jsonld, up }) {
  const alts = LKEYS.map(k => `<link rel="alternate" hreflang="${LANGS[k].htmlLang}" href="${BASE}/${LANGS[k].dir}${altPath}">`).join("\n")
    + `\n<link rel="alternate" hreflang="x-default" href="${BASE}/${LANGS[XDEFAULT].dir}${altPath}">`;
  return `<!DOCTYPE html><html lang="${L.htmlLang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${alts}
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${L.locale}">
<meta property="og:site_name" content="${esc(L.siteName)}">
<meta property="og:image" content="${BASE}/og/${keyOf(L)}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(L.og.alt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${up}favicon.svg">
<link rel="stylesheet" href="${up}page.css">
<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body>`;
}
function topbar(L, otherHref) {
  const other = LKEYS.filter(k => k !== keyOf(L)).map(k =>
    `<a class="tl lang" href="${otherHref(k)}" hreflang="${LANGS[k].htmlLang}">${LANGS[k].label}</a>`).join("");
  return `<nav class="topbar"><div class="tbwrap"><a class="brand" href="../"><i>¥</i>Hotel Price World</a><a class="tl" href="../#sec-rank">${esc(L.navRank)}</a><a class="tl" href="../#sec-country">${esc(L.navCountry)}</a><a class="tl" href="../disclaimer.html">${esc(L.navAbout)}</a>${other}</div></nav>`;
}
const footer = L => `<footer><a href="../">${esc(L.footRank)}</a><a href="../disclaimer.html">${esc(L.footDisc)}</a><a href="../privacy.html">${esc(L.footPriv)}</a><a href="../about.html">${esc(L.footAbout)}</a></footer>`;
const bookJs = L => `<script>(function(){var d=new Date();d.setDate(d.getDate()+1);var ci=d.toISOString().slice(0,10);d.setDate(d.getDate()+3);var co=d.toISOString().slice(0,10);document.querySelectorAll('a[href*="booking.com/searchresults"]').forEach(function(a){a.href+="&checkin="+ci+"&checkout="+co;a.title=${L.bookTitleJs};});})();</script>`;
const curJs = L => { const C = cursFor(keyOf(L)), isJa = keyOf(L) === "ja";
  return `<script>(function(){var R=${JSON.stringify(RATES)},C=${JSON.stringify(C)},cur=${JSON.stringify(L.defCur)};try{var c=localStorage.getItem("cur");if(c&&R[c])cur=c;}catch(e){}
function f(n){if(cur==="JPY")return "¥"+n.toLocaleString(${JSON.stringify(isJa ? "ja-JP" : "en-US")});var v=n*R[cur],d=v<10?2:v<100?1:0;return C[cur][0]+v.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});}
function paint(){document.querySelectorAll(".jpy[data-jpy]").forEach(function(e){e.textContent=f(+e.dataset.jpy);});document.querySelectorAll('a[href*="booking.com/searchresults"]').forEach(function(a){a.href=a.href.replace(/selected_currency=[A-Z]+/,"selected_currency="+cur);});}
var tb=document.querySelector(".tbwrap");if(tb){var s=document.createElement("select");s.className="cursel";s.setAttribute("aria-label",${JSON.stringify(L.curAria)});s.innerHTML=Object.keys(R).filter(function(k){return k!=="date"}).map(function(k){return '<option value="'+k+'"'+(k===cur?' selected':'')+'>'+k+' '+C[k][1]+'</option>'}).join("");s.title=${JSON.stringify(L.curTitle(RATES.date))};s.addEventListener("change",function(){cur=R[s.value]?s.value:"JPY";try{localStorage.setItem("cur",cur)}catch(e){}paint();});tb.appendChild(s);}
paint();})();</script>`; };

function monthRows(vals, mid, L) {
  const known = vals.filter(v => v != null);
  const lo = Math.min(...known), hi = Math.max(...known);
  return vals.map((v, disp) => {
    const w = v == null ? 0 : Math.round(((v - lo) / ((hi - lo) || 1)) * 66) + 10;
    const tag = v == null ? "" : v === lo ? `<span class="pill lo">${esc(L.pillLo)}</span>`
              : v === hi ? `<span class="pill hi">${esc(L.pillHi)}</span>` : "";
    const diff = v == null ? "—" : (v === mid ? "±0%"
              : (v > mid ? "+" : "−") + Math.round(Math.abs(v - mid) / mid * 100) + "%");
    return `<tr><th>${L.monthTh(disp, YEAR(disp))}</th>
      <td class="num">${v == null ? "—" : money(v)}</td>
      <td class="num sub">${diff}</td>
      <td class="barc"><span class="bar" style="width:${w}%;background:${v == null ? "transparent" : BANDS[bandOf(v)].c}"></span>${tag}</td></tr>`;
  }).join("\n");
}

function summaryOf(d) {
  const vals = MORDER.map(i => d.m[i]);
  const known = vals.map((v,i) => [v,i]).filter(([v]) => v != null);
  return { loM: known.reduce((a,b) => b[0] < a[0] ? b : a)[1] + 1,
           hiM: known.reduce((a,b) => b[0] > a[0] ? b : a)[1] + 1,
           ratio: d.hi / d.lo };
}

// ---- 言語ごとに生成 -------------------------------------------------------
const allUrls = [];
LKEYS.forEach(key => {
  const L = LANGS[key];
  const root = path.join(ROOT, L.dir);                 // "" or "en/"
  const up = L.dir ? "../../" : "../";                 // 都市/国ページから見たサイト直下
  const rel = L.dir ? "../../" : "../";                // 言語切替リンクの基点
  const cityDir = path.join(root, "city"), cDir = path.join(root, "country");
  fs.rmSync(cityDir, { recursive: true, force: true }); fs.mkdirSync(cityDir, { recursive: true });
  fs.rmSync(cDir, { recursive: true, force: true }); fs.mkdirSync(cDir, { recursive: true });
  const siteRoot = `${BASE}/${L.dir}`;

  // --- 都市ページ ---
  DATA.forEach(d => {
    const sm = summaryOf(d);
    const disp = L.cityName(d), cname = L.countryName(CMAP[d.c]);
    const url = `${siteRoot}city/${d.__slug}.html`;
    const title = L.cityTitle(d, L);
    const desc = L.cityDesc(d, sm, L, yen);
    const jsonld = { "@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":L.ldHome,"item":siteRoot},
        {"@type":"ListItem","position":2,"name":L.ldCountry(cname),"item":siteRoot + "country/" + CMAP[d.c].slug + ".html"},
        {"@type":"ListItem","position":3,"name":L.ldCity(L.cityShort(d)),"item":url}]},
      {"@type":"Dataset","name":L.ldDatasetCity(d, L),"description":desc,"url":url,
       "license":"https://creativecommons.org/licenses/by/4.0/","creator":{"@type":"Person","name":"nobukuru114"},
       "inLanguage":L.htmlLang,"temporalCoverage":"2026-10/2027-09","dateModified":BUILT,
       "spatialCoverage":{"@type":"Place","name":d.name + ", " + d.c,"alternateName":L.cityShort(d),
         "geo":{"@type":"GeoCoordinates","latitude":d.lat,"longitude":d.lng}},
       "variableMeasured":{"@type":"PropertyValue","name":L.ldVarCity,"value":d.med,"unitCode":"JPY"}}]};
    const lead = L.citySummary(d, sm, { money, cname, total: DATA.length, inCountry: byCountry[d.c].length, L });
    const same = byCountry[d.c].filter(x => x !== d).slice(0, 12);
    const near = DATA.filter(x => x !== d && x.c !== d.c)
      .sort((a,b) => Math.abs(a.med - d.med) - Math.abs(b.med - d.med)).slice(0, 8);
    const li = list => list.map(x =>
      `<li><a href="${x.__slug}.html">${esc(L.cityShort(x))}${key !== "en" ? `<small>${esc(x.name)}</small>` : ""}</a>
       <span class="sub">${CJ[x.c] ? CJ[x.c].f : ""} ${esc(L.countryName(CMAP[x.c]))} ${money(x.med)}</span></li>`).join("");
    let nb = "";
    if (same.length) nb += `<section class="card"><h2>${esc(L.otherCities(cname))}</h2><ul class="links">${li(same)}</ul>
      <p class="sub"><a href="../country/${CMAP[d.c].slug}.html">${esc(L.allCities(cname, byCountry[d.c].length))}</a></p></section>`;
    if (near.length) nb += `<section class="card"><h2>${esc(L.similar)}</h2><ul class="links">${li(near)}</ul></section>`;

    const html = head(L, { title, desc, url, altPath: `city/${d.__slug}.html`, type: "article", jsonld, up })
+ topbar(L, k => rel + LANGS[k].dir + `city/${d.__slug}.html`) + `
<div class="wrap">
<nav class="crumb"><a href="../">${esc(L.crumbHome)}</a> › <span>${CJ[d.c] ? CJ[d.c].f : ""} ${esc(cname)}</span> › <span>${esc(disp)}</span></nav>
<h1>${esc(L.cityH1(disp))}</h1>
<p class="upd">${esc(L.updLine(CJ[d.c] ? CJ[d.c].f : "", cname, CAPTURED))}</p>
<p class="lead">${lead}</p>
<div class="stats">
  <div class="stat"><span>${esc(L.statAnnual)}</span><b style="color:${BANDS[bandOf(d.med)].c}">${money(d.med)}</b><small>${esc(L.statAnnualSub)}</small></div>
  <div class="stat"><span>${esc(L.statLo)}</span><b>${esc(L.month(sm.loM - 1))}</b><small>${money(d.lo)}</small></div>
  <div class="stat"><span>${esc(L.statHi)}</span><b>${esc(L.month(sm.hiM - 1))}</b><small>${money(d.hi)}</small></div>
  <div class="stat"><span>${esc(L.statSwing)}</span><b>${sm.ratio.toFixed(2)}×</b><small>${esc(L.statSwingSub)}</small></div>
  <div class="stat"><span>${esc(L.statRank)}</span><b>${esc(L.rankVal(d.__rank))}</b><small>${esc(L.statRankSub(DATA.length))}</small></div>
  <div class="stat"><span>${esc(L.statListed)}</span><b>${esc(L.listedVal(d.cnt, L))}</b><small>${esc(L.statListedSub(d.cnt < 30))}</small></div>
</div>
<section class="card">
<h2>${esc(L.monthH2)}</h2>
<table class="mtbl">
<thead><tr><th>${esc(L.thMonth)}</th><th class="num">${esc(L.thMedian)}</th><th class="num">${esc(L.thVsYear)}</th><th>${esc(L.thTrend)}</th></tr></thead>
<tbody>
${monthRows(MORDER.map(i => d.m[i]), d.med, L)}
</tbody></table>
<p class="sub">${esc(L.monthNote(d.ap))}</p>
</section>
<section class="card">
<h2>${esc(L.cheapH2(disp))}</h2>
<ul>${L.cheapLi(sm, d, money).map(x => `<li>${x}</li>`).join("")}</ul>
<p class="cta"><a class="btn" href="${bookUrl(d, L)}" data-bk="${esc(bookFilters(d, L).label)}" target="_blank" rel="noopener">${esc(L.ctaBook(L.cityShort(d)))}</a>
<a class="btn ghost" href="${mapUrl(d)}" target="_blank" rel="noopener">${esc(L.ctaMap)}</a></p>
<p class="sub">${esc(L.bkNote(bookFilters(d, L).label))}</p>
<p class="sub">${esc(L.ctaNote(CAPTURED))}</p>
</section>
${nb}
<section class="card">
<h2>${esc(L.aboutH2)}</h2>
<p>${esc(L.aboutP1(CAPTURED))}</p>
<p>${esc(L.aboutP2)}</p>
<p>${L.aboutLinks}</p>
</section>
<p class="backlink"><a href="../">${esc(L.backCity(DATA.length))}</a></p>
${footer(L)}${bookJs(L)}${curJs(L)}
</div></body></html>`;
    fs.writeFileSync(path.join(cityDir, d.__slug + ".html"), html);
  });

  // --- 国ページ ---
  COUNTRIES.forEach(k => {
    const url = `${siteRoot}country/${k.slug}.html`;
    const name = L.countryName(k);
    const cheapest = k.list[0], priciest = k.list[k.list.length - 1];
    const kn = k.months.map((v, i) => [v, i]).filter(([v]) => v != null);
    const loM = kn.reduce((a, b) => b[0] < a[0] ? b : a)[1] + 1;
    const hiM = kn.reduce((a, b) => b[0] > a[0] ? b : a)[1] + 1;
    const loV = Math.min(...k.months.filter(v => v != null));
    const hiV = Math.max(...k.months.filter(v => v != null));
    const title = L.countryTitle(k, L);
    const desc = L.countryDesc(k, L, yen, cheapest);
    const near = COUNTRIES.filter(x => x !== k)
      .sort((a, b) => Math.abs(a.mid - k.mid) - Math.abs(b.mid - k.mid)).slice(0, 8);
    const jsonld = { "@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":L.ldHome,"item":siteRoot},
        {"@type":"ListItem","position":2,"name":L.ldCountry(name),"item":url}]},
      {"@type":"ItemList","name":L.ldItemList(name),"numberOfItems":k.list.length,
       "itemListElement":k.list.map((d,i)=>({"@type":"ListItem","position":i+1,"name":L.cityName(d),
         "url":siteRoot + "city/" + d.__slug + ".html"}))},
      {"@type":"Dataset","name":L.ldDatasetCountry(k),"description":desc,"url":url,
       "license":"https://creativecommons.org/licenses/by/4.0/","creator":{"@type":"Person","name":"nobukuru114"},
       "inLanguage":L.htmlLang,"temporalCoverage":"2026-10/2027-09","dateModified":BUILT,
       "spatialCoverage":{"@type":"Country","name":k.c},
       "variableMeasured":{"@type":"PropertyValue","name":L.ldVarCountry,"value":k.mid,"unitCode":"JPY"}}]};
    const rows = k.list.map((d, i) => {
      const mv = MORDER.map(x => d.m[x]);
      const kn2 = mv.map((v, j) => [v, j]).filter(([v]) => v != null);
      const cl = kn2.reduce((a, b) => b[0] < a[0] ? b : a)[1];
      const ch = kn2.reduce((a, b) => b[0] > a[0] ? b : a)[1];
      return `<tr>
        <td class="num sub">${i + 1}</td>
        <td><a href="../city/${d.__slug}.html">${esc(L.cityShort(d))}</a>${key !== "en" ? `<small>${esc(d.name)}</small>` : ""}</td>
        <td class="num"><b style="color:${BANDS[bandOf(d.med)].c}">${money(d.med)}</b></td>
        <td class="num sub">${esc(L.month(cl))} ${money(d.lo)}</td>
        <td class="num sub">${esc(L.month(ch))} ${money(d.hi)}</td>
        <td class="num sub">${(d.hi / d.lo).toFixed(2)}×</td>
        <td class="num sub">${L.num(d.cnt)}</td></tr>`;
    }).join("\n");
    const ctx = { money, name, cheapest, priciest, nCountries: COUNTRIES.length, loM, hiM, loV, hiV, k, L };

    const html = head(L, { title, desc, url, altPath: `country/${k.slug}.html`, type: "article", jsonld, up })
+ topbar(L, x => rel + LANGS[x].dir + `country/${k.slug}.html`) + `
<div class="wrap">
<nav class="crumb"><a href="../">${esc(L.crumbHome)}</a> › <span>${k.flag} ${esc(name)}</span></nav>
<h1>${esc(L.countryH1(name))}</h1>
<p class="upd">${esc(L.updLine(k.flag, k.c, CAPTURED))}</p>
<p class="lead">${L.countryLead(k, ctx)}</p>
<div class="stats">
  <div class="stat"><span>${esc(L.statCountryMed)}</span><b style="color:${BANDS[bandOf(k.mid)].c}">${money(k.mid)}</b><small>${esc(L.statAnnualSub)}</small></div>
  <div class="stat"><span>${esc(L.statRank)}</span><b>${esc(L.rankVal(k.rank))}</b><small>${esc(L.statCountryRankSub(COUNTRIES.length))}</small></div>
  <div class="stat"><span>${esc(L.statCities)}</span><b>${esc(L.citiesVal(k.list.length, L))}</b><small>${esc(L.statCitiesSub(k.list.reduce((s,d)=>s+d.cnt,0), L))}</small></div>
  <div class="stat"><span>${esc(L.statCheapCity)}</span><b>${esc(L.cityShort(cheapest))}</b><small>${money(cheapest.med)}</small></div>
  <div class="stat"><span>${esc(L.statLoSeason)}</span><b>${esc(L.month(loM - 1))}</b><small>${money(loV)}</small></div>
  <div class="stat"><span>${esc(L.statHiSeason)}</span><b>${esc(L.month(hiM - 1))}</b><small>${money(hiV)}</small></div>
</div>
<section class="card">
<h2>${esc(L.cityTableH2(name))}</h2>
<table class="ctbl">
<thead><tr><th class="num">#</th><th>${esc(L.thCity)}</th><th class="num">${esc(L.thAnnual)}</th><th class="num">${esc(L.statLo)}</th><th class="num">${esc(L.statHi)}</th><th class="num">${esc(L.thSwing)}</th><th class="num">${esc(L.thListed)}</th></tr></thead>
<tbody>
${rows}
</tbody></table>
<p class="sub">${esc(L.cityTableNote)}</p>
</section>
<section class="card">
<h2>${esc(L.countryMonthH2(name))}</h2>
<table class="mtbl">
<thead><tr><th>${esc(L.thMonth)}</th><th class="num">${esc(L.thCountryMed)}</th><th class="num">${esc(L.thVsYear)}</th><th>${esc(L.thTrend)}</th></tr></thead>
<tbody>
${monthRows(k.months, k.mid, L)}
</tbody></table>
<p class="sub">${esc(L.countryMonthNote(name))}</p>
</section>
<section class="card">
<h2>${esc(L.countryCheapH2(name))}</h2>
<ul>${L.countryCheapLi(ctx).map(x => `<li>${x}</li>`).join("")}</ul>
<p class="cta"><a class="btn" href="https://www.booking.com/${L.booking}?ss=${enc(k.c)}&group_adults=1&no_rooms=1&group_children=0&selected_currency=${L.defCur}&nflt=${enc(bookFilters({cnt:0}, L).nflt)}" data-bk="${esc(bookFilters({cnt:0}, L).label)}" target="_blank" rel="noopener">${esc(L.ctaBookCountry(name))}</a></p>
<p class="sub">${esc(L.bkNote(bookFilters({cnt:0}, L).label))}</p>
<p class="sub">${esc(L.ctaNote(CAPTURED))}</p>
</section>
<section class="card">
<h2>${esc(L.nearH2)}</h2>
<ul class="links">
${near.map(x => `<li><a href="${x.slug}.html">${x.flag} ${esc(L.countryName(x))}</a><span class="sub">${L.nearSub(money(x.mid), x.list.length)}</span></li>`).join("")}
</ul>
</section>
<section class="card">
<h2>${esc(L.aboutH2)}</h2>
<p>${esc(L.aboutP1c(CAPTURED))}</p>
<p>${esc(L.aboutP2)}</p>
<p>${L.aboutLinks}</p>
</section>
<p class="backlink"><a href="../">${esc(L.backCountry(DATA.length, COUNTRIES.length))}</a></p>
${footer(L)}${bookJs(L)}${curJs(L)}
</div></body></html>`;
    fs.writeFileSync(path.join(cDir, k.slug + ".html"), html);
  });

  allUrls.push({ loc: siteRoot, pri: "1.0" },
    { loc: siteRoot + "disclaimer.html", pri: "0.3" },
    ...COUNTRIES.map(k => ({ loc: `${siteRoot}country/${k.slug}.html`, pri: "0.8" })),
    ...byMed.map(d => ({ loc: `${siteRoot}city/${d.__slug}.html`, pri: "0.7" })));
});

// ---- sitemap（全言語） ----------------------------------------------------
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  allUrls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${BUILT}</lastmod><priority>${u.pri}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

// ---- 一覧HTML用の slug 対応表 ---------------------------------------------
fs.writeFileSync(path.join(ROOT, "tools", "slugs.json"),
  JSON.stringify(Object.fromEntries(DATA.map(d => [d.name + "|" + d.c, d.__slug])), null, 0));
fs.writeFileSync(path.join(ROOT, "tools", "country-slugs.json"),
  JSON.stringify(Object.fromEntries(COUNTRIES.map(k => [k.c, k.slug])), null, 0));

const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
console.log("言語:", LKEYS.join(","), "| 都市ページ:", fs.readdirSync(path.join(ROOT, "city")).length, "/", DATA.length,
  "| 国ページ:", fs.readdirSync(path.join(ROOT, "country")).length, "/", COUNTRIES.length,
  "| sitemap:", allUrls.length, "URL | 同名都市:", dup.length ? dup.map(([k,v]) => k + "×" + v.length).join(",") : "なし");
