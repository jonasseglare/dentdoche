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

  it('let0', function() {
    var k = c.compile(['let0', ['a', ['if', false, 0, 34]], dd.sym('a')]);
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
    var k = c.compile(['let0', ['f', ['fn', ['a', 'b'],
				      ['*', dd.sym('a'), dd.sym('b')]]],
		       ['f', 3, 4]]);
    c.eval(im, k, function(err, result) {
      assert(!err);
      assert(result == 12);
    });
  });

  
  /*it('eval string', function() {
    var d = 119;
    var evaled = c.evalString('d');
    console.log('Evaled:');
    console.log(evaled);
  })*/
});

