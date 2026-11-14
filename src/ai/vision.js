'use strict';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 12;
const FORMATS = {'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp'};
function decode(value) {
  if (!value || !FORMATS[value.mimeType] || typeof value.data !== 'string' || !value.data.length
      || value.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4
      || value.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data)) {
    throw new Error('图片仅支持 PNG、JPEG、WebP，每张不能超过 2 MiB');
  }
  const buffer = Buffer.from(value.data, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES || buffer.toString('base64') !== value.data) throw new Error('无效的图片编码');
  const signature = value.mimeType === 'image/png'
    ? buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) :
    value.mimeType === 'image/jpeg' ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 :
      buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!signature) throw new Error('图片内容与声明的格式不符');
  // libvips can otherwise decode only the first frame of an APNG.
  if (value.mimeType === 'image/png') {
    for (let offset = 8; offset + 12 <= buffer.length;) {
      const length = buffer.readUInt32BE(offset);
      if (buffer.toString('ascii', offset + 4, offset + 8) === 'acTL') throw new Error('暂不支持动态图');
      offset += length + 12;
    }
  }
  return buffer;
}
async function normalizeImage(value) {
  const buffer = decode(value);
  try {
    const image = require('sharp')(buffer, {failOn: 'warning', limitInputPixels: 16777216, animated: true});
    const metadata = await image.metadata();
    if (metadata.format !== FORMATS[value.mimeType] || (metadata.pages || 1) !== 1
        || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) {
      throw new Error('dimensions');
    }
    // Fully decode/re-encode, auto-orient and omit EXIF/XMP/ICC metadata and trailing payloads.
    const {data, info} = await image.rotate().toFormat(metadata.format).toBuffer({resolveWithObject: true});
    if (data.length > MAX_IMAGE_BYTES) throw new Error('size');
    return {mimeType: value.mimeType, data: data.toString('base64'), size: data.length,
      width: info.width, height: info.height};
  } catch {
    throw new Error('图片损坏、为动图或尺寸过大；请使用不超过 4096×4096、2 MiB 的静态图片');
  }
}
function inputs(message) {
  if (message.images === undefined || Array.isArray(message.images) && !message.images.length) return [];
  if (message.role !== 'user' || !Array.isArray(message.images) || message.images.length > MAX_IMAGES) {
    throw new Error('只有用户消息可包含图片，单次请求最多 12 张');
  }
  return message.images.map(value => {
    decode(value);
    return {mimeType: value.mimeType, data: value.data};
  });
}
function hasImages(messages) {
  return Array.isArray(messages) && messages.some(message => message?.images !== undefined
    && (!Array.isArray(message.images) || message.images.length > 0));
}
function assertModel(model, messages) {
  if (hasImages(messages) && !model?.capabilities?.includes('vision')) {
    const error = new Error('当前模型不支持图片理解，请选择标记为“可读图片”的模型；不会忽略图片发送');
    error.code = 'AI_UNSUPPORTED_CAPABILITY';
    throw error;
  }
}
function budget(messages) {
  let count = 0, bytes = 0;
  for (const message of messages) for (const image of inputs(message)) {
    count++;
    bytes += Buffer.byteLength(image.data, 'base64');
    if (count > MAX_IMAGES || bytes > MAX_REQUEST_BYTES) {
      throw new Error('会话图片累计不能超过 12 张或 8 MiB，请新建对话');
    }
  }
}
async function normalizeMessages(messages) {
  budget(messages);
  const result = [];
  for (const message of messages) {
    const images = inputs(message);
    if (!images.length) { result.push(message); continue }
    const checked = [];
    for (const image of images) checked.push(await normalizeImage(image));
    result.push({...message, images: checked.map(({mimeType, data}) => ({mimeType, data}))});
  }
  budget(result);
  return result;
}
module.exports = {normalizeImage, normalizeMessages, assertModel, hasImages, inputs, budget};
