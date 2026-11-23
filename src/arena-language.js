// Installed in the Arena document before its loading screen is parsed.
function installArenaLanguage(english) {
  const url = new URL(location.href);
  let saved;
  try { saved = localStorage.getItem('ar_language'); } catch {}
  const requested = url.searchParams.get('lang');
  const language = (requested === 'en' || requested === 'th' ? requested : saved) === 'en' ? 'en' : 'th';
  document.documentElement.lang = language;
  function select(next) {
    try { localStorage.setItem('ar_language', next); } catch {}
    url.searchParams.set('lang', next);
    location.replace(url.href);
  }

  const thai = /[\u0e00-\u0e7f]/;
  const separator = '\u2063';
  const cache = new Map();
  const escape = key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = language === 'en'
    ? new RegExp(Object.keys(english).sort((a,b) => b.length-a.length).map(escape).join('|'), 'g')
    : null;

  function translatePart(source) {
    if (!thai.test(source)) return source;
    if (Object.hasOwn(english, source)) return english[source];
    const slain = source.match(/^(.*) ถูก(.+)ฆ่า$/);
    if (slain) return translatePart(slain[1])+' was slain by '+translatePart(slain[2]);
    return source.replace(pattern, (key, index) => {
      const before = source[index-1] || '';
      const after = source[index+key.length] || '';
      const prefix = /[a-z0-9\u0e00-\u0e7f]/i.test(before) ? ' ' : '';
      const suffix = /[a-z0-9]/i.test(after) ? ' ' : '';
      return prefix + english[key] + suffix;
    });
  }

  function text(source) {
    if (!pattern || typeof source !== 'string' || (!thai.test(source) && !source.includes(separator))) return source;
    if (cache.has(source)) return cache.get(source);
    const result = source.split(separator).map((part,i) => i % 2 ? part : translatePart(part)).join('');
    if (cache.size >= 2048) cache.clear();
    cache.set(source, result);
    return result;
  }

  // Delimit a user name only while painting a mixed game message on canvas.
  function literal(name) {
    return pattern && thai.test(name) ? separator + name.replaceAll(separator,'') + separator : name;
  }
  function feed(message, heroes) {
    if (!pattern || typeof message !== 'string' || !thai.test(message)) return message;
    const names = heroes.filter(unit => unit.hero && unit.ctrl && thai.test(unit.name))
      .map(unit => escape(unit.name)).sort((a,b) => b.length-a.length);
    // Names are standalone fields in combat notices. Keep the original spelling
    // at the display boundary, including when a player uses a weapon or boss name.
    if (!names.length) return message;
    const actors = new RegExp('(^|\\s)(?:'+names.join('|')+')(?!\\S)', 'g');
    return message.replace(actors, (match,space) => space+literal(match.slice(space.length)));
  }
  function canvas(ctx) {
    if (!pattern) return;
    for (const method of ['measureText','fillText','strokeText']) {
      const native = ctx[method];
      ctx[method] = function(value, ...args) { return native.call(this, text(value), ...args); };
    }
  }
  window.ArenaLanguage = {language, select, text, literal, feed, canvas};
  if (!pattern) return;

  const attrs = ['aria-label', 'title', 'placeholder', 'alt'];
  const skip = 'script,style,textarea,[translate="no"]';
  function attribute(el, key) {
    const value = el.getAttribute(key);
    const translated = text(value);
    if (translated !== value) el.setAttribute(key, translated);
  }
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const translated = text(node.data);
      if (node.data !== translated) node.data = translated;
    } else if (node.nodeType === Node.ELEMENT_NODE && !node.matches(skip)) {
      for (const key of attrs) if (node.hasAttribute(key)) attribute(node,key);
      node.childNodes.forEach(visit);
    }
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const el = record.target.parentElement;
      if (el?.closest(skip) || record.target.closest?.(skip)) continue;
      if (record.type === 'childList') record.addedNodes.forEach(visit);
      else if (record.type === 'characterData') visit(record.target);
      else attribute(record.target, record.attributeName);
    }
  });
  observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:attrs});
}
