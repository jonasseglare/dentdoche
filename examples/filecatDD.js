var fs = require('fs');
var dd = require('../index.js');

dd.setAsync(fs.readFile);
dd.setAsync(fs.writeFile);

var filecat = dd.makeAfn(['srcA', 'srcB', 'dst'],
			 [fs.writeFile,
			  dd.sym('dst'),
			  ['+',
			   [fs.readFile,
			    dd.sym('srcA'), 'utf8'],
			   [fs.readFile,
			    dd.sym('srcB'), 'utf8']]]);

filecat('/tmp/mjao.txt', '/tmp/katt.txt', '/tmp/abrakadabra.txt', function(err, value) {
  console.log('Done.');
});
