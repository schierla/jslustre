var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- Generate the sequence 0, 1, 2, 3, ... of numbers
node Counter() returns (n : int);
let
  n = 0 -> pre(n) + 1;
tel
`;

var app = p.lusparser.parse(code), node = "Counter", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([], [0]);
check([], [1]);
check([], [2]);
