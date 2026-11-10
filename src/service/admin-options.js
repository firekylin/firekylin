const captcha = require('./captcha');
const {CREDENTIAL_PREFIX} = require('../ai/store');

// Only these settings are needed by the editor, profile and login UI. Do not
// expose new plugin/service options to non-administrators by default.
const PUBLIC_KEYS = [
  'title', 'logo_url', 'favicon_url', 'site_url', 'theme', 'defaultCategory',
  'password_salt', 'ldap_on', 'ldap_whiteList', 'ldap_user_page'
];

module.exports = function adminOptions(options, isAdministrator = false) {
  const result = isAdministrator ? {...options} : Object.fromEntries(PUBLIC_KEYS
    .filter(key => Object.hasOwn(options, key))
    .map(key => [key, options[key]]));

  delete result.jwt_secret;
  delete result.comment_jwt_secret;
  delete result.comment_schema_version;
  delete result.ai_credentials;
  delete result.push_sites;
  for (const key of Object.keys(result)) {
    if (key.startsWith(CREDENTIAL_PREFIX)) delete result[key];
  }
  if (isAdministrator) {
    result.comment = {...options.comment};
    delete result.comment.smtpPass;
  }
  result.captcha = isAdministrator ? captcha.settings(options) : captcha.publicSettings(captcha.settings(options));
  result.two_factor_auth = Boolean(options.two_factor_auth);
  // password_salt is part of the existing client-side password hashing protocol,
  // including the anonymous login page; it is not an authentication credential.
  return result;
};
