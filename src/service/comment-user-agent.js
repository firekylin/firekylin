'use strict';

// Return the names and major browser version displayed by the comment client.
function parse(value) {
  const ua=String(value || '').slice(0, 2048).toLowerCase();
  let os='';
  if (ua.includes('windows')) os='Windows';
  else if (ua.includes('android')) os='Android';
  else if (/iphone|ipad|ipod/.test(ua)) os='iOS';
  else if (ua.includes('mac os x')) os='macOS';
  else if (ua.includes('linux')) os='Linux';
  let browser='', match;
  if ((match=ua.match(/edg(?:ios)?\/([\d.]+)/))) browser='Edge';
  else if ((match=ua.match(/(?:opr|opera)\/([\d.]+)/))) browser='Opera';
  else if ((match=ua.match(/(?:crios|chrome)\/([\d.]+)/))) browser='Chrome';
  else if ((match=ua.match(/(?:fxios|firefox)\/([\d.]+)/))) browser='Firefox';
  else if (ua.includes('safari') && !/chromium|edg/.test(ua)) {browser='Safari'; match=ua.match(/version\/([\d.]+)/)}
  return {browser:{name:browser ? browser+' ' : '', version:match ? match[1].split('.')[0] : ''}, os:{name:os}};
}
module.exports={parse};
