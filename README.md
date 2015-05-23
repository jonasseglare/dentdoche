# Dentdoche

Dentdoche is a library that provides Lisp-interpreter for node.js based on the native syntax av Javascript to represent expressions, using array literals. Why do we need this? In order to understand that, we observe that node.js makes use of callbacks, especially for input and output operations, that are asynchronous. This is useful in order not to block the single thread of node.js. Instead, operations that are time consuming, such as reading from the file system, will deliver their result by calling a callback, passing the result as a parameter. This way, the system remains responsive.

Unfortunately, the code quickly becomes very complicated if it depends a lot on asynchronous function calls. This is referred to as callback hell. There are libraries that can reduce the complexity of callbacks, as well as promised-based ones approaches, but they still don't make asynchronous code as simple as simple as synchronous code.

Dentdoche follows a different approach to simplify development of asynchronous programs. It offers a Lisp-interpretator that is aware of the asynchronous callback style of node.js. Unlike some other language extensions that intend to facilitate this, Dentdoche does not need an extra compilation step. The downside of Dentdoche is increased syntactic noise and extra overhead for interpreting programs. However, since you can mix Dentdoche-code with regular Javascript code, you can choose to use it only for those special situations where you really need to simplify the code. The good thing is that writing asynchronous code with Dentdoche is almost like writing synchronous code and you can almost entirely forget that it is asynchronous.

## Example usage
Dentdoche makes it easy to write asynchronous code as if it were synchronous code:
```js
    var dd = require('dentdoche');

    dd.async(fs.readFile);
    dd.async(fs.writeFile);

    var appendBasePath = dd.fn( // <--  A regular synchronous function
      ['fname'], // <-- Accepting a single argument
      ['+', // <-- The + operator of JS.
       '/tmp/',
       dd.sym('fname')]); // <-- Refer to the input parameter.

    var makeSomeFiles = dd.afn(
      [],
      [dd.map,
       [dd.Afn, ['filename'],
	[fs.writeFile,
	 [appendBasePath,
	  dd.sym('filename')],
	 ['+', '[Contents of file ', dd.sym('filename'), ']']]],
       dd.sym('arguments')]);

    var readAndConcatFiles = dd.afn(
      [], // <-- No named parameters
      [dd.let, ['file-fmt', 'utf8'], // <-- A local variable bound to a string.
       [dd.reduce,
	dd.sym('+'),                    
	[dd.map,                 // <-- Create a new array with the function applied to all
	 [dd.Afn, ["filename"],  // <-- Construct an anonymous, asynchronous, function.
	  //     Capital A in Afn instead of afn means that
	  //     local variables will be captured (in this case file-fmt).
	  [fs.readFile,          // <-- Call to a function marked as *asynchronous*
	   [appendBasePath,      // <-- Call to previously *synchronous* function
	    dd.sym('filename')], // <-- This is a symbol referring to the filename parameter.
	   dd.sym('file-fmt')]], // <-- The captured format parameter.
	 dd.sym('arguments')]]]);// <-- An array of all parameters.
    
    var writeAndConcat = dd.afn(
      [], // <-- No named parameters
      [dd.let, ['files', [dd.quote, // <-- Special form to prevent evaluation
			  ['aa.txt', 'bb.txt', 'cc.txt']]], // <-- An array of data.
       [dd.apply,
	makeSomeFiles, dd.sym('files')],
       [dd.apply,
	readAndConcatFiles, dd.sym('files')]]);

    writeAndConcat(function(err, concatenated) {
      console.log('Concated files: %j', concatenated);
      done();
    });
```
which will output the following:
```
Concated files: "[Contents of file aa.txt][Contents of file bb.txt][Contents of file cc.txt]"
```
And of course there are macros too:
```js
    myAnd = dd.macro(function() {
      var args = dd.argsToArray(arguments);
      if (args.length == 1) {
	return args[0];
      } else {
	// Recursive macro:
	return ["if", args[0], [myAnd].concat(args.slice(1))];
      }
    });

    var myAnd3 = dd.fn(
      ['a', 'b', 'c'],
      [myAnd, dd.sym('a'), dd.sym('b'), dd.sym('c')]
    );

    console.log('False and true and false is %j', myAnd3(false, true, false));
    console.log('True and true true is %j', myAnd3(true, true, true));

```

## Basics
Dentdoche distinguishes between two types of functions: synchronous and asynchronous ones. Functions in Dentdoche are regular Javascript functions. To use Dentdoche, you first install it using npm by typing:
```
npm install dentdoche --save
```
Then you need to ```require``` it inside your source code by writing at the top of your source code file:
```
var dd = require('dentdoche');
```

To define a synchronous function using Dentdoche, you call the ```fn``` function:
```js
var myMul = dd.fn(['a', 'b'], ['*', dd.sym('a'), dd.sym('b')]);
```

The variable ```myMul``` will now contain a regular function equivalent to
```js
var myMulJS = function(a, b) {return a*b;}
```

An asynchronous version of this function can be defined as

```js
var myMulAsync = dd.afn(['a', 'b'], ['*', dd.sym('a'), dd.sym('b')]);
```

That function is equivalent do
```js
var myMulAsyncJS = function(a, b, cb) {
  try {
    cb(null, a*b);
  } catch (e) {
    cb(e);
  }
}

```
Note that the two versions in Dentdoche are almost the same except for that we use ```dd.afn``` in the synchronous case instead of ```dd.fn```, whereas in the node.js case they are very different (although one could easily write a function that converts a generic synchronous function to an asynchronous one).

## Documentation
See the test cases for details how to use Dentdoche.

Here is a summary of important functions/macros:
 * ```js fn(argList, ..., bodyForms, ...) ```  : Create a new synchronous function, that returns its result.
 * ```js afn(argList, ..., bodyForms, ...) ```: Create a new asynchronous function, that passes its result to a callback.
 * ```js async(fun)``` : Mark a function ```fun``` as being asynchronous so that Dentdoche can treat it as such.
 * ```js Fn(argList, ..., bodyForms, ...)```: A macro to create a local function that will, in contrast to fn, capture the local context.
 * ```js Afn(argList, ..., bodyForms, ...)```: Like Fn, but asynchronous.
## To do
 * Try-catch macro.

## Licence
Copyright Jonas Östlund 2015.
Released under EPL (Eclipse Public Licence).