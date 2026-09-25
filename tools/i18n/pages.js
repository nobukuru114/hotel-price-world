// 都市ページ・国ページの文言（言語ごと）。build-pages.js がこの辞書を使って同じロジックから各言語を生成する。
// 言語を足すときはこのファイルにキーを1つ増やすだけでよい（キー＝URL の言語ディレクトリ名）。
const MN_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const ja = {
  htmlLang: "ja", locale: "ja_JP", dir: "", label: "日本語",
  siteName: "4つ星ホテル 世界都市 価格ランキング",
  og: { h1a: "世界の4つ星ホテルは、", h1b: "1泊いくら？", sub: (nc, n) => `${nc}か国${n}都市・Booking.com 実測・12か月の中央値`, kLo: "いちばん安い", kMed: "世界の中央値", kHi: "いちばん高い", city: d => d.ja, alt: "世界の4つ星ホテル 1泊あたりの価格ランキング" },
  booking: "searchresults.ja.html",
  defCur: "JPY",
  num: n => Number(n).toLocaleString("ja-JP"),
  cityName: d => (d.ja && d.ja !== d.name) ? `${d.ja}（${d.name}）` : d.name,
  cityShort: d => d.ja || d.name,
  countryName: k => k.ja,
  monthTh: (i, year) => `${i + 1}月<small>${year}年</small>`,
  month: i => `${i + 1}月`,
  pillLo: "最安", pillHi: "最高",
  // --- 都市ページ ---
  cityTitle: (d, L) => `${L.cityName(d)}の4つ星ホテル料金相場｜月別の実測価格と最安時期`,
  cityDesc: (d, sm, L, yen) => `${L.cityName(d)}の4つ星ホテル宿泊費は年間中央値 ${yen(d.med)}（大人2名1室1泊・税込）。`
    + `最安は${sm.loM}月の${yen(d.lo)}、最高は${sm.hiM}月の${yen(d.hi)}。Booking.comの実勢価格を12か月分実測した月別データ。`,
  citySummary: (d, sm, ctx) => {
    const { money, cname, total, inCountry, L } = ctx;
    let s = `${L.cityName(d)}の4つ星ホテルは、大人2名1室1泊の税込中央値で<b>${money(d.med)}</b>。`;
    s += `世界${total}都市中${d.__rank}番目に安く、${cname}国内では${inCountry}都市中${d.__crank}番目です。`;
    s += `もっとも安いのは<b>${sm.loM}月の${money(d.lo)}</b>、もっとも高いのは<b>${sm.hiM}月の${money(d.hi)}</b>で、その差は${sm.ratio.toFixed(2)}倍。`;
    s += sm.ratio >= 2 ? "季節による振れ幅が大きいため、時期の選び方で宿泊費が倍近く変わります。"
       : sm.ratio >= 1.4 ? "時期を選べば1〜2割は安く泊まれます。"
       : "年間を通して価格は比較的安定しています。";
    return s;
  },
  cityH1: disp => `${disp}の4つ星ホテル料金相場`,
  updLine: (flag, name, captured) => `${flag} ${name}／Booking.com 実測・調査日 ${captured}`,
  statAnnual: "年間中央値", statAnnualSub: "1泊・大人2名・税込",
  statLo: "最安月", statHi: "最高月",
  statSwing: "季節変動", statSwingSub: "最高÷最安",
  statRank: "世界順位", rankVal: n => `${n}位`, statRankSub: (n) => `${n}都市中・安い順`,
  statListed: "掲載数", listedVal: (n, L) => `${L.num(n)}軒`, statListedSub: thin => `4つ星${thin ? "・少なめ" : ""}`,
  monthH2: "月別の宿泊費（1泊あたりの中央値）",
  thMonth: "月", thMedian: "中央値", thVsYear: "年間比", thTrend: "推移",
  monthNote: ap => `各月1日分（第2火曜または第2土曜）の実測値です。1〜9月は2027年、10〜12月は2026年の価格。${ap ? "この都市は検索結果1ページ目の価格中央値で代用しています。" : ""}`,
  cheapH2: disp => `${disp}に安く泊まるなら`,
  cheapLi: (sm, d, money) => [
    `<b>${sm.loM}月</b>がもっとも安く、年間中央値より${Math.round((1 - d.lo / d.med) * 100)}%安い ${money(d.lo)} です。`,
    `<b>${sm.hiM}月</b>はもっとも高く、年間中央値より${Math.round((d.hi / d.med - 1) * 100)}%高い ${money(d.hi)} になります。`,
    `${sm.hiM}月に${sm.loM}月と同じ予算で泊まろうとすると、1泊あたり ${money(d.hi - d.lo)} の差を埋める必要があります。`],
  ctaBook: nm => `Booking.comで${nm}の4つ星ホテルを探す`,
  ctaMap: "地図で見る",
  bkNote: label => `予約リンクの条件: 翌日から3泊・大人1名・1室／${label}（条件は掲載数に応じて自動調整）`,
  ctaNote: captured => `価格は ${captured} 時点の調査値です。最新の料金と空室は予約サイトでご確認ください。`,
  otherCities: name => `${name}の他の都市`,
  allCities: (name, n) => `${name}の全 ${n} 都市と相場をまとめて見る →`,
  similar: "同じくらいの価格帯の都市",
  aboutH2: "このページのデータについて",
  aboutP1: captured => `Booking.com 上で「4つ星」と表示される宿泊施設のうち、空室のあるものの価格中央値です。条件は大人2名・1室・1泊・税込・日本円。2026年10月〜2027年9月の各月から1日ずつ、計12回分を ${captured} に取得しました。`,
  aboutP1c: captured => `Booking.com 上で「4つ星」と表示される宿泊施設のうち、空室のあるものの価格中央値です。条件は大人2名・1室・1泊・税込・日本円。2026年10月〜2027年9月の各月から1日ずつ、計12回分を ${captured} に取得しました。国の代表値は、その国の掲載都市の中央値です。`,
  aboutP2: "星の数は各国の基準による表示のため、同じ4つ星でも国ごとに設備や立地は異なります。5つ星は掲載が1桁の都市が多く中央値が成立しないこと、3つ星は国による品質差が大きいことから、比較の単位として4つ星を採用しています。",
  aboutLinks: "<a href=\"../disclaimer.html#why4\">なぜ4つ星に限定しているのか →</a> ／ <a href=\"../disclaimer.html\">調査方法と免責事項の詳細 →</a>",
  backCity: n => `← ${n}都市の一覧・地図に戻る`,
  backCountry: (n, c) => `← ${n}都市・${c}か国の一覧と地図に戻る`,
  navRank: "ランキング", navCountry: "国・地域別", navAbout: "データについて",
  footRank: "ランキング", footDisc: "免責事項", footPriv: "プライバシーポリシー", footAbout: "運営者情報",
  crumbHome: "世界都市 ホテル価格ランキング",
  // --- 国ページ ---
  countryTitle: (k, L) => `${L.countryName(k)}の4つ星ホテル料金相場｜${k.list.length}都市の価格比較と安い時期`,
  countryDesc: (k, L, yen, cheapest) => `${L.countryName(k)}の4つ星ホテル宿泊費は都市中央値 ${yen(k.mid)}（大人2名1室1泊・税込）。`
    + `もっとも安いのは${L.cityShort(cheapest)}の${yen(cheapest.med)}。${k.list.length}都市を12か月分実測して比較。`,
  countryH1: name => `${name}の4つ星ホテル料金相場`,
  countryLead: (k, ctx) => {
    const { money, name, cheapest, priciest, nCountries, loM, hiM, loV, hiV, L } = ctx;
    return `${name}の4つ星ホテルは、掲載 ${k.list.length} 都市の中央値で<b>${money(k.mid)}</b>（大人2名1室1泊・税込）。
${nCountries}か国中${k.rank}番目に安い国です。もっとも安いのは<b>${L.cityShort(cheapest)}の${money(cheapest.med)}</b>${k.list.length > 1 ? `、もっとも高いのは<b>${L.cityShort(priciest)}の${money(priciest.med)}</b>` : ""}。
国全体では<b>${loM}月</b>がもっとも安く（${money(loV)}）、<b>${hiM}月</b>がもっとも高くなります（${money(hiV)}）。`;
  },
  statCountryMed: "都市中央値", statCountryRankSub: n => `${n}か国中・安い順`,
  statCities: "掲載都市", citiesVal: (n, L) => `${n}都市`, statCitiesSub: (n, L) => `4つ星 計${L.num(n)}軒`,
  statCheapCity: "最安の都市", statLoSeason: "安い時期", statHiSeason: "高い時期",
  cityTableH2: name => `${name}の都市別 相場（安い順）`,
  thCity: "都市", thAnnual: "年間中央値", thSwing: "変動", thListed: "掲載数",
  cityTableNote: "都市名をクリックすると、その都市の月別価格の詳細ページへ移動します。掲載数が30軒を下回る都市は中央値が不安定です。",
  countryMonthH2: name => `${name}全体の月別推移`,
  thCountryMed: "都市中央値",
  countryMonthNote: name => `各月について、${name}の掲載都市の中央値をさらに中央値でまとめた値です。1〜9月は2027年、10〜12月は2026年の実測。`,
  countryCheapH2: name => `${name}に安く泊まるなら`,
  countryCheapLi: ctx => {
    const { money, cheapest, priciest, loM, hiM, loV, hiV, k, L } = ctx;
    const a = [`国内でもっとも安いのは<b>${L.cityShort(cheapest)}</b>の ${money(cheapest.med)} です。<a href="../city/${cheapest.__slug}.html">${L.cityShort(cheapest)}の月別価格を見る →</a>`,
      `時期では<b>${loM}月</b>が底値で、もっとも高い${hiM}月と比べて1泊あたり ${money(hiV - loV)} 安くなります。`];
    if(k.list.length > 1) a.push(`${L.cityShort(priciest)}（${money(priciest.med)}）と${L.cityShort(cheapest)}（${money(cheapest.med)}）では、同じ国内でも ${(priciest.med / cheapest.med).toFixed(1)} 倍の差があります。`);
    return a;
  },
  ctaBookCountry: name => `Booking.comで${name}の4つ星ホテルを探す`,
  nearH2: "相場が近い国・地域",
  nearSub: (money, n) => `${money}・${n}都市`,
  // --- JSON-LD ---
  ldHome: "世界都市 ホテル価格ランキング",
  ldCountry: name => `${name}のホテル相場`,
  ldCity: name => `${name}のホテル相場`,
  ldDatasetCity: (d, L) => `${L.cityName(d)} 4つ星ホテル 月別価格（実測）`,
  ldDatasetCountry: k => `${k.c} 4つ星ホテル 月別価格（実測）`,
  ldItemList: name => `${name} 都市別 4つ星ホテル価格（安い順）`,
  ldVarCity: "4つ星ホテル 1泊料金の中央値",
  ldVarCountry: "4つ星ホテル 1泊料金の都市中央値",
  curAria: "表示通貨",
  curTitle: date => `表示通貨。日本円以外は ${date} 時点のレートで換算した目安`,
  bookTitleJs: '"Booking.com で検索: "+ci.slice(5).replace("-","/")+" から3泊・大人1名"+(a.dataset.bk?"／"+a.dataset.bk:"")',
  bk: { base:["4〜5つ星","口コミ8.0以上","朝食付き","ホテル","中心3km以内"], mid:["無料Wi-Fi","専用バスルーム","ダブルベッド"], ac:"エアコン", top:["フィットネス","眺望"], sep:"・" },
  langLink: "English",
};

const en = {
  htmlLang: "en", locale: "en_US", dir: "en/", label: "English",
  siteName: "4-Star Hotel Prices by City",
  og: { h1a: "What does a 4-star hotel", h1b: "cost per night?", sub: (nc, n) => `${n} cities in ${nc} countries · real Booking.com rates · 12-month median`, kLo: "Cheapest", kMed: "World median", kHi: "Priciest", city: d => d.name, alt: "4-star hotel prices per night in cities around the world" },
  booking: "searchresults.en-gb.html",
  defCur: "USD",
  num: n => Number(n).toLocaleString("en-US"),
  cityName: d => d.name,
  cityShort: d => d.name,
  countryName: k => k.c,
  monthTh: (i, year) => `${MN_EN[i].slice(0,3)}<small>${year}</small>`,
  month: i => MN_EN[i],
  pillLo: "low", pillHi: "high",
  cityTitle: (d, L) => `${d.name} 4-Star Hotel Prices｜Real Monthly Rates and the Cheapest Season`,
  cityDesc: (d, sm, L, yen) => `A 4-star hotel in ${d.name} costs a median of ${yen(d.med)} per night for two adults, taxes included. `
    + `Cheapest in ${MN_EN[sm.loM - 1]} at ${yen(d.lo)}, priciest in ${MN_EN[sm.hiM - 1]} at ${yen(d.hi)}. Measured from real Booking.com rates over twelve months.`,
  citySummary: (d, sm, ctx) => {
    const { money, cname, total, inCountry, L } = ctx;
    let s = `A 4-star hotel in ${d.name} costs a median of <b>${money(d.med)}</b> per night for two adults in one room, taxes included. `;
    s += `That makes it the ${ord(d.__rank)} cheapest of ${total} cities worldwide, and the ${ord(d.__crank)} cheapest of ${inCountry} in ${cname}. `;
    s += `The cheapest month is <b>${MN_EN[sm.loM - 1]} at ${money(d.lo)}</b> and the priciest is <b>${MN_EN[sm.hiM - 1]} at ${money(d.hi)}</b>, a swing of ${sm.ratio.toFixed(2)}×. `;
    s += sm.ratio >= 2 ? "The seasonal swing is wide, so timing your trip can almost halve what you pay."
       : sm.ratio >= 1.4 ? "Choosing the right month saves roughly 10–20%."
       : "Prices stay fairly steady through the year.";
    return s;
  },
  cityH1: disp => `4-Star Hotel Prices in ${disp}`,
  updLine: (flag, name, captured) => `${flag} ${name} · measured on Booking.com, surveyed ${captured}`,
  statAnnual: "Annual median", statAnnualSub: "per night · 2 adults · tax incl.",
  statLo: "Cheapest month", statHi: "Priciest month",
  statSwing: "Seasonal swing", statSwingSub: "highest ÷ lowest",
  statRank: "World rank", rankVal: n => `#${n}`, statRankSub: n => `of ${n} cities, cheapest first`,
  statListed: "Hotels listed", listedVal: (n, L) => L.num(n), statListedSub: thin => `4-star${thin ? " · thin inventory" : ""}`,
  monthH2: "Price by month (median per night)",
  thMonth: "Month", thMedian: "Median", thVsYear: "vs year", thTrend: "Trend",
  monthNote: ap => `One measured night per month, on the second Tuesday or the second Saturday. January to September are 2027; October to December are 2026.${ap ? " For this city the median of the first results page was used instead." : ""}`,
  cheapH2: disp => `Staying in ${disp} for less`,
  cheapLi: (sm, d, money) => [
    `<b>${MN_EN[sm.loM - 1]}</b> is the cheapest month at ${money(d.lo)}, ${Math.round((1 - d.lo / d.med) * 100)}% below the annual median.`,
    `<b>${MN_EN[sm.hiM - 1]}</b> is the priciest at ${money(d.hi)}, ${Math.round((d.hi / d.med - 1) * 100)}% above the annual median.`,
    `Staying in ${MN_EN[sm.hiM - 1]} on a ${MN_EN[sm.loM - 1]} budget means finding ${money(d.hi - d.lo)} more per night.`],
  ctaBook: nm => `Find 4-star hotels in ${nm} on Booking.com`,
  ctaMap: "Open in Maps",
  bkNote: label => `Booking link terms: 3 nights from tomorrow, 1 adult, 1 room; ${label} (adjusted to how many hotels the city lists)`,
  ctaNote: captured => `Prices were surveyed on ${captured}. Check the booking site for current rates and availability.`,
  otherCities: name => `Other cities in ${name}`,
  allCities: (name, n) => `See all ${n} cities in ${name} and their prices →`,
  similar: "Cities in a similar price range",
  aboutH2: "About the data on this page",
  aboutP1: captured => `These are median prices for hotels shown as “4-star” on Booking.com that still had rooms available. The terms are two adults, one room, one night, taxes included, priced in Japanese yen. One date was sampled in each month from October 2026 to September 2027, twelve in total, collected on ${captured}.`,
  aboutP1c: captured => `These are median prices for hotels shown as “4-star” on Booking.com that still had rooms available. The terms are two adults, one room, one night, taxes included, priced in Japanese yen. One date was sampled in each month from October 2026 to September 2027, twelve in total, collected on ${captured}. A country’s figure is the median across its listed cities.`,
  aboutP2: "Star ratings follow each country’s own conventions, so a 4-star hotel differs in facilities and location from place to place. We use 4-star as the unit of comparison because many cities list fewer than ten 5-star hotels, leaving no meaningful median, while 3-star quality varies far too much between countries.",
  aboutLinks: "<a href=\"../disclaimer.html#why4\">Why only 4-star hotels →</a> · <a href=\"../disclaimer.html\">Method and disclaimer in full →</a>",
  backCity: n => `← Back to the list and map of ${n} cities`,
  backCountry: (n, c) => `← Back to the list and map of ${n} cities in ${c} countries`,
  navRank: "Ranking", navCountry: "By country", navAbout: "About the data",
  footRank: "Ranking", footDisc: "Disclaimer", footPriv: "Privacy policy", footAbout: "About this site",
  crumbHome: "World Hotel Price Ranking",
  countryTitle: (k, L) => `4-Star Hotel Prices in ${k.c}｜${k.list.length} Cities Compared and the Cheapest Season`,
  countryDesc: (k, L, yen, cheapest) => `A 4-star hotel in ${k.c} costs a median of ${yen(k.mid)} per night across its cities, for two adults with taxes included. `
    + `The cheapest is ${cheapest.name} at ${yen(cheapest.med)}. ${k.list.length} cities measured over twelve months.`,
  countryH1: name => `4-Star Hotel Prices in ${name}`,
  countryLead: (k, ctx) => {
    const { money, name, cheapest, priciest, nCountries, loM, hiM, loV, hiV, L } = ctx;
    return `Across its ${k.list.length} listed cities, a 4-star hotel in ${name} costs a median of <b>${money(k.mid)}</b> per night for two adults, taxes included.
That is the ${ord(k.rank)} cheapest of ${nCountries} countries. The cheapest city is <b>${cheapest.name} at ${money(cheapest.med)}</b>${k.list.length > 1 ? `, and the priciest is <b>${priciest.name} at ${money(priciest.med)}</b>` : ""}.
Country-wide, <b>${MN_EN[loM - 1]}</b> is the cheapest month (${money(loV)}) and <b>${MN_EN[hiM - 1]}</b> the priciest (${money(hiV)}).`;
  },
  statCountryMed: "Median across cities", statCountryRankSub: n => `of ${n} countries, cheapest first`,
  statCities: "Cities listed", citiesVal: (n, L) => `${n}`, statCitiesSub: (n, L) => `${L.num(n)} 4-star hotels in total`,
  statCheapCity: "Cheapest city", statLoSeason: "Cheapest season", statHiSeason: "Priciest season",
  cityTableH2: name => `Cities in ${name}, cheapest first`,
  thCity: "City", thAnnual: "Annual median", thSwing: "Swing", thListed: "Listed",
  cityTableNote: "Click a city for its month-by-month page. Where fewer than 30 hotels are listed, the median is unstable.",
  countryMonthH2: name => `Month-by-month across ${name}`,
  thCountryMed: "Median across cities",
  countryMonthNote: name => `For each month this is the median of the city medians in ${name}. January to September are 2027; October to December are 2026.`,
  countryCheapH2: name => `Staying in ${name} for less`,
  countryCheapLi: ctx => {
    const { money, cheapest, priciest, loM, hiM, loV, hiV, k } = ctx;
    const a = [`The cheapest city is <b>${cheapest.name}</b> at ${money(cheapest.med)}. <a href="../city/${cheapest.__slug}.html">See month-by-month prices for ${cheapest.name} →</a>`,
      `<b>${MN_EN[loM - 1]}</b> is the low point, ${money(hiV - loV)} per night below the peak in ${MN_EN[hiM - 1]}.`];
    if(k.list.length > 1) a.push(`${priciest.name} (${money(priciest.med)}) costs ${(priciest.med / cheapest.med).toFixed(1)}× what ${cheapest.name} does (${money(cheapest.med)}), within the same country.`);
    return a;
  },
  ctaBookCountry: name => `Find 4-star hotels in ${name} on Booking.com`,
  nearH2: "Countries with similar prices",
  nearSub: (money, n) => `${money} · ${n} cities`,
  ldHome: "World Hotel Price Ranking",
  ldCountry: name => `Hotel prices in ${name}`,
  ldCity: name => `Hotel prices in ${name}`,
  ldDatasetCity: (d) => `${d.name} 4-star hotel prices by month (measured)`,
  ldDatasetCountry: k => `${k.c} 4-star hotel prices by month (measured)`,
  ldItemList: name => `4-star hotel prices by city in ${name}, cheapest first`,
  ldVarCity: "Median nightly rate, 4-star hotels",
  ldVarCountry: "Median nightly rate across cities, 4-star hotels",
  curAria: "Display currency",
  curTitle: date => `Display currency. Anything other than yen is converted at the rate on ${date}, as a guide only`,
  bookTitleJs: '"Search on Booking.com: 3 nights from "+ci+", 1 adult"+(a.dataset.bk?"; "+a.dataset.bk:"")',
  bk: { base:["4–5 star","review score 8.0+","breakfast included","hotels only","within 3 km of centre"], mid:["free Wi-Fi","private bathroom","double bed"], ac:"air conditioning", top:["fitness centre","a view"], sep:", " },
  langLink: "日本語",
};

function ord(n){
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = { ja, en };
