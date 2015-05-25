/*
  
  TODO:
    * Ordered evaluation of arguments.
    * Try/catch-macro.
    * Cond-macro.
    * Let-desctructuring.
    
  */
var assert = require('assert');
var immutable = require('immutable');
var util = require('util');
var common = require('./common.js');
var compiler = require('./compiler.js');
var isArray = common.isArray;
var argsToArray = common.argsToArray;
var getName = common.getName;
var async = common.async;
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
  var result = new common.ResultArray(n, function(err, v) {
    cb(err, v);
  }, true);
  for (var i = 0; i < n; i++) {
    var localArgs = new Array(collCount + 1);
    localArgs[collCount] = result.makeSetter(i);
    for (var j = 0; j < collCount; j++) {
      localArgs[j] = (colls[j])[i];
    }
    fun.apply(null, localArgs);
  }
} async(mapAsync);

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
} async(reduceAsync);


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
} async(filterAsync);



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
} async(iterate);

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


function throwFun(x, cb) {
  cb(x);
} async(throwFun)

module.exports.evaluateSymbol = evaluateSymbol;
module.exports.Symbol = Symbol;
module.exports.evaluateForm = compiler.evaluateForm;
module.exports.async = async;
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
