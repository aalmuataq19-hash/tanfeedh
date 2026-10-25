/* مدارسة نظام التنفيذ ولائحته التنفيذية: منطق الموقع
   البيانات في مجلد data، ولا تحتاج الواجهة إلى إعادة بناء عند إضافة شرح جديد. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح */ } }
  };

  var D = { parts: [], law: [], reg: [], lawBy: {}, regBy: {}, instruments: [], refs: {}, laws: {}, studies: {}, studyList: [], studySet: {}, qorder: {} };
  var SITE = 'مدارسة نظام التنفيذ ولائحته التنفيذية';

  /* ───── الأيقونات ───── */
  var svg = function (p, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
  var I = {
    chev: svg('<path d="M15 6l-6 6 6 6"/>', 'toc-chev'),
    home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>'),
    doc: svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 16h5"/>'),
    info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    print: svg('<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
    expand: svg('<path d="M8 4h-4v4M16 4h4v4M8 20h-4v-4M16 20h4v-4"/>'),
    collapse: svg('<path d="M4 8h4V4M20 8h-4V4M4 16h4v4M20 16h-4v4"/>'),
    next: svg('<path d="M14 6l-6 6 6 6"/>'),
    prev: svg('<path d="M10 6l6 6-6 6"/>'),
    sep: svg('<path d="M14 6l-6 6 6 6"/>'),
    out: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>')
  };

  /* ───── الأعداد الترتيبية في النصوص ───── */
  var UNITS = { 'الأولى': 1, 'الحادية': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10 };
  var TENS = { 'العشرين': 20, 'العشرون': 20, 'الثلاثين': 30, 'الثلاثون': 30, 'الأربعين': 40, 'الأربعون': 40, 'الخمسين': 50, 'الخمسون': 50, 'الستين': 60, 'الستون': 60 };
  function ordNum(s) {
    s = String(s).trim();
    if (UNITS[s] && s !== 'الحادية') return UNITS[s];
    var m = s.match(/^(\S+) عشرة$/); if (m && UNITS[m[1]]) return 10 + UNITS[m[1]];
    if (TENS[s]) return TENS[s];
    m = s.match(/^(\S+) و(\S+)$/); if (m && UNITS[m[1]] && TENS[m[2]]) return UNITS[m[1]] + TENS[m[2]];
    return null;
  }

  var lawHref = function (n) { return '#/article/' + n; };
  var regHref = function (n) { var r = D.regBy[n]; return r ? '#/article/' + r.host + '/r' + n : '#/'; };

  /* ربط الإحالات داخل النصوص الرسمية دون تغيير حرف من النص */
  function linkifyOfficial(html) {
    return html.replace(/(المادة|للمادة|بالمادة|المادتين|للمادتين) \(([^)]+)\)(?: و\(([^)]+)\))? من (النظام|اللائحة|نظام التنفيذ)(?! الأساسي)/g,
      function (m, w, o1, o2, tgt) {
        var isReg = tgt === 'اللائحة';
        var mk = function (o) {
          var n = ordNum(o);
          if (!n || (isReg ? !D.regBy[n] : !D.lawBy[n])) return o;
          return '<a class="oref" data-int="1" href="' + (isReg ? regHref(n) : lawHref(n)) + '">' + o + '</a>';
        };
        return w + ' (' + mk(o1) + ')' + (o2 ? ' و(' + mk(o2) + ')' : '') + ' من ' + tgt;
      });
  }

  function paraClass(p, idx, prev) {
    if (/^\d+\s*-\s/.test(p)) return 'item';
    if (/^(هـ|[أبجدوزحطيكلمنسعفصقرشت])\s*-\s/.test(p)) return 'subitem';
    if (idx > 0 && (prev === 'item' || prev === 'subitem')) return 'item';
    return '';
  }
  function officialHTML(paras) {
    var prev = '';
    return paras.map(function (p, i) {
      var c = paraClass(p, i, prev); prev = c;
      return '<p' + (c ? ' class="' + c + '"' : '') + '>' + linkifyOfficial(esc(p)) + '</p>';
    }).join('');
  }

  /* ───── الترميز المختصر في المادة العلمية ───── */
  var CTX = 0;
  /* هل بطاقة المرجع معروضة في روابط المادة n؟ */
  function cardIn(n, id) {
    var st = D.studies[n]; if (!st) return false;
    return st.sections.some(function (s) { return (s.external || []).some(function (L) { return L.ref === id; }); });
  }
  function md(s) {
    var h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    /* التمييز بالتظليل: [[e:…]] نص صريح، [[i:…]] فهم مستنبط، [[r:…]] محل بحث، [[p:…]] رأي مقترح */
    h = h.replace(/\[\[(e|i|r|p):([\s\S]+?)\]\]/g, '<span class="hl hl-$1">$2</span>');
    h = h.replace(/\{\{(م|ل|ر|س):([^|}]+)(?:\|([^}]+))?\}\}/g, function (m, k, id, label) {
      var href = '#/', text = label;
      if (k === 'م') { href = lawHref(id); text = text || 'المادة (' + id + ')'; }
      else if (k === 'ل') { href = regHref(+id); text = text || 'المادة (' + id + ') من اللائحة'; }
      else if (k === 'ر') {
        var R = D.refs[id], at = cardIn(CTX, id) ? CTX : (R && R.home && R.home[0]);
        text = text || (R ? R.label : id);
        if (!at) return text;   /* لا بطاقة له في أي مادة: يبقى نصًّا */
        href = '#/article/' + at + '/ref-' + id;
      }
      else if (k === 'س') {
        /* رقم المسألة يُولَّد من ترتيبها في مادتها، فلا يختل إذا حُذفت مسألة قبلها (القرار 10) */
        var qa = id.indexOf('/') > 0 ? id.split('/')[0] : String(CTX), qi = id.indexOf('/') > 0 ? id.split('/')[1] : id;
        var no = (D.qorder[qa] || []).indexOf(qi) + 1;
        href = '#/article/' + qa + '/' + qi;
        /* تسمية برقم مكتوب (في دراسات الصيغة الأولى) يُعاد توليدها من الترتيب الحالي حتى لا يخالف رقمها رقم المسألة */
        if (text && /^المسألة \(\d+\)/.test(text)) text = '';
        text = text || ((no ? 'المسألة (' + no + ')' : 'المسألة') + (+qa !== +CTX ? ' من دراسة المادة (' + qa + ')' : ''));
      }
      return '<a class="xref" data-int="1" href="' + href + '">' + text + '</a>';
    });
    return h;
  }
  var TAGS = { explicit: 'نص صريح', inferred: 'فهم مستنبط', research: 'محل بحث', proposed: 'رأي مقترح' };
  var HAS_HL = /\[\[[eirp]:/;
  /* العنوان الذي يقدم شرحًا تتبعه النقطتان، إلا إذا خُتم بعلامة أخرى (القرار 6) */
  function punc(h) { return /[؟!:.]$/.test(String(h).trim()) ? '' : ':'; }
  /* روابط المصادر الرسمية (القرار 3): لا يوضع إلا رابط زوّد به المدير، ولا تُستعمل الصفحة الرئيسية */
  function offName(url) {
    if (/laws\.boe\.gov\.sa/.test(url)) return 'صفحة النظام في هيئة الخبراء';
    if (/laws\.moj\.gov\.sa/.test(url)) return 'صفحته في البوابة القانونية لوزارة العدل';
    if (/uqn\.gov\.sa/.test(url)) return 'نشره في جريدة أم القرى';
    return 'المصدر الرسمي';
  }
  function offLink(url, label) {
    if (!url || /^https?:\/\/laws\.boe\.gov\.sa\/?$/.test(url)) return '';
    return '<a class="off-link" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || offName(url)) + I.out.replace('<svg', '<svg class="ico-out"') + '</a>';
  }
  var OFF = function (k) { return (D.laws[k] || {}).url || ''; };
  function hlLegend() {
    return '<div class="hl-legend" role="note"><span class="hl-legend-t">دليل الألوان:</span>' +
      '<span class="hl hl-e">نص صريح</span><span class="hl hl-i">فهم مستنبط</span><span class="hl hl-r">محل بحث</span><span class="hl hl-p">رأي مقترح</span></div>';
  }
  function legendCards() {
    return '<div class="legend">' +
      '<div class="legend-item"><span class="hl hl-e">نص صريح</span><div>حكم يدل عليه لفظ النص مباشرة.</div></div>' +
      '<div class="legend-item"><span class="hl hl-i">فهم مستنبط</span><div>معنى مستخرج من النص أو من ربطه بغيره، وليس منصوصًا عليه بلفظه.</div></div>' +
      '<div class="legend-item"><span class="hl hl-r">محل بحث</span><div>مسألة لم يحسمها النص، وتحتاج إلى مراجعة أو دليل إجرائي.</div></div>' +
      '<div class="legend-item"><span class="hl hl-p">رأي مقترح</span><div>اجتهاد مقترح للمدارسة، لا يُنسب إلى النظام.</div></div></div>' +
      '<p class="legend-note">يُظلَّل في «الشرح» و«الجديد وأثره العملي» وأجوبة المسائل الجزءُ الذي يخص كل نوع وحده؛ فقد تجمع الفقرة الواحدة أكثر من نوع، وما بقي فيها بلا تظليل فتمهيد أو ربط. وفي مسائل المدارسة تُعرض حجج الآراء بلا تظليل، ويُظلَّل الرأي المقترح.</p>';
  }
  var tag = function (t) { return t && TAGS[t] ? '<span class="tag ' + t + '">' + TAGS[t] + '</span>' : ''; };

  /* ───── تحميل البيانات ───── */
  function getJSON(p) {
    return fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); });
  }
  function load() {
    return Promise.all([
      getJSON('data/structure.json'), getJSON('data/law.json'), getJSON('data/regulation.json'),
      getJSON('data/instruments.json'), getJSON('data/references.json'), getJSON('data/studies/index.json')
    ]).then(function (res) {
      D.parts = res[0].parts; D.law = res[1]; D.reg = res[2]; D.instruments = res[3];
      D.refs = res[4].references || {}; D.laws = res[4].laws || {};
      D.law.forEach(function (a) { D.lawBy[a.n] = a; });
      D.reg.forEach(function (r) { D.regBy[r.n] = r; });
      D.parts.forEach(function (p) {
        p.chapters.forEach(function (c) { c.articles.forEach(function (n) { if (D.lawBy[n]) { D.lawBy[n].part = p; D.lawBy[n].chapter = c.label ? c : null; } }); });
      });
      /* المواد العلمية تُحمّل عند فتح المادة، وتُجلب كلها في الخلفية للبحث */
      D.studyList = ((res[5] && res[5].studies) || []).slice().sort(function (a, b) { return a - b; });
      D.qorder = (res[5] && res[5].qorder) || {};
      D.studyList.forEach(function (n) { D.studySet[n] = 1; });
    });
  }
  var studyReq = {}, allReq = null;
  function ensureStudy(n) {
    if (!D.studySet[n] || D.studies[n]) return Promise.resolve(D.studies[n] || null);
    if (!studyReq[n]) {
      studyReq[n] = getJSON('data/studies/' + n + '.json').then(function (s) { D.studies[n] = s; indexStudy(n); return s; })
        .catch(function () { delete studyReq[n]; return null; });
    }
    return studyReq[n];
  }
  var studiesLoading = false;
  function ensureAllStudies() {
    if (!allReq) {
      studiesLoading = true;
      allReq = Promise.all(D.studyList.map(ensureStudy)).then(function () {
        studiesLoading = false;
        var missing = D.studyList.filter(function (n) { return !D.studies[n]; }).length;
        if (missing) allReq = null;   /* يُعاد تحميل الناقص وحده عند الاستعمال التالي للبحث */
        return missing;
      });
    }
    return allReq;
  }
  /* بيان شمول البحث للشروح: هل اكتمل، أو ما زال يُحمّل، أو تعثر بعضه */
  function coverageNote() {
    var total = D.studyList.length, have = D.studyList.filter(function (n) { return D.studies[n]; }).length;
    if (have >= total) return '';
    if (studiesLoading) return 'جارٍ تحميل شروح المواد للبحث فيها (' + have + ' من ' + total + ')، فقد تزيد النتائج.';
    return 'لم يُحمَّل شرح بعض المواد (' + (total - have) + ' من ' + total + ')، فالنتائج ناقصة. أعد البحث بعد عودة الاتصال.';
  }

  /* ───── الفهرس ───── */
  function tocItem(n) {
    var a = D.lawBy[n];
    return '<li class="toc-item"><a href="' + lawHref(n) + '" data-n="' + n + '"><span class="toc-n">' + n + '</span><span class="toc-t">' + esc(a.title) + '</span>' +
      (D.studySet[n] ? '<span class="dot-ready" title="مادة علمية مكتملة"></span>' : '') + '</a></li>';
  }
  function renderTOC() {
    var h = '<div class="toc-top">' +
      '<a class="toc-link" href="#/" data-top="home">' + I.home + 'الرئيسية</a>' +
      '<a class="toc-link" href="#/instruments" data-top="instruments">' + I.doc + 'أداة الإصدار والنفاذ</a>' +
      '<a class="toc-link" href="#/about" data-top="about">' + I.info + 'منهجية المدارسة</a>' +
      '</div><div class="toc-sep"></div>' +
      '<div class="toc-legend"><span class="dot-ready"></span>مادة علمية مكتملة</div>';
    D.parts.forEach(function (p) {
      h += '<details class="toc-part" data-part="' + p.id + '" open><summary>' + I.chev + '<span><span class="toc-part-label">' + esc(p.label) + '</span><span class="toc-part-name">' + esc(p.name) + '</span></span></summary>';
      p.chapters.forEach(function (c) {
        if (c.label) h += '<div class="toc-chapter">' + esc(c.label) + ': ' + esc(c.name) + '</div>';
        h += '<ul class="toc-list">' + c.articles.map(tocItem).join('') + '</ul>';
      });
      h += '</details>';
    });
    $('#toc').innerHTML = h;
  }
  function markTOC(route) {
    $$('#toc a.current').forEach(function (a) { a.classList.remove('current'); a.removeAttribute('aria-current'); });
    var el = null;
    if (route.name === 'article') el = $('#toc a[data-n="' + route.n + '"]');
    else el = $('#toc a[data-top="' + route.name + '"]');
    if (el) {
      el.classList.add('current'); el.setAttribute('aria-current', 'page');
      var part = el.closest('details'); if (part) part.open = true;
      var sb = $('#sidebar'), r = el.getBoundingClientRect(), sr = sb.getBoundingClientRect();
      if (r.top < sr.top + 60 || r.bottom > sr.bottom - 20) sb.scrollTop += (r.top - sr.top) - sr.height / 3;
    }
  }

  /* ───── الصفحة الرئيسية ───── */
  /* عدد المواد مع المعدود بحسب قواعد العربية */
  function articlesCount(n) {
    if (n === 1) return 'مادة واحدة';
    if (n === 2) return 'مادتين';
    var r = n % 100;
    return '<b>' + n + '</b>' + (r >= 3 && r <= 10 ? ' مواد' : ' مادة');
  }
  function viewHome() {
    var ready = D.studyList, all = ready.length >= D.law.length;
    var h = '<section class="hero">' +
      '<div class="eyebrow">نظام التنفيذ الصادر بالمرسوم الملكي (م/237) ولائحته التنفيذية</div>' +
      '<h1>مدارسة نظام التنفيذ ولائحته التنفيذية</h1>' +
      '<p>مادة علمية للمدارسة بين القضاة والممارسين: نص كل مادة كاملًا مع ما يتصل بها من اللائحة، ثم شرحها، وما استجد فيها، وربطها بمواد النظام والأنظمة ذات الصلة، وتطبيقاتها ومسائلها مع أجوبتها.</p>' +
      '<div class="meta-row"><span>يُعمل بالنظام واللائحة بعد مضي <b>180</b> يومًا من نشر النظام في <b>1447/11/14هـ</b> (<a href="#/instruments/nafath">بيان تاريخ النفاذ</a>)</span><span><b>65</b> مادة نظامية و<b>54</b> مادة لائحية</span>' +
      '<span>' + (all ? 'المادة العلمية مكتملة للمواد كلها' : 'اكتملت المادة العلمية في ' + articlesCount(ready.length) + ' من <b>' + D.law.length + '</b>') + '</span></div>' +
      '<div class="btn-row">' +
      '<a class="btn primary" href="' + lawHref(1) + '">' + (all ? 'ابدأ المدارسة من المادة (1)' : 'من المادة الأولى') + '</a>' +
      (!all && ready.length ? '<a class="btn" href="' + lawHref(ready[0]) + '">أول مادة مكتملة: المادة (' + ready[0] + ')</a>' : '') +
      '<a class="btn" href="#/instruments">أداة الإصدار والنفاذ</a>' +
      '<a class="btn" href="#/about">منهجية المدارسة</a>' +
      '</div></section>';
    h += '<h2 class="section-title">أبواب النظام</h2><div class="parts">';
    D.parts.forEach(function (p, i) {
      var nums = []; p.chapters.forEach(function (c) { nums = nums.concat(c.articles); });
      h += '<details class="part-row"><summary><span class="part-badge">' + (i + 1) + '</span><span class="part-text"><b>' + esc(p.label) + ': ' + esc(p.name) + '</b><span>المواد من ' + nums[0] + ' إلى ' + nums[nums.length - 1] +
        (p.chapters.length > 1 ? '، في ' + p.chapters.length + ' فصلًا' : '') + '</span></span>' + I.chev + '</summary><div class="part-body">';
      p.chapters.forEach(function (c) {
        if (c.label) h += '<div class="toc-chapter">' + esc(c.label) + ': ' + esc(c.name) + '</div>';
        h += '<ul class="grid-articles">' + c.articles.map(tocItem).join('') + '</ul>';
      });
      h += '</div></details>';
    });
    h += '</div>';
    h += '<h2 class="section-title">كيف تُقرأ المادة العلمية؟</h2>' + legendCards();
    return { title: SITE, html: h };
  }

  /* ───── عرض المادة ───── */
  function crumbs(a) {
    var h = '<nav class="crumbs" aria-label="موضع المادة">';
    h += '<span>' + esc(a.part.label) + ': ' + esc(a.part.name) + '</span>';
    if (a.chapter) h += I.sep + '<span>' + esc(a.chapter.label) + ': ' + esc(a.chapter.name) + '</span>';
    return h + '</nav>';
  }
  function regCard(r) {
    return '<article class="textcard reg" id="r' + r.n + '"><div class="tc-head"><span class="tc-label">نص اللائحة</span>' +
      '<span class="tc-name">اللائحة التنفيذية: المادة ' + esc(r.ord) + ' (' + r.n + ')</span>' +
      '<span class="tc-src">' + offLink(OFF('regulation'), 'اللائحة في جريدة أم القرى') + '</span>' +
      '<span class="tc-tools"><button class="icon-btn" data-copy-reg="' + r.n + '" aria-label="نسخ نص المادة اللائحية">' + I.copy + '</button></span></div>' +
      '<div class="official">' + officialHTML(r.paras) + '</div></article>';
  }
  function renderBlocks(blocks) {
    return blocks.map(function (b) {
      if (b.t === 'p') return '<p>' + md(b.x) + '</p>' + (b.cite ? '<span class="cite">' + md(b.cite) + '</span>' : '');
      if (b.t === 'h') return '<h4>' + md(b.x) + punc(b.x) + '</h4>';
      if (b.t === 'list') return '<ul class="plain">' + b.items.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>';
      if (b.t === 'pt') return '<div class="point"><div class="point-head"><span class="point-h">' + md(b.h) + punc(b.h) + '</span></div><p>' + (HAS_HL.test(b.x) ? '' : tag(b.tag)) + md(b.x) + '</p></div>';
      return '';
    }).join('');
  }
  function refText(ref) {
    var k = ref.split(':')[0], v = ref.slice(k.length + 1);
    if (k === 'م' && D.lawBy[v]) return { kind: 'law', obj: D.lawBy[v], href: lawHref(v), off: [OFF('enforcement'), 'صفحة النظام في هيئة الخبراء'] };
    if (k === 'ل' && D.regBy[v]) return { kind: 'reg', obj: D.regBy[v], href: regHref(+v), off: [OFF('regulation'), 'اللائحة في جريدة أم القرى'] };
    if (k === 'مرسوم') {
      var dec = D.instruments.filter(function (x) { return x.id === 'decree'; })[0];
      var b = dec && dec.blocks.filter(function (x) { return x.text.indexOf(v + ':') === 0; })[0];
      if (b) return { kind: 'decree', obj: { paras: [b.text] }, href: '#/instruments/decree', off: [OFF('enforcement'), 'صفحة النظام في هيئة الخبراء'] };
    }
    return null;
  }
  function renderLinks(s) {
    var h = '', out = '', nInt = 0, nExt = 0;
    (s.internal || []).forEach(function (L) {
      var R = refText(L.ref); if (!R) return; nInt++;
      var paras = L.paras ? L.paras.map(function (i) { return R.obj.paras[i]; }) : R.obj.paras;
      h += '<div class="linkcard"><div class="lc-head"><a class="lc-name" data-int="1" href="' + R.href + '">' + esc(L.label) + '</a><span class="rel">' + esc(L.rel) + '</span></div><div class="lc-body">' +
        '<details class="lc-more" open><summary><span class="lc-label">النص</span><span class="lc-more-t"><span class="when-closed">عرض النص</span><span class="when-open">إخفاء النص</span></span>' + I.chev + '</summary>' +
        '<div class="lc-text' + (R.kind === 'reg' ? ' reg' : '') + ' official">' + officialHTML(paras) + '</div>' + (offLink(R.off[0], R.off[1]) ? '<span class="cite" style="margin-top:4px">' + offLink(R.off[0], R.off[1]) + '</span>' : '') + '</details>' +
        '<div class="lc-part lc-comment"><span class="lc-label">تعليق المدارسة:</span><span class="lc-sub">وجه الارتباط:</span><p>' + md(L.why) + '</p><span class="lc-sub">أثره في تطبيق المادة:</span><p>' + md(L.effect) + '</p></div>' +
        '</div></div>';
    });
    out += linkGroup('داخل النظام ولائحته وأداة إصداره', nInt, h); h = '';
    (s.external || []).forEach(function (L) {
      var R = D.refs[L.ref] || {}; nExt++;
      h += '<div class="linkcard" id="ref-' + esc(L.ref) + '"><div class="lc-head"><span class="lc-name">' + esc(R.label || L.ref) + '</span><span class="rel">' + esc(L.rel) + '</span></div><div class="lc-body">';
      var extLink = offLink(R.url, R.urlLabel);
      if (R.paras && R.paras.length) {
        h += '<div class="lc-part"><span class="lc-label">النص</span><div class="lc-text official">' + R.paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
          (R.src ? '<span class="cite" style="margin-top:4px">' + esc(R.src) + '</span>' : '') + (extLink ? '<span class="cite" style="margin-top:2px">' + extLink + '</span>' : '') + '</div>';
      }
      if (L.commentary && L.commentary.length) {
        /* الاقتباس حرفي كما في ملف الوورد، بين علامتي التنصيص دون تعديل */
        h += '<div class="lc-part"><span class="lc-label">شرح الوزارة:</span>' + L.commentary.map(function (c) {
          return '<div class="lc-quote">' + (c.intro ? '<span class="qintro">' + md(c.intro) + ' </span>' : '') + '«' + esc(c.q) + '»<span class="qcite">' + esc(c.cite) + '</span></div>';
        }).join('') + '</div>';
      }
      h += '<div class="lc-part lc-comment"><span class="lc-label">تعليق المدارسة:</span><span class="lc-sub">وجه الارتباط:</span><p>' + md(L.why) + '</p><span class="lc-sub">أثره في تطبيق المادة:</span><p>' + md(L.effect) + '</p>' +
        (L.pending ? '<div class="lc-pending">' + md(L.pending) + '</div>' : '') +
        (!R.paras || !R.paras.length ? (extLink ? '<p class="cite">' + extLink + '</p>' : '') : '') +
        '</div></div></div>';
    });
    out += linkGroup('الأنظمة الأخرى', nExt, h);
    return out;
  }
  function linkGroup(title, n, body) {
    if (!n) return '';
    return '<details class="lgroup"><summary><span class="lg-title">' + title + '</span><span class="lg-count" aria-label="عدد البطاقات">' + n + '</span>' + I.chev + '</summary><div class="lg-body">' + body + '</div></details>';
  }
  function renderCases(cases) {
    return cases.map(function (c, i) {
      return '<div class="case"><div class="case-h"><span class="cno">' + (i + 1) + '</span>' + md(c.h) + '</div>' +
        '<span class="case-label">الواقعة:</span><p>' + md(c.facts) + '</p>' +
        (c.assume ? '<p class="case-note">' + md(c.assume) + '</p>' : '') +
        '<span class="case-label">تنزيل النص:</span><ol>' + c.steps.map(function (s) { return '<li>' + md(s) + '</li>'; }).join('') + '</ol>' +
        '<span class="case-label">النتيجة:</span><div class="case-result">' + md(c.result) + '</div>' +
        (c.note ? '<p class="case-note">' + md(c.note) + '</p>' : '') + '</div>';
    }).join('');
  }
  function renderQuestions(qs) {
    return qs.map(function (q, i) {
      var b = '';
      if (q.a) b += q.a.map(function (x) { return '<p class="ans-p">' + (HAS_HL.test(x.x) ? '' : tag(x.tag)) + md(x.x) + '</p>'; }).join('');
      if (q.intro) b += '<p>' + md(q.intro) + '</p>';
      if (q.views) b += q.views.map(function (v) {
        return '<div class="view"><div class="view-h">' + md(v.h) + '</div><ul>' + v.args.map(function (a) { return '<li>' + md(a) + '</li>'; }).join('') + '</ul></div>';
      }).join('');
      if (q.common) b += '<div class="common">' + md(q.common) + '</div>';
      if (q.proposed) b += '<div class="proposed">' + (HAS_HL.test(q.proposed) ? '<span class="prop-h">الرأي المقترح:</span>' : tag('proposed')) + '<div>' + md(q.proposed) + '</div></div>';
      if (q.kind === 'مدارسة') b += '<div class="council"><b class="council-h">ما انتهى إليه المجلس:</b>يُدوَّن بعد اللقاء.</div>';
      return '<details class="q" id="' + q.id + '"><summary><span class="q-no">' + (i + 1) + '</span><span class="q-main"><span class="q-kind k-' + esc(q.kind) + '">' + esc(q.kind) + '</span><span class="q-text" style="display:block">' + md(q.q) + '</span></span>' +
        '<span class="q-toggle"><span class="when-closed">إظهار الجواب</span><span class="when-open">إخفاء الجواب</span></span></summary><div class="q-body">' + b + '</div></details>';
    }).join('');
  }
  /* أقسام المادة العلمية مطوية ابتداءً، وتُفتح بالنقر على عنوانها (طلب المدير، 1448/5/13هـ) */
  var OPEN_BY_DEFAULT = {};
  function renderStudy(st) {
    var h = '<div class="content">' + (st.format >= 2 ? hlLegend() : '');
    st.sections.forEach(function (s, i) {
      var body = '';
      if (s.blocks) body = renderBlocks(s.blocks);
      else if (s.id === 'links') body = renderLinks(s);
      else if (s.cases) body = renderCases(s.cases);
      else if (s.questions) body = renderQuestions(s.questions);
      else if (s.checklist) body = '<ol class="checklist">' + s.checklist.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>';
      else if (s.items) body = '<ol class="refs">' + s.items.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>';
      h += '<details class="sec" id="sec-' + s.id + '" data-sec="' + s.id + '"' + (OPEN_BY_DEFAULT[s.id] ? ' open' : '') + '><summary><span class="sec-no">' + (i + 1) + '</span><span><span class="sec-title">' + esc(s.title) + '</span>' +
        (s.lead ? '<span class="sec-lead">' + md(s.lead) + '</span>' : '') + '</span>' + I.chev + '</summary><div class="sec-body">' + body + '</div></details>';
    });
    return h + '</div>';
  }
  function viewArticle(n) {
    var a = D.lawBy[n];
    if (!a) return viewNotFound();
    CTX = n;
    var st = D.studies[n], hasSt = !!D.studySet[n];
    var h = '<div class="print-head">' + SITE + ': المادة (' + n + ')</div>';
    h += crumbs(a);
    h += '<header class="art-head"><div class="art-kicker"><span class="art-no">المادة (' + n + ')</span><span class="art-ord">المادة ' + esc(a.ord) + '</span>' +
      '<span class="status' + (hasSt ? ' ready' : '') + '">' + (hasSt ? 'مادة علمية مكتملة' : 'النص فقط') + '</span></div>' +
      '<h1 class="art-title">' + esc(a.title) + '</h1>' +
      (st && st.abstract ? '<div class="abstract">' + md(st.abstract) + '</div>' : '') + '</header>';
    h += '<div class="toolbar no-print" role="toolbar" aria-label="أدوات المادة">' +
      '<button class="icon-btn" data-act="copylink" aria-label="نسخ رابط المادة" title="نسخ رابط المادة">' + I.link + '<span class="lbl">نسخ الرابط</span></button>' +
      '<button class="icon-btn" data-act="copytext" aria-label="نسخ نص المادة" title="نسخ نص المادة">' + I.copy + '<span class="lbl">نسخ النص</span></button>' +
      '<button class="icon-btn" data-act="print" aria-label="طباعة المادة" title="طباعة المادة">' + I.print + '<span class="lbl">طباعة</span></button>' +
      (st ? '<button class="icon-btn" data-act="toggleall" id="toggleAll" aria-label="طيّ الأقسام كلها" title="طيّ الأقسام أو توسيعها">' + I.collapse + '<span class="lbl">طيّ الكل</span></button>' : '') +
      '<span class="grow"></span>' +
      '<span class="fs-group" aria-label="حجم خط القراءة"><button data-act="fs-" aria-label="تصغير الخط">أ−</button><span class="fs-val" id="fsVal"></span><button data-act="fs+" aria-label="تكبير الخط">أ+</button></span>' +
      '</div>';
    h += '<article class="textcard law" id="text"><div class="tc-head"><span class="tc-label">نص النظام</span><span class="tc-name">المادة ' + esc(a.ord) + ' (' + n + ')</span>' +
      '<span class="tc-src">' + offLink(OFF('enforcement'), 'صفحة النظام في هيئة الخبراء') + '</span>' +
      '<span class="tc-tools"><button class="icon-btn" data-act="copytext" aria-label="نسخ نص المادة">' + I.copy + '</button></span></div>' +
      '<div class="official">' + officialHTML(a.paras) + '</div></article>';
    a.regs.forEach(function (rn) { if (D.regBy[rn]) h += regCard(D.regBy[rn]); });
    if (a.citedByRegs && a.citedByRegs.length) {
      h += '<p class="also">وتحيل إلى هذه المادة أيضًا من اللائحة: ' + a.citedByRegs.map(function (r) { return '<a class="xref" data-int="1" href="' + regHref(r) + '">المادة (' + r + ')</a>'; }).join('، ') + '.</p>';
    }
    if (st) h += renderStudy(st);
    else if (hasSt) h += '<div class="empty-note"><b>تعذر تحميل المادة العلمية لهذه المادة.</b><br>تأكد من الاتصال بالإنترنت ثم أعد تحميل الصفحة.</div>';
    else h += '<div class="empty-note"><b>المادة العلمية لهذه المادة قيد الإعداد.</b><br>يظهر هنا نص المادة وما يتصل بها من اللائحة، وتُضاف عناصر المدارسة بعد اعتماد النموذج. ويمكن الاطلاع على النموذج المكتمل في <a class="xref" data-int="1" href="' + lawHref(11) + '">المادة (11)</a>.</div>';
    var prev = D.lawBy[n - 1], next = D.lawBy[n + 1];
    h += '<nav class="pager no-print" aria-label="التنقل بين المواد">' +
      (prev ? '<a href="' + lawHref(prev.n) + '"><span class="pl">' + I.prev + 'المادة السابقة (' + prev.n + ')</span><span class="pt">' + esc(prev.title) + '</span></a>' : '<span class="disabled"></span>') +
      (next ? '<a class="next" href="' + lawHref(next.n) + '"><span class="pl">المادة التالية (' + next.n + ')' + I.next + '</span><span class="pt">' + esc(next.title) + '</span></a>' : '<span class="disabled"></span>') +
      '</nav>';
    return { title: 'المادة (' + n + '): ' + a.title + ' - ' + SITE, html: h, label: 'المادة (' + n + ')' };
  }

  function viewInstruments() {
    var h = '<div class="doc"><div class="eyebrow">أداة الإصدار والنفاذ</div><h1>المرسوم الملكي وقرار مجلس الوزراء وقرار إصدار اللائحة وتعميمها</h1>' +
      '<p>نصوص أداة إصدار النظام ولائحته، وفيها الأحكام الانتقالية المؤثرة في تطبيق النظام.</p></div>';
    h += '<article class="textcard note" id="nafath"><div class="tc-head"><span class="tc-label">تنبيه</span><span class="tc-name">تاريخ العمل بالنظام واللائحة</span></div><div class="official-note">' +
      '<p>نصت ' + '<a class="xref" data-int="1" href="#/article/65">الفقرة (2) من المادة (65)</a>' + ' على أن يُعمل بالنظام «بعد مضي (مائة وثمانين) يوماً من تاريخ نشره في الجريدة الرسمية»، ونصت ' + '<a class="xref" data-int="1" href="' + regHref(54) + '">المادة (54) من اللائحة</a>' + ' على أن يُعمل باللائحة من تاريخ العمل بالنظام. وقد نُشر النظام في جريدة أم القرى في 1447/11/14هـ (مذكرة الفروق، ص5)، الموافق 2026/5/1م.</p>' +
      '<p>وأعلنت وزارة العدل عند إقرار اللائحة أن العمل بها يبدأ «بالتزامن مع سريان النظام في 29 أكتوبر 2026م»، الموافق 1448/5/18هـ (بيان الوزارة في حسابها على منصة إكس، كما نقلته ' + offLink('https://ajel.sa/local/mzixulncu', 'صحيفة عاجل') + ' في 1448/5/12هـ). وذكرت النسخة المنسقة ومذكرة الفروق أن العمل به من 1448/5/17هـ؛ ويوافق الإعلانُ طريقةَ الوزارة في حساب النفاذ، إذ جعلت بدء سريان نظام المعاملات المدنية اليوم التالي لمضي المدة كاملة بعد يوم النشر (وزارة العدل، شرح نظام المعاملات المدنية، ج4، شرح المادة (721)، ص291).</p>' +
      '<p class="cite">المقابلة بين التاريخين الهجري والميلادي بتقويم أم القرى.</p></div></article>';
    D.instruments.forEach(function (ins) {
      var src = ins.id === 'circular' ? esc(ins.src || '') :
        ins.id === 'minister' ? esc(ins.src || '') + (OFF('regulation') ? '، و' + offLink(OFF('regulation'), 'نشره مع اللائحة في جريدة أم القرى') : '') :
        offLink(OFF('enforcement'), 'صفحة النظام في هيئة الخبراء');
      h += '<article class="textcard decree" id="' + ins.id + '"><div class="tc-head"><span class="tc-label">' + esc(ins.label) + '</span><span class="tc-name">' + esc(ins.title) + '</span><span class="tc-src">' + src + '</span></div><div class="official">' +
        ins.blocks.map(function (b) { return b.type === 'head' ? '<p><strong>' + linkifyOfficial(esc(b.text)) + '</strong></p>' : '<p>' + linkifyOfficial(esc(b.text)) + '</p>'; }).join('') + '</div></article>';
    });
    return { title: 'أداة الإصدار والنفاذ - ' + SITE, html: h, label: 'أداة الإصدار' };
  }

  function viewAbout() {
    var rels = [
      ['يحدد محل الحكم ونطاقه', 'يبيّن الشيء الذي يرد عليه حكم المادة وحدوده.'],
      ['يحدد الاختصاص', 'يبيّن الجهة التي تنظر المسألة وحدود نظرها.'],
      ['يبيّن طريق الإثبات', 'يبيّن كيف تثبت الواقعة التي يقوم عليها الحكم.'],
      ['يقرر استثناءً أو قيدًا', 'يخرج بعض الحالات من الحكم أو يضيّقه.'],
      ['ينظم إجراءً سابقًا', 'ينظم مرحلة تسبق تطبيق المادة أو تمهد له.'],
      ['ينظم إجراءً لاحقًا', 'ينظم مرحلة تلي تطبيق المادة أو تترتب عليه.'],
      ['يبيّن طريق الاعتراض', 'يبيّن وسيلة الاعتراض على الإجراء أو القرار.'],
      ['يحكم أصل الحق', 'يتناول وجود الحق نفسه أو انقضاءه أو سماع الدعوى به.'],
      ['يرتب الأولوية بين الدائنين', 'يحدد مراتب الحقوق عند التزاحم.'],
      ['يحكم السريان الزمني', 'يبيّن أثر الانتقال بين النظامين ووقت تطبيق الحكم.'],
      ['يكمّل الحكم فيما لم يرد فيه نص', 'يُرجع إليه فيما سكتت عنه المادة.'],
      ['يعين على التفسير بالمقارنة', 'نص في محل آخر يُستأنس به في فهم المادة، دون نقل حكمه إليها إلا بدليل.']
    ];
    var h = '<div class="doc"><div class="eyebrow">عن المدارسة</div><h1>منهجية المدارسة</h1>' +
      '<p>تهدف المدارسة إلى إعداد مادة علمية مكتملة لكل مادة من مواد نظام التنفيذ، تجيب عن ثلاثة أسئلة: ما معنى النص؟ ومتى يُطبق؟ وكيف يؤثر في الإجراء أو القرار؟</p>' +
      '<h2>عناصر المادة العلمية</h2><div class="card"><ol class="refs" style="font-size:16px">' +
      '<li><b>النص وما يتصل به:</b> نص المادة كاملًا، ومواد اللائحة المرتبطة بها، والمواد المتصلة بها داخل النظام.</li>' +
      '<li><b>الشرح:</b> الحكم وتعليله وشروطه وحدوده واستثناءاته، مع تمييز كل جزء بلونه.</li>' +
      '<li><b>الجديد وأثره العملي:</b> ما استُحدث أو تغيّر موازنةً بالنظام السابق ولائحته: حكم مستحدث، أو تعديل حكم سابق، أو إعادة صياغة أو تنظيم، أو حكم أُلغي، وأثر ذلك في العمل.</li>' +
      '<li><b>الروابط:</b> مجموعتان: داخل النظام ولائحته وأداة إصداره، والأنظمة الأخرى. ولكل رابط: النص المرتبط ورقمه ومصدره، ونوع العلاقة، ووجه الارتباط، وأثره.</li>' +
      '<li><b>التطبيق:</b> وقائع افتراضية قصيرة: الواقعة، وطريقة تنزيل النص عليها، والنتيجة وسببها.</li>' +
      '<li><b>مسائل المدارسة:</b> أسئلة تكشف التباسًا، أو تختبر شرطًا أو استثناءً، أو تناقش إشكالًا حقيقيًّا، يظهر جوابها عند الضغط.</li>' +
      '<li><b>الخلاصة العملية:</b> ما يلزم التحقق منه عند تطبيق المادة.</li></ol></div>' +
      '<h2>دليل الألوان</h2>' + legendCards() +
      '<h2>أنواع العلاقة في الروابط</h2><div class="card"><table class="reltable"><thead><tr><th>نوع العلاقة</th><th>معناه</th></tr></thead><tbody>' +
      rels.map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h2>أنواع الأسئلة</h2><div class="card"><ul class="refs" style="font-size:16px"><li><b>فهم:</b> جوابه في النص أو فيما يُستنبط منه، ويُذكر معه رقم المادة.</li><li><b>تطبيق:</b> واقعة قصيرة، ويظهر حلها مع التعليل.</li><li><b>مدارسة:</b> مسألة يحتمل النص فيها قراءتين لكل منهما حجة معتبرة، تُعرض فيها الآراء ووجه كل منها، ثم رأي مقترح، وخانة لما ينتهي إليه المجلس. ولا يُفترض خلاف لا يقول به أحد.</li></ul></div>' +
      '<h2>المصادر وطريقة الإحالة</h2><div class="card"><ul class="refs" style="font-size:16px">' +
      '<li>نص النظام وأداة إصداره منقولان حرفيًّا، وعند كل نص رابط إلى ' + (offLink(OFF('enforcement'), 'صفحة النظام في هيئة الخبراء') || 'صفحة النظام في هيئة الخبراء') + '.</li>' +
      '<li>نصوص اللائحة طوبقت كلمةً كلمة بالصورة الرسمية المرفقة بتعميم وزارة العدل رقم (13/ت/10055) وتاريخ 1448/5/11هـ، وصُحح ما خالفها؛ وهي مطابقة لما نُشر في ' + (offLink(OFF('regulation'), 'جريدة أم القرى') || 'جريدة أم القرى') + ' في 1448/5/12هـ.</li>' +
      '<li>لكل نظام آخر يُستشهد به رابط إلى صفحته الرسمية، متى توافر رابطها.</li>' +
      '<li>عناوين المواد والتقسيمات التحريرية المضافة (كأقسام المادة العلمية) من إعداد المدارسة، وليست من النص الرسمي؛ أما عناوين الأبواب والفصول فمن النص الرسمي للنظام.</li>' +
      '<li>نصوص نظام المعاملات المدنية منقولة من شرح وزارة العدل، والاقتباس منه حرفي بين علامتي التنصيص « »، بصيغة: وزارة العدل، شرح نظام المعاملات المدنية، ج[الجزء]، شرح المادة ([رقمها])، ص[الصفحة]، بعد التحقق من رقم الصفحة في النسخة المصورة.</li>' +
      '<li>يُفصل دائمًا بين نص المادة، وشرح الوزارة، وتعليق المدارسة.</li>' +
      '<li>ما لم تتم مطابقة نصه لا يُذكر رقمه، ويُشار إليه بوصفه موضعًا للبحث.</li></ul></div>' +
      '<h2>حالة الإعداد</h2><div class="card"><p style="margin:0">' +
      (D.studyList.length >= D.law.length ? 'اكتملت المادة العلمية لمواد النظام كلها، وعددها ' + D.law.length + ' مادة. وكل مادة مرّت بكتابة ثم مراجعة مستقلة ثم تحرير.' :
      'المواد التي اكتملت مادتها العلمية: ' +
      D.studyList.map(function (n) { return '<a class="xref" data-int="1" href="' + lawHref(n) + '">المادة (' + n + ')</a>'; }).join('، ') +
      '. وبقية المواد يظهر فيها النص الرسمي وما يتصل به من اللائحة إلى حين إعداد مادتها العلمية.') + '</p></div></div>';
    return { title: 'منهجية المدارسة - ' + SITE, html: h, label: 'منهجية المدارسة' };
  }
  function viewNotFound(route) {
    var head = route && route.bad ? 'الرابط غير صالح.' : 'الصفحة غير موجودة.';
    return { title: SITE, html: '<div class="empty-note"><b>' + head + '</b><br>تأكد من الرابط، أو انتقل إلى <a href="#/">الصفحة الرئيسية</a>.</div>' };
  }

  /* ───── التوجيه ───── */
  function parseHash() {
    var h;
    try { h = decodeURIComponent(location.hash || ''); } catch (e) { return { name: 'notfound', bad: true }; }
    h = h.replace(/^#\/?/, '');
    if (h === 'main') return { name: 'home' };   /* رابط قديم لزر «تجاوز إلى المحتوى» */
    var parts = h.split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'article' && /^\d+$/.test(parts[1] || '')) return { name: 'article', n: +parts[1], anchor: parts[2] || '' };
    if (parts[0] === 'instruments') return { name: 'instruments', anchor: parts[1] || '' };
    if (parts[0] === 'about') return { name: 'about' };
    return { name: 'notfound' };
  }
  var current = { route: null, label: '' };
  var pendingScroll = null;

  var renderToken = 0;
  function render() {
    var route = parseHash(), token = ++renderToken;
    if (route.name === 'article' && D.studySet[route.n] && !D.studies[route.n]) {
      /* انتظر المادة العلمية قبل العرض حتى لا تقفز الصفحة، وأظهر مؤشرًا إن تأخرت */
      var slow = setTimeout(function () {
        if (token !== renderToken) return;
        $('#view').innerHTML = '<div class="empty-note">جارٍ تحميل المادة…</div>';
        current.route = null; current.studyShown = null;   /* المعروض الآن مؤشر التحميل لا المادة السابقة */
      }, 200);
      ensureStudy(route.n).then(function () { clearTimeout(slow); if (token === renderToken) renderNow(route); });
      return;
    }
    renderNow(route);
  }
  function renderNow(route) {
    var v = route.name === 'home' ? viewHome() : route.name === 'article' ? viewArticle(route.n) :
      route.name === 'instruments' ? viewInstruments() : route.name === 'about' ? viewAbout() : viewNotFound(route);
    /* «المادة نفسها» فقط إذا كان المعروض هو هذه المادة بحالة مادتها العلمية نفسها (محمّلة أو غير محمّلة) */
    var sameArticle = !!(current.route && route.name === 'article' && current.route.name === 'article' &&
      current.route.n === route.n && current.studyShown === !!D.studies[route.n]);
    if (!sameArticle) {
      $('#view').innerHTML = v.html;
      updateFsVal();
      syncToggleLabel();
    }
    document.documentElement.classList.toggle('with-toolbar', !!$('#view .toolbar'));
    document.title = v.title;
    current.route = route; current.label = v.label || 'الصفحة السابقة';
    current.studyShown = route.name === 'article' ? !!D.studies[route.n] : null;
    markTOC(route);
    closeDrawer(); closeSearch();
    var restoreY = null;
    if (pendingScroll) {
      if (pendingScroll.hash === (location.hash || '#/')) restoreY = pendingScroll.y;
      pendingScroll = null;
    }
    if (restoreY !== null) {
      /* الرجوع إلى موضع قراءة سابق: يُفتح ما كان مفتوحًا للإحالة حتى يطابق الموضع، ثم يُستعاد الموضع نفسه */
      if (route.anchor) {
        var tgt = document.getElementById(route.anchor) || document.getElementById('sec-' + route.anchor);
        if (tgt) openAround(tgt);
      }
      requestAnimationFrame(function () { window.scrollTo(0, restoreY); });
    } else if (route.anchor) {
      var el = document.getElementById(route.anchor) || document.getElementById('sec-' + route.anchor);
      if (el) {
        openAround(el);
        requestAnimationFrame(function () {
          /* التمرير السلس للمسافات القصيرة داخل المادة نفسها، والانتقال المباشر لما عداها */
          var far = !sameArticle || Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 2.5;
          el.scrollIntoView({ block: 'start', behavior: (prefersReduced() || far) ? 'auto' : 'smooth' });
          el.classList.remove('flash'); el.classList.remove('flash-target'); void el.offsetWidth;
          el.classList.add(el.classList.contains('linkcard') ? 'flash' : 'flash-target');
        });
      }
    } else if (!sameArticle) {
      window.scrollTo(0, 0);
    }
    if (lastQuery && route.name !== 'home') {
      highlightTerms($('#view'), lastQuery); lastQuery = '';
      var first = $('#view mark.hit');
      if (first && !route.anchor) requestAnimationFrame(function () { first.scrollIntoView({ block: 'center' }); });
    }
    refreshBackChip();
  }
  function openAround(el) {
    for (var d = el; d; d = d.parentElement) { if (d.tagName === 'DETAILS') d.open = true; }
  }
  var prefersReduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* ───── العودة إلى موضع القراءة السابق ───── */
  var backStack = null;
  function rememberPosition() {
    backStack = { hash: location.hash || '#/', y: window.scrollY, label: current.label };
    try { history.replaceState({ y: window.scrollY }, ''); } catch (e) { /* */ }
  }
  function refreshBackChip() {
    var chip = $('#backChip');
    if (backStack && backStack.hash !== (location.hash || '#/')) {
      $('#backChipText').textContent = 'العودة إلى ' + backStack.label;
      chip.classList.add('show');
    } else {
      chip.classList.remove('show');
      if (backStack && backStack.hash === (location.hash || '#/')) backStack = null;
    }
  }
  $('#backChip').addEventListener('click', function (e) {
    if (e.target.id === 'backChipClose') { backStack = null; refreshBackChip(); return; }
    if (!backStack) return;
    var b = backStack; backStack = null;
    var base = b.hash.split('/').slice(0, 3).join('/');
    pendingScroll = { y: b.y, hash: base };
    if ((location.hash || '#/') === base) { render(); } else { location.hash = base; }
  });
  /* «تجاوز إلى المحتوى»: ينقل التركيز إلى المحتوى دون تغيير مسار الصفحة */
  var skipLink = document.querySelector('a.skip');
  if (skipLink) skipLink.addEventListener('click', function (e) {
    e.preventDefault();
    var m = $('#main'); if (!m) return;
    m.focus({ preventScroll: true });
    m.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('popstate', function (e) {
    pendingScroll = (e.state && typeof e.state.y === 'number') ? { y: e.state.y, hash: location.hash || '#/' } : null;
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-int]');
    if (a && a.closest('#view')) rememberPosition();
  }, true);

  /* ───── أدوات المادة ───── */
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function copy(text, msg) {
    var ok = function () { toast(msg); };
    var fail = function () { toast('تعذر النسخ، فانسخ النص يدويًّا'); };
    var viaFallback = function () { if (fallbackCopy(text)) ok(); else fail(); };
    if (navigator.clipboard && window.isSecureContext) {
      try { navigator.clipboard.writeText(text).then(ok, viaFallback); } catch (e) { viaFallback(); }
    } else { viaFallback(); }
  }
  /* النسخ البديل: يعيد true عند النجاح فقط */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'), done = false; ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { done = document.execCommand('copy') === true; } catch (e) { done = false; }
    document.body.removeChild(ta);
    return done;
  }
  function articleLink(n) { return location.href.split('#')[0] + '#/article/' + n; }
  function plainArticle(a) {
    return 'نظام التنفيذ، المادة ' + a.ord + ' (' + a.n + ')\n' + a.paras.join('\n') + '\n' + articleLink(a.n);
  }
  function plainReg(r) {
    return 'اللائحة التنفيذية لنظام التنفيذ، المادة ' + r.ord + ' (' + r.n + ')\n' + r.paras.join('\n');
  }
  var FS = [16, 17, 18, 19, 20, 21, 22, 24];
  function currentFs() {
    var v = store.get('fs', null); if (v) return v;
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 19;
  }
  function applyFs(v) {
    if (v) document.documentElement.style.setProperty('--fs', v + 'px');
    updateFsVal();
  }
  function updateFsVal() { var el = $('#fsVal'); if (el) el.textContent = Math.round(currentFs()); }
  function stepFs(d) {
    var v = currentFs(), i = FS.indexOf(Math.round(v)); if (i < 0) i = 3;
    i = Math.max(0, Math.min(FS.length - 1, i + d)); store.set('fs', FS[i]); applyFs(FS[i]);
  }
  /* «طيّ الكل» يطوي الأقسام والأسئلة ونصوص الروابط، و«توسيع الكل» يفتحها جميعًا */
  function toggleAll() {
    var anyOpen = $$('#view details.sec').some(function (d) { return d.open; });
    $$('#view details.sec, #view details.lgroup, #view details.q, #view details.lc-more').forEach(function (d) { d.open = !anyOpen; });
    syncToggleLabel();
  }
  function syncToggleLabel() {
    var b = $('#toggleAll'); if (!b) return;
    var anyOpen = $$('#view details.sec').some(function (d) { return d.open; });
    b.innerHTML = anyOpen ? I.collapse + '<span class="lbl">طيّ الكل</span>' : I.expand + '<span class="lbl">توسيع الكل</span>';
    b.setAttribute('aria-label', anyOpen ? 'طيّ الأقسام كلها' : 'توسيع الأقسام كلها');
  }
  document.addEventListener('toggle', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('sec')) syncToggleLabel();
  }, true);
  function doPrint() {
    var ds = $$('#view details'), prev = ds.map(function (d) { return d.open; });
    ds.forEach(function (d) { d.open = true; });
    var restore = function () { ds.forEach(function (d, i) { d.open = prev[i]; }); window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (b) {
      var act = b.getAttribute('data-act'), r = current.route;
      if (act === 'copylink' && r && r.n) copy(articleLink(r.n), 'نُسخ رابط المادة');
      else if (act === 'copytext' && r && r.n) copy(plainArticle(D.lawBy[r.n]), 'نُسخ نص المادة');
      else if (act === 'print') doPrint();
      else if (act === 'toggleall') toggleAll();
      else if (act === 'fs+') stepFs(1);
      else if (act === 'fs-') stepFs(-1);
      return;
    }
    var c = e.target.closest('[data-copy-reg]');
    if (c) copy(plainReg(D.regBy[+c.getAttribute('data-copy-reg')]), 'نُسخ نص المادة اللائحية');
  });

  /* ───── الفهرس على الجوال ───── */
  function openDrawer() { $('#sidebar').classList.add('open'); $('#overlay').classList.add('show'); $('#menuBtn').setAttribute('aria-expanded', 'true'); }
  function closeDrawer() { $('#sidebar').classList.remove('open'); if (!$('#searchWrap').classList.contains('mobile-open')) $('#overlay').classList.remove('show'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }
  $('#menuBtn').addEventListener('click', function () { $('#sidebar').classList.contains('open') ? closeDrawer() : openDrawer(); });
  $('#closeDrawer').addEventListener('click', closeDrawer);
  $('#overlay').addEventListener('click', function () { closeDrawer(); closeSearch(); });

  /* ───── البحث ───── */
  var NORM = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي', '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  var STRIP = /[ً-ٰٟـ]/;
  function normMap(text) {
    var s = '', map = [];
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (STRIP.test(c)) continue;
      c = NORM[c] || c.toLowerCase();
      if (/\s/.test(c)) { if (s.slice(-1) === ' ') continue; c = ' '; }
      s += c; map.push(i);
    }
    return { s: s, map: map };
  }
  var norm = function (t) { return normMap(t).s.trim(); };
  var IDX = [];
  function addIdx(o) { o.nm = normMap(o.text); IDX.push(o); }
  function collectStudy(n, st) {
    var out = [];
    var push = function (anchor, where, text) { out.push({ anchor: anchor, where: where, text: text.replace(/\{\{[^:]+:[^|}]+\|([^}]+)\}\}/g, '$1').replace(/\{\{(م|ل):(\d+)\}\}/g, function (m, k, d) { return k === 'م' ? 'المادة (' + d + ')' : 'المادة (' + d + ') من اللائحة'; }).replace(/\{\{ر:([^}]+)\}\}/g, function (m, id) { return D.refs[id] ? D.refs[id].label : ''; }).replace(/\{\{س:[^}]+\}\}/g, '').replace(/\*\*/g, '').replace(/\[\[[eirp]:/g, '').replace(/\]\]/g, '') }); };
    st.sections.forEach(function (s) {
      var where = s.title, anc = 'sec-' + s.id;
      if (s.blocks) s.blocks.forEach(function (b) { push(anc, where, [b.h, b.x].concat(b.items || []).filter(Boolean).join('؛ ')); });
      if (s.internal) s.internal.forEach(function (L) { push(anc, where, [L.label, L.rel, L.why, L.effect].join('؛ ')); });
      if (s.external) s.external.forEach(function (L) { var R = D.refs[L.ref] || {}; push('ref-' + L.ref, where, [R.label, L.rel, (R.paras || []).join(' '), L.why, L.effect, (L.commentary || []).map(function (c) { return c.q; }).join(' ')].join('؛ ')); });
      if (s.cases) s.cases.forEach(function (c) { push(anc, where, [c.h, c.facts, c.steps.join(' '), c.result].join('؛ ')); });
      if (s.questions) s.questions.forEach(function (q) {
        push(q.id, 'مسائل المدارسة', [q.q, (q.a || []).map(function (x) { return x.x; }).join(' '), q.intro || '', (q.views || []).map(function (v) { return v.h + ' ' + v.args.join(' '); }).join(' '), q.common || '', q.proposed || ''].filter(Boolean).join('؛ '));
      });
      if (s.checklist) push(anc, where, s.checklist.join('؛ '));
    });
    return out;
  }
  function buildIndex() {
    IDX = [];
    D.law.forEach(function (a) {
      addIdx({ n: a.n, kind: 'title', where: 'العنوان', title: a.title, href: lawHref(a.n), text: a.title, w: 6 });
      addIdx({ n: a.n, kind: 'law', where: 'نص النظام', title: a.title, href: lawHref(a.n), text: a.paras.join(' '), w: 4 });
    });
    D.reg.forEach(function (r) {
      var host = D.lawBy[r.host];
      addIdx({ n: r.n, kind: 'reg', where: 'نص اللائحة', title: 'المادة (' + r.n + ') من اللائحة' + (host ? '، تحت المادة (' + host.n + ')' : ''), href: regHref(r.n), text: r.paras.join(' '), w: 3 });
    });
    Object.keys(D.studies).forEach(function (k) { indexStudy(+k); });
    D.instruments.forEach(function (ins) {
      ins.blocks.forEach(function (b) { addIdx({ n: null, kind: 'ins', where: ins.label, title: ins.title, href: '#/instruments/' + ins.id, text: b.text, w: 1 }); });
    });
  }
  var indexed = {};
  function indexStudy(n) {
    if (indexed[n] || !D.studies[n]) return;
    indexed[n] = 1;
    var a = D.lawBy[n];
    collectStudy(n, D.studies[n]).forEach(function (e) {
      addIdx({ n: n, kind: 'study', where: e.where, title: a ? a.title : '', href: '#/article/' + n + '/' + e.anchor, text: e.text, w: 2 });
    });
  }
  function snippet(e, terms) {
    var s = e.nm.s, best = -1, len = 0;
    terms.forEach(function (t) { var i = s.indexOf(t); if (i >= 0 && (best < 0 || i < best)) { best = i; len = t.length; } });
    if (best < 0) return esc(e.text.slice(0, 140)) + (e.text.length > 140 ? '…' : '');
    var a = e.nm.map[best], b = e.nm.map[Math.min(best + len - 1, e.nm.map.length - 1)] + 1;
    var from = Math.max(0, a - 70), to = Math.min(e.text.length, b + 90);
    var seg = e.text.slice(from, to);
    return (from > 0 ? '…' : '') + highlightString(seg, terms) + (to < e.text.length ? '…' : '');
  }
  function highlightString(text, terms) {
    var nm = normMap(text), ranges = [];
    terms.forEach(function (t) {
      var i = 0; while ((i = nm.s.indexOf(t, i)) >= 0) { ranges.push([nm.map[i], nm.map[i + t.length - 1] + 1]); i += t.length; }
    });
    ranges.sort(function (x, y) { return x[0] - y[0]; });
    var out = '', pos = 0;
    ranges.forEach(function (r) { if (r[0] < pos) return; out += esc(text.slice(pos, r[0])) + '<mark>' + esc(text.slice(r[0], r[1])) + '</mark>'; pos = r[1]; });
    return out + esc(text.slice(pos));
  }
  function search(q) {
    var qn = norm(q);
    if (!qn) return [];
    var res = [];
    var mNum = qn.match(/^(?:(?:ال)?ماده|م)?\s*(\d{1,3})$/);
    var mReg = qn.match(/^(?:(?:ال)?لايحه|ل)\s*(\d{1,3})$/);
    if (mReg && D.regBy[+mReg[1]]) {
      var r = D.regBy[+mReg[1]];
      res.push({ e: { n: r.n, kind: 'reg', where: 'نص اللائحة', title: 'المادة (' + r.n + ') من اللائحة', href: regHref(r.n), text: r.paras.join(' ') }, score: 1e6, num: true });
    } else if (mNum) {
      var n = +mNum[1];
      if (D.lawBy[n]) res.push({ e: { n: n, kind: 'law', where: 'المادة', title: D.lawBy[n].title, href: lawHref(n), text: D.lawBy[n].paras.join(' ') }, score: 1e6, num: true });
      if (D.regBy[n]) res.push({ e: { n: n, kind: 'reg', where: 'نص اللائحة', title: 'المادة (' + n + ') من اللائحة', href: regHref(n), text: D.regBy[n].paras.join(' ') }, score: 1e5, num: true });
      return res;
    }
    var terms = qn.split(' ').filter(function (t) { return t.length > 1 || /\d/.test(t); });
    if (!terms.length) return res;
    IDX.forEach(function (e) {
      var s = e.nm.s, ok = true, count = 0;
      for (var i = 0; i < terms.length; i++) {
        var c = s.split(terms[i]).length - 1; if (!c) { ok = false; break; } count += c;
      }
      if (ok) res.push({ e: e, score: e.w * 10 + Math.min(count, 8), terms: terms });
    });
    res.sort(function (a, b) { return b.score - a.score || ((a.e.n || 999) - (b.e.n || 999)); });
    var seen = {}, out = [];
    res.forEach(function (r) { var k = r.e.href + '|' + r.e.kind; if (seen[k]) return; seen[k] = 1; out.push(r); });
    return out.slice(0, 40);
  }
  var lastQuery = '', activeIdx = -1, resultsCache = [], resultsQuery = '';
  /* صيغة العدد مع المعدود بحسب قواعد العربية */
  function countLabel(n, capped) {
    if (capped) return 'أبرز ' + n + ' نتيجة';
    if (n === 1) return 'نتيجة واحدة';
    if (n === 2) return 'نتيجتان';
    var r = n % 100;
    return n + (r >= 3 && r <= 10 ? ' نتائج' : ' نتيجة');
  }
  function renderResults(q) {
    var box = $('#results');
    if (!q.trim()) {
      /* مسح الخانة يمحو النتائج السابقة حتى لا تُفتح نتيجة قديمة */
      resultsCache = []; activeIdx = -1; resultsQuery = '';
      box.classList.remove('open'); $('#searchInput').setAttribute('aria-expanded', 'false'); return;
    }
    var list = search(q); resultsCache = list; activeIdx = -1; resultsQuery = q;
    var note = coverageNote(), noteHTML = note ? '<div class="res-note" role="status">' + esc(note) + '</div>' : '';
    var terms = norm(q).split(' ').filter(function (t) { return t.length > 1 || /\d/.test(t); });
    if (!list.length) {
      box.innerHTML = noteHTML + '<div class="res-empty">لا توجد نتائج مطابقة. جرّب رقم المادة (مثل: 11 أو ل12) أو كلمة أخرى.</div>';
    } else {
      box.innerHTML = '<div class="res-head">' + countLabel(list.length, list.length >= 40) + '</div>' + noteHTML + list.map(function (r, i) {
        var e = r.e, num = e.kind === 'reg' ? 'ل' + e.n : (e.n ? 'م' + e.n : '');
        return '<a class="res-item" role="option" href="' + e.href + '" data-i="' + i + '"><div class="res-top"><span class="res-num">' + num + '</span><span class="res-title">' + esc(e.title) + '</span><span class="res-where">' + esc(e.where) + '</span></div>' +
          '<div class="res-snip">' + (r.num ? esc(e.text.slice(0, 150)) + (e.text.length > 150 ? '…' : '') : snippet(e, terms)) + '</div></a>';
      }).join('');
    }
    box.classList.add('open'); $('#searchInput').setAttribute('aria-expanded', 'true');
  }
  function openSearchResult(i) {
    var r = resultsCache[i]; if (!r) return;
    lastQuery = r.num ? '' : $('#searchInput').value;
    closeSearch();
    if (location.hash === r.e.href) render(); else location.hash = r.e.href;
  }
  function closeSearch() {
    $('#results').classList.remove('open'); $('#searchInput').setAttribute('aria-expanded', 'false');
    $('#searchWrap').classList.remove('mobile-open');
    document.body.classList.remove('searching');
    if (!$('#sidebar').classList.contains('open')) $('#overlay').classList.remove('show');
  }
  var sInput = $('#searchInput'), sTimer;
  /* البحث يشمل المواد العلمية كلها: تُجلب عند أول استعمال للبحث، ثم تُحدّث النتائج */
  var refreshAfterLoad = function () {
    ensureAllStudies().then(function () { if (sInput.value.trim() && $('#results').classList.contains('open')) renderResults(sInput.value); });
  };
  sInput.addEventListener('input', function () { clearTimeout(sTimer); sTimer = setTimeout(function () { renderResults(sInput.value); }, 120); refreshAfterLoad(); });
  sInput.addEventListener('focus', function () { if (sInput.value.trim()) renderResults(sInput.value); refreshAfterLoad(); });
  sInput.addEventListener('keydown', function (e) {
    var items = $$('#results .res-item');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!items.length) return;
      activeIdx = (activeIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach(function (it, i) { it.classList.toggle('active', i === activeIdx); });
      items[activeIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var qv = sInput.value;
      if (!qv.trim()) return;
      /* إن لم تُحدَّث النتائج بعد لآخر ما كُتب، فاحسبها الآن قبل الفتح */
      if (resultsQuery !== qv) { clearTimeout(sTimer); renderResults(qv); activeIdx = -1; }
      if (resultsCache.length) openSearchResult(activeIdx >= 0 ? activeIdx : 0);
    } else if (e.key === 'Escape') { closeSearch(); sInput.blur(); }
  });
  $('#results').addEventListener('click', function (e) {
    var a = e.target.closest('.res-item'); if (!a) return;
    e.preventDefault(); openSearchResult(+a.getAttribute('data-i'));
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#searchWrap') && !e.target.closest('#searchMobileBtn')) $('#results').classList.remove('open');
  });
  $('#searchMobileBtn').addEventListener('click', function () {
    var w = $('#searchWrap');
    if (w.classList.contains('mobile-open')) { closeSearch(); return; }
    closeDrawer(); w.classList.add('mobile-open'); document.body.classList.add('searching'); $('#overlay').classList.add('show'); sInput.focus();
  });
  /* زر مسح خانة البحث */
  var sClear = $('#searchClear');
  var syncClear = function () { if (sClear) sClear.classList.toggle('show', !!sInput.value); };
  sInput.addEventListener('input', syncClear);
  if (sClear) sClear.addEventListener('click', function () {
    sInput.value = ''; syncClear(); renderResults(''); sInput.focus();
  });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); if (window.innerWidth < 1024) $('#searchMobileBtn').click(); else sInput.focus(); }
    if (e.key === 'Escape') { closeDrawer(); closeSearch(); }
  });

  /* تمييز كلمات البحث داخل الصفحة بعد الانتقال إليها */
  function highlightTerms(root, q) {
    var terms = norm(q).split(' ').filter(function (t) { return t.length > 1; });
    if (!terms.length || !root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue; if (!text.trim()) return;
      var nm = normMap(text), ranges = [];
      terms.forEach(function (t) { var i = 0; while ((i = nm.s.indexOf(t, i)) >= 0) { ranges.push([nm.map[i], nm.map[i + t.length - 1] + 1]); i += t.length; } });
      if (!ranges.length) return;
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      var frag = document.createDocumentFragment(), pos = 0;
      ranges.forEach(function (r) {
        if (r[0] < pos) return;
        frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
        var m = document.createElement('mark'); m.className = 'hit'; m.textContent = text.slice(r[0], r[1]); frag.appendChild(m);
        pos = r[1];
      });
      frag.appendChild(document.createTextNode(text.slice(pos)));
      openAround(node.parentNode);
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ───── التشغيل ───── */
  try { history.scrollRestoration = 'manual'; } catch (e) { /* */ }
  var savedFs = store.get('fs', null); if (savedFs) applyFs(savedFs);
  load().then(function () {
    window.addEventListener('hashchange', render);   /* قبل العرض الأول حتى لا يعطله خطأ في رابط الفتح */
    renderTOC(); buildIndex(); render();
    setTimeout(ensureAllStudies, 2500);
  }).catch(function (err) {
    $('#view').innerHTML = '<div class="empty-note"><b>تعذر تحميل بيانات المواد.</b><br>تأكد من الاتصال بالإنترنت ثم أعد تحميل الصفحة.</div>';
    $('#toc').innerHTML = '';
    if (window.console) console.error(err);
  });
})();
