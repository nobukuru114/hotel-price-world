// 繁體中文（台灣‧香港）版 都市ページ‧国ページの文言。tools/i18n/pages.js の en を手本に作成。
module.exports = {
  htmlLang: "zh-Hant", locale: "zh_TW", dir: "zh-tw/", label: "繁體中文", langMsg: "本頁面也提供繁體中文版。",
  siteName: "四星級飯店房價 全球城市排名",
  og: { h1a: "全球四星級飯店，", h1b: "一晚多少錢？", sub: (nc, n) => `${nc}個國家／地區‧${n}座城市‧Booking.com 實測‧12個月中位數`, kLo: "最便宜", kMed: "全球中位數", kHi: "最貴", city: d => d.__ln, alt: "全球城市四星級飯店 每晚房價排名" },
  booking: "searchresults.zh-tw.html",
  defCur: "TWD",
  num: n => Number(n).toLocaleString("zh-TW"),
  cityName: d => d.__ln !== d.name ? `${d.__ln}（${d.name}）` : d.name,
  cityShort: d => d.__ln,
  countryName: k => k.__lc,
  monthTh: (i, year) => `${i + 1}月<small>${year}</small>`,
  month: i => `${i + 1}月`,
  pillLo: "最低", pillHi: "最高",
  // --- 都市頁 ---
  cityTitle: (d, L) => `${L.cityName(d)}四星級飯店房價行情｜每月實測價格與最便宜季節`,
  cityDesc: (d, sm, L, yen) => `${L.cityName(d)}的四星級飯店，年度中位數為每晚 ${yen(d.med)}（2大人1房、含稅）。`
    + `最便宜是${sm.loM}月的 ${yen(d.lo)}，最貴是${sm.hiM}月的 ${yen(d.hi)}。以 Booking.com 實測價格製作的12個月月度資料。`,
  citySummary: (d, sm, ctx) => {
    const { money, cname, total, inCountry, L } = ctx;
    let s = `${L.cityName(d)}的四星級飯店，2大人1房、每晚含稅中位數為<b>${money(d.med)}</b>。`;
    s += `在全球${total}座城市中排名第${d.__rank}便宜，在${cname}國內${inCountry}座城市中排名第${d.__crank}。`;
    s += `最便宜的是<b>${sm.loM}月的${money(d.lo)}</b>，最貴的是<b>${sm.hiM}月的${money(d.hi)}</b>，相差${sm.ratio.toFixed(2)}倍。`;
    s += sm.ratio >= 2 ? "季節波動很大，選對時間入住房價可能相差將近一半。"
       : sm.ratio >= 1.4 ? "選對月份入住，大約可省一到兩成。"
       : "全年房價相對穩定。";
    return s;
  },
  cityH1: disp => `${disp}四星級飯店房價行情`,
  updLine: (flag, name, captured) => `${flag} ${name}／Booking.com 實測‧調查日期 ${captured}`,
  statAnnual: "年度中位數", statAnnualSub: "每晚‧2大人‧含稅",
  statLo: "最便宜月份", statHi: "最貴月份",
  statSwing: "季節波動", statSwingSub: "最高÷最低",
  statRank: "全球排名", rankVal: n => `第${n}名`, statRankSub: (n) => `共${n}座城市‧由便宜到貴排序`,
  statListed: "上架家數", listedVal: (n, L) => `${L.num(n)}間`, statListedSub: thin => `四星級${thin ? "‧數量偏少" : ""}`,
  monthH2: "每月房價（每晚中位數）",
  thMonth: "月份", thMedian: "中位數", thVsYear: "較年度", thTrend: "趨勢",
  monthNote: ap => `每月取1晚實測值（第2個星期二或第2個星期六）。年份標示於各列（自調查日起算的未來12個月）。${ap ? "此城市改以搜尋結果第1頁的價格中位數代替。" : ""}`,
  cheapH2: disp => `想省錢入住${disp}`,
  cheapLi: (sm, d, money) => [
    `<b>${sm.loM}月</b>最便宜，比年度中位數低${Math.round((1 - d.lo / d.med) * 100)}%，為 ${money(d.lo)}。`,
    `<b>${sm.hiM}月</b>最貴，比年度中位數高${Math.round((d.hi / d.med - 1) * 100)}%，為 ${money(d.hi)}。`,
    `若想在${sm.hiM}月以${sm.loM}月的預算入住，每晚需多準備 ${money(d.hi - d.lo)}。`],
  ctaBook: nm => `在 Booking.com 搜尋${nm}的四星級飯店`,
  ctaMap: "在地圖上查看",
  bkNote: label => `預約連結條件：明天起連住3晚‧大人1名‧1間房／${label}（依上架家數自動調整條件）`,
  ctaNote: captured => `價格為 ${captured} 的調查數值。實際房價與空房請至訂房網站確認。`,
  otherCities: name => `${name}的其他城市`,
  allCities: (name, n) => `查看${name}全部 ${n} 座城市與房價 →`,
  similar: "價格相近的城市",
  aboutH2: "本頁資料說明",
  aboutP1: captured => `這是 Booking.com 上顯示為「四星級」且尚有空房之住宿的價格中位數。條件為2大人‧1房‧1晚‧含稅‧以日圓計價。自調查日（${captured}）起，未來12個月每月各取1個日期，共12筆。`,
  aboutP1c: captured => `這是 Booking.com 上顯示為「四星級」且尚有空房之住宿的價格中位數。條件為2大人‧1房‧1晚‧含稅‧以日圓計價。自各城市調查日起，未來12個月每月各取1個日期，共12筆（此國家最新調查日為 ${captured}）。國家的數值為其上架城市的中位數。`,
  aboutP2: "星級評等依各國自訂標準，因此同樣是四星級，設備與地段也會因國家而異。5星級在許多城市上架數僅個位數，中位數難以成立；3星級則因國家間品質落差過大。因此以四星級作為比較的共同單位。",
  aboutLinks: "<a href=\"../disclaimer.html#why4\">為什麼只比較四星級飯店 →</a> ／ <a href=\"../disclaimer.html\">調查方法與免責聲明詳情 →</a>",
  backCity: n => `← 返回${n}座城市的列表與地圖`,
  backCountry: (n, c) => `← 返回${n}座城市‧${c}個國家／地區的列表與地圖`,
  navRank: "排名", navCountry: "依國家／地區", navAbout: "關於資料",
  footRank: "排名", footDisc: "免責聲明", footPriv: "隱私權政策", footAbout: "關於本站",
  crumbHome: "全球城市飯店價格排名",
  // --- 国頁 ---
  countryTitle: (k, L) => `${L.countryName(k)}四星級飯店房價行情｜${k.list.length}座城市比較與便宜季節`,
  countryDesc: (k, L, yen, cheapest) => `${L.countryName(k)}的四星級飯店，城市中位數為每晚 ${yen(k.mid)}（2大人1房、含稅）。`
    + `最便宜是${L.cityShort(cheapest)}的 ${yen(cheapest.med)}。實測${k.list.length}座城市12個月資料進行比較。`,
  countryH1: name => `${name}四星級飯店房價行情`,
  countryLead: (k, ctx) => {
    const { money, name, cheapest, priciest, nCountries, loM, hiM, loV, hiV, L } = ctx;
    return `${name}上架的 ${k.list.length} 座城市中，四星級飯店中位數為每晚<b>${money(k.mid)}</b>（2大人1房、含稅）。
在${nCountries}個國家／地區中排名第${k.rank}便宜。最便宜的城市是<b>${L.cityShort(cheapest)}的${money(cheapest.med)}</b>${k.list.length > 1 ? `，最貴的是<b>${L.cityShort(priciest)}的${money(priciest.med)}</b>` : ""}。
就全國而言，<b>${loM}月</b>最便宜（${money(loV)}），<b>${hiM}月</b>最貴（${money(hiV)}）。`;
  },
  statCountryMed: "城市中位數", statCountryRankSub: n => `共${n}個國家／地區‧由便宜到貴排序`,
  statCities: "上架城市", citiesVal: (n, L) => `${n}座城市`, statCitiesSub: (n, L) => `四星級共${L.num(n)}間`,
  statCheapCity: "最便宜城市", statLoSeason: "便宜季節", statHiSeason: "昂貴季節",
  cityTableH2: name => `${name}各城市房價（由便宜到貴）`,
  thCity: "城市", thAnnual: "年度中位數", thSwing: "波動", thListed: "上架數",
  cityTableNote: "點擊城市名稱可前往該城市的月度房價詳情頁。上架數低於30間的城市，中位數較不穩定。",
  countryMonthH2: name => `${name}整體月度趨勢`,
  thCountryMed: "城市中位數",
  countryMonthNote: name => `每個月的數值，是${name}各上架城市中位數再取中位數而成。年份標示於各列（自此國家最新調查日起算的未來12個月）。`,
  countryCheapH2: name => `想省錢入住${name}`,
  countryCheapLi: ctx => {
    const { money, cheapest, priciest, loM, hiM, loV, hiV, k } = ctx;
    const a = [`國內最便宜的城市是<b>${cheapest.__ln}</b>，房價 ${money(cheapest.med)}。<a href="../city/${cheapest.__slug}.html">查看${cheapest.__ln}的每月房價 →</a>`,
      `<b>${loM}月</b>是價格低點，比最貴的${hiM}月每晚便宜 ${money(hiV - loV)}。`];
    if(k.list.length > 1) a.push(`${priciest.__ln}（${money(priciest.med)}）與${cheapest.__ln}（${money(cheapest.med)}）相比，同一國內也有 ${(priciest.med / cheapest.med).toFixed(1)} 倍的差距。`);
    return a;
  },
  ctaBookCountry: name => `在 Booking.com 搜尋${name}的四星級飯店`,
  nearH2: "價格相近的國家／地區",
  nearSub: (money, n) => `${money}‧${n}座城市`,
  // --- JSON-LD ---
  ldHome: "全球城市飯店價格排名",
  ldCountry: name => `${name}的飯店房價行情`,
  ldCity: name => `${name}的飯店房價行情`,
  ldDatasetCity: (d, L) => `${L.cityName(d)} 四星級飯店 每月房價（實測）`,
  ldDatasetCountry: k => `${k.__lc} 四星級飯店 每月房價（實測）`,
  ldItemList: name => `${name} 各城市四星級飯店房價（由便宜到貴）`,
  ldVarCity: "四星級飯店每晚房價中位數",
  ldVarCountry: "四星級飯店各城市房價中位數",
  curAria: "顯示幣別",
  curTitle: date => `顯示幣別。新台幣以外的幣別，皆以 ${date} 當時匯率換算，僅供參考`,
  bookTitleJs: '"在 Booking.com 搜尋：入住日 "+ci+" 起連住3晚‧1位大人"+(a.dataset.bk?"／"+a.dataset.bk:"")',
  bk: { base:["4～5星","評分8.0以上","含早餐","僅限飯店","市中心3公里內"], mid:["免費Wi-Fi","獨立衛浴","雙人床"], ac:"空調", top:["健身房","景觀"], sep:"、" },
  langLink: "English",
};
