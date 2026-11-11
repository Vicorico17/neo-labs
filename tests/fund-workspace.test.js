const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { Readable } = require('node:stream');
const initial = JSON.parse(fs.readFileSync('data/state.json','utf8'));
const script = fs.readFileSync('public/app.js','utf8');
async function workspace({local, putFails = false, storageFails = false} = {}) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector,{innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},showModal(){},close(){},reset(){}});
    return elements.get(selector);
  };
  const saved = [];
  const context = vm.createContext({
    document:{querySelector:element,querySelectorAll:() => [],addEventListener(){}},
    location:{hash:''},window:{addEventListener(){}},
    localStorage:{getItem:() => local,setItem:(key,value) => {if(storageFails) throw Error('Quota'); saved.push(JSON.parse(value));}},
    fetch:async (url,options) => options ? {ok:!putFails,json:async () => ({updatedAt:'2026-11-11T12:00:00Z'})} : {ok:true,json:async () => structuredClone(initial)},
    crypto:require('node:crypto').webcrypto,structuredClone,console,URL,Blob,
    setTimeout:() => 0,clearTimeout(){},navigator:{}
  });
  vm.runInContext(script,context);
  await new Promise(resolve => setImmediate(resolve));
  return {run:code => vm.runInContext(code,context),elements,saved};
}
test('all seven routes render without inventing holdings',async () => {
  const w = await workspace();
  for (const route of ['overview','pipeline','portfolio','investors','thesis','tasks','agents']) {
    w.run(`view='${route}'; render()`);
    assert.ok(w.elements.get('#app').innerHTML.length > 100,route);
  }
  assert.equal(w.run('holdings().length'),0);
  assert.equal(w.run('prettyDate("TBD")'),'TBD');
});
test('investment and investor records stay separate',async () => {
  const w = await workspace();
  w.run(`state.pipeline.push({id:'a',type:'Potential investor',name:'LP',stage:'Indication'}, {id:'b',type:'Potential investment',name:'Company',stage:'Diligence'});`);
  assert.equal(w.run('investmentDeals()[0].name'),'Company');
  assert.equal(w.run('investorDeals()[0].name'),'LP');
});
test('existing local records migrate identity without losing data',async () => {
  const legacy = structuredClone(initial); legacy.company.name='Neo Labs'; delete legacy.fund;
  legacy.projects.push({id:'existing',name:'Existing investment',kind:'Investment'});
  const w = await workspace({local:JSON.stringify(legacy)});
  assert.equal(w.run('state.company.name'),'ro.fun');
  assert.equal(w.run('holdings().length'),1);
  assert.equal(w.run('state.fund.targetSize'),'TBD');
  assert.equal(w.run('storageMode'),'browser');
});
test('corrupt local records fall back to file',async () => {
  const w = await workspace({local:'{invalid'});
  assert.equal(w.run('state.company.name'),'ro.fun');
  assert.equal(w.run('storageMode'),'file');
});
test('failed file persistence saves to browser with explicit storage label',async () => {
  const w = await workspace({putFails:true});
  await w.run('save()');
  assert.equal(w.saved.length,1);
  assert.equal(w.elements.get('#storageLabel').textContent,'Saved in this browser');
});
test('failed browser persistence reports failure instead of success',async () => {
  const w = await workspace({putFails:true,storageFails:true});
  await assert.rejects(w.run('save()'),/Could not save/);
});
test('record values and select labels are escaped',async () => {
  const w = await workspace();
  const html = w.run(`field('projectId','Project','select',[{value:'bad"',label:'<img src=x onerror=alert(1)>'}])`);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('bad&quot;'));
});
test('editing a record retains its values and stable project IDs',async () => {
  const w = await workspace();
  w.run(`openForm('task','task-portfolio-intake')`);
  const html = w.elements.get('#formFields').innerHTML;
  assert.ok(html.includes('value="project-neo-os" selected'));
  assert.ok(html.includes(initial.tasks[0].title));
});
test('server serves the current state and rejects malformed state',async () => {
  const handler = require('../server');
  async function request(method,body) {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    req.method=method;req.url='/api/state';req.headers={host:'localhost'};
    const result={};
    await handler(req,{writeHead(status){result.status=status},end(body){result.body=body}});
    return result;
  }
  const get = await request('GET');
  assert.equal(get.status,200);assert.equal(JSON.parse(get.body).company.name,'ro.fun');
  const invalid = await request('PUT',{company:{}});
  assert.equal(invalid.status,400);
});
