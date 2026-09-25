// 生成ファイル（tools/build-i18n.js が tools/i18n/pages.js から作る）。直接編集しない。
// 言語メニュー／前回選んだ言語への移動／初回だけブラウザ言語に合わせた案内バー（強制リダイレクトはしない）。
(function(){
  var LS = [{"k":"ja","h":"ja","d":"","l":"日本語","m":"このページは日本語でもご覧いただけます。","t":1},{"k":"en","h":"en","d":"en/","l":"English","m":"This page is also available in English.","t":1},{"k":"zh-tw","h":"zh-Hant","d":"zh-tw/","l":"繁體中文","m":"本頁面也提供繁體中文版。","t":1}];
  var s = document.currentScript, base = s ? s.src.replace(/lang\.js(\?.*)?$/, "") : "", here = null, i;
  for(i = 0; i < LS.length; i++) if(LS[i].h === document.documentElement.lang) here = LS[i];
  if(!here || !base) return;
  var rest = location.href.split("#")[0].split("?")[0];
  rest = rest.indexOf(base) === 0 ? rest.slice(base.length) : "";
  if(here.d && rest.indexOf(here.d) === 0) rest = rest.slice(here.d.length);
  var avail = []; for(i = 0; i < LS.length; i++) if(LS[i].t || rest !== "" && rest !== "index.html") avail.push(LS[i]);
  function url(x){ return base + x.d + rest + location.hash; }
  function save(k){ try{ localStorage.setItem("lang", k); }catch(e){} }
  var sel = document.createElement("select");
  sel.className = "cursel langsel"; sel.setAttribute("aria-label", "Language / 言語");
  sel.innerHTML = avail.map(function(x){ return '<option value="' + x.k + '" lang="' + x.h + '"' + (x === here ? " selected" : "") + ">" + x.l + "</option>"; }).join("");
  sel.addEventListener("change", function(){ for(var j = 0; j < avail.length; j++) if(avail[j].k === sel.value){ save(avail[j].k); location.href = url(avail[j]); } });
  var slot = document.getElementById("langslot");
  if(slot) slot.parentNode.replaceChild(sel, slot); else { var tb = document.querySelector(".tbwrap"); if(tb) tb.appendChild(sel); }
  var saved = null; try{ saved = localStorage.getItem("lang"); }catch(e){}
  if(saved && saved !== here.k){ for(i = 0; i < avail.length; i++) if(avail[i].k === saved){ location.replace(url(avail[i])); return; } }
  if(saved) return;
  function find(h){ for(var j = 0; j < avail.length; j++) if(avail[j].h.toLowerCase() === h.toLowerCase()) return avail[j]; return null; }
  function match(p){ var pr = p.split("-")[0];
    if(pr === "zh") return find(/-(tw|hk|mo|hant)/.test(p) ? "zh-Hant" : "zh-Hans");
    if(pr === "pt") return find("pt-BR");
    for(var j = 0; j < avail.length; j++) if(avail[j].h.toLowerCase().split("-")[0] === pr) return avail[j]; return null; }
  var pref = navigator.languages || [navigator.language || ""], best = null;
  for(i = 0; i < pref.length && !best; i++) best = match(String(pref[i]).toLowerCase());
  if(!best || best === here) return;
  var bar = document.createElement("div"); bar.className = "langbar"; bar.lang = best.h;
  bar.innerHTML = '<div class="wrap"><span>' + best.m + '</span> <a href="' + url(best) + '" hreflang="' + best.h + '">' + best.l + ' →</a><button type="button" aria-label="close">×</button></div>';
  bar.querySelector("a").addEventListener("click", function(){ save(best.k); });
  bar.querySelector("button").addEventListener("click", function(){ save(here.k); bar.parentNode.removeChild(bar); });
  var anchor = document.querySelector(".hero") || document.querySelector(".wrap");
  if(anchor) anchor.parentNode.insertBefore(bar, anchor);
})();
