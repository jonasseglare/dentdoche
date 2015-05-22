var dd = require('../index.js');
var assert = require('assert');

describe('evaluateSymbol', function() {
  it('Should evaluate a symbol', function() {
    var sym = new dd.Symbol("a");
    var v = dd.evaluateSymbol({a: 119}, sym);
    assert.equal(v, 119);
  });
});
