var common = require('./common');
var assert = require('assert');
var first = common.first;
var rest = common.rest;

function isCompiled(x) {
  if (typeof x == 'function') {
    return x.compiled;
  }
  return false;
}

function compiled(x) {
  if (typeof x == 'object' || typeof x == 'function') {
    x.compiled = true;
  }
  return x;
}

function eval(lvars, x, cb) {
  if (isCompiled(x)) {
    try {
      var ret = x(lvars, cb);
    } catch (e) {
      cb(e);
    }
  } else {
    cb(null, x);
  }
}

function compileArray(x) {
  var y = new Array(x.length);
  for (var i = 0; i < x.length; i++) {
    y[i] = compile(x[i]);
  }
  return y;
}

function MakeIf(args) {
  var cArgs = compileArray(args);
  assert(args.length == 2 || args.length == 3);
  return function(lvars, cb) {
    eval(lvars, cArgs[0], function(err, value) {
      if (value) {
	eval(lvars, cArgs[1], cb);
      } else if (args.length == 3) {
	eval(lvars, cArgs[2], cb);
      } else {
	cb();
      }
    });
  }
}

function MakeQuote(args) {
  assert(args.length == 1);
  return args[0];
}

function evaluateInSequence(lvars, compiledForms, result, cb) {
  if (compiledForms.length == 0) {
    cb(null, result);
  } else {
    var a = first(compiledForms);
    eval(lvars, a, function(err, x) {
      evaluateInSequence(lvars, rest(compiledForms), x, cb);
    });
  }
}

function MakeDo(args0) {
  var args = compileArray(args0);
  return function(lvars, cb) {
    evaluateInSequence(lvars, args, undefined, cb);
  }
}

function MakeFn(args) {
  var argList = first(args);
  var compiledBody = compileArray(rest(args));
  return function(lvars0, cb) {
    //cb(null, 124);
    cb(null, function() {
      var evaluatedArgs = common.argsToArray(arguments);
      lvars = common.bindFunctionArgs(lvars0, argList, evaluatedArgs);
      var assigned = false;
      var result = undefined;
      var err = undefined;
      evaluateInSequence(lvars, compiledBody, undefined, function(err0, value) {
	assigned = true;
	result = value;
	err = err0;
      });
      if (!assigned) {
	throw new Error('Result not assigned in function ' + args);
      } else if (err) {
	throw err;
      }
      return result;
    });
  }
}

function MakeAfn(args) {
  var argList = first(args);
  var compiledBody = compileArray(rest(args));
  return function(lvars0, cb) {
    //cb(null, 124);
    cb(null, common.async(function() {
      var allArgs = common.argsToArray(arguments);
      var last = allArgs.length - 1;
      var evaluatedArgs = allArgs.slice(last);
      var resultCb = evaluatedArgs[last];
      lvars = common.bindFunctionArgs(lvars0, argList, evaluatedArgs);
      var assigned = false;
      var result = undefined;
      var err = undefined;
      evaluateInSequence(
	lvars,
	compiledBody, undefined, resultCb);
    }));
  }
}

function getSymbolsAndCompiled(bindings) {
  var n = bindings.length/2;
  var symbols = new Array(n);
  var compiled = new Array(n);
  for (var i = 0; i < n; i++) {
    var offset = 2*i;
    symbols[i] = bindings[offset + 0];
    compiled[i] = bindings[offset + 1];
  }
  return [symbols, compiled];
}

function evaluateAndBindVars(lvars, symbols, compiled, cb) {
  if (symbols.length == 0) {
    cb(null, lvars);
  } else {
    var sym = getName(symbols[0]);
    var promisedValue = new PromisedValue(undefined);
    var c = first(compiled);
    c(lvars, function(err, result) {
      if (err) {
	cb(err);
      } else {
	promisedValue.set(result);
	evaluateAndBindVars(lvars.set(sym, result),
			    rest(symbols), rest(compiled), cb);
      }
    });
  }
}

function MakeLet0(args) {
  var bindings = first(args);
  var body = rest(args);
  assert(bindings.length % 2 == 0);
  var symbolsAndCompiled = getSymbolsAndCompiled(bindings);
  var symbols = symbolsAndCompiled[0];
  var compiled = symbolsAndCompiled[1];
  return function(lvars0, cb) {
    evaluateAndBindVars(lvars0, symbols, compiled, function(err, lvars) {
      if (err) {
	cb(err);
      } else {
	evaluateInSequence(lvars, compileArray(body), undefined, cb);
      }
    });
  };
}


var specialForms = {
  'if': MakeIf,
  'quote': MakeQuote,
  'do': MakeDo,
  'fn': MakeFn,
  'afn': MakeAfn,
  'let0': MakeLet0
};


function compileComplex(x) {
  var f = first(x);
  var args = rest(x);
  if (typeof f == 'string' || isSymbol(f)) {
    /* Can be
       
      - special form
      - operator
      - method or property access
      - a local variable binding
      
      */
    if (common.contains(specialForms, f)) {
      var v = specialForms[f](args);
      assert(v);
      return v;
    } else {
      var opfun = common.getOperatorFunction(x);
      if (opfun) {
	return compileComplex([opfun].concat(args));
      }
      return null;
    }
  } else if (common.isAsync(f)) {
    assert(!isMacro(x));
    return compileAsyncCall(x);
  } 
}

function compileSub(x) {
  if (common.isArray(x)) {
    if (x.length > 0) {
      return compileComplex(x);
    }
  }
  return x;
}

function compile(x) {
  return compiled(compileSub(x));
}

module.exports.isCompiled = isCompiled;
module.exports.compile = compile;
module.exports.compiled = compiled;
module.exports.eval = eval;
