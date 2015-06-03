# Dentdoche

Dentdoche is a Lisp interpreter in node.js that abstracts away the difficulties of asynchronous programming so that functions calling callbacks can be treated as regular functions returning values.

Dentdoche is just a regular node library that is included in the source code, so *no extra build step* is necessary. Functions defined in Dentdoche can call Javascript functions, and Javascript functions can call functions defined with Dentdoche, because Dentdoche functions compile to Javascript functions. The two languages can be used and live together, side by side, in the same source file.

Dentdoche code can be written either as Javascript literals, or as S-expressions that are parsed.

## Example usage
Consider this Javascript function that concatenates files:
```js
var fs = require('fs');

function filecat(srcA, srcB, dst, cb) {
  fs.readFile(srcA, 'utf8', function(err, aData) {
    if (err) {
      cb(err);
    } else {
      fs.readFile(srcB, 'utf8', function(err, bData) {
	if (err) {
	  cb(err);
	} else {
	  fs.writeFile(dst, srcA + srcB, cb);
	}
      });
    }
  });
}
```
In Dentdoche, you would write
```js
var fs = require('fs');
var dd = require('dentdoche');

dd.setAsync(fs.readFile);
dd.setAsync(fs.writeFile);

var filecat = dd.makeAfn(
  ['srcA', 'srcB', 'dst'],
  [fs.writeFile,
   dd.sym('dst'),
   ['+',
    [fs.readFile,
     dd.sym('srcA'), 'utf8'],
    [fs.readFile,
     dd.sym('srcB'), 'utf8']]]);
```
which may not be that much shorter. The structure, however, is a lot simpler. All the callbacks and error forwarding code is gone. It can also be expressed as Lisp code:
```js
eval(dd.parse(
  '(dafn filecat2 (srcA srcB dst) '+
    '(fs.writeFile dst '+
    '  (+ (fs.readFile srcA "utf8") (fs.readFile srcB "utf8"))))'));
```
Also, generalizing the function for more files is simple.
```js
var filecatMany = dd.makeAfn(
  [],
  [fs.writeFile,
   [dd.last, dd.sym('arguments')],
   [dd.reduce,
    dd.sym('+'),
    [dd.map,
     [dd.afn, ['fname'], 
      [fs.readFile, dd.sym('fname'), 'utf8']],
     [dd.butLast, dd.sym('arguments')]]]]);
```
## Documentation
The documentation is partial and written for the Dentdoche in *parsed* mode. In parsed mode, the included Dentdoche module must be named **dd** as in
```js
var dd = require('dentdoche');
```
This is because the generated code will assume that the exported symbols can be referred to as ```dd.symbolName```.

In order to just run some code for side effects, you can
```js
eval(dd.parse('(console.log (+ "Three plus four is " (+ 3 4)))'));
```
Several expressions can be evaluated within the same string:
```js
eval(dd.parse('(console.log (+ "Three plus four is " (+ 3 4))) (console.log "Hello!")'));
```
Global variables can be defined with ```def```:
```js
eval(dd.parse('(def seven (+ 3 4))'));
```
or as in
```js
eval(dd.parse('(def fs (require "fs"))'));
```
A function that delivers its result as return value can be defined with ```dfn```:
```js
eval(dd.parse('(dfn fib (x) (if (< x 2) x (+ (fib (- x 1)) (fib (- x 2)))))'));

assert(fib(7) == 13);
```
and likewise, a function that calls a callback ```cb``` as ```cb(error, result)```, can be defined as
```js
eval(dd.parse('(dafn fiba (x) (if (< x 2) x (+ (fiba (- x 1)) (fiba (- x 2)))))'));

fiba(7, function(err, value) {
  assert(value == 13);
});            
```
By default, functions not defined by Dentdoche will be assumed to return their results through their return value. However, Dentdoche can be told that they deliver their results through a callback:
```js
eval(dd.parse('(dafn loadFile (fname) (async (fs.readFile fname)))'));
```
or
```js
dd.setAsync(fs.readFile);
eval(dd.parse('(dafn loadFile (fname) (fs.readFile fname))'));
```

Anonymous functions can also be defined, either as delivering their result through return value (using ```fn```) or by calling a callback (using ```afn```):
```js
eval(dd.parse('(def fa (fn (a b) (+ (* a a) (* b b))))'));
eval(dd.parse('(def fb (afn (a b) (+ (* a a) (* b b))))'));
assert(fa(3, 4) == 25);
fb(3, 4, function(err, value) {
  assert(value == 25);
});
```
### Macros
Macros are regular Javascript functions that transform programs. Here is a macro that defines ```or``` in a lazy way:
```js
function or() {
  var args = argsToArray(arguments);
  if (args.length == 0) {
    return false;
  } else {
    return ['if', first(args), true, or.apply(null, rest(args))];
  }
} macro(or);
```

## Common pitfalls

  * Forgetting comma between array elements.
  * Using ```fn``` instead of ```afn```, or ```makeFn``` instead of ```makeAfn```.
 
## Licence
Copyright Jonas Östlund 2015.
Released under EPL (Eclipse Public Licence).