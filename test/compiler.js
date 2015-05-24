var assert = require('assert');
var immutable = require('immutable');
var fs = require('fs');
var c = require('../compiler.js');

describe('compilers', function() {
  it('Test isCompiled', function() {
    assert(!c.isCompiled(1));
    assert(!c.isCompiled(function() {}));
    assert(c.isCompiled(c.compiled(function() {})));
  });

  it('Compile', function() {
    var x = c.compile(['quote', 119]);
    assert(x == 119);
  });
});
