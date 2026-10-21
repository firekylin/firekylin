'use strict';

function positiveInteger(value, defaultValue, max) {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new TypeError('Invalid positive integer');
  return value;
}
function input(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Invalid tool input');
  return value;
}
function summary(post) {
  return {id: post.id, title: post.title, pathname: post.pathname, summary: post.summary,
    create_time: post.create_time, update_time: post.update_time};
}
module.exports = {positiveInteger, input, summary};
