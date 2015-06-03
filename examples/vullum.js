// From this example:
// 
//  http://blog.vullum.io/javascript-flow-callback-hell-vs-async-vs-highland/
//
var express = require('express');
var fs = require('fs');
var app = express();
var dd = require('dentdoche');

dd.setAsync(fs.writeFile);
dd.setAsync(fs.readFile);
dd.setAsync(process1);
dd.setAsync(process2);
dd.setAsync(process3);

eval(dd.parse('(dafn processFile (inputFile outputFile)' +
              '  (fs.writeFile outfile (process3 (process2 (process1 '
              '    (fs.readFile inputFile))))))'));

app.post('/process-file', function(req, res) {
  processFile('input.txt', 'output.txt', function(err, value) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send('processed successfully');
    }
  });
});
