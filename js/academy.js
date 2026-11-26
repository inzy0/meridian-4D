// Imaging Academy tab: learn to read images step by step. Ultrasound foundations -> MSK ultrasound identification ->
// ultrasound-guided injections (with the target structures in the 3D Atlas) -> DEXA interpretation (interactive
// T-score / Z-score scale) -> other scans -> microscopy (microbiology, virology, staining).
// Text: whole sentences quoted unchanged, chosen by the chapters' own sections (data/anatomy_lab/academy/academy.json,
// tools/academy_build.py); drug and dose sentences are never shown. Images: Wikimedia Commons files whose own licence
// is public domain, CC0, CC BY or CC BY-SA, captioned with author and licence (tools/academy_images_pull.py).
// Education only: procedures are performed by trained, authorised clinicians.

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LEVELS = [['basics', 'Ultrasound foundations', '🔊'], ['msk', 'MSK ultrasound: identify', '🦴'], ['joints', 'MSK by joint: images & videos', '🎞️'], ['inj', 'Ultrasound-guided injections', '💉'], ['dexa', 'DEXA: bone density', '🩻'],
  ['scans', 'Other scans', '🧲'], ['micro', 'Microscopy: microbes, viruses, stains', '🔬']];
const PARTS = [['intro', 'What it is'], ['anatomy', 'Anatomy'], ['indications', 'When it is used'], ['contra', 'When not to'], ['technique', 'Technique (ultrasound first)'], ['complications', 'Complications'], ['significance', 'Clinical significance']];
const SITES = [['spine', 'Lumbar spine (L1–L4)', ['first lumbar vertebra', 'second lumbar vertebra', 'third lumbar vertebra', 'fourth lumbar vertebra']], ['hip', 'Hip / femoral neck', ['left femur', 'right femur']], ['forearm', 'Forearm (one-third radius)', ['left radius', 'right radius']]];
const MICRO_IMG = { gram: 'gram', acid: 'acid', endo: 'endo', caps: 'caps', fungi: 'fungi', para: 'para', virus: 'virus', em: 'virus', bright: 'blood' };
let D = null, IMG = {}, MSK = [], GUIDES = {}, lv = 'basics', sel = null, prog = {}, joint = 'shoulder', cond = '';
const JOINTS = [['shoulder', 'Shoulder', '🫱'], ['elbow', 'Elbow', '💪'], ['wrist_hand', 'Wrist & hand', '✋'], ['hip', 'Hip', '🦵'], ['knee', 'Knee', '🦿'], ['ankle_foot', 'Ankle & foot', '🦶'], ['spine_other', 'Spine, muscle & nerve', '🧬']];
const CONDS = ['normal', 'tear', 'tendinopathy', 'effusion', 'bursitis', 'cyst', 'calcific', 'nerve', 'fasciitis', 'injection', 'fracture'];
const myGuides = () => { try { return JSON.parse(localStorage.getItem('ac-guides') || '{}') || {}; } catch { return {}; } };
const saveGuides = (g) => { try { localStorage.setItem('ac-guides', JSON.stringify(g)); } catch { /* storage blocked */ } };
const loadProg = () => { try { return JSON.parse(localStorage.getItem('ac-progress') || '{}') || {}; } catch { return {}; } };
const saveProg = () => { try { localStorage.setItem('ac-progress', JSON.stringify(prog)); } catch { /* storage blocked */ } };

export async function startAcademy() {
  const host = $('#academy-body'); if (!host) return;
  if (!D) {
    [D, IMG, MSK, GUIDES] = await Promise.all([fetch('/meridian-4D/rt/academy/academy.json').then((r) => r.json()).catch(() => null), fetch('/meridian-4D/rt/academy/img/images.json').then((r) => r.json()).catch(() => ({})),
      fetch('/meridian-4D/rt/academy/msk_media.json').then((r) => r.json()).catch(() => []), fetch('/meridian-4D/rt/academy/guides.json').then((r) => r.json()).catch(() => ({}))]);
    if (!D) { host.innerHTML = '<p class="muted">Imaging Academy data not built (tools/academy_build.py).</p>'; return; }
    prog = loadProg();
  }
  const [, l, s] = location.hash.slice(1).split('/');
  if (l && LEVELS.some((x) => x[0] === l)) { lv = l; sel = s || null; }
  render(host);
}

const cite = (x) => `<span class="cite">${esc(x.src)}, “<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>”${x.sec ? `, ${esc(x.sec)}` : ''} · ${esc(x.lic)}</span>`;
const quote = (x) => `<blockquote class="ac-q">${esc(x.text)}<br>${cite(x)}</blockquote>`;
const done = (k) => prog[k] ? 'done' : '';
function gallery(group, n = 8) {
  const im = (IMG[group] || []).slice(0, n); if (!im.length) return '';
  return `<div class="ac-gal">${im.map((m, i) => `<figure class="ac-fig" data-g="${group}" data-i="${i}"><img src="/meridian-4D/rt/academy/img/${esc(m.file)}" alt="${esc(m.title)}" loading="lazy"><figcaption>${esc(m.title.replace(/\.(jpe?g|png|gif)$/i, ''))}<br><small>${esc(m.author || m.credit || 'unknown author')} · ${esc(m.licence)}</small></figcaption></figure>`).join('')}</div>`;
}
function show3d(names, title) {
  if (!names?.length) return;
  const req = { names, atRisk: [], title }; // kept locally: the atlas may consume window.__pendingAtlas first
  window.__pendingAtlas = req;
  location.hash = '#atlas';
  const go = () => { if (window.__atlas?.clinical) window.__atlas.clinical(req); else if (window.__atlas?.select) window.__atlas.select(names[0]); else setTimeout(go, 300); };
  go();
}

function render(host) {
  const total = D.msk.length + D.injections.length + D.micro.length + 4 + JOINTS.length, nDone = Object.values(prog).filter(Boolean).length;
  host.innerHTML = `<section class="card ac-hero"><div class="card-h"><h2>🎓 Imaging Academy</h2><small>${D.counts.quotes} quoted sentences · ${Object.values(IMG).reduce((a, v) => a + v.length, 0)} licensed images · progress ${nDone}/${total}</small></div>
    <p>From how an ultrasound picture is made, to recognising tendons, tears and effusions, to the steps of guided injections, reading a DEXA report, the other scans, and the microbes and viruses seen under the microscope. Mark topics done as you go; use ✏ Draw to annotate any image.</p>
    <div class="ac-path">${LEVELS.map(([k, n, ic], i) => `<button class="ac-lv ${k === lv ? 'on' : ''}" data-lv="${k}"><span>${ic}</span><b>${i + 1}. ${esc(n)}</b></button>`).join('')}</div>
    <div class="ac-bar"><i style="width:${(nDone / total * 100).toFixed(1)}%"></i></div></section>
  <section class="card" id="ac-main"></section>
  <p class="fine">${esc(D.method)} Built ${esc(D.built)}. Education only: injections and blocks are performed by trained, authorised clinicians under their protocols; drug choices and doses are not shown. See also the <a href="#imaging">Imaging</a> tab (X-ray, CT, MRI, fMRI galleries, MRI studio and the Microscopy lab).</p>`;
  host.querySelectorAll('[data-lv]').forEach((b) => (b.onclick = () => { lv = b.dataset.lv; sel = null; hash(); render(host); }));
  ({ basics, msk, joints, inj, dexa, scans, micro })[lv]();
  bindFigs(host);
}
function hash() { const h = `#academy/${lv}${sel ? `/${sel}` : ''}`; if (location.hash !== h) history.replaceState(null, '', h); }
function markBtn(k) { return `<button class="ghost-btn tiny ac-mark ${done(k)}" data-mark="${esc(k)}">${prog[k] ? '✓ done' : 'mark as done'}</button>`; }
function bindMarks(el) { el.querySelectorAll('[data-mark]').forEach((b) => (b.onclick = () => { prog[b.dataset.mark] = !prog[b.dataset.mark]; saveProg(); render($('#academy-body')); })); }

function basics() {
  const el = $('#ac-main');
  el.innerHTML = `<div class="card-h"><h2>🔊 Ultrasound foundations</h2>${markBtn('basics')}</div>${D.basics.map(quote).join('')}
    <h3>What MSK ultrasound looks like</h3>${gallery('us_msk', 6) || '<p class="fine">Images loading or not available.</p>'}
    <p class="fine">Next: <button class="ghost-btn tiny" data-lv2="msk">MSK ultrasound: identify →</button></p>`;
  bindMarks(el); el.querySelector('[data-lv2]').onclick = () => { lv = 'msk'; hash(); render($('#academy-body')); };
}
function list(items, key) {
  return `<div class="ac-list">${items.map((x) => `<button class="ac-it ${x.id === sel ? 'on' : ''} ${done(`${key}:${x.id}`)}" data-sel="${x.id}">${prog[`${key}:${x.id}`] ? '✓ ' : ''}${esc(x.title)}${x.us === false ? ' <small>(landmark / fluoroscopy)</small>' : ''}</button>`).join('')}</div>`;
}
function msk() {
  const el = $('#ac-main'); const x = D.msk.find((m) => m.id === sel) || D.msk[0]; sel = x.id;
  el.innerHTML = `<div class="card-h"><h2>🦴 MSK ultrasound: identify the condition</h2><small>${D.msk.length} conditions</small></div>${list(D.msk, 'msk')}
    <article class="ac-art"><div class="card-h"><h3>${esc(x.title)}</h3><span>${x.structures.length ? `<button class="ghost-btn tiny" data-3d>Show in 3D: ${esc(x.structures.slice(0, 3).join(', '))}</button> ` : ''}${markBtn(`msk:${x.id}`)}</span></div>
      ${x.intro.map(quote).join('')}<h4>On ultrasound</h4>${x.us.length ? x.us.map(quote).join('') : '<p class="ac-nq">No sentence in this chapter describes the ultrasound picture.</p>'}
      <p class="fine"><a href="${esc(x.url)}" target="_blank" rel="noopener">Full chapter</a> · 3D structures are the atlas names found in the chapter text.</p></article>`;
  bindMarks(el); el.querySelectorAll('[data-sel]').forEach((b) => (b.onclick = () => { sel = b.dataset.sel; hash(); msk(); }));
  const b3 = el.querySelector('[data-3d]'); if (b3) b3.onclick = () => show3d(x.structures, x.title);
}
function inj() {
  const el = $('#ac-main'); const usFirst = [...D.injections].sort((a, b) => Number(b.us) - Number(a.us));
  const x = D.injections.find((m) => m.id === sel) || usFirst[0]; sel = x.id;
  el.innerHTML = `<div class="card-h"><h2>💉 Ultrasound-guided injections and aspirations</h2><small>${D.injections.length} procedures · ${D.injections.filter((i) => i.us).length} mention ultrasound guidance</small></div>
    <p class="ac-warn">For clinicians in training: these steps are quoted for learning and are performed only by trained, authorised clinicians, with consent, sterile technique and local protocols. Drug choices and doses are left out.</p>
    ${list(usFirst, 'inj')}
    <article class="ac-art"><div class="card-h"><h3>${esc(x.title)}</h3><span>${x.structures?.length ? `<button class="ghost-btn tiny" data-3d>Target in 3D: ${esc(x.structures.slice(0, 3).join(', '))}</button> ` : ''}${markBtn(`inj:${x.id}`)}</span></div>
      <div class="ac-steps">${PARTS.map(([k, n], i) => `<details class="ac-st" ${i < 2 || k === 'technique' ? 'open' : ''}><summary><span class="ac-n">${i + 1}</span> ${n} <small>${(x.parts[k] || []).length}</small></summary>
        ${(x.parts[k] || []).length ? x.parts[k].map(quote).join('') : '<p class="ac-nq">No quote in this section.</p>'}</details>`).join('')}</div>
      <p class="fine"><a href="${esc(x.url)}" target="_blank" rel="noopener">Full chapter (StatPearls)</a> for images, positions and the complete technique.</p></article>
    <h3>Guided needle on ultrasound</h3>${gallery('us_msk', 8)}`;
  bindMarks(el); el.querySelectorAll('[data-sel]').forEach((b) => (b.onclick = () => { sel = b.dataset.sel; hash(); inj(); }));
  const b3 = el.querySelector('[data-3d]'); if (b3) b3.onclick = () => show3d(x.structures, x.title);
  bindFigs(el);
}
function dexa() {
  const el = $('#ac-main');
  const who = D.dexa.find((q) => /World Health Organization/.test(q.text) && /-2\.5/.test(q.text)) || D.dexa[0];
  const zq = D.dexa.find((q) => /Z-score of -2\.0/.test(q.text) || /Z-score of ≤-2\.0/.test(q.text));
  el.innerHTML = `<div class="card-h"><h2>🩻 DEXA: reading bone density</h2>${markBtn('dexa')}</div>
    <div class="ac-dexa">
      <div><h3>The T-score scale</h3>
        <div class="ac-scale" id="ac-scale"><div class="z os">osteoporosis<br><small>≤ −2.5</small></div><div class="z op">osteopenia<br><small>−1.0 to −2.5</small></div><div class="z ok">normal<br><small>≥ −1.0</small></div><i id="ac-pin"></i></div>
        <div class="ac-ticks">${[-4, -3, -2.5, -2, -1, 0, 1, 2].map((t) => `<span style="left:${((t + 4) / 6 * 100).toFixed(1)}%">${t}</span>`).join('')}</div>
        <label>Example T-score <input id="ac-t" type="range" min="-4" max="2" step="0.1" value="-1.8"> <b id="ac-tv">−1.8</b></label>
        <p id="ac-cat" class="ac-cat"></p>
        <label class="ac-chk"><input type="checkbox" id="ac-young"> younger than 50 (the source says Z-scores are used instead)</label>
        <p class="fine">A learning scale with example values, using the WHO thresholds in the quote below. Reading a real report, and any decision about it, belongs with a clinician.</p></div>
      <div><h3>Where it is measured</h3><div class="ac-sites">${SITES.map(([k, n]) => `<button class="ac-site" data-site="${k}">${esc(n)} <small>show in 3D</small></button>`).join('')}</div>
        ${gallery('dexa', 4)}</div>
    </div>
    <h3>From the sources</h3>${quote(who)}${zq ? quote(zq) : ''}${D.dexa.filter((q) => q !== who && q !== zq).map(quote).join('')}`;
  const t = el.querySelector('#ac-t'), yb = el.querySelector('#ac-young');
  const upd = () => {
    const v = Number(t.value); el.querySelector('#ac-tv').textContent = v.toFixed(1).replace('-', '−');
    el.querySelector('#ac-pin').style.left = `${((v + 4) / 6 * 100).toFixed(1)}%`;
    const young = yb.checked;
    el.querySelector('#ac-cat').innerHTML = young
      ? `As a <b>Z-score</b>: ${v <= -2 ? '<b class="r">at or below −2.0</b>, the level the source describes for younger people (with a major risk factor or fragility fracture)' : '<b>above −2.0</b>'}.`
      : `T-score ${v.toFixed(1).replace('-', '−')} falls in the WHO band: <b class="${v <= -2.5 ? 'r' : v < -1 ? 'a' : 'g'}">${v <= -2.5 ? 'osteoporosis' : v < -1 ? 'osteopenia (low bone mass)' : 'normal'}</b>.`;
  };
  t.oninput = upd; yb.onchange = upd; upd();
  el.querySelectorAll('[data-site]').forEach((b) => (b.onclick = () => { const s = SITES.find((x) => x[0] === b.dataset.site); show3d(s[2], `DEXA site: ${s[1]}`); }));
  bindMarks(el); bindFigs(el);
}
function scans() {
  const el = $('#ac-main');
  el.innerHTML = `<div class="card-h"><h2>🧲 Other scans</h2>${markBtn('scans')}</div>
    <div class="ac-scans">${D.scans.map((s) => `<details class="ac-st" open><summary><b>${esc(s.name)}</b> <small>${s.quotes.length}</small></summary>${s.quotes.map(quote).join('')}</details>`).join('')}</div>
    <p>Practise on real images in the <a href="#imaging">Imaging tab</a>: X-ray, CT, MRI and fMRI galleries, the MRI organ explorer and the Microscopy lab.</p>`;
  bindMarks(el);
}
function micro() {
  const el = $('#ac-main'); const x = D.micro.find((m) => m.id === sel) || D.micro[0]; sel = x.id;
  el.innerHTML = `<div class="card-h"><h2>🔬 Microscopy: microbes, viruses and stains</h2><small>OpenStax Microbiology · StatPearls</small></div>
    ${list(D.micro.map((m) => ({ id: m.id, title: m.name })), 'micro')}
    <article class="ac-art"><div class="card-h"><h3>${esc(x.name)}</h3>${markBtn(`micro:${x.id}`)}</div>
      ${x.quotes.length ? x.quotes.map(quote).join('') : '<p class="ac-nq">No quote found.</p>'}
      ${gallery(MICRO_IMG[x.id] || x.id, 8)}</article>
    <details class="ac-st"><summary><b>Staining in the lab (StatPearls)</b></summary>${D.stains.map(quote).join('')}</details>
    <p class="fine">More cell and tissue images with labels: the <a href="#imaging">Microscopy lab</a> (blood smears, H&amp;E pathology, tissue).</p>`;
  bindMarks(el); el.querySelectorAll('[data-sel]').forEach((b) => (b.onclick = () => { sel = b.dataset.sel; hash(); micro(); }));
  bindFigs(el);
}

// image viewer: zoom (wheel / buttons), pan (drag), brightness, contrast, invert; caption with author and licence
function bindFigs(root) {
  root.querySelectorAll('.ac-fig[data-g]').forEach((f) => (f.onclick = () => mediaViewer((IMG[f.dataset.g] || []).map(commonsItem), Number(f.dataset.i))));
  root.querySelectorAll('.ac-fig[data-m]').forEach((f) => (f.onclick = () => { const list = JSON.parse(f.closest('[data-mlist]').dataset.mlist).map((i) => mskItem(MSK[i])); mediaViewer(list, Number(f.dataset.m)); }));
}
const commonsItem = (m) => ({ key: m.file, kind: 'image', src: `/meridian-4D/rt/academy/img/${m.file}`, title: m.title, caption: m.description,
  credit: `${esc(m.author || '')}${m.credit ? ` · ${esc(m.credit)}` : ''} · <a href="${esc(m.licence_url || m.page)}" target="_blank" rel="noopener">${esc(m.licence)}</a> · <a href="${esc(m.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>` });
const mskItem = (m) => ({ key: m.file, kind: m.kind, src: `/meridian-4D/rt/academy/${m.file}`, title: `${m.label || 'Figure'} · ${m.title}`, caption: m.caption,
  credit: `${esc(m.journal)} ${esc(m.year)} · <a href="https://pmc.ncbi.nlm.nih.gov/articles/${esc(m.pmcid)}/" target="_blank" rel="noopener">${esc(m.pmcid)}</a> · <a href="${esc(m.lic_url)}" target="_blank" rel="noopener">${esc(m.lic)}</a> · caption quoted unchanged; arrows and labels are the authors'${m.reencoded ? ` · ${esc(m.reencoded)}` : ''}` });

function joints() {
  const el = $('#ac-main');
  const inJ = MSK.map((m, i) => [m, i]).filter(([m]) => (m.joints || [m.joint]).includes(joint));
  const shown = inJ.filter(([m]) => !cond || m.tags.includes(cond));
  const cnt = (j) => MSK.filter((m) => (m.joints || [m.joint]).includes(j)).length;
  el.innerHTML = `<div class="card-h"><h2>🎞️ MSK ultrasound by joint</h2><small>${MSK.filter((m) => m.kind === 'image').length} figures · ${MSK.filter((m) => m.kind === 'video').length} videos · open-access articles</small></div>
    <p class="fine">Figures from open-access ultrasound papers (PMC Open Access, licence per article). Each caption is quoted unchanged and becomes the guide: open a figure, step through its parts, add your own markers, then quiz yourself.</p>
    <div class="ac-joints">${JOINTS.map(([k, n, ic]) => `<button class="ac-jt ${k === joint ? 'on' : ''}" data-j="${k}"><span>${ic}</span>${n}<small>${cnt(k)}</small></button>`).join('')}</div>
    <div class="ac-list"><button class="ac-it ${cond ? '' : 'on'}" data-c="">all</button>${CONDS.map((c) => { const n = inJ.filter(([m]) => m.tags.includes(c)).length; return n ? `<button class="ac-it ${cond === c ? 'on' : ''}" data-c="${c}">${c} <small>${n}</small></button>` : ''; }).join('')}</div>
    <div class="ac-gal big" data-mlist="${esc(JSON.stringify(shown.map(([, i]) => i)))}">${shown.map(([m, i], k) => `<figure class="ac-fig" data-m="${k}">${m.kind === 'video' ? `<video src="/meridian-4D/rt/academy/${esc(m.file)}#t=0.5" preload="metadata" muted></video><span class="ac-play">▶</span>` : `<img src="/meridian-4D/rt/academy/${esc(m.file)}" alt="${esc(m.label)}" loading="lazy">`}
      <figcaption><b>${esc(m.label || (m.kind === 'video' ? 'Video' : 'Figure'))}</b> ${m.tags.map((t) => `<span class="ac-tag">${t}</span>`).join('')}<br>${esc(m.caption.slice(0, 140))}${m.caption.length > 140 ? '…' : ''}${(GUIDES[m.file] || myGuides()[m.file])?.length ? '<br><small>📍 guided</small>' : ''}</figcaption></figure>`).join('') || '<p class="ac-nq">No figures for this joint and filter yet.</p>'}</div>
    <p class="fine">${markBtn(`joint:${joint}`)} · Conditions in words: <button class="ghost-btn tiny" data-lv2="msk">MSK ultrasound: identify →</button></p>`;
  el.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => { joint = b.dataset.j; cond = ''; joints(); bindFigs(el); }));
  el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { cond = b.dataset.c; joints(); bindFigs(el); }));
  el.querySelector('[data-lv2]').onclick = () => { lv = 'msk'; hash(); render($('#academy-body')); };
  bindMarks(el); bindFigs(el);
}

// guided viewer: zoom / pan / brightness / contrast; caption steps; markers (yours, or published) with tour and quiz
function mediaViewer(list, i) {
  let k = i, z = 1, x = 0, y = 0, br = 100, ct = 100, inv = 0, mode = 'view', step = -1, edit = false;
  const d = document.createElement('dialog'); d.className = 'ac-dlg'; document.body.appendChild(d);
  const marks = () => { const m = list[k]; const mine = myGuides()[m.key]; return mine?.length ? mine : (GUIDES[m.key] || []); };
  const steps = (cap) => { const parts = String(cap || '').split(/(?=\b[A-H]\.\s)|(?=\([a-h]\)\s)|(?<=\.)\s+(?=[A-Z])/).map((t) => t.trim()).filter((t) => t.length > 2); return parts.length ? parts : [cap]; };
  const tf = () => `translate(${x}px,${y}px) scale(${z})`;
  const draw = () => {
    const m = list[k], mk = marks(), st = steps(m.caption);
    d.innerHTML = `<div class="ac-vh"><b>${esc(m.title)}</b><span>${k + 1}/${list.length}</span><button class="ghost-btn tiny" data-v="prev">◀</button><button class="ghost-btn tiny" data-v="next">▶</button>
      ${m.kind === 'image' ? `<button class="ghost-btn tiny" data-v="in">＋</button><button class="ghost-btn tiny" data-v="out">－</button><button class="ghost-btn tiny" data-v="reset">1:1</button>
      <label>brightness <input type="range" min="40" max="200" value="${br}" data-f="br"></label><label>contrast <input type="range" min="40" max="250" value="${ct}" data-f="ct"></label><label><input type="checkbox" data-f="inv" ${inv ? 'checked' : ''}> invert</label>` : '<label>speed <select data-f="rate"><option>0.25</option><option>0.5</option><option selected>1</option><option>1.5</option><option>2</option></select></label><label><input type="checkbox" data-f="loop" checked> loop</label>'}
      <button class="ghost-btn tiny" data-v="close">✕</button></div>
      <div class="ac-vg">
        <div class="ac-vw">${m.kind === 'video' ? `<video src="${esc(m.src)}" controls autoplay loop muted playsinline></video>` : `<div class="ac-stage" style="transform:${tf()}"><img src="${esc(m.src)}" alt="${esc(m.title)}" style="filter:brightness(${br}%) contrast(${ct}%) invert(${inv})">
          ${mk.map((p, j) => `<div class="ac-mk ${step === j && mode === 'tour' ? 'on' : ''}" style="left:${p.x * 100}%;top:${p.y * 100}%" data-mk="${j}"><b>${j + 1}</b>${mode === 'quiz' && !p.shown ? '' : `<span>${esc(p.label)}</span>`}</div>`).join('')}</div>`}</div>
        <aside class="ac-side">
          <div class="ac-modes"><button class="ghost-btn tiny ${mode === 'view' ? 'on' : ''}" data-mode="view">Caption guide</button>${m.kind === 'image' ? `<button class="ghost-btn tiny ${mode === 'tour' ? 'on' : ''}" data-mode="tour">Marker tour</button><button class="ghost-btn tiny ${mode === 'quiz' ? 'on' : ''}" data-mode="quiz">Quiz</button>` : ''}</div>
          ${mode === 'view' ? `<ol class="ac-cs">${st.map((t, j) => `<li class="${j === step ? 'on' : ''}" data-st="${j}">${esc(t)}</li>`).join('')}</ol><p class="fine"><button class="ghost-btn tiny" data-v="sprev">◀ step</button> <button class="ghost-btn tiny" data-v="snext">step ▶</button></p>` : ''}
          ${mode === 'tour' ? (mk.length ? `<p><b>${step + 1 || 0} / ${mk.length}</b> ${step >= 0 ? esc(mk[step].label) : 'Press next to start.'}</p>${step >= 0 && mk[step].note ? `<p class="fine">${esc(mk[step].note)}</p>` : ''}<p><button class="ghost-btn tiny" data-v="tprev">◀</button> <button class="ghost-btn tiny" data-v="tnext">next ▶</button></p>` : '<p class="fine">No markers yet. Use “Edit markers” to add them.</p>') : ''}
          ${mode === 'quiz' ? (mk.length ? `<p class="fine">Click a numbered marker, say what it is, then click to reveal. ${mk.filter((p) => p.shown).length}/${mk.length} revealed.</p><p><button class="ghost-btn tiny" data-v="qreset">hide all</button></p>` : '<p class="fine">Add markers first.</p>') : ''}
          ${m.kind === 'image' ? `<hr><button class="ghost-btn tiny ${edit ? 'on' : ''}" data-v="edit">${edit ? '✓ Done editing' : '✎ Edit markers'}</button>
            ${edit ? `<p class="fine">Click the image to add a marker. Click a marker to rename or delete it.</p><button class="ghost-btn tiny" data-v="pub">⇪ Publish to site (local app)</button> <button class="ghost-btn tiny" data-v="exp">Export markers</button>` : ''}
            <p class="fine">${myGuides()[m.key]?.length ? 'Showing your markers (saved in this browser).' : GUIDES[m.key]?.length ? 'Showing published markers.' : ''}</p>` : ''}
          <p class="fine">${m.credit}</p>
        </aside></div>`;
    d.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => act(b.dataset.v)));
    d.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; step = -1; draw(); }));
    d.querySelectorAll('[data-st]').forEach((li) => (li.onclick = () => { step = Number(li.dataset.st); draw(); }));
    d.querySelectorAll('[data-f]').forEach((inp) => (inp.oninput = inp.onchange = () => { const f = inp.dataset.f; if (f === 'br') br = Number(inp.value); if (f === 'ct') ct = Number(inp.value); if (f === 'inv') inv = inp.checked ? 1 : 0;
      const v = d.querySelector('video'); if (f === 'rate' && v) v.playbackRate = Number(inp.value); if (f === 'loop' && v) v.loop = inp.checked;
      const im = d.querySelector('.ac-stage img'); if (im) im.style.filter = `brightness(${br}%) contrast(${ct}%) invert(${inv})`; }));
    const vw = d.querySelector('.ac-vw'), stg = d.querySelector('.ac-stage');
    if (stg) {
      vw.onwheel = (e) => { e.preventDefault(); z = Math.max(0.5, Math.min(8, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); stg.style.transform = tf(); };
      vw.onpointerdown = (e) => { if (e.target.closest('.ac-mk')) return; const sx = e.clientX, sy = e.clientY, ox = x, oy = y; let moved = false; try { vw.setPointerCapture(e.pointerId); } catch { /* synthetic or lost pointer */ }
        vw.onpointermove = (m2) => { if (Math.hypot(m2.clientX - sx, m2.clientY - sy) > 4) moved = true; x = ox + m2.clientX - sx; y = oy + m2.clientY - sy; stg.style.transform = tf(); };
        vw.onpointerup = (u) => { vw.onpointermove = null; if (!moved && edit) { const im = stg.querySelector('img').getBoundingClientRect(); const px = (u.clientX - im.left) / im.width, py = (u.clientY - im.top) / im.height;
          if (px >= 0 && px <= 1 && py >= 0 && py <= 1) { const label = prompt('Marker label (e.g. supraspinatus tendon, effusion)'); if (label) { const g = myGuides(); g[m.key] = [...marks(), { x: px, y: py, label, note: '' }]; saveGuides(g); draw(); } } } }; };
      d.querySelectorAll('[data-mk]').forEach((el) => (el.onclick = (e) => { e.stopPropagation(); const j = Number(el.dataset.mk); const g = myGuides(); const arr = [...marks()];
        if (mode === 'quiz') { arr[j] = { ...arr[j], shown: !arr[j].shown }; g[m.key] = arr; saveGuides(g); draw(); return; }
        if (!edit) { if (mode === 'tour') { step = j; draw(); } return; }
        const v = prompt('Rename (empty = delete). Add a note after "|".', `${arr[j].label}${arr[j].note ? ` | ${arr[j].note}` : ''}`);
        if (v === null) return; if (!v.trim()) arr.splice(j, 1); else { const [l, ...n] = v.split('|'); arr[j] = { ...arr[j], label: l.trim(), note: n.join('|').trim() }; }
        g[m.key] = arr; saveGuides(g); draw(); }));
    }
  };
  const flyTo = (p) => { const vw = d.querySelector('.ac-vw'), im = d.querySelector('.ac-stage img'); if (!vw || !im) return; z = 2.4; const w = im.offsetWidth, h = im.offsetHeight; x = -(p.x - 0.5) * w * z; y = -(p.y - 0.5) * h * z; };
  const act = async (v) => {
    const mk = marks(), m = list[k];
    if (v === 'close') return d.close();
    if (v === 'prev' || v === 'next') { k = (k + (v === 'next' ? 1 : -1) + list.length) % list.length; z = 1; x = y = 0; step = -1; }
    if (v === 'in') z = Math.min(8, z * 1.3); if (v === 'out') z = Math.max(0.5, z / 1.3); if (v === 'reset') { z = 1; x = y = 0; }
    if (v === 'snext') step = Math.min(steps(m.caption).length - 1, step + 1); if (v === 'sprev') step = Math.max(0, step - 1);
    if (v === 'tnext' && mk.length) { step = (step + 1) % mk.length; flyTo(mk[step]); }
    if (v === 'tprev' && mk.length) { step = (step - 1 + mk.length) % mk.length; flyTo(mk[step]); }
    if (v === 'qreset') { const g = myGuides(); g[m.key] = mk.map((p) => ({ ...p, shown: false })); saveGuides(g); }
    if (v === 'edit') edit = !edit;
    if (v === 'exp') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(myGuides(), null, 1)], { type: 'application/json' })); a.download = 'academy-markers.json'; a.click(); }
    if (v === 'pub') {
      const ok = await fetch('/api/academy/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: m.key, markers: mk.map(({ x: px, y: py, label, note }) => ({ x: px, y: py, label, note })) }) }).then((r) => r.ok).catch(() => false);
      alert(ok ? 'Published: these markers are now in data/anatomy_lab/academy/guides.json (they go live with the next site export).' : 'Publishing works on the local app only (with the server restarted). Use Export markers instead.');
      if (ok) GUIDES[m.key] = mk;
    }
    draw();
  };
  draw(); d.showModal(); d.addEventListener('close', () => d.remove());
}
function viewer(group, i) {
  const list = IMG[group] || []; let k = i, z = 1, x = 0, y = 0, br = 100, ct = 100, inv = 0;
  const d = document.createElement('dialog'); d.className = 'ac-dlg'; document.body.appendChild(d);
  const draw = () => {
    const m = list[k];
    d.innerHTML = `<div class="ac-vh"><b>${esc(m.title)}</b><span>${k + 1}/${list.length}</span><button class="ghost-btn tiny" data-v="prev">◀</button><button class="ghost-btn tiny" data-v="next">▶</button>
      <button class="ghost-btn tiny" data-v="in">＋</button><button class="ghost-btn tiny" data-v="out">－</button><button class="ghost-btn tiny" data-v="reset">1:1</button>
      <label>brightness <input type="range" min="40" max="200" value="${br}" data-f="br"></label><label>contrast <input type="range" min="40" max="250" value="${ct}" data-f="ct"></label>
      <label><input type="checkbox" data-f="inv" ${inv ? 'checked' : ''}> invert</label><button class="ghost-btn tiny" data-v="close">✕</button></div>
      <div class="ac-vw"><img src="/meridian-4D/rt/academy/img/${esc(m.file)}" alt="${esc(m.title)}" style="transform:translate(${x}px,${y}px) scale(${z});filter:brightness(${br}%) contrast(${ct}%) invert(${inv})"></div>
      <p class="fine">${esc(m.description)}<br>${esc(m.author || '')}${m.credit ? ` · ${esc(m.credit)}` : ''} · <a href="${esc(m.licence_url || m.page)}" target="_blank" rel="noopener">${esc(m.licence)}</a> · <a href="${esc(m.page)}" target="_blank" rel="noopener">Wikimedia Commons file page</a></p>`;
    d.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { const v = b.dataset.v; if (v === 'close') return d.close(); if (v === 'prev') { k = (k - 1 + list.length) % list.length; z = 1; x = y = 0; } if (v === 'next') { k = (k + 1) % list.length; z = 1; x = y = 0; } if (v === 'in') z = Math.min(8, z * 1.3); if (v === 'out') z = Math.max(0.5, z / 1.3); if (v === 'reset') { z = 1; x = y = 0; } draw(); }));
    d.querySelectorAll('[data-f]').forEach((inp) => (inp.oninput = () => { if (inp.dataset.f === 'br') br = Number(inp.value); if (inp.dataset.f === 'ct') ct = Number(inp.value); if (inp.dataset.f === 'inv') inv = inp.checked ? 1 : 0; const im = d.querySelector('.ac-vw img'); im.style.filter = `brightness(${br}%) contrast(${ct}%) invert(${inv})`; }));
    const vw = d.querySelector('.ac-vw'), im = vw.querySelector('img');
    vw.onwheel = (e) => { e.preventDefault(); z = Math.max(0.5, Math.min(8, z * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); im.style.transform = `translate(${x}px,${y}px) scale(${z})`; };
    vw.onpointerdown = (e) => { const sx = e.clientX - x, sy = e.clientY - y; try { vw.setPointerCapture(e.pointerId); } catch { /* synthetic or lost pointer */ } vw.onpointermove = (m2) => { x = m2.clientX - sx; y = m2.clientY - sy; im.style.transform = `translate(${x}px,${y}px) scale(${z})`; }; vw.onpointerup = () => { vw.onpointermove = null; }; };
  };
  draw(); d.showModal(); d.addEventListener('close', () => d.remove());
}
window.__ac = { get data() { return D; }, show3d };
