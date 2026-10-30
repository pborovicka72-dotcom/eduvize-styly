import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../nsp-geometry.js',import.meta.url),'utf8'),scope);vm.runInNewContext(fs.readFileSync(new URL('../segment-profile.js',import.meta.url),'utf8'),scope);
const api=scope.window.EduvizeSegmentProfile;let count=0;
for(const styles of Object.values(scope.window.EduvizeNSPLayouts.layouts))for(const rectangles of Object.values(styles))for(const [w,h] of rectangles){const g=api.resolve(w,h),p=api.holidays(g,{days:6});assert.equal(p.showToday,true);assert.ok(p.upcomingDays>=0&&p.upcomingDays<=6);assert.ok(p.columns>=1);assert.ok(Object.values(p.px).every(x=>Number.isFinite(x)&&x>0));assert.equal(api.holidays(g,{days:0}).upcomingDays,0);assert.ok(api.holidays(g,{days:2}).upcomingDays<=2);count++;}
assert.equal(api.resolve(3840,488).kind,'panoramic');assert.equal(api.holidays(api.resolve(3840,488),{days:6}).upcomingDays,3);
assert.equal(api.resolve(872,488).kind,'compact');assert.equal(api.holidays(api.resolve(872,488),{days:6}).upcomingDays,0);
assert.equal(api.resolve(960,2160).kind,'portrait');assert.equal(api.resolve(2160,2160).kind,'square');
assert.equal(api.holidays(api.resolve(3840,2160),{days:6}).px.name/api.holidays(api.resolve(1920,1080),{days:6}).px.name,2);
assert.throws(()=>api.resolve(0,100));console.log(count+' segment geometries: content priorities, configured limits and proportional typography passed.');

for(const [w,h] of [[3840,2160],[2160,3840],[872,488],[2968,488]]){const g=api.resolve(w,h),header=api.header(g),p=api.holidays(g,{days:6});assert.equal(header.height,Math.min(w,h)*.16);assert.equal(header.icon/header.height,.6);assert.equal(p.px.head,header.height);assert.equal(p.px.icon,header.icon);assert.equal(p.px['date-size'],header.title);}
assert.equal(api.holidays(api.resolve(3840,2160),{days:6}).columns,3);
assert.equal(api.holidays(api.resolve(872,1672),{days:6}).upcomingDays,4);
console.log('Common header dimensions and narrow segment readability priorities passed.');
