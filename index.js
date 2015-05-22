function Symbol(x) {
  this.name = x;
}

function isSymbol(x) {
  return x.constructor.name == 'Symbol';
}

function getName(x) {
  if (typeof x == 'string') {
    return x;
  } else {
    return x.name;
  }
}

function isArray(x) {
  return x.constructor.name == 'Array';
}

function cloneShallow(x) {
  var y = {};
  for (var key in x) {
    y[key] = x[key];
  }
  return y;
}

function evaluateSymbol(localVars, symbol) {
  var key = getName(symbol);
  if (localVars.hasOwnProperty(key)) {
    return localVars[key];
  } else if (localVars.hasOwnProperty('___next')) {
    return evaluateSymbol(localVars.___next, symbol);
  }
  return undefined;
}

function pushLocalVars(a, b) {
  var a2 = cloneShallow(a);
  a2.___next = b;
  return a2;
}



function evaluateForm(localVars, form) {
  if (isArray(form)) {
    return evaluateSExpr(localVars, form);
  } else if (isSymbol(form)) {
    return evaluateSymbol(localVars, form);
  } else {
    return form;
  }
}

module.exports.evaluateSymbol = evaluateSymbol;
module.exports.Symbol = Symbol;
module.exports.pushLocalVars = pushLocalVars;
module.exports.evaluateForm = evaluateForm;
