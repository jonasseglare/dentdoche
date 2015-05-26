var dd = require('../index.js');
var assert = require('assert');
var immutable = require('immutable');
var fs = require('fs');

var fsub = dd.makeFn(
  ['n'],
  [dd.if, ["=", dd.sym('n'), 0], 1,
   ['*', dd.sym('n'),
    [factorial, ['-', dd.sym('n'), 1]]]]);


function factorial() {
  return fsub.apply(this, dd.argsToArray(arguments));
}

var fsubAsync = dd.makeAfn(
  ['n'],
  [dd.if, ["=", dd.sym('n'), 0], 1,
   ['*', dd.sym('n'),
    [factorial, ['-', dd.sym('n'), 1]]]]);


function factorialAsync() {
  fsubAsync.apply(this, dd.argsToArray(arguments));
} dd.async(factorialAsync);

describe('evaluateSymbol', function() {
  it('Should evaluate a symbol', function() {
    var sym = new dd.Symbol("a");
    var v = dd.evaluateSymbol(immutable.Map({a: 119}), sym);
    assert.equal(v, 119);
  });
  
  it('Should study async tagging', function() {
    var x = function(x) {console.log('mjao, %j', x);};
    assert(dd.isAsync(dd.async(x)));
    assert(!dd.isAsync(console.log));
  });
  
  it('evaluateForm', function(done) {
    dd.evaluateForm(null, 119, function(err, value) {
      assert(value == 119);
      done();
    })
  });

  it('evaluateForm2', function(done) {
    dd.evaluateForm(null, ["+", 2, 3], function(err, value) {
      assert(value == 5);
      done();
    })
  });
  
  it('evaluateForm nested', function(done) {
    dd.evaluateForm(null, ["-", ["+", 2, 3], 14], function(err, value) {
      assert(value == -9);
      done();
    })
  });
  
  it('evaluateForm many args', function(done) {
    dd.evaluateForm(null, ["+", 1, 2, 3, 4], function(err, value) {
      assert(value == 10);
      done();
    })
  });

  it('evaluateForm negate', function(done) {
    dd.evaluateForm(null, ["-", 119], function(err, value) {
      assert(value == -119);
      done();
    })
  });

  it('evaluateForm local var', function(done) {
    dd.evaluateForm({k: 3}, ["+", 119, dd.S('k')], function(err, value) {
      assert(value == 122);
      done();
    })
  });

  it('getOperatorFunction', function() {
    var f = dd.getOperatorFunction('+');
    assert(typeof f == 'function');
  });

    it('evaluate string concat', function(done) {
      dd.evaluateForm(null, ['+', 'Rulle', ' ', 'Mjao'], function(err, value) {
	assert.equal(value, 'Rulle Mjao');
	done();
      });
  });

  it('fn', function() {
    var f = dd.makeFn(['a', 'b', 'c'],
		   ['+', ['-', dd.S('a'), dd.S('b')],
		    dd.S('c')]);
    assert(typeof f == 'function');
    assert(f(9, 10, 11) == 10);
  });

  it('afn', function(done) {
    var f = dd.makeAfn(['a', 'b', 'c'],
		   ['+', ['-', dd.S('a'), dd.S('b')],
		    dd.S('c')]);
    assert(typeof f == 'function');
    f(9, 10, 11, function(err, value) {
      assert(value == 10);
      done();
    });
  });

  it('myAdd', function(done) {
    var myAdd = dd.makeAfn(['a', 'b'],
		      ['+', dd.S('a'), dd.S('b')]);
    var add3 = dd.makeAfn(['a', 'b', 'c'],
		      [myAdd, dd.S('a'),
		       [myAdd, dd.S('b'),
			dd.S('c')]]);
    add3(3, 4, 5, function(err, r) {
      assert.equal(r, 12);
      done();
    });
  });

  it('do', function(done) {
    dd.evaluateForm(
      null, [dd.do,
	     [console.log, "RULLE!"],
	     [console.log, "SIGNE!"],
	     119],
      function(err, result) {
	assert.equal(result, 119);
	done();
      });
  });

  it('let', function(done) {
    dd.evaluateForm(
      null, ['let', ['a', 30,
		   'b', 40],
	   ['+', dd.S('a'), dd.S('b')]], function(err, result) {
	     assert(result == 70);
	     done();
	   });
  });

  it('fn2', function(done) {
    dd.evaluateForm(
      null,
      ['let', ['k', ['fn', ['a', 'b'], ['+', ['*', dd.S('a'), dd.S('a')],
					     ['*', dd.S('b'), dd.S('b')]]]],
       [dd.S('k'), 3, 4]],
      function(err, result) {
	assert.equal(result, 25);
	done();
      });
  });

  it('if', function(done) {
    dd.evaluateForm(
      null,
      ['let', ['a', [dd.if, false, 3, 4],
	       'b', [dd.if, true, 9, 11]],
       [dd.array, dd.S('a'), dd.S('b')]],
      function(err, result) {
	assert(result.length == 2);
	assert(result[0] == 4);
	assert(result[1] == 9);
	done();
      }
    );
  });

  it('recursion', function(done) {
    dd.evaluateForm(
      null,
      ['let', ['fak', ['afn', ['n'],
		       ['if', ['==', 0, dd.S('n')],
			1,
			['*', dd.S('n'),
			 ['fak', ['-', dd.S('n'), 1]]]]]],
       [dd.S('fak'), 7]],
      function(err, value) {
	assert(!err);
	assert.equal(value, 1*2*3*4*5*6*7);
	done();
      }
    );
  });

  it('Complex call', function(done) {
    dd.evaluateForm(
      null,
      [['fn', ['a', 'b'], ['+', ['*', dd.S('a'), dd.S('a')],
			   ['*', dd.S('b'), dd.S('b')]]],
       3, 4], function(err, result) {
	 assert(!err);
	 assert.equal(result, 25);
	 done();
       });
  });

  it('Fields', function(done) {
    dd.evaluateForm(
      null,
      ['let', ['q', {b: 119}],
       ['.-b', dd.S('q')]],
      function(err, result) {
	assert(result == 119);
	done();
      });
    });

  it('Methods', function(done) {
    dd.evaluateForm(
      null,
      ['.toString', 119],
      function(err, value) {
	assert.equal(value, '119');
	done();
      });
  });

  it('Macro', function() {
    assert(!dd.isMacro(9));
    var f = function() {}
    assert(!dd.isMacro(f));
    dd.macro(f);
    assert(dd.isMacro(f));
  });

  it('myAnd macro', function() {
    
    var myAnd = undefined;
    
    myAnd = dd.macro(function() {
      var args = dd.argsToArray(arguments);
      if (args.length == 1) {
	return args[0];
      } else {
	// Recursive macro:
	return ["if", args[0], [myAnd].concat(args.slice(1))];
      }
    });

    var myAnd3 = dd.makeFn(
      ['a', 'b', 'c'],
      [myAnd, dd.sym('a'), dd.sym('b'), dd.sym('c')]
    );

    console.log('False and true and false is %j', myAnd3(false, true, false));
    console.log('True and true true is %j', myAnd3(true, true, true));

    var myFun = dd.makeFn([], ["let", ["a", [myAnd, true, true, true],
			           "b", [myAnd, true, true, false]],
			   [dd.array, dd.S("a"), dd.S("b")]]);
    var result = myFun();
    assert(result.length == 2);
    assert(result[0]);
    assert(!result[1]);

    dd.evaluateForm(null, [myAnd, true, true], function(err, value) {
      assert.equal(value, true);
    });
    
    dd.evaluateForm(null, [myAnd, true, true, true, true, false, true], function(err, value) {
      assert(!value);
    });
    
    dd.evaluateForm(null, [myAnd, true, true, true, true, true, true], function(err, value) {
      assert(value);
    });
  });

  it('get and set', function() {
    dd.evaluateForm(
      null,
      ["let", ["x", {}],
       [dd.set, dd.S("x"), "RULLE", 119],
       [dd.array, dd.S("x"), [dd.get, dd.S("x"), "RULLE"]]],
      function(err, value) {
	assert(!err);
	assert.equal(value.length, 2);
	assert.equal(value[1], 119);
      }
    );
  });

  it('shouldmap', function() {
    dd.evaluateForm(null, [dd.map,
			   dd.S("+"),
			   ["quote", [1, 2, 3]],
			   ["quote", [100, 200, 300]]],
		    function(err, result) {
		      assert.equal(result.length, 3);
		      assert.equal(result[0], 101);
		      assert.equal(result[1], 202);
		      assert.equal(result[2], 303);
		    });
  });

  it('Should get all arguments', function() {
    var f = dd.makeFn([], dd.S("arguments"));
    var result = f(1, 2, 3);
    assert(result.length == 3);
    assert(result[1] == 2);
  });

  it('Test apply sync', function() {
    dd.evaluateForm(
      null, [dd.applySync, dd.S('+'), [dd.quote, [1, 2, 3, 4]]],
      function (err, value) {
	assert(!err);
	assert(value == 10);
      });
  });

  it('Test apply async', function() {
    dd.evaluateForm(
      null, [dd.apply, dd.S('+'), ["quote", [1, 2, 3, 4, 5]]],
      function (err, value) {
	assert(!err);
	assert(value == 15);
      });
  });

  it('Test call constructor', function() {
    var MyObj = function(a) {
      this.value = a;
    }
    var result = dd.callConstructorWithArgs(MyObj, 11);
    assert.equal(result.value, 11);
  });

  it('Test call constructor 2', function() {
    var result = dd.callConstructorWithArgs(Array, 11);
    assert.equal(result.length, 11);
  });

  it('Test new', function() {
    dd.evaluateForm(null, [dd.new, Array, 34], function(err, value) {
      assert(value.length == 34);
    });
  });

  it('shouldreduce', function(done) {
    dd.evaluateForm(null, [dd.reduce,
			   dd.sym('+'),
			   ["quote",
			    [1, 2, 3, 4]]],
		    function(err, value) {
		      assert(!err);
		      assert(value);
		      done();
		    });
  });

  it('shouldreduce2', function(done) {
    dd.evaluateForm(null,
		    [dd.let,
		     ['plus', [dd.fn, ['a', 'b'],
			       ['+', dd.sym('a'),
				dd.sym('b')]]],
		     [dd.reduce,
		      dd.sym('plus'),
		      ["quote",
		       [1, 2, 3, 4]]]],
		    function(err, value) {
		      assert(!err);
		      assert(value);
		      done();
		    });
  });

  it('Should filter out odd numbers', function(done) {
    var odd = function(x) {
      return x % 2 == 1;
    }
    dd.evaluateForm(
      null, [dd.filter, odd, ["quote", [1, 2, 3, 4, 5, 6, 7, 8, 9]]],
      function(err, value) {
	assert(!err);
	var r = [1, 3, 5, 7, 9];
	assert.equal(r.length, value.length);
	for (var i = 0; i < r.length; i++) {
	  assert.equal(r[i], value[i]);
	}
	done();
      });
  });

  it('higher', function(done) {
    var plus = function(a, b) {
      return a + b;
    }
    var odd = function(x) {
      return x % 2 == 1;
    }

    var square = function(x) {
      return x*x;
    }

    var myFilter = dd.async(function(a, b, cb) {
      cb(null, 'So you want to filter ' + b);
    });

    // A function that takes all its arguments,
    // keeps the odd ones, squares them, and sums them
    // up.
    var f = dd.makeFn(
      [],
      [dd.reduce, plus,
       [dd.map, square,
	[dd.filter, odd,
	 dd.S("arguments")]]]); //]);

    /*var f2 = dd.makeAfn(
      [],
      ["do",
       [console.log, ["+", "You provided ",
		      [".-length", dd.S('arguments')],
		      " arguments"]],
       [dd.reduce, plus,
	[dd.map, square,
	 [dd.filter, odd,
	  dd.S("arguments")]]]]);*/
    
    var result = f(1, 2, 3, 4, 5, 6, 7, 8, 9);
    assert.equal(result, 165);
    done();
    /*f2(1, 2, 3, 4, 5, 6, 7, 8, 9, function(err, value) {
      assert(!err);
      assert(value == 165);
      done();
    });*/
  });

  it('Try files and async stuff', function(done) {
    dd.async(fs.readFile);
    dd.async(fs.writeFile);
    
    var addTmp = function(x) {
      return "/tmp/" + x;
    }
    
    dd.evaluateForm(
      null,
      [dd.let, ["basenames", ["quote",
			     ["a.txt", "b.txt", "c.txt"]],
	       "fullnames", [dd.map, addTmp, dd.S("basenames")],
	       "writeRulle", [dd.afn, ["fname"],
			      [dd.do,
			       [console.log, ["+", "For file ", dd.S("fname")]],
			       [fs.writeFile, dd.S("fname"), "Rulle!!!"],
			       dd.S("fname")]]],
       [dd.map, dd.S("writeRulle"), dd.S('fullnames')],
       [dd.let, ["strings", [dd.map,
			     // In case we want to make a function
			     // that doesn't capture local context,
			     // we can use dd.makeAfn. Otherwise, we should
			     // use the dd.makeAfn macro.
			    [dd.afn, ["fname"], // Forgetting to use afn here instead of fn
			                        // may cause errors: The return value will
			                        // both be used, and the async callback will
			                        // pass it on.
			     [fs.readFile, dd.S("fname"), "utf8"]],
			    dd.S("fullnames")],
		"singleString", [dd.reduce, dd.S('+'), dd.S('strings')]],
	dd.S("singleString")]],
      function(err, value) {
	assert(!err);
	assert.equal(value, 'Rulle!!!Rulle!!!Rulle!!!');
	done();
      }
    );
  });

  it('Try something here', function(done) {
    dd.evaluateForm(
      null,
      ['let', ['fak', [dd.afn, ['n'],
		       [dd.if, ['==', 0, dd.S('n')],
			1,
			['*', dd.S('n'),
			 ['fak', ['-', dd.S('n'), 1]]]]]],
       [dd.S('fak'), 7]],
      function(err, value) {
	assert(!err);
	done();
      }
    );
  });

  it('later0', function(done) {
    var fun = dd.makeAfn(['n'],
		     ["later", 1199]);
    
    fun(9, function(err, value) {
      assert.equal(value, 1199);
      done();
    });
  });
  
  it('later1', function(done) {
    setTimeout(done, 40000);
    var fun = 'undefined-fun';
    fun = dd.makeAfn(["n"],
		 [dd.let, ['inner',
			   ['afn', ['m'],
			    ['do',
			     //[console.log, ['+', 'Call inner with ', dd.sym('m')]],
  			     ['if', 
  			      [dd.sym("="),
			       0,
			       dd.sym('m')],
  			      0,
			      ['later',
			       ['+', dd.sym('m'), [dd.sym('inner'),
						   ['-', dd.sym('m'), 1]]]]]]]],
		  [dd.sym('inner'), dd.sym('n')]]);
    var n = 10;
    fun(n, function(err, sum) {
      assert(!err);
      assert.equal((n*(n + 1))/2, sum);
      done();
    });
  });

  it('looping sync', function() {
    var f = function(state) {
      var x = state[1];
      if (x == 0) {
	var result = state[0];
	return [false, result];
      } else {
	var nextState = [x*state[0], x-1];
	return [true, nextState];
      }
    }

    dd.iterate([1, 5], f, function(err, value) {
      assert.equal(value, 1*2*3*4*5);
    });
  });

  it('looping async', function(done) {
    var f = function(state) {
      var x = state[1];
      if (x == 0) {
	var result = state[0];
	return [false, result];
      } else {
	var nextState = [x+state[0], x-1];
	return [true, nextState];
      }
    }

    var n = 5;
    dd.iterate([0, n], dd.convertToAsync(f), function(err, value) {
      assert(!err);
      assert.equal(value, n*(n + 1)/2);
      done();
    });
  });

  it('looping', function(done) {
    var factorial = dd.makeAfn(
      ['n'],
      [dd.iterate,
       [dd.array, 1, dd.sym('n')],
       [dd.afn, ['state'],
	[dd.let, ['product', [dd.get, dd.sym('state'), 0],
		  'x',       [dd.get, dd.sym('state'), 1]],
	 [console.log, ['+', 'GOT THIS: ', dd.sym('product'), ' ', dd.sym('x')]],
	 [dd.if, ['=', dd.sym('x'), 0],
	  [dd.array, false, dd.sym('product')],
	  [dd.array, true, [dd.array,
			    ['*', dd.sym('product'), dd.sym('x')],
			    ['-', dd.sym('x'), 1]]]]]]]);
    
    factorial(5, function(err, value) {
      assert(!err);
      assert(value == 5*4*3*2*1);
      done();
    });
  });

  it('Concat files', function(done) {

    // Declare these functions
    // as being asynchronous
    // style. Calling a callback
    // when done.
    dd.async(fs.readFile);
    dd.async(fs.writeFile);

    var appendBasePath = dd.makeFn( // <--  A regular synchronous function
      ['fname'], // <-- Accepting a single argument
      ['+', // <-- The + operator of JS.
       '/tmp/',
       dd.sym('fname')]); // <-- Refer to the input parameter.

    var makeSomeFiles = dd.makeAfn(
      [],
      [dd.map,
       [dd.afn, ['filename'],
	[fs.writeFile,
	 [appendBasePath,
	  dd.sym('filename')],
	 ['+', '[Contents of file ', dd.sym('filename'), ']']]],
       dd.sym('arguments')]);

    var readAndConcatFiles = dd.makeAfn(
      [], // <-- No named parameters
      [dd.let, ['file-fmt', 'utf8'], // <-- A local variable bound to a string.
       [dd.reduce,
	dd.sym('+'),                    
	[dd.map,                 // <-- Create a new array with the function applied to all
	 [dd.afn, ["filename"],  // <-- Construct an anonymous, asynchronous, function.
	  //     Capital A in Afn instead of afn means that
	  //     local variables will be captured (in this case file-fmt).
	  [fs.readFile,          // <-- Call to a function marked as *asynchronous*
	   [appendBasePath,      // <-- Call to previously *synchronous* function
	    dd.sym('filename')], // <-- This is a symbol referring to the filename parameter.
	   dd.sym('file-fmt')]], // <-- The captured format parameter.
	 dd.sym('arguments')]]]);// <-- An array of all parameters.
    
    var writeAndConcat = dd.makeAfn(
      [], // <-- No named parameters
      [dd.let, ['files', [dd.quote, // <-- Special form to prevent evaluation
			  ['aa.txt', 'bb.txt', 'cc.txt']]], // <-- An array of data.
       [dd.apply,
	makeSomeFiles, dd.sym('files')],
       [dd.apply,
	readAndConcatFiles, dd.sym('files')]]);

    writeAndConcat(function(err, concatenated) {
      console.log('Concated files: %j', concatenated);
      done();
    });
  });

  it('Multiple elements in body', function() {
    var x = [0, 0, 0, 0];
    var f = dd.makeFn(
      ['X'],
      [dd.set, dd.sym('X'), 0, 119],
      [dd.set, dd.sym('X'), 2,
       ['+', [dd.get, dd.sym('X'), 0], 1]]);
    f(x);
    assert.equal(x[0], 119);
    assert.equal(x[2], 120);
  });
  
  it('Multiple elements in body2', function() {
    var x = [0, 0, 0, 0];
    var f = dd.makeAfn(
      ['X'],
      [dd.set, dd.sym('X'), 0, 119],
      [dd.set, dd.sym('X'), 2,
       ['+', [dd.get, dd.sym('X'), 0], 1]]);
    f(x, function(err, k) {
      assert.equal(x[0], 119);
      assert.equal(x[2], 120);
    });
  });

  it('Multiple elements in body3', function() {
    var x = [0, 0, 0, 0];
    var f = dd.makeFn(
      ['Y'],
      [dd.let, ['f', [dd.fn, ['X'],
		     [dd.set, dd.sym('X'), 0, 119],
		     [dd.set, dd.sym('X'), 2,
		      ['+', [dd.get, dd.sym('X'), 0], 1]]]],
       ['f', dd.sym('Y')]]);
    f(x);
    assert.equal(x[0], 119);
    assert.equal(x[2], 120);
  });

  it('Multiple elements in body4', function() {
    var x = [0, 0, 0, 0];
    var f = dd.makeAfn(
      ['Y'],
      [dd.let, ['f', [dd.afn, ['X'],
		     [dd.set, dd.sym('X'), 0, 119],
		     [dd.set, dd.sym('X'), 2,
		      ['+', [dd.get, dd.sym('X'), 0], 1]]]],
       ['f', dd.sym('Y')]]);
    f(x, function(err, v) {
      assert.equal(x[0], 119);
      assert.equal(x[2], 120);
    });
  });

  it('factorial', function() {
    assert.equal(factorial(4), 4*3*2*1);
  });
  
  it('factorialAsync', function(done) {
    factorialAsync(4, function(err, v) {
      assert.equal(v, 4*3*2*1);
      done();
    });
  });

  it('fibonacci', function() {
    var fib = dd.makeFn(
      ['dst'],
      [dd.let, ['n', 8], //['.-length', dd.sym('dst')]],
       [dd.iterate,
	[dd.quote, [0, 0, 1]],
	[dd.fn,
	 ['state'],
	 [dd.let, ['i', [dd.get, dd.sym('state'), 0],
		   'a', [dd.get, dd.sym('state'), 1],
		   'b', [dd.get, dd.sym('state'), 2]],
	  [dd.if, ['=', dd.sym('i'), dd.sym('n')],
	   [dd.array, false, dd.sym('b')],
	   [dd.do, // For: 0, 1, 2, 3, 4, 5, 6, 7
	    [dd.set, dd.sym('dst'), dd.sym('i'), dd.sym('b')],
	    [dd.array, true,
	     [dd.array, ['+', 1, dd.sym('i')],
	      dd.sym('b'), ['+', dd.sym('a'), dd.sym('b')]]]]]]]]]);
    var dst = new Array(8);
    fib(dst);
    assert(dst[7] == 21);
  });

  it('eval', function() {
    dd.evaluateForm(null, [dd.eval,
			   [dd.quote,
			    ['+', 3, 5]]], function(err, value) {
			      assert(!err);
			      assert(value == 8);
			    });
  });

  it('cond', function() {
    var digitToWord = dd.makeFn(
      ['x'],
      [dd.cond,
       ['=', dd.sym('x'), 1], 'one',
       ['=', dd.sym('x'), 2], 'two',
       ['=', dd.sym('x'), 3], 'three',
       ['+', 'unknown digit: ', dd.sym('x')]]);
    assert.equal(digitToWord(1), 'one');
    assert.equal(digitToWord(2), 'two');
    assert.equal(digitToWord(3), 'three');
    assert.equal(digitToWord(0), 'unknown digit: 0');    
  });

  it('orderedArgs', function() {
    dd.evaluateForm(
      null, [dd.orderedArgs, ['+', 1, 2, 3]], function(err, result) {
	assert(result == 6);
      });
  });

  it('loop3', function(done) {
    dd.evaluateForm(
      null,
      [dd.loop,
       ['i', 5,
	'product', 1],
       ['if', ['=', dd.sym('i'), 0],
	[dd.return, dd.sym('product')],
	[dd.next,
	 ['-', dd.sym('i'), 1],
	 ['*', dd.sym('i'), dd.sym('product')]]]],
      function(err, value) {
	console.log('err = ' + err);
	assert(!err);
	assert(value == 5*4*3*2*1);
	done();
      });
  });

  it('localvar0', function() {
    var f = dd.makeFn(['gensym0'],
		      ['let',
		       ['gensym1', dd.sym('gensym0'),
			'ab', [dd.get, dd.sym('gensym1'), 0]],
		       dd.sym('ab')]);
    assert(128 == f([128]));

  });
  
  it('loop4', function(done) {
    dd.evaluateForm(
      null,
      [dd.loop,
       ['i', 5], // <-- initialization of loop state (like let binding)
       [dd.if, ['=', 0, dd.sym('i')],
	[dd.return, 'Mjao'],
	[dd.next, ['-', dd.sym('i'), 1]]]],
      function(err, value) {
	assert(!err);
	assert(value == 'Mjao');
	done();
      });
  });

  it('try', function() {
    dd.evaluateForm(
      null,
      [dd.try,
       119,
       ['catch', 'e',
	['+', 'Caught error: ', dd.sym('e')]]],
      function(err, value) {
	assert(!err);
	assert(value == 119);
      }
    );
  });

  it('try2', function() {
    dd.evaluateForm(
      null,
      [dd.try,
       [assert, false],
       [dd.catch, 'e',
	['+', 'Caught error: ', dd.sym('e')]]],
      function(err, value) {
	assert(!err);
	assert(typeof value == 'string');
      }
    );
  });
});
