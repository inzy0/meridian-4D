// Nutrition tab, part 2: food shelves (Indian / international), the rehab-phase planner (weeks and days, foods and the
// visitor's own supplement schedule with on/off breaks) and the tracking dashboard (daily log, trends, adherence).
// Quoted guidance comes from nutrition.json (phase quotes from the open-access rehab-nutrition reviews). The site
// does not suggest supplement amounts: the amount, timing and cycle in a schedule are typed in by the visitor (or
// their clinician). Everything stays in this browser, per account (nu-plan, nu-log); nothing is sent.

let A = null;
const $ = (s, r = document) => r.querySelector(s);
const r0 = (x) => Math.round(x), r1 = (x) => Math.round(x * 10) / 10;
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);
const TIMING = ['with breakfast', 'mid-morning', 'with lunch', 'afternoon', 'pre-training', 'post-training', 'with dinner', 'bedtime', 'any time'];
let LOG = null, pref = 'indian';
const loadLog = () => { try { return JSON.parse(localStorage.getItem('nu-log') || '[]') || []; } catch { return []; } };
const saveLog = () => { try { localStorage.setItem('nu-log', JSON.stringify(LOG)); } catch { /* storage blocked */ } };

export function initPlus(api) {
  A = api; LOG = loadLog();
  window.__nuPlus = { refresh: () => { track(); rehab(); } };
  shelf(); rehab(); track();
}

// ------------------------------------------------------------------ shelves
async function shelf() {
  const el = $('#nu-shelf'); if (!el) return;
  const F = await A.foods(); if (!F) { el.innerHTML = ''; return; }
  const ids = pref === 'both' ? [...new Set([...A.N.shelves.indian, ...A.N.shelves.international])] : A.N.shelves[pref];
  const byId = new Map(F.rows.map((f) => [f.id, f]));
  const meals = A.meals();
  el.innerHTML = `<div class="card-h"><h2>Food shelf</h2><small>tap a food to add 100 g to a meal · USDA values per 100 g</small></div>
    <div class="nu-who">Style: ${[['indian', 'Indian kitchen'], ['international', 'International'], ['both', 'Both']].map(([k, n]) => `<button class="ghost-btn ${pref === k ? 'on' : ''}" data-pref="${k}">${n}</button>`).join('')}
      <label>add to <select id="nu-shmeal">${meals.map((m) => `<option>${A.esc(m.name)}</option>`).join('')}</select></label></div>
    <div class="nu-shelf">${ids.map((id) => byId.get(id)).filter(Boolean).map((f) => `<button class="nu-sf" data-sf="${f.id}" title="${A.esc(f.name)}">
      <b>${A.esc(f.name.replace(/\s*\(.*?\)/g, '').split(',').slice(0, 2).join(','))}</b>
      <small>${A.val(f, 'kcal')} kcal · P ${A.val(f, 'p')} · C ${A.val(f, 'c')} · F ${A.val(f, 'f')}</small></button>`).join('')}</div>
    <p class="fine">The shelves are a quick-pick list of everyday foods found in the USDA table; dishes such as paneer, idli or dosa are not in the USDA table and are left out rather than substituted. Use “+ food” in the plan to search all 7,793 foods.</p>`;
  el.querySelectorAll('[data-pref]').forEach((b) => (b.onclick = () => { pref = b.dataset.pref; shelf(); }));
  el.querySelectorAll('[data-sf]').forEach((b) => (b.onclick = () => {
    const f = byId.get(Number(b.dataset.sf)); const meal = $('#nu-shmeal').value; const P = A.P;
    (P.foods[meal] = P.foods[meal] || []).push({ id: f.id, name: f.name, g: 100, kcal: A.val(f, 'kcal') || 0, p: A.val(f, 'p') || 0, c: A.val(f, 'c') || 0, f: A.val(f, 'f') || 0 });
    A.save(); A.plan(); b.classList.add('added'); setTimeout(() => b.classList.remove('added'), 700);
  }));
}

// ------------------------------------------------------------------ rehab phases
function R() {
  const P = A.P;
  if (!P.rehab) P.rehab = { start: today(), phases: A.N.phases.map((p) => ({ id: p.id, name: p.name, days: p.days })), foods: {}, supps: [] };
  return P.rehab;
}
function phaseAt(r, day) {
  let acc = 0;
  for (let i = 0; i < r.phases.length; i++) { const d = Number(r.phases[i].days) || 0; if (day < acc + d) return { i, dayIn: day - acc, len: d, start: acc }; acc += d; }
  return { i: r.phases.length, dayIn: day - acc, len: 0, start: acc };
}
function suppOn(r, s, day) {
  // a schedule runs in its chosen phases, in cycles of `on` weeks taken then `off` weeks break
  const ph = phaseAt(r, day); if (ph.i >= r.phases.length) return false;
  if (s.phases?.length && !s.phases.includes(r.phases[ph.i].id)) return false;
  let first = 0; for (let i = 0; i < r.phases.length; i++) { if (!s.phases?.length || s.phases.includes(r.phases[i].id)) break; first += Number(r.phases[i].days) || 0; }
  const on = (Number(s.on) || 0) * 7, off = (Number(s.off) || 0) * 7;
  if (!on) return true;
  const k = (day - first) % (on + off || 1);
  return k < on;
}
async function rehab() {
  const el = $('#nu-rehab'); if (!el) return;
  const r = R(); const N = A.N;
  const total = r.phases.reduce((a, p) => a + (Number(p.days) || 0), 0);
  const day = Math.max(0, daysBetween(r.start, today()));
  const ph = phaseAt(r, day);
  const cur = r.phases[ph.i];
  const F = await A.foods(); const byId = F ? new Map(F.rows.map((f) => [f.id, f])) : new Map();
  const weeks = Math.ceil(total / 7);
  const W = (d) => (d / Math.max(1, total) * 100).toFixed(2);
  const colors = ['#ff8c42', '#ffd23f', '#4cc9f0', '#3ddc84', '#b49bff', '#ff6b9a'];
  el.innerHTML = `<div class="card-h"><h2>Rehabilitation planner</h2><small>phases by weeks and days · your own schedule · quoted guidance</small></div>
    <div class="nu-form"><label>Injury or surgery date <input id="nu-rstart" type="date" value="${A.esc(r.start)}"></label>
      <label>Today is <b>day ${day + 1}</b> · week ${Math.floor(day / 7) + 1}</label><label>Total plan <b>${total} days</b> (${weeks} weeks)</label></div>
    <div class="nu-gantt">
      <div class="nu-gbar">${r.phases.map((p, i) => `<div class="nu-gph ${i === ph.i ? 'cur' : ''}" style="width:${W(Number(p.days) || 0)}%;background:${colors[i % colors.length]}" title="${A.esc(p.name)} · ${p.days} days"><span>${A.esc(p.name.split('·')[0])}</span></div>`).join('')}
        ${day < total ? `<div class="nu-gnow" style="left:${W(day)}%" title="Today"></div>` : ''}</div>
      <div class="nu-gweeks">${Array.from({ length: weeks }, (_, w) => `<span style="left:${W(w * 7)}%">W${w + 1}</span>`).join('')}</div>
      ${r.supps.map((s) => `<div class="nu-grow"><b>${A.esc(s.name || 'item')}</b><div class="nu-gcells">${Array.from({ length: total }, (_, d) => d).filter((d) => d % 1 === 0).map((d) => suppOn(r, s, d) ? `<i style="left:${W(d)}%;width:${W(1)}%"></i>` : '').join('')}${day < total ? `<div class="nu-gnow" style="left:${W(day)}%"></div>` : ''}</div></div>`).join('')}
    </div>
    ${cur ? `<div class="nu-today"><h3>Today: ${A.esc(cur.name)} · day ${ph.dayIn + 1} of ${ph.len}</h3>
      <div class="nu-today-g"><div><h4>Foods highlighted for this phase</h4>${(r.foods[cur.id] || []).map((id) => byId.get(id)).filter(Boolean).map((f) => `<span class="nu-hi">★ ${A.esc(f.name.split(',').slice(0, 2).join(','))}</span>`).join('') || '<p class="fine">None yet: star foods below.</p>'}</div>
      <div><h4>Your schedule today</h4>${r.supps.filter((s) => suppOn(r, s, day)).map((s) => `<div class="nu-due"><b>${A.esc(s.name)}</b> ${A.esc(s.amount || '')} · ${A.esc(s.timing)}${s.note ? ` · <small>${A.esc(s.note)}</small>` : ''}</div>`).join('') || '<p class="fine">Nothing due today (or on a break).</p>'}
        ${r.supps.filter((s) => !suppOn(r, s, day) && (!s.phases?.length || s.phases.includes(cur.id))).map((s) => `<div class="nu-due off">${A.esc(s.name)}: break this week</div>`).join('')}</div></div></div>` : `<div class="nu-today"><h3>The planned phases are complete (day ${day + 1}).</h3></div>`}
    <h3>Phases</h3>
    <div class="nu-phases">${r.phases.map((p, i) => { const q = N.phases.find((x) => x.id === p.id); return `<details class="nu-ph" ${i === ph.i ? 'open' : ''} style="--c:${colors[i % colors.length]}">
      <summary><b>${A.esc(p.name)}</b> <small>days ${r.phases.slice(0, i).reduce((a, x) => a + (Number(x.days) || 0), 0) + 1}–${r.phases.slice(0, i + 1).reduce((a, x) => a + (Number(x.days) || 0), 0)}</small></summary>
      <div class="nu-form"><label>Name <input data-pn="${i}" value="${A.esc(p.name)}"></label><label>Length (days) <input data-pd="${i}" type="number" min="1" max="730" value="${p.days}"></label>
        <label>= ${r1((Number(p.days) || 0) / 7)} weeks</label></div>
      ${q ? q.quotes.map(A.quote).join('') : ''}
      <h4>Foods to highlight in this phase</h4>
      <div class="nu-shelf small">${[...new Set([...A.N.shelves.indian, ...A.N.shelves.international])].map((id) => byId.get(id)).filter(Boolean).map((f) => `<button class="nu-sf ${(r.foods[p.id] || []).includes(f.id) ? 'star' : ''}" data-star="${p.id}|${f.id}">${(r.foods[p.id] || []).includes(f.id) ? '★' : '☆'} ${A.esc(f.name.replace(/\s*\(.*?\)/g, '').split(',').slice(0, 2).join(','))}</button>`).join('')}</div>
    </details>`; }).join('')}</div>
    <p class="fine">The source describes healing lengths only as days (inflammatory), weeks (proliferative) and months (remodelling); the day counts are your settings. Follow the timeline your surgeon or physiotherapist sets.</p>
    <button class="ghost-btn tiny" id="nu-paddph">+ phase</button> <button class="ghost-btn tiny" id="nu-preset">Reset phases</button>
    <h3>Your supplement and food schedule</h3>
    <table class="tt nu-sup"><thead><tr><th>Item</th><th>Amount (yours)</th><th>When</th><th>Phases</th><th>Take (weeks)</th><th>Break (weeks)</th><th>Note</th><th></th></tr></thead><tbody>
      ${r.supps.map((s, i) => `<tr><td><input data-s="${i}" data-f="name" value="${A.esc(s.name)}" placeholder="e.g. vitamin C-rich fruit, a product"></td><td><input data-s="${i}" data-f="amount" value="${A.esc(s.amount || '')}" placeholder="as prescribed"></td>
        <td><select data-s="${i}" data-f="timing">${TIMING.map((t) => `<option ${t === s.timing ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td>${r.phases.map((p) => `<label class="nu-pk"><input type="checkbox" data-sp="${i}|${p.id}" ${!s.phases?.length || s.phases.includes(p.id) ? 'checked' : ''}>${A.esc(p.name.split('·')[0].replace('Phase ', 'P'))}</label>`).join('')}</td>
        <td><input data-s="${i}" data-f="on" type="number" min="0" max="104" value="${s.on ?? ''}" placeholder="all"></td><td><input data-s="${i}" data-f="off" type="number" min="0" max="52" value="${s.off ?? ''}" placeholder="0"></td>
        <td><input data-s="${i}" data-f="note" value="${A.esc(s.note || '')}" placeholder="why / who advised"></td><td><button class="ghost-btn tiny" data-srm="${i}">×</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">No items yet.</td></tr>'}
    </tbody></table>
    <button class="ghost-btn tiny" id="nu-sadd">+ item</button>
    <p class="nu-warn">Amounts are yours or your clinician's: this site does not suggest supplement doses. Check every medicine and supplement with the anti-doping tools below if you compete. The evidence for each supplement is quoted under <a href="#nutrition/supps">Supplements</a> and <a href="#nutrition/rehab">Rehabilitation nutrition</a>.</p>`;
  const P = A.P; const redo = () => { A.save(); rehab(); };
  $('#nu-rstart').onchange = (e) => { r.start = e.target.value || today(); redo(); };
  el.querySelectorAll('[data-pn]').forEach((i) => (i.onchange = () => { r.phases[Number(i.dataset.pn)].name = i.value; redo(); }));
  el.querySelectorAll('[data-pd]').forEach((i) => (i.onchange = () => { r.phases[Number(i.dataset.pd)].days = Math.max(1, Number(i.value) || 1); redo(); }));
  el.querySelectorAll('[data-star]').forEach((b) => (b.onclick = () => { const [pid, fid] = b.dataset.star.split('|'); const l = (r.foods[pid] = r.foods[pid] || []); const k = l.indexOf(Number(fid)); if (k >= 0) l.splice(k, 1); else l.push(Number(fid)); redo(); }));
  $('#nu-paddph').onclick = () => { r.phases.push({ id: `c${Date.now().toString(36)}`, name: `Phase ${r.phases.length + 1} · your phase`, days: 14 }); redo(); };
  $('#nu-preset').onclick = () => { if (confirm('Reset phase names and lengths to the defaults?')) { r.phases = N.phases.map((p) => ({ id: p.id, name: p.name, days: p.days })); redo(); } };
  $('#nu-sadd').onclick = () => { r.supps.push({ name: '', amount: '', timing: 'with breakfast', phases: [], on: '', off: '', note: '' }); redo(); };
  el.querySelectorAll('[data-s]').forEach((i) => (i.onchange = () => { r.supps[Number(i.dataset.s)][i.dataset.f] = i.value; redo(); }));
  el.querySelectorAll('[data-sp]').forEach((c) => (c.onchange = () => { const [si, pid] = c.dataset.sp.split('|'); const s = r.supps[Number(si)];
    const all = r.phases.map((p) => p.id); let l = s.phases?.length ? [...s.phases] : [...all]; if (c.checked) { if (!l.includes(pid)) l.push(pid); } else l = l.filter((x) => x !== pid);
    s.phases = l.length === all.length ? [] : l; redo(); }));
  el.querySelectorAll('[data-srm]').forEach((b) => (b.onclick = () => { r.supps.splice(Number(b.dataset.srm), 1); redo(); }));
  void P;
}

// ------------------------------------------------------------------ tracker
const FIELDS = [['w', 'Weight (kg)', 0.1], ['kcal', 'Energy (kcal)', 1], ['p', 'Protein (g)', 1], ['c', 'Carb (g)', 1], ['f', 'Fat (g)', 1], ['water', 'Water (L)', 0.1],
  ['sleep', 'Sleep (h)', 0.1], ['tmin', 'Training (min)', 1], ['rpe', 'Effort RPE 0–10', 1], ['pain', 'Pain 0–10', 1]];
function avg(xs) { const v = xs.filter((x) => x !== '' && x != null && !Number.isNaN(Number(x))).map(Number); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
function last(n) { const t = today(); return LOG.filter((e) => daysBetween(e.date, t) < n && daysBetween(e.date, t) >= 0); }
function chart(title, key, target, unit, opts = {}) {
  const pts = LOG.filter((e) => e[key] !== '' && e[key] != null).slice(-60);
  if (pts.length < 2) return `<div class="nu-ch"><h4>${title}</h4><p class="fine">Log at least two days to see a trend.</p></div>`;
  const W = 320, H = 120, pad = 22;
  const vals = pts.map((e) => Number(e[key])); const all = target ? [...vals, target] : vals;
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const d0 = new Date(pts[0].date), dn = daysBetween(pts[0].date, pts[pts.length - 1].date) || 1;
  const X = (e) => pad + (daysBetween(d0, e.date) / dn) * (W - pad * 2), Y = (v) => H - pad - ((v - lo) / span) * (H - pad * 2);
  const ma = pts.map((e, i) => { const win = pts.filter((x) => { const k = daysBetween(x.date, e.date); return k >= 0 && k < 7; }); return [X(e), Y(avg(win.map((x) => x[key])))]; });
  const bars = opts.bars;
  return `<div class="nu-ch"><h4>${title}</h4><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title} trend">
    ${target ? `<line x1="${pad}" x2="${W - pad}" y1="${Y(target)}" y2="${Y(target)}" class="nu-tg"/><text x="${W - pad}" y="${Y(target) - 4}" class="nu-tt" text-anchor="end">target ${r0(target)}</text>` : ''}
    ${bars ? pts.map((e) => `<rect x="${X(e) - 3}" y="${Math.min(Y(Number(e[key])), Y(lo))}" width="6" height="${Math.abs(Y(lo) - Y(Number(e[key])))}" class="nu-br"><title>${e.date}: ${e[key]} ${unit}</title></rect>`).join('')
      : `<polyline points="${pts.map((e) => `${X(e)},${Y(Number(e[key]))}`).join(' ')}" class="nu-ln"/>${pts.map((e) => `<circle cx="${X(e)}" cy="${Y(Number(e[key]))}" r="2.5" class="nu-dt"><title>${e.date}: ${e[key]} ${unit}</title></circle>`).join('')}`}
    <polyline points="${ma.map((p) => p.join(',')).join(' ')}" class="nu-ma"/>
    <text x="${pad}" y="${H - 6}" class="nu-tt">${pts[0].date.slice(5)}</text><text x="${W - pad}" y="${H - 6}" class="nu-tt" text-anchor="end">${pts[pts.length - 1].date.slice(5)}</text>
    <text x="2" y="${pad - 6}" class="nu-tt">${r1(hi)} ${unit}</text></svg><p class="fine">dots: daily · line: 7-day average</p></div>`;
}
function track() {
  const el = $('#nu-track'); if (!el) return;
  const T = A.targets(); const r = A.P.rehab; const day = r ? Math.max(0, daysBetween(r.start, today())) : 0;
  const due = r ? r.supps.filter((s) => s.name && suppOn(r, s, day)) : [];
  const ent = LOG.find((e) => e.date === (el._date || today())) || { date: el._date || today() };
  const w7 = last(7), w14 = LOG.filter((e) => { const k = daysBetween(e.date, today()); return k >= 7 && k < 14; });
  const kAvg = avg(w7.map((e) => e.kcal)), pAvg = avg(w7.map((e) => e.p)), wNow = avg(w7.map((e) => e.w)), wPrev = avg(w14.map((e) => e.w));
  const adh = w7.filter((e) => e.supps && Object.keys(e.supps).length).map((e) => Object.values(e.supps).filter(Boolean).length / Object.keys(e.supps).length);
  let streak = 0; for (let d = 0; d < 400; d++) { const dt = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10); if (LOG.some((e) => e.date === dt)) streak++; else if (d) break; }
  const pct = (a, b) => (a != null && b ? `${r0(a / b * 100)}%` : '—');
  el.innerHTML = `<div class="card-h"><h2>Tracking dashboard</h2><small>${LOG.length} days logged · saved in this browser</small></div>
    <div class="nu-tiles">
      <div class="nu-tile"><small>Days in a row</small><b>${streak}</b><span>logged</span></div>
      <div class="nu-tile hot"><small>Energy, 7-day average</small><b>${kAvg != null ? r0(kAvg) : '—'}</b><span>${pct(kAvg, T.kcal)} of ${r0(T.kcal)} kcal</span></div>
      <div class="nu-tile"><small>Protein, 7-day average</small><b>${pAvg != null ? r0(pAvg) : '—'}</b><span>${pct(pAvg, T.protMid)} of ${r0(T.protMid)} g</span></div>
      <div class="nu-tile"><small>Weight change</small><b>${wNow != null && wPrev != null ? `${wNow - wPrev >= 0 ? '+' : ''}${r1(wNow - wPrev)}` : '—'}</b><span>kg, this week vs last</span></div>
      <div class="nu-tile"><small>Schedule kept</small><b>${adh.length ? `${r0(avg(adh) * 100)}%` : '—'}</b><span>last 7 days</span></div>
      <div class="nu-tile"><small>Pain, 7-day average</small><b>${avg(w7.map((e) => e.pain)) != null ? r1(avg(w7.map((e) => e.pain))) : '—'}</b><span>0–10</span></div>
    </div>
    <div class="nu-charts">${chart('Body weight', 'w', null, 'kg')}${chart('Energy eaten', 'kcal', T.kcal, 'kcal', { bars: true })}${chart('Protein', 'p', T.protMid, 'g', { bars: true })}${chart('Pain', 'pain', null, '/10')}${chart('Sleep', 'sleep', null, 'h')}${chart('Water', 'water', A.P.own?.water || null, 'L')}</div>
    <h3>Log a day</h3>
    <div class="nu-form"><label>Date <input id="nu-ldate" type="date" value="${ent.date}" max="${today()}"></label>
      ${FIELDS.map(([k, n, st]) => `<label>${n} <input data-l="${k}" type="number" step="${st}" min="0" value="${ent[k] ?? ''}"></label>`).join('')}</div>
    ${due.length ? `<div class="nu-form"><span class="fine">Schedule due today:</span>${due.map((s) => `<label class="nu-chk"><input type="checkbox" data-ls="${A.esc(s.name)}" ${ent.supps?.[s.name] ? 'checked' : ''}> ${A.esc(s.name)} <small>(${A.esc(s.timing)})</small></label>`).join('')}</div>` : ''}
    <label class="nu-note">Note <input id="nu-lnote" value="${A.esc(ent.note || '')}" placeholder="how the day went, symptoms, training"></label>
    <p><button class="ghost-btn" id="nu-lsave">Save day</button> <button class="ghost-btn tiny" id="nu-lfill">Fill energy and macros from my meal plan foods</button>
      <button class="ghost-btn tiny" id="nu-lcsv">Export CSV</button> <label class="ghost-btn tiny">Import CSV<input type="file" accept=".csv" id="nu-limp" hidden></label></p>
    <details><summary>History (${LOG.length})</summary><div class="nu-tablewrap"><table class="tt nu-hist"><thead><tr><th>Date</th>${FIELDS.map(([, n]) => `<th>${n}</th>`).join('')}<th>Note</th><th></th></tr></thead><tbody>
      ${[...LOG].reverse().slice(0, 90).map((e) => `<tr><td><a href="#" data-led="${e.date}">${e.date}</a></td>${FIELDS.map(([k]) => `<td>${e[k] ?? ''}</td>`).join('')}<td>${A.esc(e.note || '')}</td><td><button class="ghost-btn tiny" data-ldel="${e.date}">×</button></td></tr>`).join('')}</tbody></table></div></details>`;
  $('#nu-ldate').onchange = (e) => { el._date = e.target.value; track(); };
  $('#nu-lfill').onclick = () => {
    const t = { kcal: 0, p: 0, c: 0, f: 0 }; Object.values(A.P.foods || {}).forEach((l) => { const x = A.totals(l); Object.keys(t).forEach((k) => { t[k] += x[k]; }); });
    Object.entries(t).forEach(([k, v]) => { const i = el.querySelector(`[data-l="${k}"]`); if (i) i.value = r0(v); });
  };
  $('#nu-lsave').onclick = () => {
    const d = $('#nu-ldate').value || today(); const e = { date: d };
    FIELDS.forEach(([k]) => { const v = el.querySelector(`[data-l="${k}"]`).value; if (v !== '') e[k] = Number(v); });
    const ss = el.querySelectorAll('[data-ls]'); if (ss.length) { e.supps = {}; ss.forEach((c) => { e.supps[c.dataset.ls] = c.checked; }); }
    e.note = $('#nu-lnote').value;
    LOG = LOG.filter((x) => x.date !== d).concat(e).sort((a, b) => a.date.localeCompare(b.date)); saveLog(); track();
  };
  el.querySelectorAll('[data-ldel]').forEach((b) => (b.onclick = () => { if (confirm(`Delete ${b.dataset.ldel}?`)) { LOG = LOG.filter((x) => x.date !== b.dataset.ldel); saveLog(); track(); } }));
  el.querySelectorAll('[data-led]').forEach((a) => (a.onclick = (ev) => { ev.preventDefault(); el._date = a.dataset.led; track(); $('#nu-ldate').scrollIntoView({ block: 'center' }); }));
  $('#nu-lcsv').onclick = () => {
    const cols = ['date', ...FIELDS.map(([k]) => k), 'note'];
    const csv = [cols.join(','), ...LOG.map((e) => cols.map((c) => `"${String(e[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `nutrition-log-${today()}.csv`; a.click();
  };
  $('#nu-limp').onchange = async (ev) => {
    const lines = (await ev.target.files[0].text()).split(/\r?\n/).filter(Boolean); const cols = lines.shift().split(',').map((c) => c.replace(/"/g, ''));
    for (const ln of lines) { const vals = ln.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((v) => v.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')); const e = {}; cols.forEach((c, i) => { if (vals[i] !== '' && vals[i] != null) e[c] = c === 'date' || c === 'note' ? vals[i] : Number(vals[i]); });
      if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) LOG = LOG.filter((x) => x.date !== e.date).concat(e); }
    LOG.sort((a, b) => a.date.localeCompare(b.date)); saveLog(); track();
  };
}
