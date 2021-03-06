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

eval(dd.parse("(dfn fib (x) (if (< x 2) x (+ (fib (- x 1)) (fib (- x 2)))))"
              + "(dafn fiba (x) (if (< x 2) x (later (+ (fiba (- x 1)) (fiba (- x 2))))))"));

function Obj(secret) {
  this.param = secret;
}

Obj.prototype.getParamSync = function() {
  return this.param;
};

Obj.prototype.getParamAsync = dd.setAsync(function(cb) {
  cb(null, this.param);
});

Obj.prototype.getParamAsync1 = dd.setAsync1(function(cb) {
  cb(this.param);
});


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
                         '(console.log (+ "Iterations left: " i))' +
                         '(if (= i 0) (return product) (next (* product i) (- i 1)))))');
    console.log(x);
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

  it('TrySomething', function(done) {
    var x = dd.parse('(dafn katt (x) (console.log "WRITE SOMETHING"))');
    eval(x);
    katt('9', function(err, value) {
      done();
    });
  });

  it('Quote', function(done) {
    var x = dd.parse("(dfn m () '(1 2 3))")
    console.log('x = ' + x);
    eval(x);
    console.log('m = %j', m());
    done();
  });

  it('fibSync', function(done) {
    var fibRef = function(x) {return (x < 2? x : fibRef(x-1) + fibRef(x-2));}
    var value = fib(7);
    assert(value == 13);
    fiba(7, function(err, value) {
      assert(!err);
      assert(value == 13);
      done();
    });
  });

  it('binding', function(done) {
    eval(dd.parse('(def rulleMjaoMjao (+ 3 4))'));
    assert(rulleMjaoMjao == 7);
    done();
  });

  it('require', function() {
    eval(dd.parse('(def myLocalFs (require "fs"))'));
    assert(myLocalFs.writeFile);
  });

  it('async1', function() {
    function someFunction(a, b, cb) {
      cb(a + b);
    }
    dd.setAsync1(someFunction);

    var x = dd.parse('(def result (someFunction 3 6))');
    eval(x);
    assert(result == 9);
  });

  it('sync modes', function() {
    function myFun(a, b, cb) {
      if (cb) {
        cb(null, a + b);
      }
      return a*b;
    }

    eval(dd.parse('(def a (async (myFun 3 4))) (def b (myFun 3 4))'));
    assert(a == 3 + 4);
    assert(b == 3*4);
  });
  
  it('sync modes 2', function() {
    function myFun(a, b, cb) {
      if (cb) {
        cb(null, a + b);
      }
      return a*b;
    }
    dd.setAsync(myFun);

    eval(dd.parse('(def a (myFun 3 4)) (def b (sync (myFun 3 4)))'));
    assert(a == 3 + 4);
    assert(b == 3*4);
  });

  it('Property access', function() {
    var secret = 199;
    var x = dd.parse('(def obj (new Obj secret)) ' +
                     '(console.log (+ "Obj is " obj))' +
                     '(def a (.getParamSync obj)) (def b (.getParamAsync obj))'+
                     '(def c (.-param obj))' +
                     '(.-param obj 12)'+
                     '(def d (.-param obj))'+
                     '(def e (.getParamAsync1 obj))');
    eval(x);
    assert(a == secret);
    assert(b == secret);
    assert(c == secret);
    assert(d == 12);
    assert(e == 12);
  });

  it('local funs', function(done) {
    eval(dd.parse('(def fa (fn (a b) (+ (* a a) (* b b))))'));
    eval(dd.parse('(def fb (afn (a b) (+ (* a a) (* b b))))'));
    assert(fa(3, 4) == 25);
    fb(3, 4, function(err, value) {
      assert(!err);
      assert(value == 25);
      done();
    });
  });

  it('override with sync', function(done) {
    dd.setAsync(fs.readFile);
    eval(dd.parse('(def y (sync (fs.readFile "nonexistantfile" (fn (err value) (done)))))'));
    assert(!y);
  });
});

