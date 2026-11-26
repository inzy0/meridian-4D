// Draw on any page of the lab: pencil, highlighter, laser pointer (fading or kept), arrow, box, text, numbered pins with
// floating notes, eraser. Marks are kept per page (tab + item), follow the page when it scrolls, autosave in this
// browser (per account) and can be downloaded (marks only, or page + marks as a sharp PNG) or attached to a note.
// Open with the ✏ button in the Notes header, the "Draw" button, or Alt+D. Esc returns to pointer mode.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLORS = ['#ff3b3b', '#ffd23f', '#3ddc84', '#4cc9f0', '#b49bff', '#ffffff', '#111111'];
const TOOLS = [['cursor', '🖱', 'Pointer: use the page, marks stay visible (Esc)'], ['pen', '✏', 'Pencil (P)'], ['hl', '🖍', 'Highlighter (H)'], ['laser', '🔴', 'Laser pointer (L)'],
  ['arrow', '➚', 'Arrow (A)'], ['box', '▭', 'Box (B)'], ['text', 'T', 'Text label (T)'], ['pin', '📍', 'Pin with a floating note (N)'], ['erase', '⌫', 'Eraser: tap a mark (E)']];
const ST = { on: false, tool: 'cursor', color: COLORS[0], size: 3, fade: 1.2, pages: {}, undo: [], redo: [], hidden: false };
let cv, g, bar, layer, dpr = 1, cur = null, laser = [], raf = 0, saveT = 0;

const key = () => { const h = location.hash.slice(1) || 'home'; return h.split('/').slice(0, 2).join('/'); };
const page = () => (ST.pages[key()] = ST.pages[key()] || { marks: [] });
const scroller = () => document.querySelector('main.mode:not([hidden])') || document.scrollingElement;
const off = () => { const s = scroller(); return { x: (s?.scrollLeft || 0) + scrollX, y: (s?.scrollTop || 0) + scrollY }; };
function loadAll() { try { ST.pages = JSON.parse(localStorage.getItem('an-pages') || '{}') || {}; } catch { ST.pages = {}; } try { Object.assign(ST, JSON.parse(localStorage.getItem('an-prefs') || '{}')); } catch { /* ignore */ } }
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem('an-pages', JSON.stringify(ST.pages)); localStorage.setItem('an-prefs', JSON.stringify({ color: ST.color, size: ST.size, fade: ST.fade })); flash('saved'); } catch { flash('could not save (storage full or blocked)'); }
  }, 300);
}

export function initAnnotate() {
  if (cv) return;
  loadAll();
  cv = document.createElement('canvas'); cv.id = 'an-cv'; document.body.appendChild(cv);
  layer = document.createElement('div'); layer.id = 'an-pins'; document.body.appendChild(layer);
  g = cv.getContext('2d');
  bar = document.createElement('div'); bar.id = 'an-bar'; bar.hidden = true; document.body.appendChild(bar);
  bar.innerHTML = `<span class="an-grip" title="Drag">⠿</span>${TOOLS.map(([k, ic, t]) => `<button class="an-b" data-t="${k}" title="${esc(t)}">${ic}</button>`).join('')}
    <span class="an-sep"></span>${COLORS.map((c) => `<button class="an-c" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}
    <label title="Size"><input id="an-size" type="range" min="1" max="24" value="${ST.size}"></label>
    <label title="Laser trail: how long it stays (max = keep)">laser <input id="an-fade" type="range" min="0.3" max="6" step="0.1" value="${ST.fade}"></label>
    <span class="an-sep"></span><button class="an-b" data-a="undo" title="Undo (Ctrl+Z)">↶</button><button class="an-b" data-a="redo" title="Redo (Ctrl+Y)">↷</button>
    <button class="an-b" data-a="hide" title="Hide / show marks">👁</button><button class="an-b" data-a="clear" title="Clear this page">🗑</button>
    <button class="an-b" data-a="png" title="Download marks (transparent PNG)">⭳</button><button class="an-b" data-a="shot" title="Download page + marks (you pick this tab once)">📷</button>
    <button class="an-b" data-a="note" title="Attach page + marks to the current note">✎</button><button class="an-b" data-a="json" title="Export / import marks">{ }</button>
    <span id="an-msg" class="an-msg"></span><button class="an-b" data-a="close" title="Close drawing (Alt+D)">✕</button>`;
  bar.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => tool(b.dataset.t)));
  bar.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { ST.color = b.dataset.c; sync(); persist(); }));
  bar.querySelector('#an-size').oninput = (e) => { ST.size = Number(e.target.value); persist(); };
  bar.querySelector('#an-fade').oninput = (e) => { ST.fade = Number(e.target.value); persist(); };
  bar.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => action(b.dataset.a)));
  dragBar();
  resize(); addEventListener('resize', resize);
  addEventListener('scroll', redraw, true);
  addEventListener('hashchange', () => setTimeout(redraw, 50));
  cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  addEventListener('keydown', keys);
  const db = document.querySelector('#an-open'); if (db) db.onclick = () => toggle();
  redraw();
}
export function toggle(force) {
  ST.on = force ?? !ST.on; bar.hidden = !ST.on;
  if (!ST.on) tool('cursor'); else if (ST.tool === 'cursor') tool('pen');
  sync();
}
function tool(t) { ST.tool = t; cv.classList.toggle('draw', ST.on && t !== 'cursor'); cv.dataset.tool = t; sync(); }
function sync() {
  if (!bar) return;
  bar.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === ST.tool));
  bar.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('on', b.dataset.c === ST.color));
}
function flash(t) { const m = bar?.querySelector('#an-msg'); if (!m) return; m.textContent = t; clearTimeout(m._t); m._t = setTimeout(() => { m.textContent = ''; }, 1600); }
function keys(e) {
  if (e.altKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); toggle(); return; }
  if (!ST.on || e.target.matches('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'Escape') tool('cursor');
  const k = { p: 'pen', h: 'hl', l: 'laser', a: 'arrow', b: 'box', t: 'text', n: 'pin', e: 'erase' }[e.key.toLowerCase()];
  if (k && !e.ctrlKey && !e.metaKey) tool(k);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); action('undo'); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); action('redo'); }
}
function dragBar() {
  const grip = bar.querySelector('.an-grip'); let sx, sy, ox, oy;
  grip.onpointerdown = (e) => { const r = bar.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; grip.setPointerCapture(e.pointerId);
    grip.onpointermove = (m) => { bar.style.left = `${ox + m.clientX - sx}px`; bar.style.top = `${oy + m.clientY - sy}px`; bar.style.transform = 'none'; };
    grip.onpointerup = () => { grip.onpointermove = null; }; };
}

// ------------------------------------------------------------------ drawing (page coordinates: viewport + scroll)
function resize() { dpr = Math.min(3, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.width = `${innerWidth}px`; cv.style.height = `${innerHeight}px`; redraw(); }
const pt = (e) => { const o = off(); return [e.clientX + o.x, e.clientY + o.y, e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5]; };
function down(e) {
  if (!ST.on || ST.tool === 'cursor') return;
  cv.setPointerCapture(e.pointerId);
  const p = pt(e);
  if (ST.tool === 'erase') { eraseAt(p); cur = { t: 'erase' }; return; }
  if (ST.tool === 'text') { const s = prompt('Text label'); if (s) add({ t: 'text', c: ST.color, w: ST.size, p: [p], s }); return; }
  if (ST.tool === 'pin') { const n = page().marks.filter((m) => m.t === 'pin').length + 1; add({ t: 'pin', c: ST.color, p: [p], n, note: '', open: true }); return; }
  if (ST.tool === 'laser') { laser.push({ p, t: performance.now() }); cur = { t: 'laser' }; loop(); return; }
  cur = { t: ST.tool, c: ST.color, w: ST.tool === 'hl' ? ST.size * 5 : ST.size, p: [p] };
}
function move(e) {
  if (!cur) return;
  const p = pt(e);
  if (cur.t === 'erase') { eraseAt(p); return; }
  if (cur.t === 'laser') { laser.push({ p, t: performance.now() }); return; }
  if (cur.t === 'arrow' || cur.t === 'box') cur.p[1] = p; else cur.p.push(p);
  redraw(); drawMark(cur);
}
function up() {
  if (!cur) return;
  if (cur.t !== 'laser' && cur.t !== 'erase' && cur.p.length > (cur.t === 'arrow' || cur.t === 'box' ? 1 : 0)) add(cur);
  cur = null;
}
function add(m) { page().marks.push(m); ST.undo.push({ k: key(), op: 'add', m }); ST.redo = []; redraw(); persist(); }
function eraseAt(p) {
  const ms = page().marks; const r = 12;
  for (let i = ms.length - 1; i >= 0; i--) {
    if (ms[i].p.some((q, j) => Math.hypot(q[0] - p[0], q[1] - p[1]) < r + (ms[i].w || 3) || (j > 0 && segDist(p, ms[i].p[j - 1], q) < r))) {
      const [m] = ms.splice(i, 1); ST.undo.push({ k: key(), op: 'del', m, i }); redraw(); persist(); return;
    }
  }
}
function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
function action(a) {
  if (a === 'close') return toggle(false);
  if (a === 'undo') { const u = ST.undo.pop(); if (!u) return; const ms = (ST.pages[u.k] = ST.pages[u.k] || { marks: [] }).marks; if (u.op === 'add') ms.splice(ms.lastIndexOf(u.m), 1); else ms.splice(u.i, 0, u.m); ST.redo.push(u); redraw(); persist(); return; }
  if (a === 'redo') { const u = ST.redo.pop(); if (!u) return; const ms = ST.pages[u.k].marks; if (u.op === 'add') ms.push(u.m); else ms.splice(ms.indexOf(u.m), 1); ST.undo.push(u); redraw(); persist(); return; }
  if (a === 'hide') { ST.hidden = !ST.hidden; redraw(); return; }
  if (a === 'clear') { if (page().marks.length && confirm('Clear all marks on this page?')) { ST.undo.push(...page().marks.map((m, i) => ({ k: key(), op: 'del', m, i }))); page().marks = []; redraw(); persist(); } return; }
  if (a === 'png') return marksPng().then((b) => download(b, `marks-${key().replace(/\W+/g, '_')}.png`));
  if (a === 'shot') return pageShot().then((b) => b && download(b, `page-${key().replace(/\W+/g, '_')}-${Date.now()}.png`));
  if (a === 'note') return pageShot().then(async (b) => { if (!b) return; const m = await import('./notes.js'); if (m.attachToNote) { await m.attachToNote(b, `Page + marks · ${key()} · ${new Date().toLocaleString()}`); flash('attached to note'); } });
  if (a === 'json') return jsonIO();
}

function smooth(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length < 3) { pts.forEach((p) => ctx.lineTo(p[0], p[1])); return; }
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
}
function drawMark(m, ctx = g, o = off(), scale = dpr) {
  ctx.save(); ctx.setTransform(scale, 0, 0, scale, -o.x * scale, -o.y * scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ctx.fillStyle = m.c;
  if (m.t === 'pen') { const pr = m.p.reduce((a, p) => a + p[2], 0) / m.p.length; ctx.lineWidth = m.w * (0.6 + pr); smooth(ctx, m.p); ctx.stroke(); }
  if (m.t === 'hl') { ctx.globalAlpha = 0.32; ctx.globalCompositeOperation = ctx === g ? 'source-over' : 'multiply'; ctx.lineWidth = m.w; ctx.lineCap = 'butt'; smooth(ctx, m.p); ctx.stroke(); }
  if (m.t === 'arrow' && m.p[1]) { const [a, b] = m.p; ctx.lineWidth = m.w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 10 + m.w * 2.5;
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - L * Math.cos(ang - 0.45), b[1] - L * Math.sin(ang - 0.45)); ctx.lineTo(b[0] - L * Math.cos(ang + 0.45), b[1] - L * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill(); }
  if (m.t === 'box' && m.p[1]) { const [a, b] = m.p; ctx.lineWidth = m.w; ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
  if (m.t === 'text') { ctx.font = `600 ${12 + m.w * 2}px system-ui, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.strokeText(m.s, m.p[0][0], m.p[0][1]); ctx.fillText(m.s, m.p[0][0], m.p[0][1]); }
  if (m.t === 'pin' && ctx !== g) { const [x, y] = m.p[0]; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(m.n), x, y + 4);
    if (m.note) { ctx.textAlign = 'left'; ctx.font = '13px system-ui'; const lines = m.note.split('\n').slice(0, 8); const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16; ctx.fillStyle = 'rgba(10,20,36,.92)'; ctx.fillRect(x + 16, y - 10, w, lines.length * 17 + 10); ctx.fillStyle = '#fff'; lines.forEach((l, i) => ctx.fillText(l, x + 24, y + 7 + i * 17)); } }
  ctx.restore();
}
function redraw() {
  if (!g) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  if (!ST.hidden) page().marks.forEach((m) => drawMark(m));
  pins();
  if (laser.length) drawLaser();
}
function loop() { cancelAnimationFrame(raf); const f = () => { const keep = ST.fade >= 6; const t = performance.now(); if (!keep) laser = laser.filter((l) => t - l.t < ST.fade * 1000); redraw(); if (laser.length && (cur?.t === 'laser' || !keep)) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); }
function drawLaser() {
  const t = performance.now(), o = off(), keep = ST.fade >= 6;
  g.save(); g.setTransform(dpr, 0, 0, dpr, -o.x * dpr, -o.y * dpr); g.lineCap = 'round';
  for (let i = 1; i < laser.length; i++) {
    if (laser[i].t - laser[i - 1].t > 250) continue;
    const a = keep ? 0.9 : Math.max(0, 1 - (t - laser[i].t) / (ST.fade * 1000));
    g.strokeStyle = `rgba(255,40,40,${a * 0.9})`; g.lineWidth = 4; g.shadowColor = 'rgba(255,0,0,.9)'; g.shadowBlur = 14;
    g.beginPath(); g.moveTo(laser[i - 1].p[0], laser[i - 1].p[1]); g.lineTo(laser[i].p[0], laser[i].p[1]); g.stroke();
  }
  const l = laser[laser.length - 1]; if (l && cur?.t === 'laser') { g.fillStyle = '#ff2b2b'; g.shadowBlur = 20; g.beginPath(); g.arc(l.p[0], l.p[1], 6, 0, 7); g.fill(); }
  g.restore();
}
// pins: numbered markers with floating, editable notes (HTML so they can be typed in)
function pins() {
  const o = off(); const ms = ST.hidden ? [] : page().marks.filter((m) => m.t === 'pin');
  layer.innerHTML = ms.map((m, i) => { const [x, y] = m.p[0]; return `<div class="an-pin" style="left:${x - o.x}px;top:${y - o.y}px;--c:${m.c}" data-i="${i}"><button class="an-pn" title="Show / hide note">${m.n}</button>
    ${m.open ? `<div class="an-note"><textarea placeholder="Note… (autosaves)">${esc(m.note)}</textarea><div><button class="an-del" title="Delete pin">🗑</button></div></div>` : ''}</div>`; }).join('');
  layer.querySelectorAll('.an-pin').forEach((el) => {
    const m = ms[Number(el.dataset.i)];
    el.querySelector('.an-pn').onclick = () => { m.open = !m.open; persist(); pins(); };
    const ta = el.querySelector('textarea'); if (ta) { ta.oninput = () => { m.note = ta.value; persist(); }; }
    const d = el.querySelector('.an-del'); if (d) d.onclick = () => { const all = page().marks; const i = all.indexOf(m); all.splice(i, 1); ST.undo.push({ k: key(), op: 'del', m, i }); redraw(); persist(); };
    let sx, sy, ox, oy; const b = el.querySelector('.an-pn');
    b.onpointerdown = (e) => { if (e.button) return; sx = e.clientX; sy = e.clientY; ox = m.p[0][0]; oy = m.p[0][1]; b.setPointerCapture(e.pointerId);
      b.onpointermove = (ev) => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return; m.p[0] = [ox + ev.clientX - sx, oy + ev.clientY - sy, 0.5]; el.style.left = `${m.p[0][0] - off().x}px`; el.style.top = `${m.p[0][1] - off().y}px`; b._moved = true; };
      b.onpointerup = () => { b.onpointermove = null; if (b._moved) { b._moved = false; persist(); setTimeout(pins); } }; };
  });
}

// ------------------------------------------------------------------ export
async function marksPng() {
  const s = 2, o = off(); const c = document.createElement('canvas'); c.width = innerWidth * s; c.height = innerHeight * s; const ctx = c.getContext('2d');
  page().marks.forEach((m) => drawMark(m, ctx, o, s));
  return new Promise((r) => c.toBlob(r, 'image/png'));
}
async function pageShot() {
  // the browser asks once which tab to capture; the frame is taken at full device resolution, then the marks are drawn on top
  if (!navigator.mediaDevices?.getDisplayMedia) { flash('screen capture not available here: use ⭳ for marks only'); return null; }
  let stream;
  try { bar.style.visibility = 'hidden'; stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 1 }, preferCurrentTab: true, selfBrowserSurface: 'include', audio: false }); }
  catch { bar.style.visibility = ''; flash('capture cancelled'); return null; }
  const v = document.createElement('video'); v.srcObject = stream; v.muted = true; await v.play(); await new Promise((r) => setTimeout(r, 350));
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0);
  stream.getTracks().forEach((t) => t.stop()); bar.style.visibility = '';
  const s = c.width / innerWidth, o = off(); page().marks.forEach((m) => drawMark(m, ctx, o, s));
  return new Promise((r) => c.toBlob(r, 'image/png'));
}
function download(b, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
function jsonIO() {
  const d = document.createElement('dialog'); d.className = 'an-dlg';
  d.innerHTML = `<form method="dialog"><h3>Marks</h3><p>${Object.keys(ST.pages).filter((k) => ST.pages[k].marks.length).length} pages with marks.</p>
    <button class="ghost-btn" type="button" id="an-ex">Export all (.json)</button> <label class="ghost-btn">Import<input type="file" accept=".json" id="an-im" hidden></label> <button class="ghost-btn">Close</button></form>`;
  document.body.appendChild(d); d.showModal(); d.addEventListener('close', () => d.remove());
  d.querySelector('#an-ex').onclick = () => download(new Blob([JSON.stringify(ST.pages)], { type: 'application/json' }), `meridian-marks-${new Date().toISOString().slice(0, 10)}.json`);
  d.querySelector('#an-im').onchange = async (e) => { try { const x = JSON.parse(await e.target.files[0].text()); for (const [k, v] of Object.entries(x)) (ST.pages[k] = ST.pages[k] || { marks: [] }).marks.push(...(v.marks || [])); persist(); redraw(); d.close(); } catch { alert('Not a marks file.'); } };
}
window.__an = { toggle, tool, get state() { return ST; } };
