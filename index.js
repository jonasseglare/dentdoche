/*
  
  + Write asynchronous code as if it is synchronous
  + No extra compilation step (vs streamline.js)
  + Macros
  - Some overhead
  - More involved syntax


  TODO:
  
    * Syntax for calling constructors
    * Loop macro
    * reduce/filter/map
    * ordered evaluation of arguments
    * apply

  RULES:
    * 
  
  */
var assert = require('assert');
var immutable = require('immutable');

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


function argsToArray(x) {
  return Array.prototype.slice.call(x); // see mail.http.js
}

function makeArrayFromArgs() {
  return argsToArray(arguments);
}

function Symbol(x) {
  this.name = x;
}

function isSymbol(x) {
  return x.constructor.name == 'Symbol';
}

function toSymbol(x) {
  if (isSymbol(x)) {
    return x;
  }
  return new Symbol(x);
}

function sym(x) {
  return toSymbol(x);
}

function getName(x) {
  if (typeof x == 'string') {
    return x;
  } else {
    return x.name;
  }
}

function isArray(x) {
  return x.constructor.name == 'Array';
}

function cloneShallow(x) {
  var y = {};
  for (var key in x) {
    y[key] = x[key];
  }
  return y;
}

function evaluateSymbol(localVars, symbol) {
  var key = getName(symbol);
  
  if (localVars.constructor.name == 'src_Map__Map') {
    if (localVars.has(key)) {
      var v = localVars.get(key);
      if (v instanceof PromisedValue) {
	return v.value;
      }
      return v;
    }
  }
  
  if (localVars.hasOwnProperty(key)) {
    return localVars[key];
  } else {
    var f = getOperatorFunction(getName(symbol));
    if (f) {
      return f;
    } else {
      return new Error('The symbol ' + symbol + ' has not been bound');
    }
  }
}

function PromisedValue() {
  this.value = undefined;
}

PromisedValue.prototype.set = function(v) {
  this.value = v;
}

function buildLocalVars(localVars, bindings, cb) {
  
  if (!(bindings.length % 2 == 0)) {
    cb(new Error('Odd number of bindings'));
  } else {
    if (bindings.length == 0) {
      cb(null, localVars);
    } else {
      var sym = getName(bindings[0]);
      var promisedValue = new PromisedValue(undefined);
      evaluateFormWithoutMacros(localVars.set(sym, promisedValue), // To support recursion
				bindings[1], function(err, result) {
	if (err) {
	  cb(err);
	} else {
	  promisedValue.set(result);
	  buildLocalVars(localVars.set(sym, result), bindings.slice(2), cb);
	}
      });
    }
  }
}

function evaluateLet(localVars, form, cb) {
  assert(isArray(form));
  assert(form.length >= 2);
  var bindings = form[1];
  var body = form.slice(2);
  buildLocalVars(
    localVars,
    bindings, function(err, nextLocalVars) {
    if (err) {
      cb(err);
    } else {
      evaluateFormsWithoutMacros(nextLocalVars, body, cb);
    }
  });
}

function evaluateAfn(localVars, form, cb) {
  if (form.length != 3) {
    cb(new Error('Bad length of form'));
  } else {
    args = form[1];
    body = form[2];
    cb(null, afn(args, body, localVars));
  }
}

function evaluateFn(localVars, form, cb) {
  if (form.length != 3) {
    cb(new Error('Bad length of form'));
  } else {
    args = form[1];
    body = form[2];
    cb(null, fn(args, body, localVars));
  }
}

function evaluateIf(localVars, form, cb) {
  if (form.length == 4 || form.length == 3) {
    evaluateFormWithoutMacros(localVars, form[1], function(err, p) {
      if (err) {
	cb(err);
      } else {
	if (p) {
	  evaluateFormWithoutMacros(localVars, form[2], cb);
	} else {
	  if (form.length == 4) {
	    evaluateFormWithoutMacros(localVars, form[3], cb);
	  } else {
	    cb();
	  }
	}
      }
    });
  } else {
    cb(new Error('Malformed if statement'));
  }
}

function evaluateQuote(localVars, form, cb) {
  if (form.length == 2) {
    cb(null, form[1]);
  } else {
    cb(new Error('Quote takes one argument'));
  }
}

function evaluateDo(localVars, form, cb) {
  evaluateFormsWithoutMacros(localVars, form.slice(1), cb);
}


var specialMap = {
  'let': evaluateLet,
  'do': evaluateDo,  
  'afn': evaluateAfn,
  'fn': evaluateFn,
  'if': evaluateIf,
  "'": evaluateQuote,
  "quote": evaluateQuote
};

function isQuote(x) {
  return x == "'" || x == "quote";
}

function isSpecial(x) {
  return specialMap[x];
}


function evaluateSpecial(localVars, form, cb) {
  var f = form[0];
  specialMap[f](localVars, form, cb);
}


function isOperator(x) {
  return opmap[x];
}

function plus(a, b) {
  return a + b;
}


function evaluateArgs(localVars, args, cb) {
  var n = args.length;
  var result = new Array(n);
  var counter = 0;

  var evalComplete = function(i, value) {
    result[i] = value;
    counter++;
    if (counter == n) {
      cb(null, result);
    }
  }
  
  for (var i = 0; i < n; i++) {
    evaluateFormWithoutMacros(localVars, args[i], function(err, y) {
      if (err) {
	cb(err);
      } else {
	evalComplete(i, y);
      }
    });
  }
}

function evaluateNowSub(fun, localVars, form, cb) {
  var isFunction = (typeof fun) == 'function';
  if (!isFunction) {
    cb(new Error('Not a function: ' + fun));
  } else {
    evaluateArgs(localVars, form.slice(1), function(err, evaluatedArgs) {
      if (isAsync(fun)) {
	fun.apply(null, evaluatedArgs.concat([cb]));
      } else {
	var r = fun.apply(null, evaluatedArgs);
	cb(null, r);
      }
    });
  }
}

function resolveFunction(localVars, fun, wf) {
  if (isOperator(fun)) {
    wf(null, getOperatorFunction(fun));
  } else if (typeof fun == 'string') {
    if (fun[0] == '.') {
      if (fun[1] == '-') {
	var f = fun.slice(2);
	wf(null, function(obj) {return obj[f];});
      } else {
	var f = fun.slice(1);
	wf(null, function() {
	  var allArgs = argsToArray(arguments);
	  var args = allArgs;
	  var obj = args[0];
	  var method = obj[f];
	  return method.apply(obj, args.slice(1));
	});
      }
    } else {
      wf(null, evaluateSymbol(localVars, fun));
    }
  } else if (isSymbol(fun)) {
    wf(null, evaluateSymbol(localVars, fun));
  } else {
    // E.g. [["fn", ..], ...]
    evaluateFormWithoutMacros(localVars, fun, wf);
  }
}

function evaluateNow(localVars, form, cb) {
  var wf = function(err, f) {
    if (err) {
      cb(err);
    } else {
      evaluateNowSub(f, localVars, form, cb);
    }
  }
  
  var fun = form[0];
  resolveFunction(localVars, fun, wf);
}

function evaluateSExpr(localVars, form, cb) {
  assert(form.length > 0);
  var f = form[0];
  if (isSpecial(f)) {
    evaluateSpecial(localVars, form, cb);
  } else {
    evaluateNow(localVars, form, cb);
  }
}

function evaluateFormsWithoutMacros(localVars, forms, cb) {
  if (forms.length == 0) {
    cb();
  } else if (forms.length == 1) {
    evaluateFormWithoutMacros(localVars, forms[0], cb);
  } else {
    evaluateFormWithoutMacros(localVars, forms[0], function(err, result) {
      evaluateFormsWithoutMacros(localVars, forms.slice(1), cb);
    });
  }
}

function evaluateFormWithoutMacros(localVars, form, cb) {
  if (isArray(form)) {
    if (form.length == 0) {
      cb(null, undefined);
    } else {
      assert(form.length >= 0);
      evaluateSExpr(localVars, form, cb);
    }
  } else if (isSymbol(form)) {
    cb(null, evaluateSymbol(localVars, form));
  } else {
    cb(null, form);
  }
}


// Mark a function as async.
function async(x) {
  assert(typeof x == 'function');
  x.async = true;
  return x;
}

function isAsync(x) {
  return x.async;
}

function makeLocalVars(lvars, symbols, values) {
  assert(symbols.length <= values.length);
  lvars = lvars.set('arguments', values);
  for (var i = 0; i < symbols.length; i++) {
    lvars = lvars.set(getName(symbols[i]), values[i]);
  }
  return lvars;
}


function initLVars(x) {
  if (x == undefined) {
    return immutable.Map({});
  } else {
    return x;
  }
}

// Define an asynchronous function
function afn(args, body, lvars) {
  var f = function() {
    var allArgs = argsToArray(arguments);
    var lastIndex = allArgs.length - 1;
    var evaluatedArgs = allArgs.slice(0, lastIndex);
    var cb = allArgs[lastIndex];
    var localVars = makeLocalVars(initLVars(lvars), args, evaluatedArgs);
    evaluateFormWithoutMacros(localVars, expandMacros(body), cb);
  }
  return async(f);
}

// Create a synchronous function
function fn(args, body, lvars) {
  return function() {
    var evaluatedArgs = argsToArray(arguments);
    var localVars = makeLocalVars(initLVars(lvars), args, evaluatedArgs);
    var assigned = false;
    var result = undefined;
    evaluateFormWithoutMacros(localVars, expandMacros(body), function(err, r) {
      if (err) {
	throw err;
      } else {
	assigned = true;
	result = r;
      }
    });
    assert(assigned, 'Result was not assigned. Most likely, your result is delivered asynchronously, but this function is synchronous.');
    return result;
  }
}


// Marks a function as being a macro.
function macro(x) {
  x.isMacro = true;
  return x;
}

function isMacro(x) {
  if (typeof x == 'function') {
    return x.isMacro;
  }
  return false;
}

function expandMacros(x) {
  if (isArray(x)) {
    if (1 <= x.length) {
      var f = x[0];
      if (isMacro(f)) {
	return expandMacros(f.apply(null, x.slice(1)));
      } else if (isQuote(f)) {
	return x;
      } else {
	var y = new Array(x.length);
	for (var i = 0; i < x.length; i++) {
	  y[i] = expandMacros(x[i]);
	}
	return y;
      }
    }
  }
  return x;
}

function evaluateForm(localVars, form, cb) {
  evaluateFormWithoutMacros(
    initLVars(localVars), expandMacros(form), cb);
}

function jsGet(obj, key) {
  return obj[key];
}

function jsSet(obj, key, newValue) {
  obj[key] = newValue;
}

function functionalMap() {
  var args = argsToArray(arguments);
  var f = args[0];
  var colls = args.slice(1);
  var n = colls[0].length;
  for (var i = 1; i < colls.length; i++) {
    assert(n == colls[i].length);
  }
  var localArgs = new Array(colls.length);
  var result = new Array(n);
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < colls.length; j++) {
      localArgs[j] = (colls[j])[i];
    }
    result[i] = f.apply(null, localArgs);
  }
  return result;
}

function applySync(fun, args) {
  assert(!isAsync(fun));
  return fun.apply(null, args);
}

function convertToAsync(f) {
  assert(typeof f == 'function');
  if (isAsync(f)) {
    return f;
  } else {
    return async(function() {
      var allArgs = argsToArray(arguments);
      var index = allArgs.length-1;
      var butCB = allArgs.slice(0, index);
      var cb = allArgs[index];
      try {
	assert(typeof f == 'function');
	var result = f.apply(null, butCB);
	cb(null, result);
      } catch (e) {
	cb(e);
      }
    });
  }
}

function applyAsync(fun0, args, cb) {
  assert(typeof fun0 == 'function');
  var fun = convertToAsync(fun0);
  assert(typeof fun == 'function');
  fun.apply(null, args.concat([cb]));
}

async(applyAsync);

// http://stackoverflow.com/questions/3362471/how-can-i-call-a-javascript-constructor-using-call-or-apply
function callConstructorWithArgs(Constructor) {
  var args = Array.prototype.slice.call(arguments, 1);
  
  var Temp = function(){}, // temporary constructor
  inst, ret; // other vars

  // Give the Temp constructor the Constructor's prototype
  Temp.prototype = Constructor.prototype;

  // Create a new instance
  inst = new Temp;

  // Call the original Constructor with the temp
  // instance as its context (i.e. its 'this' value)
  ret = Constructor.apply(inst, args);

  // If an object has been returned then return it otherwise
  // return the original instance.
  // (consistent with behaviour of the new operator)
  return Object(ret) === ret ? ret : inst;
}

function mapAsync(fun0) {
  var fun = convertToAsync(fun0);
  var allArgs = argsToArray(arguments);
  var last = allArgs.length - 1;
  var colls = allArgs.slice(1, last);
  var collCount = colls.length;
  var cb = allArgs[last];
  var n = colls[0].length;
  var result = new Array(n);
  var counter = 0;
  for (var i = 0; i < n; i++) {
    var localArgs = new Array(collCount + 1);
    localArgs[collCount] = function(err, value) {
      if (err) {
	cb(err);
      } else {
      	counter++;
      	result[i] = value;
      	if (counter == n) {
      	  cb(null, result);
      	}
      }
    };
    for (var j = 0; j < collCount; j++) {
      localArgs[j] = (colls[j])[i];
    }
    fun.apply(null, localArgs);
  }
} async(mapAsync);

function reduceAsync(fun0, coll, cb) {
  if (coll.length == 0) {
    cb(null, []);
  } else if (coll.length == 1) {
    cb(null, coll);
  } else {
    var fun = convertToAsync(fun0);
    var middle = Math.floor(coll.length/2);
    var counter = 0;
    var a = undefined;
    var b = undefined;
    var gotValue = function(err) {
      if (err) {
	cb(err);
      } else {
	counter++;
	if (counter == 2) {
	  fun(a, b, cb);
	}
      }
    }
    reduceAsync(fun, coll.slice(0, middle), function(err, value) {
      a = value;
      gotValue(err);
    });
    reduceAsync(fun, coll.slice(middle), function(err, value) {
      b = value;
      gotValue(err);
    });
  }
} async(reduceAsync);

function filterAsync(fun0, coll, cb) {
  var fun = convertToAsync(fun0);
  var counter = 0;
  var toKeep = 0;
  var n = coll.length;
  var keep = new Array(n);
  for (var i0 = 0; i0 < n; i0++) {
    var i = i0;
    var x = coll[i];
    var k = i;
    fun(x, function(err, value) {
      if (err) {
	cb(err);
      } else {
	counter++;
	if (value) {
	  toKeep++;
	  keep[k] = true;
	}
	if (counter == n) {
	  console.log('keep = %j', keep);
	  var result = new Array(toKeep);
	  var r = 0;
	  for (var j = 0; j < n; j++) {
	    if (keep[j]) {
	      result[r] = coll[j];
	      r++;
	    }
	  }
	  console.log('result = %j', result);
	  if (r == toKeep) {
	    cb(null, result);
	  } else {
	     cb(new Error('Error in the filter'));
	  }
	}
      }
    });
  }
} async(filterAsync);



module.exports.evaluateSymbol = evaluateSymbol;
module.exports.Symbol = Symbol;
module.exports.evaluateForm = evaluateForm;
module.exports.evaluateNow = evaluateNow;
module.exports.async = async;
module.exports.isAsync = isAsync;
module.exports.getOperatorFunction = getOperatorFunction;
module.exports.sym = sym;
module.exports.fn = fn;
module.exports.afn = afn;
module.exports.array = makeArrayFromArgs;
module.exports.macro = macro;
module.exports.isMacro = isMacro;
module.exports.argsToArray = argsToArray;
module.exports.set = jsSet;
module.exports.get = jsGet;
module.exports.map = functionalMap;
module.exports.applySync = applySync;
module.exports.applyAsync = applyAsync;
module.exports.apply = applyAsync;
module.exports.callConstructorWithArgs = callConstructorWithArgs;
module.exports.New = callConstructorWithArgs;
module.exports.map = mapAsync;
module.exports.reduce = reduceAsync;
module.exports.filter = filterAsync;
