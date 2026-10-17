'use strict';

function normalizeBaseUrl(input) {
  const url = new URL(input || 'https://api.openai.com/v1');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.search || url.hash) throw new TypeError('Invalid AI API endpoint');
  return url.href.replace(/\/+$/, '');
}

function createOpenAICompatibleProvider({baseUrl, apiKey, fetchImpl = fetch, timeoutMs = 45000}) {
  const origin = normalizeBaseUrl(baseUrl);
  return {
    async generate({model, messages, options = {}}) {
      const signal = AbortSignal.timeout(Math.min(Math.max(timeoutMs, 1000), 120000));
      const response = await fetchImpl(origin + '/chat/completions', {
        method: 'POST', signal,
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? {authorization: 'Bearer ' + apiKey} : {})
        },
        body: JSON.stringify({
          model, messages, stream: false, temperature: options.temperature ?? 0.3
        })
      });
      if (!response.ok) throw new Error('AI provider request failed (' + response.status + ')');
      const body = await response.json();
      const text = body?.choices?.[0]?.message?.content;
      if (typeof text !== 'string') throw new Error('Invalid AI provider response');
      return {text, usage: body.usage || null};
    }
  };
}

module.exports = {createOpenAICompatibleProvider, normalizeBaseUrl};
