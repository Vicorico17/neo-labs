const app = document.querySelector('#app');
const dialog = document.querySelector('#recordDialog');
const form = document.querySelector('#recordForm');
let state;
let view = 'overview';
const LOCAL_STATE_KEY = 'neo-labs-os-state';

const views = {
  overview: ['Command center', 'Overview', 'project'],
  portfolio: ['Venture studio', 'Portfolio', 'project'],
  pipeline: ['Investment platform', 'Capital', 'deal'],
  tasks: ['Execution', 'Operating queue', 'task'],
  agents: ['Specialist roles', 'Agent desk', null]
};

const agents = [
  ['01', 'Researcher', '$neo-researcher', 'Turns a defined decision into verified findings, primary evidence, and explicit unknowns.', 'researcher/'],
  ['02', 'Writer', '$neo-writer', 'Creates external content in a direct founder voice without filler, repetition, or corporate theatre.', 'writer/'],
  ['03', 'Closer', '$neo-closer', 'Moves qualified opportunities through proposals, objections, and focused follow-up.', 'closer/'],
  ['04', 'Operator', '$neo-operator', 'Keeps the portfolio honest: owners, milestones, constraints, decisions, and next actions.', 'operator/']
];

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const prettyDate = value => value ? new Intl.DateTimeFormat('en', { month:'short', day:'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';
const projectName = projectId => state.projects.find(item => item.id === projectId)?.name || 'Company';
const pill = value => `<span class="pill ${slug(value)}">${escapeHtml(value)}</span>`;

async function load() {
  const local = localStorage.getItem(LOCAL_STATE_KEY);
  if (local) {
    state = JSON.parse(local);
    render();
    return;
  }
  const response = await fetch('/api/state');
  state = await response.json();
  render();
}

async function save(message = 'Saved') {
  try {
    const response = await fetch('/api/state', { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(state) });
    if (!response.ok) throw new Error('File persistence unavailable');
    const result = await response.json();
    state.updatedAt = result.updatedAt;
  } catch (error) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
    message = `${message} in this browser`;
  }
  updateSaved();
  toast(message);
}

function updateSaved() {
  const date = new Date(state.updatedAt);
  document.querySelector('#lastSaved').textContent = `Saved ${date.toLocaleDateString([], { month:'short', day:'numeric' })} · ${date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`;
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 1800);
}

function projectRows(limit) {
  const list = limit ? state.projects.slice(0, limit) : state.projects;
  if (!list.length) return '<div class="empty">No projects yet. Add the first one.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Project</th><th>Stage</th><th>Health</th><th>Owner</th><th>Next milestone</th><th>Due</th></tr></thead><tbody>${list.map(project => `<tr><td class="name-cell"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.kind)}</small></td><td>${escapeHtml(project.stage)}</td><td>${pill(project.health)}</td><td>${escapeHtml(project.owner)}</td><td>${escapeHtml(project.milestone)}</td><td>${prettyDate(project.due)}</td></tr>`).join('')}</tbody></table></div>`;
}

function taskQueue(limit, all = false) {
  let tasks = [...state.tasks].sort((a,b) => ({P0:0,P1:1,P2:2}[a.priority] ?? 3) - ({P0:0,P1:1,P2:2}[b.priority] ?? 3));
  if (!all) tasks = tasks.filter(task => task.status !== 'Done');
  if (limit) tasks = tasks.slice(0, limit);
  if (!tasks.length) return '<div class="empty">The queue is clear.</div>';
  return `<div class="queue">${tasks.map(task => `<div class="queue-item"><button class="check ${task.status === 'Done' ? 'done' : ''}" data-task="${task.id}" aria-label="Toggle ${escapeHtml(task.title)}"></button><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(projectName(task.projectId))} · ${escapeHtml(task.owner)} · ${prettyDate(task.due)}</small></div>${pill(task.priority)}</div>`).join('')}</div>`;
}

function overview() {
  const active = state.projects.filter(project => !['Paused','Hold / Exit'].includes(project.stage)).length;
  const atRisk = state.projects.filter(project => ['At risk','Blocked'].includes(project.health)).length;
  const openTasks = state.tasks.filter(task => task.status !== 'Done').length;
  return `<section class="content"><div class="brief"><div class="north-star"><span class="eyebrow">North star</span><h2>${escapeHtml(state.company.northStar)}</h2></div><div class="focus"><span class="eyebrow">Quarter focus</span><p>${escapeHtml(state.company.quarterFocus)}</p></div></div><div class="stats"><div class="stat"><small>Active projects</small><strong>${active}</strong></div><div class="stat"><small>At risk / blocked</small><strong>${atRisk}</strong></div><div class="stat"><small>Open actions</small><strong>${openTasks}</strong></div><div class="stat"><small>Capital pipeline</small><strong>${state.pipeline.length}</strong></div></div><div class="grid-2"><section class="panel"><div class="panel-head"><h2>Portfolio pulse</h2><button class="text-button" data-go="portfolio">View portfolio →</button></div>${projectRows(5)}</section><section class="panel"><div class="panel-head"><h2>Priority queue</h2><button class="text-button" data-go="tasks">View all →</button></div>${taskQueue(5)}</section></div></section>`;
}

function portfolio() { return `<section class="content"><section class="panel"><div class="panel-head"><h2>All projects</h2><span class="eyebrow">${state.projects.length} total</span></div>${projectRows()}</section></section>`; }

function pipeline() {
  const rows = state.pipeline.length ? `<div class="table-wrap"><table><thead><tr><th>Opportunity</th><th>Type</th><th>Stage</th><th>Range</th><th>Next action</th><th>Date</th></tr></thead><tbody>${state.pipeline.map(deal => `<tr><td class="name-cell"><strong>${escapeHtml(deal.name)}</strong><small>${escapeHtml(deal.contact)}</small></td><td>${escapeHtml(deal.type)}</td><td>${pill(deal.stage)}</td><td>${escapeHtml(deal.value)}</td><td>${escapeHtml(deal.nextAction)}</td><td>${prettyDate(deal.nextDate)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No capital or partnership opportunities recorded yet.</div>';
  return `<section class="content"><div class="capital-banner"><div><span class="eyebrow">Neo Labs Capital</span><h2>Separate the company from the capital.</h2><p>Track investor, investment, and strategic opportunities here. Outside capital should only enter a purpose-built, legally reviewed vehicle.</p></div></div><div class="warning">WORKING SYSTEM · NOT AN OFFERING DOCUMENT · LEGAL AND TAX REVIEW REQUIRED BEFORE FUNDRAISING</div><section class="panel" style="margin-top:16px"><div class="panel-head"><h2>Capital pipeline</h2><span class="eyebrow">${state.pipeline.length} opportunities</span></div>${rows}</section></section>`;
}

function tasks() { return `<section class="content"><section class="panel"><div class="panel-head"><h2>All operating actions</h2><span class="eyebrow">Click the square to change status</span></div>${taskQueue(null, true)}</section></section>`; }
function agentDesk() { return `<section class="content"><div class="agent-grid">${agents.map(agent => `<article class="agent-card"><span class="agent-number">${agent[0]} · ${agent[4]}</span><h2>${agent[1]}</h2><p>${agent[3]}</p><footer><code class="invoke">${agent[2]}</code><button class="copy" data-copy="${agent[2]}">Copy invocation</button></footer></article>`).join('')}</div></section>`; }

function render() {
  const [eyebrow,title,record] = views[view];
  document.querySelector('#viewEyebrow').textContent = eyebrow;
  document.querySelector('#viewTitle').textContent = title;
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const newButton = document.querySelector('#newButton');
  newButton.hidden = !record;
  newButton.textContent = record ? `+ New ${record}` : '';
  app.innerHTML = ({overview, portfolio, pipeline, tasks, agents:agentDesk}[view])();
  updateSaved();
}

function field(name, label, type = 'text', options = [], full = false) {
  let control;
  if (type === 'select') {
    control = `<select id="${name}" name="${name}" required>${options.map(option => `<option>${option}</option>`).join('')}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${name}" name="${name}" required></textarea>`;
  } else {
    control = `<input id="${name}" name="${name}" type="${type}" ${type !== 'date' ? 'required' : ''}>`;
  }
  return `<div class="field ${full ? 'full' : ''}"><label for="${name}">${label}</label>${control}</div>`;
}

function openForm() {
  const type = views[view][2];
  document.querySelector('#dialogTitle').textContent = `New ${type}`;
  form.dataset.type = type;
  if (type === 'project') document.querySelector('#formFields').innerHTML = `<div class="form-grid">${field('name','Project name')}${field('kind','Kind','select',['Internal','Studio client','Investment'])}${field('stage','Stage','select',['Idea','Validation','Build','Launch','Scale','Hold / Exit'])}${field('health','Health','select',['On track','At risk','Blocked','Paused'])}${field('owner','Owner')}${field('due','Milestone due','date')}${field('milestone','Current milestone','textarea',[],true)}${field('nextAction','Next action','textarea',[],true)}</div>`;
  if (type === 'task') document.querySelector('#formFields').innerHTML = `<div class="form-grid">${field('title','Action', 'textarea',[],true)}${field('projectId','Project','select',state.projects.map(project => project.name))}${field('owner','Owner')}${field('priority','Priority','select',['P0','P1','P2'])}${field('status','Status','select',['Next','In progress','Backlog','Done'])}${field('due','Due date','date')}</div>`;
  if (type === 'deal') document.querySelector('#formFields').innerHTML = `<div class="form-grid">${field('name','Opportunity')}${field('contact','Contact / owner')}${field('type','Type','select',['Potential investment','Potential investor','Strategic partner','Studio client'])}${field('stage','Stage','select',['New','Qualified','Diligence','Proposal','Committed','Won','Lost'])}${field('value','Value / check range')}${field('nextDate','Next-action date','date')}${field('nextAction','Next action','textarea',[],true)}</div>`;
  dialog.showModal();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const type = form.dataset.type;
  const values = Object.fromEntries(new FormData(form));
  if (type === 'project') state.projects.push({ id:id('project'), ...values });
  if (type === 'task') {
    const project = state.projects.find(item => item.name === values.projectId);
    state.tasks.push({ id:id('task'), ...values, projectId:project?.id || '' });
  }
  if (type === 'deal') state.pipeline.push({ id:id('deal'), ...values });
  await save(`${type[0].toUpperCase() + type.slice(1)} added`);
  dialog.close(); form.reset(); render();
});

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]');
  if (nav) { view = nav.dataset.view; render(); }
  const go = event.target.closest('[data-go]');
  if (go) { view = go.dataset.go; render(); }
  const checkbox = event.target.closest('[data-task]');
  if (checkbox) { const task = state.tasks.find(item => item.id === checkbox.dataset.task); task.status = task.status === 'Done' ? 'Next' : 'Done'; await save('Task updated'); render(); }
  const copy = event.target.closest('[data-copy]');
  if (copy) { await navigator.clipboard.writeText(copy.dataset.copy); toast('Invocation copied'); }
});

document.querySelector('#newButton').addEventListener('click', openForm);
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => dialog.close()));
document.querySelector('#exportButton').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}));
  const anchor = Object.assign(document.createElement('a'), { href:url, download:`neo-labs-os-${new Date().toISOString().slice(0,10)}.json` });
  anchor.click(); URL.revokeObjectURL(url);
});

load().catch(error => { app.innerHTML = `<section class="content"><div class="warning">Could not load the company data: ${escapeHtml(error.message)}</div></section>`; });
