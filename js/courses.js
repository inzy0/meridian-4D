// Courses & credentials (Extensions tab): quality online learning with a credential, laid out by level and by what the
// credential is worth, for the UK, the US and global standards. Links only; nothing is copied from these sites.
// Credential value is a navigation scale (not a ranking of quality):
//   1 learning record  · certificate of participation or achievement (portfolio evidence)
//   2 accredited CPD / CME · credits from an accredited provider; count toward revalidation or licensure where your
//     regulator accepts them
//   3 academic credit · credit points (UK credits, ECTS, US college credit) that can count toward a qualification
//   4 professional certification · exam- or assessment-based credential from a certifying body
// Credits, prices and recognition change: every card says to confirm the current details on the provider's page.
// Links checked 2026-11-26 with a generic client: "ok" = answered; "blocked" = the site refused automated checks
// (HTTP 403) but exists; open it in a browser.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// [level, field, region, name, url, credential, value, cost, check]
export const COURSES = [
  // ---------------- 1 Foundation
  ['foundation', 'Public & global health', 'Global', 'OpenWHO (World Health Organization)', 'https://openwho.org/', 'Record of achievement / confirmation of participation per course', '1', 'free', 'ok'],
  ['foundation', 'Health workforce', 'Global', 'WHO Academy', 'https://www.who.int/about/who-academy', 'Course certificates for health workers', '1', 'free / varies', 'ok'],
  ['foundation', 'Many subjects', 'UK', 'OpenLearn (The Open University)', 'https://www.open.edu/openlearn/', 'Free statement of participation; some courses award digital badges', '1', 'free', 'blocked'],
  ['foundation', 'Sport medicine & welfare', 'Global', 'World Rugby Passport', 'https://passport.world.rugby/', 'Free courses (player welfare, concussion, first aid in rugby) with certificates', '1', 'free', 'ok'],
  ['foundation', 'Clinical research', 'US', 'NIH Office of Clinical Research courses (incl. IPPCR)', 'https://ocr.od.nih.gov/courses/ippcr.html', 'Certificate of completion for the clinical-research principles course', '1', 'free', 'blocked'],
  ['foundation', 'Evidence synthesis', 'Global', 'Cochrane Learn', 'https://www.cochrane.org/learn', 'Training in systematic reviews and evidence; some modules offer CPD', '1–2', 'free / paid', 'ok'],
  // ---------------- 2 Professional (accredited CPD / CME)
  ['professional', 'Medicine (all specialties)', 'US / Global', 'Medscape Education', 'https://www.medscape.org/', 'CME / CE on accredited activities (AMA PRA Category 1 Credit™ where stated)', '2', 'free (account)', 'ok'],
  ['professional', 'Public health', 'US', 'CDC TRAIN', 'https://www.train.org/cdctrain/', 'Many trainings carry continuing education (CME, CNE, CEU, CPH) as listed per course', '2', 'free', 'ok'],
  ['professional', 'NHS workforce', 'UK', 'e-Learning for Healthcare (NHS England)', 'https://portal.e-lfh.org.uk/', 'Certificates of completion used as CPD and appraisal evidence', '2', 'free for UK health and care staff', 'ok'],
  ['professional', 'Medicine & nursing', 'UK / Global', 'BMJ Learning', 'https://new-learning.bmj.com/', 'Accredited CPD / CME modules with certificates', '2', 'subscription / institutional', 'ok'],
  ['professional', 'Physiotherapy & rehab', 'Global', 'Physiopedia (courses)', 'https://www.physio-pedia.com/', 'Online courses with certificates for CPD portfolios', '2', 'free / paid', 'blocked'],
  ['professional', 'Research ethics & GCP', 'US / Global', 'CITI Program', 'https://about.citiprogram.org/', 'Research ethics, human-subjects and Good Clinical Practice courses used by institutions; some carry CE credits', '1–2', 'institutional / paid', 'ok'],
  ['professional', 'Radiology', 'US / Global', 'RSNA Education', 'https://www.rsna.org/education', 'Radiology learning with CME credit on accredited activities', '2', 'free / member / paid', 'ok'],
  ['professional', 'Ultrasound (incl. MSK)', 'US', 'AIUM (American Institute of Ultrasound in Medicine)', 'https://www.aium.org/', 'Ultrasound courses and CME, practice parameters', '2', 'member / paid', 'ok'],
  ['professional', 'MSK radiology & ultrasound', 'Europe', 'ESSR (European Society of Musculoskeletal Radiology)', 'https://www.essr.org/', 'MSK imaging courses and meetings; CME per event', '2', 'member / paid', 'ok'],
  ['professional', 'Football medicine', 'Global', 'FIFA Medical Network', 'https://www.fifamedicalnetwork.com/', 'Online football-medicine learning (FIFA Diploma in Football Medicine) with certificates', '1–2', 'free (account)', 'ok'],
  // ---------------- 3 Advanced (academic credit / postgraduate-level)
  ['advanced', 'Degree-level study', 'UK', 'The Open University', 'https://www.open.ac.uk/', 'Modules carry UK academic credit toward certificates, diplomas and degrees (incl. postgraduate)', '3', 'paid (fees)', 'blocked'],
  ['advanced', 'University courses', 'Global', 'Coursera', 'https://www.coursera.org/', 'Free to audit; paid certificates; some programmes are credit-eligible toward university degrees', '1–3', 'free audit / paid', 'ok'],
  ['advanced', 'University courses', 'Global', 'edX', 'https://www.edx.org/', 'Professional certificates; MicroMasters and similar programmes offer credit pathways at partner universities', '1–3', 'free audit / paid', 'ok'],
  ['advanced', 'University courses', 'UK / Global', 'FutureLearn', 'https://www.futurelearn.com/', 'Certificates; some CPD-certified courses; microcredentials that carry academic credit', '1–3', 'free / paid', 'blocked'],
  ['advanced', 'Sports nutrition, medicine, physical therapies', 'Global', 'IOC Diploma programmes (Sports Oracle)', 'https://www.sportsoracle.com/', 'IOC postgraduate-level online diplomas (e.g. sports nutrition, sports medicine, physical therapies)', '3', 'paid', 'ok'],
  // ---------------- 4 Specialist certifications
  ['specialist', 'Exercise science', 'US / Global', 'ACSM certifications', 'https://www.acsm.org/certification', 'Exam-based certifications (e.g. personal trainer, exercise physiologist, clinical exercise physiologist)', '4', 'paid (exam)', 'blocked'],
  ['specialist', 'Strength & conditioning', 'US / Global', 'NSCA certifications (e.g. CSCS)', 'https://www.nsca.com/certification/', 'Exam-based strength and conditioning certifications', '4', 'paid (exam)', 'blocked'],
  ['specialist', 'Sports nutrition', 'Global', 'ISSN: CISSN', 'https://www.sportsnutritionsociety.org/', 'Certified Sports Nutritionist exam (ISSN)', '4', 'paid (exam)', 'ok'],
  ['specialist', 'Sports dietetics', 'US', 'CDR: Board Certified Specialist in Sports Dietetics (CSSD)', 'https://www.cdrnet.org/', 'Board certification for registered dietitians', '4', 'paid (exam)', 'ok'],
  ['specialist', 'Sport & exercise nutrition', 'UK', 'SENr (British Dietetic Association)', 'https://www.bda.uk.com/senr-sport-and-exercise-nutrition-register.html', 'Register of sport and exercise nutrition practitioners (competency portfolio)', '4', 'paid (application)', 'ok'],
  ['specialist', 'Sport & exercise science', 'UK', 'CASES accreditation (formerly BASES)', 'https://www.cases.org.uk/', 'Professional accreditation for sport and exercise scientists', '4', 'paid (application)', 'ok'],
  ['specialist', 'MSK ultrasound', 'US / Global', 'ARDMS RMSK (Inteleos)', 'https://www.inteleos.org/about/community/ardms/', 'Registered in Musculoskeletal sonography credential (exam)', '4', 'paid (exam)', 'ok'],
  ['specialist', 'Radiology', 'Europe / Global', 'European Society of Radiology: EDiR', 'https://www.myesr.org/', 'European Diploma in Radiology (exam) and ESR education', '4', 'paid (exam)', 'ok'],
  ['specialist', 'Resuscitation', 'US / Global', 'American Heart Association: BLS, ACLS, PALS', 'https://cpr.heart.org/', 'Course completion cards with skills assessment', '4', 'paid', 'blocked'],
  ['specialist', 'Resuscitation', 'Europe', 'European Resuscitation Council: BLS, ALS, EPALS', 'https://www.erc.edu/', 'Certificates with practical assessment', '4', 'paid', 'ok'],
  ['specialist', 'Resuscitation', 'UK', 'Resuscitation Council UK: ILS, ALS, EPALS', 'https://www.resus.org.uk/', 'Certificates with practical assessment', '4', 'paid', 'ok'],
  ['specialist', 'Prehospital trauma', 'US / Global', 'NAEMT: PHTLS, TECC', 'https://www.naemt.org/', 'Course certificates with assessment', '4', 'paid', 'ok'],
  // ---------------- Standards & validators
  ['standards', 'US CME', 'US', 'ACCME (Accreditation Council for CME)', 'https://accme.org/', 'Accredits US CME providers', '—', 'info', 'ok'],
  ['standards', 'US CME', 'US', 'CME Passport', 'https://www.cmepassport.org/', 'Search accredited CME activities and track credits', '—', 'free', 'ok'],
  ['standards', 'UK CPD', 'UK', 'CPD Certification Service (CPD UK)', 'https://www.cpduk.co.uk/', 'Independent CPD accreditation; directory of certified courses', '—', 'info', 'blocked'],
  ['standards', 'UK CPD', 'UK', 'HCPC: CPD standards', 'https://www.hcpc-uk.org/cpd/', 'CPD requirements for registered allied health professionals (incl. physiotherapists)', '—', 'info', 'ok'],
  ['standards', 'UK medical regulation', 'UK', 'General Medical Council', 'https://www.gmc-uk.org/', 'Standards and guidance for doctors, including CPD for revalidation', '—', 'info', 'ok'],
  ['standards', 'UK academic credit', 'UK', 'QAA (Quality Assurance Agency)', 'https://www.qaa.ac.uk/', 'UK higher-education quality and credit frameworks', '—', 'info', 'ok'],
  ['standards', 'EU academic credit', 'Europe', 'European Commission: education and ECTS', 'https://ec.europa.eu/education/', 'European Credit Transfer and Accumulation System and EU education policy', '—', 'info', 'ok'],
  ['standards', 'US college credit', 'US', 'American Council on Education (ACE)', 'https://www.acenet.edu/', 'Credit recommendations for courses taken outside colleges', '—', 'info', 'ok'],
  ['standards', 'US accreditation', 'US', 'CHEA (Council for Higher Education Accreditation)', 'https://www.chea.org/', 'Recognises US accrediting organisations', '—', 'info', 'blocked'],
  ['standards', 'Certification quality', 'US / Global', 'Institute for Credentialing Excellence (NCCA)', 'https://www.credentialingexcellence.org/', 'NCCA accreditation of certification programmes', '—', 'info', 'blocked'],
];
const LEVELS = [['foundation', '1 · Foundation', 'free learning records'], ['professional', '2 · Professional', 'accredited CPD / CME'], ['advanced', '3 · Advanced', 'academic credit, postgraduate level'],
  ['specialist', '4 · Specialist', 'certifications and assessed courses'], ['standards', 'Standards & validators', 'who accredits what']];
const VAL = { 1: 'learning record', 2: 'accredited CPD / CME', 3: 'academic credit', 4: 'professional certification', '—': 'standard / validator' };

export function coursesHtml() {
  return `<section class="card cr-card"><div class="card-h"><h2>🎓 Courses & credentials</h2><small>${COURSES.length} providers and validators · UK, US and global · links checked 2026-11-26</small></div>
    <p class="fine">Credential value: <b>1</b> learning record · <b>2</b> accredited CPD / CME (counts where your regulator accepts it) · <b>3</b> academic credit toward a qualification · <b>4</b> exam- or assessment-based certification. Credits, prices and recognition change: confirm on the provider's page before you enrol.</p>
    <div class="cr-filters">${[['all', 'All regions'], ['UK', 'UK'], ['US', 'US'], ['Europe', 'Europe'], ['Global', 'Global']].map(([k, n]) => `<button class="ghost-btn ${k === 'all' ? 'on' : ''}" data-cr-r="${k}">${n}</button>`).join('')}
      <span class="sep"></span>${['all', '1', '2', '3', '4'].map((v) => `<button class="ghost-btn ${v === 'all' ? 'on' : ''}" data-cr-v="${v}">${v === 'all' ? 'any value' : `value ${v}`}</button>`).join('')}</div>
    <div id="cr-body"></div></section>`;
}
export function bindCourses(root) {
  let reg = 'all', val = 'all';
  const draw = () => {
    const rows = COURSES.filter((c) => (reg === 'all' || c[2].includes(reg)) && (val === 'all' || c[6].includes(val)));
    root.querySelector('#cr-body').innerHTML = LEVELS.map(([k, n, sub]) => { const r = rows.filter((c) => c[0] === k); return r.length ? `<div class="cr-lv"><h3>${n} <small>${sub}</small></h3><div class="ext-grid">${r.map((c) => `
      <div class="ext-card cr-c v${esc(c[6][0])}"><a href="${esc(c[4])}" target="_blank" rel="noopener noreferrer"><b>${esc(c[3])}</b></a>
        <p class="fine">${esc(c[5])}</p>
        <p class="fine"><span class="cr-v">${c[6] === '—' ? 'standard' : `value ${esc(c[6])}`}</span> ${esc(c[6].split('–').map((x) => VAL[x]).filter(Boolean).join(' → '))} · ${esc(c[1])} · ${esc(c[2])} · ${esc(c[7])}${c[8] === 'blocked' ? ' · <span title="The site refused the automated link check (HTTP 403); it exists, open it in a browser.">check blocked</span>' : ''}</p></div>`).join('')}</div></div>` : ''; }).join('') || '<p class="muted">Nothing for this filter.</p>';
  };
  root.querySelectorAll('[data-cr-r]').forEach((b) => (b.onclick = () => { reg = b.dataset.crR; root.querySelectorAll('[data-cr-r]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  root.querySelectorAll('[data-cr-v]').forEach((b) => (b.onclick = () => { val = b.dataset.crV; root.querySelectorAll('[data-cr-v]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  draw();
}
