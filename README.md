# Dentdoche

Dentdoche is a library that provides Lisp-interpreter for node.js based on the native syntax av Javascript to represent expressions, using array literals. Why do we need this? In order to understand that, we observe that node.js makes use of callbacks, especially for input and output operations, that are asynchronous. This is useful in order not to block the single thread of node.js. Instead, operations that are time consuming, such as reading from the file system, will deliver their result by calling a callback, passing the result as a parameter. This way, the system remains responsive.

Unfortunately, the code quickly becomes very complicated if it depends a lot on asynchronous function calls. This is referred to as callback hell. There are libraries such as **async** that can reduce the complexity, as well as promised-based ones such **Q**, but they still don't make asynchronous code as simple as simple as synchronous code.

Dentdoche follows a different approach to simplify development of asynchronous programs. It offers a Lisp-interpretator that is aware of the asynchronous callback style of node.js. Unlike other language extensions that intend to facilitate this, such as **streamline.js**, Dentdoche does not need an extra compilation step. The downside of Dentdoche is increased syntactic noise and extra overhead for interpreting programs. However, since you can mix Dentdoche-code with regular Javascript code, you can choose to use it only for those special situations where you really need to simplify the code. The good thing is that writing asynchronous code with Dentdoche is almost like writing synchronous code and you can almost entirely forget that it is asynchronous.

## Example usage
Dentdoche makes it easy to write asynchronous code as if it were synchronous code:
```js
    dd.async(fs.readFile);
    dd.async(fs.writeFile);

    var appendBasePath = dd.fn( // <--  A regular synchronous function
      ['fname'], // <-- Accepting a single argument
      ['+', // <-- The + operator of JS.
       '/tmp/',
       dd.sym('fname')]); // <-- Refer to the input parameter.
    
    var readAndConcatFiles = dd.afn(
      [], // <-- No named parameters
      [dd.let ['file-fmt', 'utf8'], // <-- A local variable bound to a string.
       [dd.map,                 // <-- Create a new array with the function applied to all
	                        //     elements.
	[dd.Afn, ["filename"],  // <-- Construct an anonymous, asynchronous, function.
	                        //     Capital A in Afn instead of afn means that
	                        //     local variables will be captured (in this case file-fmt).
	 [fs.readFile,          // <-- Call to a function marked as *asynchronous*
	  [appendBasePath,      // <-- Call to previously *synchronous* function
	   dd.sym('filename')], // <-- This is a symbol referring to the filename parameter.
	  dd.sym('file-fmt')]], // <-- The captured format parameter.
	dd.sym('arguments')]]); // <-- An array of all parameters.

    var makeSomeFiles = dd.afn(
      [], // <-- No named parameters
      [dd.map,
       [dd.Afn, ['filename'],
	[fs.writeFile,
	 [appendBasePath,
	  dd.sym('filename')],
	 ['+', '[Contents of file ', dd.sym('filename'), ']']]],
       dd.sym('arguments')]);

    var writeAndConcat = dd.afn(
      [],
      [dd.let, ['files', [dd.quote, // <-- Special form to prevent evaluation
			  ['a.txt', 'b.txt', 'c.txt']]], // <-- An array of data.
       [makeSomeFiles, dd.sym('files')],
       [readAndConcatFiles, dd.sym('files')]]);

    // writeAndConcat is created using ```afn``` and not ```fn```,
    // so it delivers its result using a callback.
    writeAndConcat(function(err, concatenated) {
      console.log('Concated files: %j', concatenated);
      done();
    });
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

