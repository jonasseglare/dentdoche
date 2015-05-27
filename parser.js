var Parse = require('s-expression');
var traverse = require('traverse');
var assert = require('assert');
var jsesc = require('jsesc');
var common = require('./common.js');


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

var special = {'do': "dd.do"};

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
      if (common.isOperator(x)) {
        return 'dd.sym("' + x + '")';
      } else if (special[x]) {
        return special[x];
      } else {
        return compileSymbolResolution(x);
      }
    }
  } else if (isParsedString(x)) {
    return '"' + jsesc(x) + '"';
  }
  return x;
}


function buildArgList(x) {
  var result = '[';
  var last = x.length - 1;
  for (var i = 0; i < x.length; i++) {
    result += "'" + x[i] + "'";
    if (i == last) {
      return result + "]";
    }
    result += ",";
  }
}

function parseToEvalString(x) {
  return buildEvalString(Parse(x));
}

function makeFunctionDef(parsed) {
  try {
    var f = parsed[0];
    var maker = (f == 'dfn'? 'dd.makeFn' : 'dd.makeAfn');
    var name = parsed[1];
    var args = parsed[2];
    var body = ['do'].concat(parsed.slice(3));
    return 'var ' + name + ' = ' + maker +
      '('+ buildArgList(args) + ',' + buildEvalString(body) + ');';
  } catch (e) {
    console.log('Failed to make function definition from ' + parsed);
    return '';
  }
}

// User method
function parse(x) {
  var parsed = Parse(x);
  if (parsed instanceof Array) {
    if (parsed.length > 1) {
      var f = parsed[0];
      if (f == 'dfn' || f == 'dafn') {
        return makeFunctionDef(parsed);
      }
    }
  }
  console.log('parser.js: FAILED TO EVALUATE THIS: ' + x);
  return '';
}


module.exports.parseRaw = Parse;
module.exports.isParsedString = isParsedString;
module.exports.isParsedSymbolOrNumber = isParsedSymbolOrNumber;
module.exports.compileSymbolResolution = compileSymbolResolution;
module.exports.buildEvalString = buildEvalString;
module.exports.parseToEvalString = parseToEvalString;
module.exports.parse = parse;
