var _code = document.getElementById("code");
var _node = document.getElementById("node");
var _results = document.getElementById("results");
var _step = document.getElementById("stepNode");
var _error = document.getElementById("error");
var _reset = document.getElementById("resetNode");
var _inputrow = null;
var inputs = [];
var app = null;
var state = {};

function updateCode() {
    try {
        app = lusparser.parse(_code.value);
        _error.innerText = "";
    } catch(e) {
        app = {nodes: {}};
        _code.focus();
        _code.setSelectionRange(e.location.start.offset, e.location.start.offset);
        _error.innerText = e.name + ": " + e.message + " \nLocation: Line " + e.location.start.line + ", column " + e.location.start.column;
    }
    updateNodes();
}

function updateNodes() {
    while(_node.firstChild) _node.removeChild(_node.firstChild);
    for(var node in app.nodes) {
        var option = document.createElement("option");
        option.value = node; 
        option.appendChild(document.createTextNode(node));
        _node.appendChild(option);
    }
    updateNode();
}

function inputUi(type) {
    var index = inputs.length;
    switch(type) {
        case "int": 
            var ret = document.createElement("input"); 
            ret.type="number"; ret.step = "1"; ret.value = 0; inputs.push(0);
            ret.addEventListener("change", function(e) {inputs[index] = parseInt(ret.value); });
            return ret;
        case "float": 
            var ret = document.createElement("input"); 
            ret.type="number"; ret.step="any"; ret.value = 0; inputs.push(0);
            ret.addEventListener("change", function(e) {inputs[index] = parseFloat(ret.value); });
            return ret;
        case "bool": 
            var ret = document.createElement("input");
            ret.type="checkbox"; ret.checked = false; inputs.push(false);
            ret.addEventListener("change", function(e) {inputs[index] = ret.checked; });
            return ret;
    }
}

function updateNode() {
    var node = app.nodes[_node.value];
    state = {};
    while(_results.firstChild) _results.removeChild(_results.firstChild);
    _inputrow = document.createElement("tr");
    var _types = document.createElement("tr");
    var _header = document.createElement("tr");

    var params = node.header.params;
    var returns = node.header.returns;
    var locals = node.body.locals;
    inputs = [];
    if(params.length > 0) {
        var _th = document.createElement("th");
        _th.appendChild(document.createTextNode("Inputs"));
        _th.colSpan = params.length;
        _types.appendChild(_th);
    }

    for(var i=0; i<params.length; i++) {
        var _th = document.createElement("th");
        _th.appendChild(document.createTextNode(params[i].name));
        _header.appendChild(_th);

        var input = document.createElement("td");
        input.appendChild(inputUi(params[i].type));
        _inputrow.appendChild(input)
    }

    if(returns.length > 0) {
        var _th = document.createElement("th");
        _th.appendChild(document.createTextNode("Results"));
        _th.colSpan = returns.length;
        _types.appendChild(_th);
    }
    for(var i=0; i<returns.length; i++) {
        var _th = document.createElement("th");
        _th.appendChild(document.createTextNode(returns[i].name));
        _header.appendChild(_th);

        _inputrow.appendChild(document.createElement("td"));
    }


    if(locals.length > 0) {
        var _th = document.createElement("th");
        _th.appendChild(document.createTextNode("Locals"));
        _th.colSpan = locals.length;
        _types.appendChild(_th);
    }
    for(var i=0; i<locals.length; i++) {
        var _th = document.createElement("th");
        _th.appendChild(document.createTextNode(locals[i].name));
        _header.appendChild(_th);

        _inputrow.appendChild(document.createElement("td"));
    }

    _results.appendChild(_types);
    _results.appendChild(_header);
    _results.appendChild(_inputrow);
}

function stepNode() {
    try {
        var ret = lusexecutor.step(app, _node.value, inputs, state);
    } catch(e) {
        _error.innerText = e.name + ": " + e.message;
        return;
    }

    var node = app.nodes[_node.value];
    var params = node.header.params;
    var returns = node.header.returns;
    var locals = node.body.locals;    
    
    var _resultrow = document.createElement("tr");
    for(var i=0; i<params.length; i++) {
        var _td = document.createElement("td"); 
        _td.appendChild(document.createTextNode(inputs[i]));
        _td.className = "val" + inputs[i];
        _resultrow.appendChild(_td);
    }

    for(var i=0; i<returns.length; i++) {
        var _td = document.createElement("td"); 
        _td.appendChild(document.createTextNode(ret[i]));
        _td.className = "val" + ret[i];
        _resultrow.appendChild(_td);
    }

    for(var i=0; i<locals.length; i++) {
        var _td = document.createElement("td"); 
        _td.appendChild(document.createTextNode(state.values[locals[i].name]));
        _td.className = "val" + state.values[locals[i].name];
        _resultrow.appendChild(_td);
    }

    _results.insertBefore(_resultrow, _inputrow.nextSibling);
    console.log("Executing step for " + _node.value);
    logState(_node.value, state);
}

function logState(key, state) {
    var i = 0;
    var shown = {_node: key };
    for(var value in state.values) shown[value] = state.values[value];
    console.log(shown); 
    for(var statekey in state) {
        if(state[statekey].values) {
            i++; 
            logState(key + "." + JSON.parse(statekey).name + "#" + i, state[statekey]);
        }
    }
}

function resetNode() {
    updateNode();
}


_code.addEventListener("change", updateCode);
_node.addEventListener("change", updateNode);
_step.addEventListener("click", stepNode);
_reset.addEventListener("click", resetNode);
updateCode();