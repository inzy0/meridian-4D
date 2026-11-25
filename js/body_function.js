// Body systems -> Function explorer: organ -> tissue -> cell -> product -> stimulus -> route -> target -> effect
// -> feedback -> fate, two-organ interactions, and whole-body daily states (eating, fasting, playing, sitting,
// chilling, fun, stress, sleep) with a day player.
// The step labels are a textbook skeleton; every step shows the sentence(s) quoted unchanged from the open library
// that back it (OpenStax A&P 2e first), or is marked "no quote found". The 3D flows are schematic arcs between organ
// centres, not vessel paths; thyroid, parathyroid, ovaries, uterus and breast have no mesh in this (male)
// reference body and are shown as labelled markers. Built by tools/body_function_build.py.

import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KCOL = { hormone: 0xffc53d, neurotransmitter: 0xc77dff, 'enzyme / digestive secretion': 0x5be37d, 'local / other': 0x4cc9f0 };
const css = (h) => `#${h.toString(16).padStart(6, '0')}`;
const SRC = 0xff8c42, TGT = 0x4cc9f0;
let M = null, D = null, F = { flows: [], labels: [], proxies: {}, others: 'fade', day: null, cellRaf: null, link: null };

export async function setupFunction(m) {
  M = m;
  try { D = await fetch('/meridian-4D/rt/molecular/body_function.json').then((r) => r.json()); } catch { return; }
  F.byId = Object.fromEntries(D.links.map((l) => [l.id, l]));
  F.group = new THREE.Group(); M.scene.add(F.group);
  const host = $('#mol-func'); const C = D.counts;
  host.innerHTML = `<div class="card-h"><h2>Function explorer: organ → tissue → cell → secretion → target</h2><button class="ghost-btn" id="bf-off">Clear</button></div>
    <p class="fine muted">${C.links} secretions (hormones, transmitters, enzymes, local signals). ${C.steps_quoted} of ${C.steps} steps are backed by a sentence quoted unchanged from the open library; the rest say "no quote found". Flows in 3D are schematic.</p>
    <div class="bar bf-tabs">${[['org', 'Organs'], ['two', 'Two organs'], ['state', 'Daily states'], ['day', 'A day ▶']].map(([k, v], i) => `<button class="chip-btn ${i ? '' : 'on'}" data-bt="${k}">${v}</button>`).join('')}</div>
    <div class="bar fine bf-layer">Other organs: ${[['fade', 'faded'], ['hide', 'hidden'], ['ctx', 'skeleton for context']].map(([k, v]) => `<label><input type="radio" name="bf-oth" value="${k}" ${k === 'fade' ? 'checked' : ''}> ${v}</label>`).join(' ')}</div>
    <div id="bf-body"></div>`;
  host.querySelectorAll('[data-bt]').forEach((b) => (b.onclick = () => { host.querySelectorAll('[data-bt]').forEach((x) => x.classList.toggle('on', x === b)); tab(b.dataset.bt); }));
  host.querySelectorAll('[name=bf-oth]').forEach((r) => (r.onchange = () => { F.others = r.value; if (F.last) show(...F.last); }));
  $('#bf-off').onclick = clear;
  tab('org');
  M.onFrame = tick; M.onPaint = released;
}

// ------------------------------------------------------------------ organ geometry
const baseName = (n) => n.replace(/\b(left|right) /, '');
function meshesOf(key) {
  F.mo ||= {}; if (F.mo[key]) return F.mo[key];
  const o = D.organs[key]; let ms = [];
  if (o.re) { const R = new RegExp(o.re); ms = M.meshes.filter((m) => R.test(baseName(m.userData.part.name)) && (key !== 'vessels' || m.userData.part.layer === 'arteries')); }
  else if (o.proxy?.startsWith('layer:') && o.proxy !== 'layer:all') { const L = o.proxy.slice(6); ms = M.meshes.filter((m) => m.userData.part.layer === L); }
  return (F.mo[key] = ms);
}
const box = (ms) => { const b = new THREE.Box3(); ms.forEach((m) => b.expandByObject(m)); return b; };
function centre(key) {
  F.cc ||= {}; if (F.cc[key]) return F.cc[key];
  const ant = new THREE.Vector3(0, 0, M.atlas.anchors.anterior || 1), A = M.atlas.box, ac = A.getCenter(new THREE.Vector3());
  const at = (re) => box(M.meshes.filter((m) => re.test(baseName(m.userData.part.name)))).getCenter(new THREE.Vector3());
  const o = D.organs[key]; let c;
  if (o.re && meshesOf(key).length) c = box(meshesOf(key)).getCenter(new THREE.Vector3());
  else {
    const tr = box(M.meshes.filter((m) => /^trachea$/.test(m.userData.part.name))), bl = at(/urinary bladder/), ht = at(/wall of (left |right )?(atrium|ventricle)/);
    const P = {
      neck: () => new THREE.Vector3((tr.min.x + tr.max.x) / 2, tr.max.y - 0.03, 0).setZ(tr.getCenter(new THREE.Vector3()).z).addScaledVector(ant, 0.012),
      neck2: () => new THREE.Vector3((tr.min.x + tr.max.x) / 2, tr.max.y - 0.035, 0).setZ(tr.getCenter(new THREE.Vector3()).z).addScaledVector(ant, -0.004),
      pelvis: () => bl.clone().add(new THREE.Vector3(0, 0.05, 0)).addScaledVector(ant, -0.03), pelvis2: () => bl.clone().add(new THREE.Vector3(0, 0.03, 0)).addScaledVector(ant, -0.02),
      chest: () => ht.clone().add(new THREE.Vector3(0, 0.05, 0)).addScaledVector(ant, 0.09),
      'layer:skin': () => (key === 'adipose' ? ac.clone().add(new THREE.Vector3(0.13, 0.02, 0)).addScaledVector(ant, 0.1) : ac.clone().add(new THREE.Vector3(-0.2, 0.25, 0)).addScaledVector(ant, 0.06)),
      'layer:muscles': () => at(/vastus lateralis|rectus femoris/),
      'layer:skeleton': () => at(/^femur$/), 'layer:arteries': () => at(/aorta/), 'layer:all': () => ac.clone().add(new THREE.Vector3(0, 0.1, 0)),
    };
    c = (P[o.proxy] || (() => ac))();
  }
  return (F.cc[key] = c);
}
function proxy(key, on, col) {
  const o = D.organs[key]; if (o.re || !o.proxy || o.proxy.startsWith('layer:')) return;
  if (!F.proxies[key]) {
    const g = new THREE.Group(), r = key === 'parathyroid' ? 0.006 : 0.013;
    const pts = key === 'ovary' ? [-0.05, 0.05] : key === 'breast' ? [-0.09, 0.09] : key === 'parathyroid' ? [-0.012, 0.012] : [0];
    for (const dx of pts) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthTest: false })); s.position.copy(centre(key)).add(new THREE.Vector3(dx, 0, 0)); s.renderOrder = 999; g.add(s); }
    F.proxies[key] = g; F.group.add(g);
  }
  F.proxies[key].visible = on; F.proxies[key].children.forEach((s) => s.material.color.set(col));
}

// ------------------------------------------------------------------ visual state
// roles: {organKey: 'src'|'tgt'}; flows: [[from, to, colour]]
function show(roles, flows, title) {
  F.last = [roles, flows, title]; M.cur = 'func';
  // organs that are a whole layer (muscle, bone, skin, adipose, vessels) are tinted see-through so real organs stay readable
  const roleOf = new Map(), wide = new Set();
  for (const [k, r] of Object.entries(roles)) { const ms = meshesOf(k); for (const m of ms) { if (roleOf.get(m) !== 'src') roleOf.set(m, r); if (ms.length > 60 || D.organs[k].proxy?.startsWith('layer:')) wide.add(m); } }
  for (const m of M.meshes) {
    const u = m.userData, r = roleOf.get(m);
    if (r) { u.target.set(r === 'src' ? SRC : TGT); u.opT = wide.has(m) ? (u.part.layer === 'skin' ? 0.1 : 0.2) : 0.95; continue; }
    u.target.set(0x9fb3c8);
    u.opT = F.others === 'hide' ? 0 : F.others === 'ctx' ? (u.part.layer === 'skeleton' ? 0.16 : 0) : (u.part.layer === 'skeleton' ? 0.07 : 0.025);
  }
  Object.keys(D.organs).forEach((k) => proxy(k, !!roles[k], roles[k] === 'src' ? SRC : TGT));
  clearFlows();
  for (const [a, b, col] of flows) addFlow(a, b, col);
  for (const [k, r] of Object.entries(roles)) addLabel(D.organs[k].name, centre(k), r === 'src' ? css(SRC) : css(TGT));
  $('#mol-legend').innerHTML = `<b>${esc(title)}</b> · <span style="color:${css(SRC)}">■</span> source · <span style="color:${css(TGT)}">■</span> target · moving dots = product travelling (schematic route)`;
  const keys = Object.keys(roles), b = new THREE.Box3(); keys.forEach((k) => b.expandByPoint(centre(k)));
  if (!b.isEmpty()) { const sz = b.getSize(new THREE.Vector3()).length(); M.pc.flyTo(b.getCenter(new THREE.Vector3()), Math.max(0.45, sz * 1.7)); }
}
function clearFlows() { for (const f of [...F.flows, ...F.labels]) { F.group.remove(f.obj || f); (f.obj || f).traverse?.((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); } F.flows = []; F.labels = []; }
function addFlow(a, b, col) {
  const p0 = centre(a), p2 = centre(b); if (p0.distanceTo(p2) < 0.005) { selfLoop(p0, col); return; }
  const ant = new THREE.Vector3(0, 0, M.atlas.anchors.anterior || 1);
  // spread arcs sideways (alternating sides, growing with each flow) and forward, so parallel flows stay readable
  const k = F.flows.length, side = (k % 2 ? 1 : -1) * (0.05 + 0.03 * Math.floor(k / 2)) * Math.min(1, 0.35 + p0.distanceTo(p2));
  const mid = p0.clone().add(p2).multiplyScalar(0.5).addScaledVector(ant, 0.05 + 0.08 * p0.distanceTo(p2)).add(new THREE.Vector3(side, 0, 0));
  const curve = new THREE.QuadraticBezierCurve3(p0.clone(), mid, p2.clone());
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthTest: false }));
  const n = 18, pos = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 0.012, transparent: true, opacity: 0.95, depthTest: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  const obj = new THREE.Group(); obj.add(line, pts); line.renderOrder = pts.renderOrder = 1000; F.group.add(obj);
  F.flows.push({ obj, curve, pts, n, ph: Math.random() });
}
function selfLoop(p, col) { const c = new THREE.EllipseCurve(0, 0, 0.03, 0.03); const pts3 = c.getPoints(40).map((q) => new THREE.Vector3(p.x + q.x, p.y + q.y, p.z + 0.04)); const curve = new THREE.CatmullRomCurve3(pts3, true); addCurve(curve, col); }
function addCurve(curve, col) {
  const n = 12, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: 0.011, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  const obj = new THREE.Group(); obj.add(pts); pts.renderOrder = 1000; F.group.add(obj); F.flows.push({ obj, curve, pts, n, ph: 0 });
}
function addLabel(text, at, color) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d'), f = 26; g.font = `600 ${f}px system-ui, sans-serif`;
  const w = Math.min(520, g.measureText(text).width + 28); cv.width = w; cv.height = f + 18; g.font = `600 ${f}px system-ui, sans-serif`;
  g.fillStyle = 'rgba(8,10,24,0.8)'; g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); g.roundRect(2, 2, w - 4, f + 14, 10); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.fillText(text, 14, (f + 18) / 2);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  const h = 0.024; sp.scale.set(h * (w / (f + 18)), h, 1); sp.position.copy(at).add(new THREE.Vector3(0, 0.035, 0)); sp.renderOrder = 1001; F.group.add(sp); F.labels.push(sp);
}
function tick(now) {
  for (const f of F.flows) {
    const a = f.pts.geometry.attributes.position, t0 = (now / 2600 + f.ph) % 1;
    for (let i = 0; i < f.n; i++) { const p = f.curve.getPoint((t0 + i / f.n) % 1); a.setXYZ(i, p.x, p.y, p.z); }
    a.needsUpdate = true;
  }
  const pul = 0.75 + 0.25 * Math.sin(now / 260);
  for (const g of Object.values(F.proxies)) if (g.visible) g.children.forEach((s) => s.scale.setScalar(pul));
}
function clear() {
  clearFlows(); stopDay(); Object.values(F.proxies).forEach((g) => (g.visible = false)); F.last = null; M.cur = null;
  for (const m of M.meshes) { m.userData.target.set(0x9fb3c8); m.userData.opT = m.userData.part.layer === 'skeleton' ? 0.14 : 0.04; }
  $('#mol-legend').innerHTML = '';
}
// another view (gene, pathway, tissue) painted the body: drop the flows and markers, keep its colours
function released() { if (!F.last) return; clearFlows(); stopDay(); Object.values(F.proxies).forEach((g) => (g.visible = false)); F.last = null; }

// ------------------------------------------------------------------ quotes
const cite = (q) => `${esc(q.title)}${q.page ? `, ${esc(q.page)}` : ''} (${esc(q.licence)})`;
const quotes = (qs) => (qs && qs.length ? qs.map((q) => `<blockquote class="bf-q">“${esc(q.text)}”<small>${cite(q)}</small></blockquote>`).join('') : '<p class="bf-nq">no quote found in the local open library for this step</p>');
const organBtn = (k) => `<a href="#" data-org="${k}">${esc(D.organs[k].name)}</a>`;

// ------------------------------------------------------------------ tabs
function tab(t) {
  stopDay(); const B = $('#bf-body');
  if (t === 'org') return organs(B);
  if (t === 'two') return two(B);
  if (t === 'state') return states(B);
  return day(B);
}
function organs(B, sel) {
  const src = new Set(D.links.map((l) => l.organ)), sys = {};
  Object.entries(D.organs).filter(([k]) => src.has(k)).forEach(([k, o]) => { (sys[o.system] ||= []).push(k); });
  B.innerHTML = `<div class="bf-sys">${Object.entries(sys).map(([s, ks]) => `<div><small class="fine">${esc(s)}</small> ${ks.map((k) => `<button class="chip-btn ${k === sel ? 'on' : ''}" data-o="${k}">${esc(D.organs[k].name)}</button>`).join('')}</div>`).join('')}</div><div id="bf-org"></div>`;
  B.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => organ(b.dataset.o)));
  if (sel) organ(sel);
}
function organ(k) {
  $('#bf-body').querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('on', b.dataset.o === k));
  const out = D.links.filter((l) => l.organ === k), inn = D.links.filter((l) => l.organ !== k && l.targets.some((t) => t.organ === k));
  const tis = {}; out.forEach((l) => { ((tis[l.tissue] ||= {})[l.cell] ||= []).push(l); });
  const roles = { [k]: 'src' }, flows = [];
  out.forEach((l) => l.targets.forEach((t) => { if (!roles[t.organ]) roles[t.organ] = 'tgt'; flows.push([k, t.organ, KCOL[l.kind]]); }));
  inn.forEach((l) => { if (!roles[l.organ]) roles[l.organ] = 'tgt'; flows.push([l.organ, k, 0x9fb3c8]); });
  show(roles, flows, `${D.organs[k].name}: everything it releases and receives`);
  $('#bf-org').innerHTML = `<h3 class="st-h">${esc(D.organs[k].name)} <small>${esc(D.organs[k].system)}${D.organs[k].re ? '' : ' · marker, no mesh in this body'}</small></h3>
    <p class="fine"><b>Layers: organ → tissue → cell → product.</b> Pick a product to follow it step by step.</p>
    <ul class="bf-tree">${Object.entries(tis).map(([t, cs]) => `<li><b>${esc(t)}</b><ul>${Object.entries(cs).map(([c, ls]) => `<li>${esc(c)} → ${ls.map((l) => `<button class="ghost-btn bf-p" data-l="${l.id}" style="border-color:${css(KCOL[l.kind])}">${esc(l.product)}</button>`).join(' ')}</li>`).join('')}</ul></li>`).join('')}</ul>
    ${inn.length ? `<p class="fine"><b>Signals it receives</b> (grey flows): ${inn.map((l) => `<button class="ghost-btn bf-p" data-l="${l.id}">${esc(l.product)} <small>from ${esc(D.organs[l.organ].name)}</small></button>`).join(' ')}</p>` : ''}
    <p class="fine">${Object.entries(KCOL).map(([n, c]) => `<span style="color:${css(c)}">●</span> ${esc(n)}`).join(' · ')}</p>`;
  $('#bf-org').querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => openLink(b.dataset.l)));
}
export function openLink(id) {
  const l = F.byId[id]; if (!l) return; F.link = l;
  const roles = { [l.organ]: 'src' }; l.targets.forEach((t) => { if (!roles[t.organ]) roles[t.organ] = 'tgt'; });
  show(roles, l.targets.map((t) => [l.organ, t.organ, KCOL[l.kind]]), l.product);
  const host = $('#bf-org') || $('#bf-body');
  const step = (n, h, body) => `<li class="bf-step"><span class="bf-n">${n}</span><div><b>${h}</b>${body}</div></li>`;
  host.innerHTML = `<p><a href="#" id="bf-back">← ${esc(D.organs[l.organ].name)}</a></p><h3 class="st-h">${esc(l.product)} <small style="color:${css(KCOL[l.kind])}">${esc(l.kind)}</small></h3>
    <canvas id="bf-cell" width="640" height="230" class="bf-cell"></canvas>
    <ol class="bf-steps">
      ${step(1, `Stimulus: ${esc(l.stim.label)}`, quotes(l.stim.quotes))}
      ${step(2, `Made by: ${organBtn(l.organ)} → ${esc(l.tissue)} → ${esc(l.cell)}`, quotes(l.cell_quotes))}
      ${step(3, `Released into: ${esc(l.route)}`, '<p class="fine muted">Route as the textbook names it; the 3D arc is schematic.</p>')}
      ${step(4, 'Acts on', l.targets.map((t) => `<div class="bf-t"><b>${organBtn(t.organ)}</b>: ${esc(t.effect)}${quotes(t.quotes)}</div>`).join(''))}
      ${l.fb ? step(5, `Feedback: ${esc(l.fb.label)}`, quotes(l.fb.quotes)) : ''}
      ${l.fate ? step(l.fb ? 6 : 5, `What happens to it after: ${esc(l.fate.label)}`, quotes(l.fate.quotes)) : ''}
    </ol>`;
  $('#bf-back').onclick = (e) => { e.preventDefault(); organ(l.organ); };
  host.querySelectorAll('[data-org]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); organs($('#bf-body'), a.dataset.org); }));
  cellAnim(l);
}

// the cell-level drawing: stimulus -> secreting cell (vesicles fuse, product leaves) -> route -> target cell receptors -> effect,
// with the feedback arc back to the source. A teaching diagram; shapes and timing are not to scale.
function cellAnim(l) {
  cancelAnimationFrame(F.cellRaf);
  const cv = $('#bf-cell'); if (!cv) return; const g = cv.getContext('2d'), W = cv.width, H = cv.height, col = css(KCOL[l.kind]);
  const neg = l.fb && /negative|inhibit|lower|suppress|reduce|falls|stops/i.test(l.fb.label), route = l.route;
  const sx = 150, tx = 500, cy = 120;
  const draw = (t) => {
    if (!document.body.contains(cv)) return;
    g.clearRect(0, 0, W, H); g.fillStyle = '#060b18'; g.fillRect(0, 0, W, H);
    g.font = '12px system-ui'; g.textAlign = 'center';
    // stimulus arrow
    const pulse = (t / 900) % 1;
    g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.beginPath(); g.moveTo(14, cy); g.lineTo(70, cy); g.stroke(); g.beginPath(); g.moveTo(70, cy - 7); g.lineTo(80, cy); g.lineTo(70, cy + 7); g.fill();
    g.fillStyle = '#ffd166'; wrap(g, l.stim.label, 46, 40, 90, 13);
    // route band
    const blood = /blood/.test(route), duct = /duct|lumen|surface/.test(route), syn = /synapse/.test(route);
    g.fillStyle = blood ? 'rgba(200,40,60,0.28)' : duct ? 'rgba(90,200,120,0.18)' : syn ? 'rgba(199,125,255,0.15)' : 'rgba(76,201,240,0.15)';
    g.fillRect(sx + 60, cy - 26, tx - sx - 120, 52); g.fillStyle = '#9fb3c8'; g.fillText(route.length > 46 ? route.slice(0, 44) + '…' : route, (sx + tx) / 2, cy + 44);
    // secreting cell
    cell(g, sx, cy, SRC, l.cell);
    // vesicles moving to the membrane and particles leaving
    for (let i = 0; i < 5; i++) { const p = ((t / 1400) + i / 5) % 1; const x = sx - 20 + p * 70, y = cy - 22 + (i % 3) * 20; g.fillStyle = col; g.globalAlpha = p < 0.85 ? 1 : (1 - p) / 0.15; g.beginPath(); g.arc(Math.min(x, sx + 52), y, p < 0.8 ? 5 : 3, 0, 7); g.fill(); g.globalAlpha = 1; }
    for (let i = 0; i < 14; i++) { const p = ((t / 2200) + i / 14) % 1; const x = sx + 56 + p * (tx - sx - 112), y = cy + Math.sin(p * 9 + i) * 14; g.fillStyle = col; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    // target cell with receptors
    cell(g, tx, cy, TGT, D.organs[l.targets[0]?.organ]?.name || 'target');
    for (let i = -2; i <= 2; i++) { const y = cy + i * 15, x = tx - 54; g.strokeStyle = '#cfe6ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x, y); g.moveTo(x, y); g.lineTo(x - 5, y - 5); g.moveTo(x, y); g.lineTo(x - 5, y + 5); g.stroke(); }
    // effect
    g.fillStyle = '#4cc9f0'; g.textAlign = 'center'; wrap(g, l.targets.map((x) => x.effect).slice(0, 2).join(' · '), tx, 22, 250, 13);
    // feedback arc
    if (l.fb) {
      g.strokeStyle = neg ? '#ff5d73' : '#5be37d'; g.setLineDash([6, 6]); g.lineDashOffset = -t / 40; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, cy + 58); g.quadraticCurveTo((sx + tx) / 2, H + 40, sx, cy + 58); g.stroke(); g.setLineDash([]);
      g.fillStyle = neg ? '#ff5d73' : '#5be37d'; g.fillText(neg ? '− feedback' : '+ feedback', (sx + tx) / 2, H - 10);
    }
    g.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(pulse * Math.PI)); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(sx - 62, cy, 6, 0, 7); g.fill(); g.globalAlpha = 1;
    F.cellRaf = requestAnimationFrame(draw);
  };
  F.cellRaf = requestAnimationFrame(draw);
}
function cell(g, x, y, hex, name) {
  g.fillStyle = `${css(hex)}33`; g.strokeStyle = css(hex); g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, 58, 50, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = `${css(hex)}aa`; g.beginPath(); g.ellipse(x - 10, y + 4, 16, 13, 0, 0, 7); g.fill();
  g.fillStyle = '#e8f1ff'; g.textAlign = 'center'; wrap(g, name, x, y + 72, 160, 13);
}
function wrap(g, text, x, y, w, lh) { const words = String(text).split(' '); let line = '', yy = y; for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (g.measureText(t).width > w && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = t; } g.fillText(line, x, yy); }

function two(B) {
  const ks = Object.keys(D.organs).sort((a, b) => D.organs[a].name.localeCompare(D.organs[b].name));
  const opt = (v) => ks.map((k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(D.organs[k].name)}</option>`).join('');
  B.innerHTML = `<p class="fine">Pick two organs: direct signals each way, and two-step routes through a third organ.</p>
    <div class="bar"><select id="bf-a">${opt('pancreas')}</select> ⇄ <select id="bf-b">${opt('liver')}</select></div><div id="bf-two"></div>`;
  const go = () => {
    const a = $('#bf-a').value, b = $('#bf-b').value;
    const dir = (x, y) => D.links.filter((l) => l.organ === x && l.targets.some((t) => t.organ === y));
    const ab = dir(a, b), ba = dir(b, a);
    const hop = (x, y) => { const r = []; for (const l1 of D.links.filter((l) => l.organ === x)) for (const t of l1.targets) if (t.organ !== x && t.organ !== y) for (const l2 of dir(t.organ, y)) if (l2.id !== l1.id) r.push([l1, t.organ, l2]); return r; };
    const via = hop(a, b), viaR = hop(b, a);
    const roles = { [a]: 'src', [b]: 'src' }, flows = [];
    ab.forEach((l) => flows.push([a, b, KCOL[l.kind]])); ba.forEach((l) => flows.push([b, a, KCOL[l.kind]]));
    [...via.map((v) => [...v, b]), ...viaR.map((v) => [...v, a])].slice(0, 8).forEach(([l1, x, l2, y]) => { roles[x] ||= 'tgt'; flows.push([l1.organ, x, KCOL[l1.kind]], [x, y, KCOL[l2.kind]]); });
    show(roles, flows, `${D.organs[a].name} ⇄ ${D.organs[b].name}`);
    const li = (l, y) => { const t = l.targets.find((x) => x.organ === y); return `<li><button class="ghost-btn bf-p" data-l="${l.id}" style="border-color:${css(KCOL[l.kind])}">${esc(l.product)}</button> ${esc(t.effect)}${quotes(t.quotes.slice(0, 1))}</li>`; };
    const vli = ([l1, x, l2], y) => `<li><button class="ghost-btn bf-p" data-l="${l1.id}">${esc(l1.product)}</button> → ${esc(D.organs[x].name)} → <button class="ghost-btn bf-p" data-l="${l2.id}">${esc(l2.product)}</button> → ${esc(D.organs[y].name)}</li>`;
    $('#bf-two').innerHTML = `<h3 class="st-h">${esc(D.organs[a].name)} → ${esc(D.organs[b].name)}</h3>${ab.length ? `<ul class="bf-list">${ab.map((l) => li(l, b)).join('')}</ul>` : '<p class="fine muted">No direct signal in this map.</p>'}
      <h3 class="st-h">${esc(D.organs[b].name)} → ${esc(D.organs[a].name)}</h3>${ba.length ? `<ul class="bf-list">${ba.map((l) => li(l, a)).join('')}</ul>` : '<p class="fine muted">No direct signal in this map.</p>'}
      ${via.length || viaR.length ? `<h3 class="st-h">Two-step routes</h3><ul class="bf-list">${via.map((v) => vli(v, b)).join('')}${viaR.map((v) => vli(v, a)).join('')}</ul>` : ''}`;
    $('#bf-two').querySelectorAll('[data-l]').forEach((x) => (x.onclick = () => { document.querySelector('[data-bt=org]').click(); organ(F.byId[x.dataset.l].organ); openLink(x.dataset.l); }));
  };
  $('#bf-a').onchange = go; $('#bf-b').onchange = go; go();
}

const DIR = { '+': ['↑', 'rises', '#5be37d'], '-': ['↓', 'falls', '#ff5d73'], o: ['●', 'active', '#9fb3c8'] };
function states(B, sel) {
  B.innerHTML = `<div class="bar">${D.states.map((s) => `<button class="chip-btn ${s.id === sel ? 'on' : ''}" data-s="${s.id}">${esc(s.label)}</button>`).join('')}</div><div id="bf-st"></div>`;
  B.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => state(b.dataset.s)));
  state(sel || D.states[0].id);
}
function state(id, compact = false) {
  document.querySelectorAll('#bf-body [data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === id));
  const s = D.states.find((x) => x.id === id), roles = {}, flows = [];
  s.items.forEach((it) => { const l = F.byId[it.link]; if (it.dir === '-') return; roles[l.organ] = 'src'; l.targets.forEach((t) => { roles[t.organ] ||= 'tgt'; flows.push([l.organ, t.organ, KCOL[l.kind]]); }); });
  show(roles, flows, s.label);
  const q = s.items.filter((i) => i.quotes.length).length;
  ($('#bf-st') || $('#bf-body')).innerHTML = `<h3 class="st-h">${esc(s.label)} <small>${q} of ${s.items.length} directions quoted</small></h3>${compact ? '' : quotes(s.quotes)}
    <ul class="bf-list">${s.items.map((it) => { const l = F.byId[it.link], d = DIR[it.dir]; return `<li><b style="color:${d[2]}">${d[0]}</b> <button class="ghost-btn bf-p" data-l="${l.id}" style="border-color:${css(KCOL[l.kind])}">${esc(l.product)}</button> <small>${esc(D.organs[l.organ].name)} · ${d[1]}</small>${compact ? '' : quotes(it.quotes)}</li>`; }).join('')}</ul>
    <p class="fine muted">Flows show what is released in this state (↑ and ●); ↓ items are listed but not drawn. Directions without a quote come from the textbook skeleton only.</p>`;
  document.querySelectorAll('#bf-body .bf-list [data-l]').forEach((x) => (x.onclick = () => { stopDay(); document.querySelector('[data-bt=org]').click(); organ(F.byId[x.dataset.l].organ); openLink(x.dataset.l); }));
}
function day(B) {
  B.innerHTML = `<p class="fine">An example day, played in order (about 7 s per period). The clock times are an illustration of order only, not measured timing.</p>
    <div class="bar"><button class="primary small" id="bf-play">▶ Play the day</button><span class="mono big" id="bf-clock">--:--</span></div>
    <div class="bf-day">${D.day.map((d, i) => `<button class="ghost-btn" data-di="${i}"><b>${esc(d.time)}</b> ${esc(D.states.find((s) => s.id === d.state).label)}</button>`).join('')}</div><div id="bf-st"></div>`;
  const at = (i) => { F.dayI = i; const d = D.day[i]; $('#bf-clock').textContent = d.time; B.querySelectorAll('[data-di]').forEach((b) => b.classList.toggle('on', +b.dataset.di === i)); state(d.state, true); };
  B.querySelectorAll('[data-di]').forEach((b) => (b.onclick = () => { stopDay(); at(+b.dataset.di); }));
  $('#bf-play').onclick = () => { if (F.day) { stopDay(); return; } $('#bf-play').textContent = '■ Stop'; let i = 0; at(0); F.day = setInterval(() => { i = (i + 1) % D.day.length; at(i); }, 7000); };
}
function stopDay() { if (F.day) { clearInterval(F.day); F.day = null; const b = $('#bf-play'); if (b) b.textContent = '▶ Play the day'; } }
window.__bf = F;
