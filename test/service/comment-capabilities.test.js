'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = {};
const capabilities = require('../../src/service/comment-capabilities');

test('captcha fails closed and validates provider response', async() => {
  const original = global.fetch;
  try {
    const captcha = capabilities({captchaProvider: 'turnstile'}, {}, {TURNSTILE_KEY: 'secret'}).captcha;
    assert.equal(await captcha.verify('', {}), false);
    global.fetch = async() => { throw new Error('offline') };
    assert.equal(await captcha.verify('token', {}), false);
    global.fetch = async(_url, request) => {
      assert.equal(request.body.get('secret'), 'secret');
      return {ok: true, json: async() => ({success: true})};
    };
    assert.equal(await captcha.verify('token', {}), true);
    assert.equal(await capabilities({captchaProvider: 'turnstile'}, {}, {}).captcha.verify('token', {}), false);
    const recaptcha = capabilities({captchaProvider: 'recaptcha'}, {}, {RECAPTCHA_SECRET: 'secret'}).captcha;
    assert.equal(await recaptcha.verify('token', {}), false);
  } finally { global.fetch = original }
});

test('notifications keep pending replies private and avoid self replies', async() => {
  const original = nodemailer.createTransport;
  const sent = [];
  nodemailer.createTransport = () => ({sendMail: async mail => sent.push(mail)});
  try {
    const service = capabilities({mailNotify: true}, {siteUrl: 'https://example.com'}, {
      SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'sender@example.com', AUTHOR_EMAIL: 'owner@example.com'
    }, nodemailer).notification;
    const comment = {url: '/post/test', mail: 'a@example.com', status: 'waiting'};
    await service.send(comment, {mail: 'b@example.com'});
    assert.deepEqual(sent.map(mail => mail.to), ['owner@example.com']);
    sent.length = 0;
    await service.send({...comment, status: 'approved'}, {mail: 'b@example.com'}, true);
    assert.deepEqual(sent.map(mail => mail.to), ['b@example.com']);
    sent.length = 0;
    await service.send({...comment, status: 'approved'}, {mail: 'a@example.com'}, true);
    assert.equal(sent.length, 0);
  } finally { nodemailer.createTransport = original }
});
