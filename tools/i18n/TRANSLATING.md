# 言語を1つ足す手順（翻訳の仕様・正本）

英語版（`en`）を手本に、新しい言語 `<code>`（例 `zh-tw`）を足す。**英語を訳す**（日本語の原文も参照してよい）。
作るファイルは次の 6 つ。書き終えたら `node tools/i18n/check.js <code>` が 0 エラーになるまで直す。

| # | ファイル | 手本 | 中身 |
|---|---|---|---|
| 1 | `tools/i18n/pages/<code>.js` | `tools/i18n/pages.js` の `const en = {…}` | 都市/国ページの文言。**en と同じキーをすべて持つ**（多くても少なくてもビルドが止まる） |
| 2 | `tools/i18n/<code>.js` | `tools/i18n/en.js` | トップページの訳（`pairs` = [日本語の原文, 訳, 出現回数?]）と `currencyNames` |
| 3 | `tools/i18n/names/<code>.json` | `node tools/i18n/check.js <code> --cities` の出力 | 都市名 `{"Bangkok|Thailand": "曼谷", …}`（全348都市） |
| 4〜6 | `<dir>/disclaimer.html`・`privacy.html`・`about.html` | `en/` の同名ファイル | 法務ページ |

## 1. `tools/i18n/pages/<code>.js`
- `module.exports = { … }` で1つのオブジェクトを出す。月名などの補助は同じファイル内に定義する。
- 属性: `htmlLang`（BCP47。例 `zh-Hant`）/ `locale`（OGP。例 `zh_TW`）/ `dir`（`"<code>/"`）/ `label`（その言語での自称。例 `繁體中文`）/ `langMsg`（「このページは◯◯語でもご覧いただけます。」をその言語で）/ `booking`（`searchresults.<booking の言語コード>.html`）/ `defCur`（既定の表示通貨）/ `num`（`toLocaleString` のロケール）。
- **名前は必ず次を使う**（英語版の `d.name` / `k.c` / `cheapest.name` をそのまま使わない）:
  - 都市名 = `d.__ln`（`cheapest.__ln`・`priciest.__ln` も同様）。英語名は `d.name`
  - 国名 = `k.__lc`。関数の引数で渡る `name`・`cname` はすでに訳済みの国名
  - `cityName: d => d.__ln !== d.name ? \`${d.__ln}（${d.name}）\` : d.name`（ラテン文字以外の言語は英語名を括弧で添える。ラテン文字の言語は `d => d.__ln`）
  - `cityShort: d => d.__ln` / `countryName: k => k.__lc` / `og.city: d => d.__ln`
- 関数の引数・戻り値の形・HTML タグ・`${…}` の式は英語版と同じに保つ。変えるのは人が読む文字だけ。
- 序数（英語の `ord()`）はその言語の自然な形に（中国語「第12」、韓国語「12번째」など）。
- `bookTitleJs` は JavaScript の式を文字列にしたもの。式の形は変えず、引用符内の文字だけ訳す。

## 2. `tools/i18n/<code>.js`
- `en.js` の `pairs` を**全部**同じ順で持つ。左（日本語の原文）は1文字も変えない（`build-i18n.js` が index.html 内の出現回数を検査する）。右を訳す。
- 次の行は英語版と違う「コード」にする（言語コード・ロケールは自分の言語のものに）:

| 左（原文）の内容 | 右に書くもの |
|---|---|
| `<html lang="ja">` | `<html lang="<htmlLang>">`（アラビア語は `dir="rtl"` も付ける） |
| canonical / og:url | `…/hotel-price-world/<dir>` |
| og:locale | `<locale>` |
| `const jname = …` | `const jname = d => LN[d.name + "\|" + d.c] \|\| d.name;` |
| `const ename = …` | ラテン文字の言語は `const ename = d => "";`、それ以外は原文と同じ（英語名を小さく添える） |
| `const cname = …` | `const cname = d => LC[d.c] \|\| d.c;` |
| `const jaName = …` | `const jaName = r => LC[r.c] \|\| r.c;` |
| `const jp = CJ[c]?CJ[c].ja:c, …` | `const jp = LC[c] \|\| c, fl = CJ[c]?CJ[c].f:"", b=BANDS[bandOf(mid)];` |
| `const jp = CJ[mapFocus]?…` | `const jp = LC[mapFocus] \|\| mapFocus, fl = CJ[mapFocus]?CJ[mapFocus].f:"";` |
| 国セレクトの `<option>` | `…${CJ[c]?CJ[c].f+" "+(LC[c]\|\|c):c}…` |
| `localeCompare(…, "ja")` 系 3行 | `LC` の名前で、ロケールを `<htmlLang>` にして比較 |
| `monthLabel` | その言語の月名配列 `MN` を定義し、「（今月）」「（来月）」も訳す |
| `toLocaleString("ja-JP")` 系 | `toLocaleString("<num のロケール>")` |
| `searchresults.ja.html` | `searchresults.<booking の言語コード>.html` |

- 英語だけに必要な CSS の行（`#rank th,.floathead th…` の折り返し指定）は、見出しが長くなる言語だけ入れる。入れないなら**その pair を丸ごと省く**（check.js は省略を許す）。
- `LN`（都市名）と `LC`（国名）は `build-i18n.js` が自動で差し込む。国名は CLDR（`Intl.DisplayNames`）から自動で出るので訳さない。

## 3. `tools/i18n/names/<code>.json`
- `node tools/i18n/check.js <code> --cities` が「キー・英語名・日本語名」の一覧を出す。キーは変えない。
- その言語の読者が普段使う表記（台湾なら台湾の慣用、例 シドニー=雪梨・ソウル=首爾）。自信がない都市は英語名のままにする（誤訳より英語名）。

## 4〜6. 法務ページ
- `en/` の3ファイルを訳す。`<html lang>`・canonical・`<title>`・description を自分の言語に。
- `<!-- hreflang:start … -->〜<!-- hreflang:end -->` のブロックと `<script src="../lang.js" defer>` は残す（中身は build-i18n.js が書き換える）。
- リンク先（`./`・`disclaimer.html` など）は変えない。日付は英語版と同じ日付をその言語の書式で。

## 仕上げ（翻訳者は実行しない。統合側が行う）
`node tools/build-pages.js && node tools/build-i18n.js && node tools/build-og.js` → ブラウザで確認 → コミット。
