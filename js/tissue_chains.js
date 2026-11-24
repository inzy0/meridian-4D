// Fascial (myofascial) chains for 3D Atlas · Tissue, fascia & chains: each chain is drawn as a path through its muscles,
// fasciae and ligaments in order (crossing to the opposite side where the chain does), with a pulse travelling along it.
// Constituents, evidence and quotes: data/anatomy_lab/tissue/chains.json (tools/fascial_chains_build.py). A chain whose
// muscles no source names is listed with its evidence but not drawn.

import * as THREE from 'three';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const C = { data: null, path: null, pulse: null, curve: null, chain: null };

export async function chainsPanel(P, T, md, focusSet) {
  C.data ||= await fetch('/meridian-4D/rt/tissue/chains.json').then((r) => r.json()).catch(() => null);
  if (!C.data) { P.innerHTML = '<section class="card"><p class="muted">Chain data not built yet (tools/fascial_chains_build.py).</p></section>'; return; }
  const D = C.data, groups = [...new Set(D.chains.map((c) => c.group))], cur = C.chain?.id || 'sbl', ch = D.chains.find((c) => c.id === cur) || D.chains[0];
  const fascia = T.know?.topics?.Fascia || [];
  const quotes = D.quotes.filter((q) => (ch.id === 'sbl' ? /superficial back|Achilles tendon – plantar/i.test(q.topic) : ch.id === 'bfl' ? /hub|rotation/i.test(q.topic) : false));
  P.innerHTML = `<section class="card"><div class="card-h"><h2>Fascial chains</h2><small>${D.chains.length}</small></div>
      ${groups.map((g) => `<div class="mini" style="margin-top:6px">${esc(g)}</div><div class="bar">${D.chains.filter((c) => c.group === g).map((c) => `<button class="chip-btn ${c.id === ch.id ? 'on' : ''}" data-ch="${c.id}">${esc(c.name)}${c.nodes.length ? '' : ' ·'}</button>`).join('')}</div>`).join('')}
      <p class="fine">${esc(D.rule)} Chains marked · are listed with their evidence but not drawn.</p></section>
    <section class="card"><div class="card-h"><h2>${esc(ch.name)}</h2><span class="pill">${esc(ch.plane)}</span></div>
      ${ch.nodes.length ? `<ol class="chain-ol">${ch.nodes.map(([lab, m]) => `<li>${esc(lab)}${m.side === 'contra' ? ' <span class="pill warn">opposite side</span>' : ''}</li>`).join('')}</ol>
        <div class="bar"><button class="primary small" id="ch-play">▶ Run tension along the chain</button><button class="ghost-btn" id="ch-clear">Clear</button></div>` : `<p class="muted">${esc(ch.note || 'Constituents not named in the sources read; not drawn.')}</p>`}
      <p><b>Anatomical continuity:</b> ${esc(ch.anatomy)} <small>— <a href="https://doi.org/${esc(ch.anatomy_src.doi)}" target="_blank" rel="noopener">${esc(ch.anatomy_src.cite)}</a></small></p>
      ${ch.force ? `<table class="tt"><thead><tr><th>Transition</th><th>Force transfer</th></tr></thead><tbody>${ch.force.map(([t, f]) => `<tr><td class="mini">${esc(t)}</td><td class="mini">${esc(f)}</td></tr>`).join('')}</tbody></table><p class="fine">Source: <a href="https://doi.org/${esc(ch.force_src.doi)}" target="_blank" rel="noopener">${esc(ch.force_src.cite)}</a> (cited, not reproduced).</p>` : ''}
      ${ch.note && ch.nodes.length ? `<p class="fine">${esc(ch.note)}</p>` : ''}${ch.also ? `<p class="fine">${esc(ch.also)}</p>` : ''}
      ${quotes.map((q) => `<blockquote class="q">${esc(q.text)}<footer>${esc(q.topic)} · ${esc(q.cite)} · ${esc(q.licence)} · <a href="https://doi.org/${esc(q.doi)}" target="_blank" rel="noopener">${esc(q.pmcid)}</a></footer></blockquote>`).join('')}
      <p class="mini" id="ch-miss"></p></section>
    <section class="card"><div class="card-h"><h2>How fascia transmits force</h2><small>quoted</small></div>
      ${D.quotes.filter((q) => /force fascia|History|debated|Agreement/i.test(q.topic)).map((q) => `<blockquote class="q">${esc(q.text)}<footer>${esc(q.topic)} · ${esc(q.cite)} · ${esc(q.licence)} · <a href="https://doi.org/${esc(q.doi)}" target="_blank" rel="noopener">${esc(q.pmcid)}</a></footer></blockquote>`).join('')}</section>
    <section class="card"><div class="card-h"><h2>Fascia: types and function</h2><small>StatPearls, quoted</small></div>${fascia.map((c) => `<details><summary>${esc(c.title)}</summary>${Object.entries(c.sections).slice(0, 5).map(([s, x]) => `<p class="mini"><b>${esc(s)}.</b> ${esc(x.slice(0, 1600))}${x.length > 1600 ? '…' : ''}</p>`).join('')}<p class="mini">${esc(c.publisher)} · ${esc(c.licence)}</p></details>`).join('')}</section>
    <section class="card"><div class="card-h"><h2>Whole-body network (graph theory)</h2><small>Life 2025, CC BY</small></div>${D.network_tables.slice(0, 2).map((t) => md(t)).join('')}
      <p class="fine">From “From Myofascial Chains to the Polyconnective Network” (Life 2025, <a href="https://doi.org/10.3390/life15081200" target="_blank" rel="noopener">doi</a>), CC BY.</p></section>
    <section class="card"><div class="card-h"><h2>Studies on force transmission and remote effects</h2><small>${D.studies.length}</small></div>${D.studies.map((s) => `<details><summary>${esc(s.title)} <small>${esc(s.journal)} ${esc(s.year)}</small></summary><p class="mini">${esc(s.abstract)}</p><p class="mini">${esc(s.licence)} · <a href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener">doi</a> · ${esc(s.pmcid)}</p></details>`).join('')}
      <p class="fine">${esc(D.attribution)}</p></section>`;
  P.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => { C.chain = D.chains.find((c) => c.id === b.dataset.ch); chainsPanel(P, T, md, focusSet); }));
  const play = P.querySelector('#ch-play'); if (play) play.onclick = () => draw(ch, T, focusSet);
  const clr = P.querySelector('#ch-clear'); if (clr) clr.onclick = () => clear(T, focusSet);
  if (!C.chain) C.chain = ch;
}

function clear(T, focusSet) { if (C.path) { T.scene.remove(C.path, C.pulse); C.path.geometry.dispose(); C.path = null; C.curve = null; } focusSet(null); }

function draw(ch, T, focusSet) {
  clear(T, focusSet);
  const home = T.side === 'right' ? 'right' : 'left', other = home === 'left' ? 'right' : 'left';
  const pool = [...T.muscles, ...T.tissue, ...T.tendons];
  const set = new Set(), pts = [], miss = [];
  for (const [lab, m] of ch.nodes) {
    const sd = m.side === 'contra' ? other : home;
    const rx = [m.m, m.t].filter(Boolean).map((r) => new RegExp(r, 'i'));
    const hits = pool.filter((x) => rx.some((r) => r.test(x.userData.name)) && (!x.userData.side || x.userData.side === sd) && !['origin', 'insertion'].includes(x.userData.kind));
    if (!hits.length) { miss.push(lab); continue; }
    const box = new THREE.Box3(); hits.forEach((h) => { set.add(h); box.expandByObject(h); });
    pts.push(box.getCenter(new THREE.Vector3()));
  }
  const missEl = document.querySelector('#ch-miss'); if (missEl) missEl.textContent = miss.length ? `Not found in the 3D model: ${miss.join(', ')}.` : `${set.size} structures on the path.`;
  if (pts.length < 2) return;
  focusSet(set);
  C.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  C.path = new THREE.Mesh(new THREE.TubeGeometry(C.curve, 200, 0.006, 10, false), new THREE.MeshBasicMaterial({ color: 0xff3df2, transparent: true, opacity: 0.75, depthTest: false }));
  C.pulse = new THREE.Mesh(new THREE.SphereGeometry(0.018, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
  C.path.renderOrder = C.pulse.renderOrder = 999; T.scene.add(C.path, C.pulse);
  const box = new THREE.Box3().setFromPoints(pts), c = box.getCenter(new THREE.Vector3()), R = box.getSize(new THREE.Vector3()).length();
  const A = T.atlas.anchors, back = /back|posterior|dorsal/i.test(ch.name + ch.plane) ? -1 : 1;
  T.ctl.target.copy(c); T.cam.position.copy(c.clone().add(new THREE.Vector3(0.25, 0.1, back * (A.anterior || 1)).normalize().multiplyScalar(Math.max(0.7, R * 1.95))));
}

export function chainTick(t) {
  if (!C.curve || !C.pulse) return;
  const u = ((t / 2600) % 1), p = C.curve.getPointAt(u); C.pulse.position.copy(p);
  C.pulse.scale.setScalar(1 + 0.4 * Math.sin(t / 120));
}
