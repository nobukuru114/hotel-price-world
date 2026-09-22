// index.html の DATA を正本として、都市別ページ・国別ページ・sitemap.xml を生成する。
// 使い方: node tools/build-pages.js
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

// 国の slug と代表値
const median = a => { const v = a.slice().sort((x,y)=>x-y); const n = v.length;
  return n % 2 ? v[(n-1)/2] : Math.round((v[n/2-1] + v[n/2]) / 2); };
const COUNTRIES = Object.entries(byCountry).map(([c, list]) => {
  const mid = median(list.map(d => d.med));
  const months = MORDER.map((src) => {
    const vs = list.map(d => d.m[src]).filter(v => v != null);
    return vs.length ? median(vs) : null;
  });
  return { c, list, mid, months, slug: slugify(c),
           ja: (CJ[c] ? CJ[c].ja : c), flag: (CJ[c] ? CJ[c].f : "") };
});
COUNTRIES.sort((a,b) => a.mid - b.mid).forEach((k,i) => { k.rank = i + 1; });
const CMAP = Object.fromEntries(COUNTRIES.map(k => [k.c, k]));

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
    <p class="sub"><a href="../country/${CMAP[d.c].slug}.html">${esc(cname(d))}の全 ${byCountry[d.c].length} 都市と相場をまとめて見る →</a></p></section>`;
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
        {"@type":"ListItem","position":2,"name":cname(d) + "のホテル相場","item":BASE + "/country/" + CMAP[d.c].slug + ".html"},
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

// ---- 国別ページ -----------------------------------------------------------
const cDir = path.join(ROOT, "country");
fs.rmSync(cDir, { recursive: true, force: true });
fs.mkdirSync(cDir, { recursive: true });

function countryMonthRows(k) {
  const known = k.months.filter(v => v != null);
  const lo = Math.min(...known), hi = Math.max(...known);
  return k.months.map((v, disp) => {
    const w = v == null ? 0 : Math.round(((v - lo) / ((hi - lo) || 1)) * 66) + 10;
    const tag = v == null ? "" : v === lo ? '<span class="pill lo">最安</span>'
              : v === hi ? '<span class="pill hi">最高</span>' : "";
    const diff = v == null ? "—" : (v === k.mid ? "±0%"
              : (v > k.mid ? "+" : "−") + Math.round(Math.abs(v - k.mid) / k.mid * 100) + "%");
    return `<tr><th>${disp + 1}月<small>${YEAR(disp)}年</small></th>
      <td class="num">${v == null ? "—" : yen(v)}</td>
      <td class="num sub">${diff}</td>
      <td class="barc"><span class="bar" style="width:${w}%;background:${v == null ? "transparent" : BANDS[bandOf(v)].c}"></span>${tag}</td></tr>`;
  }).join("\n");
}

COUNTRIES.forEach(k => {
  const url = `${BASE}/country/${k.slug}.html`;
  const cheapest = k.list[0], priciest = k.list[k.list.length - 1];
  const kn = k.months.map((v, i) => [v, i]).filter(([v]) => v != null);
  const loM = kn.reduce((a, b) => b[0] < a[0] ? b : a)[1] + 1;
  const hiM = kn.reduce((a, b) => b[0] > a[0] ? b : a)[1] + 1;
  const loV = Math.min(...k.months.filter(v => v != null));
  const hiV = Math.max(...k.months.filter(v => v != null));

  const title = `${k.ja}の4つ星ホテル料金相場｜${k.list.length}都市の価格比較と安い時期`;
  const desc = `${k.ja}の4つ星ホテル宿泊費は都市中央値 ${yen(k.mid)}（大人2名1室1泊・税込）。`
    + `もっとも安いのは${cheapest.name}の${yen(cheapest.med)}。${k.list.length}都市を12か月分実測して比較。`;

  const near = COUNTRIES.filter(x => x !== k)
    .sort((a, b) => Math.abs(a.mid - k.mid) - Math.abs(b.mid - k.mid)).slice(0, 8);

  const jsonld = {
    "@context":"https://schema.org","@graph":[
      {"@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"世界都市 ホテル価格ランキング","item":BASE + "/"},
        {"@type":"ListItem","position":2,"name":k.ja + "のホテル相場","item":url}]},
      {"@type":"ItemList","name":k.ja + " 都市別 4つ星ホテル価格（安い順）","numberOfItems":k.list.length,
       "itemListElement":k.list.map((d,i)=>({"@type":"ListItem","position":i+1,"name":d.name,
         "url":BASE + "/city/" + d.__slug + ".html"}))},
      {"@type":"Dataset","name":k.c + " 4つ星ホテル 月別価格（実測）","description":desc,"url":url,
       "license":"https://creativecommons.org/licenses/by/4.0/",
       "creator":{"@type":"Person","name":"nobukuru114"},
       "temporalCoverage":"2026-10/2027-09","dateModified":BUILT,
       "spatialCoverage":{"@type":"Country","name":k.c},
       "variableMeasured":{"@type":"PropertyValue","name":"4つ星ホテル 1泊料金の都市中央値","value":k.mid,"unitCode":"JPY"}}]};

  const rows = k.list.map((d, i) => {
    const mv = MORDER.map(x => d.m[x]);
    const kn2 = mv.map((v, j) => [v, j]).filter(([v]) => v != null);
    const cl = kn2.reduce((a, b) => b[0] < a[0] ? b : a)[1] + 1;
    const ch = kn2.reduce((a, b) => b[0] > a[0] ? b : a)[1] + 1;
    return `<tr>
      <td class="num sub">${i + 1}</td>
      <td><a href="../city/${d.__slug}.html">${esc(d.name)}</a>${kanji(d) ? '<small>（' + kanji(d) + '）</small>' : ""}</td>
      <td class="num"><b style="color:${BANDS[bandOf(d.med)].c}">${yen(d.med)}</b></td>
      <td class="num sub">${cl}月 ${yen(d.lo)}</td>
      <td class="num sub">${ch}月 ${yen(d.hi)}</td>
      <td class="num sub">${(d.hi / d.lo).toFixed(2)}×</td>
      <td class="num sub">${d.cnt.toLocaleString()}</td></tr>`;
  }).join("\n");

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

<nav class="crumb"><a href="../">世界都市 ホテル価格ランキング</a> › <span>${k.flag} ${esc(k.ja)}</span></nav>

<h1>${esc(k.ja)}の4つ星ホテル料金相場</h1>
<p class="upd">${k.flag} ${esc(k.c)}／Booking.com 実測・調査日 ${CAPTURED}</p>

<p class="lead">${esc(k.ja)}の4つ星ホテルは、掲載 ${k.list.length} 都市の中央値で<b>${yen(k.mid)}</b>（大人2名1室1泊・税込）。
120か国中${k.rank}番目に安い国です。もっとも安いのは<b>${esc(cheapest.name)}の${yen(cheapest.med)}</b>${k.list.length > 1 ? `、もっとも高いのは<b>${esc(priciest.name)}の${yen(priciest.med)}</b>` : ""}。
国全体では<b>${loM}月</b>がもっとも安く（${yen(loV)}）、<b>${hiM}月</b>がもっとも高くなります（${yen(hiV)}）。</p>

<div class="stats">
  <div class="stat"><span>都市中央値</span><b style="color:${BANDS[bandOf(k.mid)].c}">${yen(k.mid)}</b><small>1泊・大人2名・税込</small></div>
  <div class="stat"><span>世界順位</span><b>${k.rank}位</b><small>120か国中・安い順</small></div>
  <div class="stat"><span>掲載都市</span><b>${k.list.length}都市</b><small>4つ星 計${k.list.reduce((s,d)=>s+d.cnt,0).toLocaleString()}軒</small></div>
  <div class="stat"><span>最安の都市</span><b>${esc(cheapest.name)}</b><small>${yen(cheapest.med)}</small></div>
  <div class="stat"><span>安い時期</span><b>${loM}月</b><small>${yen(loV)}</small></div>
  <div class="stat"><span>高い時期</span><b>${hiM}月</b><small>${yen(hiV)}</small></div>
</div>

<section class="card">
<h2>${esc(k.ja)}の都市別 相場（安い順）</h2>
<table class="ctbl">
<thead><tr><th class="num">#</th><th>都市</th><th class="num">年間中央値</th><th class="num">最安月</th><th class="num">最高月</th><th class="num">変動</th><th class="num">掲載数</th></tr></thead>
<tbody>
${rows}
</tbody></table>
<p class="sub">都市名をクリックすると、その都市の月別価格の詳細ページへ移動します。掲載数が30軒を下回る都市は中央値が不安定です。</p>
</section>

<section class="card">
<h2>${esc(k.ja)}全体の月別推移</h2>
<table class="mtbl">
<thead><tr><th>月</th><th class="num">都市中央値</th><th class="num">年間比</th><th>推移</th></tr></thead>
<tbody>
${countryMonthRows(k)}
</tbody></table>
<p class="sub">各月について、${esc(k.ja)}の掲載都市の中央値をさらに中央値でまとめた値です。1〜9月は2027年、10〜12月は2026年の実測。</p>
</section>

<section class="card">
<h2>${esc(k.ja)}に安く泊まるなら</h2>
<ul>
  <li>国内でもっとも安いのは<b>${esc(cheapest.name)}</b>の ${yen(cheapest.med)} です。<a href="../city/${cheapest.__slug}.html">${esc(cheapest.name)}の月別価格を見る →</a></li>
  <li>時期では<b>${loM}月</b>が底値で、もっとも高い${hiM}月と比べて1泊あたり ${yen(hiV - loV)} 安くなります。</li>
  ${k.list.length > 1 ? `<li>${esc(priciest.name)}（${yen(priciest.med)}）と${esc(cheapest.name)}（${yen(cheapest.med)}）では、同じ国内でも ${(priciest.med / cheapest.med).toFixed(1)} 倍の差があります。</li>` : ""}
</ul>
<p class="cta"><a class="btn" href="https://www.booking.com/searchresults.ja.html?ss=${enc(k.c)}&group_adults=2&no_rooms=1&nflt=${enc("class=4")}" target="_blank" rel="noopener">Booking.comで${esc(k.ja)}の4つ星ホテルを探す</a></p>
<p class="sub">価格は ${CAPTURED} 時点の調査値です。最新の料金と空室は予約サイトでご確認ください。</p>
</section>

<section class="card">
<h2>相場が近い国・地域</h2>
<ul class="links">
${near.map(x => `<li><a href="${x.slug}.html">${x.flag} ${esc(x.ja)}</a><span class="sub">${yen(x.mid)}・${x.list.length}都市</span></li>`).join("")}
</ul>
</section>

<section class="card">
<h2>このページのデータについて</h2>
<p>Booking.com 上で「4つ星」と表示される宿泊施設のうち、空室のあるものの価格中央値です。条件は大人2名・1室・1泊・税込・日本円。2026年10月〜2027年9月の各月から1日ずつ、計12回分を ${CAPTURED} に取得しました。国の代表値は、その国の掲載都市の中央値です。</p>
<p><a href="../disclaimer.html">調査方法と免責事項の詳細 →</a></p>
</section>

<p class="backlink"><a href="../">← 347都市・120か国の一覧と地図に戻る</a></p>

<footer><a href="../">ランキング</a><a href="../disclaimer.html">免責事項</a><a href="../privacy.html">プライバシーポリシー</a><a href="../about.html">運営者情報</a></footer>
</div></body></html>`;
  fs.writeFileSync(path.join(cDir, k.slug + ".html"), html);
});

// ---- sitemap --------------------------------------------------------------
const urls = [
  { loc: BASE + "/", pri: "1.0" },
  { loc: BASE + "/disclaimer.html", pri: "0.3" },
  { loc: BASE + "/about.html", pri: "0.3" },
  ...COUNTRIES.map(k => ({ loc: `${BASE}/country/${k.slug}.html`, pri: "0.8" })),
  ...byMed.map(d => ({ loc: `${BASE}/city/${d.__slug}.html`, pri: "0.7" }))
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${BUILT}</lastmod><priority>${u.pri}</priority></url>`).join("\n") +
  `\n</urlset>\n`);

// ---- 一覧HTML用の slug 対応表 ---------------------------------------------
fs.writeFileSync(path.join(ROOT, "tools", "slugs.json"),
  JSON.stringify(Object.fromEntries(DATA.map(d => [d.name + "|" + d.c, d.__slug])), null, 0));
fs.writeFileSync(path.join(ROOT, "tools", "country-slugs.json"),
  JSON.stringify(Object.fromEntries(COUNTRIES.map(k => [k.c, k.slug])), null, 0));

const dup = Object.entries(seen).filter(([, v]) => v.length > 1);
console.log("都市ページ:", fs.readdirSync(outDir).length, "/", DATA.length,
  "| 国ページ:", fs.readdirSync(cDir).length, "/", COUNTRIES.length,
  "| sitemap:", urls.length, "URL | 同名都市:", dup.length ? dup.map(([k,v]) => k + "×" + v.length).join(",") : "なし");
