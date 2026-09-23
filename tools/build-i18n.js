#!/usr/bin/env node
// index.html（日本語＝正本）から各言語のトップページ <lang>/index.html を生成する。
// 訳は tools/i18n/<lang>.js の pairs（原文 → 訳）。原文が見つからない／件数が合わない場合はビルドを止める。
// 使い方: node tools/build-i18n.js
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const LANGS = ["en"];

const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const count = (h, n) => h.split(n).length - 1;

LANGS.forEach(code => {
  const L = require(`./i18n/${code}.js`);
  let out = src;
  const miss = [];
  L.pairs.forEach(([from, to, n]) => {
    const want = n || 1, got = count(out, from);
    if (got !== want) { miss.push(`${got}/${want}: ${from.slice(0, 60)}`); return; }
    out = out.split(from).join(to);
  });
  if (miss.length) {
    console.error(`[${code}] 訳の対応が取れない原文が ${miss.length} 件あります（index.html を直したら tools/i18n/${code}.js も直してください）:`);
    miss.forEach(m => console.error("  " + m));
    process.exit(1);
  }

  // 通貨名を各言語に差し替え
  const m = out.match(/^const CURS = (.*);$/m);
  if (!m) throw new Error("CURS not found");
  const CURS = eval("(" + m[1] + ")");
  const translated = Object.fromEntries(Object.entries(CURS).map(([k, v]) => [k, [v[0], L.currencyNames[k] || k]]));
  out = out.replace(m[0], "const CURS = " + JSON.stringify(translated) + ";");

  // 言語リンクと案内バー
  out = out.replace('<a class="langlink" id="langlink" href="en/" hreflang="en">English</a>',
                    '<a class="langlink" id="langlink" href="../" hreflang="ja">日本語</a>');
  out = out.replace('  const HERE = "ja";', `  const HERE = ${JSON.stringify(L.htmlLang)};`);
  out = out.replace('  const OTHER = { code:"en", href:"en/", label:"English", msg:"This page is also available in English." };',
                    '  const OTHER = { code:"ja", href:"../", label:"日本語", msg:"このページは日本語でもご覧いただけます。" };');

  // 生成ページへの相対リンクはそのまま（/en/city/... が存在する）。書き出し。
  const dir = path.join(ROOT, code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), out);

  // 残っている日本語の検査（データ・コメントは除く）
  const DATA_RE = /^const (DATA|CJ|SLUG|CSLUG|RATES|CURS) = /;
  const J = /[぀-ヿ一-鿿]/;
  const left = out.split("\n").map((l, i) => [i + 1, l])
    .filter(([, l]) => !DATA_RE.test(l))
    .map(([i, l]) => [i, l.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "")])
    .filter(([, l]) => J.test(l))
    .filter(([, l]) => !/日本語|ja-JP|hreflang="ja"|lang="ja"/.test(l));
  console.log(`${code}/index.html: ${(out.length / 1024 | 0)}KB / 未訳の日本語行 ${left.length}`);
  left.slice(0, 20).forEach(([i, l]) => console.log("  L" + i + " " + l.trim().slice(0, 100)));
  if (left.length) process.exitCode = 1;
});
