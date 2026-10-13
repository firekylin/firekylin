const {PasswordHash} = require('phpass');

const passwordHash = new PasswordHash();

async function parseResponse(response) {
  if (!response.ok) {
    throw new Error(`Firekylin push request failed with status ${response.status}`);
  }
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    return body;
  }
}

module.exports = class PushToFirekylin {
  constructor(url, appKey, appSecret) {
    this.url = url.replace(/\/+$/, '');
    this.appKey = appKey;
    this.appSecret = appSecret;
  }

  async authorize() {
    const endpoint = new URL(`${this.url}/admin/post_push`);
    endpoint.searchParams.set('app_key', this.appKey);
    endpoint.searchParams.set('auth_key', passwordHash.hashPassword(`${this.appSecret}Firekylin`));
    return parseResponse(await fetch(endpoint));
  }

  async push(post) {
    if (!post.title || !post.pathname || !post.markdown_content) {
      throw new Error('title, pathname, markdown_content 三字段必须完整');
    }

    const payload = {
      ...post,
      status: post.status || 3,
      app_key: this.appKey,
      auth_key: passwordHash.hashPassword(this.appSecret + post.markdown_content)
    };
    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        body.set(key, String(value));
      }
    });

    const response = await fetch(`${this.url}/admin/post_push`, {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body
    });
    return parseResponse(response);
  }
};
