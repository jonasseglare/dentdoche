var common = require('./common');

function isCompiled(x) {
  if (typeof x == 'function') {
    return x.compiled;
  }
  return false;
}
