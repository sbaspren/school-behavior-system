// ═══════════════════════════════════════════════════════════════
// مراقب مدرستي بلس — الصق هذا الكود في Console على صفحة نور
// ثم نفّذ أي عملية من مدرستي بلس
// بعد الانتهاء اكتب: copyReport()
// ═══════════════════════════════════════════════════════════════

(function() {
  const LOG = [];
  const startTime = Date.now();

  function ts() { return ((Date.now() - startTime) / 1000).toFixed(2) + 's'; }
  function log(type, data) {
    const entry = { time: ts(), type, ...data };
    LOG.push(entry);
    console.log(`%c[${entry.time}] ${type}`, 'color: #00ff00; font-weight: bold;', data);
  }

  // ──────────────────────────────────
  // 1. مراقبة طلبات الشبكة (fetch + XHR)
  // ──────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '?';
    const method = args[1]?.method || 'GET';
    log('FETCH', { method, url: url.substring(0, 200) });
    return origFetch.apply(this, args).then(res => {
      log('FETCH-RESPONSE', { url: url.substring(0, 100), status: res.status });
      return res;
    });
  };

  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._spyMethod = method;
    this._spyUrl = url;
    log('XHR-OPEN', { method, url: (url || '').substring(0, 200) });
    return origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    log('XHR-SEND', {
      url: (this._spyUrl || '').substring(0, 100),
      bodySize: body ? body.length || body.size || '?' : 0
    });
    return origXHRSend.apply(this, arguments);
  };

  // ──────────────────────────────────
  // 2. مراقبة __doPostBack
  // ──────────────────────────────────
  if (typeof __doPostBack === 'function') {
    const origPostBack = __doPostBack;
    window.__doPostBack = function(target, arg) {
      log('POSTBACK', { target, arg });
      return origPostBack.apply(this, arguments);
    };
  }

  // ──────────────────────────────────
  // 3. مراقبة window.postMessage
  // ──────────────────────────────────
  window.addEventListener('message', function(e) {
    if (e.source === window) {
      let data = e.data;
      if (typeof data === 'object') {
        log('POST-MESSAGE', {
          bg: data.bg,
          p: data.p,
          store: data.store,
          whatsapp: data.whatsapp,
          keys: Object.keys(data).join(','),
          preview: JSON.stringify(data).substring(0, 300)
        });
      }
    }
  }, true);

  // ──────────────────────────────────
  // 4. مراقبة تغييرات DOM (أزرار، قوائم)
  // ──────────────────────────────────
  const obs = new MutationObserver(function(mutations) {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            const tag = node.tagName;
            const id = node.id || '';
            const cls = node.className || '';
            if (tag === 'SCRIPT') {
              log('SCRIPT-INJECTED', { src: node.src || 'inline', size: (node.textContent||'').length });
            } else if (id || (typeof cls === 'string' && cls.length > 0)) {
              log('DOM-ADDED', { tag, id, class: (typeof cls === 'string' ? cls : '').substring(0, 80) });
            }
          }
        }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // ──────────────────────────────────
  // 5. مراقبة تغييرات الفورم (ViewState)
  // ──────────────────────────────────
  const vsEl = document.getElementById('__VIEWSTATE');
  const evEl = document.getElementById('__EVENTVALIDATION');
  let lastVS = vsEl ? vsEl.value.length : 0;
  let lastEV = evEl ? evEl.value.length : 0;

  setInterval(function() {
    if (vsEl && vsEl.value.length !== lastVS) {
      log('VIEWSTATE-CHANGED', { oldSize: lastVS, newSize: vsEl.value.length });
      lastVS = vsEl.value.length;
    }
    if (evEl && evEl.value.length !== lastEV) {
      log('EVENTVALIDATION-CHANGED', { oldSize: lastEV, newSize: evEl.value.length });
      lastEV = evEl.value.length;
    }
  }, 500);

  // ──────────────────────────────────
  // 6. مراقبة تغييرات القوائم المنسدلة
  // ──────────────────────────────────
  document.querySelectorAll('select').forEach(function(sel) {
    sel.addEventListener('change', function() {
      log('SELECT-CHANGED', { id: sel.id, value: sel.value, text: sel.options[sel.selectedIndex]?.text });
    });
  });

  // ──────────────────────────────────
  // 7. مراقبة النقرات
  // ──────────────────────────────────
  document.addEventListener('click', function(e) {
    const el = e.target;
    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'A') {
      log('CLICK', { tag: el.tagName, id: el.id, type: el.type, value: (el.value||'').substring(0, 50) });
    }
  }, true);

  // ──────────────────────────────────
  // نسخ التقرير
  // ──────────────────────────────────
  window.copyReport = function() {
    const report = {
      totalEvents: LOG.length,
      duration: ts(),
      events: LOG
    };
    const text = JSON.stringify(report, null, 2);

    // نسخ للحافظة
    navigator.clipboard.writeText(text).then(function() {
      console.log('%c✅ تم نسخ التقرير! الصقه هنا', 'color: #00ff00; font-size: 18px;');
    });

    // عرض ملخص
    const types = {};
    LOG.forEach(function(e) { types[e.type] = (types[e.type] || 0) + 1; });
    console.log('%c═══ ملخص التقرير ═══', 'color: yellow; font-size: 16px;');
    console.table(types);

    return text;
  };

  console.log('%c═══════════════════════════════════════', 'color: #00ff00; font-size: 14px;');
  console.log('%c   المراقب جاهز — نفّذ عملية من مدرستي بلس', 'color: #00ff00; font-size: 16px;');
  console.log('%c   بعد الانتهاء اكتب: copyReport()', 'color: yellow; font-size: 14px;');
  console.log('%c═══════════════════════════════════════', 'color: #00ff00; font-size: 14px;');
})();
