var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- Node detecting changes of the input signal from
-- false to true
node RisingEdge(X : bool) returns (Y : bool);
let
  Y = false -> X and not pre(X);
tel
`;

var app = p.lusparser.parse(code), node = "RisingEdge", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([false], [false]);
check([true], [true]);
check([true], [false]);
check([false], [false]);
check([true], [true]);
