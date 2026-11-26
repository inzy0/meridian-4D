// alphaXiv reader in the Extensions tab: alphaXiv's own site (arXiv papers, trending feed, discussions) shown in a
// frame. Nothing loads from alphaXiv until the visitor clicks; no content is copied onto this site. alphaXiv sends no
// frame-blocking headers (checked 2026-11-27); if a browser blocks it anyway, "Open in a new tab" always works.
// Paper links use alphaXiv's own pattern https://www.alphaxiv.org/abs/<arXiv id> (checked 2026-11-27).
const AX = 'https://www.alphaxiv.org/';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function alphaxivHtml() {
  return `<section class="card ax-card" id="ax"><div class="card-h"><h2>📜 alphaXiv: scroll arXiv papers</h2><small>alphaxiv.org · external site</small></div>
    <blockquote class="ai-q">“Discuss, discover, and read arXiv papers. Explore trending papers, see recent activity and discussions, and follow authors of arXiv papers on alphaXiv.”<cite>alphaXiv's own description, read 2026-11-27</cite></blockquote>
    <div class="cr-filters">
      <button class="ghost-btn on" id="ax-load">▶ Open the feed here</button>
      <input id="ax-id" type="search" placeholder="arXiv ID or link, e.g. 1706.03762" autocomplete="off"><button class="ghost-btn" id="ax-go">Open paper</button>
      <a class="ghost-btn" id="ax-new" href="${AX}" target="_blank" rel="noopener noreferrer">↗ New tab</a>
      <a class="ghost-btn" href="https://chromewebstore.google.com/detail/alphaxiv-understand-resea/liihfcjialakefgidmaadhajjikbjjab" target="_blank" rel="noopener noreferrer">Chrome extension</a>
      <button class="ghost-btn tiny" id="ax-tall" title="Taller / shorter">⇕</button></div>
    <div id="ax-frame" class="ax-frame"><p class="fine muted">Loads alphaXiv's site in this panel when you click. Nothing is sent to alphaXiv until then. Signing in inside the panel may need the new tab if your browser blocks third-party cookies. arXiv papers are preprints: most are not peer-reviewed.</p></div></section>`;
}

function arxivId(s) {
  s = s.trim();
  const m = s.match(/(\d{4}\.\d{4,5}(v\d+)?)|([a-z\-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?)/i);
  return m ? m[0] : '';
}

export function bindAlphaxiv(root) {
  const box = root.querySelector('#ax-frame'), nw = root.querySelector('#ax-new');
  const show = (url) => {
    nw.href = url;
    let f = box.querySelector('iframe');
    if (!f) { box.innerHTML = '<iframe title="alphaXiv" loading="lazy" referrerpolicy="no-referrer" allow="clipboard-write; fullscreen" allowfullscreen></iframe>'; f = box.querySelector('iframe'); }
    f.src = url; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  root.querySelector('#ax-load').onclick = () => show(AX);
  const go = () => {
    const id = arxivId(root.querySelector('#ax-id').value);
    if (!id) { box.insertAdjacentHTML('afterbegin', '<p class="fine warn ax-err">Not an arXiv ID (e.g. 2401.01234 or q-bio/0601001).</p>'); setTimeout(() => box.querySelector('.ax-err')?.remove(), 3000); return; }
    show(`${AX}abs/${encodeURIComponent(id).replace(/%2F/g, '/')}`);
  };
  root.querySelector('#ax-go').onclick = go;
  root.querySelector('#ax-id').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  root.querySelector('#ax-tall').onclick = () => box.classList.toggle('tall');
  void esc;
}
