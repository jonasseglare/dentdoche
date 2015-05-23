var dd = require('../index.js');
var assert = require('assert');
var immutable = require('immutable');

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
    dd.evaluateNow({k: 3}, ["+", 119, dd.sym('k')], function(err, value) {
      assert(value == 122);
      done();
    })
  });

  it('getOperatorFunction', function() {
    var f = dd.getOperatorFunction('+');
    assert(typeof f == 'function');
  });

    it('evaluate string concat', function(done) {
      dd.evaluateForm(null, ['+', 'Rulle', ' ', 'Östlund'], function(err, value) {
	assert.equal(value, 'Rulle Östlund');
	done();
      });
  });

  it('fn', function() {
    var f = dd.fn(['a', 'b', 'c'],
		   ['+', ['-', dd.sym('a'), dd.sym('b')],
		    dd.sym('c')]);
    assert(typeof f == 'function');
    assert(f(9, 10, 11) == 10);
  });

  it('afn', function(done) {
    var f = dd.afn(['a', 'b', 'c'],
		   ['+', ['-', dd.sym('a'), dd.sym('b')],
		    dd.sym('c')]);
    assert(typeof f == 'function');
    f(9, 10, 11, function(err, value) {
      assert(value == 10);
      done();
    });
  });

  it('myAdd', function(done) {
    var myAdd = dd.afn(['a', 'b'],
		      ['+', dd.sym('a'), dd.sym('b')]);
    var add3 = dd.afn(['a', 'b', 'c'],
		      [myAdd, dd.sym('a'),
		       [myAdd, dd.sym('b'),
			dd.sym('c')]]);
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
	   ['+', dd.sym('a'), dd.sym('b')]], function(err, result) {
	     assert(result == 70);
	     done();
	   });
  });

  it('fn2', function(done) {
    dd.evaluateForm(
      null,
      ['let', ['k', ['fn', ['a', 'b'], ['+', ['*', dd.sym('a'), dd.sym('a')],
					     ['*', dd.sym('b'), dd.sym('b')]]]],
       [dd.sym('k'), 3, 4]],
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
       [dd.array, dd.sym('a'), dd.sym('b')]],
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
		       ['if', ['==', 0, dd.sym('n')],
			1,
			['*', dd.sym('n'),
			 ['fak', ['-', dd.sym('n'), 1]]]]]],
       [dd.sym('fak'), 7]],
      function(err, value) {
	assert.equal(value, 1*2*3*4*5*6*7);
	done();
      }
    );
  });

  it('Complex call', function(done) {
    dd.evaluateForm(
      null,
      [['fn', ['a', 'b'], ['+', ['*', dd.sym('a'), dd.sym('a')],
			   ['*', dd.sym('b'), dd.sym('b')]]],
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
       ['.-b', dd.sym('q')]],
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
			   [dd.array, dd.sym("a"), dd.sym("b")]]);
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
       [dd.set, dd.sym("x"), "RULLE", 119],
       [dd.array, dd.sym("x"), [dd.get, dd.sym("x"), "RULLE"]]],
      function(err, value) {
	assert(!err);
	console.log("value = %j", value);
	assert.equal(value.length, 2);
	assert.equal(value[1], 119);
      }
    );
  });

  it('should map', function() {
    dd.evaluateForm(null, [dd.map, dd.sym("+"),
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
    var f = dd.fn([], dd.sym("arguments"));
    var result = f(1, 2, 3);
    console.log('result = %j', result);
    assert(result.length == 3);
    assert(result[1] == 2);
  });
});
