'use strict';

const MIME = ['image/png', 'image/jpeg', 'image/webp'];

function image(value) {
  if (!value || !MIME.includes(value.mimeType) || typeof value.data !== 'string' || !value.data.length ||
      value.data.length > 28000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data)) {
    throw new TypeError('Invalid image data');
  }
  return {mimeType: value.mimeType, data: value.data};
}

function inputs(request, max = 1) {
  const values = request.images || [];
  if (!Array.isArray(values) || values.length > max) {
    throw new TypeError(`At most ${max} reference images are supported`);
  }
  return values.map(image);
}

function uri(value) {
  const checked = image(value);
  return `data:${checked.mimeType};base64,${checked.data}`;
}

function prompt(request) {
  const text = request.messages.map(message => message.content).join('\n');
  if (!text.trim()) throw new TypeError('Image prompt is required');
  return text;
}

function output(payload, mimeType) {
  const images = (payload.data || []).map(value => image({mimeType, data: value.b64_json}));
  if (!images.length) throw new Error('Provider returned no image output');
  return images;
}

module.exports = Object.freeze({image, inputs, uri, prompt, output});
