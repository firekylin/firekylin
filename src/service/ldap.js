const {Client, DN, Filter} = require('ldapts');

module.exports = class Ldap {
  constructor(conf = {}) {
    this.config = {
      ...conf,
      url: conf.ldap_url,
      ldap_connect_timeout: Number(conf.ldap_connect_timeout) || 20000
    };

    if (!this.config.url || !this.config.ldap_baseDn) {
      throw new Error('ldap config missing!');
    }
  }

  createClient() {
    const {url, ldap_connect_timeout: timeout} = this.config;
    return new Client({url, connectTimeout: timeout, timeout});
  }

  async getUserInfo(username) {
    const {url, ldap_baseDn} = this.config;
    const client = this.createClient();
    this.log(`connecting ${url}`, 'LDAP');
    this.log(`search: ${username}`, 'LDAP');

    try {
      const {searchEntries} = await client.search(ldap_baseDn, {
        filter: `(cn=${Filter.escape(username)})`,
        scope: 'sub',
        sizeLimit: 1,
        timeLimit: 500
      });
      const user = searchEntries[0] || {};
      this.log(`search result: ${JSON.stringify(user)}`, 'LDAP');
      if (!user.dn) {
        this.log('result: No such user', 'LDAP');
      }
      return user;
    } catch (error) {
      this.error(`error: ${error.message}`, 'LDAP');
      throw error;
    } finally {
      await this.unbind(client);
    }
  }

  async validate(username, password) {
    const {url, ldap_baseDn} = this.config;
    const client = this.createClient();
    const ldapCn = `${new DN().addPairRDN('cn', username)},${ldap_baseDn}`;
    this.log(`connecting ${url}`, 'LDAP');
    this.log(`ldapCn: ${ldapCn}`, 'LDAP');

    try {
      await client.bind(ldapCn, password);
      this.log('认证成功！', 'LDAP');
      return true;
    } catch (error) {
      const timedOut = /timeout/i.test(error.message);
      this.log(timedOut ? 'connect timeout' : `认证失败, errmsg: ${JSON.stringify(error)}`, 'LDAP');
      return timedOut ? 'timeout' : false;
    } finally {
      await this.unbind(client);
    }
  }

  async unbind(client) {
    try {
      await client.unbind();
      this.log('client disconnected', 'LDAP');
    } catch (error) {
      this.error(`disconnect error: ${error.message}`, 'LDAP');
    }
  }

  log(...args) {
    if (this.config.ldap_log !== '1') {
      return true;
    }
    return think.logger.info(...args);
  }

  error(...args) {
    if (this.config.ldap_log !== '1') {
      return true;
    }
    return think.logger.error(...args);
  }
};
