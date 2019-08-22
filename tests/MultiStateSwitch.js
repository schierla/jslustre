var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- A counter that can be be stopped, and can be reset to 0
node ResetCounter(inc, reset : bool) returns (n : int);
let
  n = if reset then 0
      else ((0 -> pre(n)) + (if inc then 1 else 0));
tel

-- Implementation of the multi-state switch software in Lustre
node MultiStateSwitch(pin0 : bool) returns (pin1, pin2 : bool);
var n : int;
let
  n = ResetCounter(true,  -- or, equivalently: pin0
                   not pin0);
  pin1 = n > 1 and n < 20;
  pin2 = n >= 20;
tel
`;

var app = p.lusparser.parse(code), node = "MultiStateSwitch", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([false], [false, false]);
check([false], [false, false]);
check([true], [false, false]);
for(var i=0; i<18; i++) check([true], [true, false]);
for(var i=0; i<10; i++) check([true], [false, true]);
check([false], [false, false]);
check([true], [false, false]);
check([true], [true, false]);
check([false], [false, false]);
