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
  try {
    if (isCompiled(x)) {
      x(lvars, cb);
    } else {
      cb(null, x);
    }
  } catch (e) {
    cb(e);
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
  console.log('Make if for %j', args);
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
  console.log('Compiled forms length is %j', compiledForms.length);
  if (compiledForms.length == 0) {
    cb(null, result);
  } else {
    var a = first(args);
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

var specialForms = {
  'if': MakeIf,
  'quote': MakeQuote,
  'do': MakeDo
};


function compileComplex(x) {
  var f = first(x);
  var args = rest(x);
  if (typeof f == 'string') {
    /* Can be
       
      - special form
      - operator
      - method or property access
      - a local variable binding
      
      */
    if (common.contains(specialForms, f)) {
      console.log('Special form %j', f);
      var v = specialForms[f](args);
      console.log('Returned '+ v);
      assert(v);
      return v;
    } else {
      return null;
    }
    
  } else if (isAsync(f)) {
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
