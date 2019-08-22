var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- Incrementally sum up the inputs given to the node
node Sum(X : int) returns (S : int);
let
  S = (0 -> pre(S)) + X;
tel
`;

var app = p.lusparser.parse(code), node = "Sum", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([0], [0]);
check([0], [0]);
check([1], [1]);
check([1], [2]);
check([2], [4]);
