var assert = require('assert');
var immutable = require('immutable');
var fs = require('fs');
var c = require('../compiler.js');
var common = require('../common.js');
var dd = require('../index.js');

var im = immutable.Map({});

describe('compilers', function() {
  it('Test isCompiled', function() {
    assert(!c.isCompiled(1));
    assert(!c.isCompiled(function() {}));
    assert(c.isCompiled(c.compiled(function() {})));
  });

  it('Compile', function() {
    var x = c.compile(['quote', 119]);
    assert(x == 119);
    c.eval(null, x, function(err, value) {
      assert(value == 119);
    });

    var y = c.compile(['if', false, 3, 4]);
    c.eval(null, y, function(err, value) {
      assert(!err);
      assert.equal(value, 4);
    });
    var z = c.compile(['if', true, 3, 4]);
    c.eval(null, z, function(err, value) {
      assert(!err);
      assert.equal(value, 3);
    });
  });

  it('Do', function() {
    var k = c.compile(['do', 1, 2, 3, 4, ['if', false, 3, 5]]);
    assert(c.isCompiled(k));
    c.eval(null, k, function(err, value) {
      assert(!err);
      assert(value == 5);
    });
  });

  it('MakeFn', function() {
    var k = c.compile(['fn', [], ['if', false, 3, 4]]);
    assert(c.isCompiled(k));
    c.eval(im, k, function(err, value) {
      assert(typeof value == 'function');
      assert(!err);
      assert(value() == 4);
    });
  });
  
  it('MakeAfn', function() {
    var k = c.compile(['afn', [], ['if', false, 3, 119]]);
    assert(c.isCompiled(k));
    c.eval(im, k, function(err, value) {
      assert(typeof value == 'function');
      assert(!err);
      assert(common.isAsync(value));
      value(function(err, result) {
	assert(!err);
	assert(result == 119);
      });
    });
  });

  it('let', function() {
    var k = c.compile(['let', ['a', ['if', false, 0, 34]], dd.sym('a')]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert(result == 34);
    });
  });

  it('funcall syn', function() {
    var norm = function(a, b) {return Math.sqrt(a*a + b*b);};
    var k = c.compile([norm, 3, 4]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert.equal(result, 5);
    });
  });

  it('async funcall', function() {
    var norm = dd.async(function(a, b, cb) {
      cb(null, Math.sqrt(a*a + b*b));
    });
    var k = c.compile([norm, 3, 4]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert.equal(result, 5);
    });
  });

  it('and function', function() {
    var k = c.compile([dd.array, 
		       [dd.and, false, true],
		       [dd.and, true],
		       [dd.and, true, false],
		       [dd.and, true, true],
		       [dd.and, true, true, true],
		       [dd.and, true, true, false]]);
    var expected = [null, true, null, true, true, null];
    c.eval(im, k, function(err, result) {
      assert(!err);
      for (var i = 0; i < expected.length; i++) {
	assert.equal(expected[i], result[i]);
      }
    });
  });

  it('or macro', function() {
    var k = c.compile([dd.array,
		       [dd.or, false],
		       [dd.or, true],
		       [dd.or, true, false]]);
    var expected = [false, true, true];
    c.eval(im, k, function(err, result) {
      assert(!err);
      for (var i = 0; i < expected.length; i++) {
	assert.equal(expected[i], result[i]);
      }
    });
  });

  it('not function', function() {
    var k = c.compile([dd.array,
		       [dd.not, false],
		       [dd.not, true]]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert(result[0]);
      assert(!result[1]);
    });
  });

  it('no macro expansion beyond quote', function() {
    var k = c.compile([dd.quote, [dd.and, false, true]]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert(common.isMacro(result[0]));
      assert(!result[1]);
      assert(result[2]);
    });
  });

  it('should provoke an error', function() {
    var k = c.compile([assert, false]);
    c.eval(im, k, function(err, value) {
      assert(err);
      assert(!value);
    });
  });

  it('should provoke an error2', function() {
    var f = function(x) {if (!x) {throw new Error('mjao');}}
    
    var k = c.compile([f, false]);
    c.eval(im, k, function(err, value) {
      assert(err);
      assert(!value);
    });
  });

  it('error and value', function() {
    var k = c.compile(['errAndVal', [assert, false]]);
    c.eval(im, k, function(err, value) {
      assert(!err);
      assert(value.length == 2);
      assert(value[0]);
    });
  });

  it('Function', function() {
    var f = c.makeFn(['a', 'b'],
		     ['+', dd.sym('a'),
				  ['*', dd.sym('b'), dd.sym('b')]]);
    assert(typeof f == 'function');
    assert(f(2, 3) == 2 + 3*3);
  });

  it('Async function', function() {
    var f = c.makeAfn(['a', 'b'],
		      ['+', dd.sym('a'),
		       ['*', dd.sym('b'), dd.sym('b')]]);
    assert(typeof f == 'function');
    f(2, 3, function(err, result) {
      assert(!err);
      assert(result == 11);
    });
  });
  
  it('Compile local function', function() {
    var k = c.compile(['let', ['f', ['fn', ['a', 'b'],
				      ['*', dd.sym('a'), dd.sym('b')]]],
		       ['f', 3, 4]]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert(result == 12);
    });
  });
  
  it('Compile local function async', function() {
    var k = c.compile(['let', ['f', ['afn', ['a', 'b'],
				      ['*', dd.sym('a'), dd.sym('b')]]],
		       ['f', 3, 4]]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert(result == 12);
    });
  });

  it('Destructure', function() {
    var a = ['a', 1];
    var b = c.destructureBindings(a);
    assert(a[0] == b[0]);
    assert(a[1] == b[1]);
    var x = c.destructureBindings([['a', 'b'], [dd.array, 3, 4]]);
    assert(x[2] == 'a');
    assert(x[4] == 'b');
  });
  
  it('Nested Destructure', function() {
    var x = c.destructureBindings([[['a', 'b'], 'c'], [dd.array, [dd.array, 3, 4], 5]]);
  });

  it('Destructure in let', function(done) {
    var fun = function() {return [3, 4];}
    var f2 = c.makeFn([],
		      ['let',
		       [['a', 'b'], [fun]],
		       ['*', dd.sym('a'), dd.sym('b')]]);
    assert.equal(f2(), 12);
    done();
  });

  it('More destructuring', function() {
    var f = c.makeFn([],
		     [dd.let, [[[['a'], 'b'], 'c'],
			      [dd.quote, [[[3], 4], 5]]],
		      ['*',
		       dd.sym('a'),
		       dd.sym('b'),
		       dd.sym('c')]]);
    assert(f() == 3*4*5);
  });

  it('Throwing errors', function() {
    var k = c.compile([dd.throw, 3]);
    c.eval(im, k, function(err, value) {
      assert(err == 3);
      assert(!value);
    });
  });

  it('Throwing errors and catching them', function() {
    var k = c.compile(['errAndVal',
		       [dd.throw, 3]]);
    c.eval(im, k, function(err, value) {
      assert(!err);
      assert(value.length == 2);
      assert(value[0] == 3);
    });
  });

  it('Multiple forms in body', function() {
    var out = [0, 0];

    var rulle = function(a, b, c) {
      return [a, b, c];
    }
    
    var f = c.makeFn(['a'], 
		     [dd.set, dd.sym('a'), 0, 33],
		     [dd.set, dd.sym('a'), 1, 44]);
    f(out);
    assert(out[0] == 33);
    assert(out[1] == 44);
  });

  it('field access', function() {
    var k = c.compile(['.-length', [dd.quote, [1, 2, 3]]]);
    c.eval(im, k, function(err, value) {
      assert(!err);
      assert(value == 3);
    });
  });


});

