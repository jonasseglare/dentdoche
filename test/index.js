var dd = require('../index.js');
var assert = require('assert');

describe('evaluateSymbol', function() {
  it('Should evaluate a symbol', function() {
    var sym = new dd.Symbol("a");
    var v = dd.evaluateSymbol({a: 119}, sym);
    assert.equal(v, 119);
  });
  
  it('Should evaluate a symbol deeper', function() {
    var sym = new dd.Symbol("a");
    var v = dd.evaluateSymbol({___next: {a: 119}}, sym);
    assert.equal(v, 119);
  });

  it('Should evaluate a symbol with pushLocalVars', function() {
    var sym = new dd.Symbol("a");
    var v = dd.evaluateSymbol(dd.pushLocalVars({}, {a: 119}), sym);
    assert.equal(v, 119);
  });

  it('Should study async tagging', function() {
    var x = function(x) {console.log('mjao, %j', x);};
    assert(dd.isAsync(dd.async(x)));
    assert(!dd.isAsync(console.log));
  });
  
  it('evaluateForm', function(done) {
    dd.evaluateForm({}, 119, function(err, value) {
      assert(value == 119);
      done();
    })
  });

  it('evaluateForm2', function(done) {
    dd.evaluateNow({}, ["+", 2, 3], function(err, value) {
      assert(value == 5);
      done();
    })
  });
  
  it('evaluateForm nested', function(done) {
    dd.evaluateNow({}, ["-", ["+", 2, 3], 14], function(err, value) {
      assert(value == -9);
      done();
    })
  });
  
  it('evaluateForm many args', function(done) {
    dd.evaluateNow({}, ["+", 1, 2, 3, 4], function(err, value) {
      assert(value == 10);
      done();
    })
  });

  it('evaluateForm negate', function(done) {
    dd.evaluateNow({}, ["-", 119], function(err, value) {
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
      dd.evaluateForm({}, ['+', 'Rulle', ' ', 'Östlund'], function(err, value) {
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

  it('fna', function(done) {
    var f = dd.fna(['a', 'b', 'c'],
		   ['+', ['-', dd.sym('a'), dd.sym('b')],
		    dd.sym('c')]);
    assert(typeof f == 'function');
    f(9, 10, 11, function(err, value) {
      assert(value == 10);
      done();
    });
  });

  it('myAdd', function(done) {
    var myAdd = dd.fna(['a', 'b'],
		      ['+', dd.sym('a'), dd.sym('b')]);
    var add3 = dd.fna(['a', 'b', 'c'],
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
      {}, ["do",
	   [console.log, "RULLE!"],
	   [console.log, "SIGNE!"],
	  119],
      function(err, result) {
	assert.equal(result, 119);
	done();
      });
  });
});
