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
  x.compiled = true;
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
  var cArgs = compileArray(args);
  assert(args.length == 2 || args.length == 3);
  return compiled(function(lvars, cb) {
    eval(lvars, args[0], function(err, value) {
      if (value) {
	eval(lvars, args[1], cb);
      } else if (args.length == 3) {
	eval(lvars, args[2], cb);
      }
      cb();
    });
  });
}

function MakeQuote(args) {
  assert(args.length == 1);
  return args[0];
}

var specialForms = {
  'if': MakeIf,
  'quote': MakeQuote
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
      return specialForms[f](args);
    } else {
      return null;
    }
    
  } else if (isAsync(f)) {
    assert(!isMacro(x));
    return compileAsyncCall(x);
  } 
}

function compile(x) {
  if (common.isArray(x)) {
    if (x.length > 0) {
      return compileComplex(x);
    }
  }
  return x;
}

module.exports.isCompiled = isCompiled;
module.exports.compile = compile;
module.exports.compiled = compiled;
