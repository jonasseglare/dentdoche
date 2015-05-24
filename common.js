function ResultArray(n, cb) {
  this.dst = new Array(n);
  this.counter = 0;
  this.cb = cb;
}

ResultArray.prototype.makeSetter = function(index) {
  var self = this;
  return function(err, value) {
    if (err) {
      self.cb(err);
    } else {
      self.dst[index] = value;
      self.counter++;
      if (self.counter == self.dst.length) {
	self.cb(null, self.dst);
      }
    }
  };
}

/*
    How to get the names of function parameters:
    
      http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
*/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}


module.exports.ResultArray = ResultArray;
module.exports.getParamNames = getParamNames;
