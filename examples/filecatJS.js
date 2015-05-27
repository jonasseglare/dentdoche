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

filecat('/tmp/mjao.txt', '/tmp/katt.txt', '/tmp/abrakadabra.txt', function(err, value) {
  console.log('Done.');
});
