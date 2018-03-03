/**
 * ldap config
 */
module.exports = {
  on: false, //switch, maybe, default false
  url: 'ldap://xxx.xxx.xxx.xxx:xxxx', //ldap url, required
  connectTimeout: 20000, // ldap connect timeout, maybe, default 20000ms
  baseDn: 'dc=xxx,dc=xxxx,dc=com', //ldap baseDn, required
  ldapWhiteList: ['admin'], //accounts in this array will not be varified with LDAP when LDAP is opened, and these accounts can be edited by itself instead of LDAP administrator, required
  ldapUserPage: 'https://xxx.com/xxx/xxx', //url for ldap user to change userinfo, maybe, default ''
  log: true //logconf, maybe, default true
};
