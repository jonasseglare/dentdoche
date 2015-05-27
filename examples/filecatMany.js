var fs = require('fs');
var dd = require('../index.js');

dd.async(fs.readFile);
dd.async(fs.writeFile);

var filecatMany = dd.makeAfn([],
			     [fs.writeFile,
			      [dd.last, dd.sym('arguments')],
			      [dd.reduce,
			       dd.sym('+'),
			       [dd.map,
				[dd.afn, ['fname'], 
				 [fs.readFile, dd.sym('fname'), 'utf8']],
				[dd.butLast, dd.sym('arguments')]]]]);

filecatMany(
  '/tmp/mjao.txt', '/tmp/katt.txt', '/tmp/abrakadabraFromMany.txt',
  function(err, value) {
    if (err) {
      console.log('ERROR: ' + err);
      console.log(err);
    }
    console.log('Done.');
  });
