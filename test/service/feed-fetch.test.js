const assert = require('node:assert/strict');
const test = require('node:test');

const originalFetch = global.fetch;
const originalThink = global.think;
global.think = {
  Service: class {},
  md5: value => value
};
const FeedService = require('../../src/service/feed');

test.after(() => {
  global.fetch = originalFetch;
  if (originalThink === undefined) delete global.think;
  else global.think = originalThink;
});

test('feed content parser uses native fetch and encodes the article URL', async() => {
  let requestedUrl;
  global.fetch = async url => {
    requestedUrl = url.toString();
    return new Response(JSON.stringify({errno: 0, data: {content: '# Post'}}), {
      headers: {'content-type': 'application/json'}
    });
  };

  const service = new FeedService();
  const result = await service.contentParser('https://example.com/post?a=1&b=2');

  assert.deepEqual(result, {content: '# Post'});
  assert.equal(new URL(requestedUrl).searchParams.get('url'), 'https://example.com/post?a=1&b=2');
});

test('feed parser bridges a fetch web stream into feedparser', async() => {
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0"><channel><title>Example</title>
    <item><title>First post</title><link>https://example.com/first</link>
    <description>First description</description></item>
    </channel></rss>`;
  global.fetch = async() => new Response(rss, {
    headers: {'content-type': 'application/rss+xml'}
  });

  const service = new FeedService();
  service.transformPost = async item => ({title: item.title});

  assert.deepEqual(await service.run('https://example.com/feed.xml'), [{title: 'First post'}]);
});

test('feed parser rejects unsuccessful fetch responses', async() => {
  global.fetch = async() => new Response('unavailable', {status: 503});
  const service = new FeedService();

  await assert.rejects(service.run('https://example.com/feed.xml'), /Bad status code: 503/);
});
