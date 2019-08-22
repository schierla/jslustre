var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `
-- Node implementing European-style traffic lights.
-- The light either starts with gree (initRed = false)
-- or with red (initRed = true), reacts to the signals toRed
-- (for switching from green to red) and toGreen (for switching
-- from red to green), and specifies the status of the three
-- lamps as output signals
node TrafficLight(initRed, toRed, toGreen : bool)
     returns (red, yellow, green : bool);
var phase, prePhase, phaseChange : int;
let
  -- phase = 5        -> red
  -- phase in (0,  5) -> yellow (+red)
  -- phase = 0        -> green

  green = (phase = 0);
  yellow = phase > 0 and phase < 5;
  red = (phase = 5 or (phaseChange < 0 and not green));

  prePhase = (if initRed then 5 else 0) -> pre(phase);
  phase = prePhase + phaseChange;
  
  phaseChange = if toRed and prePhase = 0 then 1
                else if toGreen and prePhase = 5 then -1
                else if (prePhase = 0 or prePhase = 5) then 0
                else (0 -> pre phaseChange);
tel
`;

var app = p.lusparser.parse(code), node = "TrafficLight", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([false, false, false], [false, false, true]);
check([false, false, false], [false, false, true]);
check([false, false, false], [false, false, true]);
check([false, true, false], [false, true, false]);
check([false, false, false], [false, true, false]);
check([false, false, false], [false, true, false]);
check([false, false, false], [false, true, false]);
check([false, false, false], [true, false, false]);
check([false, false, false], [true, false, false]);
check([false, false, false], [true, false, false]);
check([false, false, false], [true, false, false]);
check([false, false, true], [true, true, false]);
check([false, false, false], [true, true, false]);
check([false, false, false], [true, true, false]);
check([false, false, false], [true, true, false]);
check([false, false, false], [false, false, true]);

