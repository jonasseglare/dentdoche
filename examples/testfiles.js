var fs = require('fs');
var dd = require('../index.js');

dd.async(fs.readFile);
dd.async(fs.writeFile);

var makeFiles = dd.makeAfn(
  ['args'],
  [dd.map,
   [dd.afn, ['filename'],
    [dd.let,
     ['fullname', ['+', '/tmp/', dd.sym('filename')]],
    [fs.writeFile,
     dd.sym('fullname'),
     ['+', "This is a file with filename ", dd.sym('fullname')]],,
    dd.sym('fullname')]],
   dd.sym('args')]);

/*makeFiles(['mjao.txt', 'dd.txt', 'katt.txt'], function(err, value) {
  console.log('Error: ');
  console.log(err);
  console.log('Value: ');
  console.log(value);
});*/

