# Dentdoche

Dentdoche is a Lisp interpreter in node.js that abstracts away the difficulties of asynchronous programming so that functions calling callbacks can be treated as regular functions returning values.

Some characteristics:
  * **No extra parser**: Dentdoche code is written using regular Javascript literals in the source code. This means that they are syntactically more bulky than standard Lisp code, but eliminates the need for an extra parser.
  * **No extra build step**: Dentdoche is just a regular node library that is included in the source code. Functions defined in Dentdoche can call Javascript functions, and Javascript functions can call function defined with Dentdoche, because Dentdoche functions compile to Javascript functions. The two languages can be used and live together, side by side, in the same source file.
  * **No promises**: Dentdoche functions compile to either regular ones that deliver their result through return values or callback-style ones, that call a callback with the result.

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
 * ```fn(argList, ..., bodyForms, ...) ```  : Create a new synchronous function, that returns its result.
 * ```afn(argList, ..., bodyForms, ...) ```: Create a new asynchronous function, that passes its result to a callback.
 * ```async(fun)``` : Mark a function ```fun``` as being asynchronous so that Dentdoche can treat it as such.
 * ```Fn(argList, ..., bodyForms, ...)```: A macro to create a local function that will, in contrast to fn, capture the local context.
 * ```Afn(argList, ..., bodyForms, ...)```: Like Fn, but asynchronous.
 * ```macro(fun)```: Mark regular function as being a macro, meaning that it will be applied to its arguments before instead of after they have been evaluated.
 * ```sym(x)```: Create a symbol from a string.

### Other things
All these work with asynchronous and synchronous functions.

Some special constructs, also common in Lisp:
 * ```let```: Bind local variables. Work like the same construct in Clojure.
 * ```do```: Evaluate the forms one at a time, returning the last one.
 * ```quote```: Prevent evaluation.
 * ```if```: If form.

Higher order functions common in Lisp:
 * ```map```: Apply a function to one or many arrays.
 * ```reduce```: Reduce an array to a single value by apply a function to pairs of elements.
 * ```filter```: Create a new array that only contains elements for which a function returns true.

Special facilities:
 * ```later```: Run a form later.
 * ```loop```: A special looping function. It takes an initial state and a function. The function returns a pair of elements. The first element is a boolean value that should be true whenever we should continue looping. The second element is the next state.
 * ```new```: Used to call Javascript constructor.

## Pitfalls
Here are some common errors to look for when debugging.

  * Forgetting commas in between array elements.
  * Using ```makeFn``` or ```fn``` for functions that depend on asynchronous computations. Use ```makeAfn``` and ```afn``` respectively, instead.

 
## To do
 * Try-catch macro.
 
## Licence
Copyright Jonas Östlund 2015.
Released under EPL (Eclipse Public Licence).