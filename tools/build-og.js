#!/usr/bin/env node
// OGP 画像（1200×630）を言語ごとに og/<言語>.png として生成する。インストール済みの Google Chrome をヘッドレスで使う。
// 文言は tools/i18n/pages.js の og、数値は index.html の DATA、通貨は各言語の defCur（RATES で換算）。
// 使い方: node tools/build-og.js
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LANGS = require("./i18n/pages.js");
const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const line = k => { const m = src.match(new RegExp("^const " + k + " = (.*);$", "m")); if(!m) throw new Error(k + " not found"); return m[1]; };
const DATA = JSON.parse(line("DATA")), CJ = JSON.parse(line("CJ")), RATES = JSON.parse(line("RATES")), CURS = eval("(" + line("CURS") + ")");
const esc = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const by = DATA.slice().sort((a,b) => a.med - b.med), lo = by[0], hi = by[by.length - 1];
const med = by[Math.floor(by.length / 2)].med;                 // index.html の paintKPIs と同じ定義
const nC = new Set(DATA.map(d => d.c)).size;
const BAND = ["#16a34a","#65a30d","#ca8a04","#ea580c","#dc2626","#9d174d"], MAX = [5000,10000,15000,20000,30000,Infinity];
const counts = MAX.map((m,i) => DATA.filter(d => d.med <= m && (i === 0 || d.med > MAX[i-1])).length);
const MINCHO = `"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif TC","Noto Serif SC","Noto Serif KR",Georgia,serif`;

fs.mkdirSync(path.join(ROOT, "og"), { recursive: true });
for(const [key, L] of Object.entries(LANGS)){
  const cur = L.defCur, sym = CURS[cur][0];
  const money = y => { if(cur === "JPY") return "¥" + Math.round(y).toLocaleString("en-US");
    const x = y * RATES[cur], d = x < 10 ? 2 : x < 100 ? 1 : 0; return sym + x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  const k = (label, val, sub, col) => `<div class="k"><span>${esc(label)}</span><b style="color:${col}">${esc(money(val))}</b><small>${esc(sub)}</small></div>`;
  const html = `<!DOCTYPE html><html lang="${L.htmlLang}"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:-apple-system,"Hiragino Sans","Helvetica Neue",Arial,sans-serif;color:#fff;
 background:radial-gradient(900px 420px at 8% -10%,rgba(37,99,235,.55),transparent 60%),radial-gradient(700px 420px at 95% 115%,rgba(157,23,77,.55),transparent 60%),radial-gradient(600px 300px at 55% 0%,rgba(5,150,105,.25),transparent 60%),#0b1220;position:relative}
body::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:60px 60px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 90%)}
.in{position:relative;z-index:1;padding:58px 68px 0}
.brand{display:flex;align-items:center;gap:12px;font-weight:700;font-size:24px;letter-spacing:.01em}
.brand i{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:10px;font-style:normal;background:linear-gradient(135deg,#16a34a,#ca8a04 55%,#db2777);font-size:22px}
h1{font-family:${MINCHO};font-weight:600;font-size:66px;line-height:1.16;margin:34px 0 14px;letter-spacing:.005em}
h1 em{font-style:normal;background:linear-gradient(90deg,#86efac,#fde68a 50%,#f9a8d4);-webkit-background-clip:text;background-clip:text;color:transparent;padding:.04em 0 .16em}
.sub{font-size:23px;color:#cbd5e1}
.ks{display:flex;gap:18px;margin-top:34px}
.k{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:16px 20px}
.k span{display:block;font-size:17px;color:#cbd5e1;font-weight:600}
.k b{display:block;font-size:44px;font-weight:800;letter-spacing:-.01em;margin:4px 0 2px;font-variant-numeric:tabular-nums}
.k small{font-size:17px;color:#94a3b8}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;display:flex;z-index:1}
</style></head><body><div class="in">
<div class="brand"><i>¥</i>Hotel Price World</div>
<h1>${esc(L.og.h1a)}<br><em>${esc(L.og.h1b)}</em></h1>
<div class="sub">${esc(L.og.sub(nC, DATA.length))}</div>
<div class="ks">${k(L.og.kLo, lo.med, CJ[lo.c].f + " " + L.og.city(lo), "#86efac")}${k(L.og.kMed, med, "", "#fff")}${k(L.og.kHi, hi.med, CJ[hi.c].f + " " + L.og.city(hi), "#f9a8d4")}</div>
</div><div class="bar">${counts.map((c,i) => `<span style="flex:${c};background:${BAND[i]}"></span>`).join("")}</div></body></html>`;
  const tmp = path.join(os.tmpdir(), `og-${key}.html`), png = path.join(ROOT, "og", `${key}.png`);
  fs.writeFileSync(tmp, html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630",
    "--virtual-time-budget=2000", "--screenshot=" + png, "file://" + tmp], { stdio: "ignore" });
  console.log(`og/${key}.png ${(fs.statSync(png).size / 1024 | 0)}KB`);
}
