var assert = require('assert');
var immutable = require('immutable');
var deepEqualIdent = require('deep-equal-ident');

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
  this.tryToDeliver();
}

ResultArray.prototype.tryToDeliver = function() {
  if (this.counter == this.dst.length) {
    this.cb(null, this.dst);
    this.cb = undefined;
  }
}

ResultArray.prototype.makeSetter = function(index) {
  var self = this;
  return function(err, value) {
    if (err) {
      if (self.cb) {
	self.cb(err);
      }
      self.cb = undefined;
    } else {
      if (self.counter >= self.dst.length) {
	throw new Error('MULTIPLE DELIVERY OF RESULT!!! THIS IS A PROGRAMMING ERROR');
      }
      self.dst[index] = value;
      self.counter++;
      self.tryToDeliver();
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
    return x.async == true;
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
  /*console.log('symbols = ');
  console.log(symbols);
  console.log('values = ');
  console.log(values);
  assert(symbols.length <= values.length);*/
  lvars = lvars.set('arguments', values);
  for (var i = 0; i < symbols.length; i++) {
    lvars = lvars.set(getName(symbols[i]), values[i]);
  }
  return lvars;
}

// Mark a function as async.
function setAsync(x, value) {
  var value = value || true;
  assert(typeof x == 'function', 'You must pass a function to setAsync, but you passed ' + JSON.stringify(x));
  x.async = value;
  return x;
}

function PromisedValue() {
  this.value = undefined;
}

PromisedValue.prototype.set = function(v) {
  this.value = v;
}

var opmap = {
  '=': function(a, b) {return deepEqualIdent(a, b);},
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

function isOperator(x) {
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

function Symbol(x, y) {
  this.name = x;
  this.fun = y; // Optional function: So that something that resolve to a symbol can be a js func..
}


function isSymbol(x) {
  return x instanceof Symbol;
}

function isSymbolWithFunction(x) {
  if (isSymbol(x)) {
    if (x.fun) {
      return x.fun;
    }
  }
  return false;
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

function jsGet(obj, key) {
  return obj[key];
}

function jsSet(obj, key, newValue) {
  obj[key] = newValue;
}

function sym(x, y) {
  return toSymbol(x, y);
}

function toSymbol(x, y) {
  if (isSymbol(x)) {
    return x;
  }
  return new Symbol(x, y);
}

function tagged(cb, str) {
  return function(err, value) {
    console.log('Callback with tag %j received err and value:', str);
    console.log(err);
    console.log(value);
    cb(err, value);
  }
}

function empty(x) {
  return x.length == 0;
}

function makeImmutableMap(x) {
  if (x) {
    if (x instanceof immutable.Map) {
      return x;
    }
    return new immutable.Map(x);
  }
  return makeImmutableMap({});
}

function withLVars(x) {
  assert(typeof x == 'function');
  x.withLVars = true;
  return x;
}

function isWithLVars(x) {
  if (typeof x == 'function') {
    return x.withLVars;
  }
  return false;
}

function makeArrayFromArgs() {
  return argsToArray(arguments);
}

function anyAsync(arr) {
  if (isArray(arr)) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].async) {
        return true;
      }
    }
    return false;
  } else {
    return anyAsync(argsToArray(arguments));
  }
}

function setAsyncCond(cond, x, optValue) {
  assert(typeof x == 'function');
  optValue = optValue || true; // Can be 1.
  if (cond) {
    return setAsync(x, (cond? optValue : undefined));
  } else {
    x.async = undefined;
    return x;
  }
}

function getArgIndsOfType(args, type) {
  return args.map(function(arg, index) {
    if (typeof arg == type) {
      return index;
    }
    return -1;
  }).filter(function(arg) {
    return arg != -1;
  });
}

function declareAsyncSub(x, arg) {
  setAsync(x, arg == 1);
}

function declareAsync() {
  var args = argsToArray(arguments);
  var functionInds = getArgIndsOfType(args, 'function');
  for (var i = 0; i < functionInds.length; i++) {
    var index = functionInds[i];
    declareAsyncSub(args[index], args[index + 1]);
  }
}

function declareAsyncMethods() {
  var args0 = argsToArray(arguments);
  var dst = args0[0];
  var args = args0.slice(1);
  var functionInds = getArgIndsOfType(args, 'string');
  for (var i = 0; i < args.length; i++) {
    var index = functionInds[i];
    declareAsyncSub(dst.prototype[args[index]], args[index + 1]);
  }
}


module.exports.array = makeArrayFromArgs;
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
module.exports.setAsync = setAsync;
module.exports.PromisedValue = PromisedValue;
module.exports.opmap = opmap;
module.exports.getOperatorFunctionSub = getOperatorFunctionSub;
module.exports.getOperatorFunction = getOperatorFunction;
module.exports.evaluateSymbol = evaluateSymbol;
module.exports.isSymbol = isSymbol;
module.exports.Symbol = Symbol;
module.exports.sym = sym;
module.exports.getLocalVar = getLocalVar;
module.exports.gensym = gensym;
module.exports.jsGet = jsGet;
module.exports.jsSet = jsSet;
module.exports.toSymbol = toSymbol;
module.exports.tagged = tagged;
module.exports.makeImmutableMap = makeImmutableMap;
module.exports.isWithLVars = isWithLVars;
module.exports.withLVars = withLVars;
module.exports.isOperator = isOperator;
module.exports.isSymbolWithFunction = isSymbolWithFunction;
module.exports.setAsyncCond = setAsyncCond;
module.exports.anyAsync = anyAsync;
module.exports.declareAsync = declareAsync;
module.exports.declareAsyncMethods = declareAsyncMethods;
module.exports.empty = empty;
