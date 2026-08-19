(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Аккордеон: раскрытие на CSS (grid-template-rows), JS только тоггл ---------- */
  document.querySelectorAll(".acc-head").forEach(function(head){
    head.addEventListener("click", function(){
      var open = head.parentElement.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- Судебная практика: вкладки ---------- */
  var pStrip = document.querySelector(".ptabs-strip");
  if(pStrip){
    var pTabs = [].slice.call(pStrip.querySelectorAll(".ptab"));
    function showTab(i){
      pTabs.forEach(function(t, k){
        var on = k === i;
        t.classList.toggle("on", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
        if(on && pStrip.scrollWidth > pStrip.clientWidth){
          /* на узком экране лента прокручивается — подтягиваем выбранную вкладку */
          pStrip.scrollTo({left: t.offsetLeft - 16, behavior: reduce ? "auto" : "smooth"});
        }
      });
    }
    pTabs.forEach(function(t, i){
      t.addEventListener("click", function(){ showTab(i); });
      t.addEventListener("keydown", function(e){
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if(!d) return;
        e.preventDefault();
        var n = (i + d + pTabs.length) % pTabs.length;
        showTab(n); pTabs[n].focus();
      });
    });
  }

  /* ---------- Мобильное меню ---------- */
  var burgers = document.querySelectorAll(".burger");
  function setMenu(open){
    document.body.classList.toggle("menu-open", open);
    burgers.forEach(function(b){
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
  }
  burgers.forEach(function(b){
    b.addEventListener("click", function(){ setMenu(!document.body.classList.contains("menu-open")); });
  });
  document.querySelectorAll(".mobile-nav a").forEach(function(a){
    a.addEventListener("click", function(){ setMenu(false); });
  });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") setMenu(false); });

  /* высота мобильной панели → в переменную, чтобы меню не зависело от магического числа */
  var mbar = document.querySelector(".mobile-bar");
  function syncBarHeight(){
    if(!mbar) return;
    var h = mbar.offsetHeight;
    if(h) {
      document.documentElement.style.setProperty("--mbar-h", h + "px");
      var mn = document.querySelector(".mobile-nav");
      if(mn){ mn.style.top = h + "px"; mn.style.maxHeight = "calc(100dvh - " + h + "px)"; }
    }
  }
  syncBarHeight();
  window.addEventListener("resize", syncBarHeight, {passive:true});

  /* ---------- Тень у липкой навигации ---------- */
  var nav = document.querySelector(".nav");
  if(nav){
    var navTop = nav.offsetTop;
    var onNavScroll = function(){
      nav.classList.toggle("stuck", (window.pageYOffset || document.documentElement.scrollTop) > navTop);
    };
    window.addEventListener("scroll", onNavScroll, {passive:true});
    onNavScroll();
  }

  /* ---------- Карусели (услуги + решения судов) ---------- */
  document.querySelectorAll("[data-car]").forEach(function(wrap){
    var track = wrap.querySelector(".car-track");
    if(!track) return;
    var thumb = wrap.querySelector(".car-thumb");
    var stepSize = function(){ return Math.max(240, track.clientWidth * 0.85); };

    wrap.querySelectorAll(".car-prev,.car-next").forEach(function(b){
      b.addEventListener("click", function(){
        track.scrollBy({
          left: (b.classList.contains("car-next") ? 1 : -1) * stepSize(),
          behavior: reduce ? "auto" : "smooth"
        });
      });
    });

    function updateProgress(){
      if(!thumb) return;
      var max = track.scrollWidth - track.clientWidth;
      var ratio = max > 0 ? track.scrollLeft / max : 0;
      var visible = track.clientWidth / track.scrollWidth;
      thumb.style.width = Math.max(12, visible * 100) + "%";
      thumb.style.transform = "translateX(" + (ratio * (100 / Math.max(visible, .12) - 100)) + "%)";
    }
    track.addEventListener("scroll", updateProgress, {passive:true});
    window.addEventListener("resize", updateProgress, {passive:true});
    updateProgress();

    /* перетаскивание мышью — слушатели живут только на время жеста */
    var dragging = false, startX = 0, startLeft = 0, moved = 0;
    function onMove(e){
      if(!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = startLeft - dx;
    }
    function endDrag(){
      if(!dragging) return;
      dragging = false;
      track.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    }
    track.addEventListener("pointerdown", function(e){
      if(e.pointerType !== "mouse") return;
      dragging = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
      track.classList.add("dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    });
    /* после протаскивания не открываем ссылку под курсором */
    track.addEventListener("click", function(e){
      if(moved > 6){ e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);
    track.addEventListener("dragstart", function(e){ if(dragging) e.preventDefault(); });
  });

  /* ---------- Каталог: поиск и фильтры ---------- */
  var dirList = document.getElementById("dirList");
  if(dirList){
    var qInput  = document.getElementById("dirSearch"),
        clearBtn= document.querySelector(".dir-clear"),
        chips   = document.querySelectorAll(".chip-f"),
        countEl = document.querySelector(".dir-count"),
        cats    = dirList.querySelectorAll(".dir-cat"),
        wrap    = document.getElementById("dirWrap"),
        moreBtn = document.getElementById("dirToggle"),
        filter  = "all";

    /* запоминаем исходный текст ссылок, чтобы подсветку можно было снять */
    dirList.querySelectorAll(".dir-cat li a").forEach(function(a){ a.dataset.t = a.textContent; });

    var empty = document.createElement("p");
    empty.className = "dir-empty";
    empty.hidden = true;
    dirList.parentNode.appendChild(empty);

    function norm(s){ return s.toLowerCase().replace(/ё/g, "е"); }

    function apply(){
      var q = norm(qInput.value.trim()), shown = 0, active = q.length > 1 || filter !== "all";

      cats.forEach(function(cat){
        var inGroup = (filter === "all" || cat.dataset.g === filter), vis = 0;
        cat.querySelectorAll("li").forEach(function(li){
          var a = li.querySelector("a"), t = a.dataset.t, hit = !q || norm(t).indexOf(q) !== -1;
          li.hidden = !(inGroup && hit);
          if(!li.hidden){
            vis++;
            if(q){
              var i = norm(t).indexOf(q);
              a.textContent = "";
              a.appendChild(document.createTextNode(t.slice(0, i)));
              var mk = document.createElement("mark");
              mk.textContent = t.slice(i, i + q.length);
              a.appendChild(mk);
              a.appendChild(document.createTextNode(t.slice(i + q.length)));
            } else if(a.textContent !== t){
              a.textContent = t;
            }
          }
        });
        cat.hidden = vis === 0;
        shown += vis;
      });

      clearBtn.hidden = !qInput.value;
      empty.hidden = shown !== 0;
      if(shown === 0) empty.textContent = "Ничего не нашлось. Попробуйте другое слово или позвоните — подскажем.";

      if(active){
        wrap.classList.add("open");                    /* при поиске список разворачиваем */
        countEl.textContent = "Найдено услуг: " + shown;
        if(moreBtn) moreBtn.hidden = true;
      } else {
        wrap.classList.remove("open");
        countEl.textContent = "";
        if(moreBtn){ moreBtn.hidden = false; moreBtn.firstChild.nodeValue = "Показать все 166 услуг "; }
      }
    }

    var t = null;
    qInput.addEventListener("input", function(){ clearTimeout(t); t = setTimeout(apply, 120); });
    clearBtn.addEventListener("click", function(){ qInput.value = ""; qInput.focus(); apply(); });
    chips.forEach(function(b){
      b.addEventListener("click", function(){
        chips.forEach(function(x){ x.classList.remove("on"); });
        b.classList.add("on");
        filter = b.dataset.f;
        apply();
        wrap.scrollIntoView({block: "start", behavior: reduce ? "auto" : "smooth"});
      });
    });
  }

  /* ---------- Каталог услуг: показать всё ---------- */
  var dirWrap = document.getElementById("dirWrap"), dirBtn = document.getElementById("dirToggle");
  if(dirWrap && dirBtn){
    dirBtn.addEventListener("click", function(){
      var open = dirWrap.classList.toggle("open");
      dirBtn.setAttribute("aria-expanded", open ? "true" : "false");
      dirBtn.firstChild.nodeValue = open ? "Свернуть перечень " : "Показать все 166 услуг ";
      if(!open) dirWrap.scrollIntoView({block:"start", behavior: reduce ? "auto" : "smooth"});
    });
  }

  /* ---------- Формы ----------
     ВНИМАНИЕ: серверного обработчика нет. Заявка открывается в WhatsApp
     адвоката. Если браузер заблокировал всплывающее окно, показываем
     запасной вариант со ссылкой — иначе заявка теряется молча. */
  var WA_LEAD_NUMBER = "79153702018";
  /* ---------- Телефон: маска +7 (___) ___-__-__ ---------- */
  function digits(s){ return (s || "").replace(/\D/g, ""); }
  function formatPhone(raw){
    var d = digits(raw);
    /* отбрасываем код страны в любом написании: 8, 7, +7 */
    if(d.length && (d[0] === "7" || d[0] === "8")) d = d.slice(1);
    var t = d.slice(0, 10);
    var out = "+7";
    if(t.length) out += " (" + t.slice(0, 3);
    if(t.length >= 3) out += ")";
    if(t.length > 3) out += " " + t.slice(3, 6);
    if(t.length > 6) out += "-" + t.slice(6, 8);
    if(t.length > 8) out += "-" + t.slice(8, 10);
    return out;
  }
  function initMask(input){
    if(input.dataset.mask) return;
    input.dataset.mask = "1";
    input.addEventListener("input", function(){
      var atEnd = input.selectionStart === input.value.length;
      input.value = formatPhone(input.value);
      if(atEnd) input.setSelectionRange(input.value.length, input.value.length);
      clearErr(input);
    });
    input.addEventListener("blur", function(){ if(digits(input.value).length <= 1) input.value = ""; });
    input.addEventListener("keydown", function(e){
      if(e.key === "Backspace" && input.selectionStart === input.value.length){
        e.preventDefault();
        var d = digits(input.value).slice(0, -1);
        input.value = d.length > 1 ? formatPhone(d) : "";
      }
    });
  }

  /* ---------- Ошибки под полем ---------- */
  function clearErr(el){
    el.classList.remove("invalid");
    var w = el.closest("label.magree") || el;
    if(w.classList) w.classList.remove("invalid");
    var n = (el.closest("label.magree") || el).nextElementSibling;
    if(n && n.classList && n.classList.contains("field-err")) n.remove();
  }
  function setErr(el, msg){
    var anchor = el.closest("label.magree") || el;
    (el.closest("label.magree") || el).classList.add("invalid");
    if(!el.closest("label.magree")) el.classList.add("invalid");
    var n = anchor.nextElementSibling;
    if(!(n && n.classList && n.classList.contains("field-err"))){
      n = document.createElement("span");
      n.className = "field-err";
      anchor.parentNode.insertBefore(n, anchor.nextSibling);
    }
    n.textContent = msg;
  }
  function validate(form){
    var bad = [];
    var name = form.querySelector('input[name="name"]');
    var phone = form.querySelector('input[name="phone"]');
    var agree = form.querySelector('input[name="agree"]');
    [name, phone, agree].forEach(function(el){ if(el) clearErr(el); });
    if(name && name.value.trim().length < 2) bad.push([name, "Напишите, как к Вам обращаться"]);
    if(phone && digits(phone.value).length !== 11) bad.push([phone, "Телефон нужен полностью — 10 цифр после +7"]);
    if(agree && !agree.checked) bad.push([agree, "Без согласия мы не сможем перезвонить"]);
    bad.forEach(function(x){ setErr(x[0], x[1]); });
    return bad;
  }

  /* ---------- Отправка ----------
     Серверного обработчика нет: заявка уходит в WhatsApp адвоката.
     Экран «Заявка принята» показываем ТОЛЬКО если переход действительно открылся. */
  var WA_LEAD_NUMBER = "79153702018";
  function successHTML(){
    return '<div class="form-ok">' +
      '<span class="fok-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5 11-11"/></svg></span>' +
      '<h3>Заявка принята</h3>' +
      '<p>Спасибо. Адвокат свяжется с Вами в ближайшее время.</p>' +
      '<p class="fok-note">Обычно отвечаем в течение <b>5 минут</b> в WhatsApp.</p>' +
      '</div>';
  }
  function bindLead(form){
    var ph = form.querySelector('input[name="phone"]');
    if(ph) initMask(ph);
    form.querySelectorAll("input, textarea").forEach(function(el){
      el.addEventListener("input", function(){ clearErr(el); });
      el.addEventListener("change", function(){ clearErr(el); });
    });

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var bad = validate(form);
      if(bad.length){ bad[0][0].focus(); return; }

      var btn = form.querySelector("button[type=submit]");
      if(btn) btn.classList.add("is-busy");

      var nameEl = form.querySelector('input[name="name"]');
      var textEl = form.querySelector('[name="message"]');
      var msg = "Здравствуйте! Заявка с сайта на бесплатную консультацию.";
      if(nameEl && nameEl.value.trim()) msg += "\nИмя: " + nameEl.value.trim();
      if(ph) msg += "\nТелефон: " + ph.value.trim();
      if(textEl && textEl.value.trim()) msg += "\nВопрос: " + textEl.value.trim();
      msg += "\nПрошу перезвонить.";

      var url = "https://wa.me/" + WA_LEAD_NUMBER + "?text=" + encodeURIComponent(msg);
      var win = window.open(url, "_blank", "noopener");

      setTimeout(function(){
        if(btn) btn.classList.remove("is-busy");
        if(win && !win.closed){
          form.innerHTML = successHTML();
        } else {
          /* окно заблокировано — не врём, что заявка ушла */
          var w = form.querySelector(".form-warn");
          if(!w){
            w = document.createElement("div");
            w.className = "form-warn";
            form.appendChild(w);
          }
          w.textContent = "Браузер заблокировал переход в WhatsApp. ";
          var a1 = document.createElement("a");
          a1.href = url; a1.target = "_blank"; a1.rel = "noopener";
          a1.textContent = "Открыть WhatsApp вручную";
          var a2 = document.createElement("a");
          a2.href = "tel:+7" + WA_LEAD_NUMBER.slice(1);
          a2.textContent = "8 (915) 370-20-18";
          w.appendChild(a1);
          w.appendChild(document.createTextNode(" или позвоните: "));
          w.appendChild(a2);
          w.appendChild(document.createTextNode("."));
        }
      }, 350);
    });
  }
  document.querySelectorAll("form.js-lead").forEach(bindLead);


  /* ---------- Сворачиваемые блоки: на телефоне закрыты, на десктопе открыты ---------- */
  var folds = document.querySelectorAll("details.fold");
  if(folds.length){
    var mq = window.matchMedia("(max-width: 760px)");
    var syncFolds = function(){
      folds.forEach(function(d){
        if(d.dataset.touched) return;      /* пользователь уже трогал — не переключаем */
        d.open = !mq.matches;
      });
    };
    folds.forEach(function(d){
      d.addEventListener("toggle", function(){ d.dataset.touched = "1"; });
    });
    syncFolds();
    (mq.addEventListener ? mq.addEventListener("change", syncFolds) : mq.addListener(syncFolds));
  }

  /* ---------- Попап заявки ----------
     Шаблон статический: ни одного значения от пользователя не подставляется. */
  var MODAL_HTML =
    '<div class="mdl" role="dialog" aria-modal="true" aria-labelledby="mdl-title">' +
      '<button class="mclose" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<h2 id="mdl-title">Бесплатная консультация юриста</h2>' +
      '<p class="msub">Честно оценим перспективы дела — без обязательств</p>' +
      '<form class="js-lead">' +
        '<label for="md-name">Ваше имя</label>' +
        '<input id="md-name" name="name" type="text" placeholder="Как к Вам обращаться" autocomplete="name" required>' +
        '<label for="md-phone">Телефон</label>' +
        '<input id="md-phone" name="phone" type="tel" placeholder="+7 (___) ___-__-__" autocomplete="tel" required>' +
        '<label for="md-msg">Ваш вопрос</label>' +
        '<textarea id="md-msg" name="message" rows="3" placeholder="С чем нужна помощь — в двух словах"></textarea>' +
        '<button class="btn btn-gold" type="submit">Получить консультацию</button>' +
        '<label class="magree" for="md-agree"><input id="md-agree" name="agree" type="checkbox" required>' +
          '<span>Я принимаю условия <a href="PFX/privacy.html" target="_blank" rel="noopener">Политики конфиденциальности</a> и даю <a href="PFX/soglasie.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a></span></label>' +
        '<div class="mnote">' +
          '<span><span class="dot" aria-hidden="true"></span>Сегодня принимаем до 22:00</span>' +
          '<span><b>5 минут</b> — обычное время ответа в WhatsApp</span>' +
        '</div>' +
        '<p class="form-note"></p>' +
      '</form>' +
    '</div>';

  var modal = null, lastFocus = null;
  function buildModal(){
    if(modal) return modal;
    var link = document.querySelector('link[rel="stylesheet"][href*="site.css"]');
    var pfx = (link && link.getAttribute("href").indexOf("../") === 0) ? ".." : ".";
    modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = MODAL_HTML.split("PFX").join(pfx);
    document.body.appendChild(modal);
    modal.addEventListener("click", function(e){ if(e.target === modal) closeModal(); });
    modal.querySelector(".mclose").addEventListener("click", closeModal);
    bindLead(modal.querySelector("form.js-lead"));
    return modal;
  }
  function openModal(){
    lastFocus = document.activeElement;
    var m = buildModal();
    m.classList.add("show");
    document.body.classList.add("modal-open");
    requestAnimationFrame(function(){ m.classList.add("in"); });
    var f = m.querySelector("#md-name");
    if(f) setTimeout(function(){ f.focus(); }, reduce ? 0 : 120);
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove("in");
    var done = function(){
      modal.classList.remove("show");
      document.body.classList.remove("modal-open");
      if(lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if(reduce){ done(); } else { setTimeout(done, 220); }
  }
  /* все кнопки записи открывают попап */
  document.querySelectorAll(".js-modal, .nav-cta, .mn-cta, .mbar .mb-book, .ctab-actions .btn-gold")
    .forEach(function(b){
      b.addEventListener("click", function(e){ e.preventDefault(); setMenu(false); openModal(); });
    });
  document.addEventListener("keydown", function(e){
    if(!modal || !modal.classList.contains("show")) return;
    if(e.key === "Escape"){ closeModal(); return; }
    if(e.key === "Tab"){
      var f = modal.querySelectorAll("button, input, textarea, a[href]");
      if(!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Просмотр документа на весь экран ---------- */
  var docs = [].slice.call(document.querySelectorAll("a.js-doc"));
  if(docs.length){
    var lbx = null, lbxImg = null, lbxCap = null, lbxIdx = 0, lbxFrom = null;
    function buildLbx(){
      if(lbx) return lbx;
      lbx = document.createElement("div");
      lbx.className = "lbx";
      lbx.setAttribute("role", "dialog");
      lbx.setAttribute("aria-modal", "true");
      lbx.setAttribute("aria-label", "Документ");
      var fig = document.createElement("figure");
      lbxImg = document.createElement("img");
      lbxCap = document.createElement("figcaption");
      fig.appendChild(lbxImg); fig.appendChild(lbxCap);
      var close = document.createElement("button");
      close.type = "button"; close.className = "lbx-close";
      close.setAttribute("aria-label", "Закрыть");
      close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      var prev = document.createElement("button");
      prev.type = "button"; prev.className = "lbx-nav lbx-prev";
      prev.setAttribute("aria-label", "Предыдущий документ"); prev.textContent = "\u2039";
      var next = document.createElement("button");
      next.type = "button"; next.className = "lbx-nav lbx-next";
      next.setAttribute("aria-label", "Следующий документ"); next.textContent = "\u203A";
      lbx.appendChild(fig); lbx.appendChild(close); lbx.appendChild(prev); lbx.appendChild(next);
      document.body.appendChild(lbx);
      close.addEventListener("click", closeLbx);
      prev.addEventListener("click", function(){ showDoc(lbxIdx - 1); });
      next.addEventListener("click", function(){ showDoc(lbxIdx + 1); });
      lbx.addEventListener("click", function(e){ if(e.target === lbx) closeLbx(); });
      return lbx;
    }
    function showDoc(i){
      lbxIdx = (i + docs.length) % docs.length;
      var a = docs[lbxIdx], im = a.querySelector("img"), cap = a.querySelector(".doc-cap");
      lbxImg.src = a.getAttribute("href");
      lbxImg.alt = im ? im.alt : "";
      lbxCap.textContent = "";
      if(cap){
        var b = cap.querySelector("b"), s = cap.querySelector("span:not(.doc-hint)");
        lbxCap.appendChild(document.createTextNode(b ? b.textContent : ""));
        if(s){
          var sub = document.createElement("span");
          sub.textContent = s.textContent;
          lbxCap.appendChild(sub);
        }
      }
    }
    function openLbx(i, from){
      lbxFrom = from;
      buildLbx();
      showDoc(i);
      lbx.classList.add("show");
      document.body.classList.add("modal-open");
      requestAnimationFrame(function(){ lbx.classList.add("in"); });
      lbx.querySelector(".lbx-close").focus();
    }
    function closeLbx(){
      if(!lbx) return;
      lbx.classList.remove("in");
      var done = function(){
        lbx.classList.remove("show");
        document.body.classList.remove("modal-open");
        if(lbxFrom && lbxFrom.focus) lbxFrom.focus();
      };
      if(reduce){ done(); } else { setTimeout(done, 220); }
    }
    docs.forEach(function(a, i){
      a.addEventListener("click", function(e){ e.preventDefault(); openLbx(i, a); });
    });
    document.addEventListener("keydown", function(e){
      if(!lbx || !lbx.classList.contains("show")) return;
      if(e.key === "Escape") closeLbx();
      else if(e.key === "ArrowRight") showDoc(lbxIdx + 1);
      else if(e.key === "ArrowLeft") showDoc(lbxIdx - 1);
    });
  }

  /* ---------- Карта: тяжёлый виджет Яндекса грузим только по клику ---------- */
  var mapBtn = document.getElementById("mapFacade");
  if(mapBtn){
    mapBtn.addEventListener("click", function(){
      if(!mapsAllowed()){                       /* клик по кнопке = согласие на эту категорию */
        ckPrefs = ckPrefs || {v:1, tech:true, analytics:false, maps:false};
        ckPrefs.maps = true;
        CK.write(ckPrefs);
      }
      var f = document.createElement("iframe");
      f.src = "https://yandex.ru/map-widget/v1/org/advokaty_antonovy/46366294074/";
      f.title = "Адвокаты Антоновы на карте Волгограда";
      f.setAttribute("allowfullscreen", "true");
      f.setAttribute("loading", "eager");
      mapBtn.parentNode.replaceChild(f, mapBtn);
    }, {once: true});
  }

  /* ---------- Появление блоков при скролле ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, {rootMargin: "0px 0px -60px 0px"});
    revealEls.forEach(function(el){ io.observe(el); });
    /* Страховка: если наблюдатель по какому-то блоку не сработал
       (гонка при медленной загрузке картинок), показываем всё,
       что уже находится в пределах экрана или выше него. */
    var safety = function(){
      revealEls.forEach(function(el){
        if(!el.classList.contains("in") && el.getBoundingClientRect().top < window.innerHeight){
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    };
    window.addEventListener("load", function(){ setTimeout(safety, 400); });
    window.addEventListener("scroll", safety, {passive:true});
  } else {
    revealEls.forEach(function(el){ el.classList.add("in"); });
  }

  /* ---------- Счётчики цифр ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el){
    var target = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || "";
    var plain  = el.dataset.plain === "1"; /* годы — без разделителя разрядов */
    if(isNaN(target)) return;
    if(reduce){ el.textContent = target + suffix; return; }
    var dur = 1400, start = null;
    function frame(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = (plain ? String(val) : val.toLocaleString("ru-RU")) + suffix;
      if(p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if("IntersectionObserver" in window){
    var co = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ runCounter(en.target); co.unobserve(en.target); }
      });
    }, {threshold: .6});
    counters.forEach(function(el){ co.observe(el); });
  }

  /* ---------- Лёгкий параллакс фото адвокатов ---------- */
  var heroCard = document.getElementById("heroCard");
  if(heroCard && !reduce && window.matchMedia("(min-width: 981px)").matches){
    var ticking = false;
    var onParallax = function(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        var y = window.pageYOffset || document.documentElement.scrollTop;
        if(y < window.innerHeight * 1.2){
          heroCard.style.transform = "translateY(" + (y * -0.045).toFixed(2) + "px)";
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onParallax, {passive:true});
  }

  /* ---------- Подсветка активного пункта меню ---------- */
  /* только якоря текущей страницы: на подстраницах ссылки вида ../index.html#x — не селекторы */
  var navLinks = document.querySelectorAll('.nav ul a[href^="#"]');
  var sections = [].map.call(navLinks, function(a){
    return document.querySelector(a.getAttribute("href"));
  });
  if("IntersectionObserver" in window){
    var so = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){
          navLinks.forEach(function(a){
            a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, {rootMargin: "-45% 0px -50% 0px"});
    sections.forEach(function(s){ if(s) so.observe(s); });
  }

  /* ---------- Cookie: уведомление и панель настроек ----------
     Каждый переключатель реально управляет загрузкой, а не стоит для вида:
       технические — отметка о сделанном выборе, отключить нельзя;
       аналитика   — счётчик посещаемости (пока не подключён, готово к Метрике);
       карта       — виджет Яндекс Карт, он же ставит cookie Яндекса. */
  var CK = (function(){
    var KEY = "aa-cookie-prefs";
    var def = { v: 1, tech: true, analytics: false, maps: false };
    function read(){
      try {
        var raw = localStorage.getItem(KEY);
        if(!raw) return null;
        var o = JSON.parse(raw);
        return (o && o.v === 1) ? o : null;
      } catch(e){ return null; }
    }
    function write(o){
      try { localStorage.setItem(KEY, JSON.stringify(o)); } catch(e){}
    }
    return { KEY: KEY, def: def, read: read, write: write };
  })();

  var ckPrefs = CK.read();

  /* аналитика: подключается только с разрешения и только когда задан номер счётчика */
  var METRIKA_ID = null;          /* ← сюда номер счётчика Яндекс.Метрики, когда появится */
  function applyAnalytics(){
    if(!ckPrefs || !ckPrefs.analytics || !METRIKA_ID || window.__metrikaOn) return;
    window.__metrikaOn = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://mc.yandex.ru/metrika/tag.js";
    s.onload = function(){
      try {
        window.ym = window.ym || function(){ (window.ym.a = window.ym.a || []).push(arguments); };
        window.ym(METRIKA_ID, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
      } catch(e){}
    };
    document.head.appendChild(s);
  }
  function mapsAllowed(){ return !!(ckPrefs && ckPrefs.maps); }

  /* ---- панель настроек ---- */
  var ckPanel = null;
  var ROWS = [
    ["tech", "Технические", "Запоминают только Ваш выбор в этом окне, чтобы не спрашивать повторно. Без них сайт не может работать корректно.", true],
    ["analytics", "Аналитика", "Счётчик посещаемости: сколько человек заходит, какие разделы читают. Сейчас на сайте не установлен — переключатель готов к подключению.", false],
    ["maps", "Карта проезда", "Виджет Яндекс Карт внизу страницы. Он загружает около 600 КБ и устанавливает cookie Яндекса. Без разрешения карта не загружается — адрес и ссылка на Яндекс Карты остаются доступны.", false]
  ];
  function buildPanel(){
    if(ckPanel) return ckPanel;
    var pfxLink = document.querySelector('link[rel="stylesheet"][href*="site.css"]');
    var pfx = (pfxLink && pfxLink.getAttribute("href").indexOf("../") === 0) ? "../" : "";

    ckPanel = document.createElement("div");
    ckPanel.className = "ckp";
    ckPanel.setAttribute("role", "dialog");
    ckPanel.setAttribute("aria-modal", "true");
    ckPanel.setAttribute("aria-label", "Настройка cookie");

    var box = document.createElement("div");
    box.className = "ckp-box";

    var head = document.createElement("div");
    head.className = "ckp-head";
    var back = document.createElement("button");
    back.type = "button"; back.className = "ckp-back";
    back.setAttribute("aria-label", "Закрыть настройки");
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    var h2 = document.createElement("h2");
    h2.textContent = "Настроить cookie";
    head.appendChild(back); head.appendChild(h2);

    var body = document.createElement("div");
    body.className = "ckp-body";
    var lead = document.createElement("p");
    lead.textContent = "Выберите, что сайту разрешено загружать. Изменения вступят в силу сразу.";
    body.appendChild(lead);

    var cur = ckPrefs || CK.def;
    ROWS.forEach(function(r){
      var key = r[0], title = r[1], desc = r[2], locked = r[3];
      var row = document.createElement("div");
      row.className = "ckp-row";
      var top = document.createElement("div");
      top.className = "ckp-top";
      var b = document.createElement("b"); b.textContent = title;
      var state = document.createElement("div"); state.className = "ckp-state";
      if(locked){
        var al = document.createElement("span");
        al.className = "ckp-always"; al.textContent = "Всегда включено";
        state.appendChild(al);
      } else {
        var lab = document.createElement("label");
        lab.className = "sw";
        var inp = document.createElement("input");
        inp.type = "checkbox"; inp.checked = !!cur[key]; inp.dataset.k = key;
        inp.setAttribute("aria-label", "Разрешить: " + title);
        var kn = document.createElement("span");
        lab.appendChild(inp); lab.appendChild(kn);
        state.appendChild(lab);
      }
      top.appendChild(b); top.appendChild(state);
      var p = document.createElement("p"); p.textContent = desc;
      row.appendChild(top); row.appendChild(p);
      body.appendChild(row);
    });

    var note = document.createElement("p");
    note.style.cssText = "font-size:13.5px;color:var(--ink-3);margin:var(--s5) 0 0";
    note.appendChild(document.createTextNode("Подробно о том, какие данные обрабатываются, — в "));
    var na = document.createElement("a");
    na.href = pfx + "privacy.html"; na.target = "_blank"; na.rel = "noopener";
    na.style.cssText = "color:var(--gold-dk);text-decoration:underline";
    na.textContent = "политике конфиденциальности";
    note.appendChild(na); note.appendChild(document.createTextNode("."));
    body.appendChild(note);

    var foot = document.createElement("div");
    foot.className = "ckp-foot";
    var ok = document.createElement("button");
    ok.type = "button"; ok.className = "btn btn-gold"; ok.textContent = "Подтвердить";
    var all = document.createElement("button");
    all.type = "button"; all.className = "btn btn-line"; all.textContent = "Разрешить всё";
    foot.appendChild(ok); foot.appendChild(all);

    box.appendChild(head); box.appendChild(body); box.appendChild(foot);
    ckPanel.appendChild(box);
    document.body.appendChild(ckPanel);

    function save(forceAll){
      var o = { v: 1, tech: true, analytics: false, maps: false };
      ckPanel.querySelectorAll('input[data-k]').forEach(function(i){
        o[i.dataset.k] = forceAll ? true : i.checked;
      });
      ckPrefs = o;
      CK.write(o);
      applyAnalytics();
      closePanel();
      hideBanner();
      syncMapFacade();
    }
    ok.addEventListener("click", function(){ save(false); });
    all.addEventListener("click", function(){ save(true); });
    back.addEventListener("click", closePanel);
    ckPanel.addEventListener("click", function(e){ if(e.target === ckPanel) closePanel(); });
    return ckPanel;
  }
  function openPanel(){
    var el = buildPanel();
    el.querySelectorAll('input[data-k]').forEach(function(i){
      i.checked = !!((ckPrefs || CK.def)[i.dataset.k]);
    });
    el.classList.add("show");
    document.body.classList.add("ck-open");
    requestAnimationFrame(function(){ el.classList.add("in"); });
    el.querySelector(".ckp-back").focus();
  }
  function closePanel(){
    if(!ckPanel) return;
    ckPanel.classList.remove("in");
    var done = function(){ ckPanel.classList.remove("show"); document.body.classList.remove("ck-open"); };
    if(reduce){ done(); } else { setTimeout(done, 240); }
  }
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && ckPanel && ckPanel.classList.contains("show")) closePanel();
  });

  /* ---- баннер ---- */
  var ckBar = null;
  function hideBanner(){
    if(!ckBar) return;
    ckBar.classList.remove("in");
    var done = function(){ if(ckBar){ ckBar.remove(); ckBar = null; } };
    if(reduce){ done(); } else { setTimeout(done, 320); }
  }
  function showBanner(){
    var pfxLink = document.querySelector('link[rel="stylesheet"][href*="site.css"]');
    var pfx = (pfxLink && pfxLink.getAttribute("href").indexOf("../") === 0) ? "../" : "";
    ckBar = document.createElement("div");
    ckBar.className = "ck";
    ckBar.setAttribute("role", "region");
    ckBar.setAttribute("aria-label", "Уведомление об использовании cookie");

    var p = document.createElement("p");
    p.appendChild(document.createTextNode("На сайте используются файлы cookie для корректной работы и загрузки карты проезда. Подробности — в "));
    var a = document.createElement("a");
    a.href = pfx + "privacy.html";
    a.textContent = "политике конфиденциальности";
    p.appendChild(a);
    p.appendChild(document.createTextNode("."));

    var acts = document.createElement("div");
    acts.className = "ck-acts";
    var set = document.createElement("button");
    set.type = "button"; set.className = "ck-set"; set.textContent = "Настроить";
    var ok = document.createElement("button");
    ok.type = "button"; ok.className = "btn btn-gold"; ok.textContent = "Принимаю";
    acts.appendChild(set); acts.appendChild(ok);

    set.addEventListener("click", openPanel);
    ok.addEventListener("click", function(){
      ckPrefs = { v: 1, tech: true, analytics: true, maps: true };
      CK.write(ckPrefs);
      applyAnalytics();
      hideBanner();
      syncMapFacade();
    });

    ckBar.appendChild(p); ckBar.appendChild(acts);
    document.body.appendChild(ckBar);
    requestAnimationFrame(function(){
      setTimeout(function(){ ckBar.classList.add("in"); }, reduce ? 0 : 700);
    });
  }

  /* ---- карта: подпись под кнопкой зависит от разрешения ---- */
  function syncMapFacade(){
    var note = document.querySelector(".map-note");
    if(!note) return;
    note.textContent = mapsAllowed()
      ? "Загрузится карта Яндекса — около 600 КБ"
      : "Нажатие разрешит загрузку карты Яндекса и её cookie";
  }

  if(!ckPrefs) showBanner();
  applyAnalytics();
  syncMapFacade();

  /* панель можно открыть повторно ссылкой в подвале */
  document.querySelectorAll(".js-ck-settings").forEach(function(el){
    el.addEventListener("click", function(e){ e.preventDefault(); openPanel(); });
  });

  /* ---------- Кнопка «наверх» ---------- */
  var totop = document.querySelector(".totop");
  if(totop){
    var onScroll = function(){
      totop.classList.toggle("show", (window.pageYOffset || document.documentElement.scrollTop) > 600);
    };
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();
    totop.addEventListener("click", function(){
      window.scrollTo({top: 0, behavior: reduce ? "auto" : "smooth"});
    });
  }
})();
