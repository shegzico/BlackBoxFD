/**
 * BlackBox Logistics — Package Tracking Widget v2
 *
 * EMBED:
 *   <div id="blackbox-tracker"></div>
 *   <script src="https://black-box-fd.vercel.app/blackbox-tracker.js"></script>
 *
 * DATA ATTRIBUTES (all optional):
 *   data-theme="dark|light"            Result panel theme          (default: dark)
 *   data-heading="Track your parcel"   Custom heading text         (default: "Track your package")
 *   data-show-heading="false"          Hide the heading            (default: true)
 *   data-sub="Enter tracking ID..."    Custom sub-text             (default: built-in text)
 *   data-show-sub="false"              Hide the sub-text           (default: true)
 *   data-btn-position="below|beside"   Button placement            (default: below)
 *   data-prefill="BB-XXXXXX"           Pre-fill + auto-track
 *
 * INPUT & BUTTON STYLING:
 *   The input and button inherit your site's styles by default.
 *   Override via CSS on the container if needed:
 *     #blackbox-tracker input { ... }
 *     #blackbox-tracker button { ... }
 */
(function () {
  'use strict';

  var API_BASE  = 'https://black-box-fd.vercel.app/api/public/track';
  var APP_TRACK = 'https://black-box-fd.vercel.app/track';

  // ── Status config ────────────────────────────────────────────
  var STATUS_ORDER  = ['pending','assigned','picked_up','in_transit','delivered','confirmed'];
  var STATUS_LABELS = {
    pending:'Pending', assigned:'Assigned', picked_up:'Picked Up',
    in_transit:'In Transit', delivered:'Delivered', confirmed:'Confirmed', cancelled:'Cancelled',
  };
  var STATUS_BADGE_COLORS = {
    pending:   { bg:'rgba(245,158,11,.12)', border:'rgba(245,158,11,.3)', text:'#f59e0b' },
    assigned:  { bg:'rgba(59,130,246,.12)', border:'rgba(59,130,246,.3)', text:'#3b82f6' },
    picked_up: { bg:'rgba(139,92,246,.12)', border:'rgba(139,92,246,.3)', text:'#8b5cf6' },
    in_transit:{ bg:'rgba(249,115,22,.12)', border:'rgba(249,115,22,.3)', text:'#f97316' },
    delivered: { bg:'rgba(34,197,94,.12)',  border:'rgba(34,197,94,.3)',  text:'#22c55e' },
    confirmed: { bg:'rgba(242,255,102,.12)',border:'rgba(242,255,102,.3)',text:'#c8d400' },
    cancelled: { bg:'rgba(239,68,68,.12)',  border:'rgba(239,68,68,.3)',  text:'#ef4444' },
  };

  // ── Themes (result panel only — form inherits site styles) ───
  var THEMES = {
    dark: {
      panel:       '#111111',
      panelBorder: '#2A2A2A',
      text:        '#FAFAFA',
      textMuted:   '#888888',
      textDim:     '#444444',
      iconBg:      'rgba(255,255,255,0.07)',
      iconColor:   'rgba(255,255,255,0.75)',
      progressDone:'#FAFAFA',
      progressLine:'#3A3A3A',
      progressLineDone:'#888888',
      divider:     '#1E1E1E',
      timelineBtn: 'rgba(255,255,255,0.06)',
      timelineBtnText: '#888888',
    },
    light: {
      panel:       '#f9fafb',
      panelBorder: '#e5e7eb',
      text:        '#111827',
      textMuted:   '#6b7280',
      textDim:     '#9ca3af',
      iconBg:      'rgba(0,0,0,0.05)',
      iconColor:   'rgba(0,0,0,0.55)',
      progressDone:'#111827',
      progressLine:'#e5e7eb',
      progressLineDone:'#9ca3af',
      divider:     '#f0f0f0',
      timelineBtn: 'rgba(0,0,0,0.04)',
      timelineBtnText: '#6b7280',
    },
  };

  // ── Helpers ──────────────────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function(k) {
      if (k === 'style') Object.assign(e.style, attrs[k]);
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function attr(el, name, fallback) {
    var v = el.getAttribute(name);
    return (v !== null && v !== '') ? v : fallback;
  }
  function boolAttr(el, name, def) {
    var v = el.getAttribute(name);
    if (v === null) return def;
    return v !== 'false' && v !== '0';
  }

  // ── SVG icons ────────────────────────────────────────────────
  var ICONS = {
    check: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    user:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    pin:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    bike:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-3l-2 5.5 3 2.5 2-3h3"/><path d="M5.5 17.5L9 11l3 3"/></svg>',
    box:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    cal:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    bolt:  '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    ext:   '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  };

  // ── CSS ──────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('bbx-styles-v2')) return;
    var css = [
      /* Scoped reset */
      '.bbx *{box-sizing:border-box;}',

      /* Form area — NO styling, inherit from page */
      '.bbx-form{}',
      '.bbx-field-wrap-below{display:flex;flex-direction:column;gap:8px;}',
      '.bbx-field-wrap-beside{display:flex;flex-direction:row;gap:8px;align-items:stretch;}',
      '.bbx-field-wrap-beside .bbx-search-input{flex:1;}',

      /* The only opinionated form style: minor focus ring on the input */
      '.bbx-search-input{width:100%;}',

      /* Error */
      '.bbx-err{display:none;font-size:13px;padding:9px 12px;border-radius:8px;margin-top:8px;border:1px solid;}',

      /* Result panel */
      '.bbx-panel{border-radius:14px;overflow:hidden;margin-top:16px;display:none;border:1px solid;}',
      '.bbx-panel-inner{padding:20px;}',

      /* Result header */
      '.bbx-rhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;}',
      '.bbx-tid-label{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;margin-bottom:3px;}',
      '.bbx-tid{font-family:ui-monospace,monospace;font-size:16px;font-weight:700;letter-spacing:1.5px;display:flex;align-items:center;gap:6px;}',
      '.bbx-express{display:inline-flex;align-items:center;gap:3px;background:#F2FF66;color:#0A0A0A;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;}',
      '.bbx-badge{display:inline-flex;align-items:center;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;border:1px solid;white-space:nowrap;}',

      /* Progress bar */
      '.bbx-progress{display:flex;align-items:flex-start;gap:0;margin-bottom:16px;overflow-x:auto;padding-bottom:4px;}',
      '.bbx-ps{display:flex;flex-direction:column;align-items:center;min-width:52px;}',
      '.bbx-ps-dot{width:22px;height:22px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;flex-shrink:0;}',
      '.bbx-ps-label{font-size:8.5px;font-weight:600;letter-spacing:.2px;text-align:center;margin-top:5px;line-height:1.3;}',
      '.bbx-pl{flex:1;height:2px;margin-top:10px;min-width:8px;}',

      /* Info cards */
      '.bbx-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;}',
      '@media(max-width:340px){.bbx-cards{grid-template-columns:1fr;}}',
      '.bbx-card{border-radius:10px;padding:11px 12px;display:flex;align-items:flex-start;gap:10px;}',
      '.bbx-card-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.bbx-card-lbl{font-size:9.5px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;}',
      '.bbx-card-val{font-size:12.5px;font-weight:600;line-height:1.3;}',
      '.bbx-card-sub{font-size:11px;margin-top:1px;}',

      /* Divider */
      '.bbx-div{height:1px;margin:14px 0;}',

      /* Timeline toggle */
      '.bbx-tl-btn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.3px;gap:6px;font-family:inherit;}',
      '.bbx-tl-btn-inner{display:flex;align-items:center;gap:6px;}',
      '.bbx-tl-chev{transition:transform .25s;display:flex;align-items:center;}',
      '.bbx-tl-chev.open{transform:rotate(180deg);}',

      /* Timeline events */
      '.bbx-tl-events{display:none;padding-top:12px;}',
      '.bbx-event{display:flex;gap:10px;}',
      '.bbx-ev-track{display:flex;flex-direction:column;align-items:center;width:14px;flex-shrink:0;}',
      '.bbx-ev-dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;}',
      '.bbx-ev-line{width:1.5px;flex:1;margin:3px 0;min-height:10px;}',
      '.bbx-event:last-child .bbx-ev-line{display:none;}',
      '.bbx-ev-body{padding-bottom:12px;}',
      '.bbx-ev-status{font-size:12px;font-weight:600;}',
      '.bbx-ev-note{font-size:11px;margin-top:2px;}',
      '.bbx-ev-time{font-size:10px;margin-top:3px;}',

      /* Action buttons row */
      '.bbx-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}',
      '.bbx-act-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid;background:transparent;font-family:inherit;letter-spacing:.2px;}',

      /* Spinner */
      '@keyframes bbx-spin{to{transform:rotate(360deg)}}',
      '.bbx-spin{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:bbx-spin .65s linear infinite;opacity:.6;}',

      /* Heading */
      '.bbx-heading{font-size:20px;font-weight:700;margin-bottom:4px;line-height:1.25;}',
      '.bbx-sub{font-size:13px;margin-bottom:14px;}',
    ].join('');

    var s = document.createElement('style');
    s.id = 'bbx-styles-v2';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Widget ───────────────────────────────────────────────────
  function Tracker(container) {
    this.c       = container;
    this.theme   = (attr(container,'data-theme','dark') === 'light') ? 'light' : 'dark';
    this.t       = THEMES[this.theme];
    this.prefill = attr(container,'data-prefill','');
    this.btnPos  = (attr(container,'data-btn-position','below') === 'beside') ? 'beside' : 'below';

    // Heading / sub toggles
    this.showHeading = boolAttr(container,'data-show-heading', true);
    this.showSub     = boolAttr(container,'data-show-sub', true);
    this.headingText = attr(container,'data-heading','Track your package');
    this.subText     = attr(container,'data-sub','Enter your BlackBox tracking ID to see real-time status.');

    this._build();
  }

  Tracker.prototype._build = function() {
    var self = this, t = this.t;

    var wrap = el('div',{ class:'bbx' });

    // Optional heading / sub
    if (this.showHeading) {
      var h = el('div',{ class:'bbx-heading' }, this.headingText);
      wrap.appendChild(h);
      this._headingEl = h;
    }
    if (this.showSub) {
      var s = el('div',{ class:'bbx-sub' }, this.subText);
      wrap.appendChild(s);
      this._subEl = s;
    }

    // Form
    var form = el('div',{ class:'bbx-form' });
    var fieldWrap = el('div',{ class: this.btnPos === 'beside' ? 'bbx-field-wrap-beside' : 'bbx-field-wrap-below' });

    var input = el('input',{
      class:'bbx-search-input',
      type:'text',
      placeholder:'e.g. BB-A1B2C3',
      maxlength:'20',
      autocomplete:'off',
      spellcheck:'false',
    });
    if (this.prefill) input.value = this.prefill.toUpperCase();

    input.addEventListener('input', function() {
      input.value = input.value.toUpperCase();
      if (self._errEl) self._errEl.style.display = 'none';
    });
    input.addEventListener('keydown', function(e) { if (e.key==='Enter') self._track(); });

    var btn = el('button',{ type:'button' });
    btn.textContent = 'Track';
    btn.addEventListener('click', function(){ self._track(); });

    fieldWrap.appendChild(input);
    fieldWrap.appendChild(btn);

    var errEl = el('div',{ class:'bbx-err' });
    errEl.style.display = 'none';

    form.appendChild(fieldWrap);
    form.appendChild(errEl);
    wrap.appendChild(form);

    // Result panel
    var panel = el('div',{ class:'bbx-panel', style:{ background:t.panel, borderColor:t.panelBorder, display:'none' }});
    var panelInner = el('div',{ class:'bbx-panel-inner' });
    panel.appendChild(panelInner);
    wrap.appendChild(panel);

    this.c.innerHTML = '';
    this.c.appendChild(wrap);

    this._input    = input;
    this._btn      = btn;
    this._errEl    = errEl;
    this._panel    = panel;
    this._panelInner = panelInner;

    if (this.prefill) setTimeout(function(){ self._track(); }, 150);
  };

  Tracker.prototype._setLoading = function(on) {
    this._btn.disabled  = on;
    this._input.disabled = on;
    var existing = this._btn.querySelector('.bbx-spin');
    if (on && !existing) {
      var sp = el('span',{ class:'bbx-spin' });
      this._btn.insertBefore(sp, this._btn.firstChild);
      this._btn.appendChild(document.createTextNode(' Tracking…'));
    } else if (!on) {
      if (existing) existing.remove();
      // restore original text
      var textNodes = Array.from(this._btn.childNodes).filter(function(n){ return n.nodeType===3; });
      textNodes.forEach(function(n){ n.remove(); });
      this._btn.textContent = 'Track';
    }
  };

  Tracker.prototype._showErr = function(msg) {
    var e = this._errEl;
    e.textContent = msg;
    e.style.display  = 'block';
    e.style.background = 'rgba(239,68,68,.08)';
    e.style.borderColor = 'rgba(239,68,68,.3)';
    e.style.color = '#ef4444';
    this._panel.style.display = 'none';
  };

  Tracker.prototype._track = function() {
    var self = this;
    var id = (this._input.value || '').trim().toUpperCase();
    if (!id) { this._showErr('Please enter a tracking ID.'); return; }
    if (!/^BB-[A-Z0-9]{4,10}$/.test(id)) {
      this._showErr('Invalid format — tracking IDs look like BB-A1B2C3.'); return;
    }
    this._setLoading(true);
    if (this._errEl) this._errEl.style.display = 'none';
    this._panel.style.display = 'none';

    fetch(API_BASE + '/' + encodeURIComponent(id))
      .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, data:d}; }); })
      .then(function(r) {
        self._setLoading(false);
        if (!r.ok) {
          self._showErr(r.data.error === 'Delivery not found'
            ? 'No delivery found with that ID. Please check and try again.'
            : 'Something went wrong. Please try again.');
          return;
        }
        self._render(r.data.tracking);
      })
      .catch(function() {
        self._setLoading(false);
        self._showErr('Network error. Please check your connection.');
      });
  };

  Tracker.prototype._render = function(d) {
    var self = this, t = this.t;
    var inner = this._panelInner;
    inner.innerHTML = '';

    var status     = d.status || 'pending';
    var bc         = STATUS_BADGE_COLORS[status] || STATUS_BADGE_COLORS.pending;
    var statusIdx  = STATUS_ORDER.indexOf(status);
    var isCancelled = status === 'cancelled';

    // ── Header ──
    var rhead = el('div',{ class:'bbx-rhead' });
    var rLeft = el('div');
    var tidLabel = el('div',{ class:'bbx-tid-label', style:{ color:t.textMuted }}, 'Tracking ID');
    var tid = el('div',{ class:'bbx-tid', style:{ color:t.text }});
    tid.appendChild(document.createTextNode(d.id));
    if (d.is_express) {
      var exp = el('span',{ class:'bbx-express' }, ICONS.bolt + ' Express');
      tid.appendChild(exp);
    }
    rLeft.appendChild(tidLabel);
    rLeft.appendChild(tid);

    var badge = el('div',{ class:'bbx-badge', style:{ background:bc.bg, borderColor:bc.border, color:bc.text }},
      STATUS_LABELS[status] || status);

    rhead.appendChild(rLeft);
    rhead.appendChild(badge);
    inner.appendChild(rhead);

    // ── Progress bar (hidden for cancelled) ──
    if (!isCancelled) {
      var progressWrap = el('div',{ class:'bbx-progress' });

      STATUS_ORDER.forEach(function(s, i) {
        var isDone    = statusIdx > i;
        var isCurrent = statusIdx === i;
        var dotColor  = isDone ? t.progressDone : (isCurrent ? t.text : 'transparent');
        var dotBorder = (isDone || isCurrent) ? t.progressDone : t.progressLine;
        var iconColor = (isDone || isCurrent) ? (isDone ? t.panel : t.text) : t.progressLine;

        // Step
        var step = el('div',{ class:'bbx-ps' });
        var dot  = el('div',{ class:'bbx-ps-dot', style:{
          background: dotColor,
          borderColor: dotBorder,
          color: iconColor,
        }});
        // Checkmark for done, circle for current, nothing for future
        if (isDone) dot.innerHTML = ICONS.check;

        var lbl = el('div',{ class:'bbx-ps-label', style:{
          color: (isDone || isCurrent) ? t.text : t.textDim,
        }}, STATUS_LABELS[s].replace(' ','<br>'));

        step.appendChild(dot);
        step.appendChild(lbl);

        // Line before this step (between steps)
        if (i > 0) {
          var line = el('div',{ class:'bbx-pl', style:{
            background: statusIdx >= i ? t.progressLineDone : t.progressLine,
          }});
          progressWrap.appendChild(line);
        }
        progressWrap.appendChild(step);
      });

      inner.appendChild(progressWrap);
    }

    // ── Info cards ──
    var cardDefs = [
      { label:'Sender',   value: d.sender_name,           sub: d.pickup_area,  icon: ICONS.user },
      { label:'Recipient',value: d.recipient_name,         sub: d.dropoff_area, icon: ICONS.pin  },
      { label:'Rider',    value: d.rider_name || 'Not yet assigned',            icon: ICONS.bike },
    ];
    if (d.pickup_date)         cardDefs.push({ label:'Pickup date',  value: fmtDate(d.pickup_date),  icon: ICONS.cal });
    if (d.package_description) cardDefs.push({ label:'Package',      value: d.package_description,   icon: ICONS.box });

    var cards = el('div',{ class:'bbx-cards' });
    cardDefs.forEach(function(c) {
      var card = el('div',{ class:'bbx-card' });
      var iconWrap = el('div',{ class:'bbx-card-icon', style:{ background: t.iconBg, color: t.iconColor }}, c.icon);
      var body = el('div',{ style:{ minWidth:'0', flex:'1' }});
      var lbl  = el('div',{ class:'bbx-card-lbl', style:{ color: t.textMuted }}, c.label);
      var val  = el('div',{ class:'bbx-card-val', style:{ color: t.text }});
      val.textContent = c.value || '—';
      body.appendChild(lbl);
      body.appendChild(val);
      if (c.sub) {
        var sub = el('div',{ class:'bbx-card-sub', style:{ color: t.textMuted }});
        sub.textContent = c.sub;
        body.appendChild(sub);
      }
      card.appendChild(iconWrap);
      card.appendChild(body);
      cards.appendChild(card);
    });
    inner.appendChild(cards);

    // ── Timeline (collapsed) ──
    if (d.history && d.history.length > 0) {
      var tlDiv = el('div',{ class:'bbx-div', style:{ background: t.divider }});
      inner.appendChild(tlDiv);

      // Toggle button
      var tlBtn = el('button',{ class:'bbx-tl-btn', type:'button',
        style:{ background: t.timelineBtn, color: t.timelineBtnText, border:'none' }});
      var tlBtnInner = el('span',{ class:'bbx-tl-btn-inner' });
      tlBtnInner.innerHTML = '<span style="font-size:10px;opacity:.6">🕐</span>';
      tlBtnInner.appendChild(document.createTextNode(' Delivery history (' + d.history.length + ')'));
      var tlChev = el('span',{ class:'bbx-tl-chev' }, ICONS.chevron);
      tlBtn.appendChild(tlBtnInner);
      tlBtn.appendChild(tlChev);
      inner.appendChild(tlBtn);

      // Events container (hidden by default)
      var tlEvents = el('div',{ class:'bbx-tl-events' });
      d.history.forEach(function(h) {
        var hc = STATUS_BADGE_COLORS[h.status] || { text: t.textMuted };
        var ev = el('div',{ class:'bbx-event' });
        var track = el('div',{ class:'bbx-ev-track' });
        var dot   = el('div',{ class:'bbx-ev-dot', style:{ background: hc.text }});
        var line  = el('div',{ class:'bbx-ev-line', style:{ background: t.progressLine }});
        track.appendChild(dot);
        track.appendChild(line);
        var body = el('div',{ class:'bbx-ev-body' });
        var evStatus = el('div',{ class:'bbx-ev-status', style:{ color: t.text }},
          STATUS_LABELS[h.status] || h.status);
        body.appendChild(evStatus);
        if (h.note) {
          var note = el('div',{ class:'bbx-ev-note', style:{ color: t.textMuted }});
          note.textContent = h.note;
          body.appendChild(note);
        }
        var ts = el('div',{ class:'bbx-ev-time', style:{ color: t.textDim }}, fmtDateTime(h.timestamp));
        body.appendChild(ts);
        ev.appendChild(track);
        ev.appendChild(body);
        tlEvents.appendChild(ev);
      });
      inner.appendChild(tlEvents);

      var tlOpen = false;
      tlBtn.addEventListener('click', function() {
        tlOpen = !tlOpen;
        tlEvents.style.display = tlOpen ? 'block' : 'none';
        tlChev.classList.toggle('open', tlOpen);
      });
    }

    // ── Action buttons ──
    var actions = el('div',{ class:'bbx-actions' });

    var resetBtn = el('button',{ class:'bbx-act-btn', type:'button',
      style:{ color: t.textMuted, borderColor: t.panelBorder }});
    resetBtn.textContent = '← Track another';
    resetBtn.addEventListener('click', function() {
      self._panel.style.display = 'none';
      self._input.value = '';
      self._input.disabled = false;
      self._input.focus();
    });

    var viewBtn = el('button',{ class:'bbx-act-btn', type:'button',
      style:{ color: t.textMuted, borderColor: t.panelBorder }});
    viewBtn.innerHTML = ICONS.ext + '<span> Full details</span>';
    viewBtn.addEventListener('click', function() {
      window.open(APP_TRACK + '/' + encodeURIComponent(d.id), '_blank', 'noopener');
    });

    actions.appendChild(resetBtn);
    actions.appendChild(viewBtn);
    inner.appendChild(actions);

    // Show panel
    this._panel.style.display = 'block';
  };

  // ── Boot ─────────────────────────────────────────────────────
  function init() {
    injectCSS();
    var nodes = document.querySelectorAll('#blackbox-tracker, .blackbox-tracker');
    for (var i = 0; i < nodes.length; i++) new Tracker(nodes[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
