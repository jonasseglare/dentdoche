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
  return '(dd.sym(\"' + jsesc(x) + '\", eval("try{' + x + ';} catch(e) {null;}")))';
  //return ' try {' + x + ';} catch(e) {dd.sym(\"' + jsesc(x) + '\")} ';
}

var special = {
  'later': 'dd.later',
  'this': 'this',
  'do': 'dd.do',
  'let': 'dd.let',
  'if': 'dd.if',
  'cond': 'dd.cond',
  'try': 'dd.try',
  'catch': 'dd.catch',
  'fn': 'dd.fn',
  'afn': 'dd.afn',
  'loop': 'dd.loop',
  'return': 'dd.return',
  'next': 'dd.next',
  'quote': 'dd.quote'
};

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
  if (!x) {
    console.log('Return this');
    return '[]';
  }
  var result = '[';
  var last = x.length - 1;
  for (var i = 0; i < x.length; i++) {
    result += "'" + x[i] + "'";
    if (i != last) {
      result += ",";
    }
  }
  return result + "]";

}

function parseToEvalString(x) {
  return buildEvalString(Parse(x));
}

function makeFunctionDef(parsed) {
  try {
    var implName = common.gensym();
    var f = parsed[0];
    var isSync = f == 'dfn';
    var maker = (isSync? 'dd.makeFn' : 'dd.makeAfn');
    var name = parsed[1];
    var args = parsed[2];
    var body = ['do'].concat(parsed.slice(3));
    var wrapper = 'function ' + name +
      '() { return ' + implName +
      '.apply(this, dd.argsToArray(arguments))}; ' + (isSync? "" : "dd.setAsync(" + name + ");");
    var mainDef = 'var ' + implName + ' = ' + maker +
      '('+ buildArgList(args) + ',' + buildEvalString(body) + ');';
    return wrapper + mainDef;
    /*return 'var ' + name + ' = ' + maker +
      '('+ buildArgList(args) + ',' + buildEvalString(body) + ');';*/
  } catch (e) {
    console.log('Failed to make function definition from ' + parsed);
    return '';
  }
}

function parseSub(parsed) {
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


// User method
function parse(x) {
  var parsed = Parse('(' + x + ')');
  var output = '';
  for (var i = 0; i < parsed.length; i++) {
    output += parseSub(parsed[i]);
  }
  return output;
}


module.exports.parseRaw = Parse;
module.exports.isParsedString = isParsedString;
module.exports.isParsedSymbolOrNumber = isParsedSymbolOrNumber;
module.exports.compileSymbolResolution = compileSymbolResolution;
module.exports.buildEvalString = buildEvalString;
module.exports.parseToEvalString = parseToEvalString;
module.exports.parse = parse;
