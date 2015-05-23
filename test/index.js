var dd = require('../index.js');
var assert = require('assert');
var immutable = require('immutable');
var fs = require('fs');

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
    dd.evaluateNow(null, ["+", 2, 3], function(err, value) {
      assert(value == 5);
      done();
    })
  });
  
  it('evaluateForm nested', function(done) {
    dd.evaluateNow(null, ["-", ["+", 2, 3], 14], function(err, value) {
      assert(value == -9);
      done();
    })
  });
  
  it('evaluateForm many args', function(done) {
    dd.evaluateNow(null, ["+", 1, 2, 3, 4], function(err, value) {
      assert(value == 10);
      done();
    })
  });

  it('evaluateForm negate', function(done) {
    dd.evaluateNow(null, ["-", 119], function(err, value) {
      assert(value == -119);
      done();
    })
  });

  it('evaluateForm local var', function(done) {
    dd.evaluateNow({k: 3}, ["+", 119, dd.S('k')], function(err, value) {
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
    var f = dd.fn(['a', 'b', 'c'],
		   ['+', ['-', dd.S('a'), dd.S('b')],
		    dd.S('c')]);
    assert(typeof f == 'function');
    assert(f(9, 10, 11) == 10);
  });

  it('afn', function(done) {
    var f = dd.afn(['a', 'b', 'c'],
		   ['+', ['-', dd.S('a'), dd.S('b')],
		    dd.S('c')]);
    assert(typeof f == 'function');
    f(9, 10, 11, function(err, value) {
      assert(value == 10);
      done();
    });
  });

  it('myAdd', function(done) {
    var myAdd = dd.afn(['a', 'b'],
		      ['+', dd.S('a'), dd.S('b')]);
    var add3 = dd.afn(['a', 'b', 'c'],
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
      null, ["do",
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
      ['let', ['a', ['if', false, 3, 4],
	       'b', ['if', true, 9, 11]],
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

    var myFun = dd.fn([], ["let", ["a", [myAnd, true, true, true],
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
	console.log("value = %j", value);
	assert.equal(value.length, 2);
	assert.equal(value[1], 119);
      }
    );
  });

  it('should map', function() {
    dd.evaluateForm(null, [dd.map, dd.S("+"),
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
    var f = dd.fn([], dd.S("arguments"));
    var result = f(1, 2, 3);
    console.log('result = %j', result);
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
    dd.evaluateForm(null, [dd.New, Array, 34], function(err, value) {
      assert(value.length == 34);
    });
  });

  it('Should reduce asynchronously', function(done) {
    dd.evaluateForm(null, [dd.reduce,
			   dd.S('+'),
			   ["quote",
			    [1, 2, 3, 4]]],
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

  it('Composed of filter, map, reduce', function(done) {
    var plus = function(a, b) {
      return a + b;
    }
    var odd = function(x) {
      return x % 2 == 1;
    }

    var square = function(x) {
      return x*x;
    }

    // A function that takes all its arguments,
    // keeps the odd ones, squares them, and sums them
    // up.
    var f = dd.fn(
      [],
      [dd.reduce, plus,
       [dd.map, square,
	[dd.filter, odd,
	 dd.S("arguments")]]]);

    var f2 = dd.afn(
      [],
      ["do",
       [console.log, ["+", "You provided ",
		      [".-length", dd.S('arguments')],
		      " arguments"]],
       [dd.reduce, plus,
	[dd.map, square,
	 [dd.filter, odd,
	  dd.S("arguments")]]]]);
    
    var result = f(1, 2, 3, 4, 5, 6, 7, 8, 9);
    assert.equal(result, 165);
    f2(1, 2, 3, 4, 5, 6, 7, 8, 9, function(err, value) {
      assert(!err);
      assert(value == 165);
      done();
    });
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
	       "writeRulle", ["afn", ["fname"],
			      ["do",
			       [console.log, ["+", "For file ", dd.S("fname")]],
			       [fs.writeFile, dd.S("fname"), "Rulle!!!"],
			       dd.S("fname")]]],
       [dd.map, dd.S("writeRulle"), dd.S('fullnames')],
       [dd.let, ["strings", [dd.map,
			    ["afn", ["fname"], // Forgetting to use afn here instead of fn
			                       // may cause errors: The return value will
			                       // both be used, and the async callback will
			                       // pass it on.
			     [fs.readFile, dd.S("fname"), "utf8"]],
			    dd.S("fullnames")],
		"singleString", [dd.reduce, dd.S('+'), dd.S('strings')]],
	dd.S("singleString")]],
      function(err, value) {
	assert.equal(value, 'Rulle!!!Rulle!!!Rulle!!!');
	done();
      }
    );
  });
});
