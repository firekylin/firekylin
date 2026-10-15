'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {themeArchive} = require('../../bin/marketplace-change');

test('deployment receiver verifies theme content before returning it', async() => {
  const archive = Buffer.from('archive');
  const change = {download: 'https://example.com/theme.zip',
    integrity: `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`};
  const fetcher = async() => ({ok: true, status: 200, headers: {get: () => String(archive.length)},
    arrayBuffer: async() => archive});
  assert.deepEqual(await themeArchive(change, fetcher), archive);
  await assert.rejects(themeArchive({...change, integrity: change.integrity.slice(0, -1) + 'A'}, fetcher),
    /INTEGRITY_MISMATCH/);
});
