#!/usr/bin/env node
// 1都市ぶんの4つ星ホテル価格を Booking.com から実測して JSON に書き出す
//   node tools/fetch-city.js --name "Cebu" --country "Philippines" --ja "セブ" [--lat 10.3157 --lng 123.8854]
// 取得条件は既存データと同じ: 2名1室1泊・税込・JPY・4つ星、2026-10〜2027-09 の各月（第2火曜／第2土曜を交互）、
// 価格上限フィルタを二分探索し「在庫の半数がそれ以下」になる価格＝中央値。掲載数 cnt は最も薄い月の件数。
// 出力: tools/pending/<name>.json（index.html への反映は tools/apply-city.js）
// ルール: 都市名 name と国名 c はお気に入り保存のキー（name|c）なので、既存都市の表記は絶対に変えない。
const fs = require("fs"), path = require("path");
const args = Object.fromEntries(process.argv.slice(2).join(" ").split(/\s+--/).filter(Boolean).map(s => { const [k, ...v] = s.replace(/^--/, "").split(" "); return [k, v.join(" ").replace(/^"|"$/g, "")]; }));
if(!args.name || !args.country) { console.error("usage: --name X --country Y [--ja Z --lat --lng]"); process.exit(1); }

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const WAIT_MS = 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = n => String(n).padStart(2, "0");

// 各月の宿泊日: 第2火曜（偶数番目の月）／第2土曜（奇数番目の月）を交互
function nthWeekday(y, m, dow, n){ const d = new Date(Date.UTC(y, m - 1, 1)); let c = 0; while(true){ if(d.getUTCDay() === dow && ++c === n) break; d.setUTCDate(d.getUTCDate() + 1); } return d; }
const MONTHS = []; for(let i = 0; i < 12; i++){ const y = 2026 + Math.floor((9 + i) / 12), m = ((9 + i) % 12) + 1; MONTHS.push({ y, m, dow: i % 2 === 0 ? 2 : 6 }); }
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

let destId = null;
async function count(checkin, maxPrice){
  const co = new Date(checkin); co.setUTCDate(co.getUTCDate() + 1);
  const p = new URLSearchParams({ checkin: ymd(checkin), checkout: ymd(co), group_adults: "2", no_rooms: "1", group_children: "0", selected_currency: "JPY" });
  if(destId){ p.set("dest_id", destId); p.set("dest_type", "city"); } else p.set("ss", `${args.name}, ${args.country}`);
  p.set("nflt", "class=4" + (maxPrice ? `;price=JPY-min-${maxPrice}-1` : ""));
  const url = "https://www.booking.com/searchresults.ja.html?" + p.toString();
  for(let attempt = 1; attempt <= 8; attempt++){
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.8" } });
    const html = await r.text();
    if(r.status === 200){
      if(!destId){ const m = html.match(/dest_id=(-?\d+)/); if(m) destId = m[1]; }
      if(/captcha|px-captcha|challenge-platform/i.test(html) && !/軒が見つかりました/.test(html)) throw new Error("blocked (captcha)");
      const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
      if(!h1) throw new Error("h1 not found");
      const t = h1[1];
      if(/見つかりませんでした|0軒/.test(t) || /条件に一致する/.test(t)) return { n: 0, place: t };
      const m = t.match(/([\d,]+)軒/); if(!m) throw new Error("count not found: " + t);
      return { n: +m[1].replace(/,/g, ""), place: t.split("：")[0] };
    }
    if(r.status === 202 || r.status === 429 || r.status >= 500){ await sleep(WAIT_MS * 3 * attempt); continue; }   // 202 = ボット確認ページ。間隔を空けて再試行
    throw new Error("http " + r.status);
  }
  throw new Error("retry exhausted");
}

async function medianFor(checkin, log){
  const total = (await count(checkin, null)).n; await sleep(WAIT_MS);
  if(total < 2) return { med: null, total };
  const target = Math.ceil(total / 2);
  let lo = 1000, hi = 300000;                      // 50円刻みで二分探索
  while(hi - lo > 50){
    const mid = Math.round((lo + hi) / 2 / 50) * 50;
    const n = (await count(checkin, mid)).n; await sleep(WAIT_MS);
    log(`  ${ymd(checkin)} total=${total} ≤¥${mid}: ${n}`);
    if(n >= target) hi = mid; else lo = mid;
  }
  return { med: hi, total };
}

(async () => {
  const out = { name: args.name, c: args.country, ja: args.ja || args.name, ap: 0 };
  if(args.lat && args.lng){ out.lat = +args.lat; out.lng = +args.lng; }
  else {
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(`${args.name}, ${args.country}`), { headers: { "User-Agent": "hotel-price-world/1.0 (github.com/nobukuru114/hotel-price-world)" } });
    const j = await r.json(); if(!j[0]) throw new Error("geocode failed"); out.lat = +(+j[0].lat).toFixed(4); out.lng = +(+j[0].lon).toFixed(4);
  }
  const m = [], totals = [];
  for(const mo of MONTHS){
    const d = nthWeekday(mo.y, mo.m, mo.dow, 2);
    const r = await medianFor(d, s => console.log(s));
    console.log(`${mo.y}-${pad(mo.m)} (${ymd(d)}): median ¥${r.med} / ${r.total}軒`);
    m.push(r.med); totals.push(r.total);
  }
  const v = m.filter(x => x != null).slice().sort((a, b) => a - b), n = v.length;
  out.m = m; out.cnt = Math.min(...totals.filter(t => t > 0));
  out.lo = v[0]; out.hi = v[n - 1];
  out.med = n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2);
  out.__dest_id = destId; out.__captured = new Date().toISOString().slice(0, 10);
  const dir = path.join(__dirname, "pending"); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json");
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  console.log("saved", file, JSON.stringify({ med: out.med, lo: out.lo, hi: out.hi, cnt: out.cnt }));
})().catch(e => { console.error("FAILED:", e.message); process.exit(2); });
