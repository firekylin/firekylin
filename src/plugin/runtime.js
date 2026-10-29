'use strict';

function pluginEvents() {
  return global.firekylin && global.firekylin.plugins && global.firekylin.plugins.events;
}

async function emit(event, context) {
  const events = pluginEvents();
  return events ? events.emit(event, context) : context;
}

async function filter(event, value, context) {
  const events = pluginEvents();
  return events ? events.filter(event, value, context) : value;
}

async function filterStrict(event, value, context) {
  const events = pluginEvents();
  return events ? events.filter(event, value, context, {failFast: true}) : value;
}

module.exports = {emit, filter, filterStrict};
