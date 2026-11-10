/* Fremdwörter – Oberfläche */
(function () {
  'use strict';

  /* ================= Brücke zur App (im Browser: Ersatz) ================= */
  const A = window.Android || (function () {
    const mockWiki = `== Test ({{Sprache|Deutsch}}) ==
=== {{Wortart|Substantiv|Deutsch}}, {{f}} ===
{{Worttrennung}}
:Ag·glo·me·ra·ti·on, {{Pl.}} Ag·glo·me·ra·ti·o·nen

{{Bedeutungen}}
:[1] {{K|Geologie}} [[Anhäufung]], [[Ansammlung]] von [[Gestein]]en
:[2] {{K|Geografie}} [[Ballungsraum]], [[Verdichtungsraum]]
:[3] {{K|bildungsspr.}} [[Zusammenballung]]

{{Beispiele}}
:[2] Die '''Agglomeration''' Zürich wächst weiter.`;
    const cbs = {};
    return {
      load: () => localStorage.getItem('fw-data') || '',
      seed: () => { const x = new XMLHttpRequest(); x.open('GET', 'woerter.json', false); x.send(); return x.responseText; },
      save: (j) => localStorage.setItem('fw-data', j),
      ready: () => {},
      takePending: () => { const p = localStorage.getItem('fw-pending') || ''; localStorage.removeItem('fw-pending'); return p; },
      version: () => 1,
      getDaily: () => localStorage.getItem('fw-daily') || '{"on":true,"hour":9,"minute":0}',
      setDaily: (on, h, m) => localStorage.setItem('fw-daily', JSON.stringify({ on, hour: h, minute: m })),
      askNotify: () => {}, testNotify: () => toast('Benachrichtigung (Test)'),
      openUrl: (u) => window.open(u, '_blank'),
      hideKeyboard: () => document.activeElement && document.activeElement.blur(),
      lookup: (w, cb) => setTimeout(() => window.__cb(cb, JSON.stringify(
        /x{3}/.test(w) ? { ok: false, error: 'notfound' } : { ok: true, title: w, text: mockWiki })), 500),
      checkUpdate: (cb) => setTimeout(() => window.__cb(cb, '{"ok":true,"tag":"v1"}'), 400),
      pickFile: (cb) => setTimeout(() => window.__cb(cb, JSON.stringify({ ok: true, text: 'Wort;Bedeutung\nTestwort;eine Bedeutung', name: 'test.csv' })), 200),
      saveFile: (n, m, c, cb) => { console.log('saveFile', n, c.length); setTimeout(() => window.__cb(cb, '{"ok":true}'), 200); }
    };
  })();

  const callbacks = {};
  let cbSeq = 0;
  window.__cb = function (id, json) {
    const fn = callbacks[id];
    delete callbacks[id];
    if (fn) { try { fn(JSON.parse(json)); } catch (e) { console.error(e); } }
  };
  function call(method, ...args) {
    return new Promise(res => {
      const id = 'c' + (++cbSeq);
      callbacks[id] = res;
      A[method](...args, id);
    });
  }

  /* ================= Hilfen ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 86400000;
  const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ·]/g, '').trim();
  const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });
  const INTERVALS = [0, 1, 3, 7, 16, 35]; // Tage je Stufe
  const MAXBOX = 5;

  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.4 4 4.7v12.8c3-.3 6 .3 8 1.8m0-12.8c2-1.5 5-2.1 8-1.8v12.8c-3-.3-6 .3-8 1.8m0-12.8v12.8"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cards: '<svg viewBox="0 0 24 24"><path d="M6.5 8h11v11h-11z M9.5 5h11v11"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16zM10 20.5h4"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11m-5-5l5 5 5-5M5 20h14"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 15V4m-5 5l5-5 5 5M5 20h14"/></svg>',
    table: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 10h16M10 10v9"/></svg>',
    wand: '<svg viewBox="0 0 24 24"><path d="M5 19L15 9M14 4v3M19 9h-3M17.5 5.5l-2 2M10 4.5v1M19.5 14h-1"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 11-2.1-5M19 4v4h-4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    test: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>'
  };

  /* ================= Daten ================= */
  let D = { version: 1, woerter: [] };
  let saveTimer = null;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function fresh(w) {
    return {
      id: w.id || uid(),
      wort: (w.wort || '').trim(),
      silben: w.silben || '',
      bedeutung: (w.bedeutung || '').trim(),
      beispiel: w.beispiel || '',
      wortart: w.wortart || '',
      tags: Array.isArray(w.tags) ? w.tags : [],
      auto: !!w.auto,
      erstellt: w.erstellt || Date.now(),
      box: w.box || 0,
      faellig: w.faellig || 0,
      richtig: w.richtig || 0,
      falsch: w.falsch || 0,
      zuletzt: w.zuletzt || 0
    };
  }

  function loadData() {
    let raw = '';
    try { raw = A.load(); } catch (e) { }
    if (raw) {
      try {
        const o = JSON.parse(raw);
        D = Array.isArray(o) ? { version: 1, woerter: o } : o;
        D.woerter = (D.woerter || []).map(fresh);
        return;
      } catch (e) { console.error(e); }
    }
    // Erster Start: mitgelieferte Liste aus der Google-Tabelle
    try {
      const seed = JSON.parse(A.seed());
      const base = Date.now() - seed.length * 1000;
      D = { version: 1, woerter: seed.map((w, i) => fresh({ ...w, id: 's' + i, erstellt: base + i * 1000 })) };
      saveNow();
    } catch (e) { D = { version: 1, woerter: [] }; }
  }

  function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    try { A.save(JSON.stringify(D)); } catch (e) { console.error(e); }
  }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  window.flush = () => { if (saveTimer) saveNow(); };

  const byId = id => D.woerter.find(w => w.id === id);
  const byWord = (word, exceptId) => { const n = norm(word); return D.woerter.find(w => norm(w.wort) === n && w.id !== exceptId); };
  const hasMeaning = w => !!w.bedeutung.trim();

  function allTags() {
    const m = new Map();
    D.woerter.forEach(w => w.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
  }

  /** „[1] a [2] b“ → Liste mit Nummern */
  function splitMeaning(text) {
    const t = (text || '').trim();
    if (!/\[\d+[a-z]?\]/.test(t)) return null;
    const parts = [];
    const re = /\[(\d+[a-z]?)\]\s*([^[]*)/g;
    let m;
    const pre = t.slice(0, t.search(/\[\d/)).trim();
    if (pre) parts.push({ nr: '•', text: pre });
    while ((m = re.exec(t))) { if (m[2].trim()) parts.push({ nr: m[1], text: m[2].trim() }); }
    return parts.length > 1 || (parts.length === 1 && parts[0].nr !== '•') ? parts : null;
  }
  function plainMeaning(text) { return (text || '').replace(/\[\d+[a-z]?\]\s*/g, '').trim(); }

  function wordOfDay() {
    // Dasselbe Wort wie in der Benachrichtigung (die App merkt es sich pro Tag)
    try {
      const id = A.wordOfDay ? A.wordOfDay() : '';
      const w = id && (byId(id) || byWord(id));
      if (w && hasMeaning(w)) return w;
    } catch (e) { }
    const pool = D.woerter.filter(hasMeaning).sort((a, b) => collator.compare(a.id, b.id));
    if (!pool.length) return null;
    const d = new Date();
    let h = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
    h = (h * 2654435761) >>> 0;
    return pool[h % pool.length];
  }

  /* ================= Zustand der Oberfläche ================= */
  const ui = {
    tab: 'list', q: '', sort: 'az', filter: 'all',
    layers: [], quiz: null,
    quizMode: 'flip', quizSize: 15, quizTag: '',
    bulk: null
  };

  /* ================= Toast & Dialog ================= */
  let toastTimer;
  function toast(msg, action, fn) {
    const t = $('#toast');
    t.className = '';
    t.innerHTML = esc(msg) + (action ? ` <button>${esc(action)}</button>` : '');
    if (action) { t.classList.add('act'); t.querySelector('button').onclick = () => { t.className = ''; fn(); }; }
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on', 'act'), action ? 4500 : 2200);
  }

  function confirmDlg(title, text, okLabel, danger) {
    return new Promise(res => {
      pushLayer({ type: 'dialog', title, text, okLabel, danger, res });
    });
  }

  /* ================= Tabs ================= */
  function setTab(t) {
    ui.tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    $('#fab').classList.toggle('hide', ui.tab !== 'list');
    if (ui.tab === 'list') renderList();
    else if (ui.tab === 'quiz') renderQuiz();
    else renderMore();
  }

  /* ================= Liste ================= */
  function filtered() {
    let list = D.woerter;
    if (ui.filter === 'missing') list = list.filter(w => !hasMeaning(w));
    else if (ui.filter === 'auto') list = list.filter(w => w.auto);
    else if (ui.filter === 'weak') list = list.filter(w => w.falsch > 0 && w.box < 3);
    else if (ui.filter.startsWith('tag:')) { const t = ui.filter.slice(4); list = list.filter(w => w.tags.includes(t)); }

    const q = norm(ui.q);
    if (q) {
      list = list.map(w => {
        const nw = norm(w.wort);
        let score = 0;
        if (nw === q) score = 100; else if (nw.startsWith(q)) score = 60; else if (nw.includes(q)) score = 40;
        else if (norm(w.bedeutung).includes(q)) score = 15;
        else if (w.tags.some(t => norm(t).includes(q))) score = 10;
        return { w, score };
      }).filter(x => x.score).sort((a, b) => b.score - a.score || collator.compare(a.w.wort, b.w.wort)).map(x => x.w);
      return list;
    }
    list = list.slice();
    if (ui.sort === 'az') list.sort((a, b) => collator.compare(a.wort, b.wort));
    else if (ui.sort === 'new') list.sort((a, b) => b.erstellt - a.erstellt);
    else list.sort((a, b) => (b.falsch - b.richtig) - (a.falsch - a.richtig) || a.box - b.box || collator.compare(a.wort, b.wort));
    return list;
  }

  function hl(text, q) {
    const s = esc(text);
    if (!q) return s;
    const i = norm(text).indexOf(norm(q));
    if (i < 0 || norm(text).length !== text.length) return s;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function lvlDots(w) {
    let s = '<div class="lvl">';
    for (let i = 1; i <= MAXBOX; i++) s += `<i class="${w.box >= i ? 'f' : ''}"></i>`;
    return s + '</div>';
  }

  function itemHtml(w, q) {
    const m = hasMeaning(w)
      ? `<div class="m">${hl(plainMeaning(w.bedeutung), q)}</div>`
      : `<div class="m missing">Bedeutung fehlt – antippen zum Nachschlagen</div>`;
    return `<div class="item" data-act="open" data-id="${esc(w.id)}">
      <div class="txt"><div class="w">${hl(w.wort, q)}${w.auto ? '<span class="badge">auto</span>' : ''}</div>${m}</div>
      ${lvlDots(w)}
    </div>`;
  }

  function renderList() {
    const missing = D.woerter.filter(w => !hasMeaning(w)).length;
    const autoN = D.woerter.filter(w => w.auto).length;
    const weakN = D.woerter.filter(w => w.falsch > 0 && w.box < 3).length;
    const tags = allTags();
    const chip = (key, label, n) => `<button class="chip ${ui.filter === key ? 'on' : ''}" data-act="filter" data-f="${esc(key)}">${esc(label)}${n != null ? ` <span class="n">${n}</span>` : ''}</button>`;

    $('#view').innerHTML = `
      <div class="head">
        <h1>Fremdwörter</h1>
        <div class="sub">${D.woerter.length} Wörter in deiner Sammlung</div>
      </div>
      <div class="search"><div class="box">${ICON.search}
        <input id="q" type="text" enterkeyhint="search" placeholder="Wort oder Bedeutung suchen …" value="${esc(ui.q)}" autocomplete="off" autocorrect="off" spellcheck="false">
        <button class="clear ${ui.q ? 'on' : ''}" data-act="clearq">${ICON.close}</button>
      </div></div>
      <div class="chips">
        ${chip('all', 'Alle')}
        ${missing ? chip('missing', 'Ohne Bedeutung', missing) : ''}
        ${weakN ? chip('weak', 'Wackelig', weakN) : ''}
        ${autoN ? chip('auto', 'Automatisch ergänzt', autoN) : ''}
        ${tags.map(([t, n]) => chip('tag:' + t, '#' + t, n)).join('')}
      </div>
      <div id="listbody"></div>`;
    renderListBody();

    const q = $('#q');
    q.addEventListener('input', () => {
      ui.q = q.value;
      $('.search .clear').classList.toggle('on', !!ui.q);
      renderListBody();
    });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') A.hideKeyboard(); });
  }

  function renderListBody() {
    const list = filtered();
    const q = ui.q.trim();
    let html = '';
    if (!q && ui.filter === 'all') {
      const w = wordOfDay();
      if (w) html += `<div class="wotd" data-act="open" data-id="${esc(w.id)}">
        <div class="label">Wort des Tages</div>
        <div class="w">${esc(w.wort)}</div>
        <div class="m">${esc(plainMeaning(w.bedeutung))}</div></div>`;
    }
    if (!q) {
      html += `<div class="sortbar"><span>${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'}</span>
        <div class="seg">
          <button data-act="sort" data-s="az" class="${ui.sort === 'az' ? 'on' : ''}">A–Z</button>
          <button data-act="sort" data-s="new" class="${ui.sort === 'new' ? 'on' : ''}">Neueste</button>
          <button data-act="sort" data-s="hard" class="${ui.sort === 'hard' ? 'on' : ''}">Schwierig</button>
        </div></div>`;
    }
    if (!list.length) {
      html += q
        ? `<div class="empty"><div class="big">„${esc(q)}“ ist noch nicht dabei.</div>Soll es in die Sammlung?<br><button data-act="newq">„${esc(q)}“ hinzufügen</button></div>`
        : `<div class="empty"><div class="big">Hier ist noch nichts.</div>Tippe auf Plus, um ein Wort anzulegen.</div>`;
    } else {
      let last = '';
      for (const w of list) {
        if (!q && ui.sort === 'az') {
          const L = norm(w.wort).charAt(0).toUpperCase() || '#';
          const letter = /[A-Z]/.test(L) ? L : '#';
          if (letter !== last) { html += `<div class="letter">${letter}</div>`; last = letter; }
        }
        html += itemHtml(w, q);
      }
    }
    $('#listbody').innerHTML = html;
  }

  /* ================= Ebenen ================= */
  function pushLayer(l) { ui.layers.push(l); renderLayers(); }
  function popLayer() {
    const l = ui.layers.pop();
    if (l && l.type === 'dialog') l.res(false);
    renderLayers();
    if (!ui.layers.length) render();
  }
  function topLayer() { return ui.layers[ui.layers.length - 1]; }

  function renderLayers() {
    const root = $('#layer');
    root.innerHTML = '';
    ui.layers.forEach((l, i) => {
      const el = document.createElement('div');
      if (l.type === 'dialog') {
        el.className = 'dlg-back';
        el.innerHTML = `<div class="dlg"><h2>${esc(l.title)}</h2><p>${esc(l.text)}</p>
          <div class="btnrow"><button class="btn" data-dlg="0">Abbrechen</button>
          <button class="btn ${l.danger ? 'danger' : 'pri'}" data-dlg="1">${esc(l.okLabel)}</button></div></div>`;
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-dlg]');
          if (!b && e.target !== el) return;
          ui.layers.splice(ui.layers.indexOf(l), 1);
          renderLayers();
          l.res(b ? b.dataset.dlg === '1' : false);
        });
      } else {
        el.className = 'sheet';
        el.innerHTML = l.type === 'detail' ? detailHtml(l) : editorHtml(l);
        if (i < ui.layers.length - 1) el.style.visibility = 'hidden';
      }
      root.appendChild(el);
      if (l.type === 'edit') bindEditor(el, l);
    });
    document.body.style.overflow = ui.layers.length ? 'hidden' : '';
  }

  /* ---------- Detail ---------- */
  function nextText(w) {
    if (!w.zuletzt) return 'Noch nicht abgefragt';
    const days = Math.round((w.faellig - today0()) / DAY);
    const when = days <= 0 ? 'heute fällig' : days === 1 ? 'morgen wieder dran' : `in ${days} Tagen wieder dran`;
    return `${w.richtig}× gewusst, ${w.falsch}× nicht · ${when}`;
  }

  function meaningHtml(text) {
    const parts = splitMeaning(text);
    if (!parts) return `<div class="mean">${esc(text)}</div>`;
    return `<div class="mean"><ol>${parts.map(p => `<li data-nr="${esc(p.nr)}">${esc(p.text)}</li>`).join('')}</ol></div>`;
  }

  function detailHtml(l) {
    const w = byId(l.id);
    if (!w) return '';
    const meta = [];
    if (w.silben) meta.push(`<span>${esc(w.silben)}</span>`);
    if (w.wortart) meta.push(`<span>${esc(w.wortart)}</span>`);
    let prog = '<div class="progress">';
    for (let i = 1; i <= MAXBOX; i++) prog += `<i class="${w.box >= i ? 'f' : ''}"></i>`;
    prog += '</div>';
    return `
      <div class="bar">
        <button class="ibtn" data-act="back">${ICON.back}</button>
        <div class="t"></div>
        <button class="ibtn" data-act="delete" data-id="${esc(w.id)}">${ICON.trash}</button>
        <button class="ibtn ac" data-act="edit" data-id="${esc(w.id)}">${ICON.edit}</button>
      </div>
      <div class="det">
        <div class="w">${esc(w.wort)}</div>
        ${meta.length ? `<div class="meta">${meta.join('')}</div>` : ''}
        <div class="sec"><h3>Bedeutung${w.auto ? ' <span class="badge">aus Wiktionary</span>' : ''}</h3>
          ${hasMeaning(w) ? meaningHtml(w.bedeutung)
            : `<div class="missing-box">Noch keine Bedeutung hinterlegt.<div class="btnrow" style="margin-top:12px">
                <button class="btn pri" data-act="editlookup" data-id="${esc(w.id)}">${ICON.search} Nachschlagen</button></div></div>`}
        </div>
        ${w.beispiel ? `<div class="sec"><h3>Beispiel</h3><div class="ex">${esc(w.beispiel)}</div></div>` : ''}
        ${w.tags.length ? `<div class="sec"><h3>Themen</h3><div class="tags">${w.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div></div>` : ''}
        <div class="sec"><h3>Lernstand</h3>${prog}<div class="ptext">${esc(nextText(w))}</div></div>
        <div class="sec"><h3>Nachschlagen</h3><div class="btnrow">
          <button class="btn" data-act="url" data-u="https://www.duden.de/suchen/dudenonline/${encodeURIComponent(w.wort)}">${ICON.book} Duden</button>
          <button class="btn" data-act="url" data-u="https://de.wiktionary.org/wiki/${encodeURIComponent(w.wort.replace(/ /g, '_'))}">${ICON.globe} Wiktionary</button>
          <button class="btn" data-act="url" data-u="https://www.dwds.de/wb/${encodeURIComponent(w.wort)}">${ICON.globe} DWDS</button>
        </div></div>
        ${w.auto ? `<div class="sec"><button class="btn wide" data-act="approve" data-id="${esc(w.id)}">${ICON.check} Bedeutung passt so</button></div>` : ''}
      </div>`;
  }

  /* ---------- Editor ---------- */
  function openEditor(id, preset) {
    const w = id ? byId(id) : null;
    const draft = w ? { wort: w.wort, bedeutung: w.bedeutung, beispiel: w.beispiel, silben: w.silben, wortart: w.wortart, tags: w.tags.slice() }
      : { wort: '', bedeutung: '', beispiel: '', silben: '', wortart: '', tags: [] };
    if (preset) Object.assign(draft, preset);
    const l = { type: 'edit', id: id || null, draft, sugg: null, loading: false, autoLook: !!(preset && preset.autoLook), fromAuto: w ? w.auto : false };
    delete draft.autoLook;
    pushLayer(l);
    if (l.autoLook && draft.wort) lookupInto(l);
    else if (!id || !draft.wort) setTimeout(() => { const f = $('#layer .sheet:last-child #e-wort'); f && f.focus(); }, 250);
  }

  function editorHtml(l) {
    const d = l.draft;
    const dup = d.wort.trim() ? byWord(d.wort, l.id) : null;
    const tagsAll = allTags().map(x => x[0]).filter(t => !d.tags.includes(t)).slice(0, 12);
    return `
      <div class="bar">
        <button class="ibtn" data-act="back">${ICON.close}</button>
        <div class="t">${l.id ? 'Bearbeiten' : 'Neues Wort'}</div>
        <button class="tbtn" data-act="saveword" ${d.wort.trim() ? '' : 'disabled'}>Sichern</button>
      </div>
      <div class="form">
        <div class="field"><label for="e-wort">Wort</label>
          <div class="wordrow">
            <input id="e-wort" class="big" value="${esc(d.wort)}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="z. B. Ambiguität">
            <button class="lookbtn" data-act="lookup" aria-label="Nachschlagen">${l.loading ? '<div class="spinner"></div>' : ICON.search}</button>
          </div>
          <div id="e-hint">${hintHtml(l, dup)}</div>
        </div>
        <div id="e-sugg">${suggHtml(l)}</div>
        <div class="field"><label for="e-bed">Bedeutung</label>
          <textarea id="e-bed" rows="4" placeholder="Was bedeutet das Wort?">${esc(d.bedeutung)}</textarea></div>
        <div class="field"><label for="e-bsp">Beispielsatz</label>
          <textarea id="e-bsp" rows="2" style="min-height:64px" placeholder="optional">${esc(d.beispiel)}</textarea></div>
        <div class="field"><label for="e-sil">Silbentrennung</label>
          <input id="e-sil" value="${esc(d.silben)}" placeholder="optional, z. B. Am·bi·gu·i·tät" autocomplete="off" spellcheck="false"></div>
        <div class="field"><label>Themen</label>
          <div class="tagin" id="e-tags">${d.tags.map(t => `<span class="tag">#${esc(t)}<button data-act="rmtag" data-t="${esc(t)}">${ICON.close}</button></span>`).join('')}
            <input id="e-tagin" placeholder="${d.tags.length ? '' : 'z. B. Medizin, Politik'}" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
          ${tagsAll.length ? `<div class="tagsugg">${tagsAll.map(t => `<button data-act="addtag" data-t="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>` : ''}
        </div>
        ${l.id ? '' : '<div class="hint">Tipp: Markiere ein Wort in einer beliebigen App und wähle „Fremdwort merken“ – dann landet es direkt hier.</div>'}
      </div>`;
  }

  function hintHtml(l, dup) {
    if (dup) return `<div class="hint warn">„${esc(dup.wort)}“ ist schon in der Sammlung. <button data-act="opendup" data-id="${esc(dup.id)}">Öffnen</button></div>`;
    if (l.lookErr) return `<div class="hint">${esc(l.lookErr)}</div>`;
    return '';
  }

  function suggHtml(l) {
    const s = l.sugg;
    if (!s) return '';
    return `<div class="sugg">
      <div class="h"><b>Vorschlag aus Wiktionary</b><span>${esc([s.wortart, s.silben].filter(Boolean).join(' · '))}</span></div>
      ${s.bedeutungen.map((b, i) => `<div class="opt ${s.sel[i] ? 'on' : ''}" data-act="togsugg" data-i="${i}">
        <div class="ck">${ICON.check}</div><div class="tx">${b.nr ? `<b>[${esc(b.nr)}]</b> ` : ''}${esc(b.text)}</div></div>`).join('')}
      ${s.beispiele.length ? `<div class="opt ${s.bsel ? 'on' : ''}" data-act="togbsp"><div class="ck">${ICON.check}</div><div class="tx">Beispiel: <em>${esc(s.beispiele[0].text)}</em></div></div>` : ''}
      <div class="foot">
        <button class="btn pri" data-act="takesugg">${ICON.check} Übernehmen</button>
        <button class="btn" data-act="dropsugg">Verwerfen</button>
      </div></div>`;
  }

  function readDraft(el, l) {
    const d = l.draft;
    d.wort = $('#e-wort', el).value;
    d.bedeutung = $('#e-bed', el).value;
    d.beispiel = $('#e-bsp', el).value;
    d.silben = $('#e-sil', el).value;
  }

  function bindEditor(el, l) {
    const wort = $('#e-wort', el);
    wort.addEventListener('input', () => {
      l.draft.wort = wort.value;
      l.lookErr = '';
      const dup = wort.value.trim() ? byWord(wort.value, l.id) : null;
      $('#e-hint', el).innerHTML = hintHtml(l, dup);
      $('[data-act="saveword"]', el).disabled = !wort.value.trim();
    });
    wort.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); readDraft(el, l); lookupInto(l); } });
    ['#e-bed', '#e-bsp', '#e-sil'].forEach(s => $(s, el).addEventListener('input', () => readDraft(el, l)));
    const tin = $('#e-tagin', el);
    const commit = () => {
      const v = tin.value.replace(/^#/, '').trim();
      if (v) {
        v.split(',').map(x => x.trim()).filter(Boolean).forEach(t => { if (!l.draft.tags.includes(t)) l.draft.tags.push(t); });
        readDraft(el, l); renderLayers(); setTimeout(() => { const n = $('#layer .sheet:last-child #e-tagin'); n && n.focus(); }, 0);
      }
    };
    tin.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } });
    tin.addEventListener('input', () => { if (tin.value.includes(',')) commit(); });
    tin.addEventListener('blur', () => { if (tin.value.trim()) commit(); });
  }

  async function lookupInto(l) {
    const word = l.draft.wort.trim();
    if (!word || l.loading) return;
    l.loading = true; l.lookErr = ''; renderLayers();
    const r = await call('lookup', word);
    l.loading = false;
    if (!r.ok) {
      l.lookErr = r.error === 'offline' ? 'Keine Verbindung – bitte später noch mal versuchen.' : `Zu „${word}“ hat Wiktionary keinen Eintrag. Schau mal bei Duden oder DWDS.`;
      l.sugg = null;
    } else {
      const p = Wiki.parse(r.text);
      if (!p.bedeutungen.length) { l.lookErr = 'Eintrag gefunden, aber ohne deutsche Bedeutung.'; l.sugg = null; }
      else {
        l.sugg = { ...p, sel: p.bedeutungen.map((b, i) => i < 3 && !/^\d+[a-z]$/.test(b.nr)), bsel: !l.draft.beispiel && p.beispiele.length > 0 };
        if (r.title && r.title !== word && !l.id && norm(r.title) !== norm(word)) l.draft.wort = r.title;
      }
    }
    renderLayers();
  }

  function formatMeanings(list) {
    if (list.length === 1) return list[0].text;
    return list.map((b, i) => `[${i + 1}] ${b.text}`).join(' ');
  }

  function takeSugg(l) {
    const s = l.sugg;
    const chosen = s.bedeutungen.filter((b, i) => s.sel[i]);
    if (chosen.length) l.draft.bedeutung = formatMeanings(chosen);
    if (s.bsel && s.beispiele.length) l.draft.beispiel = s.beispiele[0].text;
    if (!l.draft.silben && s.silben) l.draft.silben = s.silben;
    if (s.wortart) l.draft.wortart = s.wortart;
    l.sugg = null;
    renderLayers();
  }

  function saveWord(l) {
    const el = $('#layer .sheet:last-child');
    readDraft(el, l);
    const tin = $('#e-tagin', el);
    if (tin && tin.value.trim()) tin.value.split(',').map(x => x.replace(/^#/, '').trim()).filter(Boolean).forEach(t => { if (!l.draft.tags.includes(t)) l.draft.tags.push(t); });
    const d = l.draft;
    d.wort = d.wort.trim();
    if (!d.wort) return;
    const dup = byWord(d.wort, l.id);
    let w;
    if (l.id) {
      w = byId(l.id);
      const changedMeaning = w.bedeutung !== d.bedeutung.trim();
      Object.assign(w, { wort: d.wort, bedeutung: d.bedeutung.trim(), beispiel: d.beispiel.trim(), silben: d.silben.trim(), wortart: d.wortart, tags: d.tags });
      if (changedMeaning) w.auto = false;
    } else if (dup) {
      // Bestehendes Wort ergänzen statt doppelt anlegen
      w = dup;
      if (d.bedeutung.trim() && !w.bedeutung.includes(d.bedeutung.trim())) w.bedeutung = w.bedeutung ? w.bedeutung + ' · ' + d.bedeutung.trim() : d.bedeutung.trim();
      if (d.beispiel.trim() && !w.beispiel) w.beispiel = d.beispiel.trim();
      d.tags.forEach(t => { if (!w.tags.includes(t)) w.tags.push(t); });
    } else {
      w = fresh({ wort: d.wort, bedeutung: d.bedeutung, beispiel: d.beispiel.trim(), silben: d.silben.trim(), wortart: d.wortart, tags: d.tags });
      D.woerter.push(w);
    }
    save();
    A.hideKeyboard();
    ui.layers.pop();
    const below = topLayer();
    if (!below || below.type !== 'detail' || below.id !== w.id) pushLayer({ type: 'detail', id: w.id });
    else renderLayers();
    toast(l.id ? 'Gesichert' : dup ? 'Zum bestehenden Wort ergänzt' : `„${w.wort}“ hinzugefügt`);
  }

  async function deleteWord(id) {
    const w = byId(id);
    if (!w) return;
    const ok = await confirmDlg(`„${w.wort}“ löschen?`, 'Das Wort und sein Lernstand werden entfernt.', 'Löschen', true);
    if (!ok) return;
    const idx = D.woerter.indexOf(w);
    D.woerter.splice(idx, 1);
    save();
    ui.layers = ui.layers.filter(l => l.id !== id);
    renderLayers(); render();
    toast('Gelöscht', 'Rückgängig', () => { D.woerter.splice(idx, 0, w); save(); render(); });
  }

  /* ================= Abfrage ================= */
  function quizPool() {
    let pool = D.woerter.filter(hasMeaning);
    if (ui.quizTag) pool = pool.filter(w => w.tags.includes(ui.quizTag));
    return pool;
  }
  function quizCounts() {
    const pool = quizPool(), now = Date.now();
    return {
      due: pool.filter(w => w.zuletzt && w.faellig <= now).length,
      neu: pool.filter(w => !w.zuletzt).length,
      sicher: pool.filter(w => w.box >= 4).length,
      total: pool.length
    };
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function startQuiz() {
    const pool = quizPool(), now = Date.now();
    if (pool.length < (ui.quizMode === 'mc' ? 4 : 1)) { toast('Zu wenige Wörter mit Bedeutung'); return; }
    const due = pool.filter(w => w.zuletzt && w.faellig <= now).sort((a, b) => a.faellig - b.faellig);
    const neu = shuffle(pool.filter(w => !w.zuletzt));
    const rest = shuffle(pool.filter(w => w.zuletzt && w.faellig > now)).sort((a, b) => a.box - b.box);
    const seen = new Set();
    const list = [];
    for (const w of [...due, ...neu, ...rest]) {
      if (list.length >= ui.quizSize) break;
      if (!seen.has(w.id)) { seen.add(w.id); list.push(w.id); }
    }
    // Fällige zuerst, der Rest gemischt
    const k = Math.min(due.length, list.length);
    ui.quiz = { list: list.slice(0, k).concat(shuffle(list.slice(k))), i: 0, shown: false, results: {}, again: [], picked: null, choices: null };
    renderQuiz();
  }

  function grade(w, g) {
    const now = Date.now();
    w.zuletzt = now;
    if (g === 0) { w.box = 0; w.falsch++; w.faellig = now; }
    else if (g === 1) { w.box = Math.max(1, w.box); w.richtig++; w.faellig = today0() + DAY; }
    else { w.box = Math.min(MAXBOX, w.box + 1); w.richtig++; w.faellig = today0() + INTERVALS[w.box] * DAY; }
    save();
  }

  function quizAnswer(g) {
    const Q = ui.quiz;
    const id = Q.list[Q.i];
    const w = byId(id);
    if (!(id in Q.results)) Q.results[id] = g;
    grade(w, g);
    if (g === 0 && !Q.again.includes(id)) { Q.again.push(id); Q.list.push(id); }
    Q.i++; Q.shown = false; Q.picked = null; Q.choices = null;
    renderQuiz();
  }

  function mcChoices(w) {
    const others = shuffle(D.woerter.filter(x => hasMeaning(x) && x.id !== w.id)).slice(0, 3);
    return shuffle([w, ...others]).map(x => ({ id: x.id, text: plainMeaning(x.bedeutung) }));
  }

  function renderQuiz() {
    const Q = ui.quiz;
    if (!Q) return renderQuizStart();
    if (Q.i >= Q.list.length) return renderQuizDone();
    const w = byId(Q.list[Q.i]);
    if (!w) { Q.i++; return renderQuiz(); }
    const progress = Math.min(100, Math.round(Q.i / Q.list.length * 100));
    const head = `<div class="qbar"><button class="ibtn" data-act="quitquiz">${ICON.close}</button>
      <div class="pb"><i style="width:${progress}%"></i></div><span class="n">${Math.min(Q.i + 1, Q.list.length)}/${Q.list.length}</span></div>`;

    if (ui.quizMode === 'mc') {
      if (!Q.choices) Q.choices = mcChoices(w);
      const answered = Q.picked != null;
      $('#view').innerHTML = `<div class="qwrap">${head}
        <div class="card mc"><div class="front">${esc(w.wort)}</div>${w.silben ? `<div class="sil">${esc(w.silben)}</div>` : ''}</div>
        <div class="choices">${Q.choices.map(c => {
          let cls = '';
          if (answered && c.id === w.id) cls = 'right';
          else if (answered && c.id === Q.picked) cls = 'wrong';
          return `<button class="choice ${cls}" data-act="pick" data-id="${esc(c.id)}" ${answered ? 'disabled' : ''}>${esc(c.text)}</button>`;
        }).join('')}</div>
        ${answered && Q.picked !== w.id ? `<button class="reveal" data-act="mcnext">Weiter</button>` : ''}
      </div>`;
      return;
    }

    const reverse = ui.quizMode === 'rev';
    const front = reverse
      ? `<div class="front meanf">${esc(plainMeaning(w.bedeutung))}</div>`
      : `<div class="front">${esc(w.wort)}</div>${w.silben ? `<div class="sil">${esc(w.silben)}</div>` : ''}`;
    const back = reverse
      ? `<div class="back wordb">${esc(w.wort)}</div>`
      : `<div class="back">${meaningHtml(w.bedeutung)}${w.beispiel ? `<div class="ex" style="margin-top:12px;font-size:15px">${esc(w.beispiel)}</div>` : ''}</div>`;
    $('#view').innerHTML = `<div class="qwrap">${head}
      <div class="card" data-act="flip">${front}${Q.shown ? back : `<div class="tapinfo">Erst überlegen, dann aufdecken</div>`}</div>
      ${Q.shown
        ? `<div class="grade">
            <button class="g0" data-act="grade" data-g="0">Nicht gewusst<small>kommt gleich wieder</small></button>
            <button class="g1" data-act="grade" data-g="1">Ungefähr<small>morgen</small></button>
            <button class="g2" data-act="grade" data-g="2">Gewusst<small>${INTERVALS[Math.min(MAXBOX, w.box + 1)]} ${INTERVALS[Math.min(MAXBOX, w.box + 1)] === 1 ? 'Tag' : 'Tage'}</small></button>
          </div>`
        : `<button class="reveal" data-act="flip">Aufdecken</button>`}
    </div>`;
  }

  function renderQuizStart() {
    const c = quizCounts();
    const tags = allTags();
    const mode = (key, title, sub, icon) => `<button class="mode ${ui.quizMode === key ? 'on' : ''}" data-act="qmode" data-m="${key}">
      <div class="ic">${icon}</div><div><b>${title}</b><span>${sub}</span></div></button>`;
    $('#view').innerHTML = `
      <div class="head"><h1>Abfrage</h1><div class="sub">Kleine Runden, oft wiederholt – so bleibt’s hängen.</div></div>
      <div class="stats">
        <div class="stat ac"><b>${c.due}</b><span>heute fällig</span></div>
        <div class="stat"><b>${c.neu}</b><span>noch neu</span></div>
        <div class="stat"><b>${c.sicher}</b><span>sitzen sicher</span></div>
      </div>
      <div class="block"><h3>Art der Abfrage</h3><div class="modes">
        ${mode('flip', 'Wort → Bedeutung', 'Karteikarte: Wort sehen, Bedeutung erinnern', ICON.cards)}
        ${mode('rev', 'Bedeutung → Wort', 'Andersherum – schwerer, aber wirksam', ICON.swap)}
        ${mode('mc', 'Auswahl', 'Aus vier Bedeutungen die richtige finden', ICON.list)}
      </div></div>
      <div class="block"><h3>Rundengröße</h3><div class="seg" style="display:flex">
        ${[10, 15, 25, 40].map(n => `<button style="flex:1;padding:9px" data-act="qsize" data-n="${n}" class="${ui.quizSize === n ? 'on' : ''}">${n}</button>`).join('')}
      </div></div>
      ${tags.length ? `<div class="block"><h3>Thema</h3>
        <select class="select" id="qtag"><option value="">Alle Themen</option>${tags.map(([t, n]) => `<option value="${esc(t)}" ${ui.quizTag === t ? 'selected' : ''}>#${esc(t)} (${n})</option>`).join('')}</select></div>` : ''}
      <div class="block" style="padding-top:24px"><button class="btn pri wide" data-act="startquiz" style="height:54px;font-size:16px" ${c.total ? '' : 'disabled'}>Runde starten</button></div>`;
    const sel = $('#qtag');
    if (sel) sel.addEventListener('change', () => { ui.quizTag = sel.value; renderQuizStart(); });
  }

  function renderQuizDone() {
    const Q = ui.quiz;
    const ids = Object.keys(Q.results);
    const ok = ids.filter(id => Q.results[id] > 0).length;
    const missed = ids.filter(id => Q.results[id] === 0).map(byId).filter(Boolean);
    const msg = ok === ids.length ? 'Alles gewusst – stark!' : ok / ids.length >= .7 ? 'Richtig gut! Die Wackelkandidaten kommen bald wieder.' : 'Dranbleiben – Wiederholung macht’s.';
    $('#view').innerHTML = `<div class="done">
      <div class="big">${ok}/${ids.length}</div>
      <div class="sub">${msg}</div>
      ${missed.length ? `<div class="missed"><div class="gtitle" style="margin-left:0">Zum Nachlesen</div>${missed.map(w => itemHtml(w, '')).join('')}</div>` : ''}
      <div class="btnrow"><button class="btn" style="flex:1;justify-content:center" data-act="quitquiz">Fertig</button>
      <button class="btn pri" style="flex:1;justify-content:center" data-act="startquiz">Neue Runde</button></div>
    </div>`;
  }

  /* ================= Mehr ================= */
  function renderMore() {
    let daily = { on: true, hour: 9, minute: 0 };
    try { daily = Object.assign(daily, JSON.parse(A.getDaily())); } catch (e) { }
    const time = String(daily.hour).padStart(2, '0') + ':' + String(daily.minute).padStart(2, '0');
    const missing = D.woerter.filter(w => !hasMeaning(w)).length;
    const learned = D.woerter.filter(w => w.box >= 4).length;
    const b = ui.bulk;
    $('#view').innerHTML = `
      <div class="head"><h1>Mehr</h1><div class="sub">${D.woerter.length} Wörter · ${learned} sitzen sicher</div></div>

      <div class="gtitle">Wort des Tages</div>
      <div class="group">
        <button class="row" data-act="togdaily"><span class="ic">${ICON.bell}</span>
          <span class="tx"><b>Tägliche Benachrichtigung</b><span>Ein Wort, das noch nicht sitzt</span></span>
          <span class="switch ${daily.on ? 'on' : ''}"></span></button>
        <div class="row" style="${daily.on ? '' : 'opacity:.4;pointer-events:none'}"><span class="ic">${ICON.refresh}</span>
          <span class="tx"><b>Uhrzeit</b></span>
          <input type="time" class="timein" id="dtime" value="${time}"></div>
        <button class="row" data-act="testdaily"><span class="ic">${ICON.test}</span>
          <span class="tx"><b>Jetzt ausprobieren</b><span>Zeigt sofort eine Benachrichtigung</span></span></button>
      </div>

      <div class="gtitle">Bedeutungen ergänzen</div>
      <div class="group">
        <button class="row" data-act="bulk" ${missing && !b ? '' : 'disabled'}><span class="ic">${ICON.wand}</span>
          <span class="tx"><b>${b && b.running ? 'Schlage nach …' : missing ? `${missing} fehlende Bedeutungen nachschlagen` : 'Alle Wörter haben eine Bedeutung'}</b>
          <span>${missing ? 'Holt Vorschläge aus Wiktionary, markiert als „auto“' : 'Sehr ordentlich!'}</span></span></button>
        ${b ? `<div class="bulk"><div class="pb"><i style="width:${Math.round(b.done / b.total * 100)}%"></i></div>
          <div class="s">${b.running ? `${b.done} von ${b.total} … ${esc(b.current || '')}` : `Fertig: ${b.found} ergänzt, ${b.total - b.found} nicht gefunden`}</div></div>` : ''}
      </div>

      <div class="gtitle">Daten</div>
      <div class="group">
        <button class="row" data-act="export"><span class="ic">${ICON.down}</span>
          <span class="tx"><b>Sicherung speichern</b><span>Alles inklusive Lernstand (JSON)</span></span></button>
        <button class="row" data-act="exportcsv"><span class="ic">${ICON.table}</span>
          <span class="tx"><b>Als Tabelle exportieren</b><span>CSV für Google Tabellen oder Excel</span></span></button>
        <button class="row" data-act="import"><span class="ic">${ICON.up}</span>
          <span class="tx"><b>Importieren</b><span>CSV oder Sicherung – vorhandene Wörter bleiben</span></span></button>
      </div>

      <div class="gtitle">App</div>
      <div class="group">
        <button class="row" data-act="update"><span class="ic">${ICON.refresh}</span>
          <span class="tx"><b>Nach Update suchen</b><span id="upd">Version 0.${A.version()}</span></span></button>
      </div>`;
    const t = $('#dtime');
    t.addEventListener('change', () => {
      const [h, m] = t.value.split(':').map(Number);
      if (isNaN(h)) return;
      A.setDaily(daily.on, h, m || 0);
      toast(`Wort des Tages um ${t.value} Uhr`);
    });
  }

  async function bulkLookup() {
    const list = D.woerter.filter(w => !hasMeaning(w));
    if (!list.length) return;
    ui.bulk = { total: list.length, done: 0, found: 0, running: true, current: '' };
    if (ui.tab === 'more') renderMore();
    for (const w of list) {
      ui.bulk.current = w.wort;
      if (ui.tab === 'more') renderMore();
      const r = await call('lookup', w.wort);
      if (r.ok) {
        const p = Wiki.parse(r.text);
        if (p.bedeutungen.length) {
          const main = p.bedeutungen.filter(b => !/^\d+[a-z]$/.test(b.nr)).slice(0, 3);
          w.bedeutung = formatMeanings(main.length ? main : p.bedeutungen.slice(0, 2));
          if (!w.silben && p.silben) w.silben = p.silben;
          if (!w.beispiel && p.beispiele.length) w.beispiel = p.beispiele[0].text;
          if (p.wortart) w.wortart = p.wortart;
          w.auto = true;
          ui.bulk.found++;
          save();
        }
      } else if (r.error === 'offline') {
        ui.bulk.running = false;
        toast('Keine Verbindung – abgebrochen');
        break;
      }
      ui.bulk.done++;
      await new Promise(r => setTimeout(r, 250));
    }
    ui.bulk.running = false;
    saveNow();
    if (ui.tab === 'more') renderMore();
    if (ui.bulk.found) toast(`${ui.bulk.found} Bedeutungen ergänzt – Filter „Automatisch ergänzt“ zum Prüfen`);
  }

  /* ---------- Import / Export ---------- */
  function csvCell(s) { s = String(s == null ? '' : s); return /[";\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCsv() {
    const rows = [['Wort', 'Bedeutung', 'Beispiel', 'Silben', 'Themen']];
    D.woerter.slice().sort((a, b) => collator.compare(a.wort, b.wort))
      .forEach(w => rows.push([w.wort, w.bedeutung, w.beispiel, w.silben, w.tags.join(', ')]));
    return '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  }

  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';'
      : (firstLine.match(/\t/g) || []).length ? '\t' : ',';
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }

  function importItems(items) {
    let added = 0, filled = 0;
    for (const it of items) {
      const wort = (it.wort || '').trim();
      if (!wort) continue;
      const ex = byWord(wort);
      if (ex) {
        if (!hasMeaning(ex) && (it.bedeutung || '').trim()) { ex.bedeutung = it.bedeutung.trim(); ex.auto = false; filled++; }
        if (!ex.beispiel && it.beispiel) ex.beispiel = it.beispiel;
        (it.tags || []).forEach(t => { if (!ex.tags.includes(t)) ex.tags.push(t); });
      } else {
        const w = fresh({ ...it, id: it.id && !byId(it.id) ? it.id : undefined });
        D.woerter.push(w); added++;
      }
    }
    saveNow();
    return { added, filled };
  }

  async function doImport() {
    const r = await call('pickFile');
    if (!r.ok) { if (r.error) toast(r.error); return; }
    let items = [];
    const t = r.text.trim();
    try {
      if (t.startsWith('{') || t.startsWith('[')) {
        const o = JSON.parse(t);
        items = Array.isArray(o) ? o : (o.woerter || []);
      } else {
        const rows = parseCsv(t);
        if (!rows.length) throw new Error();
        const h = rows[0].map(x => norm(x));
        let iw = 0, ib = 1, ibs = -1, isil = -1, it = -1, start = 0;
        if (h.some(x => /^(wort|begriff|fremdwort)$/.test(x) || /bedeutung|beschreibung/.test(x))) {
          start = 1;
          const f = re => h.findIndex(x => re.test(x));
          iw = Math.max(0, f(/^(wort|begriff|fremdwort)$/));
          ib = f(/bedeutung|beschreibung|erklarung/); if (ib < 0) ib = iw === 0 ? 1 : 0;
          ibs = f(/beispiel/); isil = f(/silbe/); it = f(/thema|themen|tag/);
        }
        items = rows.slice(start).map(r => ({
          wort: r[iw] || '', bedeutung: r[ib] || '',
          beispiel: ibs >= 0 ? r[ibs] || '' : '', silben: isil >= 0 ? r[isil] || '' : '',
          tags: it >= 0 ? (r[it] || '').split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean) : []
        }));
      }
    } catch (e) { toast('Datei konnte nicht gelesen werden'); return; }
    const res = importItems(items);
    render();
    toast(`${res.added} neu${res.filled ? `, ${res.filled} ergänzt` : ''}`);
  }

  function stamp() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  async function checkUpdate() {
    const el = $('#upd');
    if (el) el.textContent = 'Suche …';
    const r = await call('checkUpdate');
    const cur = A.version();
    if (!r.ok) { if (el) el.textContent = `Version 0.${cur} · keine Verbindung`; return; }
    const latest = parseInt(String(r.tag).replace(/\D/g, ''), 10) || 0;
    if (latest > cur && r.apk) {
      if (el) el.textContent = `Version 0.${cur} · neu: 0.${latest}`;
      const ok = await confirmDlg(`Version 0.${latest} ist da`, 'Die neue APK wird heruntergeladen. Danach einfach antippen und installieren.', 'Herunterladen');
      if (ok) A.openUrl(r.apk);
    } else if (el) el.textContent = `Version 0.${cur} · aktuell`;
  }

  /* ================= Aktionen ================= */
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-act], [data-tab]');
    if (!t || t.disabled) return;
    if (t.dataset.tab) { if (ui.tab === t.dataset.tab && t.dataset.tab === 'quiz' && ui.quiz) return; setTab(t.dataset.tab); return; }
    const act = t.dataset.act;
    const l = topLayer();
    switch (act) {
      case 'new': openEditor(null); break;
      case 'newq': openEditor(null, { wort: ui.q.trim(), autoLook: true }); break;
      case 'open': pushLayer({ type: 'detail', id: t.dataset.id }); break;
      case 'back': A.hideKeyboard(); popLayer(); break;
      case 'edit': openEditor(t.dataset.id); break;
      case 'editlookup': openEditor(t.dataset.id, { autoLook: true }); break;
      case 'delete': deleteWord(t.dataset.id); break;
      case 'approve': { const w = byId(t.dataset.id); w.auto = false; save(); renderLayers(); toast('Abgehakt'); break; }
      case 'url': A.openUrl(t.dataset.u); break;
      case 'filter': ui.filter = t.dataset.f; renderList(); break;
      case 'sort': ui.sort = t.dataset.s; renderListBody(); break;
      case 'clearq': ui.q = ''; renderList(); break;
      case 'lookup': readDraft($('#layer .sheet:last-child'), l); A.hideKeyboard(); lookupInto(l); break;
      case 'togsugg': l.sugg.sel[+t.dataset.i] = !l.sugg.sel[+t.dataset.i]; readDraft($('#layer .sheet:last-child'), l); renderLayers(); break;
      case 'togbsp': l.sugg.bsel = !l.sugg.bsel; readDraft($('#layer .sheet:last-child'), l); renderLayers(); break;
      case 'takesugg': readDraft($('#layer .sheet:last-child'), l); takeSugg(l); break;
      case 'dropsugg': readDraft($('#layer .sheet:last-child'), l); l.sugg = null; renderLayers(); break;
      case 'saveword': saveWord(l); break;
      case 'opendup': ui.layers.pop(); pushLayer({ type: 'detail', id: t.dataset.id }); break;
      case 'rmtag': readDraft($('#layer .sheet:last-child'), l); l.draft.tags = l.draft.tags.filter(x => x !== t.dataset.t); renderLayers(); break;
      case 'addtag': readDraft($('#layer .sheet:last-child'), l); if (!l.draft.tags.includes(t.dataset.t)) l.draft.tags.push(t.dataset.t); renderLayers(); break;
      case 'qmode': ui.quizMode = t.dataset.m; renderQuizStart(); break;
      case 'qsize': ui.quizSize = +t.dataset.n; renderQuizStart(); break;
      case 'startquiz': startQuiz(); window.scrollTo(0, 0); break;
      case 'quitquiz': ui.quiz = null; renderQuiz(); break;
      case 'flip': if (!ui.quiz.shown) { ui.quiz.shown = true; renderQuiz(); } break;
      case 'grade': quizAnswer(+t.dataset.g); break;
      case 'pick': {
        const Q = ui.quiz, w = byId(Q.list[Q.i]);
        Q.picked = t.dataset.id;
        const right = Q.picked === w.id;
        renderQuiz();
        if (right) setTimeout(() => { if (ui.quiz === Q && Q.picked) quizAnswer(2); }, 750);
        break;
      }
      case 'mcnext': quizAnswer(0); break;
      case 'togdaily': {
        let d = { on: true, hour: 9, minute: 0 };
        try { d = Object.assign(d, JSON.parse(A.getDaily())); } catch (e) { }
        A.setDaily(!d.on, d.hour, d.minute);
        renderMore();
        break;
      }
      case 'testdaily': A.testNotify(); break;
      case 'bulk': bulkLookup(); break;
      case 'export': {
        const r = await call('saveFile', `fremdwoerter-${stamp()}.json`, 'application/json', JSON.stringify(D, null, 1));
        if (r.ok) toast('Sicherung gespeichert');
        break;
      }
      case 'exportcsv': {
        const r = await call('saveFile', `fremdwoerter-${stamp()}.csv`, 'text/csv', toCsv());
        if (r.ok) toast('Tabelle gespeichert');
        break;
      }
      case 'import': doImport(); break;
      case 'update': checkUpdate(); break;
    }
  });

  /* ================= Zurück-Taste & externe Aktionen ================= */
  window.onBack = function () {
    if (ui.layers.length) { A.hideKeyboard(); popLayer(); return true; }
    if (ui.tab === 'quiz' && ui.quiz) { ui.quiz = null; renderQuiz(); return true; }
    if (ui.tab !== 'list') { setTab('list'); return true; }
    if (ui.q || ui.filter !== 'all') { ui.q = ''; ui.filter = 'all'; renderList(); return true; }
    return false;
  };

  window.onPending = function () {
    let p = '';
    try { p = A.takePending(); } catch (e) { }
    if (!p) return;
    let o;
    try { o = JSON.parse(p); } catch (e) { return; }
    if (o.type === 'add') {
      ui.layers = ui.layers.filter(l => l.type === 'detail');
      let text = (o.text || '').trim().replace(/^[„“"'»«‚‘(]+|[“”"'»«‘’).,;:!?]+$/g, '');
      if (/^https?:\/\//.test(text)) text = '';
      if (text.split(/\s+/).length > 6) text = '';
      if (ui.tab !== 'list') setTab('list');
      const ex = text && byWord(text);
      if (ex) { pushLayer({ type: 'detail', id: ex.id }); toast('Steht schon in deiner Sammlung'); }
      else openEditor(null, { wort: text, autoLook: !!text });
    } else if (o.type === 'quiz') {
      ui.layers = []; renderLayers(); setTab('quiz');
    } else if (o.type === 'show') {
      const w = byId(o.id) || byWord(o.id);
      if (w) { ui.layers = []; setTab('list'); pushLayer({ type: 'detail', id: w.id }); }
    }
  };

  /* ================= Start ================= */
  loadData();
  setTab('list');
  try { A.ready(); } catch (e) { }
  window.onPending();
})();
