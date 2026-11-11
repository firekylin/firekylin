const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const {Eta} = createRequire(require.resolve('think-view-eta'))('eta');

test('admin boot JSON escapes script end tags and round-trips the original title', async () => {
  const title = '</script><script>alert(1)</script>';
  const output = await new Eta({varName: 'firekylin'}).renderStringAsync(
    fs.readFileSync(path.join(__dirname, '../view/admin.eta'), 'utf8'), {
      options: {title, locale: 'en-US'},
      userInfo: {}, publicCaptcha: {}, adminAssets: {styles: [], script: '/admin.js'},
      think: {config: () => false}
    });
  const boot = output.slice(output.indexOf('window.SysConfig'), output.indexOf('</script>'));
  assert.doesNotMatch(boot, /<script|<\/script/i);
  const data = /options:\s*(\{[\s\S]*?\}),\s*config:/.exec(boot);
  assert.ok(data);
  assert.equal(JSON.parse(data[1]).title, title);
});
