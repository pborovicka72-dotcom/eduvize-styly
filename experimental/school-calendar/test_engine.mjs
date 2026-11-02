import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const context={TextEncoder,Date};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('engine.js',import.meta.url),'utf8'),context);const engine=context.EduvizeCalendar,data=JSON.parse(fs.readFileSync(new URL('events.json',import.meta.url),'utf8'));
const school={school_type:'ZS',district:'Praha 1 až 5'};
assert.equal(engine.select(data,school).find(e=>e.title==='Jarní prázdniny').start,'2027-02-22');
assert.equal(engine.select(data,{...school,district:'Praha 6 až 10'}).find(e=>e.title==='Jarní prázdniny').start,'2027-03-01');
assert.equal(engine.select(data,{school_type:'ZS'}).filter(e=>e.id.startsWith('spring')).length,0);
assert.equal(engine.select(data,{school_type:'MS',district:school.district}).length,0);
assert.equal(engine.select(data,school,'maturita').length,0);
assert.ok(engine.select(data,{school_type:'SS'},'maturita').length>0);
const spring=engine.select(data,school).find(e=>e.id.startsWith('spring'));const ics=engine.ics([spring]);assert.ok(ics.includes('DTEND;VALUE=DATE:20270301'));assert.ok(ics.includes('DTSTART;VALUE=DATE:20270222'));
for(const e of data.events){assert.ok(e.start<=e.end);assert.ok(e.source.startsWith('https://'));assert.equal(e.status,'confirmed');assert.ok(e.verifiedAt);}
assert.equal(data.events.filter(e=>e.category==='holiday').length,0);
console.log('PASS: district selection, unknown district, school types, maturity filter, inclusive ranges to exclusive ICS, provenance, no duplicate holidays');
