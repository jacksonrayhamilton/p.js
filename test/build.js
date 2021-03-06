'use strict';

var assert = require('assert');
var build = require('../tools/build');
var esprima = require('esprima');
var get = require('lodash/get');
var walk = require('esprima-walk');

var hasIife = function (ast) {
  return (
    get(ast, 'body[0].type') === 'VariableDeclaration' &&
      get(ast, 'body[0].declarations[0].init.type') === 'CallExpression'
  );
};

var hasTopLevelFunction = function (ast) {
  return (
    get(ast, 'body[0].type') === 'VariableDeclaration' &&
      get(ast, 'body[0].declarations[0].init.type') === 'FunctionExpression'
  );
};

var isNamedFunctionExpression = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'p' &&
      node.init.type === 'FunctionExpression' &&
      get(node, 'init.id.name') === 'p'
  );
};

var getTaskFunction = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'callCallbacks' &&
      get(node, 'init.body.body[1].body.body[0].expression.callee.name')
  );
};

var hasInlineThen = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'promise' &&
      get(node, 'init.properties[0].value.type') === 'FunctionExpression'
  );
};

var isThenReference = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'promiseThen'
  );
};

var hasCatch = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'promise' &&
      get(node, 'init.properties[1].value.type') === 'FunctionExpression'
  );
};

var hasQuotedCatch = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'promise' &&
      get(node, 'init.properties[1].key.raw') === '\'catch\''
  );
};

var hasResolveReference = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'pResolve'
  );
};

var hasExposed = function (node, method) {
  return (
    node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      get(node, 'left.object.name') === 'p' &&
      get(node, 'left.property.name') === method
  );
};

var hasExposedResolve = function (node) {
  return hasExposed(node, 'resolve');
};

var hasReject = function (node) {
  return hasExposed(node, 'reject');
};

var hasAll = function (node) {
  return hasExposed(node, 'all');
};

var hasRace = function (node) {
  return hasExposed(node, 'race');
};

var hasInlineAll;
var hasInlineRace;
hasInlineAll = hasInlineRace = function (node) {
  return (
    node.type === 'AssignmentExpression' &&
      node.right.type === 'FunctionExpression'
  );
};

var hasAllRace = function (node) {
  return (
    node.type === 'VariableDeclarator' &&
      node.id.name === 'allRace'
  );
};

var hasNodeModule = function (node) {
  return (
    node.type === 'AssignmentExpression' &&
      node.left.type === 'MemberExpression' &&
      get(node, 'left.object.name') === 'module' &&
      get(node, 'left.property.name') === 'exports'
  );
};

var examineCode = function (code) {
  var ast = esprima.parse(code);
  var report = {
    hasIife: false,
    hasTopLevelFunction: false,
    hasNamedFunctionExpression: false,
    hasInlineThen: false,
    hasThenReference: false,
    hasCatch: false,
    hasQuotedCatch: false,
    hasResolveReference: false,
    hasExposedResolve: false,
    hasResolve: false,
    hasReject: false,
    hasAll: false,
    hasInlineAll: false,
    hasRace: false,
    hasInlineRace: false,
    hasAllRace: false,
    hasNodeModule: false
  };
  if (hasIife(ast)) {
    report.hasIife = true;
  }
  if (hasTopLevelFunction(ast)) {
    report.hasTopLevelFunction = true;
  }
  walk(ast, function (node) {
    if (isNamedFunctionExpression(node)) {
      report.hasNamedFunctionExpression = true;
    }
    var taskFunction = getTaskFunction(node);
    if (taskFunction) {
      report.taskFunction = taskFunction;
    }
    if (hasInlineThen(node)) {
      report.hasInlineThen = true;
    }
    if (isThenReference(node)) {
      report.hasThenReference = true;
    }
    if (hasCatch(node)) {
      if (hasQuotedCatch(node)) {
        report.hasQuotedCatch = true;
      }
      report.hasCatch = true;
    }
    if (hasResolveReference(node)) {
      report.hasResolveReference = true;
      report.hasResolve = true;
    }
    if (hasExposedResolve(node)) {
      report.hasExposedResolve = true;
      report.hasResolve = true;
    }
    if (hasReject(node)) {
      report.hasReject = true;
    }
    if (hasAll(node)) {
      if (hasInlineAll(node)) {
        report.hasInlineAll = true;
      }
      report.hasAll = true;
    }
    if (hasRace(node)) {
      if (hasInlineRace(node)) {
        report.hasInlineRace = true;
      }
      report.hasRace = true;
    }
    if (hasAllRace(node)) {
      report.hasAllRace = true;
    }
    if (hasNodeModule(node)) {
      report.hasNodeModule = true;
    }
  });
  return report;
};

var assertReport = function (actual, expected) {
  for (var key in expected) {
    if (Object.prototype.hasOwnProperty.call(expected, key)) {
      if (actual[key] !== expected[key]) {
        assert.fail(
          actual[key],
          expected[key],
          'Expected ' + key + ' to be ' + expected[key] + ' but it was ' + actual[key]
        );
      }
    }
  }
};

describe('build', function () {

  it('should generate a minimal build', function () {
    assertReport(examineCode(build()), {
      hasIife: false,
      hasTopLevelFunction: true,
      hasNamedFunctionExpression: true,
      taskFunction: 'setTimeout',
      hasInlineThen: true,
      hasThenReference: false,
      hasCatch: false,
      hasResolve: false,
      hasReject: false,
      hasAll: false,
      hasRace: false,
      hasNodeModule: false
    });
  });

  it('should enable catch', function () {
    assertReport(examineCode(build({
      catch: true
    })), {
      hasInlineThen: false,
      hasThenReference: true,
      hasCatch: true,
      hasQuotedCatch: false
    });
  });

  it('should quote catch for ie', function () {
    assertReport(examineCode(build({
      catch: true,
      ie: true
    })), {
      hasCatch: true,
      hasQuotedCatch: true
    });
  });

  it('should enable resolve', function () {
    assertReport(examineCode(build({
      resolve: true
    })), {
      hasResolveReference: false,
      hasExposedResolve: true
    });
  });

  it('should enable reject', function () {
    assertReport(examineCode(build({
      reject: true
    })), {
      hasReject: true
    });
  });

  it('should enable all', function () {
    assertReport(examineCode(build({
      all: true
    })), {
      hasResolveReference: true,
      hasExposedResolve: false,
      hasAllRace: false,
      hasInlineAll: true
    });
  });

  it('should enable race', function () {
    assertReport(examineCode(build({
      race: true
    })), {
      hasResolveReference: true,
      hasExposedResolve: false,
      hasAllRace: false,
      hasInlineRace: true
    });
  });

  it('should enable all and race', function () {
    assertReport(examineCode(build({
      all: true,
      race: true
    })), {
      hasResolveReference: true,
      hasExposedResolve: false,
      hasAllRace: true,
      hasAll: true,
      hasInlineAll: false,
      hasRace: true,
      hasInlineRace: false
    });
  });

  it('should export a node module', function () {
    assertReport(examineCode(build({
      node: true
    })), {
      hasTopLevelFunction: true,
      hasNamedFunctionExpression: false,
      hasNodeModule: true
    });
  });

  it('should wrap p in an iife pessimistically', function () {
    var expected = {
      hasIife: true,
      hasNamedFunctionExpression: false
    };
    assertReport(examineCode(build({ie: true})), expected);
    assertReport(examineCode(build({resolve: true})), expected);
    assertReport(examineCode(build({reject: true})), expected);
    assertReport(examineCode(build({all: true})), expected);
    assertReport(examineCode(build({race: true})), expected);
  });

  it('should not wrap p in an iife in modules', function () {
    var expected = {
      hasIife: false,
      hasNamedFunctionExpression: false
    };
    assertReport(examineCode(build({node: true, ie: true})), expected);
    assertReport(examineCode(build({node: true, resolve: true})), expected);
    assertReport(examineCode(build({node: true, reject: true})), expected);
    assertReport(examineCode(build({node: true, all: true})), expected);
    assertReport(examineCode(build({node: true, race: true})), expected);
  });

  it('should customize the task function', function () {
    assertReport(examineCode(build({
      task: 'setImmediate'
    })), {
      taskFunction: 'setImmediate'
    });
  });

});
