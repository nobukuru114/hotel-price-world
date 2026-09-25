// インストール済みの Google Chrome をヘッドレスで起動し、DevTools プロトコル（CDP）で操作する最小クライアント。
// 追加パッケージ不要（Node 22+ の組み込み WebSocket / fetch を使用）。
// Booking.com は素の HTTP に 202（ボット確認）を返すため、実ブラウザのページ内 fetch で取得する。
const { spawn } = require("child_process"), os = require("os"), path = require("path");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch({ port = 9333, profile = path.join(os.homedir(), "Library/Caches/hotel-price-world/chrome") } = {}) {
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--window-size=1366,900", "--lang=ja-JP",
    "--user-agent=" + UA, "about:blank"], { stdio: "ignore" });
  const base = `http://127.0.0.1:${port}`;
  for(let i = 0; ; i++){
    try { await (await fetch(base + "/json/version")).json(); break; }
    catch(e){ if(i > 75) { proc.kill(); throw new Error("Chrome が起動しない: " + CHROME); } await sleep(200); }
  }
  const t = await (await fetch(base + "/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((ok, ng) => { ws.onopen = ok; ws.onerror = ng; });
  let seq = 0; const waiting = new Map(), listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if(m.id && waiting.has(m.id)){ const { ok, ng } = waiting.get(m.id); waiting.delete(m.id); m.error ? ng(new Error(m.error.message)) : ok(m.result); }
    else if(m.method) listeners.slice().forEach(f => f(m));
  };
  const send = (method, params = {}) => new Promise((ok, ng) => { const id = ++seq; waiting.set(id, { ok, ng }); ws.send(JSON.stringify({ id, method, params })); });
  const once = (method, ms) => new Promise(ok => { const f = m => { if(m.method === method){ listeners.splice(listeners.indexOf(f), 1); ok(true); } };
    listeners.push(f); setTimeout(() => { const i = listeners.indexOf(f); if(i >= 0){ listeners.splice(i, 1); ok(false); } }, ms); });
  await send("Page.enable");

  async function navigate(url, settleMs = 4000){
    const loaded = once("Page.loadEventFired", 45000);
    await send("Page.navigate", { url }); await loaded; await sleep(settleMs);
  }
  async function evaluate(expression){
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout: 60000 });
    if(r.exceptionDetails) throw new Error("evaluate: " + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  }
  function close(){ try { ws.close(); } catch(e){} proc.kill(); }
  return { navigate, evaluate, close };
}
module.exports = { launch, sleep };

// Booking.com 検索結果の取得関数を作る。ページ内 fetch（同一オリジン・Cookie 付き）で HTML を取り、h1 だけ返す。
// 202（ボット確認）ならそのURLを実際に開いて確認を通してから再試行する。
async function bookingGetter(browser, log = () => {}){
  await browser.navigate("https://www.booking.com/index.ja.html", 5000);
  return async function get(url){
    for(let attempt = 1; attempt <= 4; attempt++){
      const r = await browser.evaluate(`fetch(${JSON.stringify(url)}, {credentials:"include"}).then(async res => {
        const t = await res.text(), h = t.match(/<h1[^>]*>([^<]*)<\\/h1>/);
        return { status: res.status, h1: h ? h[1] : null, place: h ? h[1].split("：")[0] : null,
                 captcha: /px-captcha|challenge-platform|captcha-delivery/i.test(t) && !/軒が見つかりました/.test(t) }; })`);
      if(r.status === 200) return r;
      log(`    status ${r.status} → ページを開いて再試行 (${attempt})`);
      await browser.navigate(url, 8000 * attempt);
    }
    throw new Error("202 が解消しない");
  };
}
module.exports.bookingGetter = bookingGetter;
