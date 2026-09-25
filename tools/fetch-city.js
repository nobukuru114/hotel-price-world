#!/usr/bin/env node
// 1都市ぶんの4つ星ホテル価格を Booking.com から実測して JSON に書き出す（新しい都市の追加用）。
//   node tools/fetch-city.js --name "Cebu" --country "Philippines" --ja "セブ" [--lat 10.3157 --lng 123.8854]
// 取得方法の正本は tools/lib/survey.js（条件・宿泊日・二分探索）。インストール済み Chrome をヘッドレスで使う（tools/lib/chrome.js）。
// 出力: tools/pending/<name>.json（index.html への反映は tools/apply-city.js）
// ルール: 都市名 name と国名 c はお気に入り保存のキー（name|c）なので、既存都市の表記は絶対に変えない。
const fs = require("fs"), path = require("path");
const { launch, bookingGetter } = require("./lib/chrome.js");
const { surveyCity } = require("./lib/survey.js");
const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s+--/).filter(Boolean).map(s => { const [k, ...v] = s.replace(/^--/, "").split(" "); return [k, v.join(" ").replace(/^"|"$/g, "")]; }));
if(!args.name || !args.country) { console.error("usage: --name X --country Y [--ja Z --lat --lng]"); process.exit(1); }

(async () => {
  const out = { name: args.name, c: args.country, ja: args.ja || args.name };
  if(args.lat && args.lng){ out.lat = +args.lat; out.lng = +args.lng; }
  else {
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(`${args.name}, ${args.country}`), { headers: { "User-Agent": "hotel-price-world/1.0 (github.com/nobukuru114/hotel-price-world)" } });
    const j = await r.json(); if(!j[0]) throw new Error("geocode failed"); out.lat = +(+j[0].lat).toFixed(4); out.lng = +(+j[0].lon).toFixed(4);
  }
  const browser = await launch();
  try {
    const get = await bookingGetter(browser, console.log);
    const r = await surveyCity(get, out, new Date().toISOString().slice(0, 10), null, s => console.log(s));
    if(!r) throw new Error("価格が1か月も取れなかった");
    Object.assign(out, r);
  } finally { browser.close(); }
  const dir = path.join(__dirname, "pending"); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json");
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log("saved", file, JSON.stringify({ med: out.med, lo: out.lo, hi: out.hi, cnt: out.cnt, cap: out.cap }));
})().catch(e => { console.error("FAILED:", e.message); process.exit(2); });
