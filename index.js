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


function argsToArray(x) {
  return Array.prototype.slice.call(x); // see mail.http.js
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
  return new Symbole(x);
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
  return undefined;
}

function pushLocalVars(a, b) {
  var a2 = cloneShallow(a);
  a2.___next = b;
  return a2;
}

function isSpecial(x) {
  return x == 'let' || x == 'fn' || x == 'def' || x == 'if';
}

var operators = ['+', '-', '*', '/', '&&', '!', '||'];

function isOperator(x) {
  for (var i = 0; i < operators.length; i++) {
    if (x == operators[i]) {
      return true;
    }
  }
  return false;
}

function getOperatorFunctionSub(x) {
  return {
    '+': function(a, b) {return a + b;},
    '-': function(a, b) {return a - b;},
    '*': function(a, b) {return a*b;},
    '/': function(a, b) {return a/b},
    '&&': function(a, b) {return a && b;},
    '||': function(a, b) {return a || b},
    '!': function(a) {return !a;}
  }
}

function getOperatorFunction(x) {
  var op = getOperatorFunctionSub(x);
  var n = (getParamNames(op)).length;
  if (n == 1) {
    return op;
  } else {
    return function() {
      var args = argsToArray(arguments);
      var result = args[0];
      for (var i = 1; i < result.length; i++) {
	result = op(result, args[i]);
      }
      return result;
    }
  }
}

function evaluateNow(localVars, form, cb) {
  var f = form[0];
  if (isOperator(f)) {
    f = getOperatorFunction(f);
  } else if (isSymbol(f) || typeof f == 'string') {
    f = evaluateSymbol(localVars, f);
  }
  assert(typeof f == 'function');
  evaluateArgs(form.slice(1), function(err, evaluatedArgs) {
    evaluateFunction(f, evaluatedArgs, cb);
  });
}

function evaluateSExpr(localVars, form, cb) {
  if (form.length == 0) {
    cb(null, undefined);
  } else {
    var f = form[0];
    if (isMacro(f)) {
      evaluateMacro(localVars, form, function(err, newForm) {
	if (err) {
	  cb(err);
	} else {
	  evaluateForm(localVars, newForm, cb);
	}
      });
    } else if (isSpecial(f)) {
      evaluateSpecial(localVars, form, cb);
    } else {
      evaluateNow(localVars, form, cb);
    }
  }
}

// Always passes the result to cb, no matter if it is sync or not.
function evaluateForm(localVars, form, cb) {
  if (isArray(form)) {
    evaluateSExpr(localVars, form, cb);
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

// Define a synchronous function
function defn(args, body) {
}

// Define an asynchronous function
function defna(args, body) {
  return async(defnaSub(args, body));
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
module.exports.async = async;
module.exports.isAsync = isAsync;
