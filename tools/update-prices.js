#!/usr/bin/env node
// 価格の定期更新（毎晩 launchd から実行）。調査日の古い都市から順に N 都市を再調査し、反映→再生成→コミット→push する。
// 12都市/晩 × 約30晩で全348都市が一巡する（＝各都市がおおむね毎月更新される）。
//   node tools/update-prices.js [--limit 12] [--city "Bangkok|Thailand"] [--push] [--dry]
// ルール: 都市名 name と国名 c は★のキー（name|c）なので変更しない。価格・掲載数・調査日だけを差し替える。
// 安全弁: 有効な月が10未満、または年間中央値が前回から±60%を超えて動いた都市は反映せず「要確認」として残す。
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const { launch, bookingGetter } = require("./lib/chrome.js");
const { surveyCity, capOf } = require("./lib/survey.js");
const ROOT = path.join(__dirname, ".."), PEND = path.join(__dirname, "pending"), HOLD = path.join(__dirname, "hold");
const LOGD = path.join(__dirname, "logs"), LOCK = path.join(LOGD, "update.lock");
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf("--" + k); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true); };
const LIMIT = +(opt("limit") || 12), PUSH = !!opt("push"), DRY = !!opt("dry"), ONLY = opt("city");
const today = new Date().toISOString().slice(0, 10);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sh = c => execSync(c, { cwd: ROOT, stdio: "pipe" }).toString().trim();
const notify = msg => { try { execSync(`osascript -e ${JSON.stringify(`display notification ${JSON.stringify(msg)} with title "hotel-price-world"`)}`); } catch(e){} };

fs.mkdirSync(LOGD, { recursive: true });
if(fs.existsSync(LOCK) && Date.now() - fs.statSync(LOCK).mtimeMs < 6 * 3600e3){ log("別の更新が実行中（lock）→ 終了"); process.exit(0); }
fs.writeFileSync(LOCK, String(process.pid));
const status = { date: today, started: new Date().toISOString(), updated: [], held: [], failed: [], error: null };
const finish = code => { status.finished = new Date().toISOString(); fs.writeFileSync(path.join(LOGD, "last-run.json"), JSON.stringify(status, null, 1)); try { fs.unlinkSync(LOCK); } catch(e){} process.exit(code); };

(async () => {
  if(PUSH){ sh("git pull --ff-only -q"); }
  const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const DATA = JSON.parse(src.match(/^const DATA = (.*);$/m)[1]);
  const fresh = d => (Date.parse(today) - Date.parse(capOf(d))) / 864e5 < 25;          // 25日以内に調べた都市は対象外
  const targets = ONLY ? DATA.filter(d => d.name + "|" + d.c === ONLY)
    : DATA.map((d, i) => [d, i]).filter(([d]) => !fresh(d)).sort((a, b) => capOf(a[0]).localeCompare(capOf(b[0])) || a[1] - b[1]).slice(0, LIMIT).map(x => x[0]);
  log(`対象 ${targets.length} 都市: ${targets.map(d => d.name).join(", ") || "なし"}`);
  if(!targets.length) return finish(0);

  const browser = await launch();
  try {
    const get = await bookingGetter(browser, log);
    for(const d of targets){
      const t0 = Date.now(); log(`▶ ${d.name}, ${d.c}（前回 ${capOf(d)} ¥${d.med}）`);
      try {
        const r = await surveyCity(get, d, today, d.m, s => log(s));
        const valid = r ? r.m.filter(x => x != null).length : 0, move = r ? r.med / d.med - 1 : 0;
        const rec = { name: d.name, c: d.c, ...r };
        if(!r || valid < 10 || Math.abs(move) > 0.6){
          fs.mkdirSync(HOLD, { recursive: true }); fs.writeFileSync(path.join(HOLD, `${today}-${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`), JSON.stringify(rec, null, 1));
          status.held.push({ city: d.name, valid, move: +move.toFixed(3) }); log(`  ⚠ 要確認で保留（有効${valid}か月・変化${(move * 100).toFixed(0)}%）`); continue;
        }
        fs.mkdirSync(PEND, { recursive: true });
        fs.writeFileSync(path.join(PEND, d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json"), JSON.stringify(rec, null, 1));
        status.updated.push({ city: d.name, from: d.med, to: r.med, cnt: r.cnt });
        log(`  ✓ ¥${d.med} → ¥${r.med}（${((Date.now() - t0) / 60000).toFixed(1)}分）`);
      } catch(e){
        status.failed.push({ city: d.name, error: e.message }); log(`  ✗ ${e.message}`);
        if(/captcha|202/.test(e.message)){ status.error = "Booking にブロックされたため中断"; break; }
      }
    }
  } finally { browser.close(); }

  if(!status.updated.length){ log("反映なし"); if(status.error) notify(status.error); return finish(status.error ? 2 : 0); }
  if(DRY){ log("--dry: 反映しない（tools/pending に残す）"); return finish(0); }
  execSync("node tools/apply-city.js && node tools/build-i18n.js && node tools/build-og.js", { cwd: ROOT, stdio: "inherit" });
  const msg = `価格の定期更新: ${status.updated.length}都市（${status.updated.map(u => u.city).join("・")}）`;
  const langDirs = Object.values(require("./i18n/pages.js")).map(L => L.dir).filter(Boolean);   // 各言語の生成物（en/ zh-tw/ …）
  sh("git add index.html lang.js city country sitemap.xml og tools/slugs.json tools/country-slugs.json tools/pending " + langDirs.join(" "));
  sh(`git commit -q -m ${JSON.stringify(msg + "\n\n自動実行: tools/update-prices.js")}`);
  if(PUSH){ sh("git push -q origin main"); log("push 済み"); }
  if(status.held.length || status.failed.length) notify(`更新 ${status.updated.length}・保留 ${status.held.length}・失敗 ${status.failed.length}`);
  finish(0);
})().catch(e => { status.error = e.message; log("FAILED:", e.message); notify("価格更新が失敗: " + e.message); finish(2); });
