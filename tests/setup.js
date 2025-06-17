const { TextEncoder, TextDecoder } = require('util');
const timers = require('timers');
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = timers.setImmediate;
}
