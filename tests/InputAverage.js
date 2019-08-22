var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- Compute the average of two integer inputs x, y
node InputAverage(x, y : int) returns (a : int);
let
  a = (x + y) / 2;
tel
`;

var app = p.lusparser.parse(code), node = "InputAverage", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([0, 0], [0]);
check([1, 3], [2]);
check([0, 1], [0]);