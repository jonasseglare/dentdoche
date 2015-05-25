var fs = require('fs');
var dd = require('../dentdoche.js');

dd.async(fs.readFile);
dd.async(fs.writeFile);
