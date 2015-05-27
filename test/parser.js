// S-expr to array parser: https://www.npmjs.com/package/sexp
// https://www.npmjs.com/package/sexp-tokenizer
//
// Example usage:
// eval(dd.parse('(var fs (require "fs"))'));
// eval(dd.parse('(defn abra [x] (+ 1 2 x))'));

var assert = require('assert');

describe('Trying eval', function() {
  it('Should load fs using eval', function() {
    eval('var fs = require("fs"); var abc = fs.readFile');
    assert(typeof abc == 'function');
  });
});
