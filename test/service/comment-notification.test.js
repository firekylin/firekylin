'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
global.think = {Service: class {}, logger: {error() {}}};
const {notificationServices} = require('../../src/service/comment');
const Moderation = require('../../src/service/comment-moderation');

test('notifications protect pending replies and avoid self replies', async() => {
  const sent = [];
  let transportOptions;
  const mailer = {createTransport: options => {transportOptions = options; return {sendMail: async mail => sent.push(mail)};}};
  const options = {site_url: 'https://example.com', title: 'Blog'};
  const config = {mailNotify: true, smtpHost: 'smtp.example.com', smtpFrom: 'sender@example.com', authorEmail: 'owner@example.com', smtpPort: 587, smtpSecure: false};
  const service = notificationServices(config, options, {}, mailer).notification;
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.port, 587);
  const comment = {url: '/post/test', mail: 'a@example.com', status: 'waiting', rawComment: 'hello'};
  await service.send(comment, {mail: 'b@example.com'});
  assert.deepEqual(sent.map(mail => mail.to), ['owner@example.com']);
  assert.ok(sent[0].text.includes('https://example.com/post/test'));
  sent.length = 0;
  await service.send({...comment, status: 'approved'}, {mail: 'b@example.com'}, true);
  assert.deepEqual(sent.map(mail => mail.to), ['b@example.com']);
  sent.length = 0;
  await service.send({...comment, status: 'approved'}, {mail: 'a@example.com'}, true);
  assert.equal(sent.length, 0);
  assert.equal(notificationServices({}, options, {}, mailer).notification, undefined);
});
test('mail failures do not reject saved comments', async() => {
  const service = notificationServices({mailNotify: true, smtpHost: 'smtp.example.com', smtpFrom: 'sender@example.com', authorEmail: 'owner@example.com'}, {site_url: 'https://example.com'}, {}, {
    createTransport: () => ({sendMail: async() => {throw new Error('delivery failed');}})
  }).notification;
  await assert.doesNotReject(service.send({url: '/test', status: 'approved'}));
});
test('moderation notifies only when a waiting comment is approved', async() => {
  let status = 'waiting';
  const notified = [];
  const model = {where() {return this;}, setRelation() {return this;}, find: async() => ({id: 1, post_id: 2, pid: '3', status}), update: async data => {status = data.status;}};
  const service = new Moderation({getModel: () => model, now: () => 'now', syncCount: async() => {}, notifyApprovedReply: async row => notified.push(row)});
  await service.moderate({id: 1, operation: 'approved'}, {type: 1});
  await service.moderate({id: 1, operation: 'approved'}, {type: 1});
  assert.equal(notified.length, 1);
});
