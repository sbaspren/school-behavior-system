// ═══════════════════════════════════════════════════════════════
// مراقب مدرستي بلس v2 — يلتقط الكود المحمّل من السيرفر
// الصق في Console على صفحة نور ثم اضغط Enter
// بعد تحميل الصفحة اكتب: copyReport()
// ═══════════════════════════════════════════════════════════════

(function() {
  const LOG = [];
  const CAPTURED_CODE = [];
  const XHR_DETAILS = [];
  const startTime = Date.now();

  function ts() { return ((Date.now() - startTime) / 1000).toFixed(2) + 's'; }
  function log(type, data) {
    const entry = { time: ts(), type, ...data };
    LOG.push(entry);
    console.log('%c[' + entry.time + '] ' + type, 'color: #00ff00; font-weight: bold;', data);
  }

  // ──────────────────────────────────
  // 1. التقاط XHR مع المحتوى الكامل (الطلب + الرد)
  // ──────────────────────────────────
  var origXHROpen = XMLHttpRequest.prototype.open;
  var origXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._spyMethod = method;
    this._spyUrl = url || '';
    return origXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    var self = this;
    var url = this._spyUrl;
    var method = this._spyMethod;

    log('XHR', { method: method, url: url.substring(0, 200), bodySize: body ? (body.length || '?') : 0 });

    // التقاط البيانات المرسلة (أول 2000 حرف)
    var bodyPreview = '';
    if (body && typeof body === 'string') {
      bodyPreview = body.substring(0, 2000);
    }

    var origOnReady = this.onreadystatechange;
    this.onreadystatechange = function() {
      if (self.readyState === 4) {
        var responsePreview = '';
        try {
          responsePreview = (self.responseText || '').substring(0, 5000);
        } catch(e) {}

        var detail = {
          time: ts(),
          method: method,
          url: url,
          status: self.status,
          requestBodyPreview: bodyPreview.substring(0, 500),
          responseSize: (self.responseText || '').length,
          responsePreview: responsePreview
        };

        XHR_DETAILS.push(detail);

        log('XHR-DONE', {
          url: url.substring(0, 100),
          status: self.status,
          responseSize: (self.responseText || '').length
        });
      }
      if (origOnReady) origOnReady.apply(this, arguments);
    };

    // التقاط addEventListener أيضاً
    this.addEventListener('load', function() {
      if (!XHR_DETAILS.find(function(d) { return d.url === url && d.time === ts(); })) {
        var responsePreview = '';
        try {
          responsePreview = (self.responseText || '').substring(0, 5000);
        } catch(e) {}

        XHR_DETAILS.push({
          time: ts(),
          method: method,
          url: url,
          status: self.status,
          responseSize: (self.responseText || '').length,
          responsePreview: responsePreview
        });
      }
    });

    return origXHRSend.apply(this, arguments);
  };

  // ──────────────────────────────────
  // 2. التقاط fetch مع المحتوى
  // ──────────────────────────────────
  var origFetch = window.fetch;
  window.fetch = function() {
    var args = arguments;
    var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '?';
    var method = (args[1] && args[1].method) || 'GET';

    log('FETCH', { method: method, url: url.substring(0, 200) });

    return origFetch.apply(this, args).then(function(res) {
      var cloned = res.clone();
      cloned.text().then(function(text) {
        XHR_DETAILS.push({
          time: ts(),
          method: method,
          url: url,
          status: res.status,
          responseSize: text.length,
          responsePreview: text.substring(0, 5000)
        });
      });
      return res;
    });
  };

  // ──────────────────────────────────
  // 3. التقاط postMessage
  // ──────────────────────────────────
  window.addEventListener('message', function(e) {
    if (e.source === window && typeof e.data === 'object') {
      log('MSG', {
        keys: Object.keys(e.data).join(','),
        bg: e.data.bg,
        p: e.data.p,
        preview: JSON.stringify(e.data).substring(0, 500)
      });
    }
  }, true);

  // ──────────────────────────────────
  // 4. التقاط السكربتات المحقونة (الكود من السيرفر)
  // ──────────────────────────────────
  var obs = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      for (var j = 0; j < m.addedNodes.length; j++) {
        var node = m.addedNodes[j];
        if (node.nodeType === 1) {
          // التقاط السكربتات
          if (node.tagName === 'SCRIPT') {
            var code = node.textContent || '';
            CAPTURED_CODE.push({
              time: ts(),
              src: node.src || 'inline',
              size: code.length,
              preview: code.substring(0, 3000)
            });
            log('SCRIPT', { src: node.src || 'inline', size: code.length });
          }
          // التقاط HTML المحقون الكبير (واجهة مدرستي بلس)
          else if (node.innerHTML && node.innerHTML.length > 500) {
            CAPTURED_CODE.push({
              time: ts(),
              tag: node.tagName,
              id: node.id,
              htmlSize: node.innerHTML.length,
              preview: node.innerHTML.substring(0, 3000)
            });
            log('HTML-INJECTED', { tag: node.tagName, id: node.id, size: node.innerHTML.length });
          }
        }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // ──────────────────────────────────
  // 5. مراقبة النقرات
  // ──────────────────────────────────
  document.addEventListener('click', function(e) {
    var el = e.target;
    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'A') {
      log('CLICK', { tag: el.tagName, id: el.id, type: el.type, text: (el.textContent||'').substring(0,50) });
    }
  }, true);

  // ──────────────────────────────────
  // نسخ التقرير الكامل
  // ──────────────────────────────────
  window.copyReport = function() {
    var report = {
      totalEvents: LOG.length,
      duration: ts(),
      summary: {},
      events: LOG,
      capturedCode: CAPTURED_CODE,
      xhrDetails: XHR_DETAILS
    };

    LOG.forEach(function(e) { report.summary[e.type] = (report.summary[e.type] || 0) + 1; });

    var text = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text).then(function() {
      console.log('%c✅ تم نسخ التقرير الكامل! (' + text.length + ' حرف)', 'color: #00ff00; font-size: 18px;');
    });

    console.log('%c═══ ملخص ═══', 'color: yellow; font-size: 16px;');
    console.table(report.summary);
    console.log('سكربتات ملتقطة:', CAPTURED_CODE.length);
    console.log('طلبات مفصلة:', XHR_DETAILS.length);

    return text;
  };

  // نسخ الكود الملتقط فقط
  window.copyCode = function() {
    var text = JSON.stringify(CAPTURED_CODE, null, 2);
    navigator.clipboard.writeText(text).then(function() {
      console.log('%c✅ تم نسخ الكود الملتقط!', 'color: #00ff00; font-size: 18px;');
    });
    return text;
  };

  // نسخ تفاصيل XHR فقط
  window.copyXHR = function() {
    var text = JSON.stringify(XHR_DETAILS, null, 2);
    navigator.clipboard.writeText(text).then(function() {
      console.log('%c✅ تم نسخ تفاصيل الطلبات!', 'color: #00ff00; font-size: 18px;');
    });
    return text;
  };

  console.log('%c═══════════════════════════════════════', 'color: #00ff00; font-size: 14px;');
  console.log('%c   المراقب v2 جاهز — يلتقط كل شيء', 'color: #00ff00; font-size: 16px;');
  console.log('%c   copyReport() = التقرير الكامل', 'color: yellow; font-size: 14px;');
  console.log('%c   copyCode()   = الكود الملتقط', 'color: yellow; font-size: 14px;');
  console.log('%c   copyXHR()    = تفاصيل الطلبات', 'color: yellow; font-size: 14px;');
  console.log('%c═══════════════════════════════════════', 'color: #00ff00; font-size: 14px;');
})();
