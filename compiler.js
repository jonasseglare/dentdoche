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
//  try {
    console.log('Inside eval');
    if (isCompiled(x)) {
      console.log('It is compiled, evaluate it');
      var ret = x(lvars, cb);
    } else {
      console.log('Pass it on: '+ x);
      cb(null, x);
    }
/*  } catch (e) {
    console.log('The error is '+ e);
    cb(e);
  }*/
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
  console.log('compiled forms = ' + compiledForms);
  console.log('result         = ' + result);
  
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
  console.log(' ---> args         = %j', args);
  console.log(' ---> compiledBody = ' + compiledBody);  
  return function(lvars0, cb) {
    cb(null, function() {
      var evaluatedArgs = common.argsToArray(arguments);
      lvars = common.bindFunctionArgs(lvars0, argList, evaluatedArgs);
      console.log(' ---> lvars = ' + lvars);
      console.log(' ---> compiledBody = ' + compiledBody);
      evaluateInSequence(lvars, compiledBody, undefined, cb);
    });
  }
}


var specialForms = {
  'if': MakeIf,
  'quote': MakeQuote,
  'do': MakeDo,
  'fn': MakeFn
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
      var v = specialForms[f](args);
      assert(v);
      return v;
    } else {
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
