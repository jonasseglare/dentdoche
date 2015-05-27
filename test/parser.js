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
var dd = require('../index.js');
var fs = require('fs');

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

  it('Parse a string', function() {
    assert(parser.isParsedSymbolOrNumber(parser.parseRaw('abc')));
    assert(!parser.isParsedSymbolOrNumber(parser.parseRaw('"abc"')));
    assert(parser.isParsedString(parser.parseRaw('"abc"')));
    assert(!parser.isParsedString(parser.parseRaw('abc')));
  });

  /*it('Symbol res', function() {

    
    var p = eval(parser.compileSymbolResolution('abra'));
    assert(dd.isSymbol(p));

    var q = eval(parser.compileSymbolResolution('fs.readFile'));
    assert(typeof q == 'function');
    assert(q != fs.writeFile);
    assert(q == fs.readFile);
  });*/

  it('General experiments', function() {
    var x = parser.buildEvalString([1, 2, 3, new String("Mjao"), "rulle"]);
    var z2 = parser.parseToEvalString('(1 2 3 "Mjao" rulle)');


    assert(x == z2);

    var y = eval(x);
    assert(y.length == 5);
    assert(typeof y[0] == 'number');
    assert(typeof y[3] == 'string');
    assert(dd.isSymbol(y[4]));
  });

  it('Function defs', function() {
    var x = parser.parse('(dfn katt (a b) (+ a b))');
    //console.log(x);
    eval(x);
    assert.equal(katt(3, 4), 7);
  });

  it('Product', function(done) {
    var lg = function(x) {console.log(x);}

    var y = dd.sym("console.log", eval("try{console.log;} catch(e) {null;}"));
    var x = parser.parse('(dafn katt (n) (loop (product 1 i n) '+
                         ' (if (= i 0) (return product) (next (* product i) (- i 1)))))');
    eval(x);
    katt(5, function(err, value) {
      assert(value == 5*4*3*2*1);
      done();
    });
    //assert.equal(katt(3, 4), 7);
  });
  
  it('Product2', function(done) {
    var lg = function(x) {console.log(x);}

    var y = dd.sym("console.log", eval("try{console.log;} catch(e) {null;}"));
    var x = parser.parse('(dafn katt (n) (loop (product 1 i n) '+
                         '(console.log (+ "Iterations: " 1))' + 
                         ' (if (= i 0) (return product) (next (* product i) (- i 1)))))');
    eval(x);
    katt(5, function(err, value) {
      
      assert(value == 5*4*3*2*1);
      done();
    });
    //assert.equal(katt(3, 4), 7);
  });

  it('Quote', function(done) {
    eval(dd.parse('(dafn katt (x) (+ "Input: " x))'));
    katt("Mjao", function(err, value) {
      assert(value == 'Input: Mjao');
      done();
    });
  });
});