'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {parse}=require('../../src/service/comment-user-agent');
test('identifies comment browser and operating system with correct precedence',()=>{
 for(const [ua,browser,os,version] of [
  ['Windows NT 10.0 Chrome/120.0 Safari/537.36','Chrome ','Windows','120'],
  ['Windows NT 10.0 Chrome/120.0 Edg/121.4','Edge ','Windows','121'],
  ['Linux Android 13 Chrome/119.0','Chrome ','Android','119'],
  ['iPhone OS 17 Version/17.1 Safari/605.1','Safari ','iOS','17'],
  ['Mac OS X Firefox/118.0','Firefox ','macOS','118'],
  ['Linux Chrome/120.0 OPR/106.0','Opera ','Linux','106']
 ]) {const parsed=parse(ua);assert.equal(parsed.browser.name,browser);assert.equal(parsed.browser.version,version);assert.equal(parsed.os.name,os)}
 assert.deepEqual(parse('unknown'),{browser:{name:'',version:''},os:{name:''}});
});
