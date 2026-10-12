const assert = require('node:assert/strict');
const test = require('node:test');
const Ldap = require('../../src/service/ldap');

const config = {
  ldap_url: 'ldap://ldap.example.com:389',
  ldap_baseDn: 'dc=ldap,dc=example,dc=com',
  ldap_connect_timeout: 1500
};

test('LDAP client maps the configured connection timeout to ldapts', () => {
  const service = new Ldap(config);
  const client = service.createClient();

  assert.equal(client.clientOptions.url, config.ldap_url);
  assert.equal(client.clientOptions.connectTimeout, 1500);
  assert.equal(client.clientOptions.timeout, 1500);
});

test('LDAP search escapes filters, limits results and always unbinds', async() => {
  const service = new Ldap(config);
  let search;
  let unbound = false;
  service.createClient = () => ({
    async search(baseDn, options) {
      search = {baseDn, options};
      return {searchEntries: [{dn: 'cn=user,dc=example', mail: 'user@example.com'}]};
    },
    async unbind() { unbound = true }
  });

  const user = await service.getUserInfo('user*)(cn=*)');

  assert.equal(user.mail, 'user@example.com');
  assert.equal(search.baseDn, config.ldap_baseDn);
  assert.equal(search.options.filter, String.raw`(cn=user\2a\29\28cn=\2a\29)`);
  assert.equal(search.options.sizeLimit, 1);
  assert.equal(unbound, true);
});

test('LDAP bind escapes the username DN and reports authentication failures', async() => {
  const service = new Ldap(config);
  let boundDn;
  let unbound = false;
  service.createClient = () => ({
    async bind(dn) {
      boundDn = dn;
      throw new Error('invalid credentials');
    },
    async unbind() { unbound = true }
  });

  assert.equal(await service.validate('user,admin', 'wrong'), false);
  assert.equal(boundDn, 'cn=user\\,admin,dc=ldap,dc=example,dc=com');
  assert.equal(unbound, true);
});

test('LDAP bind preserves the timeout result expected by the login controller', async() => {
  const service = new Ldap(config);
  service.createClient = () => ({
    async bind() { throw new Error('Connection timeout') },
    async unbind() {}
  });

  assert.equal(await service.validate('user', 'password'), 'timeout');
});
