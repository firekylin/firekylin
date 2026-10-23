'use strict';
// Deliberately killed by the parent after the durable start record has been written.
const Model = require('think-model/lib/model');
const handle = require('think-model-sqlite');
const {migrate} = require('../../src/service/ai-audit-schema');
const {Audit} = require('../../src/service/ai-audit');
const AIClient = require('../../src/ai/client');
const Registry = require('../../src/ai/registry');
async function main() {
  const config = {handle, path: process.argv[2], database: 'audit-crash', prefix: 'test_', logConnect: false, debounce: false};
  const model = () => new Model('ai_audit_log', config);
  await migrate({model: model(), config: {type: 'sqlite', sqlite: config}});
  const providers = new Registry();
  providers.register({id: 'example', models: [{id: 'small'}], generate: () => {
    process.send('started');
    return new Promise(() => {});
  }});
  const audit = new Audit({model, options: () => ({getOptions: async() => ({})})});
  const client = new AIClient({providers, audit, timeout: 60000,
    preferences: {get: async() => ({provider: 'example', model: 'small'})}});
  await client.generate({messages: [{role: 'user', content: 'do not persist'}]});
}
main().catch(() => {process.exitCode = 1});
