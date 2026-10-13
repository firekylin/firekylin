const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {getMcpConfig} = require('../../src/mcp/config');

test('legacy MCP config is loaded from ThinkJS; project config takes precedence', () => {
  const originalThink = global.think;
  const originalPath = process.env.FIREKYLIN_PROJECT_PATH;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firekylin-mcp-config-'));
  try {
    delete process.env.FIREKYLIN_PROJECT_PATH;
    global.think = {config: key => key === 'mcp' ? {enabled: false, tokens: [{userId: 7}]} : undefined};
    assert.equal(getMcpConfig().tokens[0].userId, 7);
    assert.equal(getMcpConfig().enabled, false);
    fs.writeFileSync(path.join(root, 'firekylin.config.js'), "module.exports = {database: {type: 'sqlite'}, mcp: {allowedOrigins: ['https://example.com']}};");
    process.env.FIREKYLIN_PROJECT_PATH = root;
    assert.deepEqual(getMcpConfig(), {allowedOrigins: ['https://example.com']});
  } finally {
    global.think = originalThink;
    if (originalPath === undefined) delete process.env.FIREKYLIN_PROJECT_PATH;
    else process.env.FIREKYLIN_PROJECT_PATH = originalPath;
    fs.rmSync(root, {recursive: true, force: true});
  }
});
