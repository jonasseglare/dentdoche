var immutable = require('immutable');
var common = require('./common');
var assert = require('assert');
var first = common.first;
var rest = common.rest;
var tagged = common.tagged;

function splitBindings(bindings) {
  var n = bindings.length/2;
  var dst = new Array(n);
  for (var i = 0; i < n; i++) {
    var offset = 2*i;
    dst[i] = bindings.slice(offset, offset + 2);
  }
  return dst;
}

function mergeSplits(splits) {
  return Array.prototype.concat.apply([], splits);
}

function destructureBinding(x) {
  assert(x.length == 2);
  if (common.isArray(x[0])) {
    var vars = x[0];
    var n = vars.length;
    var dst = new Array(2, 2*n);
    var temp = common.gensym();
    dst[0] = temp;
    dst[1] = x[1];
    for (var i = 0; i < n; i++) {
      var offset = 2*(i + 1);
      dst[offset + 0] = vars[i];
      dst[offset + 1] = [common.jsGet, common.sym(temp), i];
    }
    return dst;
  }
  return null;
}

function destructureBindings(bindings) {
  assert(bindings.length % 2 == 0);
  var splits = splitBindings(bindings);
  var wasDestructured = false;
  for (var i = 0; i < splits.length; i++) {
    var destructured = destructureBinding(splits[i]);
    if (destructured) {
      wasDestructured = true;
      splits[i] = destructured;
    }
  }
  if (wasDestructured) {
    return destructureBindings(mergeSplits(splits));
  }
  return bindings;
}

function echo(x) {
  console.log('  Echo: %j', x);
  return x;
}

function isCompiled(x) {
  if (typeof x == 'function') {
    return x.compiled;
  }
  return false;
}

function compiled(x) {
  if (typeof x == 'object' || typeof x == 'function') {
    if (x) {
      x.compiled = true;
    }
  }
  return x;
}

function eval(lvars, x, cb) {
  if (isCompiled(x)) {
    var ret = x(lvars, cb);
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
  assert(typeof cb == 'function');
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
  var body = rest(args);
  var compiledBody = compileArray(body);
  
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
      var evaluatedArgs = allArgs.slice(0, last);
      var resultCb = allArgs[last];
      assert(typeof resultCb == 'function');
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
    compiled[i] = compile(bindings[offset + 1]);
  }
  return [symbols, compiled];
}

function evaluateAndBindVars(lvars, symbols, compiled, cb) {
  if (symbols.length == 0) {
    cb(null, lvars);
  } else {
    var sym = common.getName(symbols[0]);
    var promisedValue = new common.PromisedValue(undefined);
    var c = first(compiled);
    eval(lvars.set(sym, promisedValue), c, function(err, result) {
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

function MakeLet(args) {
  var bindings = destructureBindings(first(args));
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

function MakeErrAndVal(args) {
  assert(args.length == 1);
  var c = compile(args[0]);
  return function(lvars, cb) {
    eval(lvars, c, function(err, value) {
      cb(null, [err, value]);
    });
  }
}

function MakeLater(args0) {
  var args = compileArray(args0);
  return function(lvars, cb) {
    setTimeout(function() {
      evaluateInSequence(lvars, args, undefined, cb);
    }, 0);
  };
}

var specialForms = {
  'if': MakeIf,
  'quote': MakeQuote,
  'do': MakeDo,
  'fn': MakeFn,
  'afn': MakeAfn,
  'let': MakeLet,
  'errAndVal': MakeErrAndVal,
  'later': MakeLater
};


function compileCall(x) {
  var f = first(x);
  var args = compileArray(rest(x));
  var n = args.length;
  return function(lvars, cb) {
    var result = new common.ResultArray(n, function(err, evaluatedArgs) {
      if (err) {
	cb(err);
      } else {
	try {
	  var out = f.apply(null, evaluatedArgs)
	  cb(null, out);
	} catch(e) {
	  cb(e);
	}
      }
    });
    for (var i = 0; i < n; i++) {
      eval(lvars, args[i], result.makeSetter(i));
    }
  };
}

function evaluateArrayElements(lvars, array, cb) {
  var n = array.length;
  var result = new common.ResultArray(n, cb);
  for (var i = 0; i < n; i++) {
    var x = array[i];
    eval(lvars, x, result.makeSetter(i));
  }
}

function compileAsyncCall(x) {
  var f = first(x);
  var args = compileArray(rest(x));
  var n = args.length;
  return function(lvars, cb) {
    var result = new common.ResultArray(n, function(err, evaluatedArgs) {
      if (err) {
	cb(err);
      } else {
	//try {
	  var x = f.apply(null, evaluatedArgs.concat([cb]));
	//} catch(e) {
	  //cb(e);
	//}
      }
    });
    for (var i = 0; i < n; i++) {
      eval(lvars, args[i], result.makeSetter(i));
    }
  }
}

function compileBoundFunction(args0) {
  var key = common.getName(first(args0))
  var args = compileArray(rest(args0));
  return function(lvars, cb) {
    evaluateArrayElements(lvars, args, function(err, evaluated) {
      var f = common.getLocalVar(lvars, key);
      if (typeof f == 'function') {
	try {
	  if (common.isAsync(f)) {
	    f.apply(null, evaluated.concat([cb]));
	  } else {
	    cb(null, f.apply(null, evaluated));
	  }
	} catch (e) {
	  cb(e);
	}
      } else {
	console.log('THE LVARS ARE: ');
	console.log(lvars);
	console.log(new Error('Unbound function ' + key));
      }
    });
  }
}

function isPropertyAccess(f) {
  if (typeof f == 'string') {
    if (f.length > 0) {
      if (f[0] == '.') {
	return true;
      }
    }
  }
  return false;
}

function compileGetField(field, obj0) {
  return function(lvars, cb) {
    eval(lvars, obj0, function(err, obj) {
      if (err) {
	cb(err);
      } else {
	try {
	  cb(null, obj[field]);
	} catch (e) {
	  cb(e);
	}
      }
    });
  };
}

function compileSetField(field, args0) {
  return function(lvars, cb) {
    evaluateArrayElements(lvars, args0, function(err, args) {
      if (err) {
	cb(err);
      } else {
	try {
	  var dst = args[0];
	  var newValue = args[1];
	  dst[field] = newValue;
	  cb();
	} catch(e) {
	  cb(e);
	}
      }
    });
  }
}

function compileFieldAccess(x) {
  var f = first(x);
  var args = compileArray(rest(x));
  var field = f.slice(2);
  assert(args.length == 1 || args.length == 2);
  if (args.length == 1) {
    return compileGetField(field, args[0]);
  } else {
    return compileSetField(field, args);
  }
}

function compileMethodAccess(x) {
  var f = first(x).slice(1);
  var args0 = compileArray(rest(x));
  return function(lvars, cb) {
    evaluateArrayElements(lvars, args0, function(err, evaluated) {
      var obj = first(evaluated);
      var args = rest(evaluated);
      var fun = obj[f];
      try {
	if (common.isAsync(fun)) {
	  fun.apply(obj, args.concat([cb]));
	} else {
	  cb(null, fun.apply(obj, args));
	}
      } catch (e) {
	cb(e);
      }
    });
  };
}

function compilePropertyAccess(x) {
  var f = first(x);
  if (f.length >= 2) {
    if (f[1] == '-') {
      return compileFieldAccess(x);
    } else {
      return compileMethodAccess(x);
    }
  }
}

function compileStringForm(x, f, args) {
  // Treat strings and symbols the same when
  // they appear in the beginning of an S-expr.
  f = common.getName(f);
  
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
    var opfun = common.getOperatorFunction(f);
    if (opfun) {
      return compileComplex([opfun].concat(args));
    } else if (isPropertyAccess(f)) {
      return compilePropertyAccess(x);
    } else {
      return compileBoundFunction(x);
    }
    console.log('Failed to compile:');
    console.log(x);
    throw new Error('Failed to compile');
    return null;
  }
}

function compileGeneratedFunctionCall(x) {
  var allArgs = compileArray(x);
  var f = first(allArgs);
  var args = rest(allArgs);
  return function(lvars, cb) {
    eval(lvars, f, function(err, fun) {
      if (err) {
	cb(err);
      } else if (!(typeof fun == 'function')) {
	console.log('THIS FORM IS NOT A FUNCTION');
	console.log(first(x));
	cb(new Error('Not a function return from form'));
      } else {
	evaluateArrayElements(lvars, args, function(err, evaluatedArgs) {
	  try {
	    if (common.isAsync(fun)) {
	      fun.apply(null, evaluatedArgs.concat([cb]));
	    } else {
	      cb(null, fun.apply(null, evaluatedArgs));
	    }
	  } catch (e) {
	    cb(e);
	  }
	});
      }
    });
  };
}

function compileComplex(x) {
  var f = first(x);
  var args = rest(x);
  if (typeof f == 'string' || common.isSymbol(f)) {
    return compiled(compileStringForm(x, f, args));
  } else if (typeof f == 'function') {
    if (common.isAsync(f)) {
      assert(!common.isMacro(x));
      return compileAsyncCall(x);
    } else if (common.isMacro(f)) {
      return compile(f.apply(null, args));
    } else {
      return compileCall(x);
    }
  } else if (common.isArray(f)) {
    return compileGeneratedFunctionCall(x);
  }
}

function compileBindingEvaluator(sym) {
  var key = common.getName(sym);
  return function(lvars, cb) {
    if (lvars.has(key)) {
      cb(null, common.getLocalVar(lvars, key));
    } else {
      var fun = common.getOperatorFunction(key);
      if (fun) {
	return fun;
      } else {
	console.log('Failed to resolve binding to ' + key);
	cb(new Error('No such local binding to ' + key));
      }
    }
  };
}

function compile(x) {
  if (common.isArray(x)) {
    if (x.length > 0) {
      return compiled(compileComplex(x));
    }
  } else if (common.isSymbol(x)) {
    var fun = common.getOperatorFunction(common.getName(x));
    if (fun) {
      return fun;
    } else {
      return compiled(compileBindingEvaluator(x));
    }
  }
  return x;
}

function makeAnyFun(builder, args) {
  var fnBuilder = builder(args);
  var fun = undefined;
  fnBuilder(immutable.Map({}), function(err, compiledFun) {
    fun = compiledFun;
  });
  assert(fun);
  return fun;
}

function makeFn() {
  return makeAnyFun(MakeFn, common.argsToArray(arguments));
}

function makeAfn() {
  return makeAnyFun(MakeAfn, common.argsToArray(arguments));
}



function evaluateForm(lvars, frm, cb) {
  var c = compile(frm);
  eval(common.makeImmutableMap(lvars), c, cb);
}

// http://stackoverflow.com/questions/10465423/how-can-i-list-all-the-functions-in-my-node-js-script
// http://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
// http://stackoverflow.com/questions/5447771/node-js-global-variables


module.exports.isCompiled = isCompiled;
module.exports.compile = compile;
module.exports.compiled = compiled;
module.exports.eval = eval;
module.exports.makeAfn = makeAfn;
module.exports.makeFn = makeFn;
module.exports.destructureBindings = destructureBindings;
module.exports.evaluateForm = evaluateForm;
