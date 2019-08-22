var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- Compute the absolute value of the input x
node Abs(x : int) returns (y : int);
let
  y = if x >= 0 then x else -x;
tel
`;

var app = p.lusparser.parse(code), node = "Abs", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([0], [0]);
check([1], [1]);
check([-1], [1]);