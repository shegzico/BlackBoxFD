/**
 * BlackBox Logistics — Package Tracking Widget v2
 * Drop onto any website: <div id="blackbox-tracker"></div><script src="...blackbox-tracker.js"></script>
 *
 * Config via data attributes on the container div:
 *   data-theme="dark|light"              (default: dark)
 *   data-prefill="BB-XXXXXX"             (pre-fills tracking ID)
 *   data-heading="Track your package"    (custom heading text)
 *   data-show-heading="true|false"       (show/hide heading, default: true)
 *   data-sub="Enter your tracking ID…"  (custom sub text)
 *   data-show-sub="true|false"           (show/hide sub, default: true)
 *   data-btn-position="below|beside"     (button below or beside input, default: below)
 *   data-inherit-styles="true|false"     (inherit site styles for input+button, default: false)
 */
(function () {
  'use strict';

  var API_BASE = 'https://app-blackbox.vercel.app/api/public/track';
  var APP_TRACK = 'https://app-blackbox.vercel.app/track';

  // ── Status config ────────────────────────────────────────────
  var STATUS_ORDER = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed'];
  var STATUS_LABELS = {
    pending: 'Pending',
    assigned: 'Assigned',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  };
  var STATUS_COLORS = {
    pending: '#f59e0b',
    assigned: '#3b82f6',
    picked_up: '#8b5cf6',
    in_transit: '#f97316',
    delivered: '#22c55e',
    confirmed: '#F2FF66',
    cancelled: '#ef4444',
  };

  // ── Theme definitions ────────────────────────────────────────
  var THEMES = {
    dark: {
      surface: '#191314',
      border: '#2A2A2A',
      text: '#FAFAFA',
      textMuted: '#888888',
      textDim: '#555555',
      accent: '#F2FF66',
      accentText: '#0A0A0A',
      inputBg: '#232023',
      inputBorder: '#3A3A3A',
      errorBg: 'rgba(239,68,68,0.1)',
      errorBorder: 'rgba(239,68,68,0.3)',
      errorText: '#f87171',
      progressTrack: '#2A2A2A',
      progressDone: 'rgba(255,255,255,0.6)',
      progressActive: 'rgba(255,255,255,0.9)',
      progressLine: 'rgba(255,255,255,0.15)',
      progressLineDone: 'rgba(255,255,255,0.5)',
      iconBg: 'rgba(255,255,255,0.07)',
      iconColor: 'rgba(255,255,255,0.75)',
    },
    light: {
      surface: '#f9fafb',
      border: '#e5e7eb',
      text: '#111827',
      textMuted: '#6b7280',
      textDim: '#9ca3af',
      accent: '#0A0A0A',
      accentText: '#ffffff',
      inputBg: '#ffffff',
      inputBorder: '#d1d5db',
      errorBg: 'rgba(239,68,68,0.05)',
      errorBorder: 'rgba(239,68,68,0.3)',
      errorText: '#dc2626',
      progressTrack: '#e5e7eb',
      progressDone: 'rgba(0,0,0,0.5)',
      progressActive: 'rgba(0,0,0,0.85)',
      progressLine: 'rgba(0,0,0,0.1)',
      progressLineDone: 'rgba(0,0,0,0.35)',
      iconBg: 'rgba(0,0,0,0.06)',
      iconColor: 'rgba(0,0,0,0.6)',
    },
  };

  // ── Helpers ──────────────────────────────────────────────────
  function attr(el, name, def) {
    var v = el.getAttribute(name);
    return (v !== null && v !== '') ? v : def;
  }

  function boolAttr(el, name, def) {
    var v = el.getAttribute(name);
    if (v === null || v === '') return def;
    return v !== 'false';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function unesc(str) {
    return String(str || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  }

  function el(tag, attrs, inner) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'style') { Object.assign(e.style, attrs[k]); }
      else if (k === 'class') { e.className = attrs[k]; }
      else { e.setAttribute(k, attrs[k]); }
    });
    if (inner != null) e.innerHTML = inner;
    return e;
  }

  // ── CSS injection ────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('bbx-styles')) return;
    var css = [
      '.bbx-widget *{box-sizing:border-box;margin:0;padding:0;}',
      '.bbx-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
      '.bbx-inner{padding:0;}',
      /* Heading / sub — styled but invisible if hidden */
      '.bbx-heading{font-size:20px;font-weight:700;line-height:1.2;margin-bottom:6px;}',
      '.bbx-sub{font-size:13px;opacity:.5;margin-bottom:16px;}',
      /* Field wrapper — layout */
      '.bbx-field-below{display:flex;flex-direction:column;gap:8px;}',
      '.bbx-field-below .bbx-input-wrap{width:100%;}',
      '.bbx-field-beside{display:flex;flex-direction:row;gap:8px;align-items:stretch;}',
      '.bbx-field-beside .bbx-input-wrap{flex:1;}',
      /* Default styled input (used unless data-inherit-styles="true") */
      '.bbx-input{width:100%;border-radius:10px;border:1.5px solid;padding:12px 14px;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;letter-spacing:.5px;}',
      /* Default styled button */
      '.bbx-btn{border:none;border-radius:10px;padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .15s,transform .15s;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:6px;letter-spacing:.3px;font-family:inherit;}',
      '.bbx-btn:active{transform:scale(.97);}',
      '.bbx-btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important;}',
      /* Full-width button when stacked below */
      '.bbx-field-below .bbx-btn{width:100%;}',
      /* Error */
      '.bbx-error{border-radius:10px;padding:10px 14px;font-size:13px;margin-top:10px;display:none;}',
      /* Result panel */
      '.bbx-result{display:none;}',
      /* Progress */
      '.bbx-progress-wrap{border-radius:12px;padding:16px;margin-bottom:12px;}',
      '.bbx-progress-steps{display:flex;align-items:flex-start;}',
      '.bbx-step{display:flex;flex-direction:column;align-items:center;}',
      '.bbx-step-dot{width:18px;height:18px;border-radius:50%;border:2px solid;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .3s;}',
      '.bbx-step-dot svg{width:10px;height:10px;}',
      '.bbx-step-label{font-size:9px;margin-top:5px;font-weight:600;text-align:center;white-space:nowrap;letter-spacing:.3px;}',
      /* Header */
      '.bbx-result-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;}',
      '.bbx-tid{font-family:monospace;font-size:15px;font-weight:700;letter-spacing:1px;}',
      '.bbx-tid-label{font-size:10px;font-weight:500;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;}',
      '.bbx-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;flex-shrink:0;}',
      '.bbx-express{display:inline-flex;align-items:center;gap:4px;background:#F2FF66;color:#0A0A0A;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin-left:8px;}',
      /* Info cards */
      '.bbx-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}',
      '@media(max-width:400px){.bbx-cards{grid-template-columns:1fr;}}',
      '.bbx-card{border-radius:10px;padding:12px;display:flex;align-items:flex-start;gap:10px;border:1px solid;}',
      '.bbx-card-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.bbx-card-icon svg{width:14px;height:14px;}',
      '.bbx-card-label{font-size:10px;font-weight:500;letter-spacing:.4px;text-transform:uppercase;margin-bottom:2px;}',
      '.bbx-card-value{font-size:13px;font-weight:600;}',
      '.bbx-card-sub{font-size:11px;margin-top:1px;}',
      /* Timeline header row — toggle + full details link side by side */
      '.bbx-tl-header{display:flex;align-items:center;justify-content:space-between;gap:8px;}',
      '.bbx-tl-toggle{display:flex;align-items:center;gap:6px;background:none;border:none;padding:0;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;}',
      '.bbx-tl-toggle svg{width:12px;height:12px;transition:transform .2s;}',
      '.bbx-tl-toggle.open svg{transform:rotate(180deg);}',
      '.bbx-tl-link{background:none;border:none;padding:0;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:.4px;text-decoration:underline;text-underline-offset:2px;display:inline-flex;align-items:center;gap:4px;}',
      '.bbx-tl-link svg{width:11px;height:11px;}',
      /* Timeline events */
      '.bbx-tl-events{margin-top:12px;display:none;}',
      '.bbx-events{display:flex;flex-direction:column;gap:0;}',
      '.bbx-event{display:flex;gap:12px;position:relative;}',
      '.bbx-event-left{display:flex;flex-direction:column;align-items:center;width:16px;flex-shrink:0;}',
      '.bbx-event-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:3px;}',
      '.bbx-event-line{width:2px;flex:1;margin:3px 0;min-height:12px;}',
      '.bbx-event:last-child .bbx-event-line{display:none;}',
      '.bbx-event-body{padding-bottom:14px;}',
      '.bbx-event-status{font-size:12px;font-weight:600;}',
      '.bbx-event-note{font-size:11px;margin-top:2px;}',
      '.bbx-event-time{font-size:10px;margin-top:3px;}',
      /* Actions */
      '.bbx-actions{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;}',
      '.bbx-btn-ghost{background:transparent;border:1.5px solid;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;letter-spacing:.3px;font-family:inherit;}',
      '.bbx-btn-ghost:active{transform:scale(.97);}',
      /* Spinner */
      '@keyframes bbx-spin{to{transform:rotate(360deg)}}',
      '.bbx-spinner{width:14px;height:14px;border-radius:50%;border:2px solid transparent;animation:bbx-spin .7s linear infinite;flex-shrink:0;}',
      /* Divider */
      '.bbx-divider{height:1px;margin:16px 0;}',
    ].join('');
    var s = document.createElement('style');
    s.id = 'bbx-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── SVG Icons ────────────────────────────────────────────────
  var ICONS = {
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m0-14L4 17m8 4V11"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 6h-3l-2 5.5 3 2.5 2-3h3"/><path stroke-linecap="round" stroke-linejoin="round" d="M5.5 17.5L9 11l3 3"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
    pkg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M3 9h18M8 2v4M16 2v4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-5-5"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M1 4v6h6M23 20v-6h-6"/><path stroke-linecap="round" d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>',
    check: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>',
    chevDown: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4,6 8,10 12,6"/></svg>',
  };

  // ── Widget class ─────────────────────────────────────────────
  function BlackBoxTracker(container) {
    this.container    = container;
    this.theme        = (attr(container, 'data-theme', 'dark')).toLowerCase();
    if (this.theme !== 'light') this.theme = 'dark';
    this.prefill      = attr(container, 'data-prefill', '');
    this.showHeading  = boolAttr(container, 'data-show-heading', true);
    this.headingText  = attr(container, 'data-heading', 'Track your package');
    this.showSub      = boolAttr(container, 'data-show-sub', true);
    this.subText      = attr(container, 'data-sub', 'Enter your BlackBox tracking ID to see real-time status');
    this.btnPos        = attr(container, 'data-btn-position', 'below') === 'beside' ? 'beside' : 'below';
    this.inheritStyles = boolAttr(container, 'data-inherit-styles', false);
    this.t             = THEMES[this.theme];
    this._build();
  }

  BlackBoxTracker.prototype._build = function () {
    var self = this;
    var t = this.t;

    // Root widget — no background, no border, no shadow
    var widget = el('div', { class: 'bbx-widget' });
    var inner = el('div', { class: 'bbx-inner' });

    // Heading
    if (this.showHeading) {
      var heading = el('h2', { class: 'bbx-heading', style: { color: t.text } }, esc(this.headingText));
      inner.appendChild(heading);
    }

    // Sub
    if (this.showSub) {
      var sub = el('p', { class: 'bbx-sub', style: { color: t.textMuted } }, esc(this.subText));
      inner.appendChild(sub);
    }

    // Field wrapper — layout driven by btn-position
    var fieldWrap = el('div', { class: this.btnPos === 'beside' ? 'bbx-field-beside' : 'bbx-field-below' });
    var inputWrap = el('div', { class: 'bbx-input-wrap' });

    var inputAttrs = {
      type: 'text',
      placeholder: 'e.g. BB-A1B2C3',
      maxlength: '20',
      autocomplete: 'off',
      spellcheck: 'false',
    };
    // Apply app styles by default; skip if inheriting site styles
    if (!this.inheritStyles) {
      inputAttrs['class'] = 'bbx-input';
    }
    var input = el('input', inputAttrs);

    // Apply theme colours to styled input
    if (!this.inheritStyles) {
      input.style.background   = t.inputBg;
      input.style.borderColor  = t.inputBorder;
      input.style.color        = t.text;
      input.addEventListener('focus', function () { input.style.borderColor = t.accent; });
      input.addEventListener('blur',  function () { input.style.borderColor = t.inputBorder; });
    }

    if (this.prefill) input.value = this.prefill.toUpperCase();

    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase();
      errorDiv.style.display = 'none';
    });

    var btnAttrs = { type: 'button' };
    if (!this.inheritStyles) {
      btnAttrs['class'] = 'bbx-btn';
    }
    var trackBtn = el('button', btnAttrs);

    // Apply theme colours to styled button
    if (!this.inheritStyles) {
      trackBtn.style.background = t.accent;
      trackBtn.style.color      = t.accentText;
    }

    var btnLabel = el('span', null, 'Track');
    var btnIcon  = el('span', { style: { display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' } }, ICONS.search);
    trackBtn.appendChild(btnIcon);
    trackBtn.appendChild(btnLabel);

    inputWrap.appendChild(input);
    fieldWrap.appendChild(inputWrap);
    fieldWrap.appendChild(trackBtn);
    inner.appendChild(fieldWrap);

    var errorDiv = el('div', {
      class: 'bbx-error',
      style: { background: t.errorBg, border: '1px solid ' + t.errorBorder, color: t.errorText },
    });
    inner.appendChild(errorDiv);

    // Result area
    var resultDiv = el('div', { class: 'bbx-result' });
    inner.appendChild(resultDiv);

    widget.appendChild(inner);
    this.container.innerHTML = '';
    this.container.appendChild(widget);

    this._input    = input;
    this._errorDiv = errorDiv;
    this._trackBtn = trackBtn;
    this._btnLabel = btnLabel;
    this._btnIcon  = btnIcon;
    this._resultDiv = resultDiv;

    trackBtn.addEventListener('click', function () { self._track(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') self._track(); });

    if (this.prefill) {
      setTimeout(function () { self._track(); }, 120);
    }
  };

  BlackBoxTracker.prototype._setLoading = function (on) {
    this._trackBtn.disabled = on;
    this._input.disabled = on;
    this._btnLabel.textContent = on ? 'Tracking…' : 'Track';
    var spinner = this._trackBtn.querySelector('.bbx-spinner');
    if (on && !spinner) {
      var spinColor = this.inheritStyles ? 'currentColor' : this.t.accentText;
      var s = el('span', { class: 'bbx-spinner' });
      s.style.borderColor = spinColor + '44';
      s.style.borderTopColor = spinColor;
      this._btnIcon.innerHTML = '';
      this._btnIcon.appendChild(s);
    } else if (!on) {
      this._btnIcon.innerHTML = ICONS.search;
    }
  };

  BlackBoxTracker.prototype._showError = function (msg) {
    this._errorDiv.style.display = 'block';
    this._errorDiv.textContent = msg;
    this._resultDiv.style.display = 'none';
  };

  BlackBoxTracker.prototype._track = function () {
    var self = this;
    var id = (this._input.value || '').trim().toUpperCase();
    if (!id) { this._showError('Please enter a tracking ID.'); return; }
    if (!/^BB-[A-Z0-9]{4,10}$/.test(id)) {
      this._showError('Invalid tracking ID format. It should look like BB-A1B2C3.');
      return;
    }

    this._setLoading(true);
    this._errorDiv.style.display = 'none';
    this._resultDiv.style.display = 'none';

    fetch(API_BASE + '/' + encodeURIComponent(id))
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, data: d }; }); })
      .then(function (r) {
        self._setLoading(false);
        if (!r.ok) {
          self._showError(r.data.error === 'Delivery not found'
            ? 'No delivery found with that tracking ID. Please check and try again.'
            : 'Something went wrong. Please try again.');
          return;
        }
        self._renderResult(r.data.tracking);
      })
      .catch(function () {
        self._setLoading(false);
        self._showError('Network error. Please check your connection and try again.');
      });
  };

  BlackBoxTracker.prototype._renderResult = function (d) {
    var self = this;
    var t = this.t;
    var result = this._resultDiv;
    result.innerHTML = '';

    var statusColor = STATUS_COLORS[d.status] || t.textMuted;
    var isCancelled = d.status === 'cancelled';
    var statusIdx = STATUS_ORDER.indexOf(d.status);

    // Divider
    result.appendChild(el('div', { class: 'bbx-divider', style: { background: t.border } }));

    // Header: tracking ID + status badge
    var header = el('div', { class: 'bbx-result-header' });
    var headerLeft = el('div');
    var tidLabel = el('div', { class: 'bbx-tid-label', style: { color: t.textDim } }, 'Tracking ID');
    var tid = el('div', { class: 'bbx-tid', style: { color: t.text } }, esc(d.id));
    if (d.is_express) tid.appendChild(el('span', { class: 'bbx-express' }, ICONS.bolt + ' Express'));
    headerLeft.appendChild(tidLabel);
    headerLeft.appendChild(tid);

    var badge = el('div', {
      class: 'bbx-badge',
      style: { background: statusColor + '1A', color: statusColor, border: '1px solid ' + statusColor + '40' },
    }, esc(STATUS_LABELS[d.status] || d.status));

    header.appendChild(headerLeft);
    header.appendChild(badge);
    result.appendChild(header);

    // ── Progress bar (neutral, with checkmarks) ───────────────
    if (!isCancelled) {
      var progressWrap = el('div', {
        class: 'bbx-progress-wrap',
        style: { background: t.surface, border: '1px solid ' + t.border },
      });
      var stepsWrap = el('div', { class: 'bbx-progress-steps' });
      stepsWrap.style.cssText = 'display:flex;align-items:flex-start;';

      STATUS_ORDER.forEach(function (s, i) {
        var isDone   = statusIdx > i;
        var isActive = statusIdx === i;
        var isFuture = statusIdx < i;

        // Dot
        var dot = el('div', { class: 'bbx-step-dot' });
        if (isDone) {
          // Filled + checkmark
          dot.style.background = t.progressDone;
          dot.style.borderColor = t.progressDone;
          dot.innerHTML = ICONS.check;
          dot.querySelector('svg').style.color = (self.theme === 'dark') ? '#0A0A0A' : '#ffffff';
        } else if (isActive) {
          // Outlined, filled center
          dot.style.background = t.progressActive;
          dot.style.borderColor = t.progressActive;
          dot.style.boxShadow = '0 0 0 3px ' + (self.theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)');
        } else {
          // Empty future
          dot.style.background = 'transparent';
          dot.style.borderColor = t.progressLine;
        }

        var label = el('div', {
          class: 'bbx-step-label',
          style: { color: (isDone || isActive) ? t.text : t.textDim },
        }, STATUS_LABELS[s].replace(' ', '<br>'));

        var stepEl = el('div', { class: 'bbx-step' });
        stepEl.appendChild(dot);
        stepEl.appendChild(label);
        stepsWrap.appendChild(stepEl);

        // Connector line between steps
        if (i < STATUS_ORDER.length - 1) {
          var line = el('div');
          line.style.cssText = 'flex:1;height:2px;margin-top:8px;transition:background .3s;background:' +
            (isDone ? t.progressLineDone : t.progressLine) + ';';
          stepsWrap.appendChild(line);
        }
      });

      progressWrap.appendChild(stepsWrap);
      result.appendChild(progressWrap);
    }

    // ── Info cards (public — no personal details) ─────────────
    var cards = el('div', { class: 'bbx-cards' });
    var cardDefs = [
      { label: 'Pickup',   value: d.pickup_area,   icon: ICONS.pin  },
      { label: 'Dropoff',  value: d.dropoff_area,  icon: ICONS.pin  },
      { label: 'Rider',    value: d.rider_assigned ? 'Assigned' : 'Not yet assigned', icon: ICONS.bike },
    ];
    if (d.pickup_date) cardDefs.push({ label: 'Pickup Date', value: fmtDate(d.pickup_date), icon: ICONS.cal });

    cardDefs.forEach(function (c) {
      var card = el('div', { class: 'bbx-card', style: { background: t.surface, borderColor: t.border } });
      var iconWrap = el('div', { class: 'bbx-card-icon', style: { background: t.iconBg, color: t.iconColor } }, c.icon);
      var body = el('div', { style: { minWidth: '0', flex: '1' } });
      var lbl  = el('div', { class: 'bbx-card-label', style: { color: t.textDim } }, c.label);
      var val  = el('div', { class: 'bbx-card-value', style: { color: t.text } });
      val.textContent = c.value || '';
      body.appendChild(lbl);
      body.appendChild(val);
      if (c.sub) {
        var sub = el('div', { class: 'bbx-card-sub', style: { color: t.textMuted } });
        sub.textContent = c.sub;
        body.appendChild(sub);
      }
      card.appendChild(iconWrap);
      card.appendChild(body);
      cards.appendChild(card);
    });
    result.appendChild(cards);

    // ── Timeline (collapsed by default) ───────────────────────
    // ── "Full details" link — shared reference, placed beside timeline toggle
    var viewBtn = el('button', { class: 'bbx-tl-link', type: 'button', style: { color: t.textDim } });
    viewBtn.innerHTML = ICONS.share + '<span>Full details</span>';
    viewBtn.addEventListener('click', function () {
      window.open(APP_TRACK + '/' + encodeURIComponent(d.id), '_blank', 'noopener');
    });

    if (d.history && d.history.length > 0) {
      result.appendChild(el('div', { class: 'bbx-divider', style: { background: t.border } }));

      var tlOpen = false;

      // Header row: "Delivery history (N)" toggle  +  "Full details" link
      var tlHeader = el('div', { class: 'bbx-tl-header' });

      var tlToggle = el('button', { class: 'bbx-tl-toggle', type: 'button', style: { color: t.textDim } });
      tlToggle.innerHTML = 'Delivery history (' + d.history.length + ')';
      var chevWrap = el('span', { style: { display: 'inline-flex', marginLeft: '4px', color: t.textDim } }, ICONS.chevDown);
      tlToggle.appendChild(chevWrap);

      tlHeader.appendChild(tlToggle);
      tlHeader.appendChild(viewBtn);
      result.appendChild(tlHeader);

      var tlEvents = el('div', { class: 'bbx-tl-events' });
      var events = el('div', { class: 'bbx-events' });

      // API returns newest-first; render in that order
      d.history.forEach(function (h) {
        var evnt = el('div', { class: 'bbx-event' });
        var left = el('div', { class: 'bbx-event-left' });
        var dot  = el('div', { class: 'bbx-event-dot',  style: { background: t.progressDone } });
        var line = el('div', { class: 'bbx-event-line', style: { background: t.border } });
        left.appendChild(dot);
        left.appendChild(line);

        var body = el('div', { class: 'bbx-event-body' });

        // Timestamp — top, muted
        var ts = el('div', { class: 'bbx-event-time', style: { color: t.textDim } }, fmtTime(h.timestamp));
        body.appendChild(ts);

        // Description — primary, prominent (note preferred; fall back to label)
        var desc = el('div', { class: 'bbx-event-status', style: { color: t.text } },
          esc(h.note || STATUS_LABELS[h.status] || h.status));
        body.appendChild(desc);

        // Status label — secondary, muted
        var statusLabel = el('div', { class: 'bbx-event-note', style: { color: t.textMuted } },
          STATUS_LABELS[h.status] || esc(h.status));
        body.appendChild(statusLabel);

        evnt.appendChild(left);
        evnt.appendChild(body);
        events.appendChild(evnt);
      });

      tlEvents.appendChild(events);
      result.appendChild(tlEvents);

      tlToggle.addEventListener('click', function () {
        tlOpen = !tlOpen;
        tlEvents.style.display = tlOpen ? 'block' : 'none';
        tlToggle.classList.toggle('open', tlOpen);
      });
    } else {
      // No history — show Full details link on its own below the cards
      result.appendChild(el('div', { class: 'bbx-divider', style: { background: t.border } }));
      result.appendChild(viewBtn);
    }

    result.style.display = 'block';
  };

  // ── Init all containers ──────────────────────────────────────
  function init() {
    injectCSS();
    var containers = document.querySelectorAll('#blackbox-tracker, .blackbox-tracker');
    for (var i = 0; i < containers.length; i++) {
      new BlackBoxTracker(containers[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
