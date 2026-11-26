// Floating mini player (header ▶ button): one queue across sources, auto-advance, repeat, shuffle, A-B loop, speed,
// mirror, docking, opacity, minimise and resume. Sources and how each is played (official players / APIs only):
//   YouTube (IFrame Player API, privacy-enhanced youtube-nocookie.com), Spotify (Spotify iFrame API: tracks, albums,
//   playlists, episodes), SoundCloud (Widget API), Vimeo (Player API), direct audio/video links (mp3, m4a, aac, ogg,
//   opus, wav, flac, mp4, webm, m4v) and files from this device (HTML5 media).
// Advertising: direct links and your own files play without ads. YouTube, Spotify, SoundCloud and Vimeo decide their
// own ads and previews (a signed-in Premium account in the same browser follows that account); this player does not
// block or skip them, because that would break those services' terms.
// Queue, position and settings stay in this browser (per account, js/accounts.js); device files last for the session.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DEF = { queue: [], i: 0, t: 0, rate: 1, vol: 80, loop: 'all', auto: true, mirror: false, x: null, y: null, w: 420, dock: 'br', op: 1, min: false, shuffle: false };
const ICON = { youtube: '▶️', spotify: '🟢', soundcloud: '☁️', vimeo: '🎬', audio: '🎵', video: '🎞', local: '💾' };
let S = null, box = null, AD = null, tick = null, ab = null, saveT = null;
const LOAD = {};
const save = () => { try { localStorage.setItem('mp-state', JSON.stringify({ ...S, queue: S.queue.filter((q) => q.type !== 'local'), t: AD?.time?.() || S.t })); } catch { /* storage blocked */ } };
const loadState = () => { try { const s = { ...DEF, ...(JSON.parse(localStorage.getItem('mp-state') || 'null') || {}) }; s.queue = s.queue.map((q) => (q.type ? q : { ...q, type: 'youtube' })); return s; } catch { return { ...DEF }; } };
const ERR = { 2: 'This link is not a valid YouTube video id.', 5: 'This video cannot play in the HTML5 player.', 100: 'The video was removed or made private.', 101: 'The owner does not allow this video to be embedded.', 150: 'The owner does not allow this video to be embedded.', 153: 'YouTube needs the page origin to play this video.' };

// ------------------------------------------------------------------ link parsing
export function parseYouTube(s) {
  s = String(s || '').trim(); if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { v: s };
  let u; try { u = new URL(s.startsWith('http') ? s : `https://${s}`); } catch { return null; }
  if (!/(^|\.)youtube(-nocookie)?\.com$|(^|\.)youtu\.be$|(^|\.)music\.youtube\.com$/.test(u.hostname)) return null;
  const list = u.searchParams.get('list'); let v = u.searchParams.get('v');
  if (!v && u.hostname.endsWith('youtu.be')) v = u.pathname.slice(1, 12);
  const m = u.pathname.match(/\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/); if (!v && m) v = m[2];
  const t = Number((u.searchParams.get('t') || u.searchParams.get('start') || '0').replace(/s$/, '')) || 0;
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return { v, list: list || undefined, t };
  if (list) return { list };
  return null;
}
export function parseLink(s) {
  s = String(s || '').trim(); if (!s) return null;
  const yt = parseYouTube(s); if (yt) return { type: 'youtube', ...yt, title: yt.v ? `YouTube ${yt.v}` : 'YouTube playlist' };
  let u; try { u = new URL(s.startsWith('http') ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  const sp = host === 'open.spotify.com' && u.pathname.match(/\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,40})/);
  if (sp) return { type: 'spotify', uri: `spotify:${sp[1]}:${sp[2]}`, url: u.href, title: `Spotify ${sp[1]}` };
  if (/^spotify:(track|album|playlist|episode|show|artist):[A-Za-z0-9]+$/.test(s)) return { type: 'spotify', uri: s, url: s, title: `Spotify ${s.split(':')[1]}` };
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') return { type: 'soundcloud', url: u.href, title: `SoundCloud ${u.pathname.split('/').filter(Boolean).slice(-1)[0] || ''}` };
  const vm = host.endsWith('vimeo.com') && u.pathname.match(/\/(\d{5,12})/);
  if (vm) return { type: 'vimeo', id: vm[1], title: `Vimeo ${vm[1]}` };
  if (/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)(\?|#|$)/i.test(u.pathname)) return { type: 'audio', url: u.href, title: decodeURIComponent(u.pathname.split('/').pop()) };
  if (/\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i.test(u.pathname)) return { type: 'video', url: u.href, title: decodeURIComponent(u.pathname.split('/').pop()) };
  return null;
}
function script(src, readyName) {
  if (!LOAD[src]) LOAD[src] = new Promise((res, rej) => {
    if (readyName) { const prev = window[readyName]; window[readyName] = (...a) => { prev?.(...a); res(a[0]); }; }
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = () => { if (!readyName) res(); }; s.onerror = () => { delete LOAD[src]; rej(new Error(`Could not reach ${new URL(src).hostname} (offline or blocked).`)); };
    document.head.appendChild(s);
  });
  return LOAD[src];
}

// ------------------------------------------------------------------ UI
export function initPlayer() {
  const b = document.querySelector('#mp-open'); if (b) b.onclick = () => toggle(true);
  S = loadState();
  if (S.queue.length && localStorage.getItem('mp-open') === '1') toggle(true);
}
function toggle(show) {
  if (!box) build();
  box.hidden = !show; try { localStorage.setItem('mp-open', show ? '1' : '0'); } catch { /* ignore */ }
  if (show && S.queue.length && !AD) start(S.i, S.t, false);
  if (!show) { AD?.pause?.(); save(); }
}
function build() {
  box = document.createElement('section'); box.className = 'mp'; box.setAttribute('aria-label', 'Mini player');
  box.innerHTML = `<header class="mp-h" title="Drag to move"><b>▶ Player</b><span class="mp-title" id="mp-title">add a link or a file</span>
      <button class="mp-ib" data-a="min" title="Minimise">–</button><button class="mp-ib" data-a="close" title="Close (keeps your queue)">×</button></header>
    <div class="mp-body">
      <div class="mp-video" id="mp-stage"><div class="mp-msg" id="mp-msg" hidden></div></div>
      <div class="mp-seek"><span id="mp-cur">0:00</span><input id="mp-pos" type="range" min="0" max="1000" value="0" aria-label="Seek"><span id="mp-dur">0:00</span></div>
      <div class="mp-ctl">
        <button class="mp-ib" data-a="prev" title="Previous">⏮</button><button class="mp-ib" data-a="b5" title="Back 5 s">−5</button><button class="mp-ib" data-a="b1" title="Back 1 s">−1</button>
        <button class="mp-ib mp-play" data-a="play" id="mp-play" title="Play / pause (space)">▶</button>
        <button class="mp-ib" data-a="f1" title="Forward 1 s">+1</button><button class="mp-ib" data-a="f5" title="Forward 5 s">+5</button><button class="mp-ib" data-a="next" title="Next">⏭</button>
        <select id="mp-rate" title="Speed">${[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => `<option value="${r}">${r}×</option>`).join('')}</select>
        <input id="mp-vol" type="range" min="0" max="100" title="Volume" aria-label="Volume">
      </div>
      <div class="mp-ctl mp-adv">
        <label title="Play the next item automatically"><input type="checkbox" id="mp-auto"> auto-next</label>
        <select id="mp-loop" title="Repeat"><option value="off">repeat off</option><option value="one">repeat one</option><option value="all">loop queue</option></select>
        <label title="Shuffle"><input type="checkbox" id="mp-shuf"> shuffle</label>
        <button class="mp-ib" data-a="abA" title="Set loop start (A)">A</button><button class="mp-ib" data-a="abB" title="Set loop end (B)">B</button><button class="mp-ib" data-a="abX" title="Clear A-B loop">A-B ×</button>
        <label title="Mirror the picture"><input type="checkbox" id="mp-mir"> mirror</label>
        <select id="mp-dock" title="Dock"><option value="br">dock ↘</option><option value="bl">dock ↙</option><option value="tr">dock ↗</option><option value="tl">dock ↖</option><option value="free">free</option></select>
        <input id="mp-op" type="range" min="40" max="100" title="Opacity" aria-label="Opacity">
      </div>
      <form class="mp-add" id="mp-add"><input id="mp-url" placeholder="Paste links: YouTube, Spotify, SoundCloud, Vimeo, mp3/mp4… (many at once)" aria-label="Links"><button class="ghost-btn tiny">Add</button>
        <label class="ghost-btn tiny" title="Play files from this device (no ads)">📁 Files<input type="file" id="mp-files" accept="audio/*,video/*" multiple hidden></label>
        <button class="ghost-btn tiny" type="button" id="mp-find" title="Search on YouTube in a new tab">Find ↗</button></form>
      <ol class="mp-q" id="mp-q"></ol>
      <div class="mp-qa"><button class="ghost-btn tiny" data-a="clear">Clear queue</button> <button class="ghost-btn tiny" data-a="exportq">Copy queue links</button></div>
      <p class="mp-note">Direct links and your own files play without ads. YouTube, Spotify, SoundCloud and Vimeo play through their official players and decide their own ads or previews (a signed-in Premium account follows that account); this player does not block them.</p>
    </div>`;
  document.body.appendChild(box);
  place();
  box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a)));
  const $ = (s) => box.querySelector(s);
  $('#mp-rate').value = S.rate; $('#mp-vol').value = S.vol; $('#mp-loop').value = S.loop; $('#mp-mir').checked = S.mirror; $('#mp-shuf').checked = S.shuffle; $('#mp-auto').checked = S.auto;
  $('#mp-dock').value = S.dock; $('#mp-op').value = Math.round(S.op * 100);
  $('#mp-rate').onchange = (e) => { S.rate = Number(e.target.value); AD?.rate?.(S.rate); save(); };
  $('#mp-vol').oninput = (e) => { S.vol = Number(e.target.value); AD?.volume?.(S.vol); save(); };
  $('#mp-loop').onchange = (e) => { S.loop = e.target.value; save(); };
  $('#mp-auto').onchange = (e) => { S.auto = e.target.checked; save(); };
  $('#mp-shuf').onchange = (e) => { S.shuffle = e.target.checked; save(); };
  $('#mp-mir').onchange = (e) => { S.mirror = e.target.checked; mirror(); save(); };
  $('#mp-dock').onchange = (e) => { S.dock = e.target.value; place(); save(); };
  $('#mp-op').oninput = (e) => { S.op = Number(e.target.value) / 100; box.style.opacity = S.op; save(); };
  $('#mp-pos').oninput = (e) => { const d = AD?.duration?.() || 0; if (d) AD.seek(d * Number(e.target.value) / 1000); };
  $('#mp-add').onsubmit = (e) => { e.preventDefault(); add($('#mp-url').value); $('#mp-url').value = ''; };
  $('#mp-files').onchange = (e) => { const fs = [...e.target.files]; const first = S.queue.length; fs.forEach((f) => S.queue.push({ type: 'local', url: URL.createObjectURL(f), title: f.name, media: f.type.startsWith('video') ? 'video' : 'audio' })); queue(); if (!AD || first === 0) start(first, 0, true); };
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
  clearInterval(saveT); saveT = setInterval(save, 5000);
}
function place() {
  box.style.left = box.style.right = box.style.top = box.style.bottom = '';
  if (S.dock === 'free' && S.x !== null) { box.style.left = `${Math.max(0, Math.min(innerWidth - 120, S.x))}px`; box.style.top = `${Math.max(0, Math.min(innerHeight - 60, S.y))}px`; return; }
  if (S.dock.includes('b')) box.style.bottom = '16px'; else box.style.top = '70px';
  if (S.dock.includes('r')) box.style.right = '16px'; else box.style.left = '16px';
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
function mirror() { const f = box.querySelector('#mp-stage .mp-media'); if (f) f.style.transform = S.mirror ? 'scaleX(-1)' : ''; }
function msg(t) { const m = box.querySelector('#mp-msg'); m.hidden = !t; m.textContent = t || ''; }
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
function add(text) {
  const parts = String(text).split(/[\s,]+/).filter(Boolean); let added = 0; const first = S.queue.length;
  for (const p of parts) { const y = parseLink(p); if (y) { S.queue.push(y); added++; } }
  if (!added) { msg('Not a supported link (YouTube, Spotify, SoundCloud, Vimeo or a direct audio/video file).'); return; }
  msg(''); save(); queue();
  if (!AD || first === 0) start(first, 0, true);
}
function queue() {
  const q = box.querySelector('#mp-q');
  q.innerHTML = S.queue.map((x, i) => `<li class="${i === S.i ? 'on' : ''}"><span>${ICON[x.type] || '•'}</span><button class="mp-qt" data-p="${i}">${esc(x.title)}</button><button class="mp-ib" data-up="${i}" title="Move up">↑</button><button class="mp-ib" data-rm="${i}" title="Remove">×</button></li>`).join('') || '<li class="muted">Queue is empty.</li>';
  q.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => start(Number(b.dataset.p), 0, true)));
  q.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.rm); S.queue.splice(i, 1); if (i < S.i) S.i--; else if (i === S.i) { stop(); S.i = Math.min(S.i, S.queue.length - 1); } save(); queue(); }));
  q.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.up); if (i > 0) { [S.queue[i - 1], S.queue[i]] = [S.queue[i], S.queue[i - 1]]; if (S.i === i) S.i--; else if (S.i === i - 1) S.i++; save(); queue(); } }));
}

// ------------------------------------------------------------------ adapters: one interface for every source
function stop() { try { AD?.destroy?.(); } catch { /* ignore */ } AD = null; const st = box.querySelector('#mp-stage'); [...st.children].forEach((c) => { if (c.id !== 'mp-msg') c.remove(); }); }
function mount(tag, attrs = {}) { const st = box.querySelector('#mp-stage'); const el = document.createElement(tag); el.className = 'mp-media'; Object.assign(el, attrs); st.insertBefore(el, st.firstChild); return el; }
const playing = (on) => { box.querySelector('#mp-play').textContent = on ? '⏸' : '▶'; };
async function start(i, t, autoplay) {
  const item = S.queue[i]; if (!item) return;
  S.i = i; ab = null; queue(); msg(''); stop();
  box.querySelector('#mp-title').textContent = item.title;
  box.classList.toggle('audio', ['audio', 'spotify', 'soundcloud'].includes(item.type) || (item.type === 'local' && item.media === 'audio'));
  try {
    if (item.type === 'youtube') AD = await ytAdapter(item, t, autoplay);
    else if (item.type === 'audio' || item.type === 'video' || item.type === 'local') AD = html5Adapter(item, t, autoplay);
    else if (item.type === 'spotify') AD = await withTimeout(spotifyAdapter(item, autoplay), () => plainEmbed(`https://open.spotify.com/embed/${item.uri.split(':')[1]}/${item.uri.split(':')[2]}`));
    else if (item.type === 'soundcloud') AD = await withTimeout(scAdapter(item, autoplay), () => plainEmbed(`https://w.soundcloud.com/player/?url=${encodeURIComponent(item.url)}`));
    else if (item.type === 'vimeo') AD = await withTimeout(vimeoAdapter(item, t, autoplay), () => plainEmbed(`https://player.vimeo.com/video/${item.id}?dnt=1`));
    if (S.queue[S.i] !== item) { stop(); return; } // the user moved on while this was loading
  } catch (e) { msg(`${e.message} Skipping to the next item.`); setTimeout(() => next(true), 2500); return; }
  mirror(); poll();
}
function ytAdapter(item, t, autoplay) {
  return script('https://www.youtube.com/iframe_api', 'onYouTubeIframeAPIReady').then(() => new Promise((res) => {
    const host = mount('div', { id: 'mp-yt' });
    const vars = { playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin, start: Math.floor(t || item.t || 0), autoplay: autoplay ? 1 : 0 };
    const p = new window.YT.Player(host, {
      host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%', videoId: item.v || undefined,
      playerVars: item.list && !item.v ? { ...vars, listType: 'playlist', list: item.list } : (item.list ? { ...vars, list: item.list } : vars),
      events: {
        onReady: () => { p.setVolume(S.vol); p.setPlaybackRate(S.rate); if (autoplay) p.playVideo(); res(ad); },
        onStateChange: (e) => { const Y = window.YT.PlayerState; playing(e.data === Y.PLAYING);
          if (e.data === Y.PLAYING) { const d = p.getVideoData?.(); if (d?.title && item.title !== d.title) { item.title = d.title; box.querySelector('#mp-title').textContent = d.title; queue(); save(); } p.setPlaybackRate(S.rate); }
          if (e.data === Y.ENDED) ended(); },
        onError: (e) => { msg(`${ERR[e.data] || `Playback error ${e.data}.`} Skipping to the next item.`); setTimeout(() => next(true), 2500); },
      },
    });
    const ad = { play: () => p.playVideo(), pause: () => p.pauseVideo(), toggle: () => (p.getPlayerState() === window.YT.PlayerState.PLAYING ? p.pauseVideo() : p.playVideo()),
      seek: (s) => p.seekTo(s, true), time: () => p.getCurrentTime?.() || 0, duration: () => p.getDuration?.() || 0, rate: (r) => p.setPlaybackRate(r), volume: (v) => { p.setVolume(v); p.unMute(); }, destroy: () => p.destroy() };
  }));
}
function html5Adapter(item, t, autoplay) {
  const isVideo = item.type === 'video' || (item.type === 'local' && item.media === 'video');
  const el = mount(isVideo ? 'video' : 'audio', { src: item.url, controls: false, playsInline: true, preload: 'auto' });
  if (!isVideo) { box.querySelector('#mp-stage').insertAdjacentHTML('afterbegin', `<div class="mp-media mp-art">${ICON[item.type]}<span>${esc(item.title)}</span></div>`); }
  el.volume = S.vol / 100; el.playbackRate = S.rate;
  el.addEventListener('loadedmetadata', () => { if (t) el.currentTime = t; });
  el.addEventListener('play', () => playing(true)); el.addEventListener('pause', () => playing(false));
  el.addEventListener('ended', ended);
  el.addEventListener('error', () => { msg('This file could not be played (format, link or permissions). Skipping to the next item.'); setTimeout(() => next(true), 2500); });
  if (autoplay) el.play().catch(() => msg('Press ▶ to start (the browser blocked autoplay).'));
  return { play: () => el.play(), pause: () => el.pause(), toggle: () => (el.paused ? el.play() : el.pause()), seek: (s) => { el.currentTime = s; }, time: () => el.currentTime, duration: () => el.duration || 0,
    rate: (r) => { el.playbackRate = r; }, volume: (v) => { el.volume = v / 100; }, destroy: () => { el.pause(); el.removeAttribute('src'); el.load(); } };
}
function spotifyAdapter(item, autoplay) {
  return script('https://open.spotify.com/embed/iframe-api/v1', 'onSpotifyIframeApiReady').then((API) => new Promise((res) => {
    const host = mount('div');
    let pos = 0, dur = 0, paused = true, done = false;
    API.createController(host, { uri: item.uri, width: '100%', height: '100%' }, (c) => {
      c.addListener('playback_update', (e) => {
        const d = e.data || {}; pos = (d.position || 0) / 1000; dur = (d.duration || 0) / 1000; paused = !!d.isPaused; playing(!paused);
        if (!done && dur > 0 && !paused && pos >= dur - 1.2) { done = true; setTimeout(ended, 800); }
      });
      c.addListener('ready', () => { if (autoplay) c.play(); });
      res({ play: () => c.resume(), pause: () => c.pause(), toggle: () => c.togglePlay(), seek: (s) => c.seek(s), time: () => pos, duration: () => dur, destroy: () => c.destroy() });
    });
  }));
}
function scAdapter(item, autoplay) {
  return script('https://w.soundcloud.com/player/api.js').then(() => new Promise((res) => {
    const f = mount('iframe', { allow: 'autoplay', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(item.url)}&auto_play=${autoplay ? 'true' : 'false'}&visual=true&show_comments=false` });
    const w = window.SC.Widget(f); let pos = 0, dur = 0;
    w.bind(window.SC.Widget.Events.READY, () => { w.setVolume(S.vol); w.getCurrentSound((s) => { if (s?.title) { item.title = s.title; box.querySelector('#mp-title').textContent = s.title; queue(); save(); } }); });
    w.bind(window.SC.Widget.Events.PLAY_PROGRESS, (e) => { pos = (e.currentPosition || 0) / 1000; });
    w.bind(window.SC.Widget.Events.PLAY, () => { playing(true); w.getDuration((d) => { dur = d / 1000; }); });
    w.bind(window.SC.Widget.Events.PAUSE, () => playing(false));
    w.bind(window.SC.Widget.Events.FINISH, ended);
    res({ play: () => w.play(), pause: () => w.pause(), toggle: () => w.toggle(), seek: (s) => w.seekTo(s * 1000), time: () => pos, duration: () => dur, volume: (v) => w.setVolume(v), destroy: () => f.remove() });
  }));
}
function vimeoAdapter(item, t, autoplay) {
  return script('https://player.vimeo.com/api/player.js').then(() => {
    const f = mount('iframe', { allow: 'autoplay; fullscreen; picture-in-picture', src: `https://player.vimeo.com/video/${item.id}?autoplay=${autoplay ? 1 : 0}&dnt=1` });
    const p = new window.Vimeo.Player(f); let pos = 0, dur = 0;
    p.on('timeupdate', (e) => { pos = e.seconds; dur = e.duration; });
    p.on('play', () => playing(true)); p.on('pause', () => playing(false)); p.on('ended', ended);
    p.on('loaded', () => { if (t) p.setCurrentTime(t); p.setVolume(S.vol / 100); p.setPlaybackRate(S.rate).catch(() => {}); p.getVideoTitle().then((ti) => { item.title = ti; box.querySelector('#mp-title').textContent = ti; queue(); save(); }); });
    p.on('error', () => { msg('Vimeo could not play this video. Skipping to the next item.'); setTimeout(() => next(true), 2500); });
    return { play: () => p.play(), pause: () => p.pause(), toggle: () => p.getPaused().then((x) => (x ? p.play() : p.pause())), seek: (s) => p.setCurrentTime(s), time: () => pos, duration: () => dur,
      rate: (r) => p.setPlaybackRate(r).catch(() => {}), volume: (v) => p.setVolume(v / 100), destroy: () => { p.destroy().catch(() => f.remove()); } };
  });
}

// a platform API that does not answer in 10 s: show its plain official embed (play inside it; ⏭ moves on)
function withTimeout(promise, fallback) {
  return Promise.race([promise, new Promise((res) => setTimeout(() => res(null), 10000))]).then((ad) => {
    if (ad) return ad;
    stop(); msg('The player API did not respond: playing the plain embed. Use ⏭ to move to the next item.'); return fallback();
  });
}
function plainEmbed(src) {
  const f = mount('iframe', { allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture', src });
  return { play() {}, pause() {}, toggle() {}, seek() {}, time: () => 0, duration: () => 0, destroy: () => f.remove() };
}

// ------------------------------------------------------------------ queue flow
function ended() {
  if (S.loop === 'one') { AD?.seek?.(0); AD?.play?.(); return; }
  if (S.auto) next(false);
}
function next(fromError) {
  if (!S.queue.length) return;
  let n = S.shuffle && S.queue.length > 1 ? (S.i + 1 + Math.floor(Math.random() * (S.queue.length - 1))) % S.queue.length : S.i + 1;
  if (n >= S.queue.length) { if (S.loop === 'all' || fromError === 'manual') n = 0; else return; }
  start(n, 0, true);
}
function poll() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!AD || box.hidden) return;
    const c = AD.time(), d = AD.duration() || 0;
    if (ab && ab.b != null && c >= ab.b) AD.seek(ab.a);
    box.querySelector('#mp-cur').textContent = fmt(c); box.querySelector('#mp-dur').textContent = fmt(d);
    if (document.activeElement !== box.querySelector('#mp-pos')) box.querySelector('#mp-pos').value = d ? Math.round(c / d * 1000) : 0;
    S.t = c;
  }, 250);
}
function act(a) {
  if (a === 'close') return toggle(false);
  if (a === 'min') { S.min = !S.min; box.classList.toggle('min', S.min); save(); return; }
  if (a === 'clear') { if (confirm('Clear the whole queue?')) { stop(); S.queue = []; S.i = 0; save(); queue(); box.querySelector('#mp-title').textContent = 'add a link or a file'; } return; }
  if (a === 'exportq') { navigator.clipboard?.writeText(S.queue.filter((q) => q.type !== 'local').map((q) => q.url || (q.v ? `https://youtu.be/${q.v}` : q.list ? `https://www.youtube.com/playlist?list=${q.list}` : q.id ? `https://vimeo.com/${q.id}` : q.uri)).join('\n')); msg('Queue links copied.'); setTimeout(() => msg(''), 1500); return; }
  if (a === 'next') return next('manual');
  if (a === 'prev' && !AD) return start(Math.max(0, S.i - 1), 0, true);
  if (!AD) { if (a === 'play' && S.queue.length) start(S.i, S.t, true); return; }
  const c = AD.time();
  if (a === 'play') return AD.toggle();
  if (a === 'b5') return AD.seek(Math.max(0, c - 5)); if (a === 'f5') return AD.seek(c + 5);
  if (a === 'b1') return AD.seek(Math.max(0, c - 1)); if (a === 'f1') return AD.seek(c + 1);
  if (a === 'next') return next('manual');
  if (a === 'prev') return c > 3 ? AD.seek(0) : start(Math.max(0, S.i - 1), 0, true);
  if (a === 'abA') { ab = { a: c, b: null }; msg(`Loop start A at ${fmt(c)}. Press B for the end.`); return; }
  if (a === 'abB') { if (!ab) ab = { a: 0 }; ab.b = c > ab.a ? c : ab.a + 1; msg(`Repeating ${fmt(ab.a)} – ${fmt(ab.b)}.`); setTimeout(() => msg(''), 2500); return; }
  if (a === 'abX') { ab = null; msg(''); }
}
window.__mp = { parseYouTube, parseLink, get state() { return S; }, add: (t) => { toggle(true); add(t); } };
