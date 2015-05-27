var Parse = require('s-expression');
var traverse = require('traverse');
var assert = require('assert');
var jsesc = require('jsesc');


function isParsedString(x) {
  return x instanceof String;
}

function isParsedSymbolOrNumber(x) {
  return typeof x == 'string';
}

function compileSymbolResolution(x) {
  assert(isParsedSymbolOrNumber(x));
  return 'eval("try{' + x + ';} catch(e) {dd.sym(\\"' + jsesc(x) + '\\");}")';
}

function buildEvalString(x) {
  if (x instanceof Array) {
    var result = '[';
    var last = x.length-1;
    for (var i = 0; i < x.length; i++) {
      result += buildEvalString(x[i]);
      if (i != last) {
        result += ',';
      }
    }
    return result + ']';
  } else if (isParsedSymbolOrNumber(x)) {
    try {
      return JSON.parse(x);
    } catch(e) {
      return compileSymbolResolution(x);
    }
  } else if (isParsedString(x)) {
    return '"' + jsesc(x) + '"';
  }
  console.log("FOUND THIS: " + typeof x);
  return x;
}



function parseToEvalString(x) {
  return buildEvalString(Parse(x));
}

module.exports.parseRaw = Parse;
module.exports.isParsedString = isParsedString;
module.exports.isParsedSymbolOrNumber = isParsedSymbolOrNumber;
module.exports.compileSymbolResolution = compileSymbolResolution;
module.exports.buildEvalString = buildEvalString;
module.exports.parseToEvalString = parseToEvalString;
