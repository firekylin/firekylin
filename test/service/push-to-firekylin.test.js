const assert = require('node:assert/strict');
const test = require('node:test');
const PushToFirekylin = require('../../src/service/push-to-firekylin');

const originalFetch = global.fetch;
test.after(() => {
  global.fetch = originalFetch;
});

test('push client authorizes with signed query parameters', async() => {
  let request;
  global.fetch = async url => {
    request = new URL(url);
    return new Response(JSON.stringify({errno: 0}), {
      headers: {'content-type': 'application/json'}
    });
  };

  const client = new PushToFirekylin('https://blog.example.com/', 'app-key', 'secret');
  assert.deepEqual(await client.authorize(), {errno: 0});
  assert.equal(request.toString().startsWith('https://blog.example.com/admin/post_push?'), true);
  assert.equal(request.searchParams.get('app_key'), 'app-key');
  assert.match(request.searchParams.get('auth_key'), /^\$2[aby]\$/);
});

test('push client sends the legacy form protocol with a PHPass signature', async() => {
  let request;
  global.fetch = async(url, options) => {
    request = {url, options};
    return new Response(JSON.stringify({errno: 0, data: 1}));
  };

  const client = new PushToFirekylin('https://blog.example.com', 'app-key', 'secret');
  const result = await client.push({
    title: 'Post',
    pathname: 'post',
    markdown_content: '# Post'
  });

  assert.deepEqual(result, {errno: 0, data: 1});
  assert.equal(request.url, 'https://blog.example.com/admin/post_push');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.body.get('status'), '3');
  assert.equal(request.options.body.get('app_key'), 'app-key');
  assert.match(request.options.body.get('auth_key'), /^\$2[aby]\$/);
});

test('push client validates required post fields before sending', async() => {
  const client = new PushToFirekylin('https://blog.example.com', 'app-key', 'secret');
  await assert.rejects(client.push({title: 'Incomplete'}), /三字段必须完整/);
});
