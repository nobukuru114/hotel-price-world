#!/usr/bin/env node
// tools/pending/*.json（fetch-city.js の出力）を index.html の DATA に追加し、ページと slug 表を再生成する
//   node tools/apply-city.js            … pending をすべて反映
// ルール: 既存都市の name / c は変更しない（お気に入りのキー）。同じ name|c があれば価格だけ更新する。
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const ROOT = path.join(__dirname, ".."), IDX = path.join(ROOT, "index.html"), PEND = path.join(__dirname, "pending");
let s = fs.readFileSync(IDX, "utf8");
const m = s.match(/^const DATA = (.*);$/m); if(!m) throw new Error("DATA not found");
const DATA = JSON.parse(m[1]);
const files = fs.existsSync(PEND) ? fs.readdirSync(PEND).filter(f => f.endsWith(".json") && !f.endsWith(".applied.json")) : [];
if(!files.length){ console.log("pending なし"); process.exit(0); }
const KEYS = ["name","c","med","lo","hi","cnt","lat","lng","m","ap","ja","cap"];
for(const f of files){
  const r = JSON.parse(fs.readFileSync(path.join(PEND, f), "utf8"));
  if(r.m.filter(x => x != null).length < 6) { console.log("skip（月データ不足）:", f); continue; }
  r.cap = r.cap || r.__captured;                              // 調査日（都市ごと）
  const rec = Object.fromEntries(KEYS.map(k => [k, r[k]]).filter(([, v]) => v !== undefined));
  const i = DATA.findIndex(d => d.name === rec.name && d.c === rec.c);
  if(i >= 0){ Object.assign(DATA[i], { med: rec.med, lo: rec.lo, hi: rec.hi, cnt: rec.cnt, m: rec.m, ap: rec.ap, cap: rec.cap }); console.log("更新:", rec.name, rec.cap); }
  else { DATA.push(rec); console.log("追加:", rec.name, rec.c, "¥" + rec.med); }
  fs.renameSync(path.join(PEND, f), path.join(PEND, f.replace(/\.json$/, ".applied.json")));
}
s = s.replace(m[0], "const DATA = " + JSON.stringify(DATA) + ";");
fs.writeFileSync(IDX, s);
execSync("node " + path.join(__dirname, "build-pages.js"), { stdio: "inherit" });
// slug 表（正本 tools/slugs.json）を index.html に反映
s = fs.readFileSync(IDX, "utf8");
const slugs = fs.readFileSync(path.join(__dirname, "slugs.json"), "utf8"), cslugs = fs.readFileSync(path.join(__dirname, "country-slugs.json"), "utf8");
s = s.replace(/^const SLUG = .*;$/m, "const SLUG = " + slugs + ";").replace(/^const CSLUG = .*;$/m, "const CSLUG = " + cslugs + ";");
fs.writeFileSync(IDX, s);
console.log("DATA:", DATA.length, "都市");
