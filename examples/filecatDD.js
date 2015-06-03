var fs = require('fs');
var dd = require('../index.js');
var assert = require('assert');

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

eval(dd.parse(
  '(dafn filecat2 (srcA srcB dst) '+
    '(fs.writeFile dst '+
    '  (+ (fs.readFile srcA "utf8") (fs.readFile srcB "utf8"))))'));



require('./testfiles.js');
filecat('/tmp/mjao.txt', '/tmp/katt.txt', '/tmp/abrakadabra.txt', function(err, value) {
  console.log(err);
  assert(!err);
  console.log('Done.');
});

filecat2('/tmp/mjao.txt', '/tmp/katt.txt', '/tmp/abrakadabra2.txt', function(err, value) {
  assert(!err);
  console.log('Done.');
});
