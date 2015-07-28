/*
  
  TODO:
    * More thorough validation of async method calls, as well as sync ones.
    * Default string literals to symbols, and annotate all strings with
        dd.str(...). There can be a preproc-phase where strings are replaced
	by symbols and str(...) objects are replaced by strings. Maybe. Or
	that will mean problems when recursing. Better to handle it directly in
	the compiler, maybe. Whenever there is a dd.str object, compile it
	to a string value. Otherwise, any string should be treated as a symbol.

    
  */
var assert = require('assert');
var immutable = require('immutable');
var util = require('util');
var common = require('./common.js');
var compiler = require('./compiler.js');
var isArray = common.isArray;
var argsToArray = common.argsToArray;
var getName = common.getName;
var setAsync = common.setAsync;
var PromisedValue = common.PromisedValue;
var opmap = common.opmap;
var getOperatorFunctionSub = common.getOperatorFunctionSub;
var getOperatorFunction = common.getOperatorFunction;
var evaluateSymbol = common.evaluateSymbol;
var isSymbol = common.isSymbol;
var Symbol = common.Symbol;
var first = common.first;
var rest = common.rest;
var jsGet = common.jsGet;
var jsSet = common.jsSet;
var sym = common.sym;
var toSymbol = common.toSymbol;
var tagged = common.tagged;


// Marks a function as being a macro.
function macro(x) {
  x.isMacro = true;
  return x;
}


function applySync(fun, args) {
  assert(!common.isAsync(fun));
  return fun.apply(null, args);
}

function convertToAsync(f) {
  assert(typeof f == 'function');
  if (common.isAsync(f)) {
    return f;
  } else {
    return setAsync(function() {
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

setAsync(applyAsync);

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
  var result = new common.ResultArray(n, function(err, v) {
    cb(err, v);
  });
  for (var i = 0; i < n; i++) {
    var localArgs = new Array(collCount + 1);
    localArgs[collCount] = result.makeSetter(i);
    for (var j = 0; j < collCount; j++) {
      localArgs[j] = (colls[j])[i];
    }
    fun.apply(null, localArgs);
  }
} setAsync(mapAsync);

function reduceAsync(fun0, coll, cb) {
  if (coll.length == undefined) {
    cb(null, undefined);
  } else if (coll.length == 1) {
    cb(null, coll[0]);
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
    var left = coll.slice(0, middle);
    var right = coll.slice(middle);
    reduceAsync(fun, left, function(err, value) {
      a = value;
      gotValue(err);
    });
    reduceAsync(fun, right, function(err, value) {
      b = value;
      gotValue(err);
    });
  }
} setAsync(reduceAsync);


function filterAsync(fun0, coll, cb) {
  var fun = convertToAsync(fun0);
  mapAsync(fun, coll, function(err, mask) {
    if (err) {
      cb(err);
    } else {
      var dst = new Array(mask.length);
      var counter = 0;
      for (var i = 0; i < mask.length; i++) {
	if (mask[i]) {
	  dst[counter] = coll[i];
	  counter++;
	}
      }
      cb(null, dst.slice(0, counter));
    }
  });
} setAsync(filterAsync);



function makeSpecialFormMacro(keyword) {
  return macro(function() {
    var args = argsToArray(arguments);
    return [keyword].concat(args);
  });
}

function makeFn(keyword) {
  return macro(function() {
    var args = argsToArray(arguments);
    var argList = args[0];
    var body = args.slice(1);
    return [keyword].concat([argList, ["do"].concat(body)]);
  });
}

function iterateAsync(fun, initialState, cb) {
  var state = initialState;
  var iterate = function() {
    fun(state, function(err, value) {
      if (err) {
	cb(err);
      } else {
	var cont = value[0];
	state = value[1];
	if (cont) {
	  setTimeout(iterate, 0);
	} else {
	  cb(null, state);
	}
      }
    });
  }
  iterate();
}

function iterateSync(fun, initialState, cb) {
  try {
    var state = initialState;
    while (state) {
      var next = fun(state);
      assert(next.length == 2);
      state = next[1];
      if (!next[0]) {
	break;
      }
    }
    cb(null, state);
  } catch(e) {
    cb(e);
  }
}

function iterate(initialState, fun, cb) {
  if (typeof fun == 'function') {
    if (common.isAsync(fun)) {
      iterateAsync(fun, initialState, cb);
    } else {
      iterateSync(fun, initialState, cb);
    }
  } else {
    cb(new Error(util.format('This is not a function: %j', fun)));
  }
} setAsync(iterate);

function and() {
  var args = argsToArray(arguments);
  if (args.length == 0) {
    return true;
  } else {
    return ['if', first(args), and.apply(null, rest(args))];
  }
} macro(and);

function not(x) {
  return !x;
}

function echo(x) {
  console.log(x);
  return x;
}

function or() {
  var args = argsToArray(arguments);
  if (args.length == 0) {
    return false;
  } else {
    return ['if', first(args), true, or.apply(null, rest(args))];
  }
} macro(or);


function last(x) {
  return x[x.length - 1];
}

function butLast(x) {
  return x.slice(0, x.length-1);
}

function throwFun(x, cb) {
  cb(x);
} setAsync(throwFun)

function eval(lvars, frm, cb) {
  compiler.eval(lvars, compiler.compile(frm), cb);
} setAsync(eval); common.withLVars(eval);

function cond() {
  var args = common.argsToArray(arguments);
  if (args.length == 0) {
    return undefined;
  } else if (args.length == 1) {
    return args[0];
  } else {
    return ['if', args[0], args[1], cond.apply(null, args.slice(2))];
  }
} macro(cond);

// Evaluates the arguments of a function in order.
function orderedArgs(frm) {
  assert(common.isArray(frm));
  var f = first(frm);
  var args = rest(frm);
  var n = args.length;
  var symbols = new Array(n);
  var bindings = new Array(2*n);
  var newArgs = new Array(n);
  for (var i = 0; i < n; i++) {
    symbols[i] = common.gensym();
    var offset = 2*i;
    bindings[offset + 0] = symbols[i];
    bindings[offset + 1] = args[i];
    newArgs[i] = sym(symbols[i]);
  }
  return ['let', bindings, [f].concat(newArgs)];
} macro(orderedArgs);



function mergeSymbolsAndExprs(symbols, exprs) {
  var n = symbols.length;
  assert(n == exprs.length);
  var merged = new Array(2*n);
  for (var i = 0; i < n; i++) {
    var offset = 2*i;
    merged[offset + 0] = symbols[i];
    merged[offset + 1] = sym(exprs[i]);
  }
  return merged;
}

function compileLoopFun(symbols, body) {
  var inputParam = common.gensym();
  var bindings = [symbols, sym(inputParam)];
  var doBody = ['do'].concat(body);
  return ['afn', [inputParam],
	  ['let', bindings, doBody]];
	   
}

function splitBindings(bindings) {
  assert(bindings.length % 2 == 0);
  var n = bindings.length/2;
  var symbols = new Array(n);
  var initialValues = new Array(n);
  for (var i = 0; i < n; i++) {
    var offset = 2*i;
    symbols[i] = bindings[offset + 0];
    initialValues[i] = bindings[offset + 1];
  }
  return [symbols, initialValues];
}

function loop() { // Always async loops, with setTimeout.
  var args = argsToArray(arguments);
  var split = splitBindings(first(args));
  var symbols = split[0];
  var initialState = split[1];
  var body = rest(args);
  return [iterate, [common.array].concat(initialState),
	  compileLoopFun(symbols, body)];
} macro(loop);

function loopReturn(value) {
  return [false, value];
}

function loopNext() {
  return [true, argsToArray(arguments)];
}

function tryMacro() {
  var args = argsToArray(arguments);
  var body = ["do"].concat(butLast(args));
  var c = last(args);
  if (!(c[0] == 'catch') && (typeof c[1] == 'string')) {
    console.log('ERROR IN TRY MACRO');
    console.log(args);
    return null;
  } else {
  var ev = common.gensym();

  var err = function(e) {return e[0];};
  var val = function(e) {return e[1];};

  return ['let', [ev, ['errAndVal', body]],
	  ['if', [err, sym(ev)],
	   ['let', [c[1], [err, sym(ev)]],
	    ['do'].concat(c.slice(2))],
	   [val, sym(ev)]]];
  }
} macro(tryMacro);


// For the special case of functions with no error code
function setAsync1(x) {
  return setAsync(x, 1);
}



function makeObject() {
  var args = argsToArray(arguments);
  var n = Math.floor(args.length/2);
  assert(2*n - args.length == 0, 'An even number of arguments (key-value-pairs) must be provided in order to make a json object');
  try {
    var dst = {};
    for (var i = 0; i < n; i++) {
      var offset = 2*i;
      dst[args[offset + 0]] = args[offset + 1];
    }
    return dst;
  } catch (e) {
    throw new Exception('Failed to make JSON object from ' + JSON.stringify(args));
  }
}

// a single async call
var acall = macro(function() {
  var args = argsToArray(arguments);
  return ['async', args];
});

module.exports.evaluateSymbol = evaluateSymbol;
module.exports.Symbol = Symbol;
module.exports.evaluateForm = compiler.evaluateForm;
module.exports.setAsync = setAsync;
module.exports.setAsync1 = setAsync1;
module.exports.isAsync = common.isAsync;
module.exports.getOperatorFunction = getOperatorFunction;
module.exports.S = sym;
module.exports.sym = sym;
module.exports.makeFn = compiler.makeFn; //publicFn;
module.exports.makeAfn = compiler.makeAfn;
module.exports.array = common.array;
module.exports.macro = macro;
module.exports.isMacro = common.isMacro;
module.exports.argsToArray = argsToArray;
module.exports.set = jsSet;
module.exports.get = jsGet;
module.exports.applySync = applySync;
module.exports.applyAsync = applyAsync;
module.exports.apply = applyAsync;
module.exports.callConstructorWithArgs = callConstructorWithArgs;
module.exports.new = callConstructorWithArgs;
module.exports.map = mapAsync;
module.exports.reduce = reduceAsync;
module.exports.filter = filterAsync;
module.exports.quote = makeSpecialFormMacro("quote");
module.exports.let = makeSpecialFormMacro("let");
module.exports.do = makeSpecialFormMacro("do");
module.exports.object = makeObject;

// Use for local functions, instead of fn and afn:
// Those function will not capture local variables.
module.exports.fn = makeFn("fn");
module.exports.afn = makeFn("afn");
module.exports.if = makeSpecialFormMacro("if");
module.exports.later = makeSpecialFormMacro("later");
module.exports.iterate = iterate;
module.exports.convertToAsync = convertToAsync;
module.exports.and = and;
module.exports.or = or;
module.exports.not = not;
module.exports.throw = throwFun;
module.exports.last = last;
module.exports.butLast = butLast;
module.exports.eval = eval;
module.exports.cond = cond;
module.exports.orderedArgs = orderedArgs;
module.exports.loop = loop;
module.exports.return = loopReturn;
module.exports.next = loopNext;
module.exports.echo = echo;
module.exports.try = tryMacro;
module.exports.catch = 'catch';
module.exports.isSymbol = isSymbol;
module.exports.parse = require('./parser.js').parse;
module.exports.declareAsync = common.declareAsync;
module.exports.declareAsyncMethods = common.declareAsyncMethods;
module.exports.first = first;
module.exports.rest = rest;
module.exports.gensym = common.gensym;
module.exports.acall = acall;
