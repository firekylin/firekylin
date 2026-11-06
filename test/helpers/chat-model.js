'use strict';
const path = require('node:path');
const Model = require('think-model/lib/model');
const previous = global.think;
let models;
try {
  global.think = {...previous, Model};
  models = Object.fromEntries(['session', 'message', 'action', 'run'].map(name =>
    [`chat/${name}`, require(`../../src/model/chat/${name}`)]));
} finally { global.think = previous }

// Mirror ThinkJS's model registry and basename resolution, including nested model().
module.exports = config => name => {
  const Class = models[name] || Model;
  const model = new Class(path.basename(name), config);
  model.models = models;
  return model;
};
