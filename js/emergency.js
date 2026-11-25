// Emergency tab: what a bystander can do until help arrives, situation by situation, plus the levels of life support
// (first aid, BLS, ALS, PALS/NRP, trauma) and where to train. Every step is a whole sentence quoted unchanged from a
// named open-licence chapter (data/anatomy_lab/emergency/emergency.json, tools/emergency_build.py + emergency_picks.py).
// Step names, situation names, the numbers list and the training path are a navigation index, not medical content.
// The bedside tools (CPR rhythm, breath counter, event log) keep nothing: no storage, nothing sent.

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STEP = [
  ['safety', '1', 'Make it safe'],
  ['recognise', '2', 'Recognise it'],
  ['call', '3', 'Call for help'],
  ['act', '4', 'What to do now'],
  ['monitor', '5', 'Keep watching until help arrives'],
  ['avoid', '6', 'Do not'],
  ['prevent', '7', 'Prevent next time'],
];
const GROUPS = ['Medical', 'Injury', 'Environment', 'Children & birth', 'No help nearby'];
// emergency numbers (navigation data; check the number where you are)
const NUMBERS = [
  ['India', [['112', 'all emergencies'], ['108', 'ambulance (most states)'], ['14416', 'Tele-MANAS mental health, 24x7'], ['1-800-891-4416', 'Tele-MANAS']]],
  ['European Union', [['112', 'all emergencies']]],
  ['USA / Canada', [['911', 'all emergencies'], ['988', 'suicide & crisis line'], ['1-800-222-1222', 'poison centre (USA)']]],
  ['United Kingdom', [['999', 'emergencies'], ['111', 'urgent, not life-threatening (NHS)']]],
  ['Australia', [['000', 'all emergencies']]],
];
// where to train (navigation; course content and certification belong to each provider)
const TRAIN = [
  ['First aid', 'Everyone', [
    ['Indian Red Cross Society', 'https://www.indianredcross.org/'], ['IFRC Global First Aid Reference Centre', 'https://www.globalfirstaidcentre.org/'],
    ['American Red Cross classes', 'https://www.redcross.org/take-a-class'], ['Stop the Bleed', 'https://www.stopthebleed.org/'],
    ['Mental Health First Aid International', 'https://www.mhfainternational.org/']]],
  ['BLS', 'Everyone who can, and all coaches, teachers, lifeguards, health and sport staff', [
    ['American Heart Association: CPR & ECC', 'https://cpr.heart.org/'], ['European Resuscitation Council', 'https://www.erc.edu/'],
    ['Resuscitation Council UK', 'https://www.resus.org.uk/'], ['Australian Resuscitation Council', 'https://www.resus.com.au/']]],
  ['ALS / ACLS', 'Doctors, nurses, paramedics', [
    ['American Heart Association (ACLS)', 'https://cpr.heart.org/'], ['European Resuscitation Council (ALS)', 'https://www.erc.edu/'], ['Resuscitation Council UK (ALS)', 'https://www.resus.org.uk/']]],
  ['PALS / NRP', 'Anyone caring for children or newborns professionally', [
    ['American Heart Association (PALS)', 'https://cpr.heart.org/'], ['European Resuscitation Council (EPALS, NLS)', 'https://www.erc.edu/'],
    ['American Academy of Pediatrics: Neonatal Resuscitation Program', 'https://www.aap.org/en/pedialink/neonatal-resuscitation-program/']]],
  ['Trauma (ATLS, PHTLS, TCCC)', 'Doctors (ATLS), prehospital staff (PHTLS), tactical / austere care (TECC, TCCC)', [
    ['American College of Surgeons: ATLS', 'https://www.facs.org/quality-programs/trauma/education/advanced-trauma-life-support/'],
    ['NAEMT: PHTLS', 'https://www.naemt.org/education/trauma-education/phtls'], ['NAEMT: TECC', 'https://www.naemt.org/education/trauma-education/tecc'],
    ['Deployed Medicine (TCCC)', 'https://www.deployedmedicine.com/']]],
  ['Wilderness', 'Anyone far from help: trekking, rural work, expeditions', [['NOLS Wilderness Medicine', 'https://www.nols.edu/courses/wm/']]],
];
let D = null, sel = null, grp = '', q = '', pro = false;

export async function startEmergency() {
  const host = $('#emergency-body'); if (!host) return;
  if (!D) {
    D = await fetch('/meridian-4D/rt/emergency/emergency.json').then((r) => r.json()).catch(() => null);
    if (!D) { host.innerHTML = '<p class="muted">Emergency data not built (tools/emergency_build.py).</p>'; return; }
  }
  const want = location.hash.slice(1).split('/')[1];
  if (want && D.scenarios.some((s) => s.id === want)) sel = want;
  render(host);
}

const cite = (x) => `<span class="cite">${esc(x.src)}, “<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>”${x.sec ? `, ${esc(x.sec)}` : ''} · ${esc(x.lic)}</span>`;
const quote = (x) => `<blockquote class="em-q">${esc(x.text)}<br>${cite(x)}</blockquote>`;

function render(host) {
  const uni = D.universal;
  host.innerHTML = `
  <section class="card em-hero">
    <div class="card-h"><h2>🚨 Emergency: what to do until help arrives</h2><small>${D.counts.scenarios} situations · ${D.counts.quotes} quoted sentences</small></div>
    <p class="em-first"><b>Call first.</b> If someone is unresponsive, not breathing normally, bleeding heavily, or you are unsure, call your emergency number now and put the phone on speaker. The dispatcher can guide you.</p>
    <div class="em-nums">${NUMBERS.map(([where, ns]) => `<div class="em-num"><small>${esc(where)}</small>${ns.map(([n, what]) => `<a href="tel:${esc(n.replace(/[^0-9+]/g, ''))}"><b>${esc(n)}</b> <span>${esc(what)}</span></a>`).join('')}</div>`).join('')}</div>
    <p class="fine">Numbers are a quick list; check the number where you are. Education only: this page does not replace a first-aid course or the instructions of the emergency dispatcher.</p>
  </section>

  <section class="card">
    <div class="card-h"><h2>The first minutes, in any emergency</h2><small>tap a step</small></div>
    <div class="em-uni">${uni.map((u, i) => `<details class="em-u"${i < 2 ? ' open' : ''}><summary><span class="em-n">${i + 1}</span> ${esc(u.title)}</summary>
      ${u.quotes.map(quote).join('')}
      ${u.list ? `<${u.key === 'recovery' ? 'ol' : 'ul'} class="em-list">${u.list.items.map((t) => `<li>${esc(t)}</li>`).join('')}</${u.key === 'recovery' ? 'ol' : 'ul'}><p class="fine">${cite(u.list)} (list quoted as written)</p>` : ''}
    </details>`).join('')}</div>
  </section>

  <section class="card">
    <div class="card-h"><h2>Find the situation</h2>
      <input id="em-q" type="search" placeholder="Search: bleeding, stroke, burn, choking…" value="${esc(q)}" aria-label="Search situations"></div>
    <div class="em-groups"><button class="ghost-btn ${grp ? '' : 'on'}" data-g="">All</button>${GROUPS.map((g) => `<button class="ghost-btn ${grp === g ? 'on' : ''}" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
    <div class="em-grid" id="em-grid"></div>
    <div id="em-sit"></div>
  </section>

  <section class="card" id="em-tools">
    <div class="card-h"><h2>Bedside tools while you wait</h2><small>nothing is saved or sent</small></div>
    <div class="em-toolgrid">
      <div class="em-tool"><h3>CPR rhythm</h3>
        <div class="em-beat" id="em-beat"><b id="em-count">0</b><small id="em-cue">press start</small></div>
        <div class="em-row"><button class="ghost-btn" id="em-cpr">▶ Start</button>
          <label><input type="radio" name="em-mode" value="hands" checked> hands-only</label><label><input type="radio" name="em-mode" value="30:2"> 30 : 2</label>
          <label><input type="checkbox" id="em-sound" checked> sound</label></div>
        <p class="fine" id="em-cprtime"></p>
        ${D.cpr.map(quote).join('')}
        ${pickQ('arrest', 'monitor', 0)}
        <p class="fine">The beat runs at 110 per minute, inside the quoted 100 to 120.</p></div>
      <div class="em-tool"><h3>Breathing or pulse count</h3>
        <p class="fine">Press start, then tap once for every breath (or beat) for 30 seconds.</p>
        <div class="em-row"><button class="ghost-btn" id="em-cnt-go">▶ Start 30 s</button><button class="em-tap" id="em-tap" disabled>TAP</button></div>
        <p class="em-big" id="em-rate">— per minute</p>
        ${pickQ('opioid', 'recognise', 1)}</div>
      <div class="em-tool"><h3>Event log for the handover</h3>
        <div class="em-row em-evts">${['Found', 'Called for help', 'CPR started', 'AED arrived', 'Shock given', 'Breathing checked', 'Seizure started', 'Seizure stopped', 'Tourniquet on', 'Naloxone given', 'Help arrived'].map((e) => `<button class="ghost-btn tiny" data-ev="${esc(e)}">${esc(e)}</button>`).join('')}</div>
        <div class="em-row">Response: ${['A', 'V', 'P', 'U'].map((a) => `<button class="ghost-btn tiny" data-ev="AVPU: ${a}">${a}</button>`).join('')}
          <input id="em-note" placeholder="note…" aria-label="note"><button class="ghost-btn tiny" id="em-add">add</button></div>
        <ol class="em-log" id="em-log"></ol>
        <div class="em-row"><button class="ghost-btn tiny" id="em-copy">Copy for the crew</button><button class="ghost-btn tiny" id="em-clear">Clear</button></div>
        <p class="fine">The log lives only in this open page; closing or reloading it clears everything.</p></div>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h2>Levels of life support, and where to train</h2><small>first aid → BLS → ALS → PALS/NRP → trauma</small></div>
    <p>Recommended path: everyone learns <b>first aid with CPR and an AED</b>, plus <b>Stop the Bleed</b>. Anyone working with people (coaches, teachers, lifeguards, health and sport staff) adds <b>BLS</b>. Doctors, nurses and paramedics go on to <b>ALS</b>, <b>PALS / NRP</b> for children and newborns, and a <b>trauma course</b>. Anyone often far from help adds <b>wilderness first aid</b>.</p>
    <div class="em-levels">${D.levels.map((l, i) => { const t = TRAIN.find((x) => x[0] === l.key) || TRAIN.find((x) => l.key.startsWith(x[0])); return `<details class="em-lv"${i === 0 ? ' open' : ''}><summary><span class="em-lvk">${esc(l.key)}</span> ${esc(l.title)}${t ? ` <small>· ${esc(t[1])}</small>` : ''}</summary>
      ${l.quotes.map(quote).join('')}
      ${t ? `<p class="em-train">Train with: ${t[2].map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join(' · ')}</p>` : ''}</details>`; }).join('')}
      <details class="em-lv"><summary><span class="em-lvk">Wilderness</span> First aid far from help <small>· ${esc(TRAIN[5][1])}</small></summary>
        <p class="em-train">Train with: ${TRAIN[5][2].map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join(' · ')} · see also the situation “No help coming soon”.</p></details>
    </div>
    <p class="fine">Guidelines behind these courses are set by the International Liaison Committee on Resuscitation (<a href="https://www.ilcor.org/" target="_blank" rel="noopener">ILCOR</a>) and national councils. Course names, links and the path above are a navigation index; certification belongs to each provider.</p>
  </section>

  <p class="fine">${esc(D.method)} Built ${esc(D.built)}. Sources: StatPearls (CC BY-NC-ND 4.0) and Disease Control Priorities, 3rd edition (CC BY 3.0 IGO), via the NCBI Bookshelf.</p>`;

  host.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { grp = b.dataset.g; host.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b)); grid(); }));
  $('#em-q').oninput = (e) => { q = e.target.value; grid(); };
  grid();
  if (sel) situation(sel, false);
  tools();
}

function pickQ(sid, step, i) {
  const x = D.scenarios.find((s) => s.id === sid)?.steps[step]?.[i];
  return x ? quote(x) : '';
}

function grid() {
  const g = $('#em-grid'); if (!g) return;
  const t = q.trim().toLowerCase();
  const list = D.scenarios.filter((s) => (!grp || s.group === grp) && (!t || s.name.toLowerCase().includes(t)
    || Object.values(s.steps).some((v) => v.some((x) => x.text.toLowerCase().includes(t)))));
  g.innerHTML = list.map((s) => `<button class="em-sb ${s.id === sel ? 'on' : ''}" data-s="${s.id}"><span>${s.icon}</span><b>${esc(s.name)}</b><small>${esc(s.group)}</small></button>`).join('')
    || '<p class="muted">No situation matches. Try another word, or call your emergency number.</p>';
  g.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => situation(b.dataset.s, true)));
}

function situation(id, scroll) {
  sel = id; const s = D.scenarios.find((x) => x.id === id); if (!s) return;
  document.querySelectorAll('.em-sb').forEach((b) => b.classList.toggle('on', b.dataset.s === id));
  if (location.hash.slice(1) !== `emergency/${id}`) history.replaceState(null, '', `#emergency/${id}`);
  const empty = (k) => k === 'safety' ? 'No situation-specific quote. Use “Is it safe to approach?” in The first minutes above.'
    : k === 'call' ? 'No situation-specific quote. If in doubt, call your emergency number (list at the top).'
      : 'No quote found in this situation’s chapters.';
  const rel = s.related.map((r) => D.scenarios.find((x) => x.id === r)).filter(Boolean);
  const proSteps = s.steps.pro || [];
  $('#em-sit').innerHTML = `<article class="em-sit">
    <div class="card-h"><h2>${s.icon} ${esc(s.name)}</h2><small>${esc(s.group)}</small></div>
    ${s.id === 'mind' ? `<p class="em-first">If someone may act on thoughts of suicide, stay with them and call now: India <a href="tel:14416"><b>Tele-MANAS 14416</b></a>, or the crisis line where you are (list at the top).</p>` : ''}
    <ol class="em-steps">${STEP.map(([k, n, label]) => { const v = s.steps[k] || []; if (!v.length && k === 'prevent') return ''; return `<li class="em-step ${k === 'avoid' ? 'em-avoid' : ''}"><h3><span class="em-n">${n}</span> ${esc(label)}</h3>
      ${v.length ? v.map(quote).join('') : `<p class="em-nq">${esc(empty(k))}</p>`}</li>`; }).join('')}</ol>
    ${rel.length ? `<p class="em-rel">See also: ${rel.map((r) => `<button class="ghost-btn tiny" data-rel="${r.id}">${r.icon} ${esc(r.name)}</button>`).join(' ')}</p>` : ''}
    <details class="em-pro"${pro ? ' open' : ''}><summary>Professional care: trained, authorised providers only (ALS, hospital)</summary>
      <p class="em-warn">Needles, airway procedures, drugs and other invasive steps belong to trained providers working within their scope and protocols. Without training and equipment they can kill; a bystander’s job is the steps above.</p>
      ${proSteps.map(quote).join('')}
      <p class="fine">Full professional management: the “Treatment / Management” section of ${s.chapters.map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>`).join(', ')} (StatPearls; drug doses are not reproduced here).</p>
    </details>
    <p class="fine">Quoted from: ${s.chapters.map((c) => `${esc(c.title)} (${esc(c.lic)})`).join('; ')}.</p>
  </article>`;
  $('#em-sit').querySelectorAll('[data-rel]').forEach((b) => (b.onclick = () => situation(b.dataset.rel, true)));
  $('#em-sit details.em-pro').ontoggle = (e) => { pro = e.target.open; };
  if (scroll) $('#em-sit').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ------------------------------------------------------------------ bedside tools (in memory only)
let cprT = null, cprN = 0, cprStart = 0, actx = null, cntEnd = 0, cntN = 0, cntT = null;
const log = [];
function click(hi) {
  if (!$('#em-sound')?.checked) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = hi ? 1320 : 880; g.gain.value = 0.15; o.connect(g); g.connect(actx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08); o.stop(actx.currentTime + 0.09);
  } catch { /* audio may be blocked */ }
}
function tools() {
  const beat = $('#em-beat'), cnt = $('#em-count'), cue = $('#em-cue'), btn = $('#em-cpr'), tm = $('#em-cprtime');
  const stop = () => { clearInterval(cprT); cprT = null; btn.textContent = '▶ Start'; cue.textContent = 'stopped'; beat.classList.remove('go'); };
  if (cprT) stop();
  btn.onclick = () => {
    if (cprT) return stop();
    cprN = 0; cprStart = performance.now(); btn.textContent = '■ Stop'; beat.classList.add('go');
    addLog('CPR rhythm started');
    let pauseUntil = 0;
    cprT = setInterval(() => {
      const now = performance.now(), mode = document.querySelector('input[name=em-mode]:checked')?.value;
      const el = Math.floor((now - cprStart) / 1000);
      tm.textContent = `Running ${Math.floor(el / 60)}:${String(el % 60).padStart(2, '0')}${el >= 120 && el % 120 < 10 ? ' · about 2 minutes: swap compressors if you can' : ''}`;
      if (now < pauseUntil) return;
      cprN++;
      if (mode === '30:2' && cprN > 30) { cprN = 0; cnt.textContent = '2'; cue.textContent = 'give 2 breaths'; pauseUntil = now + 4000; beat.classList.remove('pulse'); return; }
      cnt.textContent = String(cprN); cue.textContent = mode === '30:2' ? 'push hard, push fast' : 'push hard, push fast';
      beat.classList.remove('pulse'); void beat.offsetWidth; beat.classList.add('pulse');
      click(cprN === 1);
    }, 60000 / 110);
  };
  const go = $('#em-cnt-go'), tap = $('#em-tap'), rate = $('#em-rate');
  go.onclick = () => {
    cntN = 0; cntEnd = performance.now() + 30000; tap.disabled = false; rate.textContent = 'counting… 30 s';
    clearInterval(cntT);
    cntT = setInterval(() => {
      const left = Math.ceil((cntEnd - performance.now()) / 1000);
      if (left <= 0) { clearInterval(cntT); tap.disabled = true; rate.textContent = `${cntN * 2} per minute (${cntN} in 30 s)`; addLog(`Count: ${cntN * 2} per minute`); return; }
      rate.textContent = `counting… ${left} s · ${cntN} taps`;
    }, 200);
  };
  tap.onclick = () => { if (performance.now() < cntEnd) cntN++; };
  document.querySelectorAll('[data-ev]').forEach((b) => (b.onclick = () => addLog(b.dataset.ev)));
  $('#em-add').onclick = () => { const n = $('#em-note'); if (n.value.trim()) { addLog(n.value.trim()); n.value = ''; } };
  $('#em-copy').onclick = () => { const t = log.map((x) => `${x.t}  ${x.e}`).join('\n'); navigator.clipboard?.writeText(t).then(() => { $('#em-copy').textContent = 'Copied'; }).catch(() => {}); };
  $('#em-clear').onclick = () => { log.length = 0; drawLog(); };
  drawLog();
}
function addLog(e) {
  const d = new Date();
  log.push({ t: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`, e });
  drawLog();
}
function drawLog() {
  const el = $('#em-log'); if (!el) return;
  el.innerHTML = log.map((x) => `<li><b>${esc(x.t)}</b> ${esc(x.e)}</li>`).join('') || '<li class="muted">Nothing logged yet.</li>';
}
window.__em = { get data() { return D; }, situation };
