var assert = require('assert');

var gsCounter = 0;
function gensym(x) {
  if (x) {
    var i = gsCounter;
    gsCounter++;
    return x + i;
  } else {
    return gensym('gensym');
  }
}


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

var opmap = {
  '=': function(a, b) {return a == b;},
  '==': function(a, b) {return a == b;},
  '!=': function(a, b) {return a != b;},
  '<': function(a, b) {return a < b;},
  '>': function(a, b) {return a > b;},
  '<=': function(a, b) {return a <= b;},
  '>=': function(a, b) {return a >= b;},
  '+': function(a, b) {return a + b;},
  '-': function(a, b) {return a - b;},
  '/': function(a, b) {return a/b;},
  '*': function(a, b) {return a*b;},
  '&&': function(a, b) {return a && b;},
  '||': function(a, b) {return a || b;},
  '!': function(a) {return !a;}
};

function getOperatorFunctionSub(x) {
  return opmap[x];
}


function getOperatorFunction(x) {
  if (x == '-') {
    return function() {
      var args = argsToArray(arguments);
      if (args.length == 1) {
	return -args[0];
      } else if (args.length == 2) {
	return args[0] - args[1];
      } else {
	// ERROR!!!
	return undefined;
      }
    }
  } else {
    var op = getOperatorFunctionSub(x);
    if (op) {
      var n = (getParamNames(op)).length;
      if (n == 1) {
	return op;
      } else {
	return function() {
	  var args = argsToArray(arguments);
	  var result = args[0];
	  for (var i = 1; i < args.length; i++) {
	    result = op(result, args[i]);
	  }
	  return result;
	}
      }
    }
  }
}

function Symbol(x) {
  this.name = x;
}


function isSymbol(x) {
  return x instanceof Symbol;
}

function getLocalVar(localVars, key) {
  var v = localVars.get(key);
  if (v instanceof PromisedValue) {
    return v.value;
  }
  return v;
}


function evaluateSymbol(localVars, symbol) {
  var key = getName(symbol);
  
  if (localVars.constructor.name == 'src_Map__Map') {
    if (localVars.has(key)) {
      return getLocalVar(localVars, key);
    }
  }
  
  if (localVars.hasOwnProperty(key)) {
    return localVars[key];
  } else {
    var f = getOperatorFunction(getName(symbol));
    if (f) {
      return f;
    } else {
      throw new Error('ERROR LOOKING UP SYMBOL: The symbol "' + symbol + '" has not been bound. Are you using fn or afn do define a local recursive function? Or did you just refer to a symbol that is not bound?');
      return null;
    }
  }
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
module.exports.opmap = opmap;
module.exports.getOperatorFunctionSub = getOperatorFunctionSub;
module.exports.getOperatorFunction = getOperatorFunction;
module.exports.evaluateSymbol = evaluateSymbol;
module.exports.isSymbol = isSymbol;
module.exports.Symbol = Symbol;
module.exports.getLocalVar = getLocalVar;
module.exports.gensym = gensym;
