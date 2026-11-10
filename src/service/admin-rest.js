// Keep authorization and REST controller dispatch on the same resource ID,
// including query precedence and IDs encoded in the last path segment.
function getRestId(id, requestPath, resource) {
  if (id && (typeof id === 'string' || typeof id === 'number')) return id;
  const last = decodeURIComponent(requestPath.split('/').pop());
  return last !== resource && /^(\d+,?)*$/.test(last) ? last : '';
}

module.exports = {getRestId};
