/* Liest Bedeutungen, Worttrennung und Beispiele aus dem Wikitext von de.wiktionary.org */
(function (global) {
  'use strict';

  const LABELS = {
    'ugs.': 'umgangssprachlich', 'umgangssprachlich': 'umgangssprachlich',
    'geh.': 'gehoben', 'gehoben': 'gehoben', 'veraltet': 'veraltet', 'veraltend': 'veraltend',
    'übertr.': 'übertragen', 'übertragen': 'übertragen', 'scherzh.': 'scherzhaft', 'scherzhaft': 'scherzhaft',
    'bildungsspr.': 'bildungssprachlich', 'bildungssprachlich': 'bildungssprachlich',
    'abw.': 'abwertend', 'abwertend': 'abwertend', 'selten': 'selten', 'fachspr.': 'fachsprachlich',
    'fachsprachlich': 'fachsprachlich', 'österr.': 'österreichisch', 'schweiz.': 'schweizerisch',
    'va.': 'veraltet', 'reg.': 'regional', 'regional': 'regional', 'pej.': 'abwertend',
    'iron.': 'ironisch', 'ironisch': 'ironisch', 'intransitiv': 'intransitiv', 'transitiv': 'transitiv',
    'reflexiv': 'reflexiv', 'Pl.': 'Plural', 'Sg.': 'Singular', 'kPl.': 'kein Plural'
  };

  function template(inner) {
    const parts = inner.split('|').map(s => s.trim());
    const name = parts[0];
    const args = parts.slice(1);
    if (name === 'K') {
      const pos = args.filter(a => !a.includes('='));
      const ft = args.find(a => a.startsWith('ft='));
      let out = pos.map(a => LABELS[a] || a).join(', ');
      if (ft) out += (out ? ', ' : '') + ft.slice(3);
      return out ? out + ': ' : '';
    }
    if (name === 'L' || name === 'Ü') return args[1] || args[0] || '';
    if (name === 'Polytonisch' || name === 'lang') return args[args.length - 1] || '';
    if (!args.length && LABELS[name]) return LABELS[name];
    if (!args.length && /^[a-zäöü]+\.$/i.test(name)) return name;
    return '';
  }

  function clean(s) {
    let t = s;
    t = t.replace(/<!--[\s\S]*?-->/g, '');
    t = t.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
    t = t.replace(/<\/?(sup|sub|small|span|i|b)[^>]*>/g, '');
    let guard = 0;
    while (/\{\{[^{}]*\}\}/.test(t) && guard++ < 30) {
      t = t.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => template(inner));
    }
    t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
    t = t.replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1');
    t = t.replace(/'''?/g, '');
    t = t.replace(/&nbsp;|&#160;/g, ' ').replace(/&shy;/g, '').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
    return t;
  }

  /** Abschnitt einer deutschen Wortart-Überschrift herausschneiden */
  function germanPart(text) {
    const lines = text.split('\n');
    let start = -1, end = lines.length;
    for (let i = 0; i < lines.length; i++) {
      if (/^==\s[^=].*\{\{Sprache\|Deutsch\}\}/.test(lines[i])) { start = i; break; }
    }
    if (start < 0) return text;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^==\s[^=]/.test(lines[i])) { end = i; break; }
    }
    return lines.slice(start, end).join('\n');
  }

  function block(lines, name) {
    const out = [];
    let i = lines.findIndex(l => l.trim() === '{{' + name + '}}');
    if (i < 0) return out;
    for (i = i + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l.trim()) { if (out.length) break; else continue; }
      if (!l.startsWith(':')) break;
      out.push(l);
    }
    return out;
  }

  function parse(text) {
    const res = { bedeutungen: [], silben: '', beispiele: [], wortart: '' };
    if (!text) return res;
    const part = germanPart(text);
    const lines = part.split('\n');

    const wa = part.match(/\{\{Wortart\|([^|}]+)\|Deutsch\}\}/);
    if (wa) res.wortart = wa[1];

    const wt = block(lines, 'Worttrennung');
    if (wt.length) {
      const first = clean(wt[0].replace(/^:+/, ''));
      res.silben = first.split(/,|\bPlural\b/)[0].trim();
    }

    for (const l of block(lines, 'Bedeutungen')) {
      const m = l.replace(/^:+/, '').match(/^\s*\[([^\]]+)\]\s*(.*)$/);
      const nr = m ? m[1] : '';
      const body = clean(m ? m[2] : l.replace(/^:+/, ''));
      if (body) res.bedeutungen.push({ nr, text: body });
    }

    for (const l of block(lines, 'Beispiele')) {
      const m = l.replace(/^:+/, '').match(/^\s*\[([^\]]+)\]\s*(.*)$/);
      const body = clean(m ? m[2] : l.replace(/^:+/, ''));
      if (body && body.length < 260) res.beispiele.push({ nr: m ? m[1] : '', text: body });
    }
    return res;
  }

  global.Wiki = { parse, clean };
})(window);
