// Nutrition tab: basics -> foundation -> advanced sport nutrition, recovery and rehab, deficiencies, supplements and
// anti-doping, medicines and food, a personal planner and a USDA food table.
// All explanatory text is quoted unchanged (data/anatomy_lab/nutrition/nutrition.json, tools/nutrition_build.py +
// nutrition_picks.py). The planner only does arithmetic: every number it shows sits next to the quoted rule it applies
// (BMR by the Mifflin-St Jeor equation, cited). Supplement and drug amounts are never shown (site rule).
// The plan, checklist and food choices stay in this browser (per account, js/accounts.js); nothing is sent.

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LEVELS = [['basics', 'Basics', 'everyone'], ['foundation', 'Foundation', 'habits, protein, weight goals'], ['advanced', 'Advanced', 'sport and training modes'],
  ['recovery', 'Recovery & rehab', 'injury, surgery, refeeding'], ['medical', 'Medicines & food', 'interactions']];
const ACT = [[1.2, 'Sedentary (little or no exercise)'], [1.375, 'Light (1–3 days/week)'], [1.55, 'Moderate (3–5 days/week)'], [1.725, 'Very active (6–7 days/week)'], [1.9, 'Extra active (hard training or physical job)']];
const MODES = [['none', 'No structured training'], ['strength', 'Strength / hypertrophy'], ['endurance', 'Endurance (run, cycle, swim)'], ['team', 'Team / intermittent sport'], ['combat', 'Combat / weight-class sport']];
const GOALS = [['maintain', 'Maintain weight'], ['loss', 'Lose weight (fat)'], ['gain', 'Gain weight / muscle'], ['compete', 'Competition phase'], ['rehab', 'Injury / surgery recovery']];
let N = null, F = null, level = 'basics', who = 'all', topic = 'energy';
const DEF_PLAN = { sex: 'm', age: 30, h: 175, w: 70, act: 1.55, who: 'everyday', goal: 'maintain', mode: 'none', dur: 60, sess: '18:00', wake: '07:00', meals: 4, skipBf: false, surplus: 0, deficit: 500, foods: {} };
const load = (k, d) => { try { return Object.assign(structuredClone(d), JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch { return structuredClone(d); } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
let P = null, CHECK = null;

export async function startNutrition() {
  const host = $('#nutrition-body'); if (!host) return;
  if (!N) {
    N = await fetch('/meridian-4D/rt/nutrition/nutrition.json').then((r) => r.json()).catch(() => null);
    if (!N) { host.innerHTML = '<p class="muted">Nutrition data not built (tools/nutrition_build.py).</p>'; return; }
    P = load('nu-plan', DEF_PLAN); CHECK = load('nu-check', {});
  }
  const want = location.hash.slice(1).split('/')[1];
  const t = want && N.topics.find((x) => x.id === want);
  if (t) { topic = t.id; level = t.level; }
  render(host);
}

const cite = (x) => `<span class="cite">${esc(x.src)}${x.title ? `, “<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>”` : ''}${x.sec ? `, ${esc(x.sec)}` : ''} · ${esc(x.lic)}</span>`;
const quote = (x) => x ? `<blockquote class="nu-q">${esc(x.text)}<br>${cite(x)}</blockquote>` : '';
const rule = (id) => quote(N.rules[id]);

function sourceBlock(pid) {
  const s = N.sources[pid]; if (!s) return '';
  return `<details class="nu-src" open><summary><b>${esc(s.title)}</b> <small>${esc(s.journal)} ${esc(s.year)} · ${esc(s.kind)} · ${esc(s.lic)}</small></summary>
    ${s.lead ? `<p class="nu-lead">${esc(s.lead)}</p>` : ''}
    <ul class="nu-pts">${s.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="fine">${s.left_out ? `${s.left_out} ${s.left_out === 1 ? 'point' : 'points'} left out because they give supplement or drug amounts (site rule); read them in the source. ` : ''}Quoted unchanged from <a href="${esc(s.url)}" target="_blank" rel="noopener">PMC ${esc(s.pmcid)}</a>${s.doi ? ` · <a href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener">DOI</a>` : ''}.</p></details>`;
}

function render(host) {
  host.innerHTML = `
  <section class="card nu-hero"><div class="card-h"><h2>🥗 Nutrition: from basics to competition</h2><small>${N.counts.topics} topics · ${N.counts.sources} position stands and reviews · ${N.counts.quotes} quoted points</small></div>
    <p>Start with the basics, build the foundation, then the sport-specific level. The planner below turns the quoted rules into your own numbers and a meal plan. Everyday people and athletes see their differences side by side.</p>
    <div class="nu-path">${LEVELS.map(([k, n, sub], i) => `<button class="nu-lv ${k === level ? 'on' : ''}" data-lv="${k}"><b>${i + 1}. ${esc(n)}</b><small>${esc(sub)}</small></button>`).join('<i class="nu-arrow"></i>')}</div>
    <p class="fine">Your own workbook's nutrition sheets are in <a href="#train/nutrition">Training 4D → Nutrition &amp; substances</a>.</p>
    <div class="nu-who">Show: ${[['all', 'All'], ['everyone', 'Everyday person'], ['sport', 'Athlete']].map(([k, n]) => `<button class="ghost-btn ${who === k ? 'on' : ''}" data-who="${k}">${n}</button>`).join('')}</div>
  </section>
  <section class="card"><div class="nu-topics" id="nu-topics"></div><div id="nu-topic"></div></section>
  <section class="card" id="nu-plan"></section>
  <section class="card" id="nu-shelf"></section>
  <section class="card" id="nu-rehab"></section>
  <section class="card" id="nu-track"></section>
  <section class="card"><div class="card-h"><h2>Deficiencies: signs, foods, who is at risk</h2><small>quoted from StatPearls · top foods from USDA</small></div><div class="nu-defs" id="nu-defs"></div><div id="nu-def"></div></section>
  <section class="card"><div class="card-h"><h2>Food quality checklist</h2><small>tick what your week already does · saved in this browser</small></div><div id="nu-check"></div></section>
  <section class="card"><div class="card-h"><h2>Food table</h2><small>7,793 foods · per 100 g · USDA FoodData Central (CC0)</small></div>
    <input id="nu-fq" type="search" placeholder="Search a food: oats, lentils, chicken breast, banana…" aria-label="Search foods"><div id="nu-fr"></div></section>
  <section class="card"><div class="card-h"><h2>Anti-doping: medicines and supplements</h2><small>WADA · NADA India · batch-tested products</small></div>
    <p>Before any medicine or supplement, a competing athlete checks its status. The lists and tools below belong to their owners; this page links to them and does not reproduce them.</p>
    <div class="nu-links">${N.links.map((l) => `<a class="nu-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(l.name)}</b><small>${esc(l.about)}</small></a>`).join('')}</div>
    <p><button class="ghost-btn" data-go="doping">Read the quoted anti-doping and supplement-risk points</button> <button class="ghost-btn" data-go="supps">Supplements: what has evidence</button> <button class="ghost-btn" data-go="meds">Medicines and food</button></p>
  </section>
  <p class="fine">${esc(N.method)} Built ${esc(N.built)}. Education only: people who are pregnant, under 18, living with a medical condition or an eating disorder, or taking medicines that affect appetite or weight should plan with a registered dietitian or doctor.</p>`;
  host.querySelectorAll('[data-lv]').forEach((b) => (b.onclick = () => { level = b.dataset.lv; topic = (vis()[0] || {}).id; render(host); }));
  host.querySelectorAll('[data-who]').forEach((b) => (b.onclick = () => { who = b.dataset.who; const v = vis(); if (!v.some((t) => t.id === topic)) topic = (v[0] || {}).id; render(host); }));
  host.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => goTopic(b.dataset.go)));
  topics(); showTopic(); plan(); defs(); checklist(); foodSearch();
  import('./nutrition_plus.js').then((m) => m.initPlus(API)).catch((e) => console.error(e));
}

const vis = () => N.topics.filter((t) => t.level === level && (who === 'all' || t.group === who || t.group === 'both'));
function topics() {
  $('#nu-topics').innerHTML = vis().map((t) => `<button class="nu-tb ${t.id === topic ? 'on' : ''}" data-t="${t.id}">${esc(t.title)}<small>${t.group === 'sport' ? 'athlete' : t.group === 'everyone' ? 'everyone' : 'both'}</small></button>`).join('') || '<p class="muted">No topic for this filter.</p>';
  document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { topic = b.dataset.t; topics(); showTopic(); }));
}
function goTopic(id) {
  const t = N.topics.find((x) => x.id === id); if (!t) return;
  level = t.level; who = 'all'; topic = id; render($('#nutrition-body'));
  $('#nu-topic').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function showTopic() {
  const t = N.topics.find((x) => x.id === topic), el = $('#nu-topic'); if (!t || !el) { if (el) el.innerHTML = ''; return; }
  if (location.hash.slice(1).split('/')[0] === 'nutrition') history.replaceState(null, '', `#nutrition/${t.id}`);
  el.innerHTML = `<article class="nu-art"><h3>${esc(t.title)}</h3>${t.quotes.map(quote).join('')}${t.sources.map(sourceBlock).join('')}
    ${!t.quotes.length && !t.sources.length ? '<p class="muted">No quote found.</p>' : ''}</article>`;
}

// ------------------------------------------------------------------ planner (arithmetic on the quoted rules)
const r0 = (x) => Math.round(x), r5 = (x) => Math.round(x / 5) * 5;
const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
function protRange(p, who2) {
  const ath = who2 === 'athlete';
  if (p.goal === 'loss') return ath && p.mode === 'strength' ? ['prot_cut', 2.3, 3.1] : ath ? ['prot_exercise', 1.4, 2.0] : ['prot_general', 1.2, 1.6];
  if (p.goal === 'gain') return ['prot_gain', 1.6, 2.2];
  return ath || p.mode !== 'none' ? ['prot_exercise', 1.4, 2.0] : ['prot_general', 1.2, 1.6];
}
function targets(p, who2 = p.who) {
  const bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * p.act;
  let kcal = tdee, kRule = null, note = '';
  if (p.goal === 'loss') { kcal = tdee - p.deficit; kRule = 'deficit'; }
  if (p.goal === 'gain') { kcal = tdee + Number(p.surplus || 0); note = 'No quoted surplus figure was found in the library; the surplus is your own choice (agree it with a coach or dietitian).'; }
  if (p.goal === 'rehab') { const lo = 25 * p.w, hi = 30 * p.w; kRule = 'rehab_energy'; note = `Rehabilitation range from the quote: ${r0(lo)}–${r0(hi)} kcal/day (25–30 kcal/kg).`; kcal = Math.max(tdee, lo); }
  const [pr, plo, phi] = protRange(p, who2);
  let prot = [plo * p.w, phi * p.w];
  let protMid = (prot[0] + prot[1]) / 2;
  let fat = [0.20 * kcal / 9, 0.35 * kcal / 9];
  let fatMid = 0.275 * kcal / 9;
  let carb = Math.max(0, (kcal - protMid * 4 - fatMid * 9) / 4);
  const glyco = (p.goal === 'compete' && (p.mode === 'endurance' || p.mode === 'team')) ? [8 * p.w, 12 * p.w] : null;
  let own = false;
  if (p.own?.on && who2 === p.who) { // the visitor's own numbers replace the calculated ones
    own = true; const o = p.own;
    if (o.kcal) kcal = Number(o.kcal);
    if (o.p) { prot = [Number(o.p), Number(o.p)]; protMid = Number(o.p); }
    if (o.f) { fat = [Number(o.f), Number(o.f)]; fatMid = Number(o.f); }
    carb = o.c ? Number(o.c) : Math.max(0, (kcal - protMid * 4 - fatMid * 9) / 4);
  }
  return { bmr, tdee, kcal, kRule, note, pr, plo, phi, prot, protMid, fat, fatMid, carb, glyco, own };
}
function mealPlan(p, T) {
  const n = Number(p.meals), wake = toMin(p.wake), sess = toMin(p.sess);
  let slots = [];
  if (p.mealsCustom?.length) { // the visitor's own meals: name, time and share of the day
    const sum = p.mealsCustom.reduce((a, m) => a + (Number(m.pct) || 0), 0) || 1;
    return p.mealsCustom.map((m) => { const f = (Number(m.pct) || 0) / sum; const t = toMin(m.time);
      return { name: m.name || 'Meal', t, pct: f, post: p.mode !== 'none' && t >= sess + Number(p.dur) && t - (sess + Number(p.dur)) <= 120,
        kcal: T.kcal * f, p: T.protMid * f, c: T.carb * f, f: T.fatMid * f }; }).sort((a, b) => a.t - b.t);
  }
  const gap = Math.max(180, Math.min(240, Math.round((14 * 60) / Math.max(1, n - 1))));
  for (let i = 0; i < n; i++) slots.push({ name: i === 0 ? 'Breakfast' : i === n - 1 && n > 2 ? 'Last meal' : `Meal ${i + 1}`, t: wake + 30 + i * gap });
  if (p.skipBf) slots = slots.slice(1);
  if (p.mode !== 'none') {
    // the meal nearest after the session is the recovery meal (quoted: protein within 2 h after)
    let best = null; for (const s of slots) { const d = s.t - (sess + Number(p.dur)); if (d >= 0 && (best === null || d < best.d)) best = { s, d }; }
    if (best && best.d <= 120) best.s.post = true; else if (slots.length) slots.push({ name: 'Recovery meal', t: sess + Number(p.dur) + 30, post: true, added: true });
    slots.sort((a, b) => a.t - b.t);
  }
  const k = slots.length || 1;
  const perMealProt = Math.max(0.25 * p.w, T.protMid / k);
  return slots.map((s) => ({ ...s, kcal: T.kcal / k, p: perMealProt, c: T.carb / k, f: T.fatMid / k }));
}
function sessionFuel(p) {
  const d = Number(p.dur);
  if (p.mode === 'none' || !d) return '';
  const h = d / 60, during = d > 70 ? `${r5(30 * h)}–${r5(60 * h)} g carbohydrate across the session (about 30–60 g per hour)` : 'Sessions up to about 70 minutes: the quoted during-exercise carbohydrate rule applies to longer bouts.';
  return `<div class="nu-fuel"><h4>Fuel for a ${d}-minute session at ${esc(p.sess)}</h4>
    <ul><li><b>During:</b> ${esc(during)}</li><li><b>After:</b> a protein-containing meal within 2 hours (marked ⚡ in the plan).</li></ul>${rule('carb_during')}${rule('post')}</div>`;
}
function plan() {
  const el = $('#nu-plan'); const p = P;
  const T = targets(p), meals = mealPlan(p, T);
  const Te = targets(p, 'everyday'), Ta = targets(p, 'athlete');
  const opt = (arr, v) => arr.map(([k, n]) => `<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  el.innerHTML = `<div class="card-h"><h2>Your plan</h2><small>calculated in this browser · saved for your account · nothing is sent</small></div>
  <div class="nu-form">
    <label>Sex <select data-k="sex">${opt([['m', 'Male'], ['f', 'Female']], p.sex)}</select></label>
    <label>Age <input data-k="age" type="number" min="18" max="100" value="${p.age}"></label>
    <label>Height (cm) <input data-k="h" type="number" min="120" max="230" value="${p.h}"></label>
    <label>Weight (kg) <input data-k="w" type="number" min="30" max="250" step="0.1" value="${p.w}"></label>
    <label>Activity <select data-k="act">${opt(ACT, p.act)}</select></label>
    <label>I am <select data-k="who">${opt([['everyday', 'an everyday person'], ['athlete', 'an athlete in training']], p.who)}</select></label>
    <label>Goal <select data-k="goal">${opt(GOALS, p.goal)}</select></label>
    ${p.goal === 'loss' ? `<label>Daily deficit <select data-k="deficit">${opt([[500, '500 kcal'], [600, '600 kcal'], [750, '750 kcal']], p.deficit)}</select></label>` : ''}
    ${p.goal === 'gain' ? `<label>Daily surplus (your choice) <input data-k="surplus" type="number" min="0" max="1000" step="50" value="${p.surplus}"></label>` : ''}
    <label>Training <select data-k="mode">${opt(MODES, p.mode)}</select></label>
    ${p.mode !== 'none' ? `<label>Session (min) <input data-k="dur" type="number" min="10" max="480" value="${p.dur}"></label><label>Session starts <input data-k="sess" type="time" value="${p.sess}"></label>` : ''}
    <label>Wake time <input data-k="wake" type="time" value="${p.wake}"></label>
    <label>Meals per day <select data-k="meals">${opt([[3, '3'], [4, '4'], [5, '5'], [6, '6']], p.meals)}</select></label>
    <label class="nu-chk"><input data-k="skipBf" type="checkbox" ${p.skipBf ? 'checked' : ''} ${p.mealsCustom?.length ? 'disabled title="Using your own meals"' : ''}> I skip breakfast</label>
  </div>
  <details class="nu-own" ${p.own?.on ? 'open' : ''}><summary>✎ Use my own numbers ${p.own?.on ? '<b class="nu-badge">on</b>' : ''}</summary>
    <div class="nu-form">
      <label class="nu-chk"><input id="nu-own-on" type="checkbox" ${p.own?.on ? 'checked' : ''}> replace the calculated targets</label>
      ${[['kcal', 'Energy (kcal)'], ['p', 'Protein (g)'], ['c', 'Carbohydrate (g, blank = rest)'], ['f', 'Fat (g)'], ['water', 'Water (L)'], ['fib', 'Fibre (g)']].map(([k, n]) => `<label>${n} <input data-own="${k}" type="number" min="0" step="any" value="${esc(p.own?.[k] ?? '')}"></label>`).join('')}
    </div><p class="fine">Your numbers are used for the meal plan and the tracker. Water and fibre are tracking goals only.</p></details>
  ${p.age < 18 ? '<p class="nu-warn">Under 18: growth changes energy needs; plan with a paediatric dietitian. The numbers below are not for you.</p>' : ''}
  <div class="nu-tiles">
    <div class="nu-tile"><small>Resting energy (BMR)</small><b>${r0(T.bmr)}</b><span>kcal/day</span></div>
    <div class="nu-tile"><small>Daily energy use (TDEE)</small><b>${r0(T.tdee)}</b><span>kcal/day × ${p.act}</span></div>
    <div class="nu-tile hot"><small>Your energy target</small><b>${r0(T.kcal)}</b><span>kcal/day</span></div>
    <div class="nu-tile"><small>Protein</small><b>${r0(T.prot[0])}–${r0(T.prot[1])}</b><span>g/day (${T.plo}–${T.phi} g/kg)</span></div>
    <div class="nu-tile"><small>Fat</small><b>${r0(T.fat[0])}–${r0(T.fat[1])}</b><span>g/day (20–35% of energy)</span></div>
    <div class="nu-tile"><small>Carbohydrate</small><b>${r0(T.carb)}</b><span>g/day (the rest of the energy)</span></div>
  </div>
  ${T.kcal < 1200 ? `<p class="nu-warn">This target is below 1,200 kcal/day, the range the source calls a low-energy diet:</p>${rule('vlcd')}` : ''}
  ${T.note ? `<p class="nu-warn">${esc(T.note)}</p>` : ''}
  ${T.glyco ? `<p><b>Competition phase, glycogen:</b> ${r0(T.glyco[0])}–${r0(T.glyco[1])} g carbohydrate/day (8–12 g/kg) to maximise glycogen stores before the event.</p>${rule('carb_glyco')}` : ''}
  <details class="nu-why"><summary>Where every number comes from</summary>
    <p class="fine">BMR: Mifflin-St Jeor equation (10 × weight kg + 6.25 × height cm − 5 × age + 5 for men, −161 for women). ${esc(N.mifflin.cite)} <a href="${esc(N.mifflin.doi)}" target="_blank" rel="noopener">DOI</a>. Activity factors 1.2, 1.375, 1.55, 1.725, 1.9 span the quoted range.</p>
    ${rule('bmr')}${rule('activity')}${T.kRule ? rule(T.kRule) : ''}${rule(T.pr)}${rule('amdr')}${rule('prot_meal')}${rule('prot_spread')}
  </details>
  <div class="card-h"><h3>Meal plan ${p.mealsCustom?.length ? '(your meals)' : p.skipBf ? '(breakfast skipped: its share moves to the other meals)' : ''}</h3>
    <span><button class="ghost-btn tiny" id="nu-medit">✎ Customise meals</button>${p.mealsCustom?.length ? ' <button class="ghost-btn tiny" id="nu-mauto">Back to automatic</button>' : ''}</span></div>
  ${timeline(meals, p)}
  <div id="nu-meditor" hidden></div>
  <table class="tt nu-meals"><thead><tr><th>Time</th><th>Meal</th><th>kcal</th><th>Protein g</th><th>Carb g</th><th>Fat g</th><th>Foods you chose</th></tr></thead><tbody>
  ${meals.map((m, i) => { const key = m.name; const chosen = (p.foods[key] || []); const tot = foodTotals(chosen);
    return `<tr class="${m.post ? 'nu-post' : ''}"><td>${hhmm(m.t)}</td><td>${m.post ? '⚡ ' : ''}${esc(m.name)}${m.added ? ' <small>(added after training)</small>' : ''}</td><td>${r0(m.kcal)}</td><td>${r0(m.p)}</td><td>${r0(m.c)}</td><td>${r0(m.f)}</td>
      <td>${chosen.map((c, j) => `<span class="nu-fc">${esc(c.name.split(',').slice(0, 2).join(','))} ${c.g} g <button class="ghost-btn tiny" data-del="${esc(key)}|${j}" title="remove">×</button></span>`).join('')}
        <button class="ghost-btn tiny" data-addto="${esc(key)}">+ food</button>${chosen.length ? `<div class="fine">${r0(tot.kcal)} kcal · ${r0(tot.p)} g protein · ${r0(tot.c)} g carb · ${r0(tot.f)} g fat</div>` : ''}</td></tr>`; }).join('')}
  </tbody></table>
  ${p.skipBf ? `<p class="fine">Breakfast and training, from the source:</p>${rule('breakfast')}${rule('breakfast_eve')}${p.goal === 'loss' ? rule('meals_loss') : ''}` : ''}
  ${sessionFuel(p)}
  <h3>Everyday person vs athlete, same body</h3>
  <table class="tt nu-vs"><thead><tr><th></th><th>Everyday person</th><th>Athlete in training</th></tr></thead><tbody>
    <tr><td>Energy target</td><td>${r0(Te.kcal)} kcal</td><td>${r0(Ta.kcal)} kcal</td></tr>
    <tr><td>Protein</td><td>${r0(Te.prot[0])}–${r0(Te.prot[1])} g (${Te.plo}–${Te.phi} g/kg)</td><td>${r0(Ta.prot[0])}–${r0(Ta.prot[1])} g (${Ta.plo}–${Ta.phi} g/kg)</td></tr>
    <tr><td>Protein per meal</td><td colspan="2">about ${r0(0.25 * p.w)} g (0.25 g/kg), every 3–4 hours</td></tr>
    <tr><td>During long sessions</td><td>not needed</td><td>30–60 g carbohydrate per hour beyond about 70 minutes</td></tr>
    <tr><td>Competition</td><td>—</td><td>${p.mode === 'endurance' || p.mode === 'team' ? `glycogen phase ${r0(8 * p.w)}–${r0(12 * p.w)} g carbohydrate/day` : 'see the sport topic (combat: making weight)'}</td></tr>
  </tbody></table>
  <p class="fine">The energy target uses the same activity level for both columns; an athlete's real activity factor is usually higher. Change "Activity" to compare.</p>`;
  el.querySelectorAll('[data-k]').forEach((i) => (i.onchange = () => {
    const k = i.dataset.k; let v = i.type === 'checkbox' ? i.checked : i.value;
    if (['age', 'h', 'w', 'act', 'dur', 'meals', 'surplus', 'deficit'].includes(k)) v = Number(v);
    P[k] = v; save('nu-plan', P); plan();
  }));
  const own = () => { P.own = P.own || {}; return P.own; };
  el.querySelector('#nu-own-on').onchange = (e) => { own().on = e.target.checked; save('nu-plan', P); plan(); };
  el.querySelectorAll('[data-own]').forEach((i) => (i.onchange = () => { own()[i.dataset.own] = i.value === '' ? '' : Number(i.value); save('nu-plan', P); plan(); }));
  el.querySelector('#nu-medit').onclick = () => mealEditor(meals);
  const ma = el.querySelector('#nu-mauto'); if (ma) ma.onclick = () => { P.mealsCustom = null; save('nu-plan', P); plan(); };
  el.querySelectorAll('[data-addto]').forEach((b) => (b.onclick = () => openPicker(b.dataset.addto)));
  window.__nuPlus?.refresh?.();
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { const [k, j] = b.dataset.del.split('|'); P.foods[k].splice(Number(j), 1); save('nu-plan', P); plan(); }));
}
// day timeline: meals as blocks, breaks between them, the training session
function timeline(meals, p) {
  if (!meals.length) return '';
  const t0 = Math.min(toMin(p.wake), ...meals.map((m) => m.t)) - 30, t1 = Math.max(...meals.map((m) => m.t), p.mode !== 'none' ? toMin(p.sess) + Number(p.dur) : 0) + 60;
  const span = Math.max(60, t1 - t0), X = (t) => ((t - t0) / span * 100).toFixed(2);
  const gaps = meals.slice(1).map((m, i) => ({ a: meals[i].t + 30, b: m.t, h: (m.t - meals[i].t) / 60 }));
  return `<div class="nu-tl" aria-label="Day timeline">
    ${p.mode !== 'none' ? `<div class="nu-tl-s" style="left:${X(toMin(p.sess))}%;width:${(Number(p.dur) / span * 100).toFixed(2)}%" title="Training ${esc(p.sess)}, ${p.dur} min">training</div>` : ''}
    ${gaps.map((g) => `<div class="nu-tl-g" style="left:${X(g.a)}%;width:${Math.max(0, (g.b - g.a) / span * 100).toFixed(2)}%">${g.h >= 1.5 ? `${g.h.toFixed(1)} h break` : ''}</div>`).join('')}
    ${meals.map((m) => `<div class="nu-tl-m ${m.post ? 'post' : ''}" style="left:${X(m.t)}%" title="${esc(m.name)} ${hhmm(m.t)} · ${r0(m.kcal)} kcal"><b>${hhmm(m.t)}</b><span>${esc(m.name)}</span></div>`).join('')}
  </div>`;
}
function mealEditor(meals) {
  const ed = $('#nu-meditor'); ed.hidden = false;
  const rows = (P.mealsCustom?.length ? P.mealsCustom : meals.map((m) => ({ name: m.name, time: hhmm(m.t), pct: Math.round(100 / meals.length) }))).map((m) => ({ ...m }));
  const draw = () => {
    const sum = rows.reduce((a, m) => a + (Number(m.pct) || 0), 0);
    ed.innerHTML = `<table class="tt nu-me"><thead><tr><th>Meal</th><th>Time</th><th>Share of the day %</th><th></th></tr></thead><tbody>
      ${rows.map((m, i) => `<tr><td><input data-r="${i}" data-f="name" value="${esc(m.name)}"></td><td><input data-r="${i}" data-f="time" type="time" value="${esc(m.time)}"></td>
        <td><input data-r="${i}" data-f="pct" type="number" min="0" max="100" value="${m.pct}"></td><td><button class="ghost-btn tiny" data-rm="${i}">×</button></td></tr>`).join('')}</tbody></table>
      <p class="fine">Shares add up to <b id="nu-msum">${sum}</b>% (scaled to 100% when used). Add a pre-training snack, a late meal, a fasting window: anything that fits your day.</p>
      <button class="ghost-btn tiny" id="nu-madd">+ meal</button> <button class="ghost-btn tiny" id="nu-meven">Even split</button> <button class="ghost-btn" id="nu-msave">Use these meals</button> <button class="ghost-btn tiny" id="nu-mcancel">Cancel</button>`;
    ed.querySelectorAll('[data-r]').forEach((i) => (i.oninput = () => { rows[Number(i.dataset.r)][i.dataset.f] = i.dataset.f === 'pct' ? Number(i.value) : i.value; ed.querySelector('#nu-msum').textContent = rows.reduce((a, m) => a + (Number(m.pct) || 0), 0); }));
    ed.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { rows.splice(Number(b.dataset.rm), 1); draw(); }));
    ed.querySelector('#nu-madd').onclick = () => { rows.push({ name: 'Snack', time: '16:00', pct: 10 }); draw(); };
    ed.querySelector('#nu-meven').onclick = () => { rows.forEach((m) => { m.pct = Math.round(100 / rows.length); }); draw(); };
    ed.querySelector('#nu-msave').onclick = () => { P.mealsCustom = rows.filter((m) => m.name); save('nu-plan', P); plan(); };
    ed.querySelector('#nu-mcancel').onclick = () => { ed.hidden = true; };
  };
  draw();
}
function foodTotals(list) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const x of list) for (const k of Object.keys(t)) t[k] += (x[k] || 0) * x.g / 100;
  return t;
}

// ------------------------------------------------------------------ foods (USDA)
async function foods() {
  if (!F) {
    const d = await fetch('/meridian-4D/rt/nutrition/foods.json').then((r) => r.json()).catch(() => null);
    if (!d) return null;
    const ix = Object.fromEntries(d.cols.map((c, i) => [c, i]));
    F = { ...d, ix, rows: d.rows.map((r) => ({ id: r[0], name: r[1], cat: r[2], lc: r[1].toLowerCase(), v: r })) };
  }
  return F;
}
const val = (f, k) => f.v[F.ix[k]];
function searchFoods(q, n = 30) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return [];
  const rx = words.map((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const score = (f) => (f.lc.startsWith(words[0]) ? 0 : 2) + (rx.every((r) => r.test(f.lc)) ? 0 : 4) + (/raw|cooked|boiled/.test(f.lc) ? 0 : 1) + f.name.length / 200;
  return F.rows.filter((f) => words.every((w) => f.lc.includes(w))).sort((a, b) => score(a) - score(b)).slice(0, n);
}
function foodRow(f, extra = '') {
  return `<tr><td>${esc(f.name)}<br><small class="muted">${esc(f.cat)}</small></td><td>${val(f, 'kcal') ?? '—'}</td><td>${val(f, 'p') ?? '—'}</td><td>${val(f, 'c') ?? '—'}</td><td>${val(f, 'f') ?? '—'}</td><td>${val(f, 'fib') ?? '—'}</td><td>${val(f, 'fe') ?? '—'}</td><td>${val(f, 'ca') ?? '—'}</td>${extra}</tr>`;
}
const FOODHEAD = '<tr><th>Food (per 100 g)</th><th>kcal</th><th>Protein g</th><th>Carb g</th><th>Fat g</th><th>Fibre g</th><th>Iron mg</th><th>Calcium mg</th>';
function foodSearch() {
  const i = $('#nu-fq'), out = $('#nu-fr');
  i.oninput = async () => {
    if (!(await foods())) { out.innerHTML = '<p class="muted">Food table not built.</p>'; return; }
    const res = searchFoods(i.value);
    out.innerHTML = res.length ? `<div class="nu-tablewrap"><table class="tt nu-ft"><thead>${FOODHEAD}</tr></thead><tbody>${res.map((f) => foodRow(f)).join('')}</tbody></table></div><p class="fine">${esc(F.source)} · ${esc(F.licence)}</p>` : (i.value.trim() ? '<p class="muted">No food matches.</p>' : '');
  };
}
async function openPicker(meal) {
  if (!(await foods())) return;
  const dlg = document.createElement('dialog'); dlg.className = 'nu-dlg';
  dlg.innerHTML = `<form method="dialog"><h3>Add a food to ${esc(meal)}</h3><input id="nu-pq" type="search" placeholder="Search foods…" autofocus>
    <label>Grams <input id="nu-pg" type="number" value="100" min="1" max="2000"></label><div id="nu-pr"></div><button class="ghost-btn" value="close">Close</button></form>`;
  document.body.appendChild(dlg); dlg.showModal();
  const q = dlg.querySelector('#nu-pq'), r = dlg.querySelector('#nu-pr');
  q.oninput = () => {
    const res = searchFoods(q.value, 20);
    r.innerHTML = `<div class="nu-tablewrap"><table class="tt nu-ft"><thead>${FOODHEAD}<th></th></tr></thead><tbody>${res.map((f) => foodRow(f, `<td><button class="ghost-btn tiny" type="button" data-pick="${f.id}">add</button></td>`)).join('')}</tbody></table></div>`;
    r.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
      const f = F.rows.find((x) => String(x.id) === b.dataset.pick); const g = Number(dlg.querySelector('#nu-pg').value) || 100;
      (P.foods[meal] = P.foods[meal] || []).push({ id: f.id, name: f.name, g, kcal: val(f, 'kcal') || 0, p: val(f, 'p') || 0, c: val(f, 'c') || 0, f: val(f, 'f') || 0 });
      save('nu-plan', P); dlg.close(); plan();
    }));
  };
  dlg.addEventListener('close', () => dlg.remove());
}

// ------------------------------------------------------------------ deficiencies
const DEFKEY = { iron: 'fe', vitd: 'vd', b12: 'b12', folate: 'fol', calcium: 'ca', zinc: 'zn', magnesium: 'mg', vitc: 'vc', vita: 'va', b1: 'b1', b6: 'b6', vite: 've', vitk: 'vk' };
let defSel = null;
function defs() {
  $('#nu-defs').innerHTML = N.deficiencies.map((d) => `<button class="nu-tb ${d.id === defSel ? 'on' : ''}" data-def="${d.id}">${esc(d.name)}</button>`).join('');
  document.querySelectorAll('[data-def]').forEach((b) => (b.onclick = () => { defSel = b.dataset.def; defs(); showDef(); }));
}
async function showDef() {
  const d = N.deficiencies.find((x) => x.id === defSel); if (!d) return;
  const part = (k, n) => `<h4>${n}</h4>${d[k].length ? d[k].map(quote).join('') : '<p class="nu-nq">No quote found.</p>'}`;
  $('#nu-def').innerHTML = `<article class="nu-art"><h3>${esc(d.name)}</h3>${part('signs', 'Signs')}${part('foods', 'Food sources')}${part('risk', 'Who is at risk')}<div id="nu-top"><p class="muted">Loading food table…</p></div>
    <p class="fine">Chapters: ${d.chapters.map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>`).join(', ')} (StatPearls, CC BY-NC-ND 4.0). Testing and treatment of a deficiency belong with a doctor; supplement amounts are not shown here.</p></article>`;
  if (!(await foods())) return;
  const k = DEFKEY[d.id], unit = F.units[k];
  const top = F.rows.filter((f) => val(f, k) && !/^(Baby Foods|Restaurant Foods|Fast Foods|Spices and Herbs|American Indian\/Alaska Native Foods)$/.test(f.cat) && !/powder|supplement|fortified|enriched|with iron|ready-to-eat|freeze-dried|formula|dry mix/i.test(f.name))
    .sort((a, b) => val(b, k) - val(a, k)).slice(0, 10);
  $('#nu-top').innerHTML = `<h4>Richest everyday foods in the USDA table (per 100 g, fortified products and powders left out)</h4>
    <ol class="nu-topl">${top.map((f) => `<li>${esc(f.name)} <b>${val(f, k)} ${esc(unit)}</b></li>`).join('')}</ol><p class="fine">${esc(F.source)} · ${esc(F.licence)}. Amounts per 100 g; portion sizes differ.</p>`;
}

// ------------------------------------------------------------------ checklist (quoted points, ticked by the visitor)
function checklist() {
  const t = N.topics.find((x) => x.id === 'quality');
  $('#nu-check').innerHTML = `<ul class="nu-cl">${t.quotes.map((q, i) => `<li><label><input type="checkbox" data-c="${i}" ${CHECK[i] ? 'checked' : ''}> <span>${esc(q.text)}</span></label><br>${cite(q)}</li>`).join('')}</ul>
    <p class="fine"><span id="nu-cn">${Object.values(CHECK).filter(Boolean).length}</span> of ${t.quotes.length} ticked.</p>`;
  document.querySelectorAll('[data-c]').forEach((c) => (c.onchange = () => { CHECK[c.dataset.c] = c.checked; save('nu-check', CHECK); $('#nu-cn').textContent = Object.values(CHECK).filter(Boolean).length; }));
}
// what js/nutrition_plus.js (shelves, rehab phases, tracker) uses from here
const API = {
  get N() { return N; }, get P() { return P; }, save: () => save('nu-plan', P), plan: () => plan(), foods: () => foods(), val: (f, k) => val(f, k),
  targets: () => targets(P), meals: () => mealPlan(P, targets(P)), totals: (l) => foodTotals(l), quote, cite, esc,
};
window.__nu = { get data() { return N; }, targets: (p) => targets({ ...DEF_PLAN, ...p }), goTopic };
