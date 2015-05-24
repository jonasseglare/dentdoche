var assert = require('assert');
var immutable = require('immutable');
var fs = require('fs');
var c = require('../compiler.js');

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
    console.log('Here we are');
    c.eval(im, k, function(err, value) {
      assert(typeof value == 'function');
      assert(!err);
      assert(value() == 4);
    });
    console.log('Done');
  });
});
