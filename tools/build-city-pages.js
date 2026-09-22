// index.html の DATA を正本として、都市別ページと sitemap.xml を生成する。
// 使い方: node tools/build-city-pages.js
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const BASE = "https://nobukuru114.github.io/hotel-price-world";
const CAPTURED = "2026-09-21", BUILT = "2026-09-22";

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
const CJK  = pick("const CJK = {");

// ---- 共通ヘルパ -----------------------------------------------------------
const MONTHS = ["26/10","26/11","26/12","27/01","27/02","27/03","27/04","27/05","27/06","27/07","27/08","27/09"];
const MORDER = [3,4,5,6,7,8,9,10,11,0,1,2];              // 表示順(1月→12月) → データ添字
const YEAR   = i => (i <= 8 ? 2027 : 2026);              // 1〜9月=2027, 10〜12月=2026
const BANDS = [
  {max:5000,   label:"〜¥5,000",        c:"#0e9f6e"},
  {max:10000,  label:"¥5,000〜10,000",  c:"#5aab34"},
  {max:15000,  label:"¥10,000〜15,000", c:"#c9a227"},
  {max:20000,  label:"¥15,000〜20,000", c:"#e07b39"},
  {max:30000,  label:"¥20,000〜30,000", c:"#d4553e"},
  {max:Infinity,label:"¥30,000〜",      c:"#8b3a62"}
];
const bandOf = v => BANDS.findIndex(b => v < b.max);
const esc  = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const yen  = n => "¥" + Number(n).toLocaleString("ja-JP");
const enc  = encodeURIComponent;
const cname = d => (CJ[d.c] ? CJ[d.c].ja : d.c);
const cflag = d => (CJ[d.c] ? CJ[d.c].f : "");
const kanji = d => CJK[d.name] || "";
const bookUrl = d => "https://www.booking.com/searchresults.ja.html?ss=" + enc(d.name + ", " + d.c)
  + "&group_adults=2&no_rooms=1&nflt=" + enc("class=4");
const mapUrl = d => "https://www.google.com/maps/search/?api=1&query=" + enc(d.name + ", " + d.c);

const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"")
  .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

// ---- 派生値 ---------------------------------------------------------------
const byMed = DATA.slice().sort((a,b) => a.med - b.med);
byMed.forEach((d,i) => { d.__rank = i + 1; });
const byCountry = {};
DATA.forEach(d => (byCountry[d.c] = byCountry[d.c] || []).push(d));
Object.values(byCountry).forEach(list => {
  list.sort((a,b) => a.med - b.med);
  list.forEach((d,i) => { d.__crank = i + 1; });
});

// slug の一意化（同名都市は国名を付ける）
const seen = {};
DATA.forEach(d => { const s = slugify(d.name); (seen[s] = seen[s] || []).push(d); });
DATA.forEach(d => {
  const s = slugify(d.name);
  d.__slug = seen[s].length > 1 ? s + "-" + slugify(d.c) : s;
});

// ---- 部品 -----------------------------------------------------------------
function monthRows(d) {
  const vals = MORDER.map(i => d.m[i]);
  const known = vals.filter(v => v != null);
  const lo = Math.min(...known), hi = Math.max(...known);
  return MORDER.map((src, disp) => {
    const v = d.m[src];
    const w = v == null ? 0 : Math.round(((v - lo) / ((hi - lo) || 1)) * 66) + 10;  // 最安/最高バッジ分の余白を残す
    const tag = v == null ? "" : v === lo ? '<span class="pill lo">最安</span>'
              : v === hi ? '<span class="pill hi">最高</span>' : "";
    const diff = v == null ? "—" : (v === d.med ? "±0%"
              : (v > d.med ? "+" : "−") + Math.round(Math.abs(v - d.med) / d.med * 100) + "%");
    return `<tr>
      <th>${disp + 1}月<small>${YEAR(disp)}年</small></th>
      <td class="num">${v == null ? "—" : yen(v)}</td>
      <td class="num sub">${diff}</td>
      <td class="barc"><span class="bar" style="width:${w}%;background:${v == null ? "transparent" : BANDS[bandOf(v)].c}"></span>${tag}</td>
    </tr>`;
  }).join("\n");
}

function neighbours(d) {
  const same = byCountry[d.c].filter(x => x !== d).slice(0, 12);
  const near = DATA.filter(x => x !== d && x.c !== d.c)
    .sort((a,b) => Math.abs(a.med - d.med) - Math.abs(b.med - d.med)).slice(0, 8);
  const li = list => list.map(x =>
    `<li><a href="${x.__slug}.html">${esc(x.name)}${kanji(x) ? "（" + kanji(x) + "）" : ""}</a>
     <span class="sub">${cflag(x)} ${esc(cname(x))} ${yen(x.med)}</span></li>`).join("");
  let out = "";
  if (same.length) out += `<section class="card"><h2>${esc(cname(d))}の他の都市</h2><ul class="links">${li(same)}</ul>
    <p class="sub">${esc(cname(d))}は ${byCountry[d.c].length} 都市を掲載しています。</p></section>`;
  if (near.length) out += `<section class="card"><h2>同じくらいの価格帯の都市</h2><ul class="links">${li(near)}</ul></section>`;
  return out;
}

function summary(d) {
  const vals = MORDER.map(i => d.m[i]);
  const known = vals.map((v,i) => [v,i]).filter(([v]) => v != null);
  const loM = known.reduce((a,b) => b[0] < a[0] ? b : a)[1] + 1;
  const hiM = known.reduce((a,b) => b[0] > a[0] ? b : a)[1] + 1;
  const ratio = (d.hi / d.lo);
  const nm = esc(d.name) + (kanji(d) ? "（" + kanji(d) + "）" : "");
  let s = `${nm}の4つ星ホテルは、大人2名1室1泊の税込中央値で<b>${yen(d.med)}</b>。`;
  s += `世界347都市中${d.__rank}番目に安く、${esc(cname(d))}国内では${byCountry[d.c].length}都市中${d.__crank}番目です。`;
  s += `もっとも安いのは<b>${loM}月の${yen(d.lo)}</b>、もっとも高いのは<b>${hiM}月の${yen(d.hi)}</b>で、その差は${ratio.toFixed(2)}倍。`;
  s += ratio >= 2 ? "季節による振れ幅が大きいため、時期の選び方で宿泊費が倍近く変わります。"
     : ratio >= 1.4 ? "時期を選べば1〜2割は安く泊まれます。"
     : "年間を通して価格は比較的安定しています。";
  return { html: s, loM, hiM, ratio };
}

// ---- ページ生成 -----------------------------------------------------------
const outDir = path.join(ROOT, "city");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

DATA.forEach(d => {
  const sm = summary(d);
  const nm = esc(d.name), ja = kanji(d), disp = nm + (ja ? "（" + ja + "）" : "");
  const url = `${BASE}/city/${d.__slug}.html`;
  const title = `${d.name}${ja ? "（" + ja + "）" : ""}の4つ星ホテル料金相場｜月別の実測価格と最安時期`;
  const desc = `${d.name}${ja ? "（" + ja + "）" : ""}の4つ星ホテル宿泊費は年間中央値 ${yen(d.med)}（大人2名1室1泊・税込）。`
    + `最安は${sm.loM}月の${yen(d.lo)}、最高は${sm.hiM}月の${yen(d.hi)}。Booking.comの実勢価格を12か月分実測した月別データ。`;
  const jsonld = {
    "@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"世界都市 ホテル価格ランキング","item":BASE + "/"},
        {"@type":"ListItem","position":2,"name":cname(d) + "のホテル相場","item":BASE + "/"},
        {"@type":"ListItem","position":3,"name":d.name + "のホテル相場","item":url}]},
      {"@type":"Dataset","name":d.name + " 4つ星ホテル 月別価格（実測）","description":desc,
       "url":url,"license":"https://creativecommons.org/licenses/by/4.0/",
       "creator":{"@type":"Person","name":"nobukuru114"},
       "temporalCoverage":"2026-10/2027-09","dateModified":BUILT,
       "spatialCoverage":{"@type":"Place","name":d.name + ", " + d.c,
         "geo":{"@type":"GeoCoordinates","latitude":d.lat,"longitude":d.lng}},
       "variableMeasured":{"@type":"PropertyValue","name":"4つ星ホテル 1泊料金の中央値",
         "value":d.med,"unitCode":"JPY"}}]};

  const html = `<!DOCTYPE html><html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="4つ星ホテル 世界都市 価格ランキング">
<link rel="icon" href="../favicon.svg">
<link rel="stylesheet" href="../page.css">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body><div class="wrap">

<nav class="crumb"><a href="../">世界都市 ホテル価格ランキング</a> › <span>${cflag(d)} ${esc(cname(d))}</span> › <span>${disp}</span></nav>

<h1>${disp}の4つ星ホテル料金相場</h1>
<p class="upd">${cflag(d)} ${esc(cname(d))}／Booking.com 実測・調査日 ${CAPTURED}</p>

<p class="lead">${sm.html}</p>

<div class="stats">
  <div class="stat"><span>年間中央値</span><b style="color:${BANDS[bandOf(d.med)].c}">${yen(d.med)}</b><small>1泊・大人2名・税込</small></div>
  <div class="stat"><span>最安月</span><b>${sm.loM}月</b><small>${yen(d.lo)}</small></div>
  <div class="stat"><span>最高月</span><b>${sm.hiM}月</b><small>${yen(d.hi)}</small></div>
  <div class="stat"><span>季節変動</span><b>${sm.ratio.toFixed(2)}×</b><small>最高÷最安</small></div>
  <div class="stat"><span>世界順位</span><b>${d.__rank}位</b><small>347都市中・安い順</small></div>
  <div class="stat"><span>掲載数</span><b>${d.cnt.toLocaleString()}軒</b><small>4つ星${d.cnt < 30 ? "・少なめ" : ""}</small></div>
</div>

<section class="card">
<h2>月別の宿泊費（1泊あたりの中央値）</h2>
<table class="mtbl">
<thead><tr><th>月</th><th class="num">中央値</th><th class="num">年間比</th><th>推移</th></tr></thead>
<tbody>
${monthRows(d)}
</tbody></table>
<p class="sub">各月1日分（第2火曜または第2土曜）の実測値です。1〜9月は2027年、10〜12月は2026年の価格。${d.ap ? "この都市は検索結果1ページ目の価格中央値で代用しています。" : ""}</p>
</section>

<section class="card">
<h2>${disp}に安く泊まるなら</h2>
<ul>
  <li><b>${sm.loM}月</b>がもっとも安く、年間中央値より${Math.round((1 - d.lo / d.med) * 100)}%安い ${yen(d.lo)} です。</li>
  <li><b>${sm.hiM}月</b>はもっとも高く、年間中央値より${Math.round((d.hi / d.med - 1) * 100)}%高い ${yen(d.hi)} になります。</li>
  <li>${sm.hiM}月に${sm.loM}月と同じ予算で泊まろうとすると、1泊あたり ${yen(d.hi - d.lo)} の差を埋める必要があります。</li>
</ul>
<p class="cta"><a class="btn" href="${bookUrl(d)}" target="_blank" rel="noopener">Booking.comで${nm}の4つ星ホテルを探す</a>
<a class="btn ghost" href="${mapUrl(d)}" target="_blank" rel="noopener">地図で見る</a></p>
<p class="sub">価格は ${CAPTURED} 時点の調査値です。最新の料金と空室は予約サイトでご確認ください。</p>
</section>

${neighbours(d)}

<section class="card">
<h2>このページのデータについて</h2>
<p>Booking.com 上で「4つ星」と表示される宿泊施設のうち、空室のあるものの価格中央値です。条件は大人2名・1室・1泊・税込・日本円。2026年10月〜2027年9月の各月から1日ずつ、計12回分を ${CAPTURED} に取得しました。</p>
<p><a href="../disclaimer.html">調査方法と免責事項の詳細 →</a></p>
</section>

<p class="backlink"><a href="../">← 347都市の一覧・地図に戻る</a></p>

<footer><a href="../">ランキング</a><a href="../disclaimer.html">免責事項</a><a href="../privacy.html">プライバシーポリシー</a><a href="../about.html">運営者情報</a></footer>
</div></body></html>`;
  fs.writeFileSync(path.join(outDir, d.__slug + ".html"), html);
});

// ---- sitemap --------------------------------------------------------------
const urls = [
  { loc: BASE + "/", pri: "1.0" },
  { loc: BASE + "/disclaimer.html", pri: "0.3" },
  { loc: BASE + "/about.html", pri: "0.3" },
  ...byMed.map(d => ({ loc: `${BASE}/city/${d.__slug}.html`, pri: "0.7" }))
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${BUILT}</lastmod><priority>${u.pri}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

// ---- 一覧HTML用の slug 対応表 ---------------------------------------------
fs.writeFileSync(path.join(ROOT, "tools", "slugs.json"),
  JSON.stringify(Object.fromEntries(DATA.map(d => [d.name + "|" + d.c, d.__slug])), null, 0));

const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
console.log("cities:", DATA.length, "| pages:", fs.readdirSync(outDir).length,
  "| sitemap urls:", urls.length, "| 同名都市:", dup.length ? dup.map(([k,v]) => k + "×" + v.length).join(",") : "なし");
