'use strict';

// Decode before splitting: UTF-8 characters and CRLF may span network chunks.
async function* records(body, ndjson = false, signal) {
  if (!body) throw new Error('Missing stream body');
  const decoder = new TextDecoder('utf-8', {fatal: true});
  let buffer = '', data = [], dataSize = 0;
  for await (const bytes of chunks(body, signal)) {
    buffer += decoder.decode(bytes, {stream: true});
    let end;
    while ((end = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, end).replace(/\r$/, '');
      buffer = buffer.slice(end + 1);
      if (line.length > 2000000) throw new Error('Stream frame too large');
      if (ndjson) {
        if (line.trim()) yield line;
      } else if (line === '') {
        if (data.length) yield data.join('\n');
        data = []; dataSize = 0;
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).replace(/^ /, ''));
        dataSize += line.length;
      }
      if (dataSize > 2000000) throw new Error('Stream frame too large');
    }
    if (buffer.length > 2000000) throw new Error('Stream frame too large');
  }
  buffer += decoder.decode();
  if (ndjson && buffer.trim()) yield buffer;
  // SSE dispatch requires a blank line. A trailing partial event is truncation.
  else if (buffer.trim() || data.length) throw new Error('Stream interrupted');
}

function append(text, delta, onText) {
  if (typeof delta !== 'string' || !delta) return text;
  if (text.length + delta.length > 200000) throw new Error('Stream text too large');
  onText(delta);
  return text + delta;
}

// A stalled upstream must not outlive the client's timeout or cancellation.
async function* chunks(body, signal) {
  const reader = body.getReader?.();
  const iterator = reader ? {next: () => reader.read(), return: () => reader.cancel()} : body[Symbol.asyncIterator]();
  let rejectAbort;
  const aborted = new Promise((resolve, reject) => {rejectAbort = reject});
  // Attach a handler even when cancellation happens between reads.
  aborted.catch(() => {});
  const cancel = () => {
    rejectAbort(signal.reason || new Error('AI stream cancelled'));
    if (reader) reader.cancel(signal.reason).catch(() => {});
    else body.destroy?.();
  };
  signal?.addEventListener('abort', cancel, {once: true});
  try {
    if (signal?.aborted) cancel();
    while (true) {
      signal?.throwIfAborted();
      const item = await Promise.race([iterator.next(), aborted]);
      signal?.throwIfAborted();
      if (item.done) return;
      yield item.value;
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (reader) {
      try {await reader.cancel()} finally {reader.releaseLock()}
    } else {
      // A custom iterator may not settle return() until its pending read finishes.
      Promise.resolve(iterator.return?.()).catch(() => {});
    }
  }
}

module.exports = {records, append};
