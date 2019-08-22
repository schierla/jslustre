var p = require("../lusparser");
var e = require("../lusexecutor");

var code = `

-- Node detecting changes of the input signal from
-- false to true
node RisingEdge(X : bool) returns (Y : bool);
let
  Y = false -> X and not pre(X);
tel

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

-- System of two traffic lights, govering a junction of
-- two (one-way) streets. In the default case, traffic light
-- 1 is green, traffic light 2 is red. When a car is detected
-- at traffic light 2 (the carSensor input), the system
-- switches traffic light 1 to red, light 2 to green, waits
-- some amount of time, and then switches back to the
-- default situation.
node TrafficSystem(carSensor : bool)
     returns (r1, y1, g1, r2, y2, g2 : bool);
var l2Counter,  preL2Counter : int;
let
  (r1, y1, g1) =                               -- traffic light 1
    TrafficLight(false,                        -- starts from green
                 l2Counter = 1,                -- switch to red when car is sensed
                 false -> pre RisingEdge(r2)); -- switch to green when the other
                                               --   light becomes red

  (r2, y2, g2) =                               -- traffic light 2
    TrafficLight(true,                         -- starts from red
                 l2Counter = 20,               -- switch to red after a waiting period
                 false -> pre RisingEdge(r1)); -- switch to green when the other
                                               --   light becomes red

  -- Counting from 0 to 20 when a car was detected
  -- This part could be improved: e.g., make sure that
  -- also traffic light 1 is green half of the time, even
  -- when permanently cars arrive at traffic light 2
  preL2Counter = 0 -> pre l2Counter;
  l2Counter = if preL2Counter = 0 and carSensor then 1
              else if (preL2Counter > 0 and preL2Counter < 20)
                   then preL2Counter + 1
              else 0; 
tel
`;

var app = p.lusparser.parse(code), node = "TrafficSystem", state = {};

function check(input, output) {
  var ret = e.lusexecutor.step(app, node, input, state);
  console.log({node: node, input: input, result: ret});
  console.assert(ret.length == output.length, {expected: output.length, was: ret.length});
  for(var i=0; i<ret.length; i++) console.assert(ret[i] == output[i], {expected: output, was: ret});
}

check([false], [false, false, true, true, false, false]);
check([false], [false, false, true, true, false, false]);
check([true], [false, true, false, true, false, false]);
check([false], [false, true, false, true, false, false]);
check([false], [false, true, false, true, false, false]);
check([false], [false, true, false, true, false, false]);
check([false], [true, false, false, true, false, false]);
check([false], [true, false, false, true, true, false]);
check([false], [true, false, false, true, true, false]);
check([false], [true, false, false, true, true, false]);
check([false], [true, false, false, true, true, false]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, false, true]);
check([false], [true, false, false, false, true, false]);
check([false], [true, false, false, false, true, false]);
check([false], [true, false, false, false, true, false]);
check([false], [true, false, false, false, true, false]);
check([false], [true, false, false, true, false, false]);
check([false], [true, true, false, true, false, false]);
check([false], [true, true, false, true, false, false]);
check([false], [true, true, false, true, false, false]);
check([false], [true, true, false, true, false, false]);
check([false], [false, false, true, true, false, false]);
check([false], [false, false, true, true, false, false]);

