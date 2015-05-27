// S-expr to array parser: https://www.npmjs.com/package/sexp
// https://www.npmjs.com/package/sexp-tokenizer
//
// Example usage:
// eval(dd.parse('(var fs (require "fs"))'));
// eval(dd.parse('(defn abra [x] (+ 1 2 x))'));
//
// https://nodejsmodules.org/tags/s-expressions

var assert = require('assert');
var parser = require('../parser.js');

describe('Trying eval', function() {
  it('Should load fs using eval', function() {
    eval('var fs = require("fs"); var abc = fs.readFile');
    assert(typeof abc == 'function');
  });

  it('Should catch exception and evaluate to 3', function() {
    assert.equal(3, eval('try {abrakadabra;} catch (e) {3;}'));
  });

  it('nested eval', function() {
    var x = eval('[1, 2, eval("try{rulleMjao;} catch(e) {3;}")]');
    assert.equal(x[2], 3);
  });

  it('nested eval to function', function() {
    var add = function(a, b) {return a + b;};
    var x = eval('[1, 2, eval("try{add;} catch(e) {119;}")]');
    assert.equal(x[2](100, 19), 119);
  });
});
