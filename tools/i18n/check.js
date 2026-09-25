#!/usr/bin/env node
// 言語の訳を検査する（仕様は tools/i18n/TRANSLATING.md）。
//   node tools/i18n/check.js <code>            … 6ファイルの検査（エラーがあれば exit 1）
//   node tools/i18n/check.js <code> --cities   … 都市名の訳に使う一覧（キー・英語名・日本語名）を出す
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), code = process.argv[2];
if(!code){ console.error("usage: check.js <code> [--cities]"); process.exit(1); }
const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const DATA = JSON.parse(src.match(/^const DATA = (.*);$/m)[1]);
if(process.argv.includes("--cities")){ DATA.forEach(d => console.log(`${d.name}|${d.c}\t${d.name}\t${d.ja}`)); process.exit(0); }
const err = [], warn = [];
const ph = s => (String(s).match(/\$\{[^}]*\}/g) || []).sort().join(" ");
// 1. pages
let P = null;
try { delete require.cache[require.resolve("./pages.js")]; P = require("./pages.js")[code]; } catch(e){ err.push("pages: 読み込めない: " + e.message); }
if(!P && !err.length) err.push(`pages: tools/i18n/pages/${code}.js が無い`);
if(P){
  const E = require("./pages.js").en;
  const miss = Object.keys(E).filter(k => !(k in P)), extra = Object.keys(P).filter(k => !(k in E));
  if(miss.length) err.push("pages: 不足キー " + miss.join(", "));
  if(extra.length) err.push("pages: 余分なキー " + extra.join(", "));
  for(const k of Object.keys(E)) if(k in P && typeof E[k] !== typeof P[k]) err.push(`pages: ${k} の型が違う（en=${typeof E[k]}）`);
  if(P.dir !== code + "/") err.push(`pages: dir は "${code}/"`);
  const stub = { name: "Bangkok", c: "Thailand", ja: "バンコク", __ln: "BKK", __lc: "TH", med: 10000, lo: 8000, hi: 12000, cnt: 100, m: Array(12).fill(10000), ap: 0, __rank: 5, __crank: 2, __slug: "bangkok" };
  const K = { c: "Thailand", __lc: "TH", list: [stub, { ...stub, name: "Phuket", __ln: "HKT", med: 12000, __slug: "phuket" }], mid: 11000, rank: 3, months: Array(12).fill(10000), flag: "🇹🇭" };
  try { const s = P.cityName(stub) + P.cityShort(stub) + P.countryName(K);
    if(/Thailand/.test(s)) err.push("pages: 国名に k.c（英語）を使っている → k.__lc"); if(!/BKK/.test(s)) err.push("pages: 都市名に d.__ln を使っていない");
    const sum = P.citySummary(stub, { loM: 2, hiM: 8, ratio: 1.5 }, { money: n => "¥" + n, cname: "TH", total: 348, inCountry: 8, L: P });
    if(/\bBangkok\b/.test(sum.replace(/（Bangkok）|\(Bangkok\)/g, ""))) warn.push("pages: citySummary に英語の都市名（d.name）が出ている");
    const lead = P.countryLead(K, { money: n => "¥" + n, name: "TH", cheapest: K.list[0], priciest: K.list[1], nCountries: 120, loM: 2, hiM: 8, loV: 9000, hiV: 13000, L: P });
    if(/Phuket|Bangkok/.test(lead)) err.push("pages: countryLead に英語の都市名（.name）→ .__ln");
    P.cityTitle(stub, P); P.cityDesc(stub, { loM: 2, hiM: 8 }, P, n => "¥" + n); P.countryTitle(K, P); P.countryDesc(K, P, n => "¥" + n, stub);
    P.countryCheapLi({ money: n => "¥" + n, cheapest: K.list[0], priciest: K.list[1], loM: 2, hiM: 8, loV: 9000, hiV: 13000, k: K });
    for(let i = 0; i < 12; i++){ P.month(i); P.monthTh(i, 2027); }
  } catch(e){ err.push("pages: 関数の実行でエラー: " + e.message); }
  if(/[぀-ヿ]/.test(JSON.stringify(P) + Object.values(P).filter(v => typeof v === "function").map(String).join("")) && !/^ja/.test(P.htmlLang)) warn.push("pages: 仮名が残っている（日本語の訳し漏れ？）");
}
// 2. トップページの訳
let T = null;
try { T = require(`./${code}.js`); } catch(e){ err.push(`${code}.js: 読み込めない: ` + e.message); }
if(T){
  const EN = require("./en.js");
  const froms = new Set(T.pairs.map(p => p[0]));
  const optional = p => /^th\.sorted::after/.test(p[0]);
  EN.pairs.filter(p => !optional(p) && !froms.has(p[0])).forEach(p => err.push(`${code}.js: 原文の訳が無い: ${p[0].slice(0, 70)}`));
  T.pairs.forEach(p => { if(!EN.pairs.some(q => q[0] === p[0])) err.push(`${code}.js: en.js に無い原文: ${p[0].slice(0, 70)}`); });
  const enTo = Object.fromEntries(EN.pairs.map(p => [p[0], p[1]]));
  T.pairs.forEach(([f, t]) => { if(enTo[f] != null && /\$\{/.test(enTo[f]) && !/const |return |\.map|=>/.test(f) && ph(enTo[f]) !== ph(t)) warn.push(`${code}.js: \${…} が英語版と違う: ${f.slice(0, 50)}`); });
  if(!T.currencyNames || Object.keys(EN.currencyNames).some(k => !T.currencyNames[k])) err.push(`${code}.js: currencyNames が足りない`);
  const need = ['const jname = d => LN[', 'const cname = d => LC['];
  if(code !== "en") need.forEach(n => { if(!T.pairs.some(p => p[1].includes(n))) err.push(`${code}.js: 「${n}…」の行が無い`); });
}
// 3. 都市名
const nf = path.join(__dirname, "names", code + ".json");
if(!fs.existsSync(nf)) err.push("names: ファイルが無い"); else {
  const N = JSON.parse(fs.readFileSync(nf, "utf8"));
  const keys = DATA.map(d => d.name + "|" + d.c), miss = keys.filter(k => !N[k]), extra = Object.keys(N).filter(k => !k.startsWith("@") && !keys.includes(k));
  if(miss.length) warn.push(`names: 未訳 ${miss.length}都市（英語名で表示）`);
  if(extra.length) err.push(`names: 存在しないキー ${extra.slice(0, 5).join(", ")}`);
}
// 4〜6. 法務ページ
if(P) ["disclaimer.html", "privacy.html", "about.html"].forEach(f => { const p = path.join(ROOT, P.dir, f);
  if(!fs.existsSync(p)) return err.push(`${P.dir}${f}: 無い`);
  const s = fs.readFileSync(p, "utf8");
  if(!s.includes(`<html lang="${P.htmlLang}"`)) err.push(`${P.dir}${f}: <html lang="${P.htmlLang}"> でない`);
  if(!s.includes(`/hotel-price-world/${P.dir}${f}"`)) err.push(`${P.dir}${f}: canonical が違う`);
  if(!s.includes('src="../lang.js"')) err.push(`${P.dir}${f}: lang.js が無い`);
  if(f === "disclaimer.html" && !s.includes("hreflang:start")) err.push(`${P.dir}${f}: hreflang ブロックが無い`);
  if(/[぀-ヿ]/.test(s.replace(/hreflang="ja"|日本語/g, ""))) warn.push(`${P.dir}${f}: 仮名が残っている`); });
warn.forEach(w => console.log("⚠ " + w)); err.forEach(e => console.log("✗ " + e));
console.log(err.length ? `✗ ${err.length} エラー / ${warn.length} 警告` : `✓ エラーなし / ${warn.length} 警告`);
process.exit(err.length ? 1 : 0);
