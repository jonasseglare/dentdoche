/*
  
  + Write asynchronous code as if it is synchronous
  + No extra compilation step (vs streamline.js)
  + Macros
  - Some overhead
  - More involved syntax


  TODO:
  
    * Syntax for calling constructors
    * Initial macro expansion
    * Syntax for calling methods
  
  */
var assert = require('assert');

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
  if (localVars.hasOwnProperty(key)) {
    return localVars[key];
  } else if (localVars.hasOwnProperty('___next')) {
    return evaluateSymbol(localVars.___next, symbol);
  }
  return new Error('The symbol ' + symbol + ' has not been bound');
}

function pushLocalVars(a, b) {
  var a2 = cloneShallow(a);
  a2.___next = b;
  return a2;
}

function isSpecial(x) {
  return x == 'let' || x == 'fn' || x == 'afn' || x == 'if' || x == 'do' || x == "'";
}

function buildLocalVars(localVars, bindings, cb) {
  
  if (!(bindings.length % 2 == 0)) {
    cb(new Error('Odd number of bindings'));
  } else {
    if (bindings.length == 0) {
      cb(null, localVars);
    } else {
      var sym = getName(bindings[0]);
      evaluateForm(localVars, bindings[1], function(err, result) {
	if (err) {
	  cb(err);
	} else {
	  localVars[sym] = result;
	  buildLocalVars(localVars, bindings.slice(2), cb);
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
    pushLocalVars({}, localVars),
    bindings, function(err, nextLocalVars) {
    if (err) {
      cb(err);
    } else {
      evaluateForms(nextLocalVars, body, cb);
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
    evaluateForm(localVars, form[1], function(err, p) {
      if (err) {
	cb(err);
      } else {
	if (p) {
	  evaluateForm(localVars, form[2], cb);
	} else {
	  if (form.length == 4) {
	    evaluateForm(localVars, form[3], cb);
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

function evaluateSpecial(localVars, form, cb) {
  var f = form[0];
  if (f == 'let') {
    evaluateLet(localVars, form, cb);
  } else if (f == 'do') {
    evaluateForms(localVars, form.slice(1), cb);
  } else if (f == 'afn') {
    evaluateAfn(localVars, form, cb);
  } else if (f == 'fn') {
    evaluateFn(localVars, form, cb);
  } else if (f == 'if') {
    evaluateIf(localVars, form, cb);
  } else if (f == "'" || f == 'quote') {
    evaluateQuote(localVars, form, cb);
  } else {
    cb();
  }
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
    evaluateForm(localVars, args[i], function(err, y) {
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

function evaluateNow(localVars, form, cb) {
  var wf = function(err, f) {
    if (err) {
      cb(err);
    } else {
      evaluateNowSub(f, localVars, form, cb);
    }
  }
  
  var fun = form[0];
  if (isOperator(fun)) {
    wf(null, getOperatorFunction(fun));
  } else if (isSymbol(fun) || typeof fun == 'string') {
    wf(null, evaluateSymbol(localVars, fun));
  } else {
    evaluateForm(localVars, fun, wf);
  }
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

function evaluateForms(localVars, forms, cb) {
  if (forms.length == 0) {
    cb();
  } else if (forms.length == 1) {
    evaluateForm(localVars, forms[0], cb);
  } else {
    evaluateForm(localVars, forms[0], function(err, result) {
      evaluateForms(localVars, forms.slice(1), cb);
    });
  }
}

function evaluateForm(localVars, form, cb) {
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

function makeLocalVars(symbols, values) {
  assert.equal(symbols.length, values.length);
  var dst = {};
  for (var i = 0; i < symbols.length; i++) {
    dst[symbols[i]] = values[i];
  }
  return dst;
}


function initLVars(x) {
  if (x == undefined) {
    return {};
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
    var localVars = pushLocalVars(makeLocalVars(args, evaluatedArgs),
				  initLVars(lvars));
    evaluateForm(localVars, body, cb);
  }
  return async(f);
}

// Create a synchronous function
function fn(args, body, lvars) {
  return function() {
    var evaluatedArgs = argsToArray(arguments);
    var localVars = pushLocalVars(makeLocalVars(args, evaluatedArgs),
				  initLVars(lvars));
    var assigned = false;
    var result = undefined;
    evaluateForm(localVars, body, function(err, r) {
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


function defmacro(args, body) {
  var x = defmacroSub(args, body);
  x.isMacro = true;
  return x;
}

function isMacro(x) {
  return x.isMacro;
}

module.exports.evaluateSymbol = evaluateSymbol;
module.exports.Symbol = Symbol;
module.exports.pushLocalVars = pushLocalVars;
module.exports.evaluateForm = evaluateForm;
module.exports.evaluateNow = evaluateNow;
module.exports.async = async;
module.exports.isAsync = isAsync;
module.exports.getOperatorFunction = getOperatorFunction;
module.exports.sym = sym;
module.exports.fn = fn;
module.exports.afn = afn;
module.exports.array = makeArrayFromArgs;
