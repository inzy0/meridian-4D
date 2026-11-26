// Floating mini video player (header ▶ button). Plays YouTube videos through YouTube's official IFrame Player API in
// privacy-enhanced mode (youtube-nocookie.com). It keeps playing while you switch tabs, and offers a queue, playlists,
// speed, A-B loop (repeat one movement), ±1/±5 s steps, mirror view, docking, opacity, minimise and resume.
// It does not block or skip advertising: whether ads appear is decided by YouTube and the video's owner, and blocking
// them would break YouTube's terms. Videos whose owners disallow embedding cannot play here; the player says so and
// moves to the next one. Queue, position and settings stay in this browser (per account, js/accounts.js).

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DEF = { queue: [], i: 0, t: 0, rate: 1, vol: 80, loop: 'off', mirror: false, x: null, y: null, w: 420, dock: 'br', op: 1, min: false, shuffle: false };
let S = null, P = null, box = null, apiReady = null, tick = null, ab = null;
const save = () => { try { localStorage.setItem('mp-state', JSON.stringify({ ...S, t: P?.getCurrentTime?.() || S.t })); } catch { /* storage blocked */ } };
const loadState = () => { try { return { ...DEF, ...(JSON.parse(localStorage.getItem('mp-state') || 'null') || {}) }; } catch { return { ...DEF }; } };
const ERR = { 2: 'This link is not a valid YouTube video id.', 5: 'This video cannot play in the HTML5 player.', 100: 'The video was removed or made private.', 101: 'The owner does not allow this video to be embedded.', 150: 'The owner does not allow this video to be embedded.', 153: 'YouTube needs the page origin to play this video.' };

export function parseYouTube(s) {
  s = String(s || '').trim(); if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { v: s };
  let u; try { u = new URL(s.startsWith('http') ? s : `https://${s}`); } catch { return null; }
  if (!/(^|\.)youtube(-nocookie)?\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
  const list = u.searchParams.get('list');
  let v = u.searchParams.get('v');
  if (!v && u.hostname.endsWith('youtu.be')) v = u.pathname.slice(1, 12);
  const m = u.pathname.match(/\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/); if (!v && m) v = m[2];
  const t = Number((u.searchParams.get('t') || u.searchParams.get('start') || '0').replace(/s$/, '')) || 0;
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return { v, list: list || undefined, t };
  if (list) return { list };
  return null;
}

function loadApi() {
  if (!apiReady) apiReady = new Promise((res, rej) => {
    if (window.YT?.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { apiReady = null; rej(new Error('Could not reach YouTube (offline or blocked).')); };
    document.head.appendChild(s);
  });
  return apiReady;
}

export function initPlayer() {
  const b = document.querySelector('#mp-open'); if (b) b.onclick = () => toggle(true);
  S = loadState();
  if (S.queue.length && localStorage.getItem('mp-open') === '1') toggle(true);
}

function toggle(show) {
  if (!box) build();
  box.hidden = !show; try { localStorage.setItem('mp-open', show ? '1' : '0'); } catch { /* ignore */ }
  if (show && S.queue.length && !P) start(S.i, S.t);
  if (!show) { P?.pauseVideo?.(); save(); }
}

function build() {
  box = document.createElement('section'); box.className = 'mp'; box.setAttribute('aria-label', 'Mini video player');
  box.innerHTML = `<header class="mp-h" title="Drag to move"><b>▶ Player</b><span class="mp-title" id="mp-title">add a YouTube link</span>
      <button class="mp-ib" data-a="min" title="Minimise">–</button><button class="mp-ib" data-a="close" title="Close (keeps your queue)">×</button></header>
    <div class="mp-body">
      <div class="mp-video"><div id="mp-yt"></div><div class="mp-msg" id="mp-msg" hidden></div></div>
      <div class="mp-seek"><span id="mp-cur">0:00</span><input id="mp-pos" type="range" min="0" max="1000" value="0" aria-label="Seek"><span id="mp-dur">0:00</span></div>
      <div class="mp-ctl">
        <button class="mp-ib" data-a="prev" title="Previous">⏮</button><button class="mp-ib" data-a="b5" title="Back 5 s">−5</button><button class="mp-ib" data-a="b1" title="Back 1 s">−1</button>
        <button class="mp-ib mp-play" data-a="play" id="mp-play" title="Play / pause (space)">▶</button>
        <button class="mp-ib" data-a="f1" title="Forward 1 s">+1</button><button class="mp-ib" data-a="f5" title="Forward 5 s">+5</button><button class="mp-ib" data-a="next" title="Next">⏭</button>
        <select id="mp-rate" title="Speed">${[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => `<option value="${r}">${r}×</option>`).join('')}</select>
        <input id="mp-vol" type="range" min="0" max="100" title="Volume" aria-label="Volume">
      </div>
      <div class="mp-ctl mp-adv">
        <button class="mp-ib" data-a="abA" title="Set loop start (A)">A</button><button class="mp-ib" data-a="abB" title="Set loop end (B)">B</button><button class="mp-ib" data-a="abX" title="Clear A-B loop">A-B ×</button>
        <select id="mp-loop" title="Repeat"><option value="off">repeat off</option><option value="one">repeat one</option><option value="all">repeat queue</option></select>
        <label title="Shuffle"><input type="checkbox" id="mp-shuf"> shuffle</label>
        <label title="Mirror the picture, like a mirror"><input type="checkbox" id="mp-mir"> mirror</label>
        <select id="mp-dock" title="Dock"><option value="br">dock ↘</option><option value="bl">dock ↙</option><option value="tr">dock ↗</option><option value="tl">dock ↖</option><option value="free">free</option></select>
        <input id="mp-op" type="range" min="40" max="100" title="Opacity" aria-label="Opacity">
      </div>
      <form class="mp-add" id="mp-add"><input id="mp-url" placeholder="Paste a YouTube video or playlist link" aria-label="YouTube link"><button class="ghost-btn tiny">Add</button>
        <button class="ghost-btn tiny" type="button" id="mp-find" title="Search on YouTube in a new tab">Find on YouTube ↗</button></form>
      <ol class="mp-q" id="mp-q"></ol>
      <p class="mp-note">Plays through YouTube’s official embedded player (privacy-enhanced). YouTube and each video’s owner decide whether ads appear; this player does not block them.</p>
    </div>`;
  document.body.appendChild(box);
  place();
  box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a)));
  const $ = (s) => box.querySelector(s);
  $('#mp-rate').value = S.rate; $('#mp-vol').value = S.vol; $('#mp-loop').value = S.loop; $('#mp-mir').checked = S.mirror; $('#mp-shuf').checked = S.shuffle; $('#mp-dock').value = S.dock; $('#mp-op').value = Math.round(S.op * 100);
  $('#mp-rate').onchange = (e) => { S.rate = Number(e.target.value); P?.setPlaybackRate?.(S.rate); save(); };
  $('#mp-vol').oninput = (e) => { S.vol = Number(e.target.value); P?.setVolume?.(S.vol); P?.unMute?.(); save(); };
  $('#mp-loop').onchange = (e) => { S.loop = e.target.value; save(); };
  $('#mp-shuf').onchange = (e) => { S.shuffle = e.target.checked; save(); };
  $('#mp-mir').onchange = (e) => { S.mirror = e.target.checked; mirror(); save(); };
  $('#mp-dock').onchange = (e) => { S.dock = e.target.value; place(); save(); };
  $('#mp-op').oninput = (e) => { S.op = Number(e.target.value) / 100; box.style.opacity = S.op; save(); };
  $('#mp-pos').oninput = (e) => { const d = P?.getDuration?.() || 0; if (d) P.seekTo(d * Number(e.target.value) / 1000, true); };
  $('#mp-add').onsubmit = (e) => { e.preventDefault(); add($('#mp-url').value); $('#mp-url').value = ''; };
  $('#mp-find').onclick = () => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent($('#mp-url').value || 'exercise technique')}`, '_blank', 'noopener');
  box.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select')) return;
    if (e.key === ' ') { e.preventDefault(); act('play'); } else if (e.key === 'ArrowLeft') act('b5'); else if (e.key === 'ArrowRight') act('f5');
    else if (e.key === ',') act('b1'); else if (e.key === '.') act('f1'); else if (e.key === '[') act('abA'); else if (e.key === ']') act('abB');
  });
  box.tabIndex = -1;
  drag(); queue();
  new ResizeObserver(() => { if (!box.hidden) { S.w = box.offsetWidth; save(); } }).observe(box);
  box.style.width = `${S.w}px`; box.style.opacity = S.op;
  if (S.min) box.classList.add('min');
}

function place() {
  box.style.left = box.style.right = box.style.top = box.style.bottom = '';
  const g = '16px';
  if (S.dock === 'free' && S.x !== null) { box.style.left = `${Math.max(0, Math.min(innerWidth - 120, S.x))}px`; box.style.top = `${Math.max(0, Math.min(innerHeight - 60, S.y))}px`; return; }
  if (S.dock.includes('b')) box.style.bottom = g; else box.style.top = '70px';
  if (S.dock.includes('r')) box.style.right = g; else box.style.left = g;
}
function drag() {
  const h = box.querySelector('.mp-h'); let sx, sy, ox, oy;
  h.onpointerdown = (e) => {
    if (e.target.closest('button')) return;
    const r = box.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; h.setPointerCapture(e.pointerId);
    h.onpointermove = (m) => { S.dock = 'free'; S.x = ox + m.clientX - sx; S.y = oy + m.clientY - sy; box.querySelector('#mp-dock').value = 'free'; place(); };
    h.onpointerup = () => { h.onpointermove = null; save(); };
  };
}
function mirror() { const f = box.querySelector('#mp-yt'); if (f) f.style.transform = S.mirror ? 'scaleX(-1)' : ''; }
function msg(t) { const m = box.querySelector('#mp-msg'); m.hidden = !t; m.textContent = t || ''; }
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };

function add(text) {
  const parts = String(text).split(/[\s,]+/).filter(Boolean); let added = 0;
  for (const p of parts) { const y = parseYouTube(p); if (y) { S.queue.push({ ...y, title: y.v ? `Video ${y.v}` : 'Playlist' }); added++; } }
  if (!added) { msg('That is not a YouTube video or playlist link.'); return; }
  msg(''); save(); queue();
  if (!P || S.queue.length === added) start(S.queue.length - added, 0);
}
function queue() {
  const q = box.querySelector('#mp-q');
  q.innerHTML = S.queue.map((x, i) => `<li class="${i === S.i ? 'on' : ''}"><button class="mp-qt" data-p="${i}">${esc(x.title)}</button><button class="mp-ib" data-up="${i}" title="Move up">↑</button><button class="mp-ib" data-rm="${i}" title="Remove">×</button></li>`).join('') || '<li class="muted">Queue is empty.</li>';
  q.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => start(Number(b.dataset.p), 0)));
  q.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.rm); S.queue.splice(i, 1); if (i < S.i) S.i--; else if (i === S.i) { P?.stopVideo?.(); S.i = Math.min(S.i, S.queue.length - 1); } save(); queue(); }));
  q.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.up); if (i > 0) { [S.queue[i - 1], S.queue[i]] = [S.queue[i], S.queue[i - 1]]; if (S.i === i) S.i--; else if (S.i === i - 1) S.i++; save(); queue(); } }));
}

async function start(i, t) {
  if (!S.queue[i]) return;
  S.i = i; ab = null; queue(); msg('');
  const item = S.queue[i];
  box.querySelector('#mp-title').textContent = item.title;
  try { await loadApi(); } catch (e) { msg(e.message); return; }
  const vars = { playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin, start: Math.floor(t || item.t || 0), enablejsapi: 1 };
  const load = () => {
    if (item.list && !item.v) P.loadPlaylist({ list: item.list, listType: 'playlist', startSeconds: t || 0 });
    else P.loadVideoById({ videoId: item.v, startSeconds: t || item.t || 0 });
  };
  if (P) { load(); return; }
  P = new window.YT.Player('mp-yt', {
    host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
    videoId: item.v || undefined, playerVars: item.list && !item.v ? { ...vars, listType: 'playlist', list: item.list } : (item.list ? { ...vars, list: item.list } : vars),
    events: {
      onReady: () => { P.setVolume(S.vol); P.setPlaybackRate(S.rate); mirror(); poll(); },
      onStateChange: (e) => {
        const YTS = window.YT.PlayerState;
        box.querySelector('#mp-play').textContent = e.data === YTS.PLAYING ? '⏸' : '▶';
        if (e.data === YTS.PLAYING) { const d = P.getVideoData?.(); if (d?.title) { S.queue[S.i].title = d.title; box.querySelector('#mp-title').textContent = d.title; queue(); save(); } P.setPlaybackRate(S.rate); }
        if (e.data === YTS.ENDED) ended();
      },
      onError: (e) => { msg(`${ERR[e.data] || `Playback error ${e.data}.`} Skipping to the next video.`); setTimeout(() => next(true), 2500); },
    },
  });
  box.querySelector('#mp-yt')?.setAttribute?.('title', 'YouTube video');
}
function ended() {
  if (S.loop === 'one') { P.seekTo(0, true); P.playVideo(); return; }
  next(false);
}
function next(fromError) {
  if (!S.queue.length) return;
  let n = S.shuffle ? Math.floor(Math.random() * S.queue.length) : S.i + 1;
  if (n >= S.queue.length) { if (S.loop === 'all' || fromError === 'manual') n = 0; else return; }
  start(n, 0);
}
function poll() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!P?.getCurrentTime || box.hidden) return;
    const c = P.getCurrentTime(), d = P.getDuration() || 0;
    if (ab && ab.b != null && c >= ab.b) P.seekTo(ab.a, true);
    box.querySelector('#mp-cur').textContent = fmt(c); box.querySelector('#mp-dur').textContent = fmt(d);
    if (document.activeElement !== box.querySelector('#mp-pos')) box.querySelector('#mp-pos').value = d ? Math.round(c / d * 1000) : 0;
    S.t = c;
  }, 250);
  setInterval(save, 5000);
}
function act(a) {
  if (a === 'close') return toggle(false);
  if (a === 'min') { S.min = !S.min; box.classList.toggle('min', S.min); save(); return; }
  if (!P?.getCurrentTime) { if (a === 'play' && S.queue.length) start(S.i, S.t); return; }
  const c = P.getCurrentTime();
  const st = window.YT?.PlayerState;
  if (a === 'play') return P.getPlayerState() === st.PLAYING ? P.pauseVideo() : P.playVideo();
  if (a === 'b5') return P.seekTo(Math.max(0, c - 5), true);
  if (a === 'f5') return P.seekTo(c + 5, true);
  if (a === 'b1') return P.seekTo(Math.max(0, c - 1), true);
  if (a === 'f1') return P.seekTo(c + 1, true);
  if (a === 'next') return next('manual');
  if (a === 'prev') return c > 3 ? P.seekTo(0, true) : start(Math.max(0, S.i - 1), 0);
  if (a === 'abA') { ab = { a: c, b: null }; msg(`Loop start A at ${fmt(c)}. Press B for the end.`); return; }
  if (a === 'abB') { if (!ab) ab = { a: 0 }; ab.b = c > ab.a ? c : ab.a + 1; msg(`Repeating ${fmt(ab.a)} – ${fmt(ab.b)}.`); setTimeout(() => msg(''), 2500); return; }
  if (a === 'abX') { ab = null; msg(''); }
}
window.__mp = { parseYouTube, get state() { return S; }, add: (t) => { toggle(true); add(t); } };
