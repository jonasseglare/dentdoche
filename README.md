# Dentdoche

Dentdoche is a Lisp interpreter in node.js that abstracts away the difficulties of asynchronous programming so that functions calling callbacks can be treated as regular functions returning values.

Some characteristics:
  * **No extra parser**: Dentdoche code is written using regular Javascript literals in the source code. This means that they are syntactically more bulky than standard Lisp code, but eliminates the need for an extra parser.
  * **No extra build step**: Dentdoche is just a regular node library that is included in the source code. Functions defined in Dentdoche can call Javascript functions, and Javascript functions can call function defined with Dentdoche, because Dentdoche functions compile to Javascript functions. The two languages can be used and live together, side by side, in the same source file.
  * **No promises**: Dentdoche functions compile to either regular ones that deliver their result through return values or callback-style ones, that call a callback with the result.

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

dd.async(fs.readFile);
dd.async(fs.writeFile);

var filecat = dd.makeAfn(['srcA', 'srcB', 'dst'],
			 [fs.writeFile,
			  dd.sym('dst'),
			  ['+',
			   [fs.readFile,
			    dd.sym('srcA'), 'utf8'],
			   [fs.readFile,
			    dd.sym('srcB'), 'utf8']]]);
```
which may not be that much shorter. The structure, however, is a lot simpler. All the callbacks and error forwarding code is gone. Also, generalizing the function for more files is simple.

## Common pitfalls

  * Forgetting comma between array elements.
  * Using ```fn``` instead of ```afn```, or ```makeFn``` instead of ```makeAfn```.
 
## Licence
Copyright Jonas Östlund 2015.
Released under EPL (Eclipse Public Licence).