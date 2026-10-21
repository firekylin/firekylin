'use strict';

function object(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Object input required');
  return input;
}
function id(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Invalid ID');
  return value;
}
function keys(input, allowed) {
  for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new TypeError('Unsupported property: ' + key);
}
function actor(context) {
  if (!context || !context.principal) throw new Error('Authenticated principal required');
  return context.principal;
}
function objectSchema(properties, required = []) {
  return {type: 'object', additionalProperties: false, properties, required};
}
module.exports = {object, id, keys, actor, objectSchema};
