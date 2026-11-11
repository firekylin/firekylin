const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost']);

exports.isLocalReferrer = referrer => {
  try {
    return LOCAL_HOSTNAMES.has(new URL(referrer).hostname);
  } catch (e) {
    return false;
  }
};
