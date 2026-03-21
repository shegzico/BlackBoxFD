/**
 * BlackBox Logistics — Package Tracking Widget
 * Drop onto any website: <div id="blackbox-tracker"></div><script src="...blackbox-tracker.js"></script>
 * Config via data attributes on the container div:
 *   data-theme="dark|light"          (default: dark)
 *   data-prefill="BB-XXXXXX"         (pre-fills tracking ID)
 *   data-label="Track your parcel"   (custom heading)
 */
(function () {
  'use strict';

  var API_BASE = 'https://black-box-fd.vercel.app/api/public/track';
  var APP_TRACK = 'https://black-box-fd.vercel.app/track';

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
      bg: '#0A0A0A',
      surface: '#191314',
      surface2: '#111111',
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
      shadow: '0 4px 32px rgba(0,0,0,0.5)',
      progressTrack: '#2A2A2A',
    },
    light: {
      bg: '#ffffff',
      surface: '#f9fafb',
      surface2: '#f3f4f6',
      border: '#e5e7eb',
      text: '#111827',
      textMuted: '#6b7280',
      textDim: '#9ca3af',
      accent: '#0A0A0A',
      accentText: '#F2FF66',
      inputBg: '#ffffff',
      inputBorder: '#d1d5db',
      errorBg: 'rgba(239,68,68,0.05)',
      errorBorder: 'rgba(239,68,68,0.3)',
      errorText: '#dc2626',
      shadow: '0 4px 32px rgba(0,0,0,0.08)',
      progressTrack: '#e5e7eb',
    },
  };

  // ── Helpers ──────────────────────────────────────────────────
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
      '.bbx-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;border-radius:16px;overflow:hidden;transition:all .3s;}',
      '.bbx-inner{padding:28px 24px;}',
      '.bbx-logo{display:flex;align-items:center;gap:8px;margin-bottom:20px;}',
      '.bbx-logo-mark{width:32px;height:32px;background:#F2FF66;border-radius:8px;display:flex;align-items:center;justify-content:center;}',
      '.bbx-logo-mark svg{width:18px;height:18px;}',
      '.bbx-logo-name{font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;}',
      '.bbx-logo-sub{font-size:10px;letter-spacing:0.5px;opacity:.5;text-transform:uppercase;}',
      '.bbx-heading{font-size:20px;font-weight:700;line-height:1.2;margin-bottom:6px;}',
      '.bbx-sub{font-size:13px;opacity:.5;margin-bottom:20px;}',
      '.bbx-form-row{display:flex;gap:8px;}',
      '.bbx-input{flex:1;border-radius:10px;border:1.5px solid;padding:12px 14px;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;letter-spacing:.5px;}',
      '.bbx-input:focus{box-shadow:0 0 0 3px rgba(242,255,102,.15);}',
      '.bbx-btn{border:none;border-radius:10px;padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:6px;letter-spacing:.3px;}',
      '.bbx-btn:active{transform:scale(.97);}',
      '.bbx-btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important;}',
      '.bbx-btn-ghost{background:transparent;border:1.5px solid;padding:8px 14px;font-size:12px;}',
      '.bbx-error{border-radius:10px;padding:10px 14px;font-size:13px;margin-top:12px;display:none;}',
      '.bbx-result{display:none;}',
      /* Progress */
      '.bbx-progress-wrap{border-radius:12px;padding:16px;margin-bottom:12px;}',
      '.bbx-progress-steps{display:flex;align-items:center;}',
      '.bbx-step{display:flex;flex-direction:column;align-items:center;position:relative;flex:1;}',
      '.bbx-step:last-child{flex:0;}',
      '.bbx-step-dot{width:12px;height:12px;border-radius:50%;border:2px solid;flex-shrink:0;position:relative;z-index:1;transition:all .3s;}',
      '.bbx-step-line{flex:1;height:2px;margin:0 2px;transition:background .3s;}',
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
      /* Timeline */
      '.bbx-timeline-head{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;}',
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
      /* Spinner */
      '@keyframes bbx-spin{to{transform:rotate(360deg)}}',
      '.bbx-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(10,10,10,.3);border-top-color:#0A0A0A;animation:bbx-spin .7s linear infinite;}',
      '.bbx-spinner-light{border:2px solid rgba(255,255,255,.3);border-top-color:#fff;}',
      /* Divider */
      '.bbx-divider{height:1px;margin:16px 0;}',
      /* Branding footer */
      '.bbx-powered{text-align:center;padding:12px;font-size:10px;letter-spacing:.3px;border-top:1px solid;}',
      '.bbx-powered a{font-weight:700;text-decoration:none;}',
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
  };

  // ── Widget class ─────────────────────────────────────────────
  function BlackBoxTracker(container) {
    this.container = container;
    this.theme = (container.getAttribute('data-theme') || 'dark').toLowerCase();
    if (this.theme !== 'light') this.theme = 'dark';
    this.prefill = container.getAttribute('data-prefill') || '';
    this.label = container.getAttribute('data-label') || 'Track your package';
    this.t = THEMES[this.theme];
    this._build();
  }

  BlackBoxTracker.prototype._applyTheme = function (widget) {
    var t = this.t;
    widget.style.background = t.bg;
    widget.style.color = t.text;
    widget.style.boxShadow = t.shadow;
    widget.style.border = '1px solid ' + t.border;
  };

  BlackBoxTracker.prototype._build = function () {
    var self = this;
    var t = this.t;

    // Root widget
    var widget = el('div', { class: 'bbx-widget' });
    this._applyTheme(widget);
    var inner = el('div', { class: 'bbx-inner' });

    // Logo
    var logo = el('div', { class: 'bbx-logo' });
    var logoMark = el('div', { class: 'bbx-logo-mark' }, ICONS.box);
    var logoText = el('div');
    var logoName = el('div', { class: 'bbx-logo-name', style: { color: t.text } }, 'BlackBox');
    var logoSub = el('div', { class: 'bbx-logo-sub', style: { color: t.textMuted } }, 'Logistics');
    logoText.appendChild(logoName);
    logoText.appendChild(logoSub);
    logo.appendChild(logoMark);
    logo.appendChild(logoText);

    // Heading
    var heading = el('h2', { class: 'bbx-heading', style: { color: t.text } }, esc(this.label));
    var sub = el('p', { class: 'bbx-sub', style: { color: t.textMuted } }, 'Enter your tracking ID to see real-time status');

    // Form
    var formRow = el('div', { class: 'bbx-form-row' });
    var input = el('input', {
      class: 'bbx-input',
      type: 'text',
      placeholder: 'e.g. BB-A1B2C3',
      maxlength: '20',
      autocomplete: 'off',
      spellcheck: 'false',
      style: {
        background: t.inputBg,
        borderColor: t.inputBorder,
        color: t.text,
      },
    });
    if (this.prefill) input.value = this.prefill.toUpperCase();

    input.addEventListener('focus', function () {
      input.style.borderColor = t.accent;
    });
    input.addEventListener('blur', function () {
      input.style.borderColor = t.inputBorder;
    });
    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase();
      errorDiv.style.display = 'none';
    });

    var trackBtn = el('button', {
      class: 'bbx-btn',
      type: 'button',
      style: { background: t.accent, color: t.accentText },
    });
    var btnLabel = el('span', null, 'Track');
    trackBtn.appendChild(el('span', { style: { display: 'flex' } }, ICONS.search));
    trackBtn.appendChild(btnLabel);

    formRow.appendChild(input);
    formRow.appendChild(trackBtn);

    var errorDiv = el('div', { class: 'bbx-error', style: { background: t.errorBg, border: '1px solid ' + t.errorBorder, color: t.errorText } });

    // Result area
    var resultDiv = el('div', { class: 'bbx-result' });
    this._resultDiv = resultDiv;

    // Assemble form section
    inner.appendChild(logo);
    inner.appendChild(heading);
    inner.appendChild(sub);
    inner.appendChild(formRow);
    inner.appendChild(errorDiv);
    inner.appendChild(resultDiv);
    widget.appendChild(inner);

    // Powered by footer
    var footer = el('div', {
      class: 'bbx-powered',
      style: { color: t.textDim, borderColor: t.border },
    });
    footer.innerHTML = 'Powered by <a href="https://black-box-fd.vercel.app" target="_blank" rel="noopener" style="color:' + t.accent + '">BlackBox Logistics</a>';
    widget.appendChild(footer);

    this.container.innerHTML = '';
    this.container.appendChild(widget);
    this._input = input;
    this._errorDiv = errorDiv;
    this._trackBtn = trackBtn;
    this._btnLabel = btnLabel;

    // Event listeners
    trackBtn.addEventListener('click', function () { self._track(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') self._track(); });

    // Auto-track if prefilled
    if (this.prefill) {
      setTimeout(function () { self._track(); }, 120);
    }
  };

  BlackBoxTracker.prototype._setLoading = function (on) {
    var t = this.t;
    this._trackBtn.disabled = on;
    this._input.disabled = on;
    this._btnLabel.textContent = on ? 'Tracking…' : 'Track';
    var spinner = this._trackBtn.querySelector('.bbx-spinner');
    if (on && !spinner) {
      var s = el('span', { class: 'bbx-spinner' + (this.theme === 'light' ? '' : '') });
      s.style.borderTopColor = this.t.accentText;
      s.style.borderColor = this.t.accentText + '33';
      this._trackBtn.insertBefore(s, this._trackBtn.firstChild);
    } else if (!on && spinner) {
      spinner.remove();
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
    if (!id) {
      this._showError('Please enter a tracking ID.');
      return;
    }
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
    var divider = el('div', { class: 'bbx-divider', style: { background: t.border } });
    result.appendChild(divider);

    // Header row: tracking ID + status badge
    var header = el('div', { class: 'bbx-result-header' });
    var headerLeft = el('div');
    var tidLabel = el('div', { class: 'bbx-tid-label', style: { color: t.textDim } }, 'Tracking ID');
    var tid = el('div', { class: 'bbx-tid', style: { color: t.accent } }, esc(d.id));
    if (d.is_express) {
      var exp = el('span', { class: 'bbx-express' }, ICONS.bolt + ' Express');
      tid.appendChild(exp);
    }
    headerLeft.appendChild(tidLabel);
    headerLeft.appendChild(tid);

    var badge = el('div', {
      class: 'bbx-badge',
      style: {
        background: statusColor + '1A',
        color: statusColor,
        border: '1px solid ' + statusColor + '40',
      },
    }, esc(STATUS_LABELS[d.status] || d.status));

    header.appendChild(headerLeft);
    header.appendChild(badge);
    result.appendChild(header);

    // Progress bar (not shown if cancelled)
    if (!isCancelled) {
      var progressWrap = el('div', { class: 'bbx-progress-wrap', style: { background: t.surface, border: '1px solid ' + t.border } });
      var stepsWrap = el('div', { class: 'bbx-progress-steps' });

      STATUS_ORDER.forEach(function (s, i) {
        var reached = statusIdx >= i;
        var isActive = statusIdx === i;
        var sColor = reached ? statusColor : t.progressTrack;
        var dotBg = reached ? statusColor : 'transparent';

        var step = el('div', { class: 'bbx-step' });
        var dot = el('div', { class: 'bbx-step-dot', style: { borderColor: sColor, background: dotBg } });
        if (isActive) {
          dot.style.boxShadow = '0 0 0 3px ' + statusColor + '33';
          dot.style.transform = 'scale(1.2)';
        }

        var labelEl = el('div', { class: 'bbx-step-label', style: { color: reached ? t.text : t.textDim } },
          STATUS_LABELS[s].replace(' ', '<br>'));

        step.appendChild(dot);
        step.appendChild(labelEl);
        stepsWrap.appendChild(step);

        if (i < STATUS_ORDER.length - 1) {
          var line = el('div', { class: 'bbx-step-line', style: { background: statusIdx > i ? statusColor : t.progressTrack } });
          stepsWrap.insertBefore(line, step);
          step.style.flexDirection = 'column';
          // Re-structure: line is between dots, not inside step
          // Fix: steps wrap as flex row with alternating dot + line
        }
      });

      // Rebuild cleaner: flat flex row with dots and lines
      stepsWrap.innerHTML = '';
      STATUS_ORDER.forEach(function (s, i) {
        var reached = statusIdx >= i;
        var isActive = statusIdx === i;
        var sColor = reached ? statusColor : t.progressTrack;

        var dot = el('div', { class: 'bbx-step-dot', style: { borderColor: sColor, background: reached ? statusColor : 'transparent' } });
        if (isActive) { dot.style.boxShadow = '0 0 0 3px ' + statusColor + '33'; dot.style.transform = 'scale(1.15)'; }

        var label = el('div', { class: 'bbx-step-label', style: { color: reached ? t.text : t.textDim } },
          STATUS_LABELS[s].replace(' ', '<br>'));

        var stepEl = el('div', { class: 'bbx-step' });
        stepEl.appendChild(dot);
        stepEl.appendChild(label);
        stepsWrap.appendChild(stepEl);

        if (i < STATUS_ORDER.length - 1) {
          var line = el('div', { style: { flex: '1', height: '2px', background: statusIdx > i ? statusColor : t.progressTrack, alignSelf: 'flex-start', marginTop: '5px', transition: 'background .3s' } });
          stepsWrap.appendChild(line);
        }
      });
      stepsWrap.style.display = 'flex';
      stepsWrap.style.alignItems = 'flex-start';

      progressWrap.appendChild(stepsWrap);
      result.appendChild(progressWrap);
    }

    // Info cards
    var cards = el('div', { class: 'bbx-cards' });
    var cardDefs = [
      { label: 'From', value: esc(d.sender_name), sub: esc(d.pickup_area), icon: ICONS.user, iconColor: '#3b82f6' },
      { label: 'To', value: esc(d.recipient_name), sub: esc(d.dropoff_area), icon: ICONS.pin, iconColor: '#f97316' },
      { label: 'Rider', value: esc(d.rider_name || 'Not yet assigned'), icon: ICONS.bike, iconColor: '#8b5cf6' },
    ];
    if (d.pickup_date) {
      cardDefs.push({ label: 'Pickup Date', value: fmtDate(d.pickup_date), icon: ICONS.cal, iconColor: '#22c55e' });
    }
    if (d.package_description) {
      cardDefs.push({ label: 'Package', value: esc(d.package_description), icon: ICONS.pkg, iconColor: '#f59e0b' });
    }

    cardDefs.forEach(function (c) {
      var card = el('div', { class: 'bbx-card', style: { background: t.surface, borderColor: t.border } });
      var iconWrap = el('div', { class: 'bbx-card-icon', style: { background: c.iconColor + '1A', color: c.iconColor } }, c.icon);
      var cardBody = el('div', { style: { minWidth: '0', flex: '1' } });
      var cardLabel = el('div', { class: 'bbx-card-label', style: { color: t.textDim } }, c.label);
      var cardValue = el('div', { class: 'bbx-card-value', style: { color: t.text } });
      cardValue.textContent = c.value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      cardBody.appendChild(cardLabel);
      cardBody.appendChild(cardValue);
      if (c.sub) {
        var cardSub = el('div', { class: 'bbx-card-sub', style: { color: t.textMuted } });
        cardSub.textContent = c.sub.replace(/&amp;/g, '&');
        cardBody.appendChild(cardSub);
      }
      card.appendChild(iconWrap);
      card.appendChild(cardBody);
      cards.appendChild(card);
    });
    result.appendChild(cards);

    // Timeline
    if (d.history && d.history.length > 0) {
      var timelineDivider = el('div', { class: 'bbx-divider', style: { background: t.border } });
      result.appendChild(timelineDivider);

      var tlHead = el('div', { class: 'bbx-timeline-head', style: { color: t.textDim } }, 'Delivery History');
      result.appendChild(tlHead);

      var events = el('div', { class: 'bbx-events' });
      d.history.forEach(function (h, i) {
        var hColor = STATUS_COLORS[h.status] || t.textMuted;
        var evnt = el('div', { class: 'bbx-event' });
        var left = el('div', { class: 'bbx-event-left' });
        var dot = el('div', { class: 'bbx-event-dot', style: { background: hColor } });
        var line = el('div', { class: 'bbx-event-line', style: { background: t.border } });
        left.appendChild(dot);
        left.appendChild(line);

        var body = el('div', { class: 'bbx-event-body' });
        var evStatus = el('div', { class: 'bbx-event-status', style: { color: t.text } },
          STATUS_LABELS[h.status] || esc(h.status));
        body.appendChild(evStatus);
        if (h.note) {
          var note = el('div', { class: 'bbx-event-note', style: { color: t.textMuted } }, esc(h.note));
          body.appendChild(note);
        }
        var ts = el('div', { class: 'bbx-event-time', style: { color: t.textDim } }, fmtTime(h.timestamp));
        body.appendChild(ts);

        evnt.appendChild(left);
        evnt.appendChild(body);
        events.appendChild(evnt);
      });
      result.appendChild(events);
    }

    // Action buttons
    var actions = el('div', { class: 'bbx-actions' });

    var resetBtn = el('button', {
      class: 'bbx-btn bbx-btn-ghost',
      type: 'button',
      style: { color: t.textMuted, borderColor: t.border, background: 'transparent' },
    });
    resetBtn.innerHTML = ICONS.refresh + '<span>Track another</span>';
    resetBtn.addEventListener('click', function () {
      self._resultDiv.style.display = 'none';
      self._input.value = '';
      self._input.disabled = false;
      self._input.focus();
    });

    var viewBtn = el('button', {
      class: 'bbx-btn bbx-btn-ghost',
      type: 'button',
      style: { color: t.accent, borderColor: t.accent + '60', background: 'transparent' },
    });
    viewBtn.innerHTML = ICONS.share + '<span>Full details</span>';
    viewBtn.addEventListener('click', function () {
      window.open(APP_TRACK + '/' + encodeURIComponent(d.id), '_blank', 'noopener');
    });

    actions.appendChild(resetBtn);
    actions.appendChild(viewBtn);
    result.appendChild(actions);

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
