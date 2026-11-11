const app = document.querySelector('#app');
const dialog = document.querySelector('#recordDialog');
const form = document.querySelector('#recordForm');
const LOCAL_STATE_KEY = 'neo-labs-os-state'; // Preserve existing browser records.
let state, storageMode = 'file', search = '';
let view = location.hash.slice(1) || 'overview';
const views = {
  overview: ['The big picture', 'Fund overview', 'deal'],
  pipeline: ['Source. Understand. Decide.', 'Investment pipeline', 'deal'],
  portfolio: ['After the investment', 'Portfolio', 'project'],
  investors: ['Long-term relationships', 'Investor relationships', 'investor'],
  thesis: ['What we believe', 'Fund thesis', 'fund'],
  tasks: ['Make the next move', 'Fund operations', 'task'],
  agents: ['Your specialist team', 'Agent desk', null]
};
const mandate = { stage:'Investment stage', sectors:'Sectors', geography:'Geography', checkSize:'Initial check size', targetSize:'Fund target', reserves:'Follow-on reserves', fundLife:'Fund life', domicile:'Domicile', legalStatus:'Formation status', fees:'Management fees', carry:'Carried interest', decisionAuthority:'Investment authority' };
const investmentStages = ['Sourced','Screening','Diligence','IC review','Approved','Invested','Watch','Passed'];
const investorStages = ['Identified','Conversation','Diligence','Indication','Committed','Closed'];
const agents = [
  ['01','Researcher','$neo-researcher','Build the investment case. Verify the evidence. Find what could prove us wrong.'],
  ['02','Writer','$neo-writer','Turn the thesis and portfolio evidence into clear founder and investor communications.'],
  ['03','Closer','$neo-closer','Prepare proposals and follow-up for qualified opportunities. External outreach requires approval.'],
  ['04','Operator','$neo-operator','Keep decisions, owners, milestones, and portfolio follow-through in one place.']
];
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const id = prefix => `${prefix}-${crypto.randomUUID()}`;
const prettyDate = value => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T12:00:00`)) ? new Intl.DateTimeFormat('en', {month:'short', day:'numeric'}).format(new Date(`${value}T12:00:00`)) : 'TBD';
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const overdue = task => task.due && task.due < today() && task.status !== 'Done';
const projectName = projectId => state.projects.find(p => p.id === projectId)?.name || 'Fund';
const pill = value => `<span class="pill ${slug(value)}">${escapeHtml(value || 'TBD')}</span>`;
const holdings = () => state.projects.filter(p => p.kind === 'Investment');
const investmentDeals = () => state.pipeline.filter(d => d.type === 'Potential investment');
const investorDeals = () => state.pipeline.filter(d => d.type === 'Potential investor');
const empty = (title, description, action = '') => `<div class="empty"><span class="empty-icon">◇</span><h3>${title}</h3><p>${description}</p>${action}</div>`;
const addButton = (type, label) => `<button class="button ghost" data-new="${type}">+ ${label}</button>`;
function validState(s) { return s && s.company && ['projects','tasks','pipeline'].every(k => Array.isArray(s[k])); }
function normalize(s) {
  s.company = {...s.company, name:'ro.fun', legacyName:'Neo Labs', model:'Investment fund'};
  if (s.company.northStar === 'Build and back focused companies where execution creates an unfair advantage.') s.company.northStar = 'Conviction in the investment. Commitment to the company.';
  if (s.company.quarterFocus === 'Turn the company model into a working operating cadence.') s.company.quarterFocus = 'Define the mandate, confirm the fund structure, and build an evidence-led investment pipeline.';
  s.fund = {...Object.fromEntries(Object.keys(mandate).map(k => [k,'TBD'])), ...s.fund};
  s.decisions ||= [];
  return s;
}
async function load() {
  let local;
  try { local = localStorage.getItem(LOCAL_STATE_KEY); } catch { /* File mode remains available. */ }
  if (local) {
    try { const parsed = JSON.parse(local); if (validState(parsed)) { state = normalize(parsed); storageMode = 'browser'; render(); return; } } catch { /* Keep unreadable data untouched and load file. */ }
  }
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error('The fund records could not be retrieved.');
  const data = await response.json();
  if (!validState(data)) throw new Error('The fund records have an invalid format.');
  state = normalize(data); render();
}
async function save(message = 'Record saved') {
  const previousTimestamp = state.updatedAt;
  state.updatedAt = new Date().toISOString();
  try {
    if (storageMode === 'browser') throw new Error('Browser workspace');
    const response = await fetch('/api/state', {method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(state)});
    if (!response.ok) throw new Error('File persistence unavailable');
    const result = await response.json(); state.updatedAt = result.updatedAt;
  } catch {
    try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state)); storageMode = 'browser'; }
    catch { state.updatedAt = previousTimestamp; throw new Error('Could not save. Export records to keep a copy.'); }
  }
  updateSaved(); toast(storageMode === 'browser' ? `${message} in this browser` : message);
}
function updateSaved() {
  document.querySelector('#storageLabel').textContent = storageMode === 'browser' ? 'Saved in this browser' : 'Local file records';
  document.querySelector('#lastSaved').textContent = state.updatedAt && !isNaN(new Date(state.updatedAt)) ? `Updated ${new Date(state.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'})}` : 'Update date TBD';
}
let toastTimer;
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4000); }
function taskQueue(limit, all = false) {
  const tasks = state.tasks.filter(t => all || t.status !== 'Done').sort((a,b) => Number(overdue(b))-Number(overdue(a)) || ({P0:0,P1:1,P2:2}[a.priority] ?? 3)-({P0:0,P1:1,P2:2}[b.priority] ?? 3));
  const list = limit ? tasks.slice(0,limit) : tasks;
  if (!list.length) return empty('Room for the next move.', 'No open actions recorded.', addButton('task','Add an action'));
  return `<div class="queue">${list.map(t => `<div class="queue-item"><button class="check ${t.status === 'Done' ? 'done' : ''}" data-task="${escapeHtml(t.id)}" aria-label="${t.status === 'Done' ? 'Reopen' : 'Complete'} ${escapeHtml(t.title)}" aria-pressed="${t.status === 'Done'}">${t.status === 'Done' ? '✓' : ''}</button><div><button class="record-link" data-edit="task" data-id="${escapeHtml(t.id)}">${escapeHtml(t.title)}</button><small>${escapeHtml(t.owner)} <span>·</span> ${prettyDate(t.due)} ${overdue(t) ? '<b class="overdue">Overdue</b>' : ''}</small></div>${pill(t.priority)}</div>`).join('')}</div>`;
}
function projectRows(list) {
  if (!list.length) return empty('The portfolio starts with evidence.', 'Add a company once the investment is verified. Internal fund work lives in Operations.', addButton('project','Add portfolio company'));
  return `<div class="table-wrap"><table><thead><tr><th>Company</th><th>Stage</th><th>Health</th><th>Owner</th><th>Next milestone</th><th>Due</th></tr></thead><tbody>${list.map(p => `<tr><td><button class="record-link" data-edit="project" data-id="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button><small>${escapeHtml(p.kind)}</small></td><td>${escapeHtml(p.stage)}</td><td>${pill(p.health)}</td><td>${escapeHtml(p.owner)}</td><td>${escapeHtml(p.milestone)}</td><td>${prettyDate(p.due)}</td></tr>`).join('')}</tbody></table></div>`;
}
function overview() {
  const known = Object.keys(mandate).filter(k => state.fund[k] && state.fund[k] !== 'TBD').length;
  const active = investmentDeals().filter(d => !['Passed','Invested','Lost'].includes(d.stage));
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow">RO.FUN / INVESTMENT FUND</span><h2>Back founders.<br><em>Build conviction.</em></h2><p>An investment fund with an operating mindset.<br>One direction for Neo Labs and ro.fun.</p><a href="#thesis" class="hero-link">Explore the fund thesis <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><span class="orbit-center">r.</span><span class="art-caption">CONVICTION → CAPITAL → COMPOUNDING</span></div></section>
  <div class="stats"><div class="stat"><small>RECORDED HOLDINGS <span>◈</span></small><strong>${holdings().length.toString().padStart(2,'0')}</strong><p>Verified companies in the workspace</p></div><div class="stat"><small>ACTIVE OPPORTUNITIES <span>↗</span></small><strong>${active.length.toString().padStart(2,'0')}</strong><p>From sourcing to investment review</p></div><div class="stat"><small>FUND TARGET <span>◎</span></small><strong>${escapeHtml(state.fund.targetSize)}</strong><p>Mandate and terms to be confirmed</p></div><div class="stat"><small>OPEN ACTIONS <span>☑</span></small><strong>${state.tasks.filter(t => t.status !== 'Done').length.toString().padStart(2,'0')}</strong><p>${state.tasks.filter(overdue).length} overdue · keep decisions moving</p></div></div>
  <div class="grid-2"><section class="panel"><div class="panel-head"><div><span class="eyebrow">BUILD THE FOUNDATION</span><h2>From intent to investment.</h2></div><a href="#thesis" class="text-button">View thesis ↗</a></div><div class="readiness"><div><strong>${known}<span> / ${Object.keys(mandate).length}</span></strong><small>Fund parameters recorded</small></div><div class="progress" role="progressbar" aria-label="Fund parameters recorded" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${known}"><span style="width:${known/12*100}%"></span></div><p>${escapeHtml(state.company.quarterFocus)}</p><div class="readiness-row"><span>01</span><div><strong>Define the mandate</strong><small>Stage, sector, geography, and investment edge</small></div><a href="#thesis">↗</a></div><div class="readiness-row"><span>02</span><div><strong>Build the investment case</strong><small>Evidence, diligence, and a clear decision</small></div><a href="#pipeline">↗</a></div><div class="readiness-row"><span>03</span><div><strong>Align the fund structure</strong><small>Formation status and terms remain TBD</small></div><a href="#tasks">↗</a></div></div></section><section class="panel"><div class="panel-head"><div><span class="eyebrow">WHAT NEEDS TO MOVE</span><h2>Priority actions</h2></div><a href="#tasks" class="text-button">View all ↗</a></div>${taskQueue(4)}</section></div>
  <section class="panel decisions"><div class="panel-head"><div><span class="eyebrow">THE RECORD</span><h2>Recent decisions</h2></div>${addButton('decision','Record decision')}</div>${state.decisions.slice(-3).reverse().map(d => `<div class="decision"><time>${prettyDate(d.date)}</time><div><strong>${escapeHtml(d.decision)}</strong><p>${escapeHtml(d.why)}</p></div></div>`).join('') || empty('No decisions recorded.', 'Keep the reasoning alongside the decision.')}</section>`;
}
function pipeline(investors = false) {
  const list = investors ? investorDeals() : investmentDeals();
  const stages = investors ? investorStages : investmentStages;
  const other = state.pipeline.filter(d => !['Potential investment','Potential investor'].includes(d.type));
  return `<div class="section-intro"><p>${investors ? 'A relationship is not a commitment. Keep the next conversation and its evidence in view.' : 'Build the case before deploying capital. Every opportunity needs an owner and a next move.'}</p></div><div class="stage-strip">${stages.map(s => `<div><span>${escapeHtml(s)}</span><strong>${list.filter(d => d.stage === s).length}</strong></div>`).join('')}</div><section class="panel"><div class="panel-head"><h2>${investors ? 'Investor' : 'Investment'} records <span class="count">${list.length}</span></h2><label class="search"><span class="sr-only">Search records</span><input id="searchRecords" type="search" placeholder="Search records…" value="${escapeHtml(search)}"></label></div><div id="dealRows">${dealRows(list)}</div></section>${!investors && other.length ? `<section class="panel decisions"><div class="panel-head"><h2>Other existing relationships</h2></div>${dealRows(other)}</section>` : ''}`;
}
function dealRows(list) {
  const filtered = list.filter(d => `${d.name} ${d.contact} ${d.stage} ${d.nextAction}`.toLowerCase().includes(search.toLowerCase()));
  if (!filtered.length) return empty(search ? 'No matching records.' : 'The next relationship starts here.', search ? 'Try another company, contact, or stage.' : 'Record real opportunities, then build the evidence.', search ? '' : addButton(view === 'investors' ? 'investor' : 'deal','Add a record'));
  return `<div class="table-wrap"><table><thead><tr><th>Name / contact</th><th>Stage</th><th>Check / commitment</th><th>Next action</th><th>Due</th></tr></thead><tbody>${filtered.map(d => `<tr><td><button class="record-link" data-edit="${d.type === 'Potential investor' ? 'investor' : 'deal'}" data-id="${escapeHtml(d.id)}">${escapeHtml(d.name)}</button><small>${escapeHtml(d.contact)}</small></td><td>${pill(d.stage)}</td><td>${escapeHtml(d.value)}</td><td>${escapeHtml(d.nextAction)}</td><td>${prettyDate(d.nextDate)}</td></tr>`).join('')}</tbody></table></div>`;
}
function portfolio() { return `<div class="section-intro"><p>The work continues after the investment. Track company milestones, owners, and the support they need.</p></div><section class="panel"><div class="panel-head"><h2>Recorded portfolio <span class="count">${holdings().length}</span></h2><span class="eyebrow">Internal work excluded</span></div>${projectRows(holdings())}</section>`; }
function thesis() { return `<section class="thesis-intro"><span class="eyebrow">OUR WORKING MANDATE</span><h2>${escapeHtml(state.company.northStar)}</h2><p>Back companies where research, product, distribution, and practical operating support can help create value.</p></section><div class="mandate-grid">${Object.entries(mandate).map(([k,label]) => `<div class="mandate-item"><span class="eyebrow">${label}</span><strong class="${state.fund[k] === 'TBD' ? 'muted' : ''}">${escapeHtml(state.fund[k])}</strong></div>`).join('')}</div><section class="panel decisions"><div class="panel-head"><h2>Before an investment decision</h2></div><ol class="criteria"><li>Evidence of a specific customer problem.</li><li>A credible team advantage and a market that supports the return model.</li><li>A clear operating contribution and a funded next milestone.</li><li>Documented risks, disconfirming evidence, and approval authority.</li></ol></section><p class="footnote">Internal thesis draft. Legal and tax review is required before raising or deploying money. Recording terms here does not approve them.</p>`; }
function tasks() { return `<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Operating actions</h2><span class="eyebrow">Select an action to edit</span></div>${taskQueue(null,true)}</section><section class="panel"><div class="panel-head"><h2>Internal work</h2>${addButton('internal','Add workstream')}</div>${projectRows(state.projects.filter(p => p.kind !== 'Investment'))}</section></div>`; }
function agentDesk() { return `<div class="section-intro"><p>Four specialist roles. One fund context. Each handoff starts with a decision and ends with a next action.</p></div><div class="agent-grid">${agents.map(a => `<article class="agent-card"><span class="eyebrow">${a[0]} / FUND TEAM</span><h2>${a[1]}</h2><p>${a[3]}</p><footer><code>${a[2]}</code><button class="text-button" data-copy="${a[2]}">Copy ↗</button></footer></article>`).join('')}</div>`; }
function render() {
  if (!views[view]) view = 'overview';
  const [eyebrow,title,type] = views[view];
  document.querySelector('#viewEyebrow').textContent = title;
  document.querySelector('#pageEyebrow').textContent = eyebrow;
  document.querySelector('#viewTitle').textContent = title;
  document.querySelectorAll('.nav-item').forEach(b => { b.classList.toggle('active',b.dataset.view === view); if (b.dataset.view === view) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  document.querySelector('#newButton').hidden = !type;
  document.querySelector('#newButton').textContent = ({deal:'+ Add opportunity', investor:'+ Add investor', project:'+ Add company', task:'+ Add action', fund:'Edit mandate'})[type] || '';
  app.innerHTML = ({overview,portfolio,pipeline,investors:() => pipeline(true),thesis,tasks,agents:agentDesk}[view])(); updateSaved();
}
function field(name,label,type='text',options=[],value='',full=false) {
  const safe = escapeHtml(value);
  const control = type === 'select' ? `<select id="${name}" name="${name}">${[...new Set([...(value && !options.some(o => (o.value ?? o) === value) ? [value] : []),...options])].map(o => `<option value="${escapeHtml(o.value ?? o)}" ${(o.value ?? o) === value ? 'selected' : ''}>${escapeHtml(o.label ?? o)}</option>`).join('')}</select>` : type === 'textarea' ? `<textarea id="${name}" name="${name}" required>${safe}</textarea>` : `<input id="${name}" name="${name}" type="${type}" value="${safe}" ${type === 'date' ? '' : 'required'}>`;
  return `<div class="field ${full ? 'full' : ''}"><label for="${name}">${label}</label>${control}</div>`;
}
function openForm(type = views[view][2], recordId = '') {
  const collection = ['project','internal'].includes(type) ? state.projects : type === 'task' ? state.tasks : state.pipeline;
  const record = collection.find(r => r.id === recordId) || {};
  form.dataset.type = type; form.dataset.id = recordId;
  document.querySelector('#dialogTitle').textContent = type === 'fund' ? 'Edit fund mandate' : `${recordId ? 'Edit' : 'New'} ${({project:'portfolio company',internal:'workstream',deal:'opportunity',investor:'investor',task:'action',decision:'decision'})[type]}`;
  const f = (name,label,t='text',options=[],fallback='',full=false) => field(name,label,t,options,record[name] ?? fallback,full);
  let fields = '';
  if (['project','internal'].includes(type)) fields = f('name',type === 'internal' ? 'Workstream' : 'Company name') + f('kind','Record type','select',['Investment','Internal'],type === 'internal' ? 'Internal' : 'Investment') + f('stage','Company stage','select',['Idea','Validation','Build','Launch','Scale','Hold / Exit']) + f('health','Health','select',['TBD','On track','At risk','Blocked','Paused']) + f('owner','Owner','text',[],'TBD') + f('due','Milestone date (optional)','date') + f('milestone','Current milestone','textarea',[],'',true) + f('nextAction','Next action','textarea',[],'',true);
  if (type === 'task') fields = f('title','Action','textarea',[],'',true) + f('projectId','Workstream / company','select',[{value:'',label:'Fund'},...state.projects.map(p => ({value:p.id,label:p.name}))]) + f('owner','Owner','text',[],'TBD') + f('priority','Priority','select',['P0','P1','P2'],'P1') + f('status','Status','select',['Next','In progress','Backlog','Done']) + f('due','Due date (optional)','date');
  if (['deal','investor'].includes(type)) fields = f('name',type === 'investor' ? 'Investor / organization' : 'Company / opportunity') + f('contact','Contact / owner','text',[],'TBD') + f('type','Relationship type','select',['Potential investment','Potential investor','Strategic partner','Studio client'],type === 'investor' ? 'Potential investor' : 'Potential investment') + f('stage','Stage','select',type === 'investor' ? investorStages : investmentStages) + f('value','Amount / currency (or TBD)','text',[],'TBD') + f('nextDate','Next-action date (optional)','date') + f('nextAction','Next action','textarea',[],'',true);
  if (type === 'fund') fields = Object.entries(mandate).map(([key,label]) => field(key,label,'text',[],state.fund[key])).join('');
  if (type === 'decision') fields = f('decision','Decision','textarea',[],'',true) + f('why','Reason / evidence','textarea',[],'',true) + f('date','Decision date','date',[],today());
  document.querySelector('#formFields').innerHTML = `<div class="form-grid">${fields}</div>`;
  dialog.showModal();
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const before = structuredClone(state), type = form.dataset.type, recordId = form.dataset.id;
  const values = Object.fromEntries([...new FormData(form)].map(([k,v]) => [k,String(v).trim()]));
  const button = document.querySelector('#saveRecord'); button.disabled = true;
  if (type === 'fund') state.fund = values;
  else {
    const list = ['project','internal'].includes(type) ? state.projects : type === 'task' ? state.tasks : type === 'decision' ? state.decisions : state.pipeline;
    const index = list.findIndex(r => r.id === recordId);
    if (index >= 0) list[index] = {...list[index],...values}; else list.push({id:id(type),...values});
  }
  try { await save(); dialog.close(); form.reset(); render(); }
  catch (error) { state = before; toast(error.message); }
  finally { button.disabled = false; }
});
window.addEventListener('hashchange', () => { view = location.hash.slice(1); search = ''; if (state) render(); });
document.addEventListener('input', event => { if (event.target.id === 'searchRecords') { search = event.target.value; document.querySelector('#dealRows').innerHTML = dealRows(view === 'investors' ? investorDeals() : investmentDeals()); } });
document.addEventListener('click', async event => {
  const add = event.target.closest('[data-new]'); if (add) openForm(add.dataset.new);
  const edit = event.target.closest('[data-edit]'); if (edit) openForm(edit.dataset.edit,edit.dataset.id);
  const check = event.target.closest('[data-task]');
  if (check && !check.disabled) { check.disabled = true; const task = state.tasks.find(t => t.id === check.dataset.task); const previous = task.status; task.status = previous === 'Done' ? 'Next' : 'Done'; try { await save('Action updated'); render(); } catch (e) { task.status = previous; check.disabled = false; toast(e.message); } }
  const copy = event.target.closest('[data-copy]'); if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copy); toast('Invocation copied'); } catch { toast(`Copy this invocation: ${copy.dataset.copy}`); } }
});
document.querySelector('#newButton').addEventListener('click',() => { if (state) openForm(); });
document.querySelectorAll('[data-close-dialog]').forEach(b => b.addEventListener('click',() => dialog.close()));
document.querySelector('#exportButton').addEventListener('click',() => {
  if (!state) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
  const anchor = Object.assign(document.createElement('a'),{href:url,download:`ro-fun-${new Date().toISOString().slice(0,10)}.json`}); anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
load().catch(error => { app.innerHTML = `<div class="empty"><h2>Records unavailable</h2><p>${escapeHtml(error.message)}</p><button class="button" onclick="location.reload()">Try again</button></div>`; });
