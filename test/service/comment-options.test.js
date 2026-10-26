'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
let Controller;
try {
  Module._load = function(id, ...args) {
    if (id === 'speakeasy' || id === '../../../service/push-to-firekylin') return {};
    if (id === './base') return class {};
    return originalLoad.call(this, id, ...args);
  };
  Controller = require('../../src/controller/admin/api/options');
} finally {Module._load = originalLoad;}
global.think = {isEmpty: value => !Object.keys(value).length};

test('saving one comment settings tab retains other sections and stored password', async() => {
  const saved = {audit: true, pageSize: 20, smtpHost: 'smtp.example.com', smtpPass: 'stored-password', mailNotify: true};
  let updated;
  const controller = new Controller();
  controller.get = () => undefined;
  controller.post = () => ({comment: JSON.stringify({pageSize: 30, audit: false})});
  controller.model = () => ({getOptions: async() => ({comment: saved}), updateOptions: async value => {updated = value;}});
  controller.success = () => {};
  controller.fail = reason => {throw new Error(reason);};
  await controller.putAction();
  const comment = JSON.parse(updated.comment);
  assert.equal(comment.pageSize, 30);
  assert.equal(comment.audit, false);
  assert.equal(comment.smtpHost, saved.smtpHost);
  assert.equal(comment.smtpPass, saved.smtpPass);
  assert.equal(comment.mailNotify, true);
});
