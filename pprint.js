var common = require('./common.js');

function str(x) {
  if (common.isSymbol(x)) {
    return x.name;
  } else if (typeof x == 'function') {
    return '[Function]';
  } else if (typeof x == 'string') {
    return "'" + x + "'";
  } else if (common.isArray(x)) {
    var dst = '[';
    var last = x.length - 1;
    for (var i = 0; i < x.length; i++) {
      dst += str(x[i]) + (i < last? ', ' : '');
    }
    return dst + ']';
  } else if (typeof x == 'object') {
    var dst = '{';
    for (var key in x) {
      dst += str(key) + ': ' + str(x[key]) + ', ';
    }
    return dst + '}';
  } else {
    return '' + x;
  } 
}

module.exports.str = str;
