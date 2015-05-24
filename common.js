var assert = require('assert');

function ResultArray(n, cb) {
  this.dst = new Array(n);
  this.counter = 0;
  this.cb = cb;
}

ResultArray.prototype.makeSetter = function(index) {
  var self = this;
  return function(err, value) {
    if (err) {
      self.cb(err);
    } else {
      self.dst[index] = value;
      self.counter++;
      if (self.counter == self.dst.length) {
	self.cb(null, self.dst);
      }
    }
  };
}

/*
    How to get the names of function parameters:
    
      http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
*/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}

function isAsync(x) {
  if (typeof x == 'function') {
    return x.async;
  }
  return false;
}

function isMacro(x) {
  if (typeof x == 'function') {
    return x.isMacro;
  }
  return false;
}

function contains(m, key) {
  return m.hasOwnProperty(key);
}

function first(x) {
  return x[0];
}

function rest(x) {
  return x.slice(1);
}

function isArray(x) {
  return x instanceof Array;
}

function argsToArray(x) {
  return Array.prototype.slice.call(x); // see mail.http.js
}

function getName(x) {
  if (typeof x == 'string') {
    return x;
  } else {
    return x.name;
  }
}


function bindFunctionArgs(lvars, symbols, values) {
  assert(symbols.length <= values.length);
  lvars = lvars.set('arguments', values);
  for (var i = 0; i < symbols.length; i++) {
    lvars = lvars.set(getName(symbols[i]), values[i]);
  }
  return lvars;
}

// Mark a function as async.
function async(x) {
  assert(typeof x == 'function');
  x.async = true;
  return x;
}

function PromisedValue() {
  this.value = undefined;
}

PromisedValue.prototype.set = function(v) {
  this.value = v;
}



module.exports.ResultArray = ResultArray;
module.exports.getParamNames = getParamNames;
module.exports.isAsync = isAsync;
module.exports.isMacro = isMacro;
module.exports.contains = contains;
module.exports.first = first;
module.exports.rest = rest;
module.exports.isArray = isArray;
module.exports.argsToArray = argsToArray;
module.exports.bindFunctionArgs = bindFunctionArgs;
module.exports.getName = getName;
module.exports.async = async;
module.exports.PromisedValue = PromisedValue;
