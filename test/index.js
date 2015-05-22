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

  // it('evaluateForm2', function(done) {
  //   dd.evaluateForm({}, ["+", 2, 3], function(err, value) {
  //     console.log('value == %j', value);
  //     assert(value == 5);
  //     done();
  //   })
  // });

  it('getOperatorFunction', function() {
    var f = dd.getOperatorFunction('+');
    assert(typeof f == 'function');
  });
});
