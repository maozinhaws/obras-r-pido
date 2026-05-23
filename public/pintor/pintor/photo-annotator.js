(function (global) {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────
  const COLORS = ['#EF4444','#FACC15','#3B82F6','#22C55E','#F97316','#A855F7','#FFFFFF','#111111'];
  const PEN_WIDTHS    = [{ v: 2, label: 'Fino' }, { v: 5, label: 'Médio' }, { v: 11, label: 'Grosso' }];
  const ERASER_WIDTHS = [{ v: 12, label: 'Fino' }, { v: 28, label: 'Médio' }, { v: 56, label: 'Grosso' }];
  const HANDLE_R = 10; // selection handle radius px (canvas coords)

  const SVG = {
    select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-7 1-4 7z"/></svg>`,
    pen:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
    eraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
    arrow:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
    text:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`,
    undo:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
    trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>`,
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  const S = {
    tool: 'pen', color: '#EF4444', penW: 5, eraserW: 28,
    drawing: false, startX: 0, startY: 0,
    objects: [],           // vector objects: arrows + circles
    selId: null,           // selected object id
    dragRole: null,        // 'move' | 'p1' | 'p2'
    dragOX: 0, dragOY: 0, // drag origin
    tempObj: null,         // rubber-band preview
    undoStack: [],         // [{ strokesSnap: ImageData, objects: [...] }]
    onSave: null, onCancel: null,
  };

  let _els = {};
  let _built = false;
  let _uid = 0;
  const uid = () => ++_uid;

  // ─── Coordinate mapping ──────────────────────────────────────────────────────
  function pt(e, canvas) {
    const src = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    const r = canvas.getBoundingClientRect();
    return {
      x: (src.clientX - r.left) * (canvas.width  / r.width),
      y: (src.clientY - r.top)  * (canvas.height / r.height),
    };
  }

  // ─── Canvas setup ────────────────────────────────────────────────────────────
  function setupCanvases(dataUrl) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const wrap = _els.wrap;
        const scale = Math.min(wrap.clientWidth / img.naturalWidth, wrap.clientHeight / img.naturalHeight, 1);
        const dW = Math.round(img.naturalWidth  * scale);
        const dH = Math.round(img.naturalHeight * scale);

        [_els.photoC, _els.strokesC, _els.objC].forEach(c => {
          c.width  = img.naturalWidth;
          c.height = img.naturalHeight;
          c.style.width  = dW + 'px';
          c.style.height = dH + 'px';
        });

        _els.photoC.getContext('2d').drawImage(img, 0, 0);
        _els.strokesC.getContext('2d').clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        _els.objC.getContext('2d').clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        res();
      };
      img.src = dataUrl;
    });
  }

  // ─── Object rendering ────────────────────────────────────────────────────────
  function renderObjects(list) {
    list = list || S.objects;
    const ctx = _els.objC.getContext('2d');
    ctx.clearRect(0, 0, _els.objC.width, _els.objC.height);

    for (const o of list) {
      ctx.strokeStyle = o.color;
      ctx.fillStyle   = o.color;
      ctx.lineWidth   = o.w;
      ctx.lineCap = ctx.lineJoin = 'round';

      if (o.type === 'arrow')  drawArrow(ctx, o);
      if (o.type === 'circle') drawCircle(ctx, o);

      if (o.id === S.selId) drawHandles(ctx, o);
    }
  }

  function drawArrow(ctx, o) {
    const head = Math.max(o.w * 4, 14);
    const angle = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
    ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(o.x2, o.y2);
    ctx.lineTo(o.x2 - head * Math.cos(angle - Math.PI / 6), o.y2 - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(o.x2 - head * Math.cos(angle + Math.PI / 6), o.y2 - head * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  }

  function drawCircle(ctx, o) {
    const rx = Math.abs(o.x2 - o.x1) / 2, ry = Math.abs(o.y2 - o.y1) / 2;
    ctx.beginPath();
    ctx.ellipse((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHandles(ctx, o) {
    ctx.save();
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#2563EB'; ctx.lineWidth = 2;
    for (const h of getHandles(o)) {
      ctx.beginPath(); ctx.arc(h.x, h.y, HANDLE_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function getHandles(o) {
    return [
      { x: o.x1, y: o.y1, role: 'p1' },
      { x: o.x2, y: o.y2, role: 'p2' },
      { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2, role: 'move' },
    ];
  }

  // ─── Hit testing ─────────────────────────────────────────────────────────────
  function hitObject(x, y) {
    for (let i = S.objects.length - 1; i >= 0; i--) {
      if (hitTest(S.objects[i], x, y)) return S.objects[i];
    }
    return null;
  }

  function hitTest(o, x, y) {
    const thr = Math.max(o.w + 10, 18);
    if (o.type === 'arrow') return distSeg(x, y, o.x1, o.y1, o.x2, o.y2) < thr;
    if (o.type === 'circle') {
      const rx = Math.abs(o.x2 - o.x1) / 2, ry = Math.abs(o.y2 - o.y1) / 2;
      if (rx < 1 || ry < 1) return false;
      const nx = (x - (o.x1 + o.x2) / 2) / rx;
      const ny = (y - (o.y1 + o.y2) / 2) / ry;
      return Math.abs(Math.sqrt(nx * nx + ny * ny) - 1) * Math.min(rx, ry) < thr;
    }
    return false;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    if (!len2) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }

  // ─── Undo ────────────────────────────────────────────────────────────────────
  function pushUndo() {
    const c = _els.strokesC;
    S.undoStack.push({
      strokesSnap: c.getContext('2d').getImageData(0, 0, c.width, c.height),
      objects: S.objects.map(o => ({ ...o })),
    });
    if (S.undoStack.length > 25) S.undoStack.shift();
    syncUndoBtn();
  }

  function undo() {
    if (!S.undoStack.length) return;
    const snap = S.undoStack.pop();
    _els.strokesC.getContext('2d').putImageData(snap.strokesSnap, 0, 0);
    S.objects = snap.objects;
    S.selId   = null;
    renderObjects();
    syncUndoBtn();
    syncDeleteBtn();
  }

  function syncUndoBtn()   { _els.undoBtn.disabled = S.undoStack.length === 0; }
  function syncDeleteBtn() { _els.deleteBtn.style.display = (S.tool === 'select' && S.selId) ? 'flex' : 'none'; }

  // ─── Canvas pointer events ───────────────────────────────────────────────────
  function bindCanvasEvents() {
    const top = _els.objC;

    top.addEventListener('mousedown',  onStart);
    top.addEventListener('mousemove',  onMove);
    top.addEventListener('mouseup',    onEnd);
    top.addEventListener('touchstart', onStart, { passive: false });
    top.addEventListener('touchmove',  onMove,  { passive: false });
    top.addEventListener('touchend',   onEnd,   { passive: false });

    document.addEventListener('keydown', e => {
      if (!_els.overlay || _els.overlay.style.display === 'none') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.selId) deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo();
    });
  }

  function onStart(e) {
    e.preventDefault();
    const p = pt(e, _els.objC);

    if (S.tool === 'text') { handleText(e, p); return; }

    if (S.tool === 'select') {
      // Check handles of selected object first
      if (S.selId) {
        const sel = S.objects.find(o => o.id === S.selId);
        if (sel) {
          for (const h of getHandles(sel)) {
            if (Math.hypot(p.x - h.x, p.y - h.y) <= HANDLE_R + 4) {
              S.drawing = true; S.dragRole = h.role;
              S.dragOX = p.x;  S.dragOY = p.y;
              return;
            }
          }
        }
      }
      const hit = hitObject(p.x, p.y);
      S.selId = hit ? hit.id : null;
      S.drawing = !!hit;
      S.dragRole = 'move'; S.dragOX = p.x; S.dragOY = p.y;
      renderObjects();
      syncDeleteBtn();
      return;
    }

    if (S.tool === 'arrow' || S.tool === 'circle') {
      pushUndo();
      S.drawing = true;
      S.startX = p.x; S.startY = p.y;
      S.tempObj = { id: uid(), type: S.tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: S.color, w: S.penW };
      return;
    }

    if (S.tool === 'pen' || S.tool === 'eraser') {
      pushUndo();
      S.drawing = true;
      const ctx = _els.strokesC.getContext('2d');
      ctx.lineCap = ctx.lineJoin = 'round';
      if (S.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = S.eraserW;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = S.color;
        ctx.lineWidth = S.penW;
      }
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
  }

  function onMove(e) {
    e.preventDefault();
    const p = pt(e, _els.objC);

    if (S.tool === 'select' && S.drawing && S.selId) {
      const sel = S.objects.find(o => o.id === S.selId);
      if (!sel) return;
      const dx = p.x - S.dragOX, dy = p.y - S.dragOY;
      if (S.dragRole === 'move')      { sel.x1 += dx; sel.y1 += dy; sel.x2 += dx; sel.y2 += dy; }
      else if (S.dragRole === 'p1')   { sel.x1 = p.x; sel.y1 = p.y; }
      else if (S.dragRole === 'p2')   { sel.x2 = p.x; sel.y2 = p.y; }
      S.dragOX = p.x; S.dragOY = p.y;
      renderObjects();
      return;
    }

    if (!S.drawing) return;

    if (S.tool === 'arrow' || S.tool === 'circle') {
      S.tempObj.x2 = p.x; S.tempObj.y2 = p.y;
      renderObjects([...S.objects, S.tempObj]);
      return;
    }

    if (S.tool === 'pen' || S.tool === 'eraser') {
      const ctx = _els.strokesC.getContext('2d');
      ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  }

  function onEnd(e) {
    e.preventDefault();

    if (S.tool === 'select') { S.drawing = false; return; }

    if (S.drawing && (S.tool === 'arrow' || S.tool === 'circle') && S.tempObj) {
      const p = pt(e, _els.objC);
      S.tempObj.x2 = p.x; S.tempObj.y2 = p.y;
      if (Math.hypot(S.tempObj.x2 - S.tempObj.x1, S.tempObj.y2 - S.tempObj.y1) > 5) {
        S.objects.push({ ...S.tempObj });
      }
      S.tempObj = null;
      renderObjects();
    }

    if (S.tool === 'eraser' || S.tool === 'pen') {
      _els.strokesC.getContext('2d').globalCompositeOperation = 'source-over';
    }

    S.drawing = false;
    syncUndoBtn();
  }

  // ─── Text tool ───────────────────────────────────────────────────────────────
  function handleText(e, p) {
    const canvas = _els.objC;
    const r = canvas.getBoundingClientRect();
    const sx = r.width / canvas.width, sy = r.height / canvas.height;

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Texto... Enter para confirmar';
    inp.style.cssText = `
      position:fixed;left:${r.left + p.x * sx}px;top:${r.top + p.y * sy - 22}px;
      background:rgba(0,0,0,.72);color:${S.color};border:2px solid ${S.color};
      border-radius:6px;padding:4px 10px;
      font-size:${Math.max(16, S.penW * 3.5)}px;font-weight:700;font-family:sans-serif;
      outline:none;z-index:99999;min-width:130px;max-width:260px;
    `;
    document.body.appendChild(inp);
    inp.focus();

    const commit = () => {
      const txt = inp.value.trim();
      if (txt) {
        pushUndo();
        const ctx = _els.strokesC.getContext('2d');
        const fs = Math.max(22, S.penW * 5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = `700 ${fs}px sans-serif`;
        ctx.lineWidth = fs * 0.08;
        ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(txt, p.x, p.y);
        ctx.fillStyle   = S.color;          ctx.fillText(txt, p.x, p.y);
        syncUndoBtn();
      }
      inp.remove();
    };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } });
    inp.addEventListener('blur', commit);
  }

  // ─── Delete selected object ───────────────────────────────────────────────────
  function deleteSelected() {
    if (!S.selId) return;
    pushUndo();
    S.objects = S.objects.filter(o => o.id !== S.selId);
    S.selId = null;
    renderObjects();
    syncDeleteBtn();
    syncUndoBtn();
  }

  // ─── Flatten: photo + strokes + objects → JPEG ───────────────────────────────
  function flatten(quality) {
    const selBak = S.selId; S.selId = null; renderObjects(); S.selId = selBak;
    const out = document.createElement('canvas');
    out.width = _els.photoC.width; out.height = _els.photoC.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(_els.photoC,   0, 0);
    ctx.drawImage(_els.strokesC, 0, 0);
    ctx.drawImage(_els.objC,     0, 0);
    S.selId = selBak; renderObjects();
    return out.toDataURL('image/jpeg', quality || 0.88);
  }

  // ─── Build DOM ───────────────────────────────────────────────────────────────
  function buildColorOpts() {
    return `<div class="pa-opts-row pa-opts-colors">${COLORS.map(c =>
      `<button class="pa-opt-color" data-color="${c}" style="background:${c}"></button>`
    ).join('')}</div>`;
  }

  function buildWidthOpts(widths) {
    return `<div class="pa-opts-row pa-opts-widths">${widths.map((w, i) =>
      `<button class="pa-opt-width${i === 1 ? ' pa-sel' : ''}" data-width="${w.v}" title="${w.label}">
        <span class="pa-dot" style="width:${Math.min(8 + w.v * 1.2, 30)}px;height:${Math.min(8 + w.v * 1.2, 30)}px"></span>
      </button>`
    ).join('')}</div>`;
  }

  const TOOLS = [
    { id: 'select', label: 'Mover',    opts: `<p class="pa-opts-hint">Toque num objeto → seleciona.<br>Arraste para mover.<br>Pontos azuis para redimensionar.</p>` },
    { id: 'pen',    label: 'Caneta',   opts: buildColorOpts() + buildWidthOpts(PEN_WIDTHS) },
    { id: 'eraser', label: 'Borracha', opts: buildWidthOpts(ERASER_WIDTHS) },
    { id: 'arrow',  label: 'Seta',     opts: buildColorOpts() + buildWidthOpts(PEN_WIDTHS) },
    { id: 'circle', label: 'Círculo',  opts: buildColorOpts() + buildWidthOpts(PEN_WIDTHS) },
    { id: 'text',   label: 'Texto',    opts: buildColorOpts() + buildWidthOpts(PEN_WIDTHS) },
  ];

  function buildUI() {
    if (_built) return;
    _built = true;

    const ov = document.createElement('div');
    ov.id = 'pa-overlay';
    ov.innerHTML = `
      <div id="pa-topbar">
        <button id="pa-cancel-btn" class="pa-topbtn pa-cancel-btn">✕ Cancelar</button>
        <span id="pa-title">Anotar Foto</span>
        <button id="pa-save-btn"   class="pa-topbtn pa-save-btn">✓ Salvar</button>
      </div>
      <div id="pa-main">
        <div id="pa-canvas-wrap">
          <canvas id="pa-photo-c"></canvas>
          <canvas id="pa-strokes-c"></canvas>
          <canvas id="pa-obj-c"></canvas>
        </div>
        <div id="pa-sidebar">
          ${TOOLS.map((t, i) => `
            <div class="pa-tool-group" data-tool="${t.id}">
              <button class="pa-tool-btn${i === 1 ? ' pa-active' : ''}" data-tool="${t.id}" title="${t.label}">
                <span class="pa-icon">${SVG[t.id]}</span>
                <span class="pa-label">${t.label}</span>
              </button>
              <div class="pa-opts-panel" id="pa-panel-${t.id}">${t.opts}</div>
            </div>
          `).join('')}
          <div class="pa-sep"></div>
          <button id="pa-undo-btn"   class="pa-tool-btn pa-icon-btn" title="Desfazer" disabled>
            <span class="pa-icon">${SVG.undo}</span>
          </button>
          <button id="pa-delete-btn" class="pa-tool-btn pa-icon-btn pa-danger" title="Apagar objeto" style="display:none">
            <span class="pa-icon">${SVG.trash}</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(ov);

    _els = {
      overlay:  ov,
      wrap:     ov.querySelector('#pa-canvas-wrap'),
      photoC:   ov.querySelector('#pa-photo-c'),
      strokesC: ov.querySelector('#pa-strokes-c'),
      objC:     ov.querySelector('#pa-obj-c'),
      undoBtn:  ov.querySelector('#pa-undo-btn'),
      deleteBtn:ov.querySelector('#pa-delete-btn'),
    };

    // Tool button clicks
    ov.querySelectorAll('.pa-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        const panel = ov.querySelector(`#pa-panel-${tool}`);
        const alreadyOpen = panel && panel.classList.contains('pa-open');

        ov.querySelectorAll('.pa-opts-panel').forEach(p => p.classList.remove('pa-open'));
        ov.querySelectorAll('.pa-tool-btn').forEach(b => b.classList.remove('pa-active'));

        btn.classList.add('pa-active');
        S.tool = tool;
        if (S.tool !== 'select') { S.selId = null; renderObjects(); }
        if (panel && !alreadyOpen) panel.classList.add('pa-open');
        syncDeleteBtn();
      });
    });

    // Delegated color / width option clicks
    ov.addEventListener('click', e => {
      const cb = e.target.closest('.pa-opt-color');
      if (cb) {
        S.color = cb.dataset.color;
        cb.closest('.pa-opts-colors').querySelectorAll('.pa-opt-color').forEach(b => b.classList.remove('pa-sel'));
        cb.classList.add('pa-sel');
      }
      const wb = e.target.closest('.pa-opt-width');
      if (wb) {
        const w = parseInt(wb.dataset.width);
        if (S.tool === 'eraser') S.eraserW = w; else S.penW = w;
        wb.closest('.pa-opts-widths').querySelectorAll('.pa-opt-width').forEach(b => b.classList.remove('pa-sel'));
        wb.classList.add('pa-sel');
      }
    });

    ov.querySelector('#pa-undo-btn').addEventListener('click', undo);

    ov.querySelector('#pa-delete-btn').addEventListener('click', () => { pushUndo(); deleteSelected(); });

    ov.querySelector('#pa-save-btn').addEventListener('click', () => {
      const result = flatten();
      closeEditor();
      if (S.onSave) S.onSave(result);
    });

    ov.querySelector('#pa-cancel-btn').addEventListener('click', () => {
      closeEditor();
      if (S.onCancel) S.onCancel();
    });

    bindCanvasEvents();
  }

  function closeEditor() {
    _els.overlay.style.display = 'none';
    S.objects = []; S.selId = null; S.undoStack = [];
    S.drawing = false; S.tempObj = null;
    _els.overlay.querySelectorAll('.pa-opts-panel').forEach(p => p.classList.remove('pa-open'));
  }

  function resetUI() {
    S.tool = 'pen'; S.color = '#EF4444'; S.penW = 5; S.eraserW = 28;
    const ov = _els.overlay;
    ov.querySelectorAll('.pa-tool-btn').forEach(b => b.classList.remove('pa-active'));
    ov.querySelector('[data-tool="pen"]').classList.add('pa-active');
    ov.querySelectorAll('.pa-opts-panel').forEach(p => p.classList.remove('pa-open'));
    ov.querySelectorAll('.pa-opt-color').forEach((b, i) => b.classList.toggle('pa-sel', i === 0));
    ov.querySelectorAll('.pa-opt-width').forEach((b, i) => b.classList.toggle('pa-sel', i === 1));
    _els.deleteBtn.style.display = 'none';
    _els.undoBtn.disabled = true;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  global.PhotoAnnotator = {
    async open(dataUrl, { onSave, onCancel } = {}) {
      S.onSave = onSave || null; S.onCancel = onCancel || null;
      S.objects = []; S.selId = null; S.undoStack = []; S.tempObj = null;
      buildUI();
      resetUI();
      _els.overlay.style.display = 'flex';
      await setupCanvases(dataUrl);
    },
  };

})(window);
