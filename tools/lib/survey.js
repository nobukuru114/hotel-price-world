// 価格調査の方法（正本）。fetch-city.js / update-prices.js / build-pages.js（年表示）が共用する。
// 条件: 大人2名1室1泊・税込・JPY・4つ星。各月1日（偶数月=第2火曜／奇数月=第2土曜）。初回調査（2026-09-21）と同じ割当。
// 中央値: 価格上限フィルタを二分探索し「在庫の半数がその価格以下」になる上限（50円刻み）。掲載数 cnt は最も薄い月の件数。
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const DIDX_MONTH = k => ((9 + k) % 12) + 1;                // DATA.m の添字 k → 暦月（k=0 が10月）
const DOW = mo => (mo % 2 === 0 ? 2 : 6);                  // 偶数月=火曜(2)／奇数月=土曜(6)
function nthWeekday(y, mo, dow, n){ const d = new Date(Date.UTC(y, mo - 1, 1)); let c = 0; for(;;){ if(d.getUTCDay() === dow && ++c === n) return d; d.setUTCDate(d.getUTCDate() + 1); } }
// 調査日 cap（YYYY-MM-DD）から見た、各月の宿泊日（cap より後で最初に来るもの）。返り値は DATA.m の添字順。
function stayDates(cap){
  const c = new Date(cap + "T00:00:00Z"), y0 = c.getUTCFullYear();
  return [...Array(12).keys()].map(k => { const mo = DIDX_MONTH(k); let d = nthWeekday(y0, mo, DOW(mo), 2);
    if(d <= c) d = nthWeekday(y0 + 1, mo, DOW(mo), 2); return d; });
}
const BASE_CAP = "2026-09-21";                              // 初回調査日（cap の無い都市はこの日）
const capOf = d => d.cap || BASE_CAP;

// ---- ここから下は取得処理（get は URL → {status, h1, place, captcha} を返す関数） ----
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WAIT_MS = 2200;
async function count(get, q, checkin, maxPrice){
  const co = new Date(checkin); co.setUTCDate(co.getUTCDate() + 1);
  const p = new URLSearchParams({ checkin: ymd(checkin), checkout: ymd(co), group_adults: "2", no_rooms: "1", group_children: "0", selected_currency: "JPY" });
  p.set("ss", q.ss);                                       // 初回調査と同じく都市名＋国名で検索
  p.set("nflt", "class=4" + (maxPrice ? `;price=JPY-min-${maxPrice}-1` : ""));
  const r = await get("https://www.booking.com/searchresults.ja.html?" + p.toString());
  await sleep(WAIT_MS);
  if(r.captcha) throw new Error("blocked (captcha)");
  if(!r.h1) throw new Error("h1 not found (status " + r.status + ")");
  const m = r.h1.match(/([\d,]+)軒/);                      // 件数を先に読む（"/0軒/" だと 110軒 も0件扱いになる）
  if(!m){ if(/見つかりませんでした|条件に一致する/.test(r.h1)) return 0; throw new Error("count not found: " + r.h1); }
  if(+m[1].replace(/,/g, "") === 0) return 0;
  if(q.place && r.place !== q.place) throw new Error(`検索地が変わった: ${q.place} → ${r.place}`);
  if(!q.place) q.place = r.place;
  return +m[1].replace(/,/g, "");
}
// prev があればその前後に探索範囲を絞る（範囲外なら全域に広げる）。結果は全域探索と同じ値になる。
async function medianFor(get, q, checkin, prev, log = () => {}){
  const total = await count(get, q, checkin, null);
  if(total < 2) return { med: null, total };
  const target = Math.ceil(total / 2);
  let lo = 1000, hi = 300000;
  if(prev){
    const h = Math.ceil(prev * 1.45 / 50) * 50, l = Math.max(1000, Math.floor(prev * 0.7 / 50) * 50);
    if(await count(get, q, checkin, h) >= target){ hi = h; if(await count(get, q, checkin, l) < target) lo = l; }
  }
  while(hi - lo > 50){
    const mid = Math.round((lo + hi) / 2 / 50) * 50;
    const n = await count(get, q, checkin, mid);
    log(`    ${ymd(checkin)} total=${total} ≤¥${mid}: ${n}`);
    if(n >= target) hi = mid; else lo = mid;
  }
  return { med: hi, total };
}
// 1都市ぶん。prevM は既存の月別値（DATA.m、無ければ null）。
async function surveyCity(get, city, cap, prevM, log = () => {}){
  const q = { ss: `${city.name}, ${city.c}`, place: null };
  const dates = stayDates(cap), m = [], totals = [];
  for(let k = 0; k < 12; k++){
    const r = await medianFor(get, q, dates[k], prevM ? prevM[k] : null, log);
    log(`  ${ymd(dates[k])}: ${r.med == null ? "—" : "¥" + r.med} / ${r.total}軒`);
    m.push(r.med); totals.push(r.total);
  }
  const v = m.filter(x => x != null).sort((a, b) => a - b), n = v.length;
  if(!n) return null;
  return { m, cnt: Math.min(...totals.filter(t => t > 0)), lo: v[0], hi: v[n - 1],
           med: n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2), ap: 0, cap, place: q.place };
}
module.exports = { stayDates, capOf, BASE_CAP, DIDX_MONTH, ymd, surveyCity };
