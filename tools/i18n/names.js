// 言語ごとの都市名・国名。
//   都市名: tools/i18n/names/<言語>.json（{"name|c": "現地語の都市名"}）。無い都市は英語名。
//   国名  : Intl.DisplayNames（ブラウザ/Node 内蔵の CLDR）。CJ の国旗から ISO コードを出す。上書きは names/<言語>.json の "@国名" キー。
// 日本語は DATA.ja / CJ.ja、英語は DATA.name / c をそのまま使うため、この仕組みは ja・en 以外の言語で使う。
const fs = require("fs"), path = require("path");
const isoOf = flag => [...(flag || "")].map(ch => String.fromCharCode(ch.codePointAt(0) - 0x1F1E6 + 65)).join("");
function localNames(code, htmlLang, DATA, CJ){
  const f = path.join(__dirname, "names", code + ".json");
  const map = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  const dn = new Intl.DisplayNames([htmlLang], { type: "region" });
  const LN = {}, LC = {};
  DATA.forEach(d => { const k = d.name + "|" + d.c; if(map[k]) LN[k] = map[k]; });
  Object.keys(CJ).forEach(c => { let n = map["@" + c]; if(!n){ try { const iso = isoOf(CJ[c].f); if(iso.length === 2) n = dn.of(iso); } catch(e){} }
    if(n && n !== isoOf(CJ[c].f)) LC[c] = n; });
  const missing = DATA.filter(d => !LN[d.name + "|" + d.c]).map(d => d.name + "|" + d.c);
  return { LN, LC, missing };
}
module.exports = { localNames, isoOf };
