// Healthcare AI directory (Extensions tab). Data: /rt/ai/ai_tools.json from tools/ai_tools_build.py: a hand-picked
// list whose licence, access, activity and description are read from each tool's own source (Hugging Face model card,
// GitHub repository, or the maker's page) on the date shown. Descriptions are quoted, never written here. Listing a
// tool is not an endorsement or an accuracy claim. Kept separate from the site: no AI runs on this site.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const AUD = { S: 'students', C: 'clinicians', R: 'researchers', P: 'patients & carers' };
const KIND = { hf: 'open model (Hugging Face)', gh: 'open-source code (GitHub)', web: 'web app' };
const OPEN = /^(mit|apache-2\.0|bsd|cc-by-4\.0|cc-by-sa|mpl|gpl|lgpl|agpl|openrail|bigscience|llama)/i;

export function aiToolsHtml() {
  return `<section class="card ai-card" id="ai-dir"><div class="card-h"><h2>🤖 AI in healthcare: directory</h2><small id="ai-meta">loading…</small></div>
    <p class="fine">Popular and lesser-known AI tools and open models for healthcare students, clinicians, care and research. Licence, access, last activity and the description are read from each tool's own page (Hugging Face model card, GitHub repository, or the maker's site) and quoted, with the date checked. <b>Listing is not an endorsement or an accuracy claim.</b> Research models are not medical devices; only a regulator-cleared product, used for its cleared purpose, belongs in patient care. Never put identifiable patient information into a tool your organisation has not approved.</p>
    <div class="cr-filters" id="ai-grp"></div>
    <div class="cr-filters"><span class="fine">For:</span>${['all', 'S', 'C', 'R', 'P'].map((a) => `<button class="ghost-btn ${a === 'all' ? 'on' : ''}" data-ai-a="${a}">${a === 'all' ? 'everyone' : AUD[a]}</button>`).join('')}
      <span class="sep"></span>${[['all', 'any type'], ['hf', 'open models'], ['gh', 'open-source code'], ['web', 'web apps']].map(([k, n]) => `<button class="ghost-btn ${k === 'all' ? 'on' : ''}" data-ai-k="${k}">${n}</button>`).join('')}
      <input id="ai-q" type="search" placeholder="filter: pathology, segmentation, literature…" autocomplete="off"></div>
    <div id="ai-body"></div></section>`;
}

function card(x) {
  const lic = x.licence ? (x.licence === 'other' && x.licence_name ? x.licence_name : x.licence) : '';
  const facts = [KIND[x.kind],
    lic && `licence: <span class="${OPEN.test(lic) ? 'ok' : ''}">${esc(lic)}</span>${x.licence_link ? ` <a href="${esc(x.licence_link.startsWith('http') ? x.licence_link : `${x.url}/blob/main/${x.licence_link}`)}" target="_blank" rel="noopener noreferrer">terms</a>` : ''}`,
    x.kind === 'hf' && (x.gated ? 'gated: accept terms on Hugging Face' : 'open download'),
    x.task && esc(x.task),
    Number.isFinite(x.downloads_30d) && `${x.downloads_30d.toLocaleString()} downloads (30 days)`,
    Number.isFinite(x.stars) && `${x.stars.toLocaleString()} stars`,
    x.updated && `updated ${esc(x.updated)}`,
    x.archived && '<span class="warn">archived</span>',
    x.status !== 200 && `<span class="muted" title="Automated check on ${esc(x.checked)}">page check: ${x.status === 403 ? 'blocked (HTTP 403)' : esc(x.status)}</span>`,
  ].filter(Boolean).join(' · ');
  return `<div class="ext-card ai-c"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(x.name)}</b></a> <small class="muted">${esc(x.maker)}</small>
    ${x.quote ? `<blockquote class="ai-q">“${esc(x.quote)}”<cite>${esc(x.quote_src)}, read ${esc(x.checked)}</cite></blockquote>` : x.quote_src ? `<p class="fine muted">${esc(x.quote_src)}</p>` : ''}
    <p class="fine">${facts}</p><p class="fine">For ${x.audience.map((a) => AUD[a]).join(', ')}</p></div>`;
}

export async function bindAiTools(root) {
  const D = await fetch('/meridian-4D/rt/ai/ai_tools.json').then((r) => r.json()).catch(() => null);
  const body = root.querySelector('#ai-body');
  if (!D) { body.innerHTML = '<p class="muted">Directory not available.</p>'; return; }
  root.querySelector('#ai-meta').textContent = `${D.items.length} tools and models · sources read ${D.checked}`;
  let g = 'all', a = 'all', k = 'all', q = '';
  const gb = root.querySelector('#ai-grp');
  gb.innerHTML = [['all', 'All uses'], ...Object.entries(D.groups)].map(([id, n]) => `<button class="ghost-btn ${id === 'all' ? 'on' : ''}" data-ai-g="${id}">${esc(n)}</button>`).join('');
  const draw = () => {
    const rows = D.items.filter((x) => (g === 'all' || x.group === g) && (a === 'all' || x.audience.includes(a)) && (k === 'all' || x.kind === k)
      && (!q || `${x.name} ${x.maker} ${x.quote || ''} ${x.task || ''} ${D.groups[x.group]}`.toLowerCase().includes(q)));
    body.innerHTML = Object.entries(D.groups).map(([id, n]) => { const r = rows.filter((x) => x.group === id); return r.length ? `<div class="cr-lv"><h3>${esc(n)} <small>${r.length}</small></h3><div class="ext-grid">${r.map(card).join('')}</div></div>` : ''; }).join('')
      || '<p class="muted">Nothing for this filter.</p>';
  };
  const pick = (sel, set) => root.querySelectorAll(sel).forEach((b) => (b.onclick = () => { set(b); root.querySelectorAll(sel).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  pick('[data-ai-g]', (b) => { g = b.dataset.aiG; }); pick('[data-ai-a]', (b) => { a = b.dataset.aiA; }); pick('[data-ai-k]', (b) => { k = b.dataset.aiK; });
  root.querySelector('#ai-q').oninput = (e) => { q = e.target.value.trim().toLowerCase(); draw(); };
  draw();
}
