/**
 * @qiniu config
 * @type {Object}
 */

export default {
  enable: true, // 七牛cdn开关
  accessKey: 'xGm5gYnrwFH0TPOp0jquZgnW2t0SymwXP1GBNvXw', // 七牛AccessKey
  secretKey: 'rCsH6tkem-sg_3TaN2DxRS5cr3hbNL4_g_3-Ga4D', // 七牛SecretKey
  bucket: 'assets', // 空间名
  origin: 'https://o2znrmehg.qnssl.com', // CDN加速域名
  prefix: 'blog', // 存储地址prefix
  format: 'YYYYMMDD' // 存储地址format
}
