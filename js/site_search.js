// Site search (header button or Ctrl/Cmd+K): finds tabs, emergency situations, nutrition topics, tests, clinical
// chapters, secretions, booklets, 3D structures and Training 4D pages, and opens the right place.
// Index: data/anatomy_lab/search/index.json (tools/site_search_build.py), titles and labels from the site's own data.
// Not found: the query can be saved as a request. On the local app it goes to the owner's review list
// (data/anatomy_lab/search_requests/, never published); on the public site it stays in this browser (per account)
// with a copy button. Nothing is generated or added to the site automatically: the owner sources answers by hand.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { academy: 'Imaging Academy', tab: 'Tab', emergency: 'Emergency', nutrition: 'Nutrition', test: 'Tests & labs', clinical: 'Clinical', body: 'Body systems', tissue: 'Tissue 4D', atlas: '3D Atlas', train: 'Training 4D' };
let IX = null, dlg = null, sel = 0, hits = [], local = null;

export function initSearch() {
  const btn = document.querySelector('#sq-open');
  if (btn) btn.onclick = open;
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
  });
}

async function index() {
  if (!IX) {
    const d = await fetch('/meridian-4D/rt/search/index.json').then((r) => r.json()).catch(() => null);
    IX = (d?.rows || []).map(([title, where, go, kind, words]) => ({ title, where, go, kind, words, lt: title.toLowerCase(), lw: `${where} ${words}`.toLowerCase() }));
  }
  return IX;
}
async function isLocal() {
  if (local === null) local = await fetch('/api/search/requests').then((r) => r.ok).catch(() => false);
  return local;
}

function score(e, words) {
  let s = 0;
  for (const w of words) {
    const i = e.lt.indexOf(w);
    if (i === 0) s += 6; else if (i > 0) s += e.lt[i - 1] === ' ' ? 4 : 2;
    else if (e.lw.includes(w)) s += 1; else return 0;
  }
  if (e.lt === words.join(' ')) s += 10;
  return s + (e.kind === 'tab' ? 1.5 : 0) + (e.kind === 'emergency' || e.kind === 'nutrition' ? 1 : 0) - e.title.length / 300;
}

async function open() {
  await index();
  if (!dlg) {
    dlg = document.createElement('dialog'); dlg.className = 'sq-dlg';
    dlg.innerHTML = `<div class="sq-head"><input id="sq-in" type="search" placeholder="Search the whole site: bleeding, protein, ACL, insulin, femur, Apgar…" aria-label="Search the site" autocomplete="off">
      <button class="ghost-btn" id="sq-x" aria-label="Close">Esc</button></div>
      <div id="sq-res" class="sq-res"></div>
      <div class="sq-foot"><span class="fine">↑ ↓ to move · Enter to open · ${IX.length.toLocaleString()} items indexed</span> <button class="ghost-btn tiny" id="sq-reqs">Requests</button></div>`;
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('#sq-in');
    inp.oninput = () => { sel = 0; run(inp.value); };
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, hits.length - 1); draw(inp.value); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(inp.value); }
      if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); go(hits[sel]); }
    };
    dlg.querySelector('#sq-x').onclick = () => dlg.close();
    dlg.querySelector('#sq-reqs').onclick = requests;
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }
  dlg.showModal();
  const inp = dlg.querySelector('#sq-in'); inp.select(); run(inp.value);
}

function run(q) {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  hits = words.length ? IX.map((e) => [score(e, words), e]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 40).map((x) => x[1]) : [];
  draw(q);
}
function draw(q) {
  const r = dlg.querySelector('#sq-res');
  if (!IX.length) { r.innerHTML = '<p class="muted sq-hint">The search index is not available on this copy of the site.</p>'; return; }
  if (!q.trim()) { r.innerHTML = '<p class="muted sq-hint">Type a word or two. Results open the right tab and item.</p>'; return; }
  r.innerHTML = (hits.length ? `<ul class="sq-list">${hits.map((h, i) => `<li class="${i === sel ? 'on' : ''}" data-i="${i}"><b>${esc(h.title)}</b><small>${esc(KIND[h.kind] || h.kind)} · ${esc(h.where)}</small></li>`).join('')}</ul>` : '<p class="muted sq-hint">Nothing on the site matches yet.</p>')
    + `<div class="sq-miss">Not what you were looking for? <button class="ghost-btn tiny" id="sq-ask">Request “${esc(q.trim().slice(0, 80))}”</button><span id="sq-asked" class="fine"></span></div>`;
  r.querySelectorAll('[data-i]').forEach((li) => (li.onclick = () => go(hits[Number(li.dataset.i)])));
  r.querySelector('#sq-ask').onclick = () => ask(q.trim());
  r.querySelector('li.on')?.scrollIntoView({ block: 'nearest' });
}

async function ask(q) {
  const out = dlg.querySelector('#sq-asked'); if (q.length < 2) return;
  if (await isLocal()) {
    const ok = await fetch('/api/search/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) }).then((r) => r.ok).catch(() => false);
    out.textContent = ok ? ' Saved to the owner’s review list.' : ' Could not save.';
  } else {
    let list = []; try { list = JSON.parse(localStorage.getItem('sq-requests') || '[]'); } catch { /* ignore */ }
    if (!list.some((x) => x.q.toLowerCase() === q.toLowerCase())) list.push({ q, when: new Date().toISOString().slice(0, 16).replace('T', ' ') });
    try { localStorage.setItem('sq-requests', JSON.stringify(list)); } catch { /* storage blocked */ }
    out.textContent = ' Saved in this browser (see Requests).';
  }
}

async function requests() {
  const r = dlg.querySelector('#sq-res');
  if (await isLocal()) {
    const d = await fetch('/api/search/requests').then((x) => x.json()).catch(() => ({ requests: [] }));
    const st = ['new', 'sourcing', 'added', 'declined'];
    r.innerHTML = `<h3>Search requests (owner review)</h3><p class="fine">Topics visitors looked for and did not find. Source each one by hand (licence-checked, quoted) before it is added; nothing here is added automatically.</p>
      <table class="tt sq-rt"><thead><tr><th>Query</th><th>Asked</th><th>Last</th><th>Status</th><th>Note</th></tr></thead><tbody>${d.requests.map((x, i) => `<tr><td>${esc(x.q)}</td><td>${x.count}</td><td>${esc(x.last)}</td>
        <td><select data-st="${i}">${st.map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><input data-note="${i}" value="${esc(x.note || '')}" placeholder="source / decision"></td></tr>`).join('') || '<tr><td colspan="5" class="muted">No requests yet.</td></tr>'}</tbody></table>`;
    const upd = (i) => fetch('/api/search/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ i, status: r.querySelector(`[data-st="${i}"]`).value, note: r.querySelector(`[data-note="${i}"]`).value }) });
    r.querySelectorAll('[data-st]').forEach((s) => (s.onchange = () => upd(Number(s.dataset.st))));
    r.querySelectorAll('[data-note]').forEach((s) => (s.onchange = () => upd(Number(s.dataset.note))));
  } else {
    let list = []; try { list = JSON.parse(localStorage.getItem('sq-requests') || '[]'); } catch { /* ignore */ }
    r.innerHTML = `<h3>Your requests</h3><p class="fine">Kept in this browser only. Copy the list to send it to the site's creator (About tab).</p>
      <ul>${list.map((x) => `<li>${esc(x.q)} <small class="muted">${esc(x.when)}</small></li>`).join('') || '<li class="muted">No requests yet.</li>'}</ul>
      <button class="ghost-btn tiny" id="sq-copy">Copy list</button> <button class="ghost-btn tiny" id="sq-clear">Clear</button>`;
    r.querySelector('#sq-copy').onclick = () => navigator.clipboard?.writeText(list.map((x) => x.q).join('\n'));
    r.querySelector('#sq-clear').onclick = () => { try { localStorage.removeItem('sq-requests'); } catch { /* ignore */ } requests(); };
  }
}

const wait = async (fn, n = 60) => { for (let i = 0; i < n; i++) { const v = fn(); if (v) return v; await new Promise((r) => setTimeout(r, 250)); } return null; };
async function go(h) {
  dlg.close();
  const [type, ...rest] = h.go.split(':'); const arg = rest.join(':');
  if (h.go.startsWith('#')) { location.hash = h.go; return; }
  if (type === 'tests') { location.hash = '#tests'; (await import('./tests.js')).startTests(arg); return; }
  if (type === 'clinical') { location.hash = '#clinical'; (await import('./clinical.js')).startClinical(arg); return; }
  if (type === 'atlas') { location.hash = '#atlas'; const a = await wait(() => window.__atlas?.select && window.__atlas); a?.select(arg); return; }
  if (type === 'bf') {
    location.hash = '#molecular';
    const F = await wait(() => window.__bf?.byId && window.__bf); const l = F?.byId[arg]; if (!l) return;
    document.querySelector('[data-bt=org]')?.click();
    const chip = await wait(() => document.querySelector(`#bf-body [data-o="${l.organ}"]`)); chip?.click();
    const btn = await wait(() => document.querySelector(`.bf-p[data-l="${arg}"]`)); btn?.click();
    document.querySelector('#mol-func')?.scrollIntoView({ behavior: 'smooth' });
  }
}
