const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost']);

exports.isLocalReferrer = referrer => {
  try {
    return LOCAL_HOSTNAMES.has(new URL(referrer).hostname);
  } catch (e) {
    return false;
  }
};

function hostname(host) {
  return host.replace(/:\d+$/, '');
}

/**
 * 判断 referrer 的 host 是否属于站点 host。
 *
 * 允许完全相等，或通过 '.' 边界构成的主域/子域关系（例如
 * `www.example.com` 与 `example.com`）。这里必须按 '.' 边界比较：
 * 之前的后缀比较会让 `evil-example.com` 通过 `example.com` 的校验。
 */
exports.sameSiteHost = (referrerHost, siteHost) => {
  if (!referrerHost || !siteHost) return false;
  if (referrerHost === siteHost) return true;
  const referrerName = hostname(referrerHost);
  const siteName = hostname(siteHost);
  if (referrerName === siteName) return true;
  return referrerName.endsWith('.' + siteName) || siteName.endsWith('.' + referrerName);
};
