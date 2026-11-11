const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function controller(mailer) {
  const sandbox = {
    module: {exports: {}},
    require: name => name === 'nodemailer' ? mailer : class {},
    think: {uuid: () => 'generated', logger: {warn() {}}},
    firekylin: {USER_ADMIN: 1},
    process: {env: {}}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/controller/admin/api/user.js'), 'utf8'), sandbox);
  const instance = new sandbox.module.exports();
  instance.id = '1';
  instance.userInfo = {type: 1};
  return instance;
}

test('manual key generation waits for persistence without constructing a mail transport', async () => {
  let saved = false;
  const instance = controller({createTransport() { throw new Error('Unexpected mail') }});
  instance.modelInstance = {
    async generateKey() {
      await new Promise(resolve => setImmediate(resolve));
      saved = true;
    }
  };
  instance.getAction = () => {
    assert.equal(saved, true);
    return 'success';
  };
  assert.equal(await instance.generateKey(), 'success');
});

test('approval uses configured SMTP and tolerates delivery failure after saving', async () => {
  let closed = false;
  const instance = controller({
    createTransport(config) {
      assert.equal(config.host, 'smtp.example.com');
      return {
        async sendMail(message) {
          assert.equal(message.from, 'admin@example.com');
          assert.equal(message.text.includes('generated'), false);
          throw new Error('SMTP unavailable');
        },
        close() { closed = true }
      };
    }
  });
  instance.modelInstance = {
    async generateKey() {},
    where() { return this },
    async find() { return {email: 'user@example.com'} }
  };
  instance.model = () => ({
    async getOptions() {
      return {site_url: 'https://example.com', comment: {smtpHost: 'smtp.example.com', smtpFrom: 'admin@example.com'}};
    }
  });
  instance.getAction = () => 'success';
  assert.equal(await instance.generateKey(undefined, 1), 'success');
  assert.equal(closed, true);
});
