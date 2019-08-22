var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- A counter that can be be stopped, and can be reset to 0
node ResetCounter(inc, reset : bool) returns (n : int);
let
  n = if reset then 0
      else ((0 -> pre(n)) + (if inc then 1 else 0));
tel
`;

var app = p.lusparser.parse(code), node = "ResetCounter", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([false, false], [0]);
check([false, false], [0]);
check([true, false], [1]);
check([true, false], [2]);
check([false, false], [2]);
check([false, true], [0]);
check([true, false], [1]);
