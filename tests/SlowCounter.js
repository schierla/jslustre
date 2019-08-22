var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- simple counter node 
node Counter () returns (c: int);  
let  
    c = 1 fby c + 1;  
tel 
 
-- node that counts every second cycle 
node SlowCounter() returns (c: int);  
var a: bool;  
let  
    a = true fby not a;  
    c = current(Counter() when a);  
tel
`;

var app = p.lusparser.parse(code), node = "SlowCounter", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([], [1]);
check([], [1]);
check([], [2]);
check([], [2]);
check([], [3]);
check([], [3]);
